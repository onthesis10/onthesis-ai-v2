from dotenv import load_dotenv
import os
import time
from app.agent.memory_system import QdrantVectorDB, embed, ResearchMemory

load_dotenv()

print("QDRANT_URL:", os.environ.get("QDRANT_URL"))
print("QDRANT_API_KEY:", "***" if os.environ.get("QDRANT_API_KEY") else "None")

try:
    print("Initialize QdrantVectorDB...")
    db = QdrantVectorDB()
    memory = ResearchMemory(db)
    
    print("\nInserting dummy paper into Qdrant...")
    dummy_paper = [{
        "paper_id": "test_qdrant_12345",
        "title": "Machine Learning in Academic Research: A New Approach",
        "authors": ["John Doe", "Jane Smith"],
        "year": 2026,
        "abstract": "This study explores the usage of semantic embeddings and large language models for accelerating literature review synthesis in academic environments. The results show significant increases in both efficiency and academic coherency.",
        "doi": "10.1234/test_qdrant_12345",
        "citation_count": 50,
        "topics": ["machine learning", "education"],
        "key_findings": "Found it works.",
        "relevance_score": 0.9,
        "source": "manual"
    }]
    memory.add_papers(dummy_paper)
    
    print("Waiting 2 seconds for indexing...")
    time.sleep(2)
    
    count = db.client.count("research_papers")
    print(f"Total documents in 'research_papers' collection: {count.count}")
    
    query = "artificial intelligence in education"
    emb = embed(query)
    print(f"Generated query embedding with size: {len(emb)}")
    
    print(f"\nSearching for semantic match with query '{query}'...")
    results = memory.get_papers(topic=query, min_relevance=0.0)
    
    if results:
        print(f"Success! Found {len(results)} paper(s):")
        for p in results:
            print(f"- Title: {p.get('title')}")
            print(f"- Abstract: {p.get('abstract')}")
    else:
        print("Done. No matching papers found over the relevance threshold.")
        
except Exception as e:
    import traceback
    traceback.print_exc()
