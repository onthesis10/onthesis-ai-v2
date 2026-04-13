import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.utils.search_utils import unified_search  # type: ignore
import json

def test():
    query = "pengaruh AI terhadap motivasi belajar siswa"
    print(f"Testing query: {query}")
    results = unified_search(query=query, limit=5)
    
    print(f"Found {len(results)} results.")
    for i, res in enumerate(results[:3]):
        print(f"{i+1}. {res['title']} ({res['year']}) - {res['author']}")
        
if __name__ == "__main__":
    test()
