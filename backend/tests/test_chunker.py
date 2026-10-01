import unittest

from app.domain.models import Page
from app.embeddings.hashing import HashingEmbedder
from app.ingestion.chunker import PageIndex, SemanticChunker, split_sentences
from tests.synthetic import make_pages


class SentenceSplitTests(unittest.TestCase):
    def test_offsets_are_exact(self):
        text = "First sentence here.  Second one follows! Is this third? Yes."
        sents = split_sentences(text)
        self.assertEqual([text[s.start:s.end] for s in sents],
                         ["First sentence here.", "Second one follows!", "Is this third?", "Yes."])

    def test_abbreviations_and_initials_do_not_split(self):
        text = "See Fig. 3 for details, e.g. the curve. J. Smith et al. agree. Next sentence."
        parts = [text[s.start:s.end] for s in split_sentences(text)]
        self.assertEqual(parts, ["See Fig. 3 for details, e.g. the curve.", "J. Smith et al. agree.", "Next sentence."])

    def test_decimals_do_not_split(self):
        parts = [s for s in split_sentences("The value is 3.14 today. Done.")]
        self.assertEqual(len(parts), 2)

    def test_paragraph_break_splits(self):
        text = "A heading without punctuation\n\nBody starts here."
        self.assertEqual(len(split_sentences(text)), 2)


class PageIndexTests(unittest.TestCase):
    def test_span_crossing_page_boundary(self):
        pages = [Page(1, "aaaa bbbb"), Page(2, "cccc dddd")]
        idx = PageIndex(pages)
        self.assertEqual(idx.text, "aaaa bbbb\ncccc dddd")
        spans = idx.spans(5, 14)  # "bbbb\ncccc"
        self.assertEqual([(s.page, s.start, s.end) for s in spans], [(1, 5, 9), (2, 0, 4)])
        for s in spans:  # offsets must slice the *page* text correctly
            self.assertTrue(pages[s.page - 1].text[s.start:s.end].strip())


class ChunkerTests(unittest.TestCase):
    def setUp(self):
        self.pages, _ = make_pages(6)
        self.embedder = HashingEmbedder()

    def test_chunks_respect_size_limits_and_cover_text(self):
        chunker = SemanticChunker(self.embedder, target_tokens=60, max_tokens=90, min_tokens=20)
        chunks = chunker.chunk("d1", self.pages)
        self.assertGreater(len(chunks), 6)
        for c in chunks:
            self.assertLessEqual(len(c.text.split()), 90)
        self.assertEqual([c.index for c in chunks], list(range(len(chunks))))
        # every original sentence's start must be covered by at least one chunk
        covered = set()
        for c in chunks:
            covered.update(range(c.char_start, c.char_end))
        text = PageIndex(self.pages).text
        for s in split_sentences(text):
            self.assertIn(s.start, covered)

    def test_span_offsets_reproduce_chunk_text(self):
        chunker = SemanticChunker(self.embedder, target_tokens=60, max_tokens=90, min_tokens=20)
        by_page = {p.number: p for p in self.pages}
        for c in chunker.chunk("d1", self.pages):
            joined = " ".join(" ".join(by_page[s.page].text[s.start:s.end].split()) for s in c.spans)
            self.assertEqual(joined, c.text)

    def test_cross_page_sentence_stays_together(self):
        pages = [Page(1, "The reactor was shut down after the coolant pump"), Page(2, "failed during the night shift. Then it restarted.")]
        chunks = SemanticChunker(None, target_tokens=100, max_tokens=200, min_tokens=5).chunk("d", pages)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0].pages, [1, 2])
        self.assertIn("coolant pump failed during", chunks[0].text)

    def test_overlong_sentence_is_hard_split_without_looping(self):
        pages = [Page(1, " ".join(f"w{i}" for i in range(500)) + ".")]
        chunks = SemanticChunker(None, target_tokens=50, max_tokens=80, min_tokens=10).chunk("d", pages)
        self.assertGreaterEqual(len(chunks), 6)
        self.assertTrue(all(len(c.text.split()) <= 80 for c in chunks))

    def test_empty_document(self):
        self.assertEqual(SemanticChunker(None).chunk("d", [Page(1, "  \n ")]), [])

    def test_invalid_params(self):
        with self.assertRaises(ValueError):
            SemanticChunker(None, min_tokens=100, target_tokens=50, max_tokens=200)


if __name__ == "__main__":
    unittest.main()
