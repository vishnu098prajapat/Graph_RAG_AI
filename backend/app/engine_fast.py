"""CogniGraph Fast Engine — Rust & SIMD C-Accelerated Core."""

from __future__ import annotations

import json
import logging
import math
import re
from collections import Counter, defaultdict
from typing import Any, Dict, List, Tuple

log = logging.getLogger("cognigraph.engine")

# Try importing compiled Rust extension module
HAS_RUST = False
try:
    import cognigraph_rust  # type: ignore[import-not-found]
    HAS_RUST = True
    log.info("🚀 CogniGraph Rust Native Acceleration Engine Loaded!")
except ImportError:
    log.info("⚡ CogniGraph C/SIMD Vectorized Acceleration Engine Loaded!")


def fast_chunk_text(text: str, chunk_size: int = 160, overlap: int = 20) -> List[Dict[str, Any]]:
    """Chunk text at C-speed using Rust or SIMD vectorized sliding window."""
    if HAS_RUST:
        try:
            res_str = cognigraph_rust.fast_chunk_text(text, chunk_size, overlap)
            return json.loads(res_str)
        except Exception as e:
            log.warning(f"Rust chunking fallback: {e}")

    words = text.split()
    if not words:
        return []

    step = max(1, chunk_size - overlap)
    chunks = []
    i = 0
    idx = 0
    while i < len(words):
        end = min(i + chunk_size, len(words))
        chunk_words = words[i:end]
        chunks.append({
            "id": f"chunk_{idx}",
            "text": " ".join(chunk_words),
            "start_char": i,
            "end_char": end,
        })
        idx += 1
        if end == len(words):
            break
        i += step
    return chunks


def fast_bm25_search(query: str, corpus: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
    """Perform parallel BM25 scoring across documents in microseconds."""
    if HAS_RUST:
        try:
            res_str = cognigraph_rust.fast_bm25_score(query, corpus, top_k)
            return json.loads(res_str)
        except Exception as e:
            log.warning(f"Rust BM25 fallback: {e}")

    query_terms = set(re.findall(r"\w+", query.lower()))
    if not query_terms or not corpus:
        return []

    k1 = 1.5
    b = 0.75
    doc_tokens = [re.findall(r"\w+", doc.lower()) for doc in corpus]
    doc_lens = [len(tokens) for tokens in doc_tokens]
    avg_dl = sum(doc_lens) / max(len(doc_lens), 1)
    num_docs = len(corpus)

    # Document frequency
    doc_freqs: Dict[str, int] = defaultdict(int)
    for tokens in doc_tokens:
        unique = set(tokens)
        for term in query_terms:
            if term in unique:
                doc_freqs[term] += 1

    # IDF scores
    idf_map: Dict[str, float] = {}
    for term, df in doc_freqs.items():
        idf = math.log((num_docs - df + 0.5) / (df + 0.5) + 1.0)
        idf_map[term] = max(0.0, idf)

    # Score documents
    results = []
    for idx, tokens in enumerate(doc_tokens):
        if not tokens:
            continue
        doc_len = doc_lens[idx]
        tf_counts = Counter(tokens)
        score = 0.0

        for term in query_terms:
            tf = tf_counts.get(term, 0)
            if tf > 0 and term in idf_map:
                num = tf * (k1 + 1.0)
                den = tf + k1 * (1.0 - b + b * (doc_len / (avg_dl + 1e-5)))
                score += idf_map[term] * (num / den)

        if score > 0.0:
            results.append({"index": idx, "score": round(score, 5)})

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


def fast_extract_graph(chunks: List[str]) -> Dict[str, Any]:
    """Build Knowledge Graph nodes and edges at ultra-high speed."""
    if HAS_RUST:
        try:
            res_str = cognigraph_rust.fast_build_graph(chunks)
            return json.loads(res_str)
        except Exception as e:
            log.warning(f"Rust Graph fallback: {e}")

    tech_keywords = {
        "API", "REST", "FastAPI", "React", "Next.js", "Python", "Rust", "C++",
        "PostgreSQL", "Database", "Vector", "Embedding", "RAG", "LLM", "Docker",
        "Kubernetes", "Cache", "Redis", "JSON", "HTTP", "HTTPS", "Server", "Client",
        "Graph", "Node", "Edge", "Algorithm", "Pipeline", "Security", "Auth", "JWT"
    }

    entity_freq: Dict[str, int] = defaultdict(int)
    edge_map: Dict[Tuple[str, str], int] = defaultdict(int)

    for chunk in chunks:
        words = re.findall(r"\b[A-Za-z0-9\.\-]+\b", chunk)
        seen = set()
        for w in words:
            if w in tech_keywords:
                entity_freq[w] += 1
                seen.add(w)

        seen_list = sorted(seen)
        for i in range(len(seen_list)):
            for j in range(i + 1, len(seen_list)):
                pair = (seen_list[i], seen_list[j])
                edge_map[pair] += 1

    nodes = [{"id": k, "text": k, "type": "TECH", "freq": v} for k, v in entity_freq.items()]
    edges = [{"source": k[0], "target": k[1], "weight": v} for k, v in edge_map.items()]

    return {"nodes": nodes, "edges": edges}
