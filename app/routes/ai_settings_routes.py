import os
import logging
import litellm
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app import firestore_db, limiter

ai_settings_bp = Blueprint('ai_settings', __name__)
logger = logging.getLogger(__name__)

# Use Groq or OpenAI or Anthropic depending on what the app generally uses.
# The plan mentions Anthropic API (claude-sonnet), but Litellm can handle it.
# Let's default to groq/llama-3.3-70b-versatile or claude-3-haiku depending on what's available.
# In other files, they use groq/llama-3.3-70b-versatile. Let's use that for consistency.
DEFAULT_MODEL = "groq/llama-3.3-70b-versatile"

SYSTEM_PROMPT = """Kamu adalah asisten penulisan akademik untuk mahasiswa Indonesia yang sedang menyusun skripsi atau thesis. 
Gaya penulisan harus formal, akademik, dan sesuai standar penulisan ilmiah Indonesia.
Gunakan Bahasa Indonesia yang baku.
Jangan tambahkan penjelasan atau komentar di luar output yang diminta.
Output hanya berisi teks untuk field yang diminta, tanpa label atau heading."""

def get_field_prompt(field, context):
    title = context.get('title', '')
    study_field = context.get('study_field', '')
    research_type = context.get('research_type', context.get('methodology', ''))
    variables = context.get('variables', context.get('variables_indicators', ''))
    
    if field == 'problem_statement':
        return f"""Berdasarkan informasi berikut:
- Judul: {title}
- Bidang studi: {study_field}
- Jenis penelitian: {research_type}
- Variabel (jika ada): {variables}

Buatkan 2-3 rumusan masalah dalam bentuk pertanyaan penelitian yang tajam dan spesifik.
Format: setiap rumusan masalah di baris baru, diawali nomor."""

    elif field == 'research_objectives':
        problem_statement = context.get('problem_statement', '')
        return f"""Berdasarkan rumusan masalah berikut:
{problem_statement}

Dan informasi:
- Judul: {title}
- Bidang studi: {study_field}

Buatkan tujuan penelitian yang menjawab setiap rumusan masalah.
Format: setiap tujuan di baris baru, diawali "Untuk mengetahui..." atau "Untuk menganalisis...\""""

    elif field == 'hypothesis':
        research_objectives = context.get('research_objectives', '')
        return f"""Berdasarkan:
- Judul: {title}
- Variabel: {variables}
- Tujuan: {research_objectives}

Buatkan hipotesis penelitian dalam bentuk H0 dan H1 yang sesuai untuk penelitian kuantitatif."""

    elif field == 'significance':
        research_objectives = context.get('research_objectives', '')
        return f"""Berdasarkan:
- Judul: {title}
- Bidang studi: {study_field}
- Tujuan: {research_objectives}

Buatkan manfaat penelitian dalam dua aspek:
1. Manfaat Teoritis (2-3 poin)
2. Manfaat Praktis (2-3 poin)"""

    elif field == 'theoretical_framework':
        return f"""Berdasarkan:
- Judul: {title}
- Variabel: {variables}
- Bidang studi: {study_field}

Sebutkan 3-5 teori atau konsep utama yang relevan sebagai landasan teori untuk penelitian ini, beserta nama tokoh/ahlinya."""

    elif field == 'keywords':
        return f"""Berdasarkan:
- Judul: {title}
- Bidang studi: {study_field}
- Jenis penelitian: {research_type}

Berikan 3-5 kata kunci (keywords) yang paling relevan untuk penelitian ini. Pisahkan dengan tanda koma."""

    elif field == 'scope_limitations':
        return f"""Berdasarkan:
- Judul: {title}
- Bidang studi: {study_field}
- Jenis penelitian: {research_type}

Buatkan batasan masalah (scope and limitations) untuk penelitian ini agar penelitian lebih fokus. Berikan dalam 2-3 poin."""

    else:
        return f"Buatkan konten akademik yang relevan untuk bagian {field} berdasarkan judul: {title}"

@ai_settings_bp.route('/api/ai/generate-field', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def generate_field():
    try:
        data = request.get_json()
        field = data.get('field')
        context = data.get('context', {})
        
        if not field or not context.get('title'):
            return jsonify({'status': 'error', 'message': 'Field and Title are required'}), 400
            
        user_prompt = get_field_prompt(field, context)
        
        response = litellm.completion(
            model=DEFAULT_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.4
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Audit Log
        user_id = str(current_user.id)
        try:
            firestore_db.collection('ai_generation_logs').add({
                'user_id': user_id,
                'field': field,
                'model': DEFAULT_MODEL,
                'timestamp': firestore.SERVER_TIMESTAMP
            })
        except Exception as e:
            logger.error(f"Failed to log AI generation: {e}")
        
        return jsonify({
            'status': 'success',
            'field': field,
            'result': result_text
        }), 200
        
    except Exception as e:
        logger.error(f"Error in generate_field: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

@ai_settings_bp.route('/api/ai/generate-all', methods=['POST'])
@login_required
@limiter.limit("5 per minute")
def generate_all():
    try:
        data = request.get_json()
        context = data.get('context', {})
        
        if not context.get('title'):
            return jsonify({'status': 'error', 'message': 'Title is required'}), 400
            
        fields_to_generate = [
            'problem_statement', 
            'research_objectives', 
            'hypothesis', 
            'significance', 
            'theoretical_framework',
            'keywords',
            'scope_limitations'
        ]
        
        results = {}
        
        # We can run these sequentially to ensure dependencies (e.g. problem -> objectives)
        # 1. Problem Statement
        p_prompt = get_field_prompt('problem_statement', context)
        p_resp = litellm.completion(model=DEFAULT_MODEL, messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": p_prompt}], temperature=0.4)
        results['problem_statement'] = p_resp.choices[0].message.content.strip()
        context['problem_statement'] = results['problem_statement']
        
        # 2. Objectives
        o_prompt = get_field_prompt('research_objectives', context)
        o_resp = litellm.completion(model=DEFAULT_MODEL, messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": o_prompt}], temperature=0.4)
        results['research_objectives'] = o_resp.choices[0].message.content.strip()
        context['research_objectives'] = results['research_objectives']
        
        # 3. Rest of the fields in parallel or sequentially
        for field in fields_to_generate[2:]:
            prompt = get_field_prompt(field, context)
            resp = litellm.completion(model=DEFAULT_MODEL, messages=[{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": prompt}], temperature=0.4)
            results[field] = resp.choices[0].message.content.strip()
            
        return jsonify({
            'status': 'success',
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error in generate_all: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500
