# File: app/utils/search_utils.py
# Deskripsi: Kumpulan fungsi untuk mencari referensi dari database akademik.
# Status: FULL FIXED & OPTIMIZED (Support Limit Dinamis & Error Handling)

import os
import re
import requests
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from .general_utils import make_api_request_with_retry

def _parse_keywords(keywords_string):
    """
    Memecah string "a, b, c" menjadi format query yang valid.
    Contoh: "AI, Machine Learning" -> '"AI" OR "Machine Learning"'
    """
    if not keywords_string: return ""
    keywords = [k.strip() for k in keywords_string.split(',') if k.strip()]
    quoted_keywords = [f'"{k}"' for k in keywords]
    return " OR ".join(quoted_keywords)

# ==========================================
# 1. CORE API
# ==========================================
def search_core(keywords, year=None, limit=10):
    print(f"🔍 [CORE] Searching: {keywords} (Limit: {limit})")
    core_api_key = os.getenv('CORE_API_KEY')
    if not core_api_key: 
        print("⚠️ CORE_API_KEY tidak ditemukan.")
        return []

    parsed_query = _parse_keywords(keywords)
    query_parts = [f'title:({parsed_query}) OR abstract:({parsed_query})']
    
    if year:
        query_parts.append(f"yearPublished:>={year}")

    core_query = " AND ".join(query_parts)
    core_url = f"https://api.core.ac.uk/v3/search/works"
    params = {'q': core_query, 'limit': limit}
    headers = {"Authorization": f"Bearer {core_api_key}"}

    response = make_api_request_with_retry(core_url, headers=headers, params=params)
    if not response: return []
    
    results = []
    for item in response.json().get('results', []):
        authors = ", ".join([author['name'] for author in item.get('authors', [])])
        results.append({
            "id": f"core_{item.get('id')}",
            "title": item.get('title', 'N/A'),
            "author": authors,
            "year": item.get('yearPublished'),
            "journal": item.get('publisher'),
            "abstract": item.get('abstract', 'Abstrak tidak tersedia.'),
            "pdfUrl": item.get('downloadUrl'),
            "doi": item.get('doi')
        })
    return results

# ==========================================
# 2. CROSSREF API
# ==========================================
def search_crossref(keywords, year=None, limit=10):
    print(f"🔍 [Crossref] Searching: {keywords} (Limit: {limit})")
    base_url = 'https://api.crossref.org/works'
    
    params = {'query.bibliographic': keywords, 'rows': limit, 'sort': 'relevance'}
    if year:
        params['filter'] = f'from-pub-date:{year}-01-01'

    headers = {'User-Agent': 'OnThesisApp/1.0 (mailto:dev@onthesis.app)'}
    response = make_api_request_with_retry(base_url, headers=headers, params=params)
    if not response: return []

    results = []
    for item in response.json().get('message', {}).get('items', []):
        authors_list = item.get('author', [])
        authors = ", ".join([f"{a.get('family', '')}, {a.get('given', '')[0]}." for a in authors_list if a.get('family') and a.get('given')])
        
        # Safe Date Extraction
        date_parts = item.get('issued', {}).get('date-parts', [[None]])
        pub_year = date_parts[0][0] if date_parts else None
        
        pdf_link = next((l['URL'] for l in item.get('link', []) if l.get('content-type') == 'application/pdf'), None)
        
        # Bersihkan abstrak dari tag XML/HTML
        raw_abstract = item.get('abstract', '') or 'Abstrak tidak tersedia.'
        clean_abstract = re.sub('<[^<]+?>', '', raw_abstract)

        results.append({
            "id": f"crossref_{item.get('DOI')}",
            "title": item.get('title', ['N/A'])[0],
            "author": authors,
            "year": pub_year,
            "journal": item.get('container-title', ['N/A'])[0],
            "abstract": clean_abstract,
            "pdfUrl": pdf_link,
            "doi": item.get('DOI')
        })
    return results

# ==========================================
# 3. OPENALEX API (Fixed NoneType Error)
# ==========================================
def search_openalex(keywords, year=None, limit=10):
    print(f"🔍 [OpenAlex] Searching: {keywords} (Limit: {limit})")
    base_url = "https://api.openalex.org/works"
    filters = [f"default.search:{keywords}"]
    if year:
        filters.append(f"publication_year:>={year}")
        
    params = {'filter': ",".join(filters), 'per-page': limit}
    headers = {'User-Agent': 'support@onthesis.app'} 
    
    response = make_api_request_with_retry(base_url, headers=headers, params=params)
    if not response: return []

    results = []
    for item in response.json().get('results', []):
        authors = [a['author']['display_name'] for a in item.get('authorships', [])]
        
        # Reconstruct Abstract from Inverted Index
        abstract = ""
        if item.get('abstract_inverted_index'):
            inv_index = item['abstract_inverted_index']
            word_positions = []
            for word, positions in inv_index.items():
                for pos in positions:
                    word_positions.append((pos, word))
            abstract = ' '.join([word for pos, word in sorted(word_positions)])

        # Handle NoneType safely
        primary_loc = item.get('primary_location') or {}
        source = primary_loc.get('source') or {}

        results.append({
            "id": item.get('id'),
            "title": item.get('display_name', 'N/A'),
            "author": ", ".join(authors),
            "year": item.get('publication_year'),
            "journal": source.get('display_name'),
            "abstract": abstract or 'Abstrak tidak tersedia.',
            "pdfUrl": primary_loc.get('pdf_url'),
            "doi": (item.get('doi') or '').replace('https://doi.org/', '')
        })
    return results

# ==========================================
# 4. DOAJ API (Fixed 404 URL Error)
# ==========================================
def search_doaj(keywords, year=None, limit=10):
    print(f"🔍 [DOAJ] Searching: {keywords} (Limit: {limit})")
    
    # DOAJ v2 Search Endpoint requires encoded query in URL path
    encoded_query = urllib.parse.quote(keywords)
    base_url = f"https://doaj.org/api/v2/search/articles/{encoded_query}"
    
    params = {'pageSize': limit}
    
    response = make_api_request_with_retry(base_url, headers={}, params=params)
    if not response: return []

    results = []
    for item in response.json().get('results', []):
        bibjson = item.get('bibjson', {})
        authors = [a['name'] for a in bibjson.get('author', [])]
        pdf_link = next((l['url'] for l in bibjson.get('link', []) if l.get('type') == 'fulltext'), None)
        
        results.append({
            "id": f"doaj_{item.get('id')}",
            "title": bibjson.get('title', 'N/A'),
            "author": ", ".join(authors),
            "year": bibjson.get('year'),
            "journal": bibjson.get('journal', {}).get('title'),
            "abstract": bibjson.get('abstract', 'Abstrak tidak tersedia.'),
            "pdfUrl": pdf_link,
            "doi": next((i['id'] for i in bibjson.get('identifier', []) if i.get('type') == 'doi'), None)
        })
    return results

# ==========================================
# 5. ERIC API
# ==========================================
def search_eric(keywords, year=None, limit=10):
    print(f"🔍 [ERIC] Searching: {keywords} (Limit: {limit})")
    base_url = "https://api.ies.ed.gov/eric/"
    
    search_term = keywords.replace(",", " AND ")
    if year:
        search_term += f"&publicationdate_from={year}"
        
    params = {'search': search_term, 'rows': limit, 'format': 'json'}
    response = make_api_request_with_retry(base_url, headers={}, params=params)
    if not response: return []

    results = []
    for item in response.json().get('response', {}).get('docs', []):
        results.append({
            "id": f"eric_{item.get('id')}",
            "title": item.get('title', 'N/A'),
            "author": ", ".join(item.get('author', [])),
            "year": item.get('publicationdateyear'),
            "journal": item.get('source'),
            "abstract": item.get('description', 'Abstrak tidak tersedia.'),
            "pdfUrl": item.get('url') if 'pdf' in item.get('url', '') else None,
            "doi": None
        })
    return results

# ==========================================
# 6. PUBMED API
# ==========================================
def search_pubmed(keywords, year=None, limit=10):
    print(f"🔍 [PubMed] Searching: {keywords} (Limit: {limit})")
    api_key = os.getenv("PUBMED_API_KEY")
    if not api_key: 
        print("⚠️ PUBMED_API_KEY tidak ditemukan.")
        return []
    
    term = keywords.replace(",", " AND ")
    if year:
        term += f" AND (\"{year}\"[Date - Publication] : \"3000\"[Date - Publication])"

    base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
    
    # Step 1: Search IDs
    search_url = f"{base_url}esearch.fcgi"
    params = {'db': 'pubmed', 'term': term, 'retmax': limit, 'retmode': 'json', 'api_key': api_key}
    search_response = make_api_request_with_retry(search_url, headers={}, params=params)
    if not search_response: return []

    ids = search_response.json().get('esearchresult', {}).get('idlist', [])
    if not ids: return []

    # Step 2: Get Details
    summary_url = f"{base_url}esummary.fcgi"
    params = {'db': 'pubmed', 'id': ",".join(ids), 'retmode': 'json', 'api_key': api_key}
    summary_response = make_api_request_with_retry(summary_url, headers={}, params=params)
    if not summary_response: return []

    results = []
    for uid, data in summary_response.json().get('result', {}).items():
        if uid == 'uids': continue

        authors = [a['name'] for a in data.get('authors', [])]
        doi = next((x['value'] for x in data.get('articleids', []) if x.get('idtype') == 'doi'), None)

        results.append({
            "id": f"pubmed_{uid}",
            "title": data.get('title', 'N/A'),
            "author": ", ".join(authors),
            "year": data.get('pubdate', '').split(' ')[0],
            "journal": data.get('source'),
            "abstract": "Abstrak tidak tersedia di summary PubMed. Cek DOI.",
            "pdfUrl": None,
            "doi": doi
        })
    return results

# ==========================================
# MAIN UNIFIED SEARCH (Threaded)
# ==========================================
def unified_search(query, sources=None, year=None, limit=10):
    """
    Menjalankan pencarian terpadu ke berbagai sumber secara paralel.
    Menerima parameter 'limit' untuk menentukan jumlah hasil per sumber.
    """
    if not sources:
        sources = ['crossref', 'openalex', 'doaj'] 

    all_references = []
    
    search_functions = {
        'core': search_core,
        'crossref': search_crossref,
        'openalex': search_openalex,
        'doaj': search_doaj,
        'eric': search_eric,
        'pubmed': search_pubmed,
    }

    # Execute in Parallel
    with ThreadPoolExecutor(max_workers=len(sources)) as executor:
        future_to_source = {}
        for source in sources:
            if source in search_functions:
                # Pass query, year, AND LIMIT to each function
                future = executor.submit(search_functions[source], query, year, limit)
                future_to_source[future] = source
        
        for future in future_to_source:
            source = future_to_source[future]
            try:
                result_data = future.result()
                if result_data:
                    all_references.extend(result_data)
            except Exception as exc:
                print(f'❌ Error in {source}: {exc}')

    # Deduplicate Results (Based on DOI or Title)
    unique_references = []
    seen_identifiers = set()
    
    for ref in all_references:
        title_norm = re.sub(r'\W+', '', (ref.get('title') or '').lower())
        identifier = ref.get('doi') or title_norm[:50] 
        
        if identifier and identifier not in seen_identifiers:
            unique_references.append(ref)
            seen_identifiers.add(identifier)
            
    print(f"✅ Total Unique Results: {len(unique_references)}")
    return unique_references

# ==========================================
# 7. SNOWBALLING UTILS (GET CITATIONS & REFERENCES)
# ==========================================
def get_openalex_related(doi, limit=10):
    """
    Mencari paper yang berhubungan (Snowballing):
    1. References (Paper yang dikutip oleh paper ini)
    2. Cited By (Paper yang mengutip paper ini)
    """
    print(f"🕸️ [Snowball] Expanding DOI: {doi}")
    
    # Bersihkan DOI
    clean_doi = doi.replace('https://doi.org/', '').strip()
    if not clean_doi: return []

    base_url = "https://api.openalex.org/works"
    headers = {'User-Agent': 'support@onthesis.app'}
    
    # 1. Cari ID OpenAlex dari DOI dulu
    try:
        lookup_resp = requests.get(f"{base_url}/https://doi.org/{clean_doi}", headers=headers)
        if lookup_resp.status_code != 200: return []
        work_data = lookup_resp.json()
        openalex_id = work_data.get('id') # Format: https://openalex.org/W123456...
    except:
        return []

    related_papers = []

    # 2. Ambil REFERENCES (Paper yg dipakai)
    # OpenAlex menyediakan URL 'referenced_works' tapi isinya cuma ID.
    # Kita cari paper yang ID-nya ada di daftar referensi paper ini.
    # Cara efisien: filter=cites:<openalex_id> (mencari yg mensitasi ini)
    # filter=referenced_works:<openalex_id> (mencari yg disitasi ini - agak tricky di OpenAlex API basic)
    
    # STRATEGI SIMPEL: Ambil 'related_works' (rekomendasi OpenAlex) + 'cites' (yg mengutip)
    
    # A. Ambil Paper yang MENGUTIP ini (Cited By) -> Future Research
    params_cited = {
        'filter': f'cites:{openalex_id}',
        'per-page': limit,
        'sort': 'relevance_score:desc'
    }
    resp_cited = requests.get(base_url, headers=headers, params=params_cited)
    if resp_cited.status_code == 200:
        for item in resp_cited.json().get('results', []):
            related_papers.append(_parse_openalex_item(item, "cited_by"))

    # B. Ambil Paper yang TERKAIT (Related Works - Algoritma OpenAlex)
    # Ini biasanya pengganti 'references' yang lebih cerdas
    related_url = work_data.get('related_works_url')
    if related_url:
        resp_related = requests.get(related_url, headers=headers) # Biasanya balik list ID
        # Kalau formatnya list ID, kita harus fetch detailnya. 
        # Untuk MVP, kita pakai filter 'related_to' saja kalau didukung, atau skip complexity ini.
        # Kita ganti strategi: Ambil dari 'referenced_works' list (IDs)
        ref_ids = work_data.get('referenced_works', [])[:limit] # Ambil 5-10 aja
        if ref_ids:
            # Fetch detail batch (filter=openalex_id:A|B|C)
            ids_str = "|".join(ref_ids)
            resp_refs = requests.get(base_url, headers=headers, params={'filter': f'openalex_id:{ids_str}'})
            if resp_refs.status_code == 200:
                for item in resp_refs.json().get('results', []):
                    related_papers.append(_parse_openalex_item(item, "reference"))

    return related_papers

def _parse_openalex_item(item, relation_type):
    """Helper untuk format data OpenAlex jadi standar Graph"""
    authors = [a['author']['display_name'] for a in item.get('authorships', [])]
    
    # Abstract logic
    abstract = ""
    if item.get('abstract_inverted_index'):
        inv_index = item['abstract_inverted_index']
        word_positions = []
        for word, positions in inv_index.items():
            for pos in positions: word_positions.append((pos, word))
        abstract = ' '.join([word for pos, word in sorted(word_positions)])

    primary_loc = item.get('primary_location') or {}
    source = primary_loc.get('source') or {}

    return {
        "id": item.get('id'),
        "title": item.get('display_name', 'N/A'),
        "author": ", ".join(authors),
        "year": item.get('publication_year'),
        "journal": source.get('display_name'),
        "abstract": abstract or 'Abstrak tidak tersedia.',
        "pdfUrl": primary_loc.get('pdf_url'),
        "doi": (item.get('doi') or '').replace('https://doi.org/', ''),
        "relation": relation_type # 'cited_by' atau 'reference'
    }

# app/utils/search_utils.py
import re # Pastikan import re di paling atas file

def _format_paper_data(item):
    # 1. Parsing Abstract (Sama kayak sebelumnya)
    abstract_text = ""
    if item.get('abstract_inverted_index'):
        try:
            inv_index = item['abstract_inverted_index']
            word_positions = []
            for word, positions in inv_index.items():
                for pos in positions: word_positions.append((pos, word))
            abstract_text = ' '.join([word for pos, word in sorted(word_positions)])
        except: pass

    # 2. Parsing Authors
    authors = [a.get('author', {}).get('display_name') for a in item.get('authorships', []) if a.get('author', {}).get('display_name')]
    authors_str = ", ".join(authors[:3])

    # --- 3. AGGRESSIVE DOI PARSING (FIX UTAMA) ---
    clean_doi = ""
    doi_url = ""
    
    # Coba ambil langsung
    raw_doi = item.get('doi')
    
    # Kalau kosong, coba cari di 'ids' (OpenAlex sering taruh sini)
    if not raw_doi and item.get('ids'):
        raw_doi = item['ids'].get('doi')

    # Kalau masih kosong, coba regex dari landing page URL
    if not raw_doi:
        loc = item.get('primary_location', {}) or {}
        url = loc.get('landing_page_url', '')
        # Regex cari pola 10.xxxx/yyyy
        match = re.search(r'(10\.\d{4,9}/[-._;()/:A-Z0-9]+)', url, re.IGNORECASE)
        if match:
            raw_doi = match.group(1)

    if raw_doi:
        # Bersihkan prefix
        clean_doi = raw_doi.replace('https://doi.org/', '').replace('http://doi.org/', '').strip()
        doi_url = f"https://doi.org/{clean_doi}"

    # 4. PDF Parsing
    pdf_url = item.get('primary_location', {}).get('pdf_url') or item.get('best_oa_location', {}).get('pdf_url')

    return {
        "id": item.get('id'),
        "title": item.get('display_name', 'No Title'),
        "authors": authors_str or "Unknown",
        "year": item.get('publication_year'),
        "journal": item.get('primary_location', {}).get('source', {}).get('display_name', 'Jurnal'),
        "abstract": abstract_text or "Tidak ada abstrak.",
        
        # Field Kunci
        "doi": clean_doi, 
        "doiUrl": doi_url,
        "pdfUrl": pdf_url,
        "val": item.get('cited_by_count', 0),
        "group": "result"
    }

