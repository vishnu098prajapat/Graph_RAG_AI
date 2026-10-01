"""Dependency-free embedder based on the hashing trick (unigrams + bigrams).

Not semantic: it captures lexical overlap only. It exists so that the whole pipeline (chunking,
storage, hybrid search, tests, CI) runs instantly with zero model downloads. Production quality
comes from ``SentenceTransformerEmbedder``; both share the same 384-d unit-vector contract.
"""

from __future__ import annotations

import math
import zlib
from collections import Counter

import numpy as np

from ..text_utils import tokenize


class HashingEmbedder:
    def __init__(self, dim: int = 384):
        self.dim = dim

    def _vec(self, text: str) -> np.ndarray:
        tokens = tokenize(text)
        feats = Counter(tokens)
        feats.update(f"{a}_{b}" for a, b in zip(tokens, tokens[1:]))
        v = np.zeros(self.dim, dtype=np.float32)
        for feat, tf in feats.items():
            h = zlib.crc32(feat.encode("utf-8"))  # stable across processes (unlike hash())
            sign = 1.0 if (h >> 31) & 1 else -1.0
            v[h % self.dim] += sign * (1.0 + math.log(tf))
        norm = float(np.linalg.norm(v))
        return v / norm if norm > 0 else v

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        return np.vstack([self._vec(t) for t in texts])

    def embed_query(self, text: str) -> np.ndarray:
        return self._vec(text)
