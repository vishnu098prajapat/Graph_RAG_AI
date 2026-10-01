"""
Build a KnowledgeGraph from extracted entities.

Nodes  → entities (TECH / CONCEPT / TERM / ORG / PERSON)
Edges  → entity pairs that co-occur in the same chunk

The graph is returned as a plain dict ready for JSON serialisation
and storage by DocumentRegistry.
"""

from __future__ import annotations

import hashlib
from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Tuple

from .entity_extractor import RawEntity, extract_entities


# ── Data model ───────────────────────────────────────────────────────────────

@dataclass
class GraphNode:
    id: str        # short MD5 hex of the entity key
    text: str      # display label
    etype: str     # TECH | CONCEPT | TERM | ORG | PERSON
    freq: int      # total mention count
    pages: List[int]


@dataclass
class GraphEdge:
    source: str    # GraphNode.id
    target: str    # GraphNode.id
    weight: float  # normalised co-occurrence  [0, 1]


@dataclass
class KnowledgeGraph:
    nodes: List[GraphNode]
    edges: List[GraphEdge]

    def to_dict(self) -> dict:
        return {
            "nodes": [
                {
                    "id":    n.id,
                    "text":  n.text,
                    "type":  n.etype,
                    "freq":  n.freq,
                    "pages": n.pages,
                }
                for n in self.nodes
            ],
            "edges": [
                {"source": e.source, "target": e.target, "weight": e.weight}
                for e in self.edges
            ],
        }


# ── Builder ──────────────────────────────────────────────────────────────────

def _stable_id(key: str) -> str:
    return hashlib.md5(key.encode()).hexdigest()[:12]


def build_graph(chunks, top_entities: int = 80, max_edges: int = 150) -> KnowledgeGraph:
    """
    Extract entities from ``chunks`` and build a co-occurrence knowledge graph.

    Parameters
    ----------
    chunks       : iterable of app.domain.models.Chunk
    top_entities : how many entities to surface as nodes
    max_edges    : cap on edges (keeps the graph readable)
    """
    raw_entities, chunk_candidates = extract_entities(chunks, top_n=top_entities)

    # ── Build node index ─────────────────────────────────────────────────────
    nodes: Dict[str, GraphNode] = {}     # key → node
    key_to_id: Dict[str, str] = {}       # key → stable node id

    for ent in raw_entities:
        nid = _stable_id(ent.key)
        nodes[ent.key] = GraphNode(
            id=nid,
            text=ent.text,
            etype=ent.etype,
            freq=len(ent.mentions),
            pages=ent.pages,
        )
        key_to_id[ent.key] = nid

    # ── Count co-occurrences ─────────────────────────────────────────────────
    cooc: Dict[Tuple[str, str], int] = defaultdict(int)

    for _cid, keys in chunk_candidates.items():
        key_list = sorted(k for k in keys if k in nodes)
        for i in range(len(key_list)):
            for j in range(i + 1, len(key_list)):
                a, b = key_list[i], key_list[j]
                pair = (a, b)   # already sorted
                cooc[pair] += 1

    # ── Normalise and prune weak edges ───────────────────────────────────────
    if not cooc:
        return KnowledgeGraph(nodes=list(nodes.values()), edges=[])

    max_w = max(cooc.values())
    sorted_edges = sorted(cooc.items(), key=lambda kv: kv[1], reverse=True)

    edges: List[GraphEdge] = []
    for (a, b), w in sorted_edges[:max_edges]:
        normalised = round(w / max_w, 3)
        if normalised < 0.04:
            break
        edges.append(GraphEdge(
            source=key_to_id[a],
            target=key_to_id[b],
            weight=normalised,
        ))

    return KnowledgeGraph(nodes=list(nodes.values()), edges=edges)
