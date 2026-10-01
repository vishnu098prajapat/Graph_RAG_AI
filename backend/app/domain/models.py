"""Core domain objects. Everything the pipeline passes around lives here.

Offset convention (important for citation highlighting):
  * A ``Page`` owns its ``text`` and a list of ``Word`` boxes.
  * ``Word.start/end`` are character offsets *into that page's text*.
  * A ``Span`` is a page-local character range, so any chunk can be mapped back to
    exact bounding boxes on the rendered PDF page.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass(frozen=True)
class Word:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    start: int  # page-local char offset (inclusive)
    end: int  # page-local char offset (exclusive)


@dataclass
class Page:
    number: int  # 1-based, matches what a PDF viewer shows
    text: str
    words: list[Word] = field(default_factory=list)
    width: float = 0.0
    height: float = 0.0


@dataclass(frozen=True)
class Span:
    page: int
    start: int
    end: int


@dataclass
class Chunk:
    id: str
    doc_id: str
    index: int
    text: str  # whitespace-normalised, used for embedding / display
    char_start: int  # offsets into the concatenated document text
    char_end: int
    spans: list[Span]
    embedding: np.ndarray | None = field(default=None, repr=False, compare=False)

    @property
    def pages(self) -> list[int]:
        return sorted({s.page for s in self.spans})


@dataclass
class ScoredChunk:
    chunk: Chunk
    score: float
    rrf_score: float = 0.0
    dense_rank: int | None = None
    sparse_rank: int | None = None
    dense_score: float | None = None
    sparse_score: float | None = None
    rerank_score: float | None = None


@dataclass
class DocumentRecord:
    id: str
    filename: str
    n_pages: int
    n_chunks: int = 0
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "filename": self.filename,
            "n_pages": self.n_pages,
            "n_chunks": self.n_chunks,
            "warnings": self.warnings,
        }
