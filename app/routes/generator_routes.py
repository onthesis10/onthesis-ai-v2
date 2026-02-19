from flask import request, jsonify
import pandas as pd
from . import generator_bp
from app.services.statistics_generator import StatisticsGenerator

@generator_bp.route('/api/generate-data', methods=['POST'])
def generate_data():
    """
    Endpoint to generate synthetic research data based on user configuration.
    Expects JSON payload:
    {
        "sample_size": 60,
        "variables": [
             { "id": "v1", "name": "Motivasi", "type": "likert", "params": {"scale": 5} },
             { "id": "v2", "name": "IPK", "type": "numeric", "params": {"mean": 3.5, "std": 0.5, "min": 0, "max": 4} }
        ],
        "relationships": [
             { "var1_id": "v1", "var2_id": "v2", "correlation": 0.7 }
        ]
    }
    """
    try:
        data = request.json
        sample_size = int(data.get('sample_size', 30))
        variables = data.get('variables', [])
        relationships = data.get('relationships', [])
        
        # Sanity checks
        if sample_size > 5000:
            return jsonify({"status": "error", "message": "Sample size limit exceeded (max 5000)."}), 400
            
        # Use the service
        generated_data, meta_report = StatisticsGenerator.generate_dataset(
            sample_size=sample_size,
            variables=variables,
            relationships=relationships
        )
        
        # Create DataFrame to get columns info
        df = pd.DataFrame(generated_data)
        
        # Ensure ID column exists
        if "id" not in df.columns:
            # Insert at beginning
            df.insert(0, "id", range(1, len(df) + 1))
            generated_data = df.to_dict(orient='records')

        return jsonify({
            "status": "success",
            "message": "Data generated successfully",
            "data": generated_data,
            "meta": {
                "rows": sample_size,
                "columns": list(df.columns),
                "report": meta_report
            }
        })

    except Exception as e:
        print(f"Error generating data: {e}")
        # import traceback
        # traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500
