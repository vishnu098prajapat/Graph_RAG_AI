"""Local transformer embeddings via sentence-transformers (no API key, runs on CPU)."""

from __future__ import annotations

import numpy as np

# bge models are trained with this instruction on the *query* side only.
_BGE_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", batch_size: int = 32):
        from sentence_transformers import SentenceTransformer  # lazy: heavy import

        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.batch_size = batch_size
        self.dim = int(self.model.get_sentence_embedding_dimension())
        self._query_prefix = _BGE_QUERY_PREFIX if "bge" in model_name.lower() else ""

    def embed_documents(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)
        return self.model.encode(
            texts,
            batch_size=self.batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        ).astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_documents([self._query_prefix + text])[0]
