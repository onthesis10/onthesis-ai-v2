from typing import Dict

class ToneController:
    """
    Manages Tone & Style profiles for academic writing.
    """
    
    TONE_PROFILES = {
        "S1": "moderate complexity, focused on descriptive and procedural analysis.",
        "S2": "analytical, critical, and synthesis-oriented.",
        "S3": "high theoretical depth, novelty-driven, and philosophical."
    }
    
    MODIFIERS = {
        "academic": "Use formal, objective, and third-person perspective.",
        "persuasive": "Use argumentative structure with strong evidence backing.",
        "didactic": "Use explanatory style suitable for teaching or guidance."
    }

    @classmethod
    def get_system_instruction(cls, level: str = "S1", tone: str = "academic") -> str:
        """
        Returns the system prompt instruction for the given level and tone.
        """
        level_instruction = cls.TONE_PROFILES.get(level, cls.TONE_PROFILES["S1"])
        tone_instruction = cls.MODIFIERS.get(tone, cls.MODIFIERS["academic"])
        
        return (
            f"TONE INSTRUCTION:\n"
            f"- Academic Level: {level} ({level_instruction})\n"
            f"- Style: {tone_instruction}\n"
            f"- STRICT RULE: Avoid non-academic filler words."
        )
