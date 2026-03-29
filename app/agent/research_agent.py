import os
import json
import logging
import datetime
import urllib.parse
import re
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import urllib.request
from urllib.error import URLError, HTTPError
import litellm
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '...')))
try:
    from app.utils.search_utils import unified_search
except ImportError:
    pass
from .memory_system import build_memory_prompt_context

# Configurasi logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

RESEARCH_AGENT_SYSTEM_PROMPT = """
You are the Research Agent for OnThesis. Your specialty is finding, reading, and extracting information from academic papers.

---

YOUR TOOLS:
- search_openalex: Search OpenAlex for academic papers by keyword or topic
- rank_papers: Score and sort papers by relevance, recency, and citation count
- extract_findings: Pull key findings, methodology, and conclusions from paper abstracts
- read_abstract: Get full abstract of a specific paper by DOI

---

PAPER RANKING FORMULA:
score = (relevance_score x 0.50) + (normalized_citations x 0.30) + (recency_score x 0.20)

For recency_score:
  published this year    = 1.0
  1–2 years ago          = 0.8
  3–5 years ago          = 0.6
  6–10 years ago         = 0.4
  more than 10 years ago = 0.2

For normalized_citations:
  Normalize within the result set: (paper_citations / max_citations_in_set)

---

EXTRACTION RULES:
When extracting findings from an abstract, always capture:
1. Main research question or objective
2. Methodology used
3. Key finding or result
4. Limitation (if mentioned)

Format extracted findings as:
"{Author} ({Year}) meneliti {topic} menggunakan {method}. Temuan utama: {finding}. {Limitation if exists}"

---

CONSTRAINTS:
- Maximum 10 papers per search
- Minimum relevance score to include a paper: 0.5
- Do not fabricate paper titles, authors, or DOIs
- If no relevant papers found, report clearly: "Tidak ditemukan paper relevan untuk topik ini."
- Prioritize papers published in the last 5 years unless the topic requires foundational works
"""

@dataclass
class StoredPaper:
    paper_id: str          # DOI atau OpenAlex ID
    title: str
    authors: List[str]
    year: int
    abstract: str
    key_findings: str      # hasil ekstraksi oleh agent
    relevance_score: float
    citation_count: int
    doi: str
    source: str            # "openalex" | "semantic_scholar" | "manual"
    topics: List[str]      # tag topik
    is_academic_source: bool = True
    last_refreshed_at: Optional[str] = None
    expires_at: Optional[str] = None
    added_at: datetime.datetime = field(default_factory=datetime.datetime.now)

class ResearchAgent:
    """
    Research Agent bertanggung jawab mencari, menyeleksi (ranking), 
    dan mengekstraksi temuan dari makalah penelitian (papers), 
    menggunakan integrasi OpenAlex API.
    """
    def __init__(self):
        self.api_key = os.environ.get("LLM_API_KEY")
        self.model = os.environ.get("RESEARCH_AGENT_MODEL", "groq/llama-3.1-8b-instant")
        
        if not self.api_key:
            logger.warning("LLM_API_KEY environment variable is not set. Extract findings using LLM might fail.")

    def _call_llm(self, prompt: str, system_prompt: str = RESEARCH_AGENT_SYSTEM_PROMPT, memory: Any = None) -> str:
        """
        Helper method untuk memanggil API LLM dengan fallback ke Gemini jika Groq limit.
        """
        import litellm
        from litellm.exceptions import RateLimitError
        
        fallback_api_key = os.environ.get("GEMINI_API_KEY")
        fallback_model = "gemini/gemini-2.5-flash"
        
        enriched_system_prompt = system_prompt
        shared_context = build_memory_prompt_context(memory)
        if shared_context:
            enriched_system_prompt = f"{system_prompt}\n\n{shared_context}"

        try:
            logger.info(f"| DEBUG | ResearchAgent -> Mencoba Primary: {self.model}")
            logger.info(f"ResearchAgent memanggil LLM Primary ({self.model})")
            response = litellm.completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": enriched_system_prompt},
                    {"role": "user", "content": prompt}
                ],
                api_key=self.api_key
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.info(f"| DEBUG | ResearchAgent -> Primary Limit! Error: {str(e)}")
            logger.info(f"| DEBUG | ResearchAgent -> Mencoba Fallback: {fallback_model}")
            logger.warning(f"RateLimit hit pada LLM Primary, mencoba fallback ke {fallback_model}...")
            if not fallback_api_key:
                logger.error("API_KEY tidak di-set. Fallback gagal.")
                raise e
            try:
                response = litellm.completion(
                    model=fallback_model,
                    messages=[
                        {"role": "system", "content": enriched_system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    api_key=fallback_api_key
                )
                logger.info(f"| DEBUG | ResearchAgent -> Fallback Sukses ({fallback_model})")
                return response.choices[0].message.content
            except Exception as fallback_e:
                logger.error(f"| DEBUG | ResearchAgent -> Fallback Gagal! Error: {str(fallback_e)}")
                logger.error(f"Fallback LLM gagal: {str(fallback_e)}")
                raise fallback_e
        except Exception as e:
            logger.error(f"Gagal memanggil LLM: {str(e)}")
            raise e
        try:
            # Clean query for search and keyword matching
            stop_words = {'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'over', 'such', 'each', 'which', 'their', 'there', 'then', 'than', 'them', 'these', 'those', 'some', 'other', 'also', 'more', 'most', 'only', 'very', 'just', 'but', 'not', 'nor', 'yet', 'both', 'either', 'neither', 'while', 'its', 'our', 'your',
                          'carikan', 'tolong', 'cari', 'paper', 'jurnal', 'tentang', 'mengenai', 'buatkan', 'buat', 'artikel', 'cariin', 'topik', 'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dalam'}
            
            clean_query_words = [w for w in re.split(r'\s+', query) if w.lower() not in stop_words and len(w) > 2]
            clean_query = " ".join(clean_query_words)
            if not clean_query:
                clean_query = query # fallback if everything is stripped

            # Panggil unified search yang mencakup 5 sources
            raw_results = unified_search(query=clean_query, sources=['crossref', 'openalex', 'doaj', 'pubmed', 'eric'], limit=limit)
            
            if not raw_results:
                logger.warning(f"Tidak ditemukan paper relevan untuk topik '{query}'. Trying web search fallback...")
                # Web search fallback
                try:
                    from app.agent.web_search_tool import WebSearchAgent
                    ws = WebSearchAgent()
                    web_results = ws.search_academic(query, num_results=5)
                    if web_results:
                        logger.info(f"| WebFallback | Found {len(web_results)} web results for: {query}")
                        return [
                            {
                                "paper_id": str(uuid.uuid5(uuid.NAMESPACE_DNS, r.get("url", r.get("title", "web_result")))),
                                "title": r.get("title", "Unknown"),
                                "abstract": r.get("snippet", ""),
                                "authors": [],
                                "year": datetime.datetime.now().year,
                                "relevance_score": 0.35,
                                "citation_count": 0,
                                "doi": "",
                                "source": "web_search",
                                "topics": [query],
                                "key_findings": r.get("snippet", ""),
                                "is_academic_source": False,
                            }
                            for r in web_results
                        ]
                except Exception as ws_e:
                    logger.warning(f"Web search fallback also failed: {ws_e}")
                return []
                
            papers = []
            # Extract keywords for strict matching - exclude stop words
            query_keywords = [k.lower() for k in clean_query_words]
            
            # Build bigram phrases for better matching (e.g. "machine learning", "in education")
            query_words_all = query.lower().split()
            query_phrases = []
            for i in range(len(query_words_all) - 1):
                phrase = query_words_all[i] + ' ' + query_words_all[i + 1]
                # Only keep phrases where at least one word is a keyword (not stop word)
                if any(w in query_keywords for w in [query_words_all[i], query_words_all[i + 1]]):
                    query_phrases.append(phrase)
            # Also add the full query as a phrase
            query_phrases.append(query.lower())
            logger.info(f"Query keywords: {query_keywords}, phrases: {query_phrases}")
            
            for item in raw_results:
                title = item.get('title', 'No Title')
                title_lower = title.lower()
                abstract = item.get('abstract', 'Abstract not available') or ''
                abstract_lower = abstract.lower()
                combined_text = title_lower + ' ' + abstract_lower
                
                # Bug 2: Phrase + keyword matching for relevance
                # Check phrase matches first (higher quality signal)
                phrase_hits_title = sum(1 for ph in query_phrases if ph in title_lower)
                phrase_hits_abstract = sum(1 for ph in query_phrases if ph in abstract_lower)
                phrase_hits_total = phrase_hits_title + phrase_hits_abstract
                
                # Individual keyword matches
                title_hits = sum(1 for kw in query_keywords if kw in title_lower)
                abstract_hits = sum(1 for kw in query_keywords if kw in abstract_lower)
                total_hits = title_hits + abstract_hits
                
                # Check how many unique keywords are present anywhere in the text
                unique_kws_found = sum(1 for kw in query_keywords if kw in combined_text)
                required_unique_kws = len(query_keywords) if len(query_keywords) <= 3 else len(query_keywords) - 1
                
                # === RELAXED FILTER (v2) ===
                # Old: required ALL keywords in title (too strict, blocked many valid papers)
                # New: require >= 50% of keywords anywhere in combined text
                if query_keywords:
                    coverage = unique_kws_found / len(query_keywords)
                    # Accept if: good phrase hit OR decent keyword coverage OR title has ANY keyword
                    if coverage < 0.4 and phrase_hits_total == 0 and title_hits == 0:
                        logger.info(f"Skipping paper (low relevance coverage={coverage:.2f}): {title[:60]}")
                        continue
                
                pid = item.get('id', '')
                doi = item.get('doi', '') or ''
                year = item.get('year', 0)
                if not year: year = 0
                
                citation_count = item.get('val', 0)
                authors_str = item.get('author', '')
                authors = [a.strip() for a in authors_str.split(',')] if authors_str else []
                
                # Bug 2: Improved relevance scoring
                # Phrase matches give higher score than individual keyword matches
                relevance = 0.3  # Low baseline
                if query_keywords:
                    # Phrase match bonus (each phrase match = 0.15)
                    phrase_bonus = min(0.4, phrase_hits_total * 0.15)
                    # Keyword match contribution
                    kw_score = (title_hits * 2 + abstract_hits) / (len(query_keywords) * 3)
                    relevance = min(1.0, 0.3 + phrase_bonus + kw_score * 0.3)
                
                # Filter: minimum relevance score > 0.5
                if relevance <= 0.5:
                    logger.info(f"Skipping paper (low relevance {relevance:.2f}): {title}")
                    continue
                
                papers.append({
                    "paper_id": str(pid),
                    "doi": str(doi),
                    "title": str(title),
                    "authors": authors,
                    "year": int(year),
                    "citation_count": int(citation_count),
                    "abstract": str(abstract),
                    "relevance_score": float(relevance),
                    "source": "unified_search",
                    "topics": [query],
                    "key_findings": "",
                    "is_academic_source": True,
                })
            
            # Deduplikasi (berjaga-jaga jika ada sisa dari unified search default)
            unique_papers = []
            seen_dois = set()
            seen_titles = set()
            for p in papers:
                title_norm = p['title'].lower().strip()
                if p['doi'] and p['doi'] not in seen_dois:
                    unique_papers.append(p)
                    seen_dois.add(p['doi'])
                    seen_titles.add(title_norm)
                elif title_norm not in seen_titles:
                    unique_papers.append(p)
                    seen_titles.add(title_norm)
                    
            return unique_papers
            
        except Exception as e:
            logger.error(f"Generic Error query Unified Search: {str(e)}")
            return []

    def _calculate_recency_score(self, current_year: int, paper_year: int) -> float:
        """Tiered recency score calculation sesuai blueprint."""
        diff = current_year - paper_year
        if diff <= 0: return 1.0 # published this year
        if diff <= 2: return 0.8 # 1-2 years ago
        if diff <= 5: return 0.6 # 3-5 years ago
        if diff <= 10: return 0.4 # 6-10 years ago
        return 0.2 # > 10 years ago

    def rank_papers(self, papers: List[Dict[str, Any]], strategy: str = "relevance_recency") -> List[Dict[str, Any]]:
        """
        Ranking papers secara algoritmik (relevance, recency, & normalized citations).
        Hanya mengembalikan paper dengan final score > threshold_tertentu (misal 0.5 jika relevance aslinya minimal segitu)
        """
        if not papers:
            return []
            
        logger.info(f"Ranking {len(papers)} papers dengan {strategy}...")
        
        current_year = datetime.datetime.now().year
        
        # Temukan max citations untuk normalisasi
        citation_counts = [p.get('citation_count', 0) for p in papers]
        max_citations = max(citation_counts, default=0)
        all_citations_zero = all(c == 0 for c in citation_counts)
        
        if all_citations_zero:
            logger.info("📊 All citation counts are 0 → using fallback formula: Relevance(0.6) + Recency(0.4)")
        else:
            logger.info(f"📊 Max citation count: {max_citations} → using full formula: Relevance(0.5) + Citation(0.3) + Recency(0.2)")
        
        ranked_papers = []
        for p in papers:
            rel = p.get('relevance_score', 0.5)
            cit = p.get('citation_count', 0)
            yr = p.get('year', 0)
            
            rec_score = self._calculate_recency_score(current_year, yr)
            
            # Bug 3: Citation normalization logic
            if all_citations_zero:
                # Skip citation normalization, only Relevance (0.6) + Recency (0.4)
                final_score = (rel * 0.60) + (rec_score * 0.40)
                norm_cit = 0
            else:
                norm_cit = cit / max_citations if max_citations > 0 else 0
                # Blueprint Score Formula
                # score = (relevance_score x 0.50) + (normalized_citations x 0.30) + (recency_score x 0.20)
                final_score = (rel * 0.50) + (norm_cit * 0.30) + (rec_score * 0.20)
            
            p['final_score'] = final_score
            p['norm_cit'] = norm_cit
            p['rec_score'] = rec_score
            ranked_papers.append(p)
            logger.info(f"  📄 {p.get('title', '?')[:60]} → rel={rel:.2f} rec={rec_score:.2f} cit={norm_cit:.2f} → score={final_score:.3f}")
            
        # Sort desc by final_score
        ranked_papers.sort(key=lambda x: x['final_score'], reverse=True)
        return ranked_papers

    def extract_findings(self, papers: List[Dict[str, Any]], max_papers: int = 5, memory: Any = None) -> List[Dict[str, Any]]:
        """
        Menggunakan LLM untuk mengekstrak main obj, methods, findings, dan limitations dari abstrak.
        """
        extracted = []
        papers_to_process = papers[:max_papers]
        
        for idx, paper in enumerate(papers_to_process):
            abstract = paper.get('abstract', '')
            if not abstract or len(abstract) < 20:
                paper['key_findings'] = f"Abstrak tidak tersedia untuk diekstrak."
                extracted.append(paper)
                continue
                
            prompt = f"Abstract:\n{abstract}\n\nTasks:\n1. Main research question\n2. Methodology\n3. Key finding\n4. Limitation\n\nFormat output as exactly instructed."
            
            try:
                # LLM Call
                findings = self._call_llm(prompt, memory=memory)
                
                # Update dataclass payload dictionary
                paper['key_findings'] = findings
                extracted.append(paper)
            except Exception as e:
                logger.error(f"Gagal extract finding pada paper_id {paper.get('paper_id')}: {str(e)}")
                paper['key_findings'] = "Gagal diekstraksi."
                extracted.append(paper)
                
        return extracted
        
    def read_abstract(self, doi: str) -> str:
        """Simulasi endpoint sederhana baca spesifik DOI for detail."""
        return f"Membaca abstract khusus untuk DOI: {doi}"

    def run_tool(self, tool_name: str, input_data: Any, params: Dict[str, Any], memory: Any = None) -> Any:
        """
        Method generik yang dipanggil Executor saat menjalankan TaskPlan.
        """
        tools_map = {
            "search_papers": self.search_papers,
            "rank_papers": self.rank_papers,
            "extract_findings": self.extract_findings,
            "read_abstract": self.read_abstract
        }
        
        if tool_name not in tools_map:
            raise ValueError(f"Tool {tool_name} tidak ditemukan pada Research Agent")
            
        try:
            func = tools_map[tool_name]
            
            # Sesuaikan dengan tipe parameter input_data yg diterima logic spesifik:
            if tool_name == "search_papers":
                # Handle duplikasi arg query di params (dari LLM JSON Output)
                if "query" in params:
                    params.pop("query")
                return func(query=input_data, memory=memory, **params)
            elif tool_name == "rank_papers":
                if "papers" in params:
                    params.pop("papers")
                return func(papers=input_data, **params)
            elif tool_name == "extract_findings":
                if "papers" in params:
                    params.pop("papers")
                return func(papers=input_data, memory=memory, **params)
            elif tool_name == "read_abstract":
                if "doi" in params:
                    params.pop("doi")
                return func(doi=input_data, **params)
                
        except Exception as e:
            logger.error(f"Terjadi kesalahan ketika mengeksekusi tool {tool_name} (Research Agent): {str(e)}")
            return {"error": str(e), "partial": True}
