from flask import Blueprint, request, jsonify, send_file, Response
from app.services.pdf_service import PdfService
from app.services.export_service import ExportService
import io

export_bp = Blueprint('export_bp', __name__)

@export_bp.route('/api/export/<project_id>/<chapter_id>/docx', methods=['GET', 'POST'])
def export_chapter_docx(project_id, chapter_id):
    try:
        if request.method == 'POST':
            data = request.json or {}
            project_id = data.get('projectId', project_id)
            chapter_id = data.get('chapterId', chapter_id)
            
        file_bytes, filename = ExportService.export_chapter_to_docx(project_id, chapter_id)
        return Response(
            file_bytes,
            status=200,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document' if filename.endswith('.docx') else 'application/msword',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Access-Control-Allow-Origin': '*'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@export_bp.route('/api/export/<project_id>/<chapter_id>/md', methods=['GET', 'POST'])
def export_chapter_md(project_id, chapter_id):
    try:
        if request.method == 'POST':
            data = request.json or {}
            project_id = data.get('projectId', project_id)
            chapter_id = data.get('chapterId', chapter_id)
            
        file_bytes, filename = ExportService.export_chapter_to_md(project_id, chapter_id)
        return Response(
            file_bytes,
            status=200,
            mimetype='text/markdown',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Access-Control-Allow-Origin': '*'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@export_bp.route('/api/export/<project_id>/all', methods=['GET', 'POST'])
def export_project_all(project_id):
    try:
        if request.method == 'POST':
            data = request.json or {}
            project_id = data.get('projectId', project_id)
            
        file_bytes, filename = ExportService.export_project_to_zip(project_id)
        return Response(
            file_bytes,
            status=200,
            mimetype='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Access-Control-Allow-Origin': '*'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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
