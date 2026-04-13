import os
import json
import asyncio
from dotenv import load_dotenv

# Set PYTHONPATH implicitly by running from root
load_dotenv()

from app.agent.editor_agent import EditorAgent
from app.agent.chapter_skills import ChapterSkillsAgent
from app.agent.diagnostic_agent import DiagnosticAgent
from app.services.thesis_tools import ALL_THESIS_TOOLS

async def test_editor_agent():
    print("\n--- Testing Editor Agent ---")
    agent = EditorAgent()
    
    # Simulate a suggest_replace_text call
    print("Testing suggest_replace_text...")
    result = agent.run_tool("suggest_replace_text", {
        "target_paragraph_id": "test-para-123",
        "revised_markdown": "This is a **revised** paragraph proposed by the agent."
    }, {})
    print(f"Result: {json.dumps(result, indent=2)}")

async def test_chapter_skills_agent():
    print("\n--- Testing Chapter Skills Agent ---")
    agent = ChapterSkillsAgent()
    
    # Simulate formulate_research_gap
    print("Testing formulate_research_gap...")
    result = agent.run_tool("formulate_research_gap", {
        "topic": "Penggunaan AI dalam Deteksi Hoaks",
        "context_text": "Topik ini sangat penting karena hoaks cepat menyebar."
    }, {})
    print(f"Result: {json.dumps(result, indent=2)}")

async def test_diagnostic_agent():
    print("\n--- Testing Diagnostic Agent ---")
    agent = DiagnosticAgent()
    
    # Simulate analyze_for_missing_citations
    print("Testing analyze_for_missing_citations...")
    result = agent.run_tool("analyze_for_missing_citations", {
        "text": "Machine learning telah terbukti meningkatkan akurasi deteksi penyakit hingga 90%. Namun, masih banyak tantangan dalam implementasinya di rumah sakit daerah."
    }, {})
    print(f"Result: {json.dumps(result, indent=2)}")

async def main():
    print("Starting V2 Agents Test...")
    
    if not os.environ.get("LLM_API_KEY"):
        print("WARNING: LLM_API_KEY is not set. The LLM tests will likely fail.")
        
    await test_editor_agent()
    await test_chapter_skills_agent()
    await test_diagnostic_agent()
    
    print("\nTest Complete.")

if __name__ == "__main__":
    asyncio.run(main())
