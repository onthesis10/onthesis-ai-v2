import requests

BASE_URL = "http://127.0.0.1:5000/api/agent/run"

tests = [
    {
        "nama": "Test 1 - Rewrite",
        "payload": {
            "task": "perbaiki paragraf ini: teknologi berkembang dengan cepat dan mempengaruhi kehidupan manusia",
            "projectId": "test123",
            "context": {}
        }
    },
    {
        "nama": "Test 2 - Cari Paper", 
        "payload": {
            "task": "carikan paper tentang machine learning in education",
            "projectId": "test123",
            "context": {}
        }
    },
    {
        "nama": "Test 3 - Literature Review",
        "payload": {
            "task": "buatkan literature review tentang machine learning in education",
            "projectId": "test123",
            "context": {}
        }
    }
]

for test in tests:
    print(f"\n{'='*50}")
    print(f">>> {test['nama']}")
    print(f"{'='*50}")
    
    with requests.post(
        BASE_URL, 
        json=test["payload"],
        stream=True,
        headers={"Accept": "text/event-stream"}
    ) as r:
        for line in r.iter_lines():
            if line:
                print(line.decode('utf-8'))
