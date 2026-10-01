"""Synthetic multi-page corpus with known facts (no PDF/parsing dependency)."""

from __future__ import annotations

import random

from app.domain.models import Page, Word

_FILLER = [
    "Routine maintenance is scheduled every quarter according to the standard operating procedure.",
    "All personnel must complete the safety training before entering the restricted area.",
    "The committee reviewed the annual budget and approved the proposed allocation of resources.",
    "Environmental monitoring reports are archived and made available to regulators on request.",
    "Operational data is collected continuously and transmitted to the central control room.",
    "Any deviation from the approved plan must be documented and signed off by a supervisor.",
    "The vendor agreement covers spare parts, remote diagnostics and on-site technical support.",
    "Quarterly performance reviews compare actual output against the forecast for each site.",
]

_NAMES = [
    "Aurelia", "Borealis", "Cygnus", "Draconis", "Eridanus", "Fornax", "Gemini", "Hydra", "Icarus",
    "Jovian", "Kepler", "Lyra", "Mensa", "Norma", "Orion", "Pavo", "Quasar", "Reticulum", "Sagitta", "Taurus",
]
_KINDS = ["wind farm", "solar array", "hydro station", "tidal plant", "biogas facility"]


def make_pages(n_pages: int = 20, seed: int = 7):
    """Return (pages, qa) where qa = [(question, gold_page_number, needle_phrase)]."""
    rng = random.Random(seed)
    pages: list[Page] = []
    qa: list[tuple[str, int, str]] = []
    for i in range(n_pages):
        name = f"{_NAMES[i % len(_NAMES)]}-{i + 11}"
        kind = _KINDS[i % len(_KINDS)]
        units = 40 + i * 7
        year = 1990 + i
        city = f"Port {_NAMES[(i * 3) % len(_NAMES)]}"
        facts = [
            f"The {name} {kind} was commissioned in {year} near {city}.",
            f"The {name} {kind} operates {units} generating units across its site.",
            f"The chief engineer of {name} is reported to hold a doctorate in thermal systems.",
        ]
        body = facts + [rng.choice(_FILLER) for _ in range(14)]
        rng.shuffle(body)
        # paragraphs of ~4 sentences, joined into page text
        paras = [" ".join(body[j : j + 4]) for j in range(0, len(body), 4)]
        text = "\n\n".join(paras)
        pages.append(_page_with_words(i + 1, text))
        qa.append((f"How many generating units does the {name} {kind} operate?", i + 1, f"operates {units} generating units"))
        qa.append((f"When was the {name} {kind} commissioned?", i + 1, f"commissioned in {year}"))
    return pages, qa


def _page_with_words(number: int, text: str) -> Page:
    """Lay words out on a fake grid so bounding-box logic can be tested."""
    words: list[Word] = []
    x, y, pos = 50.0, 60.0, 0
    for token in text.replace("\n\n", " \n\n ").split(" "):
        if token == "":
            pos += 1
            continue
        if token.startswith("\n\n"):
            y += 24
            x = 50.0
            pos += len(token)
            continue
        w = 6.0 * len(token)
        if x + w > 540:
            x, y = 50.0, y + 12
        start = text.find(token, pos)
        words.append(Word(token, x, y, x + w, y + 10, start, start + len(token)))
        pos = start + len(token)
        x += w + 4
    return Page(number=number, text=text, words=words, width=612.0, height=792.0)
