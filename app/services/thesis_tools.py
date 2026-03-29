"""
thesis_tools.py — Tool Definitions & Executor for Thesis Agent (Sprint 4)
Defines THESIS_TOOLS schema for LLM function-calling and executes tool calls.
Tools produce pending diffs that the frontend visualizes via EditorDiffBridge.
"""

import time
import uuid
import logging

logger = logging.getLogger(__name__)

DEPRECATED_THESIS_TOOLS = {"read_chapter", "edit_paragraph", "insert_paragraph"}

# ─── Tool Schemas (litellm/OpenAI function-calling format) ───

THESIS_TOOLS = [
    # DEPRECATED: superseded by read_editor_context / suggest_* (task_planner.py)
    {
        "type": "function",
        "function": {
            "name": "read_chapter",
            "description": "Baca konten chapter atau paragraf tertentu dari tesis yang sedang aktif. Gunakan ini untuk memahami konteks sebelum mengedit.",
            "parameters": {
                "type": "object",
                "properties": {
                    "mode": {
                        "type": "string",
                        "enum": ["full", "summary", "range"],
                        "description": "Mode pembacaan: 'full' untuk semua paragraf, 'summary' untuk ringkasan, 'range' untuk paragraf tertentu"
                    },
                    "para_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Daftar paragraph_id yang ingin dibaca. Contoh: ['P-1a2b3c', 'P-9x8y7z']"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_references",
            "description": "Cari referensi yang relevan dari daftar referensi proyek tesis. Gunakan untuk menemukan sitasi yang mendukung argumen.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Kata kunci pencarian referensi"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Jumlah maksimal referensi yang dicari. HARUS BERUPA ANGKA INTEGER, BUKAN STRING (contoh: 5)."
                    }
                },
                "required": ["query"]
            }
        }
    }
]

# ─── V2 Tool Schemas (Phase 1, 2, 4) ───

V2_TOOLS = [
    # ── Phase 1: Editor Agent ──
    {
        "type": "function",
        "function": {
            "name": "suggest_replace_text",
            "description": "[Editor] Mengganti konten paragraf berdasarkan ID. Diwajibkan referensi ke ID asli dari daftar paragraf aktif.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_paragraph_id": {"type": "string", "description": "ID paragraf yang diganti (HARUS berasal dari daftar paragraf aktif, jangan mengarang)"},
                    "new_markdown": {"type": "string", "description": "Konten pengganti format markdown"},
                    "reason": {"type": "string", "description": "Alasan perubahan"}
                },
                "required": ["target_paragraph_id", "new_markdown"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_insert_text",
            "description": "[Editor] Menyisipkan paragraf baru sebelum atau sesudah paragraf yang sudah ada.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_paragraph_id": {"type": "string", "description": "ID paragraf anchor tempat menyisipkan (HARUS dari daftar paragraf aktif)"},
                    "new_markdown": {"type": "string", "description": "Konten paragraf baru"},
                    "reason": {"type": "string", "description": "Alasan penyisipan"},
                    "position": {
                        "type": "string", 
                        "enum": ["before", "after"],
                        "description": "Posisi penyisipan (sebelum atau sesudah anchor ID)"
                    }
                },
                "required": ["target_paragraph_id", "new_markdown"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "suggest_delete_text",
            "description": "[Editor] Menghapus suatu paragraf dari editor.",
            "parameters": {
                "type": "object",
                "properties": {
                    "target_paragraph_id": {"type": "string", "description": "ID paragraf yang dihapus (HARUS dari daftar paragraf aktif)"},
                    "reason": {"type": "string", "description": "Alasan penghapusan"}
                },
                "required": ["target_paragraph_id"]
            }
        }
    },
    # ── Phase 2: Chapter Skills ──
    {
        "type": "function",
        "function": {
            "name": "formulate_research_gap",
            "description": "[Bab 1] Membangun paragraf yang mengidentifikasi kelemahan penelitian terdahulu dan merumuskan research gap.",
            "parameters": {
                "type": "object",
                "properties": {
                    "topic": {"type": "string", "description": "Topik penelitian utama"},
                    "literature_summary": {"type": "string", "description": "Ringkasan literatur terkait (opsional)"}
                },
                "required": ["topic"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "align_rq_with_objectives",
            "description": "[Bab 1] Memeriksa keselarasan antara Rumusan Masalah dan Tujuan Penelitian.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Teks Bab 1 yang berisi RQ dan Tujuan"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_literature_matrix",
            "description": "[Bab 2] Mengubah data paper menjadi tabel komparasi Markdown (Penulis, Metode, Temuan, Limitasi).",
            "parameters": {
                "type": "object",
                "properties": {
                    "papers_json": {"type": "string", "description": "Data paper dalam format JSON string"}
                },
                "required": ["papers_json"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "synthesize_arguments",
            "description": "[Bab 2] Membuat kalimat sintesis yang menghubungkan dua paper yang berpotensi kontradiktif.",
            "parameters": {
                "type": "object",
                "properties": {
                    "paper_a": {"type": "string", "description": "Ringkasan Paper A"},
                    "paper_b": {"type": "string", "description": "Ringkasan Paper B"}
                },
                "required": ["paper_a", "paper_b"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "validate_citations",
            "description": "[Bab 2] Memeriksa apakah semua klaim dalam teks memiliki sitasi yang valid.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Teks yang akan diperiksa"},
                    "known_papers": {"type": "string", "description": "Daftar referensi yang diketahui (opsional)"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "justify_methodology",
            "description": "[Bab 3] Menulis paragraf justifikasi akademis untuk metode penelitian yang dipilih.",
            "parameters": {
                "type": "object",
                "properties": {
                    "method_name": {"type": "string", "description": "Nama metode (misal: 'Kuantitatif Survei')"},
                    "research_question": {"type": "string", "description": "Rumusan masalah (opsional)"}
                },
                "required": ["method_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_research_flowchart",
            "description": "[Bab 3] Menghasilkan diagram alur penelitian dalam format Mermaid.js.",
            "parameters": {
                "type": "object",
                "properties": {
                    "steps": {"type": "string", "description": "Langkah-langkah penelitian (pisahkan dengan newline)"}
                },
                "required": ["steps"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "interpret_data_table",
            "description": "[Bab 4] Mengekstrak narasi insight dari data mentah tanpa halusinasi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "table_data": {"type": "string", "description": "Data hasil penelitian (tabel/angka)"}
                },
                "required": ["table_data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "correlate_with_bab2",
            "description": "[Bab 4] Menghubungkan temuan Bab 4 dengan teori di Bab 2.",
            "parameters": {
                "type": "object",
                "properties": {
                    "finding": {"type": "string", "description": "Temuan dari Bab 4"},
                    "literature_summary": {"type": "string", "description": "Ringkasan tinjauan pustaka Bab 2"}
                },
                "required": ["finding"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "summarize_to_rq",
            "description": "[Bab 5] Mengekstrak kesimpulan dari Bab 4 yang hanya menjawab rumusan masalah.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bab4_text": {"type": "string", "description": "Teks Bab 4"},
                    "research_questions": {"type": "string", "description": "Rumusan masalah"}
                },
                "required": ["bab4_text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "draft_limitations_and_future_work",
            "description": "[Bab 5] Mengidentifikasi keterbatasan metode dan merumuskan saran penelitian selanjutnya.",
            "parameters": {
                "type": "object",
                "properties": {
                    "methodology_text": {"type": "string", "description": "Teks metodologi dari Bab 3"}
                },
                "required": ["methodology_text"]
            }
        }
    },
    # ── Phase 4: Diagnostic Tools ──
    {
        "type": "function",
        "function": {
            "name": "analyze_for_missing_citations",
            "description": "[Diagnostik] Memindai teks untuk menemukan klaim tanpa sitasi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Teks yang akan dipindai"}
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_golden_thread",
            "description": "[Diagnostik] Memeriksa koherensi benang merah antar bab (RQ→Temuan→Kesimpulan).",
            "parameters": {
                "type": "object",
                "properties": {
                    "bab1_rq": {"type": "string", "description": "Rumusan masalah dari Bab 1"},
                    "bab4_findings": {"type": "string", "description": "Temuan utama dari Bab 4"},
                    "bab5_conclusion": {"type": "string", "description": "Kesimpulan dari Bab 5"}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "flag_missing_citation",
            "description": "[Diagnostik] Menandai paragraf yang memiliki klaim kuat tanpa sitasi.",
            "parameters": {
                "type": "object",
                "properties": {
                    "paragraph_id": {"type": "string", "description": "ID paragraf"},
                    "claim_text": {"type": "string", "description": "Teks klaim yang butuh referensi"}
                },
                "required": ["paragraph_id", "claim_text"]
            }
        }
    }
]

# Merged tools list for supervisor prompt
ALL_THESIS_TOOLS = THESIS_TOOLS + V2_TOOLS


def execute_tool(tool_name: str, tool_input: dict, context: dict) -> dict:
    """
    Execute a thesis tool and return the result.
    
    Args:
        tool_name: Name of the tool to execute
        tool_input: Arguments for the tool
        context: Request context containing paragraphs, references, etc.
        
    Returns:
        dict with tool result (may include a 'diff' key for pending diffs)
    """
    paragraphs = context.get("active_paragraphs", [])
    references_text = context.get("references_text", "")
    references_raw = context.get("references_raw", [])

    if tool_name in DEPRECATED_THESIS_TOOLS:
        logger.warning("Deprecated tool called: %s — migrate to suggest_*", tool_name)

    if tool_name == "read_chapter":
        return _read_chapter(tool_input, paragraphs)
    elif tool_name == "edit_paragraph":
        return _edit_paragraph(tool_input, paragraphs)
    elif tool_name == "insert_paragraph":
        return _insert_paragraph(tool_input)
    elif tool_name == "delete_paragraph":
        return _delete_paragraph(tool_input, paragraphs)
    elif tool_name == "search_references":
        return _search_references(tool_input, references_text, references_raw)
    else:
        # Route to V2 agents if not a base tool
        return _route_v2_tool(tool_name, tool_input, context)


def _read_chapter(args: dict, paragraphs: list) -> dict:
    """Read paragraphs from the active chapter.

    # DEPRECATED: superseded by read_editor_context / suggest_* (task_planner.py)
    """
    mode = args.get("mode", "full")
    para_ids = args.get("para_ids", [])

    if not paragraphs:
        return {
            "paragraphs": [],
            "message": "Tidak ada paragraf yang tersedia di chapter aktif. Pastikan user sedang membuka sebuah bab."
        }

    if mode == "range" and para_ids:
        filtered = [p for p in paragraphs if p.get("paraId") in para_ids]
        return {"paragraphs": filtered, "total": len(paragraphs)}

    if mode == "summary":
        summary_paras = []
        for p in paragraphs[:10]:  # type: ignore # Cap at 10 for summary
            content = p.get("content", "")
            truncated = content[:150] + "..." if len(content) > 150 else content
            summary_paras.append({"paraId": p.get("paraId"), "preview": truncated})
        return {"paragraphs": summary_paras, "total": len(paragraphs)}

    # Full mode — return all paragraphs
    return {"paragraphs": paragraphs, "total": len(paragraphs)}


def _edit_paragraph(args: dict, paragraphs: list) -> dict:
    """Create a pending edit diff for a paragraph.

    # DEPRECATED: superseded by read_editor_context / suggest_* (task_planner.py)
    """
    para_id = args.get("para_id", "")
    new_content = args.get("new_content", "")
    reason = args.get("reason", "")

    if not para_id or not new_content:
        return {"error": "para_id and new_content are required"}

    # Find the original content
    before = ""
    for p in paragraphs:
        if p.get("paraId") == para_id:
            before = p.get("content", "")
            break

    diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"  # type: ignore

    return {
        "success": True,
        "diff": {
            "diffId": diff_id,
            "type": "edit",
            "paraId": para_id,
            "before": before,
            "after": new_content,
            "reason": reason,
        }
    }


def _insert_paragraph(args: dict) -> dict:
    """Create a pending insert diff.

    # DEPRECATED: superseded by read_editor_context / suggest_* (task_planner.py)
    """
    anchor_id = args.get("anchor_id", "")
    content = args.get("content", "")
    reason = args.get("reason", "")

    if not anchor_id or not content:
        return {"error": "anchor_id and content are required"}

    diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"  # type: ignore
    new_para_id = f"P-{uuid.uuid4().hex[:6]}"  # type: ignore

    return {
        "success": True,
        "diff": {
            "diffId": diff_id,
            "type": "insert",
            "paraId": new_para_id,
            "anchorId": anchor_id,
            "position": "after",
            "after": content,
            "reason": reason,
        }
    }


def _delete_paragraph(args: dict, paragraphs: list) -> dict:
    """Create a pending delete diff."""
    para_id = args.get("para_id", "")
    reason = args.get("reason", "")

    if not para_id:
        return {"error": "para_id is required"}

    # Find original content
    before = ""
    for p in paragraphs:
        if p.get("paraId") == para_id:
            before = p.get("content", "")
            break

    diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"  # type: ignore

    return {
        "success": True,
        "diff": {
            "diffId": diff_id,
            "type": "delete",
            "paraId": para_id,
            "before": before,
            "reason": reason,
        }
    }


def _search_references(args: dict, references_text: str, references_raw: list) -> dict:
    """Search project references by keyword."""
    query = args.get("query", "").lower()
    limit = args.get("limit", 5)

    if not query:
        return {"error": "query is required"}

    # Translate query to English to match English abstracts/titles
    import litellm  # type: ignore
    original_query = query
    english_query = query
    try:
        prompt = f"Translate this academic search query to English. Return only the translated query, nothing else:\n{query}"
        resp = litellm.completion(
            model="groq/llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )
        english_query = resp.choices[0].message.content.strip()
        if english_query.startswith('"') and english_query.endswith('"'):
            english_query = english_query[1:-1]
        
        # Remove trailing punctuation that might break string matching
        english_query = english_query.replace(".", "").replace("?", "").replace("!", "")
        
        print(f"[TRANSLATE - THESIS TOOLS] \"{original_query}\" -> \"{english_query}\"")
        query = english_query.lower()
    except Exception as e:
        print(f"Translation error: {e}")

    # Search in raw references list if available
    if references_raw:
        matched = []
        for ref in references_raw:
            searchable = " ".join([
                str(ref.get("title", "")),
                str(ref.get("author", "")),
                str(ref.get("authors", "")),
                str(ref.get("citation", "")),
                str(ref.get("abstract", "")),
            ]).lower()
            if query in searchable:
                matched.append(ref)
        return {"references": matched[:limit], "total_matched": len(matched)}  # type: ignore

    # Fallback: search in pre-built references text
    if references_text:
        lines = references_text.strip().split("\n")
        matched = [line for line in lines if query in line.lower()]
        return {"references_text": "\n".join(matched[:limit]), "total_matched": len(matched)}  # type: ignore

    return {"references": [], "message": "Tidak ada referensi tersedia di proyek ini."}


# ─── V2 Tool Routing ───

# Map V2 tool names → (agent_module, agent_class)
_V2_TOOL_AGENT_MAP = {
    # Editor Agent (Phase 1)
    "suggest_replace_text": "editor_agent",
    "suggest_insert_text": "editor_agent",
    "suggest_delete_text": "editor_agent",
    "flag_missing_citation": "editor_agent",
    # Chapter Skills Agent (Phase 2)
    "formulate_research_gap": "chapter_skills_agent",
    "align_rq_with_objectives": "chapter_skills_agent",
    "generate_literature_matrix": "chapter_skills_agent",
    "synthesize_arguments": "chapter_skills_agent",
    "validate_citations": "chapter_skills_agent",
    "justify_methodology": "chapter_skills_agent",
    "generate_research_flowchart": "chapter_skills_agent",
    "interpret_data_table": "chapter_skills_agent",
    "correlate_with_bab2": "chapter_skills_agent",
    "summarize_to_rq": "chapter_skills_agent",
    "draft_limitations_and_future_work": "chapter_skills_agent",
    # Diagnostic Agent (Phase 4)
    "analyze_for_missing_citations": "diagnostic_agent",
    "check_golden_thread": "diagnostic_agent",
    "auto_flag_claims": "diagnostic_agent",
}

def _route_v2_tool(tool_name: str, tool_input: dict, context: dict) -> dict:
    """Route V2 tools to their respective agent instances."""
    agent_key = _V2_TOOL_AGENT_MAP.get(tool_name)
    if not agent_key:
        return {"error": f"Unknown tool: {tool_name}"}

    try:
        from app.agent.agent_registry import AgentRegistry
        registry = AgentRegistry()
        agent = registry.get_agent(agent_key)
        return agent.run_tool(
            tool_name=tool_name,
            input_data=tool_input,
            params=tool_input,
            memory=None,
            context=context,
        )
    except Exception as e:
        logger.error(f"V2 tool routing error for '{tool_name}': {e}")
        return {"error": str(e)}
