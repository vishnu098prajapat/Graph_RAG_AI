"""Turn page-local character spans into PDF-space rectangles for the document viewer."""

from __future__ import annotations

from ..domain.models import Page, Span


def rects_for_span(page: Page, start: int, end: int, y_tol: float = 3.0) -> list[list[float]]:
    """Merge the words overlapping [start, end) into one rectangle per visual line.

    Coordinates are PDF points with the origin at the top-left (PyMuPDF convention); the frontend
    scales them by ``rendered_width / page.width``.
    """
    lines: list[list[float]] = []
    for w in page.words:
        if w.end <= start or w.start >= end:
            continue
        if lines and abs(w.y0 - lines[-1][1]) <= y_tol:
            r = lines[-1]
            r[0], r[1] = min(r[0], w.x0), min(r[1], w.y0)
            r[2], r[3] = max(r[2], w.x1), max(r[3], w.y1)
        else:
            lines.append([w.x0, w.y0, w.x1, w.y1])
    return [[round(v, 2) for v in r] for r in lines]


def citations_for_spans(pages_by_number: dict[int, Page], spans: list[Span]) -> list[dict]:
    out = []
    for s in spans:
        page = pages_by_number.get(s.page)
        snippet = page.text[s.start : s.end] if page else ""
        out.append(
            {
                "page": s.page,
                "start": s.start,
                "end": s.end,
                "text": snippet,
                "page_width": page.width if page else None,
                "page_height": page.height if page else None,
                "rects": rects_for_span(page, s.start, s.end) if page else [],
            }
        )
    return out
