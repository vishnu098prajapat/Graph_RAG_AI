from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    data_dir: Path
    store: str  # "memory" | "postgres"
    database_url: str
    embedder: str  # "hashing" | "sbert"
    embedding_model: str
    reranker: str  # "none" | "lexical" | "cross-encoder"
    reranker_model: str
    cors_origins: tuple[str, ...]
    max_upload_mb: int

    @staticmethod
    def from_env() -> "Settings":
        e = os.environ.get
        return Settings(
            data_dir=Path(e("COGNIGRAPH_DATA_DIR", "./data")).resolve(),
            store=e("COGNIGRAPH_STORE", "memory"),
            database_url=e("DATABASE_URL", "postgresql://cognigraph:cognigraph@localhost:5432/cognigraph"),
            embedder=e("COGNIGRAPH_EMBEDDER", "hashing"),
            embedding_model=e("COGNIGRAPH_EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5"),
            reranker=e("COGNIGRAPH_RERANKER", "lexical"),
            reranker_model=e("COGNIGRAPH_RERANKER_MODEL", "cross-encoder/ms-marco-MiniLM-L-6-v2"),
            cors_origins=tuple(
                o.strip() for o in e("COGNIGRAPH_CORS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001").split(",") if o.strip()
            ),
            max_upload_mb=int(e("COGNIGRAPH_MAX_UPLOAD_MB", "200")),
        )
