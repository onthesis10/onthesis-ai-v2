"""
Test script untuk verifikasi 3 bug fixes (Bug 1, 2, 3).
Bisa dijalankan tanpa server (offline testing).
"""
import sys
import os
import re
import json
import io

# Force UTF-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Setup environment
os.environ.setdefault('CORE_API_KEY', 'BwNURiovtyPGDrWa7Lmk624O31zsbIKT')
os.environ.setdefault('PUBMED_API_KEY', 'fffc8f233c16e94f8227c2f4c7e5be634d08')
sys.path.append(os.path.abspath(os.path.dirname(__file__)))


# ============================================================
# BUG 3 TEST: Citation normalization (offline, no API needed)
# ============================================================
def test_bug3_citation_normalization():
    print("\n" + "="*60)
    print("[BUG 3 TEST] Citation normalization when all citations = 0")
    print("="*60)
    
    from app.agent.research_agent import ResearchAgent
    agent = ResearchAgent()
    
    # Create dummy papers with citation_count = 0
    dummy_papers = [
        {"title": "Paper A - ML in Education", "relevance_score": 0.9, "citation_count": 0, "year": 2025},
        {"title": "Paper B - Deep Learning for Students", "relevance_score": 0.7, "citation_count": 0, "year": 2023},
        {"title": "Paper C - AI Tutoring Systems", "relevance_score": 0.8, "citation_count": 0, "year": 2020},
    ]
    
    ranked = agent.rank_papers(dummy_papers)
    
    print(f"\n[OK] Ranked {len(ranked)} papers:")
    all_correct = True
    for i, p in enumerate(ranked, 1):
        fs = p.get('final_score', 0)
        rel = p.get('relevance_score', 0)
        rec = p.get('rec_score', 0)
        expected = (rel * 0.60) + (rec * 0.40)
        
        match = abs(fs - expected) < 0.001
        status = "[PASS]" if match else "[FAIL]"
        if not match:
            all_correct = False
        
        print(f"   {i}. {status} {p['title']}")
        print(f"      final_score={fs:.3f}  expected(rel*0.6+rec*0.4)={expected:.3f}  rel={rel:.2f}  rec={rec:.2f}  norm_cit={p.get('norm_cit', 0):.2f}")
    
    if all_correct:
        print("\n>>> BUG 3 FIX VERIFIED: Fallback formula (rel*0.6 + rec*0.4) is correct!")
    else:
        print("\n>>> BUG 3 NOT FIXED: Formula mismatch detected")
    return all_correct


# ============================================================
# BUG 2 TEST: Search relevance filtering
# ============================================================
def test_bug2_search_relevance():
    print("\n" + "="*60)
    print("[BUG 2 TEST] Paper search relevance for 'machine learning in education'")
    print("="*60)
    
    from app.agent.research_agent import ResearchAgent
    agent = ResearchAgent()
    
    query = "machine learning in education"
    try:
        papers = agent.search_papers(query, limit=10)
        
        stop_words = {'the', 'and', 'for', 'with', 'from', 'that', 'this', 'in'}
        query_keywords = [k.lower() for k in re.split(r'\s+', query) if len(k) > 2 and k.lower() not in stop_words]
        print(f"\n[OK] Found {len(papers)} papers after filtering")
        print(f"   Keywords used for matching: {query_keywords}")
        
        irrelevant_keywords = ['crop', 'disease', 'lane', 'lane-changing', 'paper mills', 'agriculture', 'traffic']
        all_relevant = True
        for i, p in enumerate(papers, 1):
            title = p['title']
            relevance = p.get('relevance_score', 0)
            title_lower = title.lower()
            
            has_irrelevant = any(kw in title_lower for kw in irrelevant_keywords)
            status = "[FAIL] IRRELEVANT" if has_irrelevant else "[PASS]"
            if has_irrelevant:
                all_relevant = False
            
            print(f"   {i}. {status} (rel={relevance:.2f}) {title[:80]}")
        
        if all_relevant and len(papers) > 0:
            print(f"\n>>> BUG 2 FIX VERIFIED: All {len(papers)} papers are relevant! No crop/disease/lane papers.")
        elif len(papers) == 0:
            print("\n>>> WARNING: No papers returned (API may be down or all filtered)")
        else:
            print("\n>>> BUG 2 NOT FULLY FIXED: Some irrelevant papers still present")
        return all_relevant
            
    except Exception as e:
        print(f"[ERROR] {e}")
        import traceback
        traceback.print_exc()
        return False


# ============================================================
# BUG 1 TEST: Intent classifier
# ============================================================
def test_bug1_intent_classifier():
    print("\n" + "="*60)
    print("[BUG 1 TEST] Intent classifier for literature review")
    print("="*60)
    
    api_key = os.environ.get('LLM_API_KEY')
    if not api_key:
        env_path = os.path.join(os.path.dirname(__file__), '.env')
        if os.path.exists(env_path):
            with open(env_path, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('LLM_API_KEY='):
                        key = line.split('=', 1)[1].strip().strip('"').strip("'")
                        os.environ['LLM_API_KEY'] = key
                        api_key = key
                    if line.startswith('GROQ_API_KEY=') and not api_key:
                        key = line.split('=', 1)[1].strip().strip('"').strip("'")
                        os.environ['LLM_API_KEY'] = key
                        api_key = key
                    if line.startswith('GEMINI_API_KEY='):
                        key = line.split('=', 1)[1].strip().strip('"').strip("'")
                        os.environ['GEMINI_API_KEY'] = key
    
    if not api_key:
        print("[SKIP] LLM_API_KEY not set. Cannot test intent classifier.")
        return None
    
    from app.agent.intent_classifier import IntentClassifier
    classifier = IntentClassifier()
    
    test_messages = [
        "buatkan literature review dari paper yang tadi ditemukan",
        "tolong buatkan tinjauan pustaka dari paper-paper yang tadi",
        "susun literature review berdasarkan hasil pencarian paper sebelumnya",
    ]
    
    all_passed = True
    for msg in test_messages:
        print(f"\n   Input: \"{msg}\"")
        try:
            result = classifier.classify(msg, [])
            intent = result.get('intent', 'unknown')
            confidence = result.get('confidence', 0)
            status = "[PASS]" if intent == "literature_review" else "[FAIL]"
            if intent != "literature_review":
                all_passed = False
            print(f"   {status} Intent: {intent} (confidence: {confidence})")
        except Exception as e:
            all_passed = False
            print(f"   [FAIL] Error: {e}")
    
    if all_passed:
        print("\n>>> BUG 1 FIX VERIFIED: All literature review intents correctly classified!")
    else:
        print("\n>>> BUG 1 NOT FULLY FIXED: Some intents not classified correctly")
    return all_passed


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    print("Running Bug Fix Verification Tests")
    print("="*60)
    
    results = {}
    
    # Bug 3 first (fastest, no API calls)
    results['bug3'] = test_bug3_citation_normalization()
    
    # Bug 2 (requires API calls to search)
    results['bug2'] = test_bug2_search_relevance()
    
    # Bug 1 (requires LLM API)
    results['bug1'] = test_bug1_intent_classifier()
    
    print("\n" + "="*60)
    print("SUMMARY:")
    for bug, result in results.items():
        if result is None:
            print(f"  {bug}: SKIPPED")
        elif result:
            print(f"  {bug}: PASSED")
        else:
            print(f"  {bug}: FAILED")
    print("="*60)
