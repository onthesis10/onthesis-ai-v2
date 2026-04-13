import os
from dotenv import load_dotenv
load_dotenv()
print(f"MODEL: {os.environ.get('INTENT_AGENT_MODEL')}")
print(f"KEY: {os.environ.get('LLM_API_KEY')[:10]}...")
