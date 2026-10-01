from __future__ import annotations

from typing import Protocol

import numpy as np

from ..domain.models import Chunk, DocumentRecord


class ChunkStore(Protocol):
    """Storage port. ``MemoryStore`` (dev/tests) and ``PostgresStore`` (pgvector) implement it."""

    def add_document(self, doc: DocumentRecord) -> None: ...

    def add_chunks(self, chunks: list[Chunk]) -> None: ...

    def dense_search(self, qvec: np.ndarray, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        """Return (chunk_id, cosine_similarity), best first."""
        ...

    def sparse_search(self, query: str, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        """Return (chunk_id, lexical_score), best first."""
        ...

    def get_chunks(self, ids: list[str]) -> dict[str, Chunk]: ...
