import os

files = [
    "intent_classifier.py",
    "research_agent.py",
    "supervisor.py",
    "writing_agent.py",
    "analysis_agent.py"
]

import re

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Revert the fallback model to Gemini
    content = content.replace('fallback_api_key = self.api_key', 'fallback_api_key = os.environ.get("GEMINI_API_KEY")')
    content = content.replace('fallback_model = "groq/llama-3.1-8b-instant"', 'fallback_model = "gemini/gemini-1.5-flash"')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fallback reverted to Gemini in all agents.")
