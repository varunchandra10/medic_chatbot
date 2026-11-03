# backend/src/common/vectorstore.py
"""
Vector Store Management & RAG Retrieval Interface.
Default: Persistent local ChromaDB storage in data/vectorstore/.
Cloud Option: Pinecone vector store when configured.
"""

import os
from typing import Any, Dict, List, Optional, Tuple
from langchain_core.documents import Document

try:
    from backend.src.common.embeddings import get_embedding_engine
except ImportError:
    from src.common.embeddings import get_embedding_engine

CHROMA_PERSIST_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../data/vectorstore")
)
COLLECTION_NAME = "medical_knowledge"


class LocalChromaStore:
    """Wrapper around persistent ChromaDB with score-validated retrieval."""

    def __init__(self, persist_dir: str = CHROMA_PERSIST_DIR, collection_name: str = COLLECTION_NAME):
        import chromadb

        self.persist_dir = persist_dir
        self.collection_name = collection_name
        os.makedirs(self.persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
        self.embeddings = get_embedding_engine()

    def count(self) -> int:
        """Returns the total number of chunks in the vector collection."""
        return self.collection.count()

    def add_documents(self, documents: List[Document], batch_size: int = 150, progress_callback=None):
        """
        Batched insertion of documents into ChromaDB.
        Generates embeddings in parallel batches.
        """
        total = len(documents)
        for i in range(0, total, batch_size):
            batch = documents[i : i + batch_size]
            texts = [doc.page_content for doc in batch]
            metadatas = [doc.metadata for doc in batch]
            ids = [
                doc.metadata.get("chunk_id", f"chunk_{i + idx}")
                for idx, doc in enumerate(batch)
            ]

            # Generate embeddings for the batch
            embeddings = self.embeddings.embed_documents(texts)

            self.collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )

            if progress_callback:
                progress_callback(min(i + batch_size, total), total)

    def similarity_search_with_score(
        self, query: str, k: int = 3, score_threshold: float = 0.65
    ) -> List[Tuple[Document, float]]:
        """
        Performs cosine similarity search against ChromaDB.
        Returns list of (Document, score) filtered by threshold.
        """
        query_embedding = self.embeddings.embed_query(query)

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )

        documents_with_scores: List[Tuple[Document, float]] = []

        if not results or not results["documents"] or not results["documents"][0]:
            return documents_with_scores

        docs = results["documents"][0]
        metas = results["metadatas"][0] if results["metadatas"] else [{}] * len(docs)
        distances = results["distances"][0] if results["distances"] else [1.0] * len(docs)

        for text, meta, dist in zip(docs, metas, distances):
            # For cosine distance: cosine_similarity = 1.0 - distance
            similarity = 1.0 - dist
            if similarity >= score_threshold:
                doc = Document(page_content=text, metadata=meta)
                documents_with_scores.append((doc, round(similarity, 4)))

        return documents_with_scores


def get_vector_store() -> LocalChromaStore:
    """Singleton-like factory for the active vector database."""
    return LocalChromaStore()

