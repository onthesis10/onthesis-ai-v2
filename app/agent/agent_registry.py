import logging
from typing import Dict, Any

from .writing_agent import WritingAgent
from .research_agent import ResearchAgent
from .analysis_agent import AnalysisAgent
from .editor_agent import EditorAgent
from .chapter_skills import ChapterSkillsAgent
from .diagnostic_agent import DiagnosticAgent
from .web_search_tool import WebSearchAgent
from app.services.thesis_tools import execute_tool

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ThesisToolsAgent:
    """
    Adapter agar thesis_tools.execute_tool dapat dipanggil lewat interface agent.run_tool().
    """

    def run_tool(
        self,
        tool_name: str,
        input_data: Any,
        params: Dict[str, Any],
        memory: Any = None,
        context: Dict[str, Any] = None,
        **kwargs,
    ) -> Any:
        tool_input: Dict[str, Any] = {}
        if isinstance(input_data, dict):
            tool_input.update(input_data)
        if isinstance(params, dict):
            tool_input.update(params)

        # Fallback sederhana bila caller hanya mengirim string input.
        if not tool_input and isinstance(input_data, str):
            if tool_name == "search_references":
                tool_input["query"] = input_data
            elif tool_name in ("edit_paragraph", "insert_paragraph"):
                tool_input["new_content" if tool_name == "edit_paragraph" else "content"] = input_data

        ctx = context or {}
        if not ctx and memory is not None:
            ctx = getattr(memory, "request_context", {}) or {}

        return execute_tool(tool_name, tool_input, ctx)

class AgentRegistry:
    """
    Registry utama untuk memegang referensi instance semua agent.
    Tool Registry ini dipetakan berdasarkan nama agent.
    """
    def __init__(self):
        self.agents: Dict[str, Any] = {}
        self._initialize_agents()
        
    def _initialize_agents(self):
        """Inisialisasi semua agent dan simpan di registry."""
        logger.info("Mendaftarkan semua agent ke dalam Tool Registry...")
        try:
            self.agents["writing_agent"] = WritingAgent()
            self.agents["research_agent"] = ResearchAgent()
            self.agents["analysis_agent"] = AnalysisAgent()
            self.agents["thesis_tools_agent"] = ThesisToolsAgent()

            # V2 Agents — Phase 1, 2, 4
            self.agents["editor_agent"] = EditorAgent()
            self.agents["chapter_skills_agent"] = ChapterSkillsAgent()
            self.agents["diagnostic_agent"] = DiagnosticAgent()

            # V3 Power Agent
            self.agents["web_search_agent"] = WebSearchAgent()
            
            logger.info("Agen terdaftar: " + ", ".join(self.agents.keys()))
        except Exception as e:
            logger.error(f"Gagal melakukan inisialisasi pada sebuah agent: {str(e)}")
            raise e
            
    def get_agent(self, agent_name: str) -> Any:
        """Mengembalikan instance agen berdasarkan nama."""
        if agent_name not in self.agents:
            raise KeyError(f"Agent '{agent_name}' tidak terdaftar pada registry.")
        return self.agents[agent_name]

    def get_all_agents(self) -> Dict[str, Any]:
        """Mengembalikan dict seluruh agen untuk dipassing ke Plan Executor."""
        return self.agents
