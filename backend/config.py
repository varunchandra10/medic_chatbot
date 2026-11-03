# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base application configuration."""

    SECRET_KEY = os.getenv(
        "SECRET_KEY", "default-fallback-insecure-key-change-in-production"
    )
    PORT = int(os.getenv("PORT", 8080))

    # MongoDB
    MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")
    DB_NAME = "medical_chatbot"

    # AI & Vector Store
    PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY"))
    GOOGLE_PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID", "medic_chatbot")
    GOOGLE_PROJECT_NUMBER = os.getenv("GOOGLE_PROJECT_NUMBER", "507905882667")
    PINECONE_INDEX_NAME = os.getenv(
        "PINECONE_INDEX_NAME", "medical-chatbot-pdf-wiki"
    )

    # Embedding Provider Configuration: "google" (hosted text-embedding-004) or "huggingface" (local MiniLM)
    EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "google").lower()
    GOOGLE_EMBEDDING_MODEL = os.getenv(
        "GOOGLE_EMBEDDING_MODEL", "models/text-embedding-004"
    )
    EMBEDDING_MODEL_NAME = (
        "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )

    # Pinecone Vector Dimensions: 768 for Google text-embedding-004, 384 for MiniLM
    EMBEDDING_DIMENSION = 768 if EMBEDDING_PROVIDER == "google" else 384

    # Similarity Threshold
    SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.65"))

    # Third Party APIs
    NEWS_API_KEY = os.getenv("NEWS_API_KEY")
    NEWS_DATA_API_KEY = os.getenv("NEWS_DATA_API_KEY")
    NCBI_EMAIL = os.getenv("NCBI_EMAIL")
    NCBI_API_KEY = os.getenv("NCBI_API_KEY")

    # Google OAuth
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:5173/api/auth/google/callback"
    )

    # Localization
    SUPPORTED_LANGUAGES = {"en", "hi", "ta", "te"}
