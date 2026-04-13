import os, sys, logging, json
sys.path.insert(0, os.path.abspath('.'))
from dotenv import load_dotenv
load_dotenv()

from app.agent.diagnostic_agent import DiagnosticAgent

logging.basicConfig(level=logging.INFO)
agent = DiagnosticAgent()

# Force litellm to return a bad string so it triggers exception!
agent._call_llm = lambda prompt, sys_prompt=None: "this is garbage output without brackets "

txt = "Tolong verifikasi kutipan pada teks ini: Banyak peneliti sepakat bahwa model transformer mengubah NLP secara fundamental (Vaswani, 2017)."

print('--- RUNNING verify_citations ---')
res = agent.verify_citations(txt)
print('RESULT:', res)
