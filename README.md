<div align="center">
  <img src="https://via.placeholder.com/150x150/0f172a/38bdf8?text=OnThesis" alt="OnThesis AI Agent Workspace Logo" width="120" />
</div>

<h1 align="center">OnThesis AI Agent Workspace</h1>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black" alt="React 18" />
  <img src="https://img.shields.io/badge/Flask-3.x-000000?style=flat&logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white" alt="Python 3.10+" />
  <img src="https://img.shields.io/badge/Gemini_2.5-Enabled-4B8BBE?style=flat&logo=google&logoColor=white" alt="Gemini Enabled" />
  <img src="https://img.shields.io/badge/Architecture-Multi--Agent-FF6B6B?style=flat" alt="Multi-Agent Architecture" />
  <img src="https://img.shields.io/badge/Status-Active-brightgreen?style=flat" alt="Status Active" />
</p>

<p align="center">
  <strong>Platform Riset dan Penulisan Skripsi Bertenaga AI Pertama untuk Mahasiswa Indonesia</strong><br>
  Context-Aware • Multi-Agent Pipeline • Data Analysis Suite • Citation Manager
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#key-features">Features</a> •
  <a href="#system-architecture">Architecture</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a>
</p>

---

## 📖 Overview

**OnThesis AI** bukan sekadar "chatbot yang kebetulan bisa nulis", melainkan **Sistem Kerja Skripsi** (Thesis Workspace) berbasis AI Agen yang membaca konteks secara berkesinambungan. Dirancang khusus dengan memperhatikan ritme akademik mahasiswa Indonesia—mulai dari *drafting* awal, revisi bersama dosen pembimbing, interpretasi data statistik, hingga penyiapan sidang.

Sistem ini memfasilitasi perjalanan penyusunan skripsi, tesis, dan tugas akhir melalui antarmuka *live workspace* beraliran modern (Glassmorphism), dengan agent runtime yang memadukan logika *writing*, *analysis*, dan *academic proofing*.

## ✨ Key Features

### 1. 🤖 Context-Aware Writing Studio
* **Project-Aware Drafting:** AI Agent membaca *chapter* aktif, judul, target metodologi, referensi, dan progres agar tidak menggenerasikan narasi dari nol dan menghindari miskonteks (halusinasi).
* **Review Diff & Approval System:** Setiap narasi yang disarankan oleh Writing Agent dirender ke dalam antarmuka perbandingan (Diff Viewer) sebelum di-*insert* ke dokumen final. Pengguna pegang kendali penuh atas perubahan.
* **Lexical Rich Text Editor:** Workspace penulisan stabil dan responsif dari draft Bab 1 hingga Bab 5.

### 2. 📊 Data Analysis Suite
* **Modern Data Grid:** Upload dataset (Excel/CSV) dan eksploitasi data setara *high-end tools* (SPSS flow) tanpa keluar browser.
* **Statistical Flow:** Mendukung *Descriptive Analysis*, *Frequency*, *Normality*, *T-Test*, *ANOVA*, *Correlation*, *Regression*, hingga parameter lanjutan.
* **Instant Interpretation:** Output statistik langsung ditarik oleh Analysis Agent menjadi kalimat *insight* akademik siap *copy-paste* ke halaman pembahasan.

### 3. 📚 Academic Verification Pipeline
* **OpenAlex Integration:** Pengecekan otomatis dan auto-search sitasi menggunakan ribuan basis data literatur *open-source*. Validasi eksistensi sumber secara *real-time*.
* **Smart Paraphraser:** Parafrase teks akademik dengan menjaga nuansa *formal* serta menghindari flag plagiarisme yang kaku.
* **Thesis Graph & Defense Prep:** Pemetakan relasi (*graph*) antara masalah, teori, dan kesimpulan menggunakan `ReactFlow` untuk melatih alur nalar sidang.

### 4. 🌙 Adaptive UI/UX & Theming
* Theme Selector: **Dark**, **Light**, dan **Happy** (Tropical Oasis). UI berkonsep *Glassmorphism*, gradasi warna presisi (orb & sweeps), serta topografi modern.

---

## 🏗️ System Architecture

Proyek ini dibangun di atas arsitektur *Supervisor-Worker* yang terpisah antara Backend (Python) dan Frontend SPA (React).

1. **Supervisor Agent:** Merutekan kehendak pengguna (intent) ke sub-agent yang relevan.
2. **Writing Agent:** Bertanggung jawab memproduksi teks panjang berstruktur metodologi.
3. **Research/Diagnostic Agent:** Menghubungi Vector DB dan OpenAlex API untuk mengambil referensi sitasi dan memverifikasi klaim akademik.
4. **Analysis Agent:** Mencerna struktur JSON JSON dari dataset dan mengubahnya jadi *Executive Summary* statistik.
5. **Memory System:** Redis (Short-term context) & Qdrant DB (Long-term vector memory).

---

## 💻 Tech Stack

### Frontend (SPA)
* **Framework:** React 18, Vite, TypeScript
* **Styling:** Tailwind CSS, Framer Motion, Vanilla CSS Modules
* **State Management:** Zustand
* **Editor & Graph:** Lexical, ReactFlow (xyflow)
* **Charts & Tables:** Ag-Grid, Chart.js / Recharts
* **WebSockets:** Socket.io-client

### Backend & AI
* **Framework:** Python 3.10+, Flask, Gevent (WebSockets server)
* **AI Pipelines:** Google Gemini 2.5 / OpenAI GPT-4o 
* **Data Retrieval:** OpenAlex REST API
* **Database & Memory:** 
  * **Redis** (Conversations, Job Queue, Rate Limits)
  * **Qdrant** (Vector Database untuk Document Embedding)

---

## 🚀 Getting Started

Proyek berbentuk *Monorepo*, dipisah antara direktori root (Backend) dan `frontend_spa` (Frontend). Pastikan Anda telah menginstal Node.js v18+, Python 3.10+, dan Redis.

### 1. Clone & Configuration
```bash
git clone https://github.com/onthesis10/onthesis-ai-v2.git
cd onthesis-ai-v2
```

Siapkan environment variables backend:
```bash
cp .env.example .env
```
Isi konfigurasi kunci di `.env`:
```env
LLM_API_KEY="your_ai_api_key_here"
OPENALEX_EMAIL="your_email@example.com"
REDIS_URL="redis://localhost:6379/0"
FLASK_SECRET_KEY="your_secret_key"
```

### 2. Backend Setup
Gunakan Virtual Environment untuk mengisolasi instalasi Python.
```bash
# Buat dan aktifkan Venv
python -m venv venv
source venv/Scripts/activate     # Windows
# source venv/bin/activate       # Mac/Linux

# Instalasi dependencies (Termasuk requirements agen AI)
pip install -r requirements.txt

# Menjalankan server (Flask + Gevent-WebSocket)
python run.py
```
> Server akan berjalan di port `http://localhost:5000`

### 3. Frontend Setup
Buka tab terminal baru.
```bash
cd frontend_spa

# Install module NPM besar (Lexical, Ag-Grid, xyflow)
npm install

# Menjalankan dev server Vite
npm run dev
```
> Frontend akan berjalan di port `http://localhost:5173`

---

## 🛠️ Testing & Workflows
* Backend Agents test run: `pytest tests/ -v`
* Frontend E2E tests: `npm run test:e2e` (Playwright)

## 📌 Development Roadmap
Lihat progress pengembangan dan pemenuhan *Sprint Blueprint* pada dokumen `ROADMAP.md` dan `ONTHESIS_SPRINT_68_TO_100.md`.

<div align="center">
  <p>&copy; 2026 OnThesis. Designed and built to elevate academic research rhythms.</p>
</div>
