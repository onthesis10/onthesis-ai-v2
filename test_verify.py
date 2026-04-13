import os, sys, logging
import json
sys.path.insert(0, os.path.abspath('.'))
from app.agent.diagnostic_agent import DiagnosticAgent

logging.basicConfig(level=logging.INFO)
agent = DiagnosticAgent()
prompt = """Tugas Anda adalah mengekstrak semua sitasi atau kutipan akademik dari teks di bawah ini.
Hanya ekstrak kutipan yang benar-benar ada dalam teks tersebut. DILARANG MENGARANG atau membuat-buat kutipan fiktif.

TEKS:
Tolong verifikasi kutipan pada teks ini: Banyak peneliti sepakat bahwa model transformer mengubah NLP secara fundamental (Vaswani, 2017).

OUTPUT (JSON ONLY):
{
  "citations": [
    {
      "author": "Nama Penulis Utama (kunci)",
      "year": "Tahun",
      "context": "kalimat tempat sitasi ini berada"
    }
  ]
}"""

print('--- RAW LLM RESULT ---')
try:
    res = agent._call_llm(prompt)
    print(res)
    print('--- RAW repr ---')
    print(repr(res))
except Exception as e:
    print('ERROR:', e)
