from flask import Blueprint, request, jsonify, send_file
from app.services.pdf_service import PdfService
import io

export_bp = Blueprint('export_bp', __name__)

@export_bp.route('/api/export/test', methods=['GET', 'POST'])
def export_test():
    content = b"Hello World! This is a test file."
    from flask import Response
    return Response(
        content,
        status=200,
        mimetype='text/plain',
        headers={
            'Content-Disposition': 'attachment; filename=test.txt',
            'Content-Length': str(len(content)),
            'Cache-Control': 'no-cache'
        }
    )

@export_bp.route('/api/export/pdf', methods=['POST', 'OPTIONS'])
def export_pdf():
    import sys
    sys.stdout.write(f"🔥 [BACKEND] HIT export_pdf. Method: {request.method}\n")
    sys.stdout.flush()

    # 🔥 MANUAL CORS PREFLIGHT HANDLER
    if request.method == 'OPTIONS':
        from flask import Response
        response = Response()
        response.headers['Access-Control-Allow-Origin'] = '*'  # Wildcard for debugging
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        response.headers['Access-Control-Allow-Methods'] = 'POST,OPTIONS'
        # response.headers['Access-Control-Allow-Credentials'] = 'true' # REMOVED to avoid conflict with *
        return response, 200

    try:
        sys.stdout.write("🔥 [BACKEND] Processing POST request...\n")
        data = request.json
        
        # --- REAL PDF GENERATION ---
        print("Generating PDF via PdfService...")
        pdf_bytes = PdfService.generate_pdf(data)
        # ---------------------------

        sys.stdout.write(f"🔥 [BACKEND] Sending {len(pdf_bytes)} bytes...\n")
        sys.stdout.flush()
        
        from flask import Response
        response = Response(
            pdf_bytes,
            status=201, # CHANGED to 201 to verify if this propagates
            mimetype='application/octet-stream', # Changed to generic binary
            headers={
                'Content-Disposition': 'attachment; filename=Analysis_Export.pdf',
                'Content-Length': str(len(pdf_bytes)),
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*', # Explicit Wildcard
                # 'Access-Control-Allow-Credentials': 'true', # REMOVED
                'X-Debug-Status': 'Backend-Success'
            }
        )
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500
