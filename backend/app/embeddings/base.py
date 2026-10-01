from __future__ import annotations

from typing import Protocol, runtime_checkable

import numpy as np


@runtime_checkable
class Embedder(Protocol):
    """All embedders return L2-normalised float32 vectors, so dot product == cosine similarity."""

    dim: int

    def embed_documents(self, texts: list[str]) -> np.ndarray:  # shape (n, dim)
        ...

    def embed_query(self, text: str) -> np.ndarray:  # shape (dim,)
        ...
