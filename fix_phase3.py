import sys

def fix_embed():
    filepath = r'app\agent\memory_system.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_embed = """def embed(text: str) -> List[float]:
    \"\"\"Generate embeddings using Gemini text-embedding-004 (3072 dimensions)\"\"\"
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY is missing. Returning zero vector.")
        return [0.0] * 768
    
    try:
        genai.configure(api_key=api_key)
        response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text
        )
        return response['embedding']
    except Exception as e:
        print(f"Embedding error: {e}")
        raise e"""

    new_embed = """def embed(text: str) -> List[float]:
    \"\"\"Generate embeddings using Gemini text-embedding-004 (3072 dimensions) with caching\"\"\"
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY is missing. Returning zero vector.")
        return [0.0] * 3072
        
    import hashlib
    text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()
    cache_key = f"embed_cache:{text_hash}"
    
    if redis_client:
        with suppress(Exception):
            cached = redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
    
    try:
        genai.configure(api_key=api_key)
        response = genai.embed_content(
            model="models/gemini-embedding-001",
            content=text
        )
        vec = response['embedding']
        
        if redis_client:
            with suppress(Exception):
                redis_client.setex(cache_key, 86400, json.dumps(vec))
                
        return vec
    except Exception as e:
        print(f"Embedding error: {e}")
        raise e"""
        
    if old_embed in content:
        content = content.replace(old_embed, new_embed)
    elif old_embed.replace('\n', '\r\n') in content:
        content = content.replace(old_embed.replace('\n', '\r\n'), new_embed.replace('\n', '\r\n'))
    else:
        print("old_embed not found")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed memory_system.py")

def fix_classifier():
    filepath = r'app\agent\intent_classifier.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
        
    old_classifier = """        if history and len(history) > 0:
            history_text = "\\n".join([f"{h.get('role', 'user')}: {h.get('content', '')}" for h in history[-4:]])
            history_context = f"\\nRecent conversation history:\\n{history_context}\""""
            
    new_classifier = """        if history and len(history) > 0:
            history_text = "\\n".join([f"{h.get('role', 'user')}: {h.get('content', '')}" for h in history[-4:]])
            history_context = f"\\nRecent conversation history:\\n{history_text}\""""

    if old_classifier in content:
        content = content.replace(old_classifier, new_classifier)
    elif old_classifier.replace('\n', '\r\n') in content:
        content = content.replace(old_classifier.replace('\n', '\r\n'), new_classifier.replace('\n', '\r\n'))
    else:
        print("old_classifier not found")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed intent_classifier.py")
    
if __name__ == '__main__':
    fix_embed()
    fix_classifier()
