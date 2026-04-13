import os

files = [
    "intent_classifier.py",
    "research_agent.py",
    "supervisor.py",
    "writing_agent.py",
    "analysis_agent.py"
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('gemini_api_key = os.environ.get("GEMINI_API_KEY")', 'fallback_api_key = self.api_key')
    content = content.replace('fallback_model = "gemini/gemini-1.5-flash"', 'fallback_model = "groq/llama-3.1-8b-instant"')
    content = content.replace('if not gemini_api_key:', 'if not fallback_api_key:')
    content = content.replace('"GEMINI_API_KEY tidak di-set. Fallback gagal."', '"API_KEY tidak di-set. Fallback gagal."')
    content = content.replace('api_key=gemini_api_key,', 'api_key=fallback_api_key,')
    content = content.replace('api_key=gemini_api_key\n', 'api_key=fallback_api_key\n')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement complete.")
