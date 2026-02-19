
import requests
import json
import numpy as np
import pandas as pd

BASE_URL = "http://localhost:5000/api/generate-data"

def test_generation():
    print("Testing Data Generation API...")
    
    payload = {
        "sample_size": 200,
        "variables": [
             { "id": "v1", "name": "Motivasi", "type": "likert", "params": {"scale": 5} },
             { "id": "v2", "name": "Prestasi", "type": "numeric", "params": {"mean": 75, "std": 10} },
             { "id": "v3", "name": "Gender", "type": "nominal", "params": {"options": ["L", "P"]} }
        ],
        "relationships": [
             { "var1_id": "v1", "var2_id": "v2", "correlation": 0.8 }
        ]
    }
    
    try:
        response = requests.post(BASE_URL, json=payload)
        
        if response.status_code != 200:
            print(f"FAILED: Status Code {response.status_code}")
            print(response.text)
            return

        data = response.json()
        if data['status'] != 'success':
             print(f"FAILED: API Status {data['status']}")
             return
             
        records = data['data']
        df = pd.DataFrame(records)
        
        print(f"SUCCESS: Generated {len(df)} rows.")
        print("Columns:", df.columns.tolist())
        
        # Check Correlation
        corr = df['Motivasi'].corr(df['Prestasi'])
        print(f"Measured Correlation (Motivasi vs Prestasi): {corr:.4f}")
        
        if corr > 0.5:
             print("PASS: Significant positive correlation detected.")
        else:
             print("WARNING: Correlation lower than expected (Target 0.8).")
             
        # Check Nominal
        print("Gender Counts:")
        print(df['Gender'].value_counts())
        
        # Check Meta Report
        print("\nMeta Report:")
        print(json.dumps(data['meta']['report'], indent=2))
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_generation()
