"""Semantic, offset-preserving chunker.

Design goals
------------
1. **Cross-page context**: chunking runs over the *whole document* text, so a sentence (or a
   topic) that continues across a page break stays in one chunk.
2. **Exact provenance**: every chunk carries page-local ``Span`` offsets, which the highlighter
   turns into PDF bounding boxes. Nothing is lost by normalising the chunk text, because offsets
   always refer to the original page text.
3. **Semantic boundaries**: when an embedder is supplied, chunks are cut where the similarity
   between neighbouring sentence windows drops (a topic shift), instead of at a blind fixed size.
   Size limits (min / target / max) still apply, plus sentence overlap for retrieval recall.
"""

from __future__ import annotations

import bisect
import re
from dataclasses import dataclass

import numpy as np

from ..domain.models import Chunk, Page, Span
from ..embeddings.base import Embedder
from ..text_utils import count_tokens

# Sentence end followed by whitespace and something that looks like a sentence start,
# or a blank line (paragraph break).
_BOUNDARY = re.compile(r"(?<=[.!?])\s+(?=[\"'(\[]?[A-Z0-9])|\n{2,}")
_WORD = re.compile(r"\S+")

_ABBREVIATIONS = frozenset(
    {
        "e.g.", "i.e.", "etc.", "vs.", "fig.", "figs.", "eq.", "eqs.", "al.", "dr.", "mr.",
        "mrs.", "ms.", "prof.", "no.", "sec.", "ref.", "approx.", "inc.", "ltd.", "st.",
        "cf.", "resp.", "vol.", "pp.", "p.",
    }
)
_INITIAL = re.compile(r"^[A-Z]\.$")


@dataclass(frozen=True)
class Sentence:
    start: int
    end: int
    tokens: int


def split_sentences(text: str) -> list[Sentence]:
    """Split ``text`` into sentences, returning exact (start, end) offsets."""
    out: list[Sentence] = []

    def emit(a: int, b: int) -> None:
        raw = text[a:b]
        stripped = raw.strip()
        if not stripped:
            return
        s = a + (len(raw) - len(raw.lstrip()))
        out.append(Sentence(s, s + len(stripped), count_tokens(stripped)))

    cursor = 0
    for m in _BOUNDARY.finditer(text):
        if "\n\n" not in m.group():  # a sentence-end boundary: guard against abbreviations
            words = text[max(0, m.start() - 16) : m.start()].split()
            last = words[-1] if words else ""
            if last.lower() in _ABBREVIATIONS or _INITIAL.match(last):
                continue
        emit(cursor, m.start())
        cursor = m.end()
    emit(cursor, len(text))
    return out


def _hard_split(sent: Sentence, text: str, max_tokens: int) -> list[Sentence]:
    """Break an over-long 'sentence' (tables, run-ons) into word windows."""
    if sent.tokens <= max_tokens:
        return [sent]
    pieces: list[Sentence] = []
    words = list(_WORD.finditer(text, sent.start, sent.end))
    for i in range(0, len(words), max_tokens):
        group = words[i : i + max_tokens]
        pieces.append(Sentence(group[0].start(), group[-1].end(), len(group)))
    return pieces


class PageIndex:
    """Maps offsets in the concatenated document text back to page-local spans."""

    def __init__(self, pages: list[Page]):
        self.pages = pages
        self.text = "\n".join(p.text for p in pages)
        self._starts: list[int] = []
        cursor = 0
        for p in pages:
            self._starts.append(cursor)
            cursor += len(p.text) + 1  # +1 for the joining newline

    def spans(self, start: int, end: int) -> list[Span]:
        if not self.pages or end <= start:
            return []
        first = max(bisect.bisect_right(self._starts, start) - 1, 0)
        spans: list[Span] = []
        for i in range(first, len(self.pages)):
            page_start = self._starts[i]
            if page_start >= end:
                break
            page = self.pages[i]
            lo = max(start, page_start) - page_start
            hi = min(end, page_start + len(page.text)) - page_start
            if hi > lo:
                spans.append(Span(page.number, lo, hi))
        return spans


class SemanticChunker:
    def __init__(
        self,
        embedder: Embedder | None = None,
        *,
        target_tokens: int = 160,
        max_tokens: int = 256,
        min_tokens: int = 48,
        overlap_sentences: int = 1,
        breakpoint_percentile: float = 20.0,
        window: int = 1,
    ):
        if not (0 < min_tokens <= target_tokens <= max_tokens):
            raise ValueError("require 0 < min_tokens <= target_tokens <= max_tokens")
        self.embedder = embedder
        self.target_tokens = target_tokens
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.overlap_sentences = overlap_sentences
        self.breakpoint_percentile = breakpoint_percentile
        self.window = window

    # -- public ---------------------------------------------------------------------------------
    def chunk(self, doc_id: str, pages: list[Page]) -> list[Chunk]:
        index = PageIndex(pages)
        text = index.text
        sents: list[Sentence] = []
        for s in split_sentences(text):
            sents.extend(_hard_split(s, text, self.max_tokens))
        if not sents:
            return []

        breaks = self._semantic_breaks(text, sents)
        groups = self._pack(sents, breaks)

        chunks: list[Chunk] = []
        for i, (a, b) in enumerate(groups):
            start, end = sents[a].start, sents[b].end
            chunks.append(
                Chunk(
                    id=f"{doc_id}:{i:04d}",
                    doc_id=doc_id,
                    index=i,
                    text=" ".join(text[start:end].split()),
                    char_start=start,
                    char_end=end,
                    spans=index.spans(start, end),
                )
            )
        return chunks

    # -- internals ------------------------------------------------------------------------------
    def _semantic_breaks(self, text: str, sents: list[Sentence]) -> list[bool]:
        """breaks[i] is True when a topic shift is detected *after* sentence i."""
        n = len(sents)
        breaks = [False] * n
        if self.embedder is None or n < 4:
            return breaks
        w = self.window
        windows = [
            " ".join(text[sents[j].start : sents[j].end] for j in range(max(0, i - w), min(n, i + w + 1)))
            for i in range(n)
        ]
        emb = self.embedder.embed_documents(windows)
        sims = np.einsum("ij,ij->i", emb[:-1], emb[1:])  # cosine (embeddings are unit-norm)
        threshold = float(np.percentile(sims, self.breakpoint_percentile))
        for i, s in enumerate(sims):
            breaks[i] = bool(s < threshold)
        return breaks

    def _pack(self, sents: list[Sentence], breaks: list[bool]) -> list[tuple[int, int]]:
        """Greedy packing -> list of inclusive (first_sentence, last_sentence) index pairs."""
        groups: list[tuple[int, int]] = []
        cur: list[int] = []
        cur_tokens = 0
        fresh = 0  # sentences added since the last flush (i.e. not just overlap)

        def flush(keep_overlap: bool) -> None:
            nonlocal cur, cur_tokens, fresh
            if fresh > 0 and cur:
                groups.append((cur[0], cur[-1]))
            if keep_overlap and self.overlap_sentences and len(cur) > self.overlap_sentences and fresh > 0:
                cur = cur[-self.overlap_sentences :]
                cur_tokens = sum(sents[j].tokens for j in cur)
            else:
                cur, cur_tokens = [], 0
            fresh = 0

        i, n = 0, len(sents)
        while i < n:
            s = sents[i]
            if cur and cur_tokens + s.tokens > self.max_tokens:
                if fresh == 0:  # only overlap left and still too big: drop overlap, avoid a loop
                    cur, cur_tokens = [], 0
                else:
                    flush(keep_overlap=True)
                continue
            cur.append(i)
            cur_tokens += s.tokens
            fresh += 1
            if i < n - 1:
                if breaks[i] and cur_tokens >= self.min_tokens:
                    flush(keep_overlap=False)  # topic shift: don't drag old context along
                elif cur_tokens >= self.target_tokens:
                    flush(keep_overlap=True)
            i += 1
        flush(keep_overlap=False)
        return groups
