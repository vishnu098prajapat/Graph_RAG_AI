"""Hybrid retriever: dense (vector) + sparse (BM25) -> RRF fusion -> rerank."""

from __future__ import annotations

import time
from collections import OrderedDict
from dataclasses import dataclass, field

import numpy as np

from ..domain.models import ScoredChunk
from ..embeddings.base import Embedder
from ..store.base import ChunkStore
from .fusion import reciprocal_rank_fusion
from .reranker import Reranker


@dataclass
class RetrievalResult:
    results: list[ScoredChunk]
    timings_ms: dict[str, float] = field(default_factory=dict)


class HybridRetriever:
    def __init__(
        self,
        store: ChunkStore,
        embedder: Embedder,
        reranker: Reranker | None = None,
        *,
        rrf_k: int = 60,
        dense_weight: float = 1.0,
        sparse_weight: float = 1.0,
        query_cache_size: int = 256,
    ):
        self.store = store
        self.embedder = embedder
        self.reranker = reranker
        self.rrf_k = rrf_k
        self.weights = (dense_weight, sparse_weight)
        self._qcache: OrderedDict[str, np.ndarray] = OrderedDict()
        self._qcache_size = query_cache_size

    def _embed_query(self, query: str) -> np.ndarray:
        hit = self._qcache.get(query)
        if hit is not None:
            self._qcache.move_to_end(query)
            return hit
        vec = self.embedder.embed_query(query)
        self._qcache[query] = vec
        if len(self._qcache) > self._qcache_size:
            self._qcache.popitem(last=False)
        return vec

    def search(
        self,
        query: str,
        *,
        doc_id: str | None = None,
        top_k: int = 5,
        candidates: int = 30,
        mode: str = "hybrid",  # "hybrid" | "dense" | "sparse" (handy for ablations in the eval)
    ) -> RetrievalResult:
        t0 = time.perf_counter()
        timings: dict[str, float] = {}

        qvec = self._embed_query(query) if mode != "sparse" else None
        timings["embed"] = (time.perf_counter() - t0) * 1000

        t = time.perf_counter()
        dense = self.store.dense_search(qvec, candidates, doc_id) if mode != "sparse" else []
        timings["dense"] = (time.perf_counter() - t) * 1000

        t = time.perf_counter()
        sparse = self.store.sparse_search(query, candidates, doc_id) if mode != "dense" else []
        timings["sparse"] = (time.perf_counter() - t) * 1000

        dense_rank = {cid: r for r, (cid, _) in enumerate(dense, start=1)}
        sparse_rank = {cid: r for r, (cid, _) in enumerate(sparse, start=1)}
        dense_score = dict(dense)
        sparse_score = dict(sparse)

        fused = reciprocal_rank_fusion(
            [[c for c, _ in dense], [c for c, _ in sparse]], k=self.rrf_k, weights=self.weights
        )
        ordered = sorted(fused, key=fused.get, reverse=True)[:candidates]
        chunks = self.store.get_chunks(ordered)
        scored = [
            ScoredChunk(
                chunk=chunks[cid],
                score=fused[cid],
                rrf_score=fused[cid],
                dense_rank=dense_rank.get(cid),
                sparse_rank=sparse_rank.get(cid),
                dense_score=dense_score.get(cid),
                sparse_score=sparse_score.get(cid),
            )
            for cid in ordered
            if cid in chunks
        ]

        t = time.perf_counter()
        if self.reranker is not None and scored:
            scores = self.reranker.score(query, [s.chunk for s in scored])
            for s, r in zip(scored, scores):
                s.rerank_score = r
                s.score = r
            # stable sort: ties keep their RRF order
            scored.sort(key=lambda s: s.score, reverse=True)
        timings["rerank"] = (time.perf_counter() - t) * 1000
        timings["total"] = (time.perf_counter() - t0) * 1000
        return RetrievalResult(results=scored[:top_k], timings_ms={k: round(v, 3) for k, v in timings.items()})
