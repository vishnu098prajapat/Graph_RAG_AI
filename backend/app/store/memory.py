"""In-memory store: exact cosine search (numpy) + BM25. Used for dev, tests and benchmarks."""

from __future__ import annotations

import threading

import numpy as np

from ..domain.models import Chunk, DocumentRecord
from ..retrieval.bm25 import BM25Index


class _Index:
    def __init__(self, chunks: list[Chunk]):
        self.ids = [c.id for c in chunks]
        self.matrix = (
            np.vstack([c.embedding for c in chunks]).astype(np.float32)
            if chunks
            else np.zeros((0, 1), dtype=np.float32)
        )
        self.bm25 = BM25Index().build(self.ids, [c.text for c in chunks])


class MemoryStore:
    def __init__(self) -> None:
        self._docs: dict[str, DocumentRecord] = {}
        self._chunks: dict[str, Chunk] = {}
        self._cache: dict[str | None, _Index] = {}
        self._lock = threading.RLock()

    def add_document(self, doc: DocumentRecord) -> None:
        with self._lock:
            self._docs[doc.id] = doc

    def add_chunks(self, chunks: list[Chunk]) -> None:
        with self._lock:
            for c in chunks:
                if c.embedding is None:
                    raise ValueError(f"chunk {c.id} has no embedding")
                self._chunks[c.id] = c
            self._cache.clear()  # indexes are rebuilt lazily on next search

    def _index(self, doc_id: str | None) -> _Index:
        with self._lock:
            idx = self._cache.get(doc_id)
            if idx is None:
                scope = [c for c in self._chunks.values() if doc_id is None or c.doc_id == doc_id]
                scope.sort(key=lambda c: (c.doc_id, c.index))
                idx = self._cache[doc_id] = _Index(scope)
            return idx

    def dense_search(self, qvec: np.ndarray, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        idx = self._index(doc_id)
        if not idx.ids:
            return []
        sims = idx.matrix @ qvec.astype(np.float32)
        k = min(k, len(idx.ids))
        top = np.argpartition(-sims, k - 1)[:k]
        top = top[np.argsort(-sims[top])]
        return [(idx.ids[i], float(sims[i])) for i in top]

    def sparse_search(self, query: str, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        return self._index(doc_id).bm25.search(query, k)

    def get_chunks(self, ids: list[str]) -> dict[str, Chunk]:
        with self._lock:
            return {i: self._chunks[i] for i in ids if i in self._chunks}
