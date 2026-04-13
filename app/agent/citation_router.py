"""
Citation Workflow — 3 Lane

LANE 1 — format_citation
  Intent  : 'format_citation', 'format_reference'
  Handler : writing_agent.format_citation()
  Kapan   : user minta format referensi, atau post-generate cleanup

LANE 2 — check_missing_citations
  Intent  : 'validate_citations', 'check_citations', 'missing_citation'
  Handler : chapter_skills.validate_citations()
  Kapan   : cek klaim dalam paragraf yang belum punya sitasi

LANE 3 — verify_citation_accuracy
  Intent  : 'verify_citations', 'citation_hallucination', 'fact_check_citation'
  Handler : diagnostic_agent.verify_citations()
  Kapan   : verifikasi sitasi tidak hallucinate / match paper asli
"""

CITATION_LANE_MAP = {
    # Lane 1
    "format_citation": "lane_1_format",
    "format_reference": "lane_1_format",
    "citation_format": "lane_1_format",
    # Lane 2
    "validate_citations": "lane_2_missing_check",
    "check_citations": "lane_2_missing_check",
    "missing_citation": "lane_2_missing_check",
    # Lane 3
    "verify_citations": "lane_3_accuracy_verify",
    "citation_hallucination": "lane_3_accuracy_verify",
    "fact_check_citation": "lane_3_accuracy_verify",
}

LANE_HANDLERS = {
    "lane_1_format": "writing_agent.format_citation",
    "lane_2_missing_check": "chapter_skills.validate_citations",
    "lane_3_accuracy_verify": "diagnostic_agent.verify_citations",
}


def route(intent: str) -> str:
    """Return lane key. Default lane_2 kalau intent tidak dikenal."""
    return CITATION_LANE_MAP.get(intent, "lane_2_missing_check")


def get_handler(intent: str) -> str:
    """Return the handler string for a given citation intent."""
    lane = route(intent)
    return LANE_HANDLERS[lane]
