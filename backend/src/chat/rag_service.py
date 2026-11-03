# backend/src/chat/rag_service.py
"""
Local-First RAG Service powered by ChromaDB, FastEmbed ONNX, and Local Ollama LLM.
Retrieves from 19,712 clinical vectors and synthesizes answers using:
1. Local Ollama LLM (Default - qwen2.5:7b, qwen2.5:1.5b, llama3.2, etc.)
2. Cloud Gemini LLM (Optional fallback when enabled)
3. Offline Structured Clinical Synthesis (When no LLM daemon is active)
"""

import json
import os
import requests
from typing import Dict, Generator, List, Optional, Tuple
from langchain_core.documents import Document

try:
    from backend.config import Config
    from backend.src.common.vectorstore import get_vector_store
    from backend.src.common.formatter import format_clinical_text
    from backend.src.common.prompts import SYSTEM_PROMPT, FALLBACK_PROMPT, MEDICAL_DISCLAIMER
except ImportError:
    from backend.config import Config
    from src.common.vectorstore import get_vector_store
    from src.common.formatter import format_clinical_text
    from src.common.prompts import SYSTEM_PROMPT, FALLBACK_PROMPT, MEDICAL_DISCLAIMER

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
LIGHTWEIGHT_PREFERENCES = ["llama3.2:1b", "qwen2.5-coder:1.5b", "llama3.2:3b", "qwen2.5:7b"]



class RAGService:
    """Manages local ChromaDB vector retrieval, citation extraction, and clinical synthesis."""

    def __init__(self):
        self.vector_store = None
        self._init_store()

    def _init_store(self):
        try:
            self.vector_store = get_vector_store()
            print(f"[rag] ChromaDB Vector Store active with {self.vector_store.count():,} clinical vectors.")
        except Exception as e:
            print(f"[rag] Error initializing ChromaDB: {e}")

    def _stream_ollama(
        self, prompt: str, system_prompt: str, citations: List[Dict]
    ) -> Generator[Dict, None, None]:
        """Streams response tokens from local Ollama LLM daemon."""
        url = f"{OLLAMA_HOST}/api/generate"
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "system": system_prompt,
            "stream": True,
            "options": {"temperature": 0.2},
        }

        first_chunk = True
        try:
            res = requests.post(url, json=payload, stream=True, timeout=(3.0, 60.0))
            if res.status_code == 200:
                for line in res.iter_lines():
                    if line:
                        chunk_data = json.loads(line)
                        token = chunk_data.get("response", "")
                        if first_chunk:
                            yield {"token": token, "citations": citations}
                            first_chunk = False
                        else:
                            yield {"token": token}
                        if chunk_data.get("done", False):
                            break
                return
        except Exception as e:
            print(f"[rag] Ollama inference error ({e}). Falling back to local clinical synthesis...")

    def query(
        self, query_text: str, history: Optional[List] = None
    ) -> Generator[Dict, None, None]:
        """
        Executes similarity search against ChromaDB.
        Yields structured tokens and citation objects.
        """
        if not self.vector_store:
            yield {
                "token": "Clinical knowledge base is initializing. Please try again in a moment.",
                "citations": [],
            }
            return

        # 1. Similarity Search with Threshold (0.65)
        results: List[Tuple[Document, float]] = self.vector_store.similarity_search_with_score(
            query_text, k=3, score_threshold=0.65
        )

        # 2. Extract structured citations & format clinical context
        citations = []
        cleaned_blocks = []

        for doc, score in results:
            book = doc.metadata.get("book_title", doc.metadata.get("source", "Medical Reference"))
            page = doc.metadata.get("page", "N/A")
            raw_content = doc.page_content.strip()
            formatted_content = format_clinical_text(raw_content)

            citations.append({
                "book_title": book,
                "page": page,
                "score": score,
                "excerpt": raw_content[:260] + "..." if len(raw_content) > 260 else raw_content,
            })
            cleaned_blocks.append((book, page, formatted_content))

        # 3. Check for Out-of-Domain Query
        if not results:
            yield {
                "token": (
                    "I could not locate sufficiently verified clinical data regarding this specific query in the "
                    "medical textbooks (CMDT, Harrison's Manual of Medicine, Gale Encyclopedia). "
                    "Please consult a certified healthcare practitioner or hospital for tailored medical guidance."
                ),
                "citations": [],
            }
            return

        context_str = "\n\n".join([f"[{b}, Page {p}]:\n{txt}" for b, p, txt in cleaned_blocks])
        user_prompt = (
            f"--- VERIFIED MEDICAL TEXTBOOK EXCERPTS ---\n{context_str}\n\n"
            f"--- USER QUERY ---\n{query_text}\n\n"
            f"Instructions:\n"
            f"1. Provide a well-structured, empathetic, and clear answer answering the user's query.\n"
            f"2. Use clean bullet points, bold key terms, and concise sections (Overview, Symptoms, Treatment, Precautions).\n"
            f"3. Explicitly mention the source textbook references (e.g. CMDT or Harrison's).\n"
        )

        # 4. Try Local Lightweight Model via Ollama (100% Local & Offline)
        try:
            # Quick check if Ollama is running
            test_resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=1.5)
            if test_resp.status_code == 200:
                available_models = [m["name"] for m in test_resp.json().get("models", [])]
                # Pick preferred ultra-lightweight model (< 2GB)
                model_to_use = None
                for pref in LIGHTWEIGHT_PREFERENCES:
                    for avail in available_models:
                        if pref in avail:
                            model_to_use = avail
                            break
                    if model_to_use:
                        break
                if not model_to_use and available_models:
                    model_to_use = available_models[0]

                print(f"[rag] Generating response using Ultra-Lightweight Model: '{model_to_use}' via Ollama...")
                payload = {
                    "model": model_to_use,
                    "prompt": user_prompt,
                    "system": SYSTEM_PROMPT,
                    "stream": True,
                    "options": {"temperature": 0.2},
                }
                res = requests.post(f"{OLLAMA_HOST}/api/generate", json=payload, stream=True, timeout=(3.0, 90.0))
                if res.status_code == 200:
                    first_chunk = True
                    for line in res.iter_lines():
                        if line:
                            data = json.loads(line)
                            tok = data.get("response", "")
                            if first_chunk:
                                yield {"token": tok, "citations": citations}
                                first_chunk = False
                            else:
                                yield {"token": tok}
                            if data.get("done", False):
                                break
                    return
        except Exception as e:
            print(f"[rag] Ollama not reachable ({e}). Trying fallback...")

        # 5. Cloud LLM Fallback (if explicitly enabled)
        use_cloud = os.getenv("USE_CLOUD_LLM", "false").lower() == "true"
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or getattr(Config, "GOOGLE_API_KEY", None)

        if use_cloud and api_key:
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                from langchain_core.messages import HumanMessage

                llm = ChatGoogleGenerativeAI(
                    model="gemini-1.5-flash",
                    google_api_key=api_key,
                    temperature=0.2,
                    streaming=True,
                    max_retries=1,
                    timeout=5,
                )
                first_chunk = True
                for chunk in llm.stream([HumanMessage(content=f"{SYSTEM_PROMPT}\n\n{user_prompt}")]):
                    if first_chunk:
                        yield {"token": chunk.content, "citations": citations}
                        first_chunk = False
                    else:
                        yield {"token": chunk.content}
                return
            except Exception as e:
                print(f"[rag] Cloud LLM error ({e}). Using offline formatted synthesis...")

        # 6. High-Precision Offline Formatted Synthesis (Cleaned, Structured, Formatted)
        top_book, top_page, top_text = cleaned_blocks[0]
        response_md = f"### 📖 Clinical Guidance from {top_book} (Page {top_page})\n\n"
        response_md += f"{top_text}\n\n"

        if len(cleaned_blocks) > 1:
            second_book, second_page, second_text = cleaned_blocks[1]
            response_md += f"---\n\n### 📑 Supporting Findings from {second_book} (Page {second_page})\n\n"
            response_md += f"{second_text}\n\n"

        yield {"token": response_md, "citations": citations}


rag_service = RAGService()
