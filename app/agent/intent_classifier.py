import os
import json
import logging
from typing import Dict, Any, List
import litellm

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sistem prompt ini diambil dari onthesis-agent-prompts.md Section 2 & 10
INTENT_CLASSIFIER_PROMPT = """
You are an intent classifier for an AI thesis assistant called OnThesis.

Given a user message and recent conversation history, classify the user's intent into exactly ONE of the following categories:

AVAILABLE INTENTS:
- generate_section      : user wants to generate a new section or text from scratch (e.g., latar belakang, pendahuluan)
- literature_review     : user wants a literature review written or expanded
- find_papers           : user wants to search for academic papers or references
- web_search            : user wants to search the internet/web for recent news, articles, or information
- generate_chapter      : user wants a complete thesis chapter written from scratch (Bab 1, 2, 3, 4, or 5)
- research_questions    : user wants to draft rumusan masalah / research questions (Bab 1)
- research_objectives   : user wants to draft tujuan penelitian (Bab 1)
- write_abstract        : user wants to write, improve, or create an abstract (abstrak)
- rewrite_paragraph     : user wants a paragraph rewritten or improved
- paraphrase            : user wants text paraphrased to avoid plagiarism
- expand_paragraph      : user wants a paragraph made longer or more detailed
- summarize             : user wants a long text summarized
- academic_style        : user wants text converted to academic/formal writing style
- citation_format       : user wants citations formatted (APA, IEEE, etc.)
- analyze_argument      : user wants argument structure analyzed
- check_coherence       : user wants paragraph or section flow checked
- thesis_scoring        : user wants overall thesis quality evaluated
- general_question      : user is asking a general question about thesis writing
- edit_thesis           : user wants to edit, fix, or improve existing thesis text in the editor
- research_gap          : user wants to formulate or identify research gap (Bab 1)
- methodology_justify   : user wants to justify methodology choice (Bab 3)
- data_interpretation   : user wants data interpretation or correlation with theory (Bab 4)
- thesis_conclusion     : user wants to write conclusion, limitations, or future work (Bab 5)
- validate_citations    : user wants to check citations completeness
- golden_thread_check   : user wants to check cross-chapter coherence
- greeting              : user is saying hello, greeting, or starting a conversation (e.g., hi, halo, pagi, hey)
- unclear               : intent cannot be determined confidently

---

IMPORTANT CLASSIFICATION RULES:
1. If the user message contains any of ini: "literature review", "tinjauan pustaka", "review literatur", "literatur review", "lit review"
combined with references to previous papers like "paper tadi", "yang tadi", "yang sebelumnya", "yang sudah dicari", "yang barusan", "hasil pencarian"
then ALWAYS classify as "literature_review" with high confidence (>= 0.90), even if conversation_history is empty.
2. If the user message contains "literature review", "tinjauan pustaka", or "review literatur" followed by a specific topic (e.g., "tentang machine learning")
then ALWAYS classify as "literature_review" with confidence >= 0.90, even if history is empty.

---

EXAMPLES:

Input: "halo agent", "hi", "selamat pagi", "ping", "hey"
Output: { "intent": "greeting", "confidence": 0.99 }

Input: "tolong perbaiki paragraf ini biar lebih formal"
Output: { "intent": "academic_style", "confidence": 0.97 }

Input: "cariin paper tentang machine learning buat deteksi penyakit"
Output: { "intent": "find_papers", "confidence": 0.95 }

Input: "buatin literature review dari paper yang tadi kamu temukan"
Output: { "intent": "literature_review", "confidence": 0.93 }

Input: "buatkan literature review dari paper yang tadi ditemukan"
Output: { "intent": "literature_review", "confidence": 0.95 }

Input: "bisa tolong buat literatur review dari referensi yang barusan?"
Output: { "intent": "literature_review", "confidence": 0.96 }

Input: "buatkan rangkuman literature review dari jurnal-jurnal tadi"
Output: { "intent": "literature_review", "confidence": 0.94 }

Input: "tolong buatkan tinjauan pustaka dari paper-paper yang tadi"
Output: { "intent": "literature_review", "confidence": 0.94 }

Input: "susun literature review berdasarkan hasil pencarian paper sebelumnya"
Output: { "intent": "literature_review", "confidence": 0.95 }

Input: "buatkan review literatur dari jurnal yang sudah dicari tadi"
Output: { "intent": "literature_review", "confidence": 0.93 }

Input: "parafrase bagian ini dong, takut kena plagiarisme"
Output: { "intent": "paraphrase", "confidence": 0.98 }

Input: "cek logika argumen di bab 3 saya ini"
Output: { "intent": "analyze_argument", "confidence": 0.91 }

Input: "bagaimana cara nulis abstrak yang baik?"
Output: { "intent": "general_question", "confidence": 0.88 }

Input: "bikinin latar belakang sesuai dengan judul saya 5 paragraf"
Output: { "intent": "generate_section", "confidence": 0.96 }

Input: "tolong buatkan research gap untuk topik e-learning"
Output: { "intent": "research_gap", "confidence": 0.95 }

Input: "buatkan rumusan masalah sesuai topik saya"
Output: { "intent": "research_questions", "confidence": 0.96 }

Input: "susun tujuan penelitian berdasarkan rumusan masalah saya"
Output: { "intent": "research_objectives", "confidence": 0.95 }

Input: "justifikasi kenapa saya pakai metode kuantitatif"
Output: { "intent": "methodology_justify", "confidence": 0.93 }

Input: "interpretasikan data tabel ini dan hubungkan dengan teori di bab 2"
Output: { "intent": "data_interpretation", "confidence": 0.92 }

Input: "buatkan kesimpulan dari bab 4 ini yang menjawab rumusan masalah"
Output: { "intent": "thesis_conclusion", "confidence": 0.94 }

Input: "cek apakah semua klaim sudah ada sitasinya"
Output: { "intent": "validate_citations", "confidence": 0.96 }

Input: "cek benang merah dari bab 1 sampai bab 5"
Output: { "intent": "golden_thread_check", "confidence": 0.95 }

Input: "cari di google tentang blockchain in education 2024"
Output: { "intent": "web_search", "confidence": 0.97 }

Input: "cari di internet artikel terbaru tentang AI untuk kesehatan"
Output: { "intent": "web_search", "confidence": 0.96 }

Input: "web search machine learning trends 2024"
Output: { "intent": "web_search", "confidence": 0.98 }

Input: "buatkan bab 2 lengkap tentang deep learning"
Output: { "intent": "generate_chapter", "confidence": 0.97 }

Input: "tolong tulis bab 1 sesuai judul saya dari awal"
Output: { "intent": "generate_chapter", "confidence": 0.96 }

Input: "generate bab 3 metodologi penelitian"
Output: { "intent": "generate_chapter", "confidence": 0.97 }

Input: "buat abstrak untuk tesis saya"
Output: { "intent": "write_abstract", "confidence": 0.98 }

Input: "tolong buatkan abstrak berdasarkan judul dan metode ini"
Output: { "intent": "write_abstract", "confidence": 0.97 }

Input: "ini bab 2 saya, gimana menurutmu?"
Output: { "intent": "unclear", "confidence": 0.45, "needs_clarification": true,
          "clarification_question": "Kamu ingin saya analisis kualitasnya, perbaiki gayanya, atau cari referensi tambahan?" }

---

INPUT:
Conversation history: {conversation_history}
User message: {user_message}

---

OUTPUT (JSON only, no explanation):
{
  "intent": "<intent_name>",
  "confidence": <0.0 to 1.0>,
  "key_entities": ["<topic or keyword extracted>"],
  "needs_clarification": <true | false>,
  "clarification_question": "<question to ask if needs_clarification is true, otherwise null>"
}
"""

CLARIFICATION_TEMPLATE = """
Hm, saya belum yakin dengan apa yang kamu butuhkan sekarang.

Apakah kamu ingin saya:
A) Mencari paper akademik tentang topik ini
B) Membantu menulis atau memperbaiki teks
C) Menganalisis argumen atau struktur tulisan kamu

Ketik A, B, atau C — atau jelaskan lebih spesifik apa yang kamu butuhkan.
"""

class IntentClassifier:
    """
    Mengklasifikasikan intent dari input user berdasarkan percakapan sebelumnya.
    Terdapat pengecekan confidence: jika kurang dari threshold (default 0.7), 
    akan mengembalikan respons untuk meminta klarifikasi.
    """
    
    def __init__(self, confidence_threshold: float = 0.7):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("INTENT_AGENT_MODEL", "groq/llama-3.1-8b-instant")
        self.confidence_threshold = confidence_threshold
        
        if not self.api_key:
            logger.warning("LLM_API_KEY environment variable is not set. Pemanggilan LLM kemungkinan akan gagal.")

    def _call_llm(self, prompt: str) -> str:
        """
        Helper method untuk memanggil API LLM dengan fallback ke Gemini jika Groq limit.
        """
        import litellm
        from litellm.exceptions import RateLimitError
        
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        
        try:
            logger.info(f"| DEBUG | IntentClassifier -> Mencoba Primary: {self.model}")
            logger.info(f"IntentClassifier memanggil LLM Primary ({self.model})")
            response = litellm.completion(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                api_key=self.api_key,
                response_format={"type": "json_object"}
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.info(f"| DEBUG | IntentClassifier -> Primary Limit! Error: {str(e)}")
            logger.info(f"| DEBUG | IntentClassifier -> Mencoba Fallback: {fallback_model}")
            logger.warning(f"RateLimit hit pada LLM Primary, mencoba fallback ke {fallback_model}...")
            if not fallback_api_key:
                logger.error("API_KEY tidak di-set. Fallback gagal.")
                raise e
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[{"role": "user", "content": prompt}],
                    api_key=fallback_api_key,
                    response_format={"type": "json_object"}
                )
                logger.info(f"| DEBUG | IntentClassifier -> Fallback Sukses ({fallback_model})")
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| DEBUG | IntentClassifier -> Fallback Gagal! Error: {str(fallback_e)}")
                logger.error(f"Fallback LLM gagal: {str(fallback_e)}")
                raise fallback_e

    def classify(self, user_message: str, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Melakukan klasifikasi intent. 
        Jika confidence < threshold atau flag needs_clarification bernilai True, 
        akan mengembalikan properti `ask_user` berisi pertanyaan klarifikasi.
        """
        logger.info(f"| DEBUG | IntentClassifier.classify() -> user_message: '{user_message}'")
        if "literature review" in user_message.lower():
            logger.info("| DEBUG | IntentClassifier -> Matched hardcoded rule: 'literature review'")
            return {
                "intent": "literature_review",
                "confidence": 0.95,
                "key_entities": [],
                "needs_clarification": False
            }

        # V2: Hardcoded rules for chapter-specific intents
        msg_lower = user_message.lower()
        question_starters = ("bagaimana", "gimana", "apa", "what", "why", "kenapa", "jelaskan")
        write_intent_verbs = ("buat", "bikin", "tulis", "susun", "generate", "write", "draft", "tolong buatkan")

        # === NEW: Power Agent Intent Shortcuts ===
        if any(kw in msg_lower for kw in [
            "cari di google", "cari di internet", "search web", "web search",
            "cari online", "cari artikel terbaru", "browsing", "dari internet"
        ]):
            logger.info("| DEBUG | IntentClassifier -> Matched hardcoded rule: 'web_search'")
            return {"intent": "web_search", "confidence": 0.97, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in [
            "tulis ulang", "perbaiki paragraf", "rewrite", "parafrase", "buat lebih formal",
            "perbaiki kalimat", "susun ulang"
        ]):
            logger.info("| DEBUG | IntentClassifier -> Matched hardcoded rule: 'rewrite_paragraph'")
            return {"intent": "rewrite_paragraph", "confidence": 0.98, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in [
            "buatkan bab", "tulis bab lengkap", "generate bab", "buat bab",
            "tulis bab 1", "tulis bab 2", "tulis bab 3", "tulis bab 4", "tulis bab 5",
            "bab 1 lengkap", "bab 2 lengkap", "bab 3 lengkap", "bab 4 lengkap", "bab 5 lengkap"
        ]):
            return {"intent": "generate_chapter", "confidence": 0.96, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in [
            "buat abstrak", "tulis abstrak", "buatkan abstrak", "write abstract",
            "abstract", "bikin abstrak"
        ]):
            if "abstract" == msg_lower.strip() or "abstrak" == msg_lower.strip():
                return {"intent": "unclear", "confidence": 0.45, "ask_user": CLARIFICATION_TEMPLATE}
            if any(msg_lower.startswith(starter) for starter in question_starters) and not any(verb in msg_lower for verb in write_intent_verbs):
                # Pertanyaan konseptual tentang abstrak lebih aman didelegasikan ke LLM classifier.
                pass
            else:
                return {"intent": "write_abstract", "confidence": 0.97, "key_entities": [], "needs_clarification": False}

        # === Existing Chapter-Specific Rules ===
        if any(kw in msg_lower for kw in [
            "buatkan rumusan masalah", "bikin rumusan masalah", "susun rumusan masalah",
            "tulis rumusan masalah", "buat rumusan masalah", "rumuskan masalah penelitian"
        ]):
            return {"intent": "research_questions", "confidence": 0.96, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in [
            "buatkan tujuan penelitian", "bikin tujuan penelitian", "susun tujuan penelitian",
            "tulis tujuan penelitian", "buat tujuan penelitian"
        ]):
            return {"intent": "research_objectives", "confidence": 0.95, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["research gap", "gap penelitian", "celah penelitian", "kelemahan penelitian"]):
            return {"intent": "research_gap", "confidence": 0.93, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["justifikasi metod", "justify method", "alasan memilih metode", "kenapa metode"]):
            return {"intent": "methodology_justify", "confidence": 0.92, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["interpretasi data", "interpret data", "hubungkan dengan teori", "korelasi bab 2", "correlate"]):
            return {"intent": "data_interpretation", "confidence": 0.91, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["kesimpulan", "conclusion", "limitasi", "limitation", "saran penelitian selanjutnya"]):
            return {"intent": "thesis_conclusion", "confidence": 0.92, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["cek sitasi", "validasi sitasi", "citation check", "missing citation"]):
            return {"intent": "validate_citations", "confidence": 0.94, "key_entities": [], "needs_clarification": False}

        if any(kw in msg_lower for kw in ["benang merah", "golden thread", "koherensi antar bab", "coherence check"]):
            return {"intent": "golden_thread_check", "confidence": 0.93, "key_entities": [], "needs_clarification": False}

        prompt = INTENT_CLASSIFIER_PROMPT.replace("{conversation_history}", json.dumps(conversation_history, indent=2))
        prompt = prompt.replace("{user_message}", user_message)
        
        try:
            llm_response = self._call_llm(prompt)
            logger.info(f"RAW LLM RESPONSE: {repr(llm_response)}")
            result = json.loads(llm_response)
            
            confidence = result.get("confidence", 0.0)
            logger.info(f"CONFIDENCE: {confidence}")
            needs_clarification = result.get("needs_clarification", False)
            
            # Pengecekan threshold
            if confidence < self.confidence_threshold or needs_clarification:
                clarification_msg = result.get("clarification_question")
                if not clarification_msg:
                    clarification_msg = CLARIFICATION_TEMPLATE
                
                logger.info(f"Classified intent: unclear (confidence: {confidence}, needs_clarification: {needs_clarification})")
                return {
                    "intent": "unclear",
                    "confidence": confidence,
                    "ask_user": clarification_msg,
                    "raw_result": result
                }
            
            logger.info(f"Classified intent: {result.get('intent')} (confidence: {confidence})")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"Gagal mem-parsing response JSON dari classifier: {str(e)}")
            return {
                "intent": "unclear",
                "confidence": 0.0,
                "ask_user": CLARIFICATION_TEMPLATE,
                "error": "json_parse_error"
            }
        except Exception as e:
            logger.error(f"Error pada proses klasifikasi: {str(e)}")
            return {
                "intent": "unclear",
                "confidence": 0.0,
                "ask_user": CLARIFICATION_TEMPLATE,
                "error": str(e)
            }
