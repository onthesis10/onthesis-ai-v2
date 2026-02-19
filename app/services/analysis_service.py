# File: app/services/analysis_service.py

import logging
import traceback
import re
from typing import Dict, Any, List, Optional, Union

from app import firestore_db
from app.utils import stats_utils, general_utils
from app.utils.data_engine import OnThesisDataset

# Import Service AI (Pastikan file ai_service.py sudah diupdate dgn fitur interpret_statistics)
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)

class AnalysisService:
    """
    Service terpusat untuk segala jenis analisis data:
    1. Analisis Statistik (SPSS-like) + AI Narrative
    2. Data Preparation
    3. Analisis Teks
    """

    # Mapping string request ke fungsi di stats_utils
    ANALYSIS_MAP = {
        'descriptive-analysis': stats_utils.run_descriptive_analysis,
        'normality': stats_utils.run_normality_test,
        'independent-ttest': stats_utils.run_independent_ttest,
        'paired-ttest': stats_utils.run_paired_ttest,
        'oneway-anova': stats_utils.run_oneway_anova,
        'correlation-analysis': stats_utils.run_correlation,
        'linear-regression': stats_utils.run_linear_regression,
        'mann-whitney': stats_utils.run_mann_whitney,
        'kruskal-wallis': stats_utils.run_kruskal_wallis,
        'wilcoxon': stats_utils.run_wilcoxon,
        'reliability': stats_utils.run_reliability_analysis,
        'validity': stats_utils.run_validity_analysis,
        'chi-square': stats_utils.run_chi_square
    }

    # ==========================================
    # 1. ANALISIS STATISTIK (CORE)
    # ==========================================
    @staticmethod
    def execute_analysis(user, analysis_type: str, params: dict) -> Dict[str, Any]:
        """
        Menjalankan analisis statistik DAN meminta interpretasi AI.
        """
        # DEBUG LOG: Tanda mulai
        print(f"\n🚀 [START] Analysis Request: {analysis_type}")
        
        # 1. Validasi Tipe Analisis
        func_to_run = AnalysisService.ANALYSIS_MAP.get(analysis_type)
        if not func_to_run:
            raise ValueError(f"Analisis '{analysis_type}' belum didukung oleh sistem.")

        # 2. Load Dataset User
        dataset = OnThesisDataset.load(user.id)
        if not dataset or dataset.df.empty:
            raise FileNotFoundError("Dataset kosong. Harap upload atau import data terlebih dahulu.")


        try:
            # 2.A DEBUG: Cek Kolom Tersedia
            print(f"📋 [DEBUG] Available Columns: {dataset.df.columns.tolist()}")
            
            # 2.B Validation: Ensure requested variables exist
            # FATAL FIX: API Request often sends raw names (e.g., "Medsos Use"), 
            # but Dataset Engine stores them as normalized (e.g., "MEDSOS_USE").
            # We must normalize the request BEFORE checking or passing to stats_utils.
            
            req_vars = params.get('variables', [])
            if req_vars:
                # Normalize Params First
                normalized_vars = [re.sub(r'\s+', '_', str(v)).upper().strip() for v in req_vars]
                params['variables'] = normalized_vars # Update params for stats_utils
                
                # Check against dataset columns (which are already normalized)
                missing = [v for v in normalized_vars if v not in dataset.df.columns]
                if missing:
                    error_msg = f"Variabel tidak ditemukan: {', '.join(missing)}. Mohon 'Simpan Project' atau Refresh halaman."
                    print(f"❌ [ERROR] {error_msg}")
                    raise ValueError(error_msg)

            # 3. Eksekusi Fungsi Statistik (MATH)
            print("📊 [PROCESS] Calculating Statistics...")
            
            # Note: stats_utils accepts (dataset, params) and handles parsing internally via _get_vars()
            # This unified call works for ALL analysis types (Descriptive, T-Test, ANOVA, etc.)
            raw_result = func_to_run(dataset, params)
            
            # --- NORMALISASI RESULT (Agar konsisten jadi Dictionary) ---
            result = {}
            if isinstance(raw_result, list):
                result = { "summary_table": raw_result }
            elif isinstance(raw_result, dict):
                result = raw_result
            else:
                result = { "summary_table": [], "raw": str(raw_result) }

            # 4. [AI Enrichment] PANGGIL AI (THE MAGIC)
            print("🤖 [PROCESS] Calling AI Service for Narrative...")
            try:
                # Ambil data ringkas untuk dikirim ke AI
                stats_for_ai = result.get('summary_table', result)
                vars_used = params.get('variables', [])

                # Panggil AI Service
                narrative = AIService.interpret_statistics(
                    analysis_type=analysis_type,
                    stats_result=stats_for_ai,
                    variables=vars_used
                )

                if narrative:
                    print(f"✅ [SUCCESS] AI Narrative Generated ({len(narrative)} chars)")
                    result['ai_narrative_summary'] = narrative
                else:
                    print("⚠️ [WARNING] AI return empty string.")
                    # Fallback ke logic lama jika AI gagal
                    result = AnalysisService._enrich_with_ai_context(result, analysis_type)

            except Exception as ai_e:
                print(f"❌ [ERROR] AI Service Failed: {str(ai_e)}")
                # Fallback ke logic lama jika error
                result = AnalysisService._enrich_with_ai_context(result, analysis_type)
            
            # 5. Simpan Log ke History Dataset
            if hasattr(dataset, 'add_analysis_log'):
                dataset.add_analysis_log(analysis_type, result, params)
            
            # 6. Log Aktivitas User
            general_utils.log_user_activity(
                firestore_db, 
                user.id, 
                'analysis', 
                {'type': analysis_type}
            )

            print("🏁 [DONE] Analysis Complete.\n")
            return result

        except Exception as e:
            logger.error(f"Error executing {analysis_type}: {str(e)}")
            logger.error(traceback.format_exc())
            raise e

    # ==========================================
    # 2. DATA PREPARATION & CLEANING
    # ==========================================
    @staticmethod
    def perform_data_preparation(user_id: str, action_type: str, params: dict) -> Dict[str, str]:
        """
        Menangani operasi cleaning: Missing Values, Remove Duplicates, Find & Replace.
        """
        dataset = OnThesisDataset.load(user_id)
        if not dataset:
            raise FileNotFoundError("Dataset tidak ditemukan.")

        success, message = False, "Aksi tidak dikenali."

        try:
            if action_type == 'missing_values':
                success, message = dataset.handle_missing_values(
                    params.get('action'), params.get('target_columns')
                )
            elif action_type == 'remove_duplicates':
                success, message = dataset.remove_duplicates(params.get('target_columns'))
            elif action_type == 'find_replace':
                success, message = dataset.find_and_replace(
                    params.get('find'), params.get('replace'), 
                    params.get('target_columns'), params.get('exact_match', False)
                )
            else:
                raise ValueError(f"Unknown preparation action: {action_type}")
            
            return {'status': 'success' if success else 'error', 'message': message}
            
        except Exception as e:
            logger.error(f"Data Prep Error: {e}")
    @staticmethod
    def recode_variable(user_id: str, variable: str, mapping: dict) -> Dict[str, Any]:
        """
        Recode variabel (Map Text -> Angka/Text lain).
        """
        dataset = OnThesisDataset.load(user_id)
        if not dataset: raise FileNotFoundError("Dataset not found.")
        
        # Normalize Variable Name (Critical Fix)
        if variable:
            variable = re.sub(r'\s+', '_', str(variable)).upper().strip()
            
        print(f"🔄 [RECODE] Request: {variable} | Cols: {dataset.df.columns.tolist()[:5]}...")
        
        success, msg = dataset.recode_variable(variable, mapping, convert_to_numeric=True)
        return {'status': 'success' if success else 'error', 'message': msg}
            
    # ==========================================
    # 3. TEKS ANALISIS (STYLE DNA & METRICS)
    # ==========================================
    @staticmethod
    def analyze_text_comprehensive(text: str) -> Dict[str, Any]:
        """
        Menganalisis kualitas teks: Readability, Tone, dan Struktur.
        """
        if not text or len(text.strip()) < 5:
            return {
                "status": "empty",
                "message": "Teks terlalu pendek untuk dianalisis."
            }

        word_count = len(re.findall(r'\w+', text))
        readability = AnalysisService._calculate_readability(text)
        tone_data = AnalysisService._analyze_tone(text)

        suggestions = []
        sentences = re.split(r'[.!?]+', text)
        long_sentences = [s for s in sentences if len(s.split()) > 35]
        
        if long_sentences:
            suggestions.append({
                "type": "clarity",
                "severity": "medium",
                "text": f"Ditemukan {len(long_sentences)} kalimat yang sangat panjang (>35 kata).",
                "context": long_sentences[0].strip()[:60] + "..."
            })
        
        if tone_data['formality'] < 40 and word_count > 100:
             suggestions.append({
                "type": "tone",
                "severity": "info",
                "text": "Gaya penulisan terdeteksi santai. Gunakan bahasa yang lebih baku.",
                "context": "Skor Formalitas: Rendah"
            })

        return {
            "status": "success",
            "meta": {
                "word_count": word_count,
                "estimated_read_time": f"{max(1, word_count // 200)} menit"
            },
            "metrics": {
                "readability": readability,
                "tone": tone_data,
                "structure": {"paragraph_count": text.count('\n\n') + 1}
            },
            "suggestions": suggestions
        }

    @staticmethod
    def _calculate_readability(text: str) -> Dict[str, Any]:
        if not text: return {"score": 0, "level": "N/A"}
        sentences = [s for s in re.split(r'[.!?]+', text) if s.strip()]
        words = re.findall(r'\w+', text)
        num_sentences = len(sentences) or 1
        num_words = len(words) or 1
        avg_wps = num_words / num_sentences
        score = max(0, min(100, 100 - (avg_wps * 1.5)))
        level = "Sulit"
        if score > 80: level = "Sangat Mudah"
        elif score > 60: level = "Mudah"
        elif score > 40: level = "Sedang"
        elif score > 20: level = "Agak Sulit"
        return {"score": round(score, 1), "level": level}

    @staticmethod
    def _analyze_tone(text: str) -> Dict[str, float]:
        text_lower = text.lower()
        formal_indicators = ['oleh karena itu', 'namun', 'selanjutnya', 'berdasarkan', 'signifikan', 'analisis', 'penelitian']
        casual_indicators = ['gimana', 'nggak', 'bikin', 'kayak', 'banget', 'sih', 'dong']
        formal_count = sum(1 for w in formal_indicators if w in text_lower)
        casual_count = sum(1 for w in casual_indicators if w in text_lower)
        total = formal_count + casual_count or 1
        formality_score = 70.0 if formal_count == 0 and casual_count == 0 else (formal_count / total) * 100
        return {"formality": round(formality_score, 1), "positivity": 75.0}

    # ==========================================
    # 4. HELPER: FALLBACK NARRATIVE (JIKA AI GAGAL)
    # ==========================================
    @staticmethod
    def _enrich_with_ai_context(result: Union[Dict, List], analysis_type: str) -> Dict[str, Any]:
        """
        Fallback logic: Membuat narasi sederhana jika AI service tidak merespon.
        """
        # Pastikan result bentuknya dict
        if isinstance(result, list): result = {'details': result}
        if not isinstance(result, dict): return result 

        try:
            narrative_hints = []
            def get_sig(data):
                return data.get('sig') or data.get('sig_2tailed') or data.get('p_value') or data.get('significance')

            if analysis_type == 'correlation-analysis':
                matrix = result.get('matrix', result)
                max_r = 0
                if isinstance(matrix, dict):
                    for v1, row in matrix.items():
                        if not isinstance(row, dict): continue
                        for v2, cell in row.items():
                            if v1 == v2: continue
                            r_val = abs(float(cell.get('r', 0) if isinstance(cell, dict) else 0))
                            if r_val > max_r: max_r = r_val
                    if max_r > 0: narrative_hints.append(f"Korelasi terkuat: r={max_r:.3f}.")

            elif analysis_type in ['oneway-anova', 'kruskal-wallis']:
                sig = get_sig(result)
                if sig: narrative_hints.append(f"Signifikansi (p) = {sig}.")

            if not narrative_hints:
                narrative_hints.append("Analisis statistik selesai.")

            result['ai_narrative_summary'] = " ".join(narrative_hints)
            return result

        except Exception:
            return result