"""
Rule-based entity extraction — zero external NLP dependencies.

Pipeline per document:
  1. For each chunk, collect candidate strings via regex patterns:
       • Capitalised n-grams (proper nouns, concepts)
       • CamelCase identifiers  (Python classes, Java types …)
       • ALL_CAPS abbreviations (REST, API, JWT …)
       • Hyphenated technical phrases (co-occurrence, self-attention …)
       • Versioned names (HTTP 2.0, Python 3.11 …)
  2. Filter stop-words + sub-3-char tokens.
  3. Score every candidate with TF-IDF across chunks.
  4. Return top-N entities ranked by score, each carrying:
       - canonical display text
       - entity type  (TECH | CONCEPT | TERM | ORG | PERSON)
       - frequency (total mention count across all chunks)
       - which pages and chunk-ids the entity appears in
"""

from __future__ import annotations

import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple

# ── Stop-word lists ─────────────────────────────────────────────────────────

_GENERAL_STOP = frozenset("""
a about above after again against all am an and any are aren't as at be
because been before being below between both but by can't cannot could
couldn't did didn't do does doesn't doing don't down during each few for
from further get got had hadn't has hasn't have haven't having he he'd
he'll he's her here here's hers herself him himself his how how's i i'd
i'll i'm i've if in into is isn't it it's its itself let's me more most
mustn't my myself no nor not of off on once only or other ought our ours
ourselves out over own same shan't she she'd she'll she's should shouldn't
so some such than that that's the their theirs them themselves then there
there's these they they'd they'll they're they've this those through to too
under until up very was wasn't we we'd we'll we're we've were weren't what
what's when when's where where's which while who who's whom why why's will
with won't would wouldn't you you'd you'll you're you've your yours yourself
yourselves also can make may might need one two three four five six seven
eight nine ten said says used using thus hence therefore however although
within without per via such also well even just like type example e g i e
etc chapter section figure table page note see vs et al the a an
""".split())

_TECH_STOP = frozenset("""
system data value object function return type class method property result
output input parameter variable list array set map key string number boolean
integer float null undefined true false new this error exception message
request response body header status code path version field name item
""".split())

_ALL_STOP: frozenset[str] = _GENERAL_STOP | _TECH_STOP

# ── Regex patterns ───────────────────────────────────────────────────────────

# Multi-word capitalised: "Transformer Architecture", "Self-Attention Mechanism"
_CAP_PHRASE = re.compile(
    r'\b([A-Z][a-zA-Z]{1,30}(?:[ \-][A-Z][a-zA-Z]{1,30}){0,3})\b'
)
# CamelCase: "GraphAttentionNetwork", "BertTokenizer"
_CAMEL = re.compile(r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)+[a-zA-Z0-9]*)\b')
# ALL_CAPS: "REST", "BERT", "RAG", "RRF" (2-10 chars)
_ALLCAPS = re.compile(r'\b([A-Z]{2,10})\b')
# Hyphenated phrases: "cross-attention", "graph-of-thought"
_HYPHEN = re.compile(r'\b([a-zA-Z]{2,}(?:-[a-zA-Z]{2,})+)\b')
# Versioned: "GPT-4", "BERT-large", "Python 3.11", "HTTP/2"
_VERSIONED = re.compile(r'\b([A-Za-z][A-Za-z0-9]*[\s\-/](?:v?\d+(?:\.\d+)*))\b')

# ── Type-classification helpers ──────────────────────────────────────────────

_TECH_SUFFIXES = re.compile(
    r'(?:API|SDK|DB|SQL|NoSQL|ORM|CLI|GUI|UI|UX|JWT|HTTP|REST|RPC|gRPC|'
    r'CSS|HTML|JSON|YAML|XML|RAG|LLM|ML|AI|GPU|CPU|CDN|DNS|TCP|UDP|TLS|SSL|'
    r'OAuth|CRUD|ACID|BASE|CAP|HNSW|BM25|RRF|NLP|NER|TF|IDF|Transformer|'
    r'Embedding|Encoder|Decoder|Attention|Retriever|Reranker|Vector|Tokenizer|'
    r'Bert|GPT|LLaMA|Mistral|T5|CLIP|LoRA|PEFT|RAG|Chain|Prompt|Context)s?$',
    re.IGNORECASE,
)
_ORG_SUFFIXES = re.compile(
    r'(?:Inc\.?|Ltd\.?|Corp\.?|LLC\.?|LLP|Co\.?|Company|Foundation|'
    r'Institute|University|College|Lab(?:s)?|Research|Group|Center|Centre)$'
)
_PERSON_PREFIX = re.compile(r'^(?:Dr|Mr|Mrs|Ms|Prof|Sir|Dame)\.?\s', re.IGNORECASE)


def _classify(text: str) -> str:
    """Heuristic entity-type classifier."""
    if _PERSON_PREFIX.match(text):
        return "PERSON"
    if _ORG_SUFFIXES.search(text):
        return "ORG"
    if (_TECH_SUFFIXES.search(text)
            or _ALLCAPS.fullmatch(text)
            or _CAMEL.fullmatch(text)):
        return "TECH"
    words = text.split()
    if len(words) > 1 and all(w and w[0].isupper() for w in words):
        return "CONCEPT"
    return "TERM"


# ── Public API ───────────────────────────────────────────────────────────────

@dataclass
class RawEntity:
    text: str               # best canonical form (most title-cased)
    key: str                # lower-cased dedup key
    etype: str              # TECH | CONCEPT | TERM | ORG | PERSON
    mentions: List[str]     # chunk ids (with repeats)
    pages: List[int]        # unique pages, sorted


def extract_entities(
    chunks,
    top_n: int = 80,
) -> Tuple[List[RawEntity], Dict[str, Set[str]]]:
    """
    Extract entities from an iterable of Chunk objects.

    Returns
    -------
    entities : list[RawEntity]  — top_n entities sorted by TF-IDF score
    chunk_candidates : dict[chunk_id, set[key]]  — which entities appear in each chunk
    """
    n_chunks = max(len(chunks), 1)

    # entity_key → RawEntity (accumulate while scanning)
    emap: Dict[str, RawEntity] = {}
    # chunk_id → set of entity keys seen in that chunk
    chunk_seen: Dict[str, Set[str]] = {}
    # entity_key → number of distinct chunks it appears in (doc-freq for IDF)
    doc_freq: Counter[str] = Counter()

    for chunk in chunks:
        text: str = chunk.text
        pages = sorted({sp.page for sp in chunk.spans})
        cid: str = chunk.id

        seen_this_chunk: Set[str] = set()

        # collect all raw candidate strings
        candidates: List[str] = []
        for pattern in (_CAP_PHRASE, _CAMEL, _ALLCAPS, _HYPHEN, _VERSIONED):
            candidates.extend(pattern.findall(text))

        for raw in candidates:
            raw = raw.strip()
            if len(raw) < 3:
                continue
            lower = raw.lower()
            if lower in _ALL_STOP:
                continue
            # reject pure numbers / punctuation
            if re.fullmatch(r'[\d\s\W]+', raw):
                continue
            key = re.sub(r'\s+', ' ', lower).strip()
            if not key or len(key) < 3:
                continue

            if key not in emap:
                emap[key] = RawEntity(
                    text=raw, key=key, etype=_classify(raw),
                    mentions=[], pages=[],
                )
            else:
                # prefer the version with more capitalised characters
                existing_caps = sum(c.isupper() for c in emap[key].text)
                new_caps = sum(c.isupper() for c in raw)
                if new_caps > existing_caps:
                    emap[key].text = raw

            emap[key].mentions.append(cid)
            for p in pages:
                if p not in emap[key].pages:
                    emap[key].pages.append(p)

            if key not in seen_this_chunk:
                seen_this_chunk.add(key)
                doc_freq[key] += 1

        chunk_seen[cid] = seen_this_chunk

    # ── TF-IDF scoring ──────────────────────────────────────────────────────
    scored: List[Tuple[float, str]] = []
    for key, ent in emap.items():
        df = max(doc_freq[key], 1)
        idf = math.log((n_chunks + 1) / (df + 1)) + 1.0
        tf = len(ent.mentions) / n_chunks
        scored.append((tf * idf, key))

    scored.sort(reverse=True)
    top_keys = {k for _, k in scored[:top_n]}

    # sort pages, deduplicate mentions
    result: List[RawEntity] = []
    for key in top_keys:
        ent = emap[key]
        ent.pages = sorted(set(ent.pages))
        result.append(ent)

    # filter chunk_seen to only include surviving keys
    filtered: Dict[str, Set[str]] = {
        cid: {k for k in keys if k in top_keys}
        for cid, keys in chunk_seen.items()
    }

    return result, filtered
