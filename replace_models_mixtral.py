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
    
    content = content.replace('fallback_model = "groq/allam-2-7b"', 'fallback_model = "groq/mixtral-8x7b-32768"')
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement complete.")
