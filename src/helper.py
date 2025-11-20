from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader, WikipediaLoader, PubMedLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from typing import List
from langchain.schema import Document
from deep_translator import GoogleTranslator
from langdetect import detect
import os


# =================================================================
# 2️⃣ DATA LOADING FUNCTIONS
# =================================================================

def load_pdf_file(data: str) -> List[Document]:
    """
    Load all PDF files from a directory using PyPDFLoader.
    """
    loader = DirectoryLoader(
        path=data,
        glob="*.pdf",
        loader_cls=PyPDFLoader
    )
    documents = loader.load()
    print(f"Loaded {len(documents)} documents from local PDFs.")
    return documents


def load_pubmed_data(query: str = "diabetes mellitus", max_results: int = 5) -> List[Document]:
    """
    Load research abstracts from PubMed.
    Requires NCBI_EMAIL environment variable for higher rate limits (optional but recommended).
    """
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
    """
    Load general information articles from Wikipedia.
    """
    try:
        loader = WikipediaLoader(query=query, load_max_docs=max_docs)
        documents = loader.load()
        print(f"Loaded {len(documents)} Wikipedia documents for '{query}'.")
        return documents
    except Exception as e:
        print(f"Wikipedia load failed for '{query}': {e}")
        return []


def load_hybrid_data(pdf_path: str, topic: str = "diabetes") -> List[Document]:
    """
    Combines local PDFs, PubMed abstracts, and Wikipedia articles.
    """
    pdf_docs = load_pdf_file(pdf_path)
    pubmed_docs = load_pubmed_data(query=topic)
    wiki_docs = load_wikipedia_data(query=topic)
    
    all_docs = pdf_docs + pubmed_docs + wiki_docs
    print(f"Total combined documents: {len(all_docs)}")
    return all_docs


def load_pdf_and_wiki_data(pdf_path: str, topic: str = "diabetes") -> List[Document]:
    """
    Combines only local PDFs and Wikipedia articles (excludes PubMed).
    Useful when you want up-to-date general knowledge without scientific papers.
    """
    pdf_docs = load_pdf_file(pdf_path)
    wiki_docs = load_wikipedia_data(query=topic)
    
    all_docs = pdf_docs + wiki_docs
    print(f"Total combined documents (PDFs + Wiki): {len(all_docs)}")
    return all_docs


# =================================================================
# 3️⃣ PREPROCESSING & EMBEDDING FUNCTIONS
# =================================================================

def filter_to_minimal_docs(docs: List[Document]) -> List[Document]:
    """
    Strips unnecessary metadata, keeping only 'source' and page_content.
    Helps reduce vector database size and improve privacy/control.
    """
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
    """
    Split documents into smaller chunks for better retrieval performance.
    """
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=20
    )
    text_chunks = text_splitter.split_documents(extracted_data)
    print(f"Split data into {len(text_chunks)} text chunks.")
    return text_chunks


def download_hugging_face_embeddings():
    """
    Load a lightweight multilingual embedding model.
    Model: paraphrase-multilingual-MiniLM-L12-v2
    Supports 50+ languages and performs well on semantic similarity.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    return embeddings