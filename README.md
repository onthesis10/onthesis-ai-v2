# OnThesis AI Agent Workspace

This is the backend workspace for the OnThesis AI Agent system, built on Flask, SocketIO, and Gevent. It utilizes a Supervisor-Worker architecture for advanced multi-agent interactions.

## Prerequisites
- Python 3.10+
- Redis Server (Local or Cloud)

## Setup Instructions

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd OnThesis-AI-main
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables:**
   Create a `.env` file in the root directory based on `.env.example`. Key variables required:
   ```env
   # LLM API Keys
   LLM_API_KEY="your_openai_or_other_llm_api_key"
   
   # Agent Specific Models (Optional, defaults to gpt-4o-mini)
   SUPERVISOR_AGENT_MODEL="gpt-4o-mini"
   WRITING_AGENT_MODEL="gpt-4o-mini"
   RESEARCH_AGENT_MODEL="gpt-4o-mini"
   ANALYSIS_AGENT_MODEL="gpt-4o-mini"
   INTENT_AGENT_MODEL="gpt-4o-mini"

   # OpenAlex API (Required for faster Research Agent queries)
   OPENALEX_EMAIL="your_email@example.com"

   # Redis Configuration (Required for Session, Profile, and Conversation Memory)
   REDIS_URL="redis://localhost:6379/0"
   
   # Flask Config
   FLASK_SECRET_KEY="your_secret_key"
   FLASK_DEBUG="True"
   ```

5. **Start the Server:**
   The server is executed using Gevent WSGI to seamlessly support SocketIO alongside synchronous agent requests.
   ```bash
   python run.py
   ```
   The backend will be available at `http://localhost:5000`. Endpoint `/api/agent/chat` is ready to accept requests.
