"""
web_search_tool.py — Live Web Search Agent for OnThesis

Provides real-time internet search capabilities:
  - search_web(query): DuckDuckGo HTML search (no API key needed)
  - search_google_scholar(query): Google Scholar scraping
  - fetch_url_text(url): Fetch and strip HTML from a URL

All methods return structured data that can be used by other agents.
"""

import os
import re
import logging
import time
from typing import Dict, Any, List, Optional
from urllib.parse import urlencode, quote_plus

logger = logging.getLogger(__name__)

# Academic domain whitelist for search result filtering
ACADEMIC_DOMAINS = [
    "scholar.google",
    "arxiv.org",
    "pubmed.ncbi.nlm.nih.gov",
    "sciencedirect.com",
    "researchgate.net",
    "academia.edu",
    "semantic scholar.org",
    "semanticscholar.org",
    "jstor.org",
    "springer.com",
    "wiley.com",
    "tandfonline.com",
    "plos.org",
    "biorxiv.org",
    "ssrn.com",
    "ieeexplore.ieee.org",
    "dl.acm.org",
    "ncbi.nlm.nih.gov",
    "europepmc.org",
    "core.ac.uk",
    "doaj.org",
    "mdpi.com",
    "frontiersin.org",
]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Accept": "text/html,application/xhtml+xml",
}


class WebSearchAgent:
    """
    Agent for live web search, focused on academic content.
    No API key required for DuckDuckGo search.
    """

    def __init__(self):
        self.timeout = int(os.environ.get("WEB_SEARCH_TIMEOUT", "10"))
        self.max_results = int(os.environ.get("WEB_SEARCH_MAX_RESULTS", "5"))

    def _get_requests(self):
        """Lazy import for requests to avoid issues at module load time."""
        import requests
        return requests

    def _get_bs4(self):
        """Lazy import for BeautifulSoup."""
        from bs4 import BeautifulSoup
        return BeautifulSoup

    def search_web(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """
        DuckDuckGo HTML search — returns list of {title, url, snippet}.
        No API key required.
        """
        requests = self._get_requests()
        results = []
        try:
            # DuckDuckGo HTML endpoint
            url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
            resp = requests.get(url, headers=HEADERS, timeout=self.timeout)
            resp.raise_for_status()

            BeautifulSoup = self._get_bs4()
            soup = BeautifulSoup(resp.text, "html.parser")

            for result in soup.select(".result")[:num_results * 2]:
                title_el = result.select_one(".result__title")
                url_el = result.select_one(".result__url")
                snippet_el = result.select_one(".result__snippet")

                if not (title_el and url_el):
                    continue

                title = title_el.get_text(strip=True)
                raw_url = url_el.get_text(strip=True)
                snippet = snippet_el.get_text(strip=True) if snippet_el else ""

                # Normalize URL
                if not raw_url.startswith("http"):
                    raw_url = "https://" + raw_url

                results.append({
                    "title": title,
                    "url": raw_url,
                    "snippet": snippet,
                    "source": "duckduckgo",
                })

                if len(results) >= num_results:
                    break

            logger.info(f"| WebSearch | DuckDuckGo returned {len(results)} results for: {query[:60]}")
        except Exception as e:
            logger.warning(f"| WebSearch | DuckDuckGo search failed: {e}")

        return results

    def search_academic(self, query: str, num_results: int = 5) -> List[Dict[str, str]]:
        """
        Search OpenAlex API for academic papers.
        Falls back to general DuckDuckGo search if OpenAlex returns 0 results or fails.
        """
        requests = self._get_requests()
        results = []
        try:
            url = "https://api.openalex.org/works"
            params = {
                "search": query,
                "mailto": "admin@onthesis.com",
                "per-page": num_results
            }
            resp = requests.get(url, params=params, timeout=self.timeout)
            resp.raise_for_status()
            
            data = resp.json()
            for item in data.get("results", []):
                title = item.get("title")
                if not title:
                    continue
                
                # Minta URL terbaik
                url = ""
                if item.get("open_access", {}).get("is_oa") and item.get("open_access", {}).get("oa_url"):
                    url = item["open_access"]["oa_url"]
                elif item.get("doi"):
                    url = item["doi"]
                elif item.get("primary_location", {}).get("landing_page_url"):
                    url = item["primary_location"]["landing_page_url"]
                else:
                    url = f"https://openalex.org/{item.get('id')}"
                
                # Ambil authors
                authors = [a.get("author", {}).get("display_name", "") for a in item.get("authorships", [])]
                author_str = ", ".join(filter(None, authors))
                year = item.get("publication_year", "")
                
                # Rekonstruksi Abstrak
                snippet = "Tidak ada abstrak."
                abstract_inverted = item.get("abstract_inverted_index")
                if abstract_inverted:
                    try:
                        max_idx = max([max(pos) for pos in abstract_inverted.values() if pos]) + 1
                        words = [""] * max_idx
                        for word, positions in abstract_inverted.items():
                            for pos in positions:
                                words[pos] = word
                        snippet = " ".join(words)
                        if len(snippet) > 500:
                            snippet = snippet[:497] + "..."
                    except Exception as e:
                        logger.warning(f"| WebSearch | Gagal parsing abstract inverted index: {e}")
                
                results.append({
                    "title": title,
                    "url": url,
                    "snippet": snippet,
                    "authors": author_str,
                    "year": str(year),
                    "source": "openalex",
                })
            
            logger.info(f"| WebSearch | OpenAlex returned {len(results)} results for: {query[:60]}")
        except Exception as e:
            logger.warning(f"| WebSearch | OpenAlex search failed: {e}")
        
        # Fallback to general web search
        if not results:
            logger.info(f"| WebSearch | Falling back to DuckDuckGo for: {query[:60]}")
            results = self.search_web(query, num_results=num_results)

        return results

    def fetch_url_text(self, url: str, max_chars: int = 4000) -> str:
        """
        Fetch a URL and return plaintext (stripped HTML).
        Max chars to prevent oversized context injection.
        """
        requests = self._get_requests()
        try:
            resp = requests.get(url, headers=HEADERS, timeout=self.timeout)
            resp.raise_for_status()

            BeautifulSoup = self._get_bs4()
            soup = BeautifulSoup(resp.text, "html.parser")

            # Remove script and style tags
            for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
                tag.decompose()

            # Try to get main content
            main = soup.find("main") or soup.find("article") or soup.find("body")
            text = main.get_text(separator=" ", strip=True) if main else soup.get_text(separator=" ", strip=True)

            # Normalize whitespace
            text = re.sub(r"\s+", " ", text).strip()
            return text[:max_chars]
        except Exception as e:
            logger.warning(f"| WebSearch | fetch_url_text failed for {url}: {e}")
            return f"[Tidak dapat mengakses konten dari URL: {url}. Error: {e}]"

    def search_and_summarize(
        self,
        query: str,
        num_results: int = 4,
        academic_only: bool = False,
    ) -> Dict[str, Any]:
        """
        Convenience method: search + fetch snippet content, return structured result.
        Used by task_planner's web_search plan.
        """
        results = self.search_academic(query, num_results) if academic_only else self.search_web(query, num_results)

        formatted = []
        for i, r in enumerate(results, 1):
            meta = ""
            if r.get("source") == "openalex":
                meta = f"Penulis: {r.get('authors', 'Unknown')} ({r.get('year', 'Unknown')})\n"
                
            formatted.append(
                f"[{i}] **{r.get('title', 'Unknown')}**\n"
                f"{meta}"
                f"URL: {r.get('url', '')}\n"
                f"Ringkasan: {r.get('snippet', 'Tidak ada ringkasan.')}\n"
            )

        return {
            "query": query,
            "num_results": len(results),
            "results": results,
            "formatted_text": "\n".join(formatted) if formatted else "Tidak ada hasil yang ditemukan.",
        }

    # ═══════════════════════════════════════════════════════════════
    # Standard Executor Interface
    # ═══════════════════════════════════════════════════════════════

    def run_tool(
        self,
        tool_name: str,
        input_data: Any,
        params: Dict[str, Any],
        memory: Any = None,
        **kwargs,
    ) -> Any:
        """Standard interface called by PlanExecutor."""
        tools_map = {
            "search_web": self._dispatch_search_web,
            "search_academic": self._dispatch_search_academic,
            "fetch_url_text": self._dispatch_fetch_url,
            "search_and_summarize": self._dispatch_summarize,
        }

        if tool_name not in tools_map:
            raise ValueError(f"Tool '{tool_name}' not found in WebSearchAgent. Available: {list(tools_map)}")

        try:
            return tools_map[tool_name](input_data, params, memory)
        except Exception as e:
            logger.error(f"| WebSearchAgent | Error in '{tool_name}': {e}")
            return {"error": str(e), "partial": True}

    # ── Dispatch Helpers ─────────────────────────────────────────

    def _dispatch_search_web(self, input_data, params, memory):
        query = str(input_data)
        num = int(params.get("num_results", self.max_results))
        results = self.search_web(query, num_results=num)
        return {
            "query": query,
            "results": results,
            "formatted_text": "\n".join(
                f"[{i}] {r['title']}\n{r['url']}\n{r['snippet']}"
                for i, r in enumerate(results, 1)
            ),
        }

    def _dispatch_search_academic(self, input_data, params, memory):
        query = str(input_data)
        num = int(params.get("num_results", self.max_results))
        results = self.search_academic(query, num_results=num)
        return {
            "query": query,
            "results": results,
            "formatted_text": "\n".join(
                f"[{i}] {r['title']}\n{r['url']}\n{r['snippet']}"
                for i, r in enumerate(results, 1)
            ),
        }

    def _dispatch_fetch_url(self, input_data, params, memory):
        url = str(input_data)
        max_chars = int(params.get("max_chars", 4000))
        text = self.fetch_url_text(url, max_chars=max_chars)
        return {"url": url, "text": text}

    def _dispatch_summarize(self, input_data, params, memory):
        query = str(input_data)
        num = int(params.get("num_results", self.max_results))
        academic = bool(params.get("academic_only", False))
        return self.search_and_summarize(query, num_results=num, academic_only=academic)
