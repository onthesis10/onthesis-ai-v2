import sys

def fix_analysis_agent():
    filepath = r'app\agent\analysis_agent.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_method = """    def score_thesis_quality(self, text: str) -> str:
        \"\"\"Melakukan penilaian komprehensif kualitas standar S1/S2/S3 text.\"\"\"
        try:
            prompt = f"Score overall thesis quality across 5 dimensions formatting in JSON:\\n\\n{text}"
            # Simulasi output
            dummy_score_json = \"\"\"
            {
              "scores": {
                "clarity": 8, "argument": 6, "academic_tone": 7, "structure": 8, "originality": 5
              },
              "overall": 6.8,
              "strengths": ["Paragraf awal tertata transisinya.", "Menggunakan kosakata metodologi standard."],
              "improvements": ["Lebih tajamkan literatur pendukung klaim paragraf 3.", "Kurangi redudansi sitasi tua."]
            }
            \"\"\"
            return dummy_score_json.strip()
            # return self._call_llm(prompt) 
        except Exception as e:
            logger.error(f"Failed scoring thesis sections: {str(e)}")
            return f"{{\\"error\\": \\"{str(e)}\\"}}"
"""
    new_method = """    def score_thesis_quality(self, text: str) -> str:
        \"\"\"Melakukan penilaian komprehensif kualitas standar S1/S2/S3 text.\"\"\"
        try:
            prompt = f"Score overall thesis quality across 5 dimensions formatting in JSON:\\n\\n{text}"
            return self._call_llm(prompt) 
        except Exception as e:
            logger.error(f"Failed scoring thesis sections: {str(e)}")
            return f'{{"error": "{str(e)}" }}'
"""

    if old_method in content:
        content = content.replace(old_method, new_method)
    elif old_method.replace('\n', '\r\n') in content:
        content = content.replace(old_method.replace('\n', '\r\n'), new_method.replace('\n', '\r\n'))
    else:
        print("analysis_agent old_method not found")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed analysis_agent.py")

def fix_plan_executor():
    filepath = r'app\agent\plan_executor.py'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_block = """                # Autosave search results to ResearchMemory
                if step.tool == "search_papers" and self.memory and hasattr(self.memory, 'research'):
                    self.memory.research.add_papers(result)
                    
            except Timeout:"""

    new_block = """                # Autosave search results to ResearchMemory
                if step.tool == "search_papers" and self.memory and hasattr(self.memory, 'research'):
                    self.memory.research.add_papers(result)
                
                # --- PHASE 3.2: SELF-EVALUATION LOOP ---
                if step.agent == "writing_agent" and step.tool in ["rewrite_text", "paraphrase_text", "expand_paragraph", "generate_literature_review"]:
                    analysis_agent = self.agents.get("analysis_agent")
                    if analysis_agent:
                        self._emit("STEP", {"step": "evaluating", "message": f"Mengevaluasi {step.tool}..."})
                        logger.info(f"Menjalankan self-evaluation loop untuk hasil {step.tool}")
                        try:
                            score_json_str = analysis_agent.score_thesis_quality(result)
                            import json
                            import re
                            # Clean markdown if generated
                            clean_json = re.sub(r'```(?:json)?\\s*|\\s*```', '', score_json_str).strip()
                            score_data = json.loads(clean_json)
                            # Threshold 7.0 for overall score
                            if float(score_data.get("overall", 10.0)) < 7.0:
                                improvements_list = score_data.get("improvements", ["Kualitas kurang akademis"])
                                improvements = ", ".join(improvements_list)
                                self._emit("STEP", {"step": "revising", "message": f"Kritik: {improvements} - Sedang merevisi..."})
                                logger.info(f"Self-evaluation score < 7.0 ({score_data.get('overall')}). Revising... Kritik: {improvements}")
                                
                                # Instruct WritingAgent to revise its own text based on critique
                                revise_prompt = (
                                    f"Teks yang dihasilkan sebelumnya dinilai masih kurang baik oleh Analysis Agent. Kritik:\\n{improvements}\\n\\n"
                                    f"Teks sumber (jika ada): {input_data}\\n\\n"
                                    f"Hasil tulisanmu sebelumnya: {result}\\n\\n"
                                    f"Tolong perbaiki hasil tulisanmu dengan memperhatikan kritik tersebut. Berikan HANYA teks yang diperbaiki, tanpa pengantar."
                                )
                                wa = self.agents.get("writing_agent")
                                revised_result = wa._call_llm(revise_prompt)
                                result = revised_result
                                self.results[step.step_id] = result
                                logger.info("Revisi selesai.")
                                self._emit("TOOL_RESULT", {
                                    "step_id": step.step_id,
                                    "agent": step.agent,
                                    "tool": step.tool + "_revised",
                                    "result": result,
                                })
                        except Exception as eval_err:
                            logger.warning(f"Self-evaluation terlewati (error/JSON invalid): {eval_err}")
                # ---------------------------------------
                    
            except Timeout:"""
            
    if old_block in content:
        content = content.replace(old_block, new_block)
    elif old_block.replace('\n', '\r\n') in content:
        content = content.replace(old_block.replace('\n', '\r\n'), new_block.replace('\n', '\r\n'))
    else:
        print("plan_executor old_block not found")
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed plan_executor.py")

if __name__ == '__main__':
    fix_analysis_agent()
    fix_plan_executor()
