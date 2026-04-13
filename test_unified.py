import sys
import os

os.environ['CORE_API_KEY'] = "BwNURiovtyPGDrWa7Lmk624O31zsbIKT"
os.environ['PUBMED_API_KEY'] = "fffc8f233c16e94f8227c2f4c7e5be634d08"

# Add path so we can import from app
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.utils.search_utils import search_crossref, search_openalex, search_doaj, search_pubmed, search_eric

query = "machine learning in education"
limit = 10

print("🔍 CROSSREF:")
try:
    c = search_crossref(query, limit=limit)
    print(f"Found: {len(c)}")
except Exception as e:
    print(f"Error: {e}")

print("\n🔍 OPENALEX:")
try:
    o = search_openalex(query, limit=limit)
    print(f"Found: {len(o)}")
except Exception as e:
    print(f"Error: {e}")

print("\n🔍 DOAJ:")
try:
    d = search_doaj(query, limit=limit)
    print(f"Found: {len(d)}")
except Exception as e:
    print(f"Error: {e}")

print("\n🔍 PUBMED:")
try:
    p = search_pubmed(query, limit=limit)
    print(f"Found: {len(p)}")
except Exception as e:
    print(f"Error: {e}")

print("\n🔍 ERIC:")
try:
    e_res = search_eric(query, limit=limit)
    print(f"Found: {len(e_res)}")
except Exception as e:
    print(f"Error: {e}")
