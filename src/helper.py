from langchain_community.document_loaders import PyPDFLoader, DirectoryLoader, WikipediaLoader, PubMedLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from typing import List
from langchain.schema import Document
from deep_translator import GoogleTranslator
from langdetect import detect
import os # Added for optional email setting in PubMedLoader


# =================================================================
# 2️⃣ DATA LOADING FUNCTIONS
# =================================================================

# Extract Data From the PDF File
def load_pdf_file(data):
    loader = DirectoryLoader(data,
                             glob="*.pdf",
                             loader_cls=PyPDFLoader)

    documents = loader.load()
    print(f"✅ Loaded {len(documents)} documents from local PDFs.")
    return documents

# ----------- LOAD PUBMED ABSTRACTS -----------
def load_pubmed_data(query: str = "diabetes mellitus", max_results: int = 5) -> List[Document]:
    """
    Load research abstracts from PubMed.
    NOTE: Using an email address (e.g., from .env) helps prevent connection errors.
    """
    # NOTE: It's best practice to pass an email to stabilize NCBI API calls.
    # You can set this as an environment variable or define it here.
    NCBI_EMAIL = os.getenv("NCBI_EMAIL", "default@example.com") 
    
    try:
        loader = PubMedLoader(
            query=query, 
            load_max_docs=max_results,
            email=NCBI_EMAIL  # Pass the email for reliability
        )
        documents = loader.load()
        print(f"✅ Loaded {len(documents)} PubMed abstracts for '{query}'.")
        return documents
    except Exception as e:
        print(f"⚠️ PubMed load failed for '{query}': {e}")
        return []
    
# ----------- LOAD WIKIPEDIA ARTICLES -----------
def load_wikipedia_data(query: str = "diabetes", max_docs: int = 3) -> List[Document]:
    """
    Load general information from Wikipedia.
    """
    try:
        loader = WikipediaLoader(query=query, load_max_docs=max_docs)
        documents = loader.load()
        print(f"✅ Loaded {len(documents)} Wikipedia documents for '{query}'.")
        return documents
    except Exception as e:
        print(f"⚠️ Wikipedia load failed for '{query}': {e}")
        return []
    
# ----------- HYBRID DATA LOADER (ORCHESTRATOR) -----------
def load_hybrid_data(pdf_path: str, topic: str = "diabetes") -> List[Document]:
    """
    Combines local PDF data, PubMed abstracts, and Wikipedia articles based on a topic.
    """
    pdf_docs = load_pdf_file(pdf_path)
    pubmed_docs = load_pubmed_data(query=topic)
    wiki_docs = load_wikipedia_data(query=topic)

    all_docs = pdf_docs + pubmed_docs + wiki_docs
    print(f"✅ Total combined documents: {len(all_docs)}")
    return all_docs


# =================================================================
# 3️⃣ PREPROCESSING & EMBEDDING
# =================================================================

def filter_to_minimal_docs(docs: List[Document]) -> List[Document]:
    """
    Filters documents to contain only 'source' in metadata and the original page_content.
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


def text_split(extracted_data):
    """Split the Data into Text Chunks."""
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=20)
    text_chunks = text_splitter.split_documents(extracted_data)
    print(f"✅ Split data into {len(text_chunks)} text chunks.")
    return text_chunks


def download_hugging_face_embeddings():
    """
    Uses the recommended multilingual MiniLM model.
    """
    embeddings = HuggingFaceEmbeddings(
        model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
    )
    return embeddings


# =================================================================
# 4️⃣ TRANSLATION & LANGUAGE UTILITIES
# =================================================================

def detect_language(text: str) -> str:
    """Detect user input language (e.g., 'en', 'hi', 'ta', 'es', etc.)."""
    try:
        lang = detect(text)
        return lang
    except Exception:
        return "en"

def translate_to_english(text: str) -> str:
    """Translate any language → English."""
    try:
        return GoogleTranslator(source='auto', target='en').translate(text)
    except Exception:
        return text

def translate_from_english(text: str, target_lang: str) -> str:
    """Translate English → user's language."""
    try:
        if target_lang == "en":
            return text
        return GoogleTranslator(source='en', target=target_lang).translate(text)
    except Exception:
        # NOTE: Fixed the 'texta' typo in the original exception return
        return text