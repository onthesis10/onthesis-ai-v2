# File: app/engines/adaptive_prompt.py
# Deskripsi: Adaptive Prompt Engine — adjusts generation instructions based on
# academic level (S1/S2/S3), field of study, and methodology.

def build_adaptive_prompt(graph) -> str:
    """
    Build adaptive constraints based on the project's academic level and field.
    """
    parts = []
    
    # Optional attributes in graph that could be set by the user:
    # We will assume graph might have `academic_level` and `field_of_study`
    # Default to S1 and general if not present
    level = getattr(graph, 'academic_level', 'S1').upper()
    field = getattr(graph, 'field_of_study', 'general').lower()
    
    # 1. Academic Level Instructions
    level_prompt = _get_level_prompt(level)
    if level_prompt:
        parts.append(f"[STANDAR AKADEMIK: {level}]\n{level_prompt}")
        
    # 2. Field of Study Instructions
    field_prompt = _get_field_prompt(field)
    if field_prompt:
        parts.append(f"[GAYA PENULISAN BIDANG: {field.upper()}]\n{field_prompt}")
        
    if not parts:
        return ""
        
    return "\n\n".join(parts)

def _get_level_prompt(level: str) -> str:
    if level == 'S1':
        return """- Gunakan bahasa akademis standar yang mudah dipahami.
- Fokus pada penerapan teori dan analisis yang jelas.
- Hindari jargon yang terlalu rumit kecuali diperlukan.
- Penjelasan harus runut dan logis."""
    elif level == 'S2':
        return """- Gunakan bahasa akademis tingkat lanjut (advanced academic tone).
- Harus menunjukkan kemampuan sintesis kritis dari berbagai sumber literatur.
- Analisis harus mendalam, menunjukkan korelasi kompleks antar variabel.
- Hindari pernyataan deskriptif; perbanyak argumentasi analitis."""
    elif level == 'S3':
        return """- Gunakan bahasa akademis tingkat doktoral yang sangat presisi dan teliti.
- Wajib mengeksplorasi state-of-the-art dan menyoroti kebaruan (novelty).
- Sintesis teori harus menunjukkan pemahaman filosofis metodologi.
- Argumen harus sangat ketat, kritis, dan memberikan kontribusi orisinal pada literatur."""
    return ""

def _get_field_prompt(field: str) -> str:
    if "pendidikan" in field:
        return """- Gunakan terminologi ilmu pendidikan (pedagogi, andragogi, kurikulum, asesmen).
- Fokus pada implikasi praktis terhadap pembelajaran dan peserta didik."""
    elif "teknik" in field or "komputer" in field or "informatika" in field:
        return """- Gunakan terminologi teknis yang presisi dan objektif.
- Fokus pada efisiensi, metrik kinerja, arsitektur, dan solusi sistem.
- Hindari bahasa yang berbunga-bunga; langsung pada inti teknis (concise)."""
    elif "ekonomi" in field or "bisnis" in field or "manajemen" in field:
        return """- Gunakan terminologi bisnis dan ekonomi (efisiensi, profitabilitas, kinerja manajerial).
- Hubungkan temuan dengan implikasi strategis atau praktis perusahaan/pasar."""
    elif "psikologi" in field:
        return """- Gunakan terminologi psikologi behavioral/kognitif yang tepat.
- Fokus pada dinamika konstruksi psikologis dan interpretasi perilaku manusia.
- Pastikan netralitas dalam menilai kondisi psikologis."""
    elif "kesehatan" in field or "medis" in field or "keperawatan" in field:
        return """- Gunakan terminologi medis/klinis yang sangat ketat dan objektif.
- Wajib menekankan evidance-based outcomes.
- Hindari spekulasi; semua klaim kesehatan wajib berbasis referensi kuat."""
    elif "hukum" in field:
        return """- Gunakan gaya bahasa legal formal.
- Argumen harus didasarkan pada penalaran hukum (legal reasoning), yurisprudensi, dan pasal perundang-undangan."""
    
    # Generic
    return """- Gunakan gaya penulisan ilmiah yang sesuai dengan standar publikasi jurnal akademik.
- Pertahankan objektivitas dan nada pasif dalam menjelaskan fenomena."""
