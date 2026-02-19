from typing import TypedDict, Annotated, List, Dict, Any, Union
import os
import pandas as pd
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import io
import base64
import sys
import traceback
from langgraph.graph import StateGraph, END
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# --- State Definition ---
class AgentState(TypedDict):
    messages: List[BaseMessage]
    dataset_path: str
    code_generated: str
    execution_result: str
    artifacts: List[Dict[str, Any]]
    error: str
    route: str  # 'analysis' or 'conversation'

# --- LLM Setup ---
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=os.getenv("GROQ_API_KEY")
)

# --- Nodes ---

def planner_node(state: AgentState):
    """
    Analyzes the user's request and the dataset (if available) to plan the analysis steps.
    """
    print("--- PLANNER NODE ---")
    messages = state['messages']
    dataset_path = state.get('dataset_path')
    
    # Check if dataset exists
    data_info = "No dataset loaded."
    if dataset_path and os.path.exists(dataset_path):
        try:
            df = pd.read_csv(dataset_path) if dataset_path.endswith('.csv') else pd.read_excel(dataset_path)
            data_info = f"Dataset Columns: {list(df.columns)}\nMsg: Data loaded successfully. Shape: {df.shape}"
            # Quick preview
            data_info += f"\nHead:\n{df.head(3).to_string()}"
        except Exception as e:
            data_info = f"Error loading dataset: {e}"

    system_prompt = (
        "You are OnThesis Data Analyst, a cool and helpful AI mentor for university students.\n"
        "Your goal is to guide students. **DO NOT EXECUTE CODE UNLESS EXPLICITLY ASKED.**\n\n"
        "LANGUAGE RULE: Detect user's language (Default: Indonesian). Reply in the SAME language.\n"
        "TONE RULE: Be 'cool' (gaul tapi sopan). Use 'Oke', 'Siap', 'Tenang aja'.\n\n"
        "**ROUTING LOGIC:**\n"
        "1. **ROUTE: 'conversation'** (DEFAULT)\n"
        "   - Use this for greetings ('Hi', 'Pagi').\n"
        "   - Use this for vague requests ('Analisis dong', 'Bantu skripsi').\n"
        "   - Use this for probing ('Uji apa yang cocok?', 'Datanya bagus gak?').\n"
        "   - ACTION: Introduce yourself (if greeting), explain data, or suggest methods. Ask user to CONFIRM execution.\n"
        "   - OUTPUT: {\"route\": \"conversation\", \"response\": \"<Casual advice>\"}\n\n"
        "2. **ROUTE: 'analysis'** (STRICT)\n"
        "   - ONLY if user explicitly names a method or says 'Run'/'Lakukan'/'Gas'.\n"
        "   - Examples: 'Lakukan Uji T', 'Hitung korelasi', 'Buatkan scatter plot', 'Ya, jalankan saranmu'.\n"
        "   - OUTPUT: {\"route\": \"analysis\", \"plan\": \"<Plan>\"}\n\n"
        "**FEW-SHOT EXAMPLES:**\n"
        "- Input: 'Hi' -> {\"route\": \"conversation\", \"response\": \"Halo! Saya OnThesis Data Analyst. Ada yang bisa dibantu dengan datamu?\"}\n"
        "- Input: 'Analisis data ini' -> {\"route\": \"conversation\", \"response\": \"Oke bro. Datamu ada kolom X dan Y. Mau dicek korelasi atau regresinya?\"}\n"
        "- Input: 'Uji apa yg cocok?' -> {\"route\": \"conversation\", \"response\": \"Saran saya pakai Uji T atau ANOVA. Mau yang mana?\"}\n"
        "- Input: 'Gas Uji T' -> {\"route\": \"analysis\", \"plan\": \"Perform T-Test using scipy...\"}\n"
        f"\nDATASET INFO:\n{data_info}\n"
        "OUTPUT MUST BE VALID JSON ONLY."
    )
    
    import json
    import re
    try:
        response = llm.invoke([SystemMessage(content=system_prompt)] + messages)
        content = response.content.strip()
        print(f"DEBUG PLANNER RAW OUTPUT: {content}")
        
        # Robust JSON extraction: find first {...} in the output
        # Clean potential markdown code blocks first
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        
        # Try to find JSON object with regex
        json_match = re.search(r'\{[^{}]*\}', content, re.DOTALL)
        if json_match:
            content = json_match.group(0)
        
        decision = json.loads(content)
        route = decision.get('route', 'conversation')  # DEFAULT: conversation
        print(f"DEBUG PLANNER ROUTE: {route}")
        
        if route == 'conversation':
            return {
                "route": "conversation",
                "messages": messages + [AIMessage(content=decision.get('response', "Halo! Ada yang bisa saya bantu?"))]
            }
        else:
            plan_text = decision.get('plan', 'Lakukan analisis data.')
            return {
                "route": "analysis",
                "messages": messages + [AIMessage(content=plan_text)]
            }
            
    except Exception as e:
        print(f"PLANNER ERROR: {e}")
        print(f"PLANNER ERROR - Raw content was: {response.content if 'response' in dir() else 'N/A'}")
        # SAFE FALLBACK: Default to conversation, NOT analysis
        return {
            "route": "conversation", 
            "messages": messages + [AIMessage(content="Halo! Saya OnThesis Data Analyst. Ada yang bisa dibantu? 😊")]
        }

def coder_node(state: AgentState):
    """
    Generates Python code based on the plan.
    """
    print("--- CODER NODE ---")
    messages = state['messages']
    dataset_path = state.get('dataset_path')
    
    # We need the last message which is the plan
    plan = messages[-1].content
    
    system_prompt = (
        "You are a Python Data Science Expert. Write Python code to execute the plan.\n"
        "RULES:\n"
        "1. Use `pandas` as `pd` and `matplotlib.pyplot` as `plt`.\n"
        f"2. Load data from: '{dataset_path}'\n"
        "3. **MANDATORY CHARTS**: ALWAYS create at least 1 relevant visualization (bar chart, boxplot, scatter, etc.). Use `plt.clf()` before each chart.\n"
        "4. Save EVERY chart to a buffer: `buf = io.BytesIO(); plt.savefig(buf, format='png', dpi=150, bbox_inches='tight'); buf.seek(0); img_b64 = base64.b64encode(buf.read()).decode(); print(f'<IMG>{img_b64}</IMG>'); plt.clf()`\n"
        "5. **MANDATORY TABLES**: Print DataFrames/results using `print(df.to_markdown(index=False))` for clean table output. NEVER use plain `print(df)`.\n"
        "6. **DECIMAL PRECISION**: Round ALL numeric results to 3 decimal places (academic standard). Use `round(val, 3)` or `df.round(3)`.\n"
        "7. Wrap code in ```python ... ``` blocks.\n"
        "8. Handle errors gracefully with try/except.\n"
        "9. IMPORT ALL NEEDED LIBRARIES at the top: pandas, matplotlib.pyplot, io, base64, scipy, numpy, tabulate.\n"
        "10. Use `plt.style.use('seaborn-v0_8-darkgrid')` for chart styling. Use readable titles and labels in Indonesian.\n"
    )
    
    response = llm.invoke([SystemMessage(content=system_prompt), HumanMessage(content=f"Plan: {plan}")])
    
    # Extract code from markdown
    content = response.content
    code = ""
    if "```python" in content:
        code = content.split("```python")[1].split("```")[0].strip()
    elif "```" in content:
        code = content.split("```")[1].split("```")[0].strip()
    else:
        code = content # Fallback if no markdown
        
    return {"code_generated": code}

def executor_node(state: AgentState):
    """
    Executes the generated code in a restricted local environment.
    """
    print("--- EXECUTOR NODE ---")
    code = state['code_generated']
    dataset_path = state.get('dataset_path')
    
    # Redirect stdout to capture output
    old_stdout = sys.stdout
    redirected_output = sys.stdout = io.StringIO()
    
    artifacts = []
    error = None
    
    try:
        import numpy as np
        import warnings
        # Define the local scope for exec — include __builtins__ so import works
        local_scope = {
            "pd": pd,
            "plt": plt,
            "io": io,
            "base64": base64,
            "np": np,
            "warnings": warnings,
            "dataset_path": dataset_path
        }
        
        # Execute the code with __builtins__ in globals so imports work
        exec(code, {"__builtins__": __builtins__}, local_scope)
        
        # Capture stdout
        execution_output = redirected_output.getvalue()
        
        # Parse for image tags in output
        import re
        
        # Match <IMG>base64_data</IMG> format
        img_matches = re.findall(r'<IMG>(.*?)</IMG>', execution_output, re.DOTALL)
        for img_b64 in img_matches:
            artifacts.append({"type": "image_base64", "data": img_b64.strip()})
            execution_output = execution_output.replace(f"<IMG>{img_b64}</IMG>", "[Chart Generated]")
        
        # Match <IMG src='data:image/png;base64,...'> or <IMG src="data:image/png;base64,..."> format
        html_img_matches = re.findall(r'<IMG\s+src=[\'\"]?(data:image/[^;]+;base64,([^\'\">\s]+))[\'\"]?\s*/?>', execution_output, re.DOTALL | re.IGNORECASE)
        for full_src, img_b64 in html_img_matches:
            artifacts.append({"type": "image_base64", "data": img_b64.strip()})
        # Remove all HTML img tags from text output
        execution_output = re.sub(r'<IMG\s+src=[\'\"]?data:image/[^>]*>', '[Chart Generated]', execution_output, flags=re.IGNORECASE)

    except Exception as e:
        error = str(e)
        print(f"DEBUG: Executor Error: {error}")
        print(traceback.format_exc())
        execution_output = f"Execution Error: {error}\n{traceback.format_exc()}"
    finally:
        sys.stdout = old_stdout
        
    return {
        "execution_result": execution_output,
        "artifacts": artifacts,
        "error": error
    }

def responder_node(state: AgentState):
    """
    Format the final response to the user using LLM synthesis.
    """
    print("--- RESPONDER NODE ---")
    result = state['execution_result']
    error = state.get('error')
    artifacts = state.get('artifacts', [])
    num_charts = len(artifacts)
    
    if error:
        response_text = f"Maaf, terjadi error saat eksekusi kode:\n\n```\n{result}\n```"
        return {"messages": state['messages'] + [AIMessage(content=response_text)]}
    
    # Use LLM to synthesize the raw output into a professional report
    system_prompt = (
        "You are OnThesis Data Analyst writing a professional analysis report for a thesis.\n"
        "Given the raw output below, synthesize it into a well-structured, professional report.\n"
        "LANGUAGE RULE: Detect the language used in the `messages` history. Write the report in that SAME language. Default to BAHASA INDONESIA.\n"
        "RULES:\n"
        "1. Use clear markdown formatting with headers (##, ###), bold.\n"
        "2. **MANDATORY SPSS-STYLE TABLES**: Present ALL statistical results in tables that follow SPSS/academic convention.\n"
        "   - Use standard column headers: Variabel, Sum of Squares, df, Mean Square, F, Sig.\n"
        "   - For correlation: Variabel 1, Variabel 2, r, p-value, N.\n"
        "   - For descriptive: Variabel, N, Mean, Std. Deviation, Min, Max.\n"
        "   - NEVER use bullet points for numbers. ALWAYS use tables.\n"
        "   - Each row MUST be on its own line.\n"
        "3. **DECIMAL PRECISION**: Round ALL numbers to 3 decimal places (e.g., 0.730, not 0.7304494219210249). This is the academic standard.\n"
        "4. Interpret the results — explain what the p-values mean (significant at alpha 0.05: *p<0.05, **p<0.01).\n"
        "5. Explain normality tests, homogeneity tests, and the main test results.\n"
        "6. Provide a clear conclusion/summary at the end.\n"
        f"7. {num_charts} chart(s) were generated and will be displayed separately. Reference them in your text (e.g., 'Lihat grafik di bawah').\n"
        "8. Do NOT include any raw Python objects or base64 data in your response.\n"
        "9. Keep it concise but informative — suitable for a thesis document.\n"
        "\nEXAMPLE TABLE FORMAT:\n"
        "| Sumber | Sum of Squares | df | Mean Square | F | Sig. |\n"
        "|---|---|---|---|---|---|\n"
        "| Antar Kelompok | 7.123 | 4 | 1.781 | 2.340 | 0.512 |\n"
        "| Dalam Kelompok | 172.806 | 95 | 1.819 | | |\n"
        "| Total | 179.929 | 99 | | | |\n"
    )
    
    try:
        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Raw Analysis Output:\n{result}\n\nContext Messages:\n{state['messages'][-3:]}")
        ])
        response_text = response.content
    except Exception as e:
        print(f"DEBUG: Responder LLM Error: {e}")
        # Fallback to raw output if LLM fails
        response_text = f"## Hasil Analisis\n\n{result}"
    
    return {"messages": state['messages'] + [AIMessage(content=response_text)]}

# --- Graph Contruction ---
workflow = StateGraph(AgentState)

workflow.add_node("planner", planner_node)
workflow.add_node("coder", coder_node)
workflow.add_node("executor", executor_node)
workflow.add_node("responder", responder_node)

workflow.set_entry_point("planner")

def route_step(state: AgentState):
    if state.get("route") == "conversation":
        return END
    return "coder"

workflow.add_conditional_edges(
    "planner",
    route_step
)

workflow.add_edge("coder", "executor")
# Conditional edge: if error, maybe go back to coder? For now, go to responder
workflow.add_edge("executor", "responder")
workflow.add_edge("responder", END)

agent_app = workflow.compile()
