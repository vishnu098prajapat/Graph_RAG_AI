"""PostgreSQL + pgvector store.

Dense side : HNSW index, cosine distance (``<=>``).
Sparse side: full-text search with ``ts_rank_cd`` over a stored ``tsvector`` + GIN index.

Note: Postgres' built-in ranking is TF-based, not true BM25. For true BM25 inside Postgres swap the
sparse query for ParadeDB ``pg_search`` (``@@@`` operator + ``paradedb.score``) - the ``ChunkStore``
interface stays identical. Query terms are OR-ed (not AND-ed) so natural-language questions still match.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np

from ..domain.models import Chunk, DocumentRecord, Span

_SCHEMA = Path(__file__).with_name("schema.sql")
_TERM = re.compile(r"[A-Za-z0-9]+")


def _or_tsquery(query: str) -> str | None:
    terms = list(dict.fromkeys(t.lower() for t in _TERM.findall(query) if len(t) > 1))
    return " | ".join(terms) if terms else None


class PostgresStore:
    def __init__(self, dsn: str):
        import psycopg  # noqa: F401  (fail fast with a clear ImportError if missing)
        from pgvector.psycopg import register_vector  # noqa: F401

        self.dsn = dsn
        self.ensure_schema()

    def _connect(self):
        import psycopg
        from pgvector.psycopg import register_vector

        conn = psycopg.connect(self.dsn, autocommit=True)
        register_vector(conn)
        return conn

    def ensure_schema(self) -> None:
        import psycopg

        with psycopg.connect(self.dsn, autocommit=True) as conn:  # extension must exist first
            conn.execute(_SCHEMA.read_text(encoding="utf-8"))

    def add_document(self, doc: DocumentRecord) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO documents (id, filename, n_pages) VALUES (%s, %s, %s) "
                "ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, n_pages = EXCLUDED.n_pages",
                (doc.id, doc.filename, doc.n_pages),
            )

    def add_chunks(self, chunks: list[Chunk]) -> None:
        rows = []
        for c in chunks:
            if c.embedding is None:
                raise ValueError(f"chunk {c.id} has no embedding")
            spans = json.dumps([{"page": s.page, "start": s.start, "end": s.end} for s in c.spans])
            rows.append((c.id, c.doc_id, c.index, c.text, c.char_start, c.char_end, spans, c.embedding))
        with self._connect() as conn, conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO chunks (id, doc_id, idx, text, char_start, char_end, spans, embedding) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb, %s) "
                "ON CONFLICT (id) DO UPDATE SET text = EXCLUDED.text, spans = EXCLUDED.spans, "
                "embedding = EXCLUDED.embedding",
                rows,
            )

    def dense_search(self, qvec: np.ndarray, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        sql = "SELECT id, 1 - (embedding <=> %s) AS sim FROM chunks"
        params: list = [qvec]
        if doc_id is not None:
            sql += " WHERE doc_id = %s"
            params.append(doc_id)
        sql += " ORDER BY embedding <=> %s LIMIT %s"
        params += [qvec, k]
        with self._connect() as conn:
            return [(r[0], float(r[1])) for r in conn.execute(sql, params).fetchall()]

    def sparse_search(self, query: str, k: int, doc_id: str | None) -> list[tuple[str, float]]:
        tsq = _or_tsquery(query)
        if tsq is None:
            return []
        sql = (
            "SELECT id, ts_rank_cd(tsv, q) AS score "
            "FROM chunks, to_tsquery('english', %s) AS q WHERE tsv @@ q"
        )
        params: list = [tsq]
        if doc_id is not None:
            sql += " AND doc_id = %s"
            params.append(doc_id)
        sql += " ORDER BY score DESC LIMIT %s"
        params.append(k)
        with self._connect() as conn:
            return [(r[0], float(r[1])) for r in conn.execute(sql, params).fetchall()]

    def get_chunks(self, ids: list[str]) -> dict[str, Chunk]:
        if not ids:
            return {}
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT id, doc_id, idx, text, char_start, char_end, spans FROM chunks WHERE id = ANY(%s)",
                (ids,),
            ).fetchall()
        out: dict[str, Chunk] = {}
        for id_, doc_id, idx, text, cs, ce, spans in rows:
            spans = spans if isinstance(spans, list) else json.loads(spans)
            out[id_] = Chunk(
                id=id_, doc_id=doc_id, index=idx, text=text, char_start=cs, char_end=ce,
                spans=[Span(s["page"], s["start"], s["end"]) for s in spans],
            )
        return out
