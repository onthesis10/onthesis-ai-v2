# File: app/routes/analysis_routes.py
# Deskripsi: Route handler untuk Data Analysis. 
# Status: Refactored (Support JSON & File Upload).

from flask import Blueprint, render_template, request, jsonify, send_file, url_for, Response, stream_with_context
from flask_login import login_required, current_user
import pandas as pd
import json
import logging

from app.services.analysis_service import AnalysisService
from app.utils.data_engine import OnThesisDataset
from app.utils import general_utils, ai_utils
from app.services.ai_service import AIService
from app import firestore_db

from datetime import datetime

from . import analysis_bp
logger = logging.getLogger(__name__)

# --- HALAMAN VIEW ---

@analysis_bp.route('/data-analysis')
@login_required
def data_analysis():
    return render_template('data_analysis.html')

# --- API: MANAJEMEN DATA (CRUD) ---

@analysis_bp.route('/api/project/upload-dataset', methods=['POST'])
def upload_dataset_sync():
    """
    Menangani upload dataset baik via FILE (Multipart) maupun JSON (dari Frontend Store).
    """
    try:
        # Mock User Logic
        user = current_user
        if not user.is_authenticated:
            user = type('User', (object,), {'id': 'guest', 'is_pro': True})()

        user_id = str(user.id)
        df = None
        variables_meta = []
        project_id = 'default'

        # SKENARIO 1: Request berupa JSON (Dikirim dari Frontend React setelah Preview)
        if request.is_json:
            print("📦 [UPLOAD] Received JSON Payload")
            payload = request.get_json()
            raw_data = payload.get('data')
            variables_meta = payload.get('variables', [])
            project_id = payload.get('project_id', 'default')

            print(f"📦 [UPLOAD] Rows: {len(raw_data) if raw_data else 0}, Vars: {len(variables_meta)}")

            if not raw_data:
                print("❌ [UPLOAD] Data is empty")
                return jsonify({'error': 'Data JSON kosong'}), 400
            
            # Buat DataFrame dari list of objects
            df = pd.DataFrame(raw_data)

        # SKENARIO 2: Request berupa File Upload (Multipart/Form-Data)
        elif 'file' in request.files:
            file = request.files['file']
            project_id = request.form.get('project_id', 'default')
            
            if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400

            if file.filename.endswith('.csv'):
                df = pd.read_csv(file)
            else:
                df = pd.read_excel(file)
        
        else:
            return jsonify({'error': 'Format request tidak didukung (Gunakan JSON atau File)'}), 400

        # --- PROSES SIMPAN KE ENGINE ---
        if df is not None:
            # 1. Inisialisasi Dataset
            dataset = OnThesisDataset(df=df, user_id=user_id, project_id=project_id)
            
            # 2. Update Metadata dari Frontend (Jika ada)
            # Ini penting agar settingan 'measure' (Scale/Nominal) dari Preview Modal tersimpan
            if variables_meta:
                for v in variables_meta:
                    name = v.get('name')
                    if name:
                        # Update properti satu per satu
                        dataset.update_variable(name, 'measure', v.get('measure'))
                        dataset.update_variable(name, 'type', v.get('type'))
                        dataset.update_variable(name, 'label', v.get('label'))
                        dataset.update_variable(name, 'role', v.get('role'))
                        dataset.update_variable(name, 'decimals', v.get('decimals'))

            # 3. Simpan Permanen (Firestore/Local)
            success, msg = dataset.save()
            
            if success:
                return jsonify({
                    'status': 'success', 
                    'message': 'Dataset synced successfully',
                    'meta': dataset.get_variable_view_data(),
                    'rows_count': len(df)
                })
            else:
                return jsonify({'status': 'error', 'message': msg}), 500
        
        return jsonify({'error': 'Gagal memproses dataframe'}), 500

    except Exception as e:
        logger.error(f"Upload Sync Error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/project/smart-import', methods=['POST'])
@login_required
def smart_import_preview():
    if 'file' not in request.files: return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({'error': 'No selected file'}), 400

    try:
        preview_result = OnThesisDataset.smart_preview(file, file.filename)
        if preview_result['status'] == 'error':
            return jsonify({'error': preview_result['message']}), 500
        return jsonify(preview_result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/project/initialize', methods=['POST'])
@login_required
def initialize_project():
    try:
        payload = request.json or {}
        data = payload.get('data') 
        headers = payload.get('headers')
        
        if not data:
            return jsonify({'error': 'No valid data provided'}), 400

        df = pd.DataFrame(data, columns=headers)
        dataset = OnThesisDataset(df, user_id=str(current_user.id))
        success, msg = dataset.save()
        
        if success: return jsonify({'status': 'success', 'message': msg})
        else: return jsonify({'error': f'Gagal menyimpan: {msg}'}), 500
    except Exception as e: 
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/variable-view/get', methods=['GET'])
@login_required
def get_variable_view():
    ds = OnThesisDataset.load(current_user.id)
    return jsonify({'variables': ds.get_variable_view_data() if ds else []})

@analysis_bp.route('/api/data-view/get', methods=['GET'])
@login_required
def get_data_view():
    ds = OnThesisDataset.load(current_user.id)
    return jsonify(ds.get_data_view_data() if ds else {'error': 'No data'})

@analysis_bp.route('/api/data-view/update', methods=['POST'])
@login_required
def update_data_view():
    d = request.json; ds = OnThesisDataset.load(current_user.id)
    if ds: ds.update_cell_data(d.get('row'), d.get('col'), d.get('value'))
    return jsonify({'status': 'success'})

@analysis_bp.route('/api/variable-view/update', methods=['POST'])
@login_required
def update_variable_view():
    d = request.json; ds = OnThesisDataset.load(current_user.id)
    if ds: ds.update_variable(d.get('name'), d.get('field'), d.get('value'))
    if ds: ds.update_variable(d.get('name'), d.get('field'), d.get('value'))
    return jsonify({'status': 'success'})

@analysis_bp.route('/api/project/recode-variable', methods=['POST'])
@login_required 
def recode_variable():
    """
    Endpoint untuk mapping values (Text -> Angka).
    Payload: { "variable": "GROUP", "mapping": {"A": 1, "B": 2} }
    """
    try:
        user_id = str(current_user.id)
        data = request.json
        variable = data.get('variable')
        mapping = data.get('mapping') # {'Old': New}
        
        result = AnalysisService.recode_variable(
            user_id=user_id,
            variable=variable,
            mapping=mapping
        )
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@analysis_bp.route('/api/project/reset', methods=['POST'])
@login_required
def reset_project():
    try:
        ds = OnThesisDataset.load(current_user.id)
        if ds: ds.clear_all_data()
        return jsonify({'status': 'success'})
    except Exception as e: return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/project/export-data', methods=['GET'])
@login_required
def export_data_csv():
    try:
        ds = OnThesisDataset.load(current_user.id)
        if not ds or ds.df.empty: return jsonify({'error': 'Data kosong.'}), 404
        success, msg = ds.save() 
        if not success: return jsonify({'error': msg}), 500
        
        return send_file(
            ds.export_to_csv(), 
            mimetype='text/csv', 
            as_attachment=True, 
            download_name=f'OnThesis_Export_{ds.project_id}.csv'
        )
    except Exception as e: return jsonify({'error': str(e)}), 500


# --- API: DATA PREPARATION (Unified) ---

@analysis_bp.route('/api/data-preparation/<action_type>', methods=['POST'])
@login_required
def data_preparation_handler(action_type):
    try:
        params = request.json
        if action_type == 'search-data':
            ds = OnThesisDataset.load(current_user.id)
            if not ds: return jsonify({'status':'error','message':'Dataset not found'}),404
            results = ds.search_data(params.get('query'), params.get('target_columns'))
            return jsonify({'status':'success','results': results})
            
        if action_type == 'smart-scan':
            ds = OnThesisDataset.load(current_user.id)
            if not ds: return jsonify({'status':'error','message':'Dataset not found'}),404
            return jsonify({'status':'success','report': ds.scan_data_quality()})

        internal_action_map = {
            'missing-values': 'missing_values',
            'remove-duplicates': 'remove_duplicates',
            'find-replace': 'find_replace'
        }
        
        internal_key = internal_action_map.get(action_type)
        if not internal_key:
             return jsonify({'error': 'Invalid action'}), 400

        result = AnalysisService.perform_data_preparation(current_user.id, internal_key, params)
        return jsonify(result)

    except Exception as e:
        logger.error(f"Data Prep Route Error: {e}")
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/data-preparation/smart-scan', methods=['GET'])
@login_required
def smart_data_scan_get():
    try:
        ds = OnThesisDataset.load(current_user.id)
        if not ds: return jsonify({'status':'error','message':'Dataset not found'}),404
        return jsonify({'status':'success','report':ds.scan_data_quality()})
    except Exception as e:
         return jsonify({'error': str(e)}), 500


# --- API: ANALISIS STATISTIK (THE MASTER ROUTE) ---

@analysis_bp.route('/api/run-analysis/<analysis_type>', methods=['POST'])
def run_analysis_endpoint(analysis_type):
    # Mock User for Development/Guest Mode
    user = current_user
    if not user.is_authenticated:
        user = type('User', (object,), {'id': 'guest', 'is_pro': True, 'email': 'guest@local'})()
    
    if not user.is_pro:
        try:
            is_allowed, msg = general_utils.check_and_update_pro_trial(
                firestore_db, 
                current_user.email, 
                'data_analysis'
            )
            if not is_allowed:
                return jsonify({"error": msg, "redirect": url_for('main.upgrade_page')}), 403
        except Exception as e:
            logger.error(f"Quota Check Error: {e}")

    try:
        params = request.get_json() or {}
        result = AnalysisService.execute_analysis(user, analysis_type, params)
        return jsonify({"success": True, "data": result}), 200

    except ValueError as ve:
        logger.error(f"❌ Analysis Error: {str(ve)}")
        return jsonify({"error": str(ve)}), 400
    except FileNotFoundError as fe:
        return jsonify({"error": str(fe)}), 404
    except Exception as e:
        return jsonify({"error": f"Gagal memproses analisis: {str(e)}"}), 500

# Legacy Route Compatibility
ANALYSIS_TYPES = [
    'descriptive-analysis', 'normality', 'independent-ttest', 'paired-ttest',
    'oneway-anova', 'correlation-analysis', 'linear-regression', 'mann-whitney',
    'kruskal-wallis', 'wilcoxon', 'reliability', 'validity', 'chi-square'
]

for a_type in ANALYSIS_TYPES:
    analysis_bp.add_url_rule(
        f'/api/{a_type}', 
        endpoint=f'legacy_{a_type}', 
        view_func=run_analysis_endpoint, 
        methods=['POST'],
        defaults={'analysis_type': a_type}
    )


# --- API: LOG & HISTORY ---

@analysis_bp.route('/api/analysis-history/get', methods=['GET'])
@login_required
def get_analysis_history():
    ds = OnThesisDataset.load(current_user.id)
    return jsonify({'history': ds.get_analysis_history() if ds else []})

@analysis_bp.route('/api/analysis-history/delete/<log_id>', methods=['DELETE'])
@login_required
def delete_analysis_log(log_id):
    ds = OnThesisDataset.load(current_user.id)
    if ds: ds.delete_analysis_log(log_id); return jsonify({'status': 'success'})
    return jsonify({'error': 'Dataset not found'}), 404

@analysis_bp.route('/api/analysis-history/clear', methods=['DELETE'])
@login_required
def clear_analysis_history():
    ds = OnThesisDataset.load(current_user.id)
    if ds: ds.clear_analysis_history(); return jsonify({'status': 'success'})
    return jsonify({'error': 'Dataset not found'}), 404

# --- API: AI & INTERPRETASI ---

@analysis_bp.route('/api/interpret-result', methods=['POST'])
@login_required
def interpret_result():
    try:
        data = request.get_json()
        stats_text = data.get('result_data') 
        if not stats_text: return jsonify({'error': 'Data kosong'}), 400
        interpretation = ai_utils.get_ai_interpretation(str(stats_text))
        return jsonify({'status': 'success', 'interpretation': interpretation})
    except Exception as e: return jsonify({'error': str(e)}), 500



@analysis_bp.route('/api/interpret-chart', methods=['POST'])
@login_required
def interpret_chart_endpoint():
    try:
        data = request.get_json()
        chart_title = data.get('title', 'Chart')
        chart_type = data.get('type', 'unknown')
        chart_data = data.get('data', [])
        
        if not chart_data:
            return jsonify({'error': 'No chart data provided'}), 400

        explanation = AIService.interpret_chart(chart_title, chart_type, chart_data)
        
        return jsonify({'status': 'success', 'explanation': explanation})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/generate-chapter4-draft', methods=['POST'])
@login_required
def generate_chapter4_draft():
    if not current_user.is_pro:
        is_allowed, msg = general_utils.check_and_update_pro_trial(firestore_db, current_user.email, 'writing_assistant')
        if not is_allowed:
            return jsonify({"error": "Limit Habis. Upgrade PRO untuk fitur Bab 4."}), 403

    try:
        data = request.get_json()
        stats_result = data.get('result')
        analysis_type = data.get('type')

        ds = OnThesisDataset.load(current_user.id)
        project_context = None
        if ds and ds.project_id and ds.project_id != 'default':
            try:
                doc = firestore_db.collection('projects').document(ds.project_id).get()
                if doc.exists:
                    p_data = doc.to_dict()
                    project_context = {
                        'title': p_data.get('title'),
                        'problem_statement': p_data.get('problem_statement'),
                        'methodology': p_data.get('methodology'),
                        'variables': p_data.get('variables'),
                        'theories': p_data.get('theories')
                    }
            except: pass

        input_data = {
            "stats_result": json.dumps(stats_result, indent=2),
            "analysis_type": analysis_type,
            "note": "Buatkan pembahasan Bab 4 lengkap."
        }
        
        selected_model = "gpt5" if current_user.is_pro else "fast" 
        draft_content = ai_utils.generate_academic_draft(
            user=current_user,
            task_type="discussion_chapter4",
            input_data=input_data,
            project_context=project_context,
            selected_model=selected_model,
            word_count="1000"
        )
        return jsonify({'status': 'success', 'content': draft_content})

    except Exception as e:
        logger.error(f"Chapter 4 Gen Error: {e}")
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/data-analyst/chat', methods=['POST'])
@login_required
def data_analyst_chat():
    try:
        data = request.get_json()
        message = data.get('message')
        selected_model = data.get('model', 'fast') 
        
        ds = OnThesisDataset.load(current_user.id)
        if not ds or ds.df.empty:
            return jsonify({'error': 'Dataset belum dimuat.'}), 404

        try:
            preview_text = ds.df.head(5).to_string(index=False)
            desc_text = ds.df.describe().to_string()
        except:
            preview_text, desc_text = "N/A", "N/A"

        dataset_context = {
            'total_rows': len(ds.df),
            'total_cols': len(ds.df.columns),
            'variables': ds.get_variable_view_data(),
            'summary_text': f"SAMPEL:\n{preview_text}\n\nSTATISTIK:\n{desc_text}"
        }

        def generate():
            for chunk in ai_utils.get_data_analyst_stream(message, dataset_context, selected_model, current_user.is_pro):
                yield chunk

        return Response(stream_with_context(generate()), mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/api/analysis/save-to-project', methods=['POST'])
@login_required
def save_analysis_to_project():
    try:
        data = request.get_json()
        project_id = data.get('projectId')
        analysis_result = data.get('result')
        analysis_type = data.get('type')

        if not project_id or not analysis_result:
            return jsonify({'error': 'Data tidak lengkap'}), 400

        doc_ref = firestore_db.collection('projects').document(project_id)
        doc = doc_ref.get()
        
        if not doc.exists or doc.to_dict().get('userId') != str(current_user.id):
            return jsonify({'error': 'Proyek tidak ditemukan atau akses ditolak'}), 403

        doc_ref.update({
            'data_analysis_result': analysis_result,
            'data_analysis_type': analysis_type,
            'updated_at': firestore.SERVER_TIMESTAMP
        })

        return jsonify({'status': 'success', 'message': 'Data terhubung ke Writing Studio!'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@analysis_bp.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    req_data = request.json
    user_msg = req_data.get('message', '')
    data_context = req_data.get('context', '') 
    
    mock_user = type('User', (object,), {'id': 'guest', 'is_pro': True})()

    payload = {
        'task': 'chat',
        'data': {
            'content': user_msg,
            'context': data_context
        }
    }

    def generate():
        try:
            for chunk in AIService.writing_assistant_stream(mock_user, payload):
                yield chunk
        except Exception as e:
            yield f"Error: {str(e)}"

    return Response(stream_with_context(generate()), mimetype='text/plain')

@analysis_bp.route('/api/ai/defense', methods=['POST'])
def ai_defense():
    data = request.json
    action = data.get('action', 'answer')
    mock_user = type('User', (object,), {'id': 'guest', 'is_pro': True})()
    
    result = AIService.thesis_defense_simulation(mock_user, action, data)
    return jsonify(result)


@analysis_bp.route('/api/project/save-manual', methods=['POST'])
@login_required
def save_project_manual():
    """
    Endpoint untuk memicu sinkronisasi paksa dari Local Disk ke Firestore (Cloud).
    """
    try:
        user_id = str(current_user.id)
        # 1. Load dataset 
        dataset = OnThesisDataset.load(user_id=user_id)
        
        # 2. Panggil method force_cloud_sync
        success, msg = dataset.force_cloud_sync()
        
        if success:
            return jsonify({
                'status': 'success', 
                'message': 'Project synced to Cloud successfully', 
                # 🔥 FIX: Ganti general_utils dengan datetime.now().isoformat()
                'timestamp': datetime.now().isoformat() 
            }), 200
        else:
            return jsonify({'status': 'error', 'message': f"Cloud Sync Failed: {msg}"}), 500
            
    except Exception as e:
        logger.error(f"Save Manual Error: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500