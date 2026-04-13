# Test Bug 2: Search relevance filtering - detailed output
import sys, os, re, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.path.append('.')
os.environ.setdefault('CORE_API_KEY', 'BwNURiovtyPGDrWa7Lmk624O31zsbIKT')
os.environ.setdefault('PUBMED_API_KEY', 'fffc8f233c16e94f8227c2f4c7e5be634d08')

from app.agent.research_agent import ResearchAgent
import logging
logging.basicConfig(level=logging.WARNING)

agent = ResearchAgent()
query = "machine learning in education"

papers = agent.search_papers(query, limit=10)
print(f"Found {len(papers)} papers")

irrelevant_kw = ['crop', 'disease', 'lane-changing', 'lane changing', 'paper mills', 'paper mill', 'agriculture', 'traffic', 'buttonhole', 'clothing', 'manufacturing', 'sewing']
fail_count = 0
for i, p in enumerate(papers, 1):
    title = p['title']
    rel = p.get('relevance_score', 0)
    title_lower = title.lower()
    has_bad = any(kw in title_lower for kw in irrelevant_kw)
    if has_bad:
        fail_count += 1
        print("FAIL: %s (rel=%.2f)" % (title[:100], rel))

if fail_count == 0:
    print("ALL PASSED - no irrelevant papers found in the %d results" % len(papers))
    for i, p in enumerate(papers[:5], 1): # Just print first 5 to verify
        print("  %d. %s (rel=%.2f)" % (i, p['title'][:100], p.get('relevance_score', 0)))
else:
    print("FAILED: %d irrelevant papers remain" % fail_count)
