"""Okapi BM25 implemented from scratch over an inverted index."""

from __future__ import annotations

import heapq
import math
from collections import Counter, defaultdict

from ..text_utils import tokenize


class BM25Index:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self._ids: list[str] = []
        self._doc_len: list[int] = []
        self._postings: dict[str, list[tuple[int, int]]] = defaultdict(list)
        self._avg_len = 0.0

    def build(self, ids: list[str], texts: list[str]) -> "BM25Index":
        self._ids = list(ids)
        self._doc_len = []
        self._postings = defaultdict(list)
        for i, text in enumerate(texts):
            tokens = tokenize(text)
            self._doc_len.append(len(tokens))
            for term, tf in Counter(tokens).items():
                self._postings[term].append((i, tf))
        self._avg_len = (sum(self._doc_len) / len(self._doc_len)) if self._doc_len else 0.0
        return self

    def __len__(self) -> int:
        return len(self._ids)

    def search(self, query: str, k: int = 10) -> list[tuple[str, float]]:
        n = len(self._ids)
        if n == 0:
            return []
        scores: dict[int, float] = defaultdict(float)
        for term in set(tokenize(query)):
            postings = self._postings.get(term)
            if not postings:
                continue
            df = len(postings)
            idf = math.log(1.0 + (n - df + 0.5) / (df + 0.5))
            for doc_idx, tf in postings:
                norm = 1.0 - self.b + self.b * (self._doc_len[doc_idx] / (self._avg_len or 1.0))
                scores[doc_idx] += idf * (tf * (self.k1 + 1.0)) / (tf + self.k1 * norm)
        top = heapq.nlargest(k, scores.items(), key=lambda kv: kv[1])
        return [(self._ids[i], s) for i, s in top if s > 0]
