from __future__ import annotations

from collections.abc import Sequence


def reciprocal_rank_fusion(
    rankings: Sequence[Sequence[str]],
    k: int = 60,
    weights: Sequence[float] | None = None,
) -> dict[str, float]:
    """Fuse several ranked id lists (best first) into one score per id.

    score(d) = sum_i  w_i / (k + rank_i(d))       (rank is 1-based)

    RRF needs no score normalisation, which is exactly why it is the standard way to merge
    cosine similarities with BM25 scores that live on completely different scales.
    """
    if weights is None:
        weights = [1.0] * len(rankings)
    if len(weights) != len(rankings):
        raise ValueError("weights must match rankings")
    fused: dict[str, float] = {}
    for ranking, w in zip(rankings, weights):
        for rank, item in enumerate(ranking, start=1):
            fused[item] = fused.get(item, 0.0) + w / (k + rank)
    return fused
