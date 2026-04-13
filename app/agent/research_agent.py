import os
import json
import logging
import datetime
import re
import uuid
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import litellm
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '...')))
try:
    from app.utils.search_utils import unified_search
except ImportError:
    unified_search = None
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
    citation_key: str = ""
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

    @staticmethod
    def _is_env_enabled(name: str, default: bool = True) -> bool:
        value = os.getenv(name)
        if value is None:
            return default
        return str(value).strip().lower() in {"1", "true", "yes", "on"}

    def _log_search_backend_status(self) -> None:
        openalex_enabled = self._is_env_enabled("OPENALEX_ENABLED", default=True)
        web_enabled = self._is_env_enabled("WEB_SEARCH_ENABLED", default=True)
        if not openalex_enabled and not web_enabled:
            logger.warning("No search backend configured! OPENALEX_ENABLED=false and WEB_SEARCH_ENABLED=false.")

    def _search_web_fallback(self, query: str, limit: int, field: str = "") -> List[Dict[str, Any]]:
        try:
            from app.agent.web_search_tool import WebSearchAgent

            logger.info("search_papers fallback: trying web search for query=%r", query)
            web_results = WebSearchAgent().search_academic(query, num_results=limit)
            normalized = self._normalize_web_results(
                query=query,
                web_results=web_results or [],
                field=field,
            )
            logger.info("search_papers fallback: web search returned %s papers", len(normalized))
            return normalized
        except Exception as web_error:
            logger.error("search_papers web fallback failed for query=%r: %s", query, web_error)
            return []

    @staticmethod
    def _search_stop_words() -> set[str]:
        return {
            'the', 'and', 'for', 'with', 'from', 'that', 'this', 'are', 'was', 'were', 'been', 'being',
            'have', 'has', 'had', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
            'shall', 'can', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'over', 'such', 'each', 'which', 'their', 'there', 'then', 'than',
            'them', 'these', 'those', 'some', 'other', 'also', 'more', 'most', 'only', 'very', 'just',
            'but', 'not', 'nor', 'yet', 'both', 'either', 'neither', 'while', 'its', 'our', 'your',
            'carikan', 'tolong', 'cari', 'paper', 'jurnal', 'tentang', 'mengenai', 'buatkan', 'buat',
            'artikel', 'cariin', 'topik', 'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'pada', 'dalam',
        }

    def _tokenize_search_text(self, text: str) -> List[str]:
        stop_words = self._search_stop_words()
        return [
            token for token in re.split(r'\s+', str(text or ""))
            if token and token.lower() not in stop_words and len(token) > 2
        ]

    def _build_query_phrases(self, query: str, query_keywords: List[str], field: str = "") -> List[str]:
        query_words_all = str(query or "").lower().split()
        query_phrases: List[str] = []
        for idx in range(len(query_words_all) - 1):
            phrase = query_words_all[idx] + ' ' + query_words_all[idx + 1]
            if any(word in query_keywords for word in [query_words_all[idx], query_words_all[idx + 1]]):
                query_phrases.append(phrase)
        if query:
            query_phrases.append(query.lower())
        if field:
            query_phrases.append(field.lower())
        return list(dict.fromkeys(p for p in query_phrases if p))

    def _infer_source(self, item: Dict[str, Any]) -> str:
        explicit_source = str(item.get("source") or "").strip().lower()
        if explicit_source:
            if explicit_source in {"web", "web_search"}:
                return "web"
            if explicit_source in {"crossref", "openalex", "doaj", "pubmed", "eric"}:
                return explicit_source

        item_id = str(item.get("id") or item.get("paper_id") or "").lower()
        if "openalex.org" in item_id or item_id.startswith("https://openalex.org"):
            return "openalex"
        if item_id.startswith("crossref_"):
            return "crossref"
        if item_id.startswith("doaj_"):
            return "doaj"
        if item_id.startswith("pubmed_"):
            return "pubmed"
        if item_id.startswith("eric_"):
            return "eric"
        return "openalex"

    def _slugify(self, value: str) -> str:
        slug = re.sub(r"[^a-z0-9]+", "_", str(value or "").lower()).strip("_")
        return slug or "unknown"

    def _build_citation_key(self, title: str, authors: List[str], year: int, doi: str) -> str:
        normalized_doi = str(doi or "").strip().lower()
        if normalized_doi:
            return self._slugify(normalized_doi)

        first_author = authors[0] if authors else "unknown"
        author_slug = self._slugify(first_author.split(",")[0].split()[-1] if first_author else "unknown")
        title_slug = self._slugify(title)[:48]
        year_value = year if year else "nd"
        return f"{author_slug}_{year_value}_{title_slug}"

    def _normalize_paper_result(
        self,
        item: Dict[str, Any],
        query: str,
        source: str,
        relevance_score: float,
        field: str = "",
    ) -> Dict[str, Any]:
        title = str(item.get("title") or "No Title")
        abstract = str(item.get("abstract") or "Abstract not available")
        authors_raw = item.get("author") or item.get("authors") or []
        if isinstance(authors_raw, str):
            authors = [author.strip() for author in authors_raw.split(",") if author.strip()]
        elif isinstance(authors_raw, list):
            authors = [str(author).strip() for author in authors_raw if str(author).strip()]
        else:
            authors = []

        year_raw = item.get("year", 0)
        try:
            year = int(year_raw or 0)
        except (TypeError, ValueError):
            year = 0

        citation_count_raw = item.get("val", item.get("citation_count", 0))
        try:
            citation_count = int(citation_count_raw or 0)
        except (TypeError, ValueError):
            citation_count = 0

        doi = str(item.get("doi") or "").strip()
        paper_id = str(item.get("paper_id") or item.get("id") or doi or uuid.uuid5(uuid.NAMESPACE_DNS, title))
        topics = [query]
        if field:
            topics.append(field)

        return {
            "paper_id": paper_id,
            "title": title,
            "authors": authors,
            "year": year,
            "abstract": abstract,
            "source": source,
            "citation_key": self._build_citation_key(title=title, authors=authors, year=year, doi=doi),
            "doi": doi,
            "relevance_score": float(relevance_score),
            "citation_count": citation_count,
            "topics": topics,
            "key_findings": str(item.get("key_findings") or ""),
            "is_academic_source": source != "web",
        }

    def _normalize_web_results(self, query: str, web_results: List[Dict[str, Any]], field: str = "") -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        for item in web_results:
            url = str(item.get("url") or item.get("link") or item.get("title") or "web_result")
            normalized.append(
                self._normalize_paper_result(
                    {
                        "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, url)),
                        "title": item.get("title", "Unknown"),
                        "abstract": item.get("snippet", ""),
                        "authors": [],
                        "year": datetime.datetime.now().year,
                        "doi": "",
                    },
                    query=query,
                    source="web",
                    relevance_score=0.35,
                    field=field,
                )
            )
        return normalized

    def _dedupe_papers(self, papers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        unique_papers: List[Dict[str, Any]] = []
        seen_dois = set()
        seen_titles = set()
        for paper in papers:
            title_norm = str(paper.get("title") or "").lower().strip()
            doi = str(paper.get("doi") or "").strip().lower()
            if doi and doi not in seen_dois:
                unique_papers.append(paper)
                seen_dois.add(doi)
                seen_titles.add(title_norm)
            elif title_norm and title_norm not in seen_titles:
                unique_papers.append(paper)
                seen_titles.add(title_norm)
        return unique_papers

    def search_papers(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10,
        memory: Any = None,
    ) -> List[Dict[str, Any]]:
        """
        Search academic papers via unified_search and normalize every result into
        a stable planner/runtime contract.
        """
        self._log_search_backend_status()
        logger.info("search_papers called: query=%r filters=%s limit=%s", query, filters, limit)

        if unified_search is None:
            logger.error("unified_search is unavailable in ResearchAgent.search_papers")
            return self._search_web_fallback(query=query, limit=limit, field=str((filters or {}).get("field") or "").strip())

        filters = filters or {}
        field = str(filters.get("field") or "").strip()
        year_from = filters.get("year_from")

        clean_query_words = self._tokenize_search_text(query)
        clean_query = " ".join(clean_query_words) or str(query)
        query_keywords = [keyword.lower() for keyword in clean_query_words]
        query_phrases = self._build_query_phrases(query, query_keywords, field=field)
        field_keywords = [keyword.lower() for keyword in self._tokenize_search_text(field)]

        try:
            raw_results = unified_search(
                query=clean_query,
                sources=['crossref', 'openalex', 'doaj', 'pubmed', 'eric'],
                year=year_from,
                limit=limit,
            )

            if not raw_results:
                logger.warning("search_papers found no academic results for query=%r; trying web fallback", query)
                return self._search_web_fallback(query=query, limit=limit, field=field)

            papers: List[Dict[str, Any]] = []
            logger.info(f"Query keywords: {query_keywords}, phrases: {query_phrases}, field_keywords: {field_keywords}")

            for item in raw_results:
                title = str(item.get('title') or 'No Title')
                title_lower = title.lower()
                abstract = str(item.get('abstract') or 'Abstract not available')
                abstract_lower = abstract.lower()
                combined_text = f"{title_lower} {abstract_lower}"

                phrase_hits_title = sum(1 for phrase in query_phrases if phrase in title_lower)
                phrase_hits_abstract = sum(1 for phrase in query_phrases if phrase in abstract_lower)
                phrase_hits_total = phrase_hits_title + phrase_hits_abstract

                title_hits = sum(1 for keyword in query_keywords if keyword in title_lower)
                abstract_hits = sum(1 for keyword in query_keywords if keyword in abstract_lower)
                unique_kws_found = sum(1 for keyword in query_keywords if keyword in combined_text)

                if query_keywords:
                    coverage = unique_kws_found / len(query_keywords)
                    if coverage < 0.4 and phrase_hits_total == 0 and title_hits == 0:
                        logger.info(f"Skipping paper (low relevance coverage={coverage:.2f}): {title[:60]}")
                        continue

                relevance = 0.3
                if query_keywords:
                    phrase_bonus = min(0.4, phrase_hits_total * 0.15)
                    kw_score = (title_hits * 2 + abstract_hits) / (len(query_keywords) * 3)
                    relevance = min(1.0, 0.3 + phrase_bonus + kw_score * 0.3)

                if field_keywords:
                    field_hits = sum(1 for keyword in field_keywords if keyword in combined_text)
                    field_bonus = min(0.1, field_hits * 0.05)
                    relevance = min(1.0, relevance + field_bonus)

                if relevance <= 0.5:
                    logger.info(f"Skipping paper (low relevance {relevance:.2f}): {title}")
                    continue

                source = self._infer_source(item)
                papers.append(
                    self._normalize_paper_result(
                        item=item,
                        query=query,
                        source=source,
                        relevance_score=relevance,
                        field=field,
                    )
                )

            normalized_results = self._dedupe_papers(papers)
            logger.info("search_papers result: %s papers", len(normalized_results))
            return normalized_results
        except Exception as error:
            logger.exception("search_papers failed for query=%r", query)
            fallback_results = self._search_web_fallback(query=query, limit=limit, field=field)
            logger.info("search_papers result after exception fallback: %s papers", len(fallback_results))
            return fallback_results

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
