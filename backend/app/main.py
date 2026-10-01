"""CogniGraph API — multi-PDF batch ingestion + SSE progress + cross-doc retrieval.

Run:  uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import traceback
import uuid as _uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass, field as dc_field

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from .config import Settings
from .documents import DocumentRegistry
from .ingestion.highlight import citations_for_spans
from .ingestion.service import IngestionService
from .retrieval.hybrid import HybridRetriever
from .retrieval.reranker import LexicalReranker

log = logging.getLogger("cognigraph")


# ── Batch-job state ───────────────────────────────────────────────────────────

@dataclass
class _DocProgress:
    doc_id: str
    filename: str
    stage: str = "queued"   # queued|parsing|chunking|embedding|graphing|done|error
    processed: int = 0
    total: int = 0
    error: str | None = None
    result: dict | None = None  # filled when stage == "done"

    def pct(self) -> float:
        if self.stage == "queued":   return 0.0
        if self.stage == "parsing":  return 8.0
        if self.stage == "chunking": return 30.0
        if self.stage == "embedding":
            frac = self.processed / max(self.total, 1)
            return 35.0 + frac * 50.0   # 35 → 85 %
        if self.stage == "graphing": return 90.0
        if self.stage == "done":     return 100.0
        if self.stage == "error":    return 0.0
        return 0.0


@dataclass
class _BatchJob:
    id: str
    docs: list[_DocProgress]
    lock: threading.Lock = dc_field(default_factory=threading.Lock, repr=False)

    @property
    def done(self) -> bool:
        return all(d.stage in ("done", "error") for d in self.docs)

    def overall_pct(self) -> float:
        if not self.docs:
            return 100.0
        return sum(d.pct() for d in self.docs) / len(self.docs)

    def snapshot(self) -> dict:
        """Thread-safe serialisable snapshot — call inside self.lock."""
        return {
            "batch_id": self.id,
            "done": self.done,
            "pct": round(self.overall_pct(), 1),
            "docs": [
                {
                    "doc_id": d.doc_id,
                    "filename": d.filename,
                    "stage": d.stage,
                    "processed": d.processed,
                    "total": d.total,
                    "pct": round(d.pct(), 1),
                    "error": d.error,
                    "result": d.result,
                }
                for d in self.docs
            ],
        }


_batch_jobs: dict[str, _BatchJob] = {}
_batch_lock = threading.Lock()


# ── Service wiring ────────────────────────────────────────────────────────────

def build_services(settings: Settings):
    if settings.embedder == "sbert":
        from .embeddings.sbert import SentenceTransformerEmbedder
        embedder = SentenceTransformerEmbedder(settings.embedding_model)
    else:
        from .embeddings.hashing import HashingEmbedder
        embedder = HashingEmbedder()

    if settings.store == "postgres":
        from .store.postgres import PostgresStore
        store = PostgresStore(settings.database_url)
    else:
        from .store.memory import MemoryStore
        store = MemoryStore()

    if settings.reranker == "cross-encoder":
        from .retrieval.reranker import CrossEncoderReranker
        reranker = CrossEncoderReranker(settings.reranker_model)
    elif settings.reranker == "lexical":
        reranker = LexicalReranker()
    else:
        reranker = None

    registry = DocumentRegistry(settings.data_dir)
    ingestion = IngestionService(store, embedder)
    retriever = HybridRetriever(store, embedder, reranker)
    return registry, ingestion, retriever


# ── Request/response models ───────────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    doc_id: str | None = None           # single-doc filter (backward-compat)
    doc_ids: list[str] | None = None    # multi-doc filter (new; null = all docs)
    top_k: int = Field(default=5, ge=1, le=20)
    mode: str = Field(default="hybrid", pattern="^(hybrid|dense|sparse)$")


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings.from_env()
    registry, ingestion, retriever = build_services(settings)
    app.state.settings  = settings
    app.state.registry  = registry
    app.state.ingestion = ingestion
    app.state.retriever = retriever

    if settings.store == "memory":
        for doc_id in registry.all_ids():
            pages = sorted(registry.pages(doc_id).values(), key=lambda p: p.number)
            ingestion.ingest_pages(registry.filename(doc_id), pages, doc_id=doc_id)
            log.info("re-indexed %s", doc_id)
    yield


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="CogniGraph API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(Settings.from_env().cors_origins),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    s: Settings = app.state.settings
    return {"status": "ok", "store": s.store, "embedder": s.embedder, "reranker": s.reranker}


# ── Single-file upload (original, backward-compat) ────────────────────────────

@app.post("/api/documents")
def upload_document(file: UploadFile = File(...)):
    settings: Settings = app.state.settings
    data = file.file.read()
    if not data.startswith(b"%PDF"):
        raise HTTPException(415, "only PDF files are supported")
    try:
        result = app.state.ingestion.ingest_pdf(file.filename or "document.pdf", data)
    except Exception as exc:
        log.exception("ingestion failed")
        raise HTTPException(422, f"could not process PDF: {exc}") from exc
    app.state.registry.save(result.document.id, result.document.filename, data, result.pages)
    if result.graph:
        app.state.registry.save_graph(result.document.id, result.graph)
    return {**result.document.to_dict(), "timings_ms": result.timings_ms}


# ── Multi-file batch upload ───────────────────────────────────────────────────

@app.post("/api/documents/batch")
async def upload_batch(files: list[UploadFile] = File(...)):
    """Accept 1–50 PDFs, kick a background processing thread, return a batch_id.

    Poll progress via GET /api/documents/batch/{batch_id}/stream (SSE).
    """
    settings: Settings = app.state.settings

    if not files:
        raise HTTPException(400, "no files provided")

    file_data: list[tuple[str, bytes]] = []
    for f in files:
        data = await f.read()
        if not data.startswith(b"%PDF"):
            raise HTTPException(415, f"{f.filename}: not a valid PDF")
        file_data.append((f.filename or "document.pdf", data))

    batch_id = _uuid.uuid4().hex[:12]
    doc_ids  = [_uuid.uuid4().hex[:12] for _ in file_data]

    # Snapshot app state for the background thread
    ingestion: IngestionService   = app.state.ingestion
    registry:  DocumentRegistry   = app.state.registry

    # Save PDF bytes immediately and compute initial doc info (takes ~10ms)
    initial_docs: list[dict] = []
    for (filename, data), did in zip(file_data, doc_ids):
        registry.save_pdf(did, data)
        try:
            with fitz.open(stream=data, filetype="pdf") as doc:
                n_pages = doc.page_count
        except Exception:
            n_pages = 1
        initial_docs.append({
            "id": did,
            "filename": filename,
            "n_pages": n_pages,
            "n_chunks": 0,
            "warnings": [],
            "timings_ms": {},
        })

    job = _BatchJob(
        id=batch_id,
        docs=[
            _DocProgress(doc_id=did, filename=fn)
            for (fn, _), did in zip(file_data, doc_ids)
        ],
    )
    with _batch_lock:
        _batch_jobs[batch_id] = job

    def _process() -> None:
        for i, ((filename, data), doc_id) in enumerate(zip(file_data, doc_ids)):
            dp = job.docs[i]

            def _make_cb(dp: _DocProgress):   # capture dp by value
                def _cb(stage: str, done: int, total: int) -> None:
                    with job.lock:
                        if stage != "done":
                            dp.stage = stage
                        dp.processed = done
                        dp.total     = total
                return _cb

            try:
                result = ingestion.ingest_pdf_with_progress(
                    filename, data, doc_id=doc_id, progress_cb=_make_cb(dp)
                )
                registry.save(result.document.id, result.document.filename, data, result.pages)
                if result.graph:
                    registry.save_graph(result.document.id, result.graph)
                with job.lock:
                    dp.result = {**result.document.to_dict(), "timings_ms": result.timings_ms}
                    dp.stage  = "done"
            except Exception as exc:
                tb = traceback.format_exc()
                log.error("batch ingest failed for %s:\n%s", filename, tb)
                with job.lock:
                    dp.stage = "error"
                    detail = str(exc) or repr(exc)
                    dp.error = f"{detail}\n---\n{tb}"

    threading.Thread(target=_process, daemon=True).start()

    return {"batch_id": batch_id, "doc_count": len(file_data), "docs": initial_docs}


# ── SSE progress stream ───────────────────────────────────────────────────────

@app.get("/api/documents/batch/{batch_id}/stream")
async def batch_stream(batch_id: str):
    """Server-Sent Events stream reporting per-document ingestion progress."""

    async def generate():
        # Send an initial heartbeat so the browser sees the connection is open.
        yield ": keep-alive\n\n"
        while True:
            with _batch_lock:
                job = _batch_jobs.get(batch_id)
            if job is None:
                yield f"data: {json.dumps({'error': 'batch not found'})}\n\n"
                return
            with job.lock:
                payload = job.snapshot()
            yield f"data: {json.dumps(payload)}\n\n"
            if payload["done"]:
                return
            await asyncio.sleep(0.15)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── List all documents ────────────────────────────────────────────────────────

@app.get("/api/documents")
def list_documents():
    """Return metadata for every indexed document."""
    registry: DocumentRegistry = app.state.registry
    store = app.state.ingestion.store

    results = []
    for doc_id in registry.all_ids():
        try:
            filename = registry.filename(doc_id)
            pages    = registry.pages(doc_id)
            n_pages  = len(pages)
            try:
                n_chunks = len([c for c in store._chunks.values() if c.doc_id == doc_id])  # type: ignore[attr-defined]
            except AttributeError:
                n_chunks = 0
            results.append({
                "id":         doc_id,
                "filename":   filename,
                "n_pages":    n_pages,
                "n_chunks":   n_chunks,
                "warnings":   [],
                "timings_ms": {},
            })
        except Exception:
            pass

    return {"documents": results}


# ── Document sub-resources ────────────────────────────────────────────────────

@app.get("/api/documents/{doc_id}/graph")
def get_graph(doc_id: str):
    registry: DocumentRegistry = app.state.registry
    try:
        graph = registry.load_graph(doc_id)
    except KeyError:
        raise HTTPException(404, "document not found")
    if graph is None:
        try:
            from .ingestion.graph_builder import build_graph
            store  = app.state.ingestion.store
            chunks = [c for c in store._chunks.values() if c.doc_id == doc_id]  # type: ignore[attr-defined]
            graph  = build_graph(chunks).to_dict() if chunks else {"nodes": [], "edges": []}
            registry.save_graph(doc_id, graph)
        except Exception:
            graph = {"nodes": [], "edges": []}
    return graph


from fastapi.responses import Response

@app.get("/api/documents/{doc_id}/pdf")
def get_pdf(doc_id: str, chunk_id: str | None = None):
    try:
        pdf_path = app.state.registry.pdf_path(doc_id)
        if chunk_id:
            store = app.state.ingestion.store
            registry = app.state.registry
            
            import fitz
            from .ingestion.highlight import rects_for_span
            doc = fitz.open(pdf_path)
            
            try:
                chunk = None
                if hasattr(store, "_chunks"):
                    chunk = store._chunks.get(chunk_id)
                
                if chunk:
                    pages = registry.pages(doc_id)
                    for span in chunk.spans:
                        p = pages.get(span.page)
                        if p:
                            rects = rects_for_span(p, span.start, span.end)
                            if rects:
                                f_page = doc[span.page - 1]
                                for r in rects:
                                    annot = f_page.add_highlight_annot(fitz.Rect(r))
                                    annot.set_colors(stroke=(0.22, 0.74, 0.97))
                                    annot.update()
                    return Response(content=doc.write(), media_type="application/pdf")
            except Exception as e:
                log.error(f"Highlighting failed: {e}")
            finally:
                doc.close()
                
        return FileResponse(pdf_path, media_type="application/pdf")
    except KeyError:
        raise HTTPException(404, "document not found")


# ── Query (single-doc and cross-doc) ─────────────────────────────────────────

@app.post("/api/query")
def query(req: QueryRequest):
    registry: DocumentRegistry = app.state.registry

    # Resolve effective doc_id filter: prefer doc_ids list, fall back to doc_id.
    # If neither is set → search across ALL documents (doc_id=None).
    effective_doc_id: str | None = None
    filter_ids: set[str] | None = None

    if req.doc_ids is not None:
        if len(req.doc_ids) == 1:
            effective_doc_id = req.doc_ids[0]
        elif len(req.doc_ids) > 1:
            # Search all, then post-filter
            filter_ids = set(req.doc_ids)
    elif req.doc_id is not None:
        effective_doc_id = req.doc_id

    # Validate single-doc exists
    if effective_doc_id is not None:
        try:
            registry.pages(effective_doc_id)
        except KeyError:
            raise HTTPException(404, "document not found")

    outcome = app.state.retriever.search(
        req.query,
        doc_id=effective_doc_id,
        top_k=req.top_k if filter_ids is None else req.top_k * 3,  # over-fetch for post-filter
        mode=req.mode,
    )

    results = []
    for sc in outcome.results:
        # Apply multi-doc post-filter
        if filter_ids is not None and sc.chunk.doc_id not in filter_ids:
            continue

        # Fetch page layout for citation boxes
        try:
            chunk_pages = registry.pages(sc.chunk.doc_id)
        except KeyError:
            chunk_pages = {}

        results.append(
            {
                "chunk_id": sc.chunk.id,
                "doc_id":   sc.chunk.doc_id,
                "text":     sc.chunk.text,
                "score":    round(sc.score, 5),
                "signals": {
                    "rrf":          round(sc.rrf_score, 5),
                    "dense_rank":   sc.dense_rank,
                    "sparse_rank":  sc.sparse_rank,
                    "dense_score":  None if sc.dense_score  is None else round(sc.dense_score, 4),
                    "sparse_score": None if sc.sparse_score is None else round(sc.sparse_score, 4),
                    "rerank":       None if sc.rerank_score is None else round(sc.rerank_score, 4),
                },
                "citations": citations_for_spans(chunk_pages, sc.chunk.spans),
            }
        )
        if len(results) >= req.top_k:
            break

    return {"query": req.query, "results": results, "timings_ms": outcome.timings_ms}
