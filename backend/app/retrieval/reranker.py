"""Second-stage rerankers. Score (query, passage) pairs jointly, on a small candidate set."""

from __future__ import annotations

from typing import Protocol

from ..domain.models import Chunk
from ..text_utils import tokenize


class Reranker(Protocol):
    def score(self, query: str, chunks: list[Chunk]) -> list[float]: ...


class LexicalReranker:
    """No-model fallback: query-term coverage plus bigram overlap. Cheap and deterministic."""

    def score(self, query: str, chunks: list[Chunk]) -> list[float]:
        q = tokenize(query)
        q_terms = set(q)
        q_bigrams = set(zip(q, q[1:]))
        out: list[float] = []
        for c in chunks:
            t = tokenize(c.text)
            t_terms = set(t)
            coverage = len(q_terms & t_terms) / len(q_terms) if q_terms else 0.0
            bigram = len(q_bigrams & set(zip(t, t[1:]))) / len(q_bigrams) if q_bigrams else 0.0
            out.append(coverage + 0.5 * bigram)
        return out


class CrossEncoderReranker:
    """Cross-encoder (default: MS MARCO MiniLM, ~22M params, fast on CPU)."""

    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        from sentence_transformers import CrossEncoder  # lazy: heavy import

        self.model = CrossEncoder(model_name)

    def score(self, query: str, chunks: list[Chunk]) -> list[float]:
        if not chunks:
            return []
        scores = self.model.predict([(query, c.text) for c in chunks], show_progress_bar=False)
        return [float(s) for s in scores]
