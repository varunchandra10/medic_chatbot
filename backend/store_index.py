# backend/store_index.py
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure root and backend are in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
for _p in (str(BASE_DIR), str(BACKEND_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

# LangChain + Pinecone
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore

# Helper utilities with fallback imports
try:
    from backend.src.helper import (
        load_pdf_file,
        load_wikipedia_data,
        filter_to_minimal_docs,
        text_split,
        get_embedding_model,
        download_hugging_face_embeddings,
    )
    from backend.config import Config
except ImportError:
    from src.helper import (
        load_pdf_file,
        load_wikipedia_data,
        filter_to_minimal_docs,
        text_split,
        get_embedding_model,
        download_hugging_face_embeddings,
    )
    from config import Config

# =================================================================
# 1. CONFIG & ENVIRONMENT
# =================================================================
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY") or getattr(Config, "PINECONE_API_KEY", None)
if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY not found in environment or .env file.")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

# Index configuration
INDEX_NAME = getattr(Config, "PINECONE_INDEX_NAME", "medical-chatbot-pdf-wiki")
DIMENSION = getattr(Config, "EMBEDDING_DIMENSION", 768)  # 768 for Google text-embedding-004, 384 for MiniLM
METRIC = "cosine"
CLOUD = "aws"
REGION = "us-east-1"

# Medical topics to index from Wikipedia
TOPICS = [
    "diabetes mellitus", "hypertension", "cancer", "asthma", "anemia",
    "thyroid disorders", "heart disease", "arthritis", "depression",
    "stroke", "obesity", "dengue fever", "chikungunya", "typhoid fever",
    "zika virus disease", "malaria", "tuberculosis", "common cold",
    "influenza", "headache", "gastroenteritis", "dermatitis", "migraine",
    "fever", "sore throat", "conjunctivitis", "sprain and strain"
]

# Ensure PDF data path resolves correctly from either project root or backend folder
_CURRENT_DIR = os.path.abspath(os.path.dirname(__file__))
if os.path.basename(_CURRENT_DIR) == "backend":
    PROJECT_ROOT = os.path.abspath(os.path.join(_CURRENT_DIR, ".."))
else:
    PROJECT_ROOT = _CURRENT_DIR

PDF_DATA_PATH = os.path.join(PROJECT_ROOT, "data")


# =================================================================
# 2. LOAD DOCUMENTS (PDFs Loaded ONCE + Wikipedia Topics)
# =================================================================
def load_all_documents():
    """
    Load medical documents cleanly without duplication:
    1. Local clinical textbook PDFs are loaded ONCE.
    2. Wikipedia articles for defined medical topics are queried individually.
    """
    all_docs = []
    print("=" * 60)
    print("Starting document loading (Single-Pass PDFs + Wikipedia)...")
    print("=" * 60)

    # 1. Load PDFs exactly once
    if os.path.exists(PDF_DATA_PATH):
        print(f"Loading local medical textbooks from '{PDF_DATA_PATH}'...")
        pdf_docs = load_pdf_file(PDF_DATA_PATH)
        print(f"Loaded {len(pdf_docs)} document pages from local PDFs.")
        all_docs.extend(pdf_docs)
    else:
        print(f"Warning: PDF directory '{PDF_DATA_PATH}' not found. Skipping local PDFs.")

    # 2. Iterate through Wikipedia topics
    print("\nLoading Wikipedia medical topic overviews...")
    for topic in TOPICS:
        print(f"   Loading topic: {topic}")
        wiki_docs = load_wikipedia_data(query=topic, max_docs=2)
        all_docs.extend(wiki_docs)

    print(f"\nTotal unique raw documents loaded: {len(all_docs)}")
    return all_docs


# =================================================================
# 3. PROCESS DOCUMENTS
# =================================================================
def process_documents(raw_docs):
    """Filter metadata and split into chunks using tuned boundaries."""
    print("\nFiltering document metadata...")
    filtered = filter_to_minimal_docs(raw_docs)
    print(f"Documents after metadata cleanup: {len(filtered)}")

    print("Splitting into clinical context chunks (chunk_size=1000, overlap=150)...")
    chunks = text_split(filtered)
    print(f"Created {len(chunks)} text chunks.")
    return chunks


# =================================================================
# 4. EMBEDDINGS
# =================================================================
def get_embeddings():
    """Return embedding model (hosted Google text-embedding-004 or local MiniLM)."""
    return get_embedding_model()


# =================================================================
# 5. PINECONE INDEX FLUSH & CREATION
# =================================================================
def ensure_clean_index(pc_client, recreate=False):
    """
    Ensure Pinecone index exists.
    If recreate=True (or --recreate passed), deletes old duplicated index and creates fresh.
    """
    existing_indexes = [idx["name"] for idx in pc_client.list_indexes()]

    if INDEX_NAME in existing_indexes:
        if recreate:
            print(f"\nFlushing/Deleting existing index: '{INDEX_NAME}' to eliminate duplicate vectors...")
            pc_client.delete_index(INDEX_NAME)
            print("Index deleted. Creating fresh serverless index...")
        else:
            print(f"\nIndex '{INDEX_NAME}' exists. Ready for vector ingestion.")
            return

    print(f"Creating new Pinecone index: '{INDEX_NAME}' (dimension={DIMENSION}, metric={METRIC})...")
    pc_client.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric=METRIC,
        spec=ServerlessSpec(cloud=CLOUD, region=REGION),
    )
    print(f"Index '{INDEX_NAME}' created successfully.")


# =================================================================
# 6. UPLOAD TO PINECONE
# =================================================================
def upload_to_pinecone(chunks, embeddings):
    """Upload document chunks as vectors to Pinecone."""
    print(f"\nUploading {len(chunks)} deduplicated vectors to '{INDEX_NAME}'...")

    PineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        index_name=INDEX_NAME,
    )

    print(f"SUCCESS: {len(chunks)} vectors uploaded to '{INDEX_NAME}'.")
    print("Your medical chatbot knowledge base is clean and ready!")


# =================================================================
# 7. MAIN EXECUTION
# =================================================================
def main():
    print("=" * 60)
    print("MEDI-ASSIST AI — KNOWLEDGE BASE INGESTION PIPELINE")
    print("=" * 60)

    # Check for --recreate or --flush flag in CLI arguments
    recreate_flag = any(arg in sys.argv for arg in ("--recreate", "--flush", "-f"))
    if recreate_flag:
        print("[Notice] Flush/Recreate mode enabled via CLI flag.")

    # 1. Load documents (PDFs loaded once)
    raw_documents = load_all_documents()
    if not raw_documents:
        print("No documents loaded. Check 'data/' folder and internet connection.")
        return

    # 2. Process & Chunk with tuned strategy (1000 / 150)
    chunks = process_documents(raw_documents)

    # 3. Load embeddings
    embeddings = get_embeddings()

    # 4. Initialize Pinecone client & ensure clean index
    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_clean_index(pc, recreate=recreate_flag)

    # 5. Upload vectors
    upload_to_pinecone(chunks, embeddings)

    print("=" * 60)
    print("INGESTION COMPLETE — NO DUPLICATION")
    print("=" * 60)


if __name__ == "__main__":
    main()
