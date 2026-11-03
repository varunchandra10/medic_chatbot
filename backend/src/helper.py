import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader, WikipediaLoader, PubMedLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from deep_translator import GoogleTranslator
from langdetect import detect

# =================================================================
# 1. EMBEDDING FACTORY (Decoupled Hosted Google / Local Fallback)
# =================================================================

def get_embedding_model(provider: str = None):
    """
    Factory function for embedding models.
    Supports hosted 'google' (text-embedding-004 via Google AI Studio)
    and local 'huggingface' (sentence-transformers).
    """
    if provider is None:
        try:
            from backend.config import Config
            provider = getattr(Config, "EMBEDDING_PROVIDER", "google")
        except ImportError:
            provider = os.getenv("EMBEDDING_PROVIDER", "google").lower()

    if provider == "google":
        print("[embeddings] Initializing hosted Google Cloud embeddings (text-embedding-004)...")
        from langchain_google_genai import GoogleGenerativeAIEmbeddings
        api_key = os.getenv("GOOGLE_API_KEY")
        return GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004",
            google_api_key=api_key,
        )
    else:
        print("[embeddings] Initializing local HuggingFace embeddings...")
        from langchain_community.embeddings import HuggingFaceEmbeddings
        return HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )


def download_hugging_face_embeddings():
    """Backwards compatibility wrapper for embedding instantiation."""
    return get_embedding_model()


# =================================================================
# 2. DATA LOADING FUNCTIONS
# =================================================================

def load_pdf_file(data: str) -> List[Document]:
    """Load all PDF files from a directory using PyPDFLoader."""
    loader = DirectoryLoader(
        path=data,
        glob="*.pdf",
        loader_cls=PyPDFLoader
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} documents from local PDFs.")
    return documents


def load_pubmed_data(query: str = "diabetes mellitus", max_results: int = 5) -> List[Document]:
    """Load research abstracts from PubMed."""
    NCBI_EMAIL = os.getenv("NCBI_EMAIL", "default@example.com")
    try:
        loader = PubMedLoader(
            query=query,
            load_max_docs=max_results,
            email=NCBI_EMAIL
        )
        documents = loader.load()
        print(f"Loaded {len(documents)} PubMed abstracts for '{query}'.")
        return documents
    except Exception as e:
        print(f"PubMed load failed for '{query}': {e}")
        return []


def load_wikipedia_data(query: str = "diabetes", max_docs: int = 3) -> List[Document]:
    """Load general information articles from Wikipedia."""
    try:
        loader = WikipediaLoader(query=query, load_max_docs=max_docs)
        documents = loader.load()
        print(f"Loaded {len(documents)} Wikipedia documents for '{query}'.")
        return documents
    except Exception as e:
        print(f"Wikipedia load failed for '{query}': {e}")
        return []


def load_pdf_and_wiki_data(pdf_path: str, topic: str = "diabetes") -> List[Document]:
    """Combines local PDFs and Wikipedia articles."""
    pdf_docs = load_pdf_file(pdf_path)
    wiki_docs = load_wikipedia_data(query=topic)
    all_docs = pdf_docs + wiki_docs
    return all_docs


# =================================================================
# 3. PREPROCESSING & CHUNKING FUNCTIONS
# =================================================================

def filter_to_minimal_docs(docs: List[Document]) -> List[Document]:
    """Strips unnecessary metadata, keeping only 'source' and page_content."""
    minimal_docs: List[Document] = []
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        minimal_docs.append(
            Document(
                page_content=doc.page_content,
                metadata={"source": src}
            )
        )
    return minimal_docs


def text_split(extracted_data: List[Document]) -> List[Document]:
    """Split documents into clinical context chunks (chunk_size=1000, overlap=150)."""
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=150
    )
    text_chunks = text_splitter.split_documents(extracted_data)
    print(f"Split data into {len(text_chunks)} text chunks.")
    return text_chunks
