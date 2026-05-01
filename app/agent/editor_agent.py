"""
editor_agent.py — Editor-Aware Agent (Phase 1: "Tangan" Agent)

Provides tools for directly interacting with the Lexical Editor:
  - read_editor_context: Read structured context from the active chapter
  - suggest_insert_text: Propose inserting new paragraphs (-> PENDING_DIFF)
  - suggest_replace_text: Propose replacing paragraph content (-> PENDING_DIFF)
  - suggest_delete_text: Propose deleting paragraphs (-> PENDING_DIFF)
  - flag_missing_citation: Flag unsupported claims for user attention

Each suggest_* tool returns a dict with a 'diff' key that the SSE pipeline
in agent.py automatically converts to a PENDING_DIFF event for the frontend.
The diff payload uses old_text/new_text with temporary before/after aliases
for backward compatibility.
"""

import time
import uuid
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)


class EditorAgent:
    """
    Editor Agent — "Tangan" bagi OnThesis Agent.
    Menyediakan kemampuan baca/tulis langsung ke Lexical Editor melalui
    PENDING_DIFF events yang diterima oleh useAgentLoop.js di frontend.
    """

    def __init__(self):
        logger.info("EditorAgent initialized.")

    # ── Tool 1: Read Editor Context ─────────────────────────────────

    def read_editor_context(
        self,
        paragraph_ids: Optional[List[str]] = None,
        mode: str = "full",
        memory: Any = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Membaca konteks paragraf dari editor yang sedang aktif.

        Args:
            paragraph_ids: List of paragraph IDs to read (for 'range' mode).
            mode: 'full' | 'summary' | 'range'
            memory: SharedMemory instance (contains request_context).

        Returns:
            Dict with paragraphs and metadata.
        """
        context = {}
        if memory and hasattr(memory, "request_context"):
            context = getattr(memory, "request_context", {})

        paragraphs = context.get("active_paragraphs", [])

        if not paragraphs:
            return {
                "paragraphs": [],
                "total": 0,
                "chapter_id": context.get("chapterId", ""),
                "message": "Tidak ada paragraf aktif. Pastikan user membuka sebuah bab di editor.",
            }

        if mode == "range" and paragraph_ids:
            filtered = [p for p in paragraphs if p.get("paraId") in paragraph_ids]
            return {
                "paragraphs": filtered,
                "total": len(paragraphs),
                "chapter_id": context.get("chapterId", ""),
            }

        if mode == "summary":
            summaries = []
            for p in paragraphs[:15]:
                content = p.get("content", "")
                preview = content[:120] + "..." if len(content) > 120 else content
                summaries.append({"paraId": p.get("paraId"), "preview": preview})
            return {
                "paragraphs": summaries,
                "total": len(paragraphs),
                "chapter_id": context.get("chapterId", ""),
            }

        # Full mode
        return {
            "paragraphs": paragraphs,
            "total": len(paragraphs),
            "chapter_id": context.get("chapterId", ""),
            "references_available": bool(context.get("references_text") or context.get("references_raw")),
        }

    # ── Tool 2: Suggest Replace Text ────────────────────────────────

    def suggest_replace_text(
        self,
        target_paragraph_id: str,
        new_markdown: str,
        reason: str = "",
        target_paragraph_key: str = "",
        old_text: str = "",
        memory: Any = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Mengusulkan penggantian konten paragraf. Menghasilkan PENDING_DIFF 'edit'.

        Args:
            target_paragraph_id: ID paragraf yang akan diganti (e.g., 'P-abc123').
            new_markdown: Konten baru (teks/HTML).
            reason: Alasan perubahan.

        Returns:
            Dict with 'diff' key matching PENDING_DIFF schema.
        """
        if not target_paragraph_id or not new_markdown:
            return {"error": "target_paragraph_id and new_markdown are required"}

        # Cari konten lama dari context
        target_key = target_paragraph_key or None
        if memory and hasattr(memory, "request_context"):
            request_context = memory.request_context
            paragraphs = request_context.get("active_paragraphs", [])
            for p in paragraphs:
                para_key = p.get("nodeKey") or p.get("target_key")
                if p.get("paraId") == target_paragraph_id or (target_key and para_key == target_key):
                    old_text = old_text or p.get("content", "")
                    target_key = target_key or para_key
                    break
            active_node = request_context.get("active_node", {})
            if isinstance(active_node, dict) and (
                active_node.get("paraId") == target_paragraph_id
                or (target_key and target_key in {active_node.get("target_key"), active_node.get("nodeKey")})
            ):
                target_key = target_key or active_node.get("target_key") or active_node.get("nodeKey")
                old_text = old_text or active_node.get("paragraphText")
            target_key = target_key or request_context.get("target_paragraph_key") or request_context.get("target_key")
            old_text = old_text or request_context.get("selected_text", "")

        diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

        return {
            "success": True,
            "diff": {
                "diffId": diff_id,
                "diff_id": diff_id,
                "type": "edit",
                "paraId": target_paragraph_id,
                "target_key": target_key,
                "old_text": old_text,
                "new_text": new_markdown,
                "before": old_text,
                "after": new_markdown,
                "reason": reason,
            },
        }

    # ── Tool 3: Suggest Insert Text ─────────────────────────────────

    def suggest_insert_text(
        self,
        target_paragraph_id: str,
        new_markdown: str,
        reason: str = "",
        position: str = "after",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Mengusulkan penyisipan paragraf baru. Menghasilkan PENDING_DIFF 'insert'.

        Args:
            target_paragraph_id: ID paragraf anchor (sisipkan setelah/sebelum).
            new_markdown: Konten paragraf baru.
            reason: Alasan.
            position: 'after' | 'before' (default 'after').

        Returns:
            Dict with 'diff' key matching PENDING_DIFF schema.
        """
        if not target_paragraph_id or not new_markdown:
            return {"error": "target_paragraph_id and new_markdown are required"}

        diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"
        new_para_id = f"P-{uuid.uuid4().hex[:8]}"

        return {
            "success": True,
            "diff": {
                "diffId": diff_id,
                "diff_id": diff_id,
                "type": "insert",
                "paraId": new_para_id,
                "anchorId": target_paragraph_id,
                "position": position,
                "old_text": "",
                "new_text": new_markdown,
                "before": "",
                "after": new_markdown,
                "reason": reason,
            },
        }

    # ── Tool 4: Suggest Delete Text ─────────────────────────────────

    def suggest_delete_text(
        self,
        target_paragraph_id: str,
        reason: str = "",
        memory: Any = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Mengusulkan penghapusan paragraf. Menghasilkan PENDING_DIFF 'delete'.

        Args:
            target_paragraph_id: ID paragraf yang akan dihapus.
            reason: Alasan penghapusan.

        Returns:
            Dict with 'diff' key matching PENDING_DIFF schema.
        """
        if not target_paragraph_id:
            return {"error": "target_paragraph_id is required"}

        old_text = ""
        target_key = None
        if memory and hasattr(memory, "request_context"):
            request_context = memory.request_context
            paragraphs = request_context.get("active_paragraphs", [])
            for p in paragraphs:
                if p.get("paraId") == target_paragraph_id:
                    old_text = p.get("content", "")
                    target_key = p.get("nodeKey") or p.get("target_key")
                    break
            active_node = request_context.get("active_node", {})
            if isinstance(active_node, dict) and active_node.get("paraId") == target_paragraph_id:
                target_key = active_node.get("target_key") or active_node.get("nodeKey") or target_key
                old_text = active_node.get("paragraphText") or old_text

        diff_id = f"diff_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}"

        return {
            "success": True,
            "diff": {
                "diffId": diff_id,
                "diff_id": diff_id,
                "type": "delete",
                "paraId": target_paragraph_id,
                "target_key": target_key,
                "old_text": old_text,
                "new_text": "",
                "before": old_text,
                "after": "",
                "reason": reason,
            },
        }

    # ── Tool 5: Flag Missing Citation ───────────────────────────────

    def flag_missing_citation(
        self,
        paragraph_id: str,
        claim_text: str,
        suggestion: str = "",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Menandai paragraf yang memiliki klaim kuat tanpa sitasi.
        Frontend akan menampilkan highlight merah di Lexical Editor.

        Args:
            paragraph_id: ID paragraf yang mengandung klaim tanpa sitasi.
            claim_text: Teks klaim spesifik yang butuh referensi.
            suggestion: Saran untuk menambahkan referensi.

        Returns:
            Dict with citation flag data.
        """
        if not paragraph_id or not claim_text:
            return {"error": "paragraph_id and claim_text are required"}

        return {
            "success": True,
            "citation_flag": {
                "flagId": f"flag_{int(time.time() * 1000)}_{uuid.uuid4().hex[:6]}",
                "paraId": paragraph_id,
                "claim": claim_text,
                "message": f"Klaim kuat terdeteksi. Butuh referensi untuk mendukung argumen ini.",
                "suggestion": suggestion or "Tambahkan sitasi dari paper empiris yang mendukung klaim ini.",
            },
        }

    # ── Executor Interface ──────────────────────────────────────────

    def run_tool(
        self,
        tool_name: str,
        input_data: Any,
        params: Dict[str, Any],
        memory: Any = None,
        **kwargs,
    ) -> Any:
        """
        Standard interface dipanggil oleh PlanExecutor.

        Args:
            tool_name: Nama tool yang akan dieksekusi.
            input_data: Data input (bisa string atau dict).
            params: Parameter tambahan.
            memory: SharedMemory instance.

        Returns:
            Tool result dict.
        """
        tools_map = {
            "read_editor_context": self._dispatch_read_editor_context,
            "suggest_replace_text": self._dispatch_suggest_replace_text,
            "suggest_insert_text": self._dispatch_suggest_insert_text,
            "suggest_delete_text": self._dispatch_suggest_delete_text,
            "flag_missing_citation": self._dispatch_flag_missing_citation,
        }

        if tool_name not in tools_map:
            raise ValueError(f"Tool '{tool_name}' tidak ditemukan pada EditorAgent")

        try:
            return tools_map[tool_name](input_data, params, memory)
        except Exception as e:
            logger.error(f"Error eksekusi tool '{tool_name}' di EditorAgent: {e}")
            return {"error": str(e), "partial": True}

    # ── Dispatch Helpers ────────────────────────────────────────────

    def _dispatch_read_editor_context(self, input_data, params, memory):
        params = params or {}
        paragraph_ids = None
        mode = params.get("mode", "full")
        if isinstance(input_data, dict):
            paragraph_ids = input_data.get("para_ids")
            mode = input_data.get("mode", mode)
        return self.read_editor_context(
            paragraph_ids=paragraph_ids, mode=mode, memory=memory
        )

    def _dispatch_suggest_replace_text(self, input_data, params, memory):
        params = params or {}
        if isinstance(input_data, dict):
            return self.suggest_replace_text(
                target_paragraph_id=input_data.get("target_paragraph_id", params.get("target_paragraph_id", "")),
                new_markdown=input_data.get("new_markdown", params.get("new_markdown", "")),
                reason=input_data.get("reason", params.get("reason", "")),
                target_paragraph_key=input_data.get("target_paragraph_key", params.get("target_paragraph_key", "")),
                old_text=input_data.get("old_text", params.get("old_text", "")),
                memory=memory,
            )
        # input_data is the new_markdown string
        return self.suggest_replace_text(
            target_paragraph_id=params.get("target_paragraph_id", ""),
            new_markdown=str(input_data),
            reason=params.get("reason", ""),
            target_paragraph_key=params.get("target_paragraph_key", ""),
            old_text=params.get("old_text", ""),
            memory=memory,
        )

    def _dispatch_suggest_insert_text(self, input_data, params, memory):
        params = params or {}
        if isinstance(input_data, dict):
            return self.suggest_insert_text(
                target_paragraph_id=input_data.get("target_paragraph_id", params.get("target_paragraph_id", "")),
                new_markdown=input_data.get("new_markdown", params.get("new_markdown", "")),
                reason=input_data.get("reason", params.get("reason", "")),
                position=input_data.get("position", params.get("position", "after")),
            )
        return self.suggest_insert_text(
            target_paragraph_id=params.get("target_paragraph_id", ""),
            new_markdown=str(input_data),
            reason=params.get("reason", ""),
            position=params.get("position", "after"),
        )

    def _dispatch_suggest_delete_text(self, input_data, params, memory):
        params = params or {}
        if isinstance(input_data, dict):
            return self.suggest_delete_text(
                target_paragraph_id=input_data.get("target_paragraph_id", params.get("target_paragraph_id", "")),
                reason=input_data.get("reason", params.get("reason", "")),
                memory=memory,
            )
        return self.suggest_delete_text(
            target_paragraph_id=params.get("target_paragraph_id", str(input_data)),
            reason=params.get("reason", ""),
            memory=memory,
        )

    def _dispatch_flag_missing_citation(self, input_data, params, memory):
        params = params or {}
        if isinstance(input_data, dict):
            return self.flag_missing_citation(
                paragraph_id=input_data.get("paragraph_id", params.get("paragraph_id", "")),
                claim_text=input_data.get("claim_text", params.get("claim_text", "")),
                suggestion=input_data.get("suggestion", params.get("suggestion", "")),
            )
        return self.flag_missing_citation(
            paragraph_id=params.get("paragraph_id", ""),
            claim_text=str(input_data),
            suggestion=params.get("suggestion", ""),
        )
