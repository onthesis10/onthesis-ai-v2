from flask import Blueprint, request, jsonify
import time

writing_studio_bp = Blueprint('writing_studio', __name__)

# Mock database for citations for now
citations_db = [
    {"id": "1", "title": "Attention Is All You Need", "author": "Vaswani et al.", "year": 2017},
    {"id": "2", "title": "BERT: Pre-training of Deep Bidirectional Transformers", "author": "Devlin et al.", "year": 2018},
    {"id": "3", "title": "GPT-3: Language Models are Few-Shot Learners", "author": "Brown et al.", "year": 2020},
]

@writing_studio_bp.route('/chat', methods=['POST'])
def chat_copilot():
    """
    Endpoint for the AI Research Copilot.
    In production, this would call OpenAI/Gemini API.
    For now, we mock the response.
    """
    data = request.json
    user_message = data.get('message', '')
    
    # Simulate thinking delay
    time.sleep(1)
    
    # Mock response logic
    response_text = f"This is a simulated AI response to: '{user_message}'. In a real implementation, this would come from an LLM trained on academic writing."
    
    return jsonify({
        "response": response_text,
        "suggested_citations": [citations_db[0]] if "citation" in user_message.lower() else []
    })

@writing_studio_bp.route('/search_references', methods=['POST'])
def search_references():
    """
    Endpoint to search for academic references.
    """
    data = request.json
    query = data.get('query', '').lower()
    
    results = [c for c in citations_db if query in c['title'].lower() or query in c['author'].lower()]
    
    return jsonify({
        "results": results
    })

@writing_studio_bp.route('/paraphrase', methods=['POST'])
def paraphrase_text():
    """
    Endpoint to paraphrase/improve text (Academic Mode).
    """
    data = request.json
    text = data.get('text', '')
    mode = data.get('mode', 'academic') # academic, shorten, expand
    
    # Mock paraphrase
    if mode == 'academic':
        new_text = f"Evidence suggests that {text.lower()}"
    elif mode == 'shorten':
        new_text = text[:len(text)//2] + "..."
    else:
        new_text = f"Furthermore, it is important to note that {text}"
        
    return jsonify({
        "original": text,
        "paraphrased": new_text
    })


@writing_studio_bp.route('/transform', methods=['POST'])
def transform_text():
    """
    Transform text using AI for academic writing.
    Modes: formalize, simplify, expand, shorten, grammar
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        data = request.json
        text = data.get('text', '').strip()
        mode = data.get('mode', 'formalize')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Mock transformation for now - in production, call AIService
        if mode == 'formalize':
            result = f"It is empirically evident that {text.lower()}. This observation is supported by contemporary research in the field."
        elif mode == 'simplify':
            result = f"In simple terms: {text}"
        elif mode == 'expand':
            result = f"{text} Furthermore, this concept can be elaborated by considering additional contextual factors and theoretical frameworks that provide deeper insights into the phenomenon."
        elif mode == 'shorten':
            result = ' '.join(text.split()[:len(text.split())//2]) + "..."
        elif mode == 'grammar':
            result = text.capitalize() + ("." if not text.endswith('.') else "")
        else:
            result = text
        
        return jsonify({
            'status': 'success',
            'original': text,
            'transformed': result,
            'mode': mode
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

