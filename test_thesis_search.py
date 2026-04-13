import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.thesis_tools import _search_references

def test():
    args = {"query": "pengaruh AI terhadap motivasi belajar siswa", "limit": 5}
    references_text = ""
    references_raw = [
        {"title": "The Impact of Artificial Intelligence on Student Learning Motivation", "abstract": "This study explores how AI affects motivation among students."},
        {"title": "Machine Learning in Classroom", "abstract": "A review of predictive models."},
        {"title": "Effect of AI on Academic Performance and Motivation", "abstract": "AI tools increase motivation..."},
        {"title": "Motivation and AI: A Systematic Review", "abstract": "Reviewing literature on AI impacts on student motivation."}
    ]
    
    print("Testing _search_references with Indonesian query...")
    result = _search_references(args, references_text, references_raw)
    
    print("\nResult:")
    import json
    print(json.dumps(result, indent=2))
    
    if "references" in result and len(result["references"]) >= 3:
        print("\n✅ SUCCESS: Returned at least 3 relevant papers.")
    else:
        print(f"\n❌ FAILED: Expected 3+ papers, got {len(result.get('references', []))}")

if __name__ == "__main__":
    test()
