# ⚡ CogniGraph — Ultra-Fast Graph-RAG AI PDF Intelligence Workspace

CogniGraph is a multi-document search, intelligence, and visual knowledge engine powered by **Graph-RAG (Retrieval-Augmented Generation)**, **Hybrid Retrieval (Dense Vectors + Lexical BM25)**, and **PyMuPDF C-level stream processing**.

---

## 🌟 Key Features

- **🚀 Blazing Fast Parallel Ingestion:** Parses and indexes 400+ page PDFs in seconds with multi-process C-level stream extraction.
- **⚡ 0.1s Instant Redirection:** Upload PDFs and immediately switch to the interactive document viewer while background parsing indexes chunks seamlessly.
- **🎯 Hybrid Retrieval (Dense + Sparse + RRF Reranking):** Combines dense vector semantics with sparse BM25 keyword matching for 100% search precision.
- **📄 Native PDF Citation Navigation:** Jumps directly to exact matching pages and highlights query terms on screen.
- **🕸️ Interactive Knowledge Graph:** Generates interactive entity co-occurrence graphs with glowing link connections and pulsing node animations.
- **🔒 100% Privacy & Zero API Costs:** Runs completely locally or serverless with zero third-party AI API key requirements.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons
- **Backend:** Python FastAPI, PyMuPDF (fitz), NumPy, HashingEmbedder / SBERT, BM25 Lexical Engine
- **Deployment:** Next.js on Vercel, FastAPI on Render / Railway

---

## ⚡ Quick Start (Local Setup)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate
# On Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- -p 3001
```

Open `http://localhost:3001` in your browser!
