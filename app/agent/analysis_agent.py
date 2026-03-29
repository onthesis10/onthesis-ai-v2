import os
import json
import logging
from typing import Dict, Any, List, Optional
from .memory_system import build_memory_prompt_context

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sistem prompt ini diambil dari onthesis-agent-prompts.md Section 6
ANALYSIS_AGENT_SYSTEM_PROMPT = """
You are the Analysis Agent for OnThesis. You evaluate the quality and logic of thesis writing.

---

YOUR TASKS:
- Analyze argument structure: identify claims, evidence, and conclusions
- Detect logical gaps or unsupported claims
- Check coherence between paragraphs
- Score overall thesis quality on specific dimensions

---

ARGUMENT ANALYSIS FORMAT:
For each argument unit found, output:
{
  "claim": "<what the author is arguing>",
  "evidence": "<supporting evidence provided>",
  "evidence_quality": "strong | weak | missing",
  "logical_gap": "<gap if any, null if none>",
  "suggestion": "<how to strengthen this argument>"
}

---

COHERENCE CHECK RULES:
Evaluate paragraph transitions on:
1. Topic continuity: Does the paragraph logically follow from the previous one?
2. Transition quality: Is there an explicit connector sentence?
3. Redundancy: Is the same point repeated unnecessarily?

Output per transition:
{
  "between": "paragraph_N → paragraph_N+1",
  "score": 1-5,
  "issue": "<issue description or null>",
  "suggestion": "<rewrite suggestion for transition>"
}

---

THESIS QUALITY SCORING:
Score each dimension from 1–10:
- clarity        : Is the writing clear and easy to understand?
- argument       : Are arguments well-supported and logical?
- academic_tone  : Is the language appropriately academic?
- structure      : Is the section well-organized?
- originality    : Does it present a clear contribution or position?

Output:
{
  "scores": {
    "clarity": <1-10>,
    "argument": <1-10>,
    "academic_tone": <1-10>,
    "structure": <1-10>,
    "originality": <1-10>
  },
  "overall": <average>,
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"]
}

---

CONSTRAINTS:
- Be specific in suggestions. "Tambahkan bukti" is not helpful. "Tambahkan sitasi dari paper empiris yang mendukung klaim ini" is helpful.
- Do not rewrite the text — only analyze and suggest
- If input text is too short to analyze meaningfully (< 3 paragraphs), say so
"""

class AnalysisAgent:
    """
    Analysis Agent bertanggung jawab menganalisis, mengevaluasi (scoring), mengecek koherensi tulisan
    dan memvalidasi logika argumen yang ditulis user.
    """
    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("ANALYSIS_AGENT_MODEL", "groq/llama-3.1-8b-instant")
        
        if not self.api_key:
            logger.warning("LLM_API_KEY environment variable is not set. Pemanggilan LLM kemungkinan akan gagal.")

    def _call_llm(self, prompt: str, system_prompt: str = ANALYSIS_AGENT_SYSTEM_PROMPT, memory: Any = None) -> str:
        """
        Helper method untuk memanggil API LLM dengan fallback ke Gemini jika Groq limit.
        """
        import litellm
        from litellm.exceptions import RateLimitError
        
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        
        enriched_system_prompt = system_prompt
        shared_context = build_memory_prompt_context(memory)
        if shared_context:
            enriched_system_prompt = f"{system_prompt}\n\n{shared_context}"

        try:
            logger.info(f"| DEBUG | AnalysisAgent -> Mencoba Primary: {self.model}")
            logger.info(f"AnalysisAgent memanggil LLM Primary ({self.model})")
            response = litellm.completion(
                model=self.model,
                messages=[{"role": "system", "content": enriched_system_prompt}, {"role": "user", "content": prompt}],
                api_key=self.api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.info(f"| DEBUG | AnalysisAgent -> Primary Limit! Error: {str(e)}")
            logger.info(f"| DEBUG | AnalysisAgent -> Mencoba Fallback: {fallback_model}")
            logger.warning(f"RateLimit hit pada LLM Primary, mencoba fallback ke {fallback_model}...")
            if not fallback_api_key:
                logger.error("API_KEY tidak di-set. Fallback gagal.")
                raise e
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[{"role": "system", "content": enriched_system_prompt}, {"role": "user", "content": prompt}],
                    api_key=fallback_api_key
                )
                logger.info(f"| DEBUG | AnalysisAgent -> Fallback Sukses ({fallback_model})")
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| DEBUG | AnalysisAgent -> Fallback Gagal! Error: {str(fallback_e)}")
                logger.error(f"Fallback LLM gagal: {str(fallback_e)}")
                raise fallback_e
        except Exception as e:
            logger.error(f"Gagal memanggil LLM: {str(e)}")
            raise e

    def extract_claims(self, text: str, memory: Any = None) -> str:
        """Mengekstrak list klaim berdasarkan teks argumen."""
        try:
            prompt = f"Extract the claims, evidence, and logical gaps from the text below:\n\n{text}"
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Failed extracting claims: {str(e)}")
            return f"{{\"error\": \"Gagal ekstrak: {str(e)}\"}}"

    def check_logic(self, text: str, memory: Any = None) -> str:
        """Mengecek logika atas json list klaim."""
        try:
            prompt = f"Analyze and check logic for these claims to find logical fallacies:\n\n{text}"
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Failed check logic: {str(e)}")
            return f"{{\"error\": \"Gagal verif logika: {str(e)}\"}}"

    def score_argument(self, text: str, claims_input: str = "", memory: Any = None) -> str:
        """Menghitung skor evaluasi claim strength dari output list/json yang didapat."""
        try:
            prompt = f"Given original text:\n{text}\n\nAnd extracted claims:\n{claims_input}\n\nRate the argument strength and return feedback."
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Failed getting argment score: {str(e)}")
            return f"{{\"error\": \"{str(e)}\"}}"

    def check_coherence(self, text: str, memory: Any = None) -> str:
        """Mengevaluasi transisi dan koherensi topik antar paragraf minimal 3 paragraf."""
        try:
            paragraphs = [p for p in text.split('\n') if p.strip()]
            if len(paragraphs) < 3:
                return '{"error": "Teks terlalu pendek untuk dianalisis koherensinya (minimal 3 paragraf)."}'
                
            prompt = f"Check coherence of transitions between these paragraphs:\n\n{text}\n\nReturn JSON output."
            # Dummy JSON LLM
            return self._call_llm(prompt, memory=memory)
        except Exception as e:
            logger.error(f"Failed checking coherence: {str(e)}")
            return f"{{\"error\": \"{str(e)}\"}}"

    def score_thesis_quality(self, text: str, memory: Any = None) -> str:
        """Melakukan penilaian komprehensif kualitas standar S1/S2/S3 text."""
        try:
            prompt = f"Score overall thesis quality across 5 dimensions formatting in JSON:\n\n{text}"
            return self._call_llm(prompt, memory=memory) 
        except Exception as e:
            logger.error(f"Failed scoring thesis sections: {str(e)}")
            return f'{{"error": "{str(e)}" }}'

    def run_tool(self, tool_name: str, input_data: Any, params: Dict[str, Any], memory: Any = None, **kwargs) -> Any:
        """
        Method interface pengeksekusi Plan Executor untuk Analysis Agent.
        """
        tools_map = {
            "extract_claims": self.extract_claims,
            "check_logic": self.check_logic,
            "score_argument": self.score_argument,
            "check_coherence": self.check_coherence,
            "score_thesis_quality": self.score_thesis_quality
        }
        
        if tool_name not in tools_map:
            raise ValueError(f"Tool {tool_name} tidak disediakan oleh Analysis Agent")
            
        try:
            func = tools_map[tool_name]
            
            # Map parameters logic dependensi
            if tool_name in ["extract_claims", "check_logic", "check_coherence", "score_thesis_quality"]:
                return func(text=input_data, memory=memory)
            elif tool_name == "score_argument":
                # For score_argument user input goes to text, step dependencies go to kwargs
                claims = params.get("claims_input", "") 
                return func(text=input_data, claims_input=claims, memory=memory)
                
        except Exception as e:
            logger.error(f"Error eksekusi tool analysis {tool_name}: {str(e)}")
            return f"{{\"error\": \"{str(e)}\"}}"
