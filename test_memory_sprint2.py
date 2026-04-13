import os
import json
import requests
import time
from app.agent.memory_system import QdrantVectorDB, DocumentMemory, count_tokens, SharedMemory
from app.routes.agent import _build_pruned_context

# Config
BASE_URL = "http://127.0.0.1:5000"
PROJECT_ID = "test_project_123"
CHAPTER_ID = "chapter_1_introduction"
CHAPTER_CONTENT = """
Perkembangan kecerdasan buatan (AI) telah mengubah banyak aspek dalam penulisan akademik. 
OnThesis bertujuan untuk memberikan bantuan yang lebih cerdas kepada mahasiswa dalam menyamarakan 
proses penelitian mereka. Bab ini menjelaskan latar belakang dan urgensi penelitian ini.
AI Agent dalam OnThesis menggunakan Large Language Models untuk membantu proses editing secara real-time.
"""

def test_1_summarization():
    print("\n--- TEST 1: Chapter Summarization ---")
    data = {
        "projectId": PROJECT_ID,
        "chapterId": CHAPTER_ID,
        "content": CHAPTER_CONTENT
    }
    try:
        resp = requests.post(f"{BASE_URL}/api/summarize-chapter", json=data)
        print(f"Status: {resp.status_code}")
        print(f"Result: {resp.json()}")
        
        # Verify in Qdrant directly
        vdb = QdrantVectorDB()
        doc_mem = DocumentMemory(vdb)
        summaries = doc_mem.get_all_chapter_summaries(PROJECT_ID)
        
        found = any(s['chapter_id'] == CHAPTER_ID for s in summaries)
        if found:
            print("✅ PASS: Summary saved in Qdrant")
            return True
        else:
            print("❌ FAIL: Summary NOT found in Qdrant")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_2_context_retrieval():
    print("\n--- TEST 2: Semantic Context Retrieval ---")
    vdb = QdrantVectorDB()
    doc_mem = DocumentMemory(vdb)
    
    # Add a fragment to a different chapter
    OTHER_CHAPTER = "chapter_2_theory"
    OTHER_CONTENT = "Teori Transformasi Digital menjelaskan bagaimana organisasi mengadopsi teknologi baru untuk menciptakan nilai."
    doc_mem.add_or_update_chunk(PROJECT_ID, OTHER_CHAPTER, OTHER_CONTENT)
    print("Added fragment to Chapter 2...")
    time.sleep(1) # Wait for Qdrant index
    
    # Search context
    query = "Bagaimana teknologi digital membantu organisasi?"
    context = doc_mem.get_relevant_context(query, PROJECT_ID, top_k=2)
    print(f"Query: {query}")
    print(f"Retrieved: {context}")
    
    if OTHER_CONTENT in context:
        print("✅ PASS: Semantic fragment retrieved from other chapter")
        return True
    else:
        print("❌ FAIL: Relevent fragment NOT retrieved")
        return False

def test_3_token_budget():
    print("\n--- TEST 3: Token Budget Pruning ---")
    # Simulate high volume context
    huge_paragraphs = []
    for i in range(100):
        huge_paragraphs.append({
            "paraId": f"P-{i}",
            "content": "Ini adalah teks yang sangat panjang untuk mengetes limit token budget agar pruning berjalan. " * 20
        })
    
    context_data = {
        "context_title": "Test Large Thesis",
        "active_paragraphs": huge_paragraphs
    }
    
    pruned_context = _build_pruned_context("Summarize my large thesis", context_data, PROJECT_ID)
    tokens = count_tokens(pruned_context)
    print(f"Final Context Tokens: {tokens}")
    
    if tokens <= 8000:
        print("✅ PASS: Context stayed under 8000 tokens")
        if "(TRUNCATED)" in pruned_context:
            print("✅ PASS: Truncation indicator present")
        return True
    else:
        print(f"❌ FAIL: Context exceeded budget: {tokens} tokens")
        return False

if __name__ == "__main__":
    print("🚀 Running Sprint 2 Verification Tests")
    
    # Ensure server is running or start it? 
    # For now assume it's running as per metadata
    
    t1 = test_1_summarization()
    t2 = test_2_context_retrieval()
    t3 = test_3_token_budget()
    
    print("\n" + "="*40)
    print(f"RESULTS: T1:{'✅' if t1 else '❌'} T2:{'✅' if t2 else '❌'} T3:{'✅' if t3 else '❌'}")
    print("="*40)
