# backend/src/common/embeddings.py
"""
High-Performance Embeddings Engine.
Provides FastEmbed (ONNX-accelerated, lightweight, CPU-optimized) as primary,
with optional Google Generative AI cloud fallback.
"""

import os
from typing import Any, Optional
from dotenv import load_dotenv

load_dotenv()


class FastEmbedWrapper:
    """Wrapper around fastembed.TextEmbedding to match LangChain embeddings interface."""

    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5"):
        from fastembed import TextEmbedding

        self.model_name = model_name
        self.client = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        embeddings = list(self.client.embed(texts))
        return [e.tolist() for e in embeddings]

    def embed_query(self, text: str) -> list[float]:
        return list(self.client.embed([text]))[0].tolist()


def get_embedding_engine(engine: Optional[str] = None):
    """
    Factory function for vector embeddings.
    - 'fastembed': (Default) Local ONNX runtime, ~60MB, ultra-fast CPU inference.
    - 'google': Google Gemini text-embedding-004 (cloud API).
    - 'huggingface': Legacy sentence-transformers (fallback).
    """
    selected_engine = (engine or os.getenv("EMBEDDING_ENGINE", "fastembed")).lower()

    if selected_engine == "fastembed":
        try:
            model_name = os.getenv("FASTEMBED_MODEL", "BAAI/bge-small-en-v1.5")
            return FastEmbedWrapper(model_name=model_name)
        except Exception as e:
            print(f"[Embeddings] FastEmbed initialization error ({e}). Trying fallback...")

    if selected_engine == "google" or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"):
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings

            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            return GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004", google_api_key=api_key
            )
        except Exception as e:
            print(f"[Embeddings] Google embeddings error ({e}).")

    # Fallback to FastEmbed with default model
    return FastEmbedWrapper(model_name="BAAI/bge-small-en-v1.5")

