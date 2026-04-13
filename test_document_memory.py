import os
import json
import uuid
import time
from datetime import datetime
from dotenv import load_dotenv
from app.agent.memory_system import DocumentMemory, QdrantVectorDB

load_dotenv()

def test_document_memory():
    print("\n" + "="*50)
    print("TESTING DOCUMENT MEMORY (QDRANT)")
    print("="*50)
    
    # Initialize Vector DB and Document Memory
    # QdrantVectorDB will use Cloud from .env or :memory: fallback
    vdb = QdrantVectorDB()
    doc_mem = DocumentMemory(vdb)
    
    doc_id = "test_thesis_001"
    
    # 1. Insert dummy thesis chunks
    chunks = [
        {
            "section": "abstract",
            "content": "Penelitian ini membahas penggunaan machine learning dalam meningkatkan kualitas pendidikan di Indonesia melalui sistem adaptif."
        },
        {
            "section": "bab_1",
            "content": "Pendahuluan: Perkembangan teknologi AI, khususnya machine learning, memberikan peluang besar bagi sektor pendidikan untuk personalisasi materi."
        },
        {
            "section": "bab_2",
            "content": "Tinjauan Pustaka: Berbagai algoritma seperti Random Forest dan SVM telah digunakan dalam alat penilaian otomatis."
        }
    ]
    
    print(f"\n[STEP 1] Memasukkan {len(chunks)} dummmy thesis chunks...")
    for c in chunks:
        doc_mem.add_or_update_chunk(doc_id, c["section"], c["content"])
        print(f"OK: Chunk '{c['section']}' berhasil disimpan.")
    
    # 2. Search dengan query
    query = "machine learning pendidikan"
    print(f"\n[STEP 2] Mencari context relevan untuk query: '{query}'")
    context = doc_mem.get_relevant_context(query, doc_id, top_k=2)
    
    if context:
        print("\n--- RELEVANT CONTEXT FOUND ---")
        print(context)
    else:
        print("\n❌ Tidak ada context yang ditemukan.")
        
    # 3. Ambil section spesifik
    section_name = "bab_1"
    print(f"\n[STEP 3] Mengambil draf spesifik section: '{section_name}'")
    section_content = doc_mem.get_section(doc_id, section_name)
    
    if section_content:
        print(f"\n--- CONTENT OF {section_name.upper()} ---")
        print(section_content)
    else:
        print(f"\n❌ Section {section_name} tidak ditemukan.")

    print("\n" + "="*50)
    print("TEST COMPLETED")
    print("="*50)

if __name__ == "__main__":
    test_document_memory()
