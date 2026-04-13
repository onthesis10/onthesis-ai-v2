import sys
import os
import urllib3  # type: ignore
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.utils.search_utils import unified_search  # type: ignore

def test_api():
    query = "pengaruh AI terhadap motivasi belajar siswa"
    print(f"Testing unified_search with query: {query}")
    try:
        results = unified_search(query=query, sources=['openalex', 'crossref', 'doaj'], limit=2)
        print(f"\n✅ SUCCESS: Returned {len(results)} relevant papers.")
        for r in results[:3]:
            print("-", r.get("title"))
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api()
