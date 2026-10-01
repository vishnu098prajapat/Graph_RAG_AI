"""Shared, dependency-free text helpers (tokenisation, light stemming)."""

from __future__ import annotations

import re

_TOKEN = re.compile(r"[a-z0-9]+")

STOPWORDS = frozenset(
    """a an the and or of to in on for with is are was were be been being by at as it its
    this that these those from which who whom what when where how why do does did has have had
    not no can could should would will may might than then so such into over under about
    between many much also""".split()
)


def stem(token: str) -> str:
    """Very small, conservative suffix stripper (good enough for BM25 recall)."""
    n = len(token)
    if n > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if n > 5 and token.endswith("ing"):
        return token[:-3]
    if n > 4 and token.endswith("ed"):
        return token[:-2]
    if n > 3 and token.endswith("s") and not token.endswith("ss"):
        return token[:-1]
    return token


def tokenize(text: str, *, remove_stopwords: bool = True, do_stem: bool = True) -> list[str]:
    tokens = _TOKEN.findall(text.lower())
    if remove_stopwords:
        tokens = [t for t in tokens if t not in STOPWORDS]
    if do_stem:
        tokens = [stem(t) for t in tokens]
    return tokens


def count_tokens(text: str) -> int:
    """Cheap token estimate (whitespace words). Swap for a real tokenizer if needed."""
    return len(text.split())
