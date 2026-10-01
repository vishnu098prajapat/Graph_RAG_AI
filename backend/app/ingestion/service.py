from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Callable

from ..domain.models import DocumentRecord, Page
from ..embeddings.base import Embedder
from ..store.base import ChunkStore
from .chunker import SemanticChunker
from .graph_builder import build_graph
from .parser import parse_pdf

# Chunks per embedding micro-batch — keeps memory bounded for large docs.
EMBED_BATCH = 16

# (stage, processed, total) → None
ProgressCb = Callable[[str, int, int], None]


@dataclass
class IngestResult:
    document: DocumentRecord
    pages: list[Page]
    timings_ms: dict[str, float] = field(default_factory=dict)
    graph: dict | None = None


class IngestionService:
    def __init__(self, store: ChunkStore, embedder: Embedder, chunker: SemanticChunker | None = None):
        self.store = store
        self.embedder = embedder
        self.chunker = chunker or SemanticChunker(embedder)

    # ── public: original single-shot API (unchanged) ─────────────────────────

    def ingest_pdf(self, filename: str, data: bytes, doc_id: str | None = None) -> IngestResult:
        t = time.perf_counter()
        pages, warnings = parse_pdf(data)
        parse_ms = (time.perf_counter() - t) * 1000
        result = self.ingest_pages(filename, pages, doc_id=doc_id, warnings=warnings)
        result.timings_ms["parse"] = round(parse_ms, 2)
        result.timings_ms["total"] = round(result.timings_ms["total"] + parse_ms, 2)
        return result

    def ingest_pages(
        self,
        filename: str,
        pages: list[Page],
        doc_id: str | None = None,
        warnings: list[str] | None = None,
    ) -> IngestResult:
        return self._ingest_pages_impl(filename, pages, doc_id=doc_id, warnings=warnings)

    # ── public: streaming API with progress callbacks ─────────────────────────

    def ingest_pdf_with_progress(
        self,
        filename: str,
        data: bytes,
        doc_id: str | None = None,
        progress_cb: ProgressCb | None = None,
    ) -> IngestResult:
        """Ingest a PDF with per-stage progress callbacks for live UI updates.

        progress_cb is called as (stage, processed, total) where stage is one of:
          "parsing" | "chunking" | "embedding" | "graphing" | "done"
        """
        def _cb(stage: str, done: int, total: int) -> None:
            if progress_cb:
                try:
                    progress_cb(stage, done, total)
                except Exception:
                    pass

        _cb("parsing", 0, 1)
        t = time.perf_counter()
        pages, warnings = parse_pdf(data)
        parse_ms = (time.perf_counter() - t) * 1000
        _cb("parsing", 1, 1)

        result = self._ingest_pages_impl(
            filename, pages, doc_id=doc_id, warnings=warnings, progress_cb=_cb
        )
        result.timings_ms["parse"] = round(parse_ms, 2)
        result.timings_ms["total"] = round(result.timings_ms["total"] + parse_ms, 2)
        return result

    # ── private implementation ────────────────────────────────────────────────

    def _ingest_pages_impl(
        self,
        filename: str,
        pages: list[Page],
        doc_id: str | None = None,
        warnings: list[str] | None = None,
        progress_cb: ProgressCb | None = None,
    ) -> IngestResult:
        doc_id = doc_id or uuid.uuid4().hex[:12]
        timings: dict[str, float] = {}

        def _cb(stage: str, done: int, total: int) -> None:
            if progress_cb:
                try:
                    progress_cb(stage, done, total)
                except Exception:
                    pass

        # ── 1. Semantic chunking (full doc at once for cross-page context) ──
        _cb("chunking", 0, len(pages))
        t = time.perf_counter()
        chunks = self.chunker.chunk(doc_id, pages)
        timings["chunk"] = (time.perf_counter() - t) * 1000
        _cb("chunking", len(pages), len(pages))

        # ── 2. Micro-batch embedding with progress reporting ─────────────────
        n = len(chunks)
        t = time.perf_counter()
        _cb("embedding", 0, n)
        for start in range(0, max(n, 1), EMBED_BATCH):
            batch = chunks[start : start + EMBED_BATCH]
            if not batch:
                break
            vectors = self.embedder.embed_documents([c.text for c in batch])
            for c, v in zip(batch, vectors):
                c.embedding = v
            _cb("embedding", min(start + EMBED_BATCH, n), n)
        timings["embed"] = (time.perf_counter() - t) * 1000

        # ── 3. Persist to store ──────────────────────────────────────────────
        t = time.perf_counter()
        doc = DocumentRecord(
            id=doc_id,
            filename=filename,
            n_pages=len(pages),
            n_chunks=n,
            warnings=warnings or [],
        )
        self.store.add_document(doc)
        self.store.add_chunks(chunks)
        timings["store"] = (time.perf_counter() - t) * 1000

        # ── 4. Knowledge graph — built in a background thread ────────────────
        # Kick off graph construction before calling "done" so the SSE stream
        # unblocks immediately.  The thread is joined here before we return so
        # IngestResult always carries the finished graph dict.
        _cb("graphing", 0, 1)
        graph_holder: dict = {}
        t_graph = time.perf_counter()

        def _build() -> None:
            try:
                graph_holder["graph"] = build_graph(chunks).to_dict()
            except Exception:
                graph_holder["graph"] = {"nodes": [], "edges": []}

        graph_thread = threading.Thread(target=_build, daemon=True)
        graph_thread.start()

        # Fire "done" right now — UI unblocks here, graph is still building
        timings["total"] = sum(timings.values())
        result = IngestResult(doc, pages, {k: round(v, 2) for k, v in timings.items()})
        _cb("done", n, n)

        # Wait for graph (max 30 s) and attach result
        graph_thread.join(timeout=30)
        timings["graph"] = round((time.perf_counter() - t_graph) * 1000, 2)
        result.graph = graph_holder.get("graph", {"nodes": [], "edges": []})
        result.timings_ms["graph"] = timings["graph"]
        result.timings_ms["total"] = round(
            result.timings_ms.get("total", 0) + timings["graph"], 2
        )

        return result
