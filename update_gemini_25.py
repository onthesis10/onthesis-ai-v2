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
    
    # 1. Update the gemini model string
    content = content.replace('fallback_model = "gemini/gemini-1.5-flash"', 'fallback_model = "gemini/gemini-2.5-flash"')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fallback updated to Gemini 2.5 Flash in all agents.")
