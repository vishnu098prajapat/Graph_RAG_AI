"""On-disk registry for the original PDF and its word-level layout (needed for highlighting)."""

from __future__ import annotations

import json
import threading
from pathlib import Path

from .domain.models import Page, Word


class DocumentRegistry:
    def __init__(self, root: Path):
        self.root = root
        (self.root / "docs").mkdir(parents=True, exist_ok=True)
        self._pages: dict[str, dict[int, Page]] = {}
        self._lock = threading.Lock()

    def _dir(self, doc_id: str) -> Path:
        if not doc_id.isalnum():  # doc ids are hex; refuse anything path-like
            raise KeyError(doc_id)
        return self.root / "docs" / doc_id

    def save_pdf(self, doc_id: str, pdf: bytes) -> None:
        d = self._dir(doc_id)
        d.mkdir(parents=True, exist_ok=True)
        (d / "original.pdf").write_bytes(pdf)

    def save(self, doc_id: str, filename: str, pdf: bytes, pages: list[Page]) -> None:
        d = self._dir(doc_id)
        d.mkdir(parents=True, exist_ok=True)
        pdf_path = d / "original.pdf"
        if not pdf_path.exists():
            pdf_path.write_bytes(pdf)
        layout = {
            "filename": filename,
            "pages": [
                {
                    "number": p.number, "text": p.text, "width": p.width, "height": p.height,
                    "words": [[w.text, w.x0, w.y0, w.x1, w.y1, w.start, w.end] for w in p.words],
                }
                for p in pages
            ],
        }
        (d / "layout.json").write_text(json.dumps(layout), encoding="utf-8")
        with self._lock:
            self._pages[doc_id] = {p.number: p for p in pages}

    def pages(self, doc_id: str) -> dict[int, Page]:
        with self._lock:
            cached = self._pages.get(doc_id)
        if cached is not None:
            return cached
        path = self._dir(doc_id) / "layout.json"
        if not path.exists():
            raise KeyError(doc_id)
        raw = json.loads(path.read_text(encoding="utf-8"))
        pages = {
            p["number"]: Page(
                number=p["number"], text=p["text"], width=p["width"], height=p["height"],
                words=[Word(*w) for w in p["words"]],
            )
            for p in raw["pages"]
        }
        with self._lock:
            self._pages[doc_id] = pages
        return pages

    def filename(self, doc_id: str) -> str:
        return json.loads((self._dir(doc_id) / "layout.json").read_text(encoding="utf-8"))["filename"]

    def pdf_path(self, doc_id: str) -> Path:
        p = self._dir(doc_id) / "original.pdf"
        if not p.exists():
            raise KeyError(doc_id)
        return p

    def all_ids(self) -> list[str]:
        base = self.root / "docs"
        return sorted(p.name for p in base.iterdir() if (p / "layout.json").exists())

    # ── Knowledge-graph persistence ──────────────────────────────────────────

    def save_graph(self, doc_id: str, graph: dict) -> None:
        """Persist the knowledge graph dict to disk."""
        d = self._dir(doc_id)
        (d / "graph.json").write_text(
            __import__("json").dumps(graph, ensure_ascii=False), encoding="utf-8"
        )

    def load_graph(self, doc_id: str) -> dict | None:
        """Return the stored graph dict, or None if not built yet."""
        path = self._dir(doc_id) / "graph.json"
        if not path.exists():
            return None
        return __import__("json").loads(path.read_text(encoding="utf-8"))
