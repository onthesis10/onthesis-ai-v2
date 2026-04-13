import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api/agent/chat"

tests = [
    {
        "nama": "Test 1 - Rewrite",
        "payload": {
            "user_id": "test123",
            "message": "perbaiki paragraf ini: teknologi berkembang dengan cepat dan mempengaruhi kehidupan manusia"
        }
    },
    {
        "nama": "Test 2 - Cari Paper",
        "payload": {
            "user_id": "test123",
            "message": "carikan paper tentang machine learning in education"
        }
    },
    {
        "nama": "Test 3 - Literature Review",
        "payload": {
            "user_id": "test123",
            "message": "buatkan literature review tentang machine learning in education"
        }
    }
]

results = []
for test in tests:
    try:
        response = requests.post(BASE_URL, json=test["payload"])
        results.append({
            "test_name": test["nama"],
            "status_code": response.status_code,
            "response": response.json() if response.status_code == 200 else response.text
        })
    except Exception as e:
        results.append({
            "test_name": test["nama"],
            "error": str(e)
        })
    time.sleep(2)

with open("bug2_results_v2.json", "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
