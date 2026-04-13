"""
agent.py â€” Thesis Agent API Routes
Contains:
  - POST /api/agent/chat  (legacy synchronous endpoint)
  - POST /api/agent/run   (NEW: SSE streaming endpoint for AgentPanel)
"""

import os
import json
import time
import logging
from datetime import datetime
from flask import Blueprint, request, jsonify, Response, stream_with_context  # type: ignore
from flask_login import login_required, current_user  # type: ignore
from app.agent.memory_system import QdrantVectorDB, SharedMemory, FirestoreDocumentDB, count_tokens  # type: ignore

logger = logging.getLogger(__name__)

# Setup blueprint
agent_api_bp = Blueprint('agent_api', __name__)

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# MODEL MAPPING â€” Frontend model IDs â†’ litellm model strings
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
MODEL_MAP = {
    "llama-70b":   "groq/llama-3.3-70b-versatile",
    "deepseek-r1": "groq/deepseek-r1-distill-llama-70b",
    "gemma-9b":    "groq/gemma2-9b-it",
}
FALLBACK_MODEL = "gemini/gemini-2.5-flash"
DEFAULT_MODEL_KEY = "llama-70b"

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# SYSTEM PROMPT â€” Based on onthesis-agent-prompts.md
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
AGENT_SYSTEM_PROMPT = """Kamu adalah thesis agent yang membantu user menulis tesis.
Gunakan tools yang tersedia untuk membaca, mengedit, dan mencari referensi.

IMPORTANT RULES:
1. Write in the user's language (default: Indonesian/Bahasa Indonesia).
2. Use academic formal style: avoid casual words like "guys", "banget", "nih".
3. Use passive voice for methodology: "dilakukan", "dianalisis", "diperoleh".
4. Use hedging language for claims: "menunjukkan", "mengindikasikan", "cenderung".
5. Paragraph structure: Topic sentence -> Evidence -> Analysis -> Transition.
6. Never fabricate citations. Only reference papers from the provided context.
7. After making changes, explain what you did and why.
8. If the user's request is conversational (greeting, question), respond naturally with concise text.

OUTPUT FORMAT:
After making edits, write a brief summary of changes made.
End with a suggestion for next steps:
"Langkah berikutnya: ..."
"""


def _build_context_message(context: dict) -> str:
    """Build a context injection string from the frontend context object."""
    parts = []
    
    title = context.get("context_title", "")
    if title:
        parts.append(f"Judul Tesis: {title}")
    
    problem = context.get("context_problem", "")
    if problem:
        parts.append(f"Rumusan Masalah: {problem}")
    
    method = context.get("context_method", "")
    if method:
        parts.append(f"Metodologi: {method}")
    
    # Active paragraphs summary
    paragraphs = context.get("active_paragraphs", [])
    if paragraphs:
        para_summary = []
        for p in paragraphs[:20]:  # Cap display
            pid = p.get("paraId", "?")
            content = p.get("content", "")
            preview = content[:100] + "..." if len(content) > 100 else content
            para_summary.append(f"  [{pid}] {preview}")
        parts.append(f"Paragraf Aktif ({len(paragraphs)} total):\n" + "\n".join(para_summary))
    
    # References
    refs = context.get("references_text", "")
    if refs:
        parts.append(f"Referensi Tersedia:\n{refs}")
    
    # Golden thread
    gt = context.get("golden_thread", {})
    if gt and gt.get("researchQuestion"):
        parts.append(f"Research Question: {gt['researchQuestion']}")
    
    # Chapter summaries
    ch_summaries = context.get("chapters_summary", [])
    if ch_summaries:
        ch_lines = []
        for ch in ch_summaries:
            ch_lines.append(f"  - {ch.get('title', 'Untitled')}: {ch.get('summary', 'Belum dirangkum')}")
        parts.append(f"Ringkasan Bab:\n" + "\n".join(ch_lines))
    
    if not parts:
        return ""
    
    return "=== KONTEKS TESIS ===\n" + "\n\n".join(parts) + "\n=== AKHIR KONTEKS ==="


def _build_history_session(project_id: str, turns: list[dict]) -> dict:
    title = "Chat Agent"
    updated_at = int(time.time() * 1000)

    if turns:
        first_user = next((turn for turn in turns if turn.get("role") == "user" and turn.get("content")), None)
        if first_user:
            text = str(first_user["content"]).strip()
            title = text[:50] + ("..." if len(text) > 50 else "")

        last_turn = turns[-1]
        timestamp_value = last_turn.get("timestamp")
        if isinstance(timestamp_value, str):
            try:
                updated_at = int(datetime.fromisoformat(timestamp_value.replace("Z", "+00:00")).timestamp() * 1000)
            except Exception:
                updated_at = int(time.time() * 1000)

    messages = []
    for turn in turns:
        messages.append({
            "role": turn.get("role"),
            "content": turn.get("content", ""),
            "timestamp": turn.get("timestamp"),
        })

    return {
        "id": f"project:{project_id}",
        "title": title,
        "updatedAt": updated_at,
        "createdAt": updated_at,
        "messages": messages,
    }


def _normalize_diff_payload(diff: dict) -> dict:
    if not isinstance(diff, dict):
        return {}

    diff_id = diff.get("diff_id") or diff.get("diffId") or ""
    old_text = diff.get("old_text")
    if old_text is None:
        old_text = diff.get("before", "")
    new_text = diff.get("new_text")
    if new_text is None:
        new_text = diff.get("after", "")

    normalized = dict(diff)
    normalized["diffId"] = diff_id
    normalized["diff_id"] = diff_id
    normalized["old_text"] = old_text
    normalized["new_text"] = new_text
    normalized.setdefault("before", old_text)
    normalized.setdefault("after", new_text)
    return normalized


def _should_precompute_pruned_context(task: str, context: dict) -> bool:
    task_lc = (task or "").strip().lower()
    if not task_lc:
        return False
    lightweight_messages = {
        "halo", "hai", "hi", "hello", "pagi", "siang", "sore", "malam",
        "halo agent", "hai agent", "hi agent", "hey", "ping",
    }
    if task_lc in lightweight_messages:
        return False
    if len(task_lc.split()) <= 3 and "?" not in task_lc:
        return False
    return bool(
        (context or {}).get("active_paragraphs")
        or (context or {}).get("context_problem")
        or (context or {}).get("context_title")
    )


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# NEW: POST /api/summarize-chapter
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@agent_api_bp.route('/api/summarize-chapter', methods=['POST'])
@login_required
def summarize_chapter():
    """
    Receives chapter content, generates a concise summary, and saves to Qdrant.
    """
    data = request.json
    user_id = str(current_user.id)
    project_id = data.get("projectId")
    chapter_id = data.get("chapterId")
    content = data.get("content", "")

    if not project_id or not chapter_id or not content:
        return jsonify({"error": "Missing project_id, chapter_id or content"}), 400

    try:
        import litellm  # pyre-ignore
        from litellm.exceptions import RateLimitError
        
        # Generate summary using a fast model
        summary_prompt = f"Rangkum bab tesis berikut dalam maksimal 100 kata. Fokus pada poin-poin utama saja.\n\nKONTEN:\n{content[:15000]}"
        
        try:
            response = litellm.completion(
                model="groq/llama-3.1-8b-instant", # Use fast model for summaries
                messages=[{"role": "user", "content": summary_prompt}],
                max_tokens=250,
                timeout=15,
                temperature=0.3
            )
            summary_text = response.choices[0].message.content.strip()
        except Exception as groq_err:
            logger.warning(f"Groq failed for summarize_chapter: {groq_err}, falling back to Gemini.")
            fallback_api_key = os.environ.get("GEMINI_API_KEY")
            if not fallback_api_key:
                raise Exception("Rate limit hit and GEMINI_API_KEY not set")
            response = litellm.completion(
                model="gemini/gemini-2.5-flash",
                messages=[{"role": "user", "content": summary_prompt}],
                api_key=fallback_api_key,
                max_tokens=250,
                timeout=15,
                temperature=0.3
            )
            summary_text = response.choices[0].message.content.strip()

        # Save to Qdrant
        vdb = QdrantVectorDB()
        shared_mem = SharedMemory(user_id, project_id, vdb, None)
        shared_mem.document.add_or_update_chapter_summary(shared_mem.project_scope, chapter_id, summary_text)

        return jsonify({
            "status": "success",
            "summary": summary_text
        }), 200

    except Exception as e:
        logger.error(f"Error in summarize_chapter: {e}")
        return jsonify({"error": str(e)}), 500


def _build_pruned_context(task: str, context: dict, user_id: str, project_id: str) -> str:
    """
    Builds a context string while keeping it under ~8,000 tokens.
    Priority: 1. Metadata > 2. Active Chapter > 3. Chapter Summaries > 4. Semantic Fragments.
    """
    MAX_TOKENS = 8000

    if not user_id:
        raise ValueError("_build_pruned_context requires user_id")
    if not project_id:
        raise ValueError("_build_pruned_context requires project_id")
    
    # Initialize SharedMemory
    try:
        from app.agent.memory_system import QdrantVectorDB, SharedMemory  # type: ignore
        vdb = QdrantVectorDB()
        # Mocking db for SharedMemory since we use Qdrant for active context
        shared_mem = SharedMemory(user_id, project_id, vdb, None)
    except Exception as e:
        logger.warning(f"Could not init SharedMemory: {e}")
        shared_mem = None

    parts = []
    
    # 1. Base Project Info (Highest Priority)
    parts.append(f"Judul Tesis: {context.get('context_title', 'Untitled')}")
    parts.append(f"Rumusan Masalah: {context.get('context_problem', '-')}")
    parts.append(f"Metodologi: {context.get('context_method', '-')}")
    
    # 2. Active Paragraphs
    paragraphs = context.get("active_paragraphs", [])
    if paragraphs:
        para_lines = []
        for p in paragraphs:
            para_lines.append(f"  [{p.get('paraId', '?')}] {p.get('content', '')}")
        parts.append("Bab Aktif:\n" + "\n".join(para_lines))

    # 3. Chapter Summaries
    if shared_mem:
        try:
            summaries = shared_mem.document.get_all_chapter_summaries(shared_mem.project_scope)
            if summaries:
                sum_lines = [f"  - {s['chapter_id']}: {s['summary']}" for s in summaries]
                parts.append("Ringkasan Bab Lain:\n" + "\n".join(sum_lines))
        except Exception as e:
            logger.warning(f"Failed to fetch summaries: {e}")

    # 4. Semantic Fragments (Retrieve based on current task)
    if shared_mem:
        try:
            fragments = shared_mem.document.get_relevant_context(task, shared_mem.project_scope, top_k=3)
            if fragments:
                parts.append(f"Fragmen Relevan dari Bab Lain:\n{fragments}")
        except Exception as e:
            logger.warning(f"Failed semantic retrieval: {e}")

    # 5. Token Pruning
    full_context = "=== KONTEKS TESIS ===\n" + "\n\n".join(parts) + "\n=== AKHIR KONTEKS ==="
    
    if count_tokens(full_context) <= MAX_TOKENS:
        return full_context
    
    # If over budget, we prune from fragments first, then summaries, then active chapter
    # Dynamic pruning implementation
    current_tokens = count_tokens(full_context)
    logger.info(f"Context too large ({current_tokens} tokens), pruning...")
    
    # Simple strategy: Keep only top 10 active paragraphs if still too large
    if paragraphs and len(paragraphs) > 10:
        parts[3] = "Bab Aktif (Terpotong):\n" + "\n".join([f"  [{p.get('paraId','?')}] {p.get('content','')}" for p in paragraphs[:10]])
    
    return "=== KONTEKS TESIS (TRUNCATED) ===\n" + "\n\n".join(parts) + "\n=== AKHIR KONTEKS ==="


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# REMOVED: POST /api/agent/chat (legacy synchronous endpoint)
# Was a dead endpoint â€” no frontend caller.
# All agent interactions now go through /api/agent/run (SSE).
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# NEW: POST /api/agent/run â€” SSE Streaming Endpoint
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

@agent_api_bp.route('/api/agent/run', methods=['POST', 'OPTIONS'])
@login_required
def run_agent_sse():
    """
    SSE streaming endpoint for the AgentPanel.
    Receives a task + thesis context, runs an agentic loop with tool calling,
    and streams events (STEP, TOOL_CALL, TOOL_RESULT, PENDING_DIFF, TEXT_DELTA, DONE, ERROR).
    """
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = request.headers.get('Origin', '*')
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        resp.headers['Access-Control-Allow-Credentials'] = 'true'
        return resp, 200

    data = request.json
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    # Gap 11: Use authenticated user ID for user-scoped memory
    user_id = current_user.id

    task = data.get("task", "")
    context = data.get("context", {})
    project_id = data.get("projectId", "")
    chapter_id = data.get("chapterId", "")
    messages_history = data.get("messages", [])
    model_key = data.get("model", DEFAULT_MODEL_KEY)
    mode = data.get("mode", "planning")

    if not task:
        return jsonify({"error": "Field 'task' is required"}), 400
    if not project_id:
        return jsonify({"error": "Field 'projectId' is required"}), 400

    logger.info(f"[AgentRun] user={user_id} project={project_id} task={task[:50]}")

    # Resolve LLM model
    primary_model = MODEL_MAP.get(model_key, MODEL_MAP[DEFAULT_MODEL_KEY])
    def generate():
        """SSE generator - delegates execution to SupervisorAgent and streams events."""
        from gevent import spawn  # type: ignore
        from gevent.queue import Queue  # type: ignore
        from app.agent.supervisor import SupervisorAgent  # type: ignore

        request_start = time.time()  # S2-5: Request-level timing

        # Module-level singleton — avoids re-creating AgentRegistry/Qdrant per request
        if not hasattr(run_agent_sse, '_supervisor'):
            run_agent_sse._supervisor = SupervisorAgent()
        supervisor = run_agent_sse._supervisor

        def emit(event_data: dict) -> str:
            return f"data: {json.dumps(event_data, ensure_ascii=False)}\n\n"

        try:
            event_queue = Queue()
            emitted_text_delta = False
            done_sentinel = "__SUPERVISOR_DONE__"

            def on_event(event_type: str, data: dict):
                payload = {"type": event_type}
                if isinstance(data, dict):
                    payload.update(data)
                event_queue.put(payload)

            runtime_context = dict(context or {})
            runtime_context["projectId"] = project_id
            runtime_context["chapterId"] = chapter_id
            runtime_context["messages_history"] = messages_history[-6:] if messages_history else []
            runtime_context["_llm_model"] = primary_model
            runtime_context["_mode"] = mode
            runtime_context["_skip_semantic_retrieval"] = False

            if _should_precompute_pruned_context(task, runtime_context):
                try:
                    runtime_context["_pruned_context"] = _build_pruned_context(
                        task,
                        runtime_context,
                        str(user_id),
                        project_id,
                    )
                    runtime_context["_skip_semantic_retrieval"] = True
                except Exception as prune_error:
                    logger.warning(f"[AgentRun] Failed to precompute pruned context: {prune_error}")

            worker_state: dict = {}

            def worker():
                try:
                    worker_state["result"] = supervisor.process_request(
                        user_id=str(user_id),
                        message=task,
                        context=runtime_context,
                        on_event=on_event,
                    )
                except Exception as worker_error:
                    worker_state["error"] = str(worker_error)
                finally:
                    event_queue.put({"type": done_sentinel})

            spawn(worker)

            while True:
                event = event_queue.get()
                if event.get("type") == done_sentinel:
                    break

                if event.get("type") == "TEXT_DELTA":
                    emitted_text_delta = True

                yield emit(event)

                if event.get("type") == "TOOL_RESULT":
                    result = event.get("result")
                    if isinstance(result, dict) and result.get("diff"):
                        yield emit({
                            "type": "PENDING_DIFF",
                            "diff": _normalize_diff_payload(result["diff"]),
                        })
                    if isinstance(result, dict):
                        for citation_flag in result.get("citation_flags", []):
                            yield emit({
                                "type": "CITATION_FLAG",
                                "citation_flag": citation_flag,
                            })
                        for warning in result.get("warnings", []):
                            yield emit({
                                "type": "INCOHERENCE_WARNING",
                                "warning": warning,
                            })

            if worker_state.get("error"):
                yield emit({"type": "ERROR", "message": f"Unexpected error: {worker_state['error']}"})
                return

            final_text = worker_state.get("result")
            if final_text and not emitted_text_delta:
                yield emit({"type": "TEXT_DELTA", "delta": str(final_text)})

            # S2-5: Request-level latency observability
            request_duration_ms = int((time.time() - request_start) * 1000)
            logger.info(
                f"[Observability] SSE request user={user_id} "
                f"project={project_id} "
                f"duration_ms={request_duration_ms} "
                f"task={task[:50]}"
            )

            yield emit({"type": "DONE"})

        except Exception as e:
            logger.error(f"[AgentRun] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            yield emit({"type": "ERROR", "message": f"Unexpected error: {str(e)}"})

    response = Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
            'Access-Control-Allow-Origin': request.headers.get('Origin', '*'),
            'Access-Control-Allow-Credentials': 'true',
        }
    )
    return response


@agent_api_bp.route('/api/agent/history/<project_id>', methods=['GET'])
@login_required
def get_agent_history(project_id):
    user_id = str(current_user.id)
    memory = SharedMemory(user_id, project_id, QdrantVectorDB(), FirestoreDocumentDB())
    turns = memory.conversation.get_full_history()
    session = _build_history_session(project_id, turns)
    return jsonify({
        "status": "success",
        "sessions": [session] if session.get("messages") else [],
        "session": session,
    }), 200


@agent_api_bp.route('/api/agent/history/<project_id>', methods=['PUT'])
@login_required
def sync_agent_history(project_id):
    data = request.json or {}
    messages = data.get("messages", [])
    user_id = str(current_user.id)
    memory = SharedMemory(user_id, project_id, QdrantVectorDB(), FirestoreDocumentDB())
    memory.conversation.replace_from_messages(messages)
    session = _build_history_session(project_id, memory.conversation.get_full_history())
    return jsonify({"status": "success", "session": session}), 200


@agent_api_bp.route('/api/agent/history/<project_id>', methods=['DELETE'])
@login_required
def clear_agent_history(project_id):
    user_id = str(current_user.id)
    memory = SharedMemory(user_id, project_id, QdrantVectorDB(), FirestoreDocumentDB())
    memory.flush_session()
    return jsonify({"status": "success"}), 200

