"""Latency + retrieval benchmark on a synthetic 20-page document.

    python -m eval.benchmark

Uses the dependency-free HashingEmbedder, so it measures the *pipeline* (chunking, storage,
fusion, rerank) rather than embedding-model quality. Re-run with COGNIGRAPH_EMBEDDER=sbert to
benchmark the real model, and replace `make_pages` with your own labelled documents for quality.
"""

from __future__ import annotations

import os
import statistics
import time

from app.embeddings.hashing import HashingEmbedder
from app.ingestion.service import IngestionService
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.reranker import LexicalReranker
from app.store.memory import MemoryStore
from tests.synthetic import make_pages


def _embedder():
    if os.environ.get("COGNIGRAPH_EMBEDDER") == "sbert":
        from app.embeddings.sbert import SentenceTransformerEmbedder
        return SentenceTransformerEmbedder()
    return HashingEmbedder()


def evaluate(retriever, qa, mode, k=5):
    hits1 = hitsk = 0
    rr = []
    lat = []
    for question, gold_page, needle in qa:
        t = time.perf_counter()
        res = retriever.search(question, doc_id="bench", top_k=k, mode=mode)
        lat.append((time.perf_counter() - t) * 1000)
        rank = next((i for i, s in enumerate(res.results, 1) if needle in s.chunk.text and gold_page in s.chunk.pages), None)
        hits1 += rank == 1
        hitsk += rank is not None
        rr.append(1 / rank if rank else 0.0)
    n = len(qa)
    lat.sort()
    return {
        "mode": mode, f"hit@1": hits1 / n, f"hit@{k}": hitsk / n, "MRR": statistics.mean(rr),
        "p50_ms": lat[n // 2], "p95_ms": lat[int(n * 0.95) - 1],
    }


def main():
    pages, qa = make_pages(20)
    embedder = _embedder()
    store = MemoryStore()
    res = IngestionService(store, embedder).ingest_pages("synthetic-20p.pdf", pages, doc_id="bench")
    print(f"ingested {res.document.n_pages} pages -> {res.document.n_chunks} chunks in {res.timings_ms['total']} ms")
    print("  breakdown (ms):", res.timings_ms)
    retriever = HybridRetriever(store, embedder, LexicalReranker())
    retriever.search("warm up", doc_id="bench")
    print(f"\n{len(qa)} labelled questions")
    print(f"{'mode':<8} {'hit@1':>6} {'hit@5':>6} {'MRR':>6} {'p50 ms':>8} {'p95 ms':>8}")
    for mode in ("dense", "sparse", "hybrid"):
        r = evaluate(retriever, qa, mode)
        print(f"{r['mode']:<8} {r['hit@1']:>6.2f} {r['hit@5']:>6.2f} {r['MRR']:>6.2f} {r['p50_ms']:>8.2f} {r['p95_ms']:>8.2f}")


if __name__ == "__main__":
    main()
