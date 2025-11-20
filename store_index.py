import os
from dotenv import load_dotenv

# LangChain + Pinecone
from pinecone import Pinecone, ServerlessSpec
from langchain_pinecone import PineconeVectorStore

# Local helpers
from src.helper import (
    load_pdf_and_wiki_data,
    filter_to_minimal_docs,
    text_split,
    download_hugging_face_embeddings
)


# =================================================================
# 1. CONFIG & ENVIRONMENT
# =================================================================
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
if not PINECONE_API_KEY:
    raise RuntimeError("PINECONE_API_KEY not found in .env")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY

# Index configuration
INDEX_NAME = "medical-chatbot-pdf-wiki"
DIMENSION = 384  # paraphrase-multilingual-MiniLM-L12-v2
METRIC = "cosine"
CLOUD = "aws"
REGION = "us-east-1"

# Medical topics to include from Wikipedia
TOPICS = [
    "diabetes mellitus", "hypertension", "cancer", "asthma", "anemia",
    "thyroid disorders", "heart disease", "arthritis", "depression",
    "stroke", "obesity", "dengue fever", "chikungunya", "typhoid fever",
    "zika virus disease", "malaria", "tuberculosis", "common cold",
    "influenza", "headache", "gastroenteritis", "dermatitis", "migraine",
    "fever", "sore throat", "conjunctivitis", "sprain and strain"
]

PDF_DATA_PATH = "data/"  # Folder containing medical PDFs


# =================================================================
# 2. LOAD DOCUMENTS (PDFs + Wikipedia)
# =================================================================
def load_all_documents():
    """Load and combine medical PDFs + Wikipedia articles for all topics"""
    all_docs = []
    print("Starting document loading (PDFs + Wikipedia)...")

    for topic in TOPICS:
        print(f"   Loading: {topic}")
        docs = load_pdf_and_wiki_data(pdf_path=PDF_DATA_PATH, topic=topic)
        all_docs.extend(docs)

    print(f"Total raw documents loaded: {len(all_docs)}")
    return all_docs


# =================================================================
# 3. PROCESS DOCUMENTS
# =================================================================
def process_documents(raw_docs):
    """Filter metadata and split into chunks"""
    print("Filtering document metadata...")
    filtered = filter_to_minimal_docs(raw_docs)
    print(f"Documents after cleanup: {len(filtered)}")

    print("Splitting into chunks...")
    chunks = text_split(filtered)
    print(f"Created {len(chunks)} text chunks")
    return chunks


# =================================================================
# 4. EMBEDDINGS
# =================================================================
def get_embeddings():
    """Download and return HuggingFace embedding model"""
    print("Downloading embedding model (paraphrase-multilingual-MiniLM-L12-v2)...")
    return download_hugging_face_embeddings()


# =================================================================
# 5. PINECONE INDEX MANAGEMENT
# =================================================================
def ensure_index_exists(pc_client):
    """Create index if it doesn't exist"""
    existing = [idx["name"] for idx in pc_client.list_indexes()]

    if INDEX_NAME in existing:
        print(f"Index '{INDEX_NAME}' already exists. Skipping creation.")
        return

    print(f"Creating new Pinecone index: {INDEX_NAME}")
    pc_client.create_index(
        name=INDEX_NAME,
        dimension=DIMENSION,
        metric=METRIC,
        spec=ServerlessSpec(cloud=CLOUD, region=REGION)
    )
    print(f"Index '{INDEX_NAME}' created successfully.")


# =================================================================
# 6. UPLOAD TO PINECONE
# =================================================================
def upload_to_pinecone(chunks, embeddings):
    """Upload document chunks as vectors to Pinecone"""
    print(f"Uploading {len(chunks)} vectors to '{INDEX_NAME}'... (this may take a while)")

    PineconeVectorStore.from_documents(
        documents=chunks,
        embedding=embeddings,
        index_name=INDEX_NAME
    )

    print(f"SUCCESS: {len(chunks)} vectors uploaded to '{INDEX_NAME}'")
    print("Your medical chatbot knowledge base is ready!")


# =================================================================
# 7. MAIN EXECUTION
# =================================================================
def main():
    print("=" * 60)
    print("MEDI-ASSIST AI — KNOWLEDGE BASE SETUP")
    print("=" * 60)

    # 1. Load documents
    raw_documents = load_all_documents()

    if not raw_documents:
        print("No documents loaded. Check 'data/' folder and internet connection.")
        return

    # 2. Process
    chunks = process_documents(raw_documents)

    # 3. Load embeddings
    embeddings = get_embeddings()

    # 4. Initialize Pinecone
    pc = Pinecone(api_key=PINECONE_API_KEY)
    ensure_index_exists(pc)

    # 5. Upload
    upload_to_pinecone(chunks, embeddings)

    print("=" * 60)
    print("SETUP COMPLETE")
    print("You can now run your Flask app with full RAG capabilities!")
    print("=" * 60)


if __name__ == "__main__":
    main()