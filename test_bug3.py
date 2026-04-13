# Test Bug 3: Citation normalization
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.append('.')
os.environ.setdefault('CORE_API_KEY', 'test')
os.environ.setdefault('PUBMED_API_KEY', 'test')

import logging
logging.basicConfig(level=logging.INFO)

from app.agent.research_agent import ResearchAgent
agent = ResearchAgent()

dummy = [
    {"title": "Paper A", "relevance_score": 0.9, "citation_count": 0, "year": 2025},
    {"title": "Paper B", "relevance_score": 0.7, "citation_count": 0, "year": 2023},
    {"title": "Paper C", "relevance_score": 0.8, "citation_count": 0, "year": 2020},
]

print("=== BUG 3 TEST: Citation normalization ===")
ranked = agent.rank_papers(dummy)
ok_count = 0
for p in ranked:
    fs = p["final_score"]
    rel = p["relevance_score"]
    rec = p["rec_score"]
    expected = (rel * 0.60) + (rec * 0.40)
    ok = abs(fs - expected) < 0.001
    if ok:
        ok_count += 1
    print("  %s %s score=%.3f expected=%.3f rel=%.2f rec=%.2f cit=%.2f" % (
        "PASS" if ok else "FAIL", p["title"], fs, expected, rel, rec, p.get("norm_cit", 0)))

print("Result: %d/%d PASSED" % (ok_count, len(ranked)))
