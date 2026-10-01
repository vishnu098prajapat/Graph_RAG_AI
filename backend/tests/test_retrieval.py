import unittest

import numpy as np

from app.embeddings.hashing import HashingEmbedder
from app.ingestion.highlight import citations_for_spans, rects_for_span
from app.ingestion.service import IngestionService
from app.retrieval.bm25 import BM25Index
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.hybrid import HybridRetriever
from app.retrieval.reranker import LexicalReranker
from app.store.memory import MemoryStore
from tests.synthetic import make_pages


class BM25Tests(unittest.TestCase):
    def test_rare_term_beats_common_term(self):
        idx = BM25Index().build(["a", "b", "c"], ["the pump failed", "the pump restarted", "the turbine cracked"])
        top = idx.search("turbine pump", k=3)
        self.assertEqual(top[0][0], "c")  # 'turbine' is rarer than 'pump'

    def test_stemming_and_no_match(self):
        idx = BM25Index().build(["a"], ["generating units operating"])
        self.assertEqual(idx.search("unit operate")[0][0], "a")
        self.assertEqual(idx.search("zzz"), [])
        self.assertEqual(BM25Index().search("anything"), [])


class FusionTests(unittest.TestCase):
    def test_consensus_wins(self):
        fused = reciprocal_rank_fusion([["a", "b", "c"], ["b", "a", "d"]])
        ranked = sorted(fused, key=fused.get, reverse=True)
        self.assertEqual(set(ranked[:2]), {"a", "b"})
        self.assertLess(fused["d"], fused["a"])

    def test_formula(self):
        self.assertAlmostEqual(reciprocal_rank_fusion([["x"]], k=60)["x"], 1 / 61)
        self.assertAlmostEqual(reciprocal_rank_fusion([["x"], ["y", "x"]], k=10, weights=[2, 1])["x"], 2 / 11 + 1 / 12)

    def test_weight_mismatch(self):
        with self.assertRaises(ValueError):
            reciprocal_rank_fusion([["a"]], weights=[1, 2])


class HashingEmbedderTests(unittest.TestCase):
    def test_unit_norm_deterministic_and_similarity(self):
        e = HashingEmbedder()
        v1, v2, v3 = e.embed_documents(["wind turbine capacity", "capacity of the wind turbine", "medieval poetry"])
        self.assertAlmostEqual(float(np.linalg.norm(v1)), 1.0, places=5)
        self.assertGreater(float(v1 @ v2), float(v1 @ v3))
        np.testing.assert_array_equal(e.embed_query("abc def"), e.embed_query("abc def"))


class HighlightTests(unittest.TestCase):
    def test_rects_cover_selected_words_only(self):
        pages, _ = make_pages(1)
        page = pages[0]
        needle = page.words[5:9]
        rects = rects_for_span(page, needle[0].start, needle[-1].end)
        self.assertGreaterEqual(len(rects), 1)
        x0 = min(r[0] for r in rects); x1 = max(r[2] for r in rects)
        self.assertLessEqual(x0, needle[0].x0 + 0.01)
        self.assertGreaterEqual(x1, min(w.x1 for w in needle) - 0.01)
        self.assertEqual(rects_for_span(page, 0, 0), [])


class EndToEndTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages, cls.qa = make_pages(20)
        cls.embedder = HashingEmbedder()
        cls.store = MemoryStore()
        cls.ingest = IngestionService(cls.store, cls.embedder).ingest_pages("synthetic.pdf", cls.pages, doc_id="doc1")
        cls.retriever = HybridRetriever(cls.store, cls.embedder, LexicalReranker())

    def test_ingest_result(self):
        self.assertEqual(self.ingest.document.n_pages, 20)
        self.assertGreater(self.ingest.document.n_chunks, 20)

    def test_gold_page_is_retrieved_and_needle_is_highlightable(self):
        by_page = {p.number: p for p in self.pages}
        hits = 0
        for question, gold_page, needle in self.qa:
            res = self.retriever.search(question, doc_id="doc1", top_k=3)
            top = res.results[0]
            if gold_page in top.chunk.pages and needle in top.chunk.text:
                hits += 1
                # citation rects must exist for that page
                cites = citations_for_spans(by_page, top.chunk.spans)
                self.assertTrue(any(c["page"] == gold_page and c["rects"] for c in cites))
        self.assertGreaterEqual(hits / len(self.qa), 0.9, f"top-1 needle accuracy {hits}/{len(self.qa)}")

    def test_doc_scoping_and_empty_store(self):
        self.assertEqual(self.retriever.search("anything", doc_id="nope").results, [])
        empty = HybridRetriever(MemoryStore(), self.embedder)
        self.assertEqual(empty.search("anything").results, [])

    def test_modes_and_timings(self):
        for mode in ("hybrid", "dense", "sparse"):
            res = self.retriever.search("commissioned near Port", doc_id="doc1", mode=mode)
            self.assertTrue(res.results)
            self.assertIn("total", res.timings_ms)

    def test_query_cache(self):
        self.retriever.search("cache me", doc_id="doc1")
        self.assertIn("cache me", self.retriever._qcache)


if __name__ == "__main__":
    unittest.main()
