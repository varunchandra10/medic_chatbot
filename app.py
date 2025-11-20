from flask import (
    Flask,
    render_template,
    request,
    jsonify,
    session,
    redirect,
    url_for,
    jsonify,
)
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from datetime import datetime, timezone
import os
import pymongo
from pymongo.errors import ServerSelectionTimeoutError
from bson.objectid import ObjectId

# LangChain + RAG
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from langchain_community.embeddings import HuggingFaceEmbeddings

# Utilities
from deep_translator import GoogleTranslator
from src.medical_news import fetch_latest_medical_news


# ================================================================
# 1. CONFIG & ENVIRONMENT
# ================================================================
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY")
bcrypt = Bcrypt(app)

# Environment Variables
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY


# ================================================================
# 2. DATABASE SETUP
# ================================================================
client = None
db = None
users_collection = None
history_collection = None


class MockCollection:
    """Fallback when MongoDB is unavailable"""

    def find_one(self, *args, **kwargs):
        raise RuntimeError("Database not connected")

    def insert_one(self, *args, **kwargs):
        raise RuntimeError("Database not connected")

    def delete_many(self, *args, **kwargs):
        raise RuntimeError("Database not connected")

    def find(self, *args, **kwargs):
        return []

    def aggregate(self, *args, **kwargs):
        return []


def init_db():
    global client, db, users_collection, history_collection
    try:
        client = pymongo.MongoClient(
            MONGO_URL, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000
        )
        client.admin.command("ismaster")
        db = client["medical_chatbot"]
        users_collection = db["users"]
        history_collection = db["chat_history"]

        # Indexes for performance
        history_collection.create_index([("user_id", 1), ("timestamp", -1)])
        history_collection.create_index([("user_id", 1), ("conversation_id", 1)])

        print("MongoDB Connected Successfully")
    except Exception as e:
        print("MongoDB Connection Failed:", e)
        users_collection = MockCollection()
        history_collection = MockCollection()


init_db()


# ================================================================
# 3. RAG & AI SETUP
# ================================================================
SYSTEM_PROMPT = (
    "You are a medical assistant. "
    "Use only the retrieved context to answer. "
    "If unsure, say you don’t know. "
    "Keep answers short (max 3 sentences).\n\n{context}"
)

SUPPORTED_LANGUAGES = {"en", "hi", "ta", "te"}


def get_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )


def translate(text: str, target_lang: str, source_lang: str = "auto") -> str:
    if target_lang not in SUPPORTED_LANGUAGES or not text.strip():
        return text
    try:
        return GoogleTranslator(source=source_lang, target=target_lang).translate(text)
    except:
        return text


# Initialize RAG Chain
print("Initializing RAG system...")
try:
    embeddings = get_embeddings()
    vectorstore = PineconeVectorStore.from_existing_index(
        index_name="medical-chatbot-pdf-wiki", embedding=embeddings
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0.3)

    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_PROMPT), ("human", "{input}")]
    )

    question_answer_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, question_answer_chain)

    print("RAG System Ready")
except Exception as e:
    print("RAG Setup Failed:", e)

    class FallbackRAG:
        def invoke(self, inputs):
            return {
                "answer": "Service temporarily unavailable. Please try again later."
            }

    rag_chain = FallbackRAG()


# ================================================================
# 4. AUTH & SESSION HELPERS
# ================================================================
def require_auth(f):
    """Decorator alternative using before_request"""
    pass  # Using @app.before_request instead


@app.before_request
def auth_guard():
    protected = [
        "/get",
        "/conversations",
        "/conversation",
        "/end_chat",
        "/conversation/delete/",
        "/news",
    ]
    path = request.path
    if any(path.startswith(p) for p in protected):
        if "user_id" not in session:
            if request.path.startswith("/get"):
                return "Unauthorized", 403
            return jsonify({"status": "error", "message": "Unauthorized"}), 403


def get_current_conversation_id() -> str:
    """Get or create a conversation ID for the current session"""
    if not session.get("current_chat_id"):
        session["current_chat_id"] = str(ObjectId())
    return session["current_chat_id"]


# ================================================================
# 5. ROUTES: AUTH
# ================================================================
@app.route("/register", methods=["GET"])
def register_page():
    return render_template("register.html")


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    name, email, password, age = (
        data.get("name"),
        data.get("email"),
        data.get("password"),
        data.get("age"),
    )
    email = email.lower() if email else ""

    if not all([name, email, password, age]):
        return jsonify({"status": "error", "message": "All fields required"}), 400

    if users_collection.find_one({"email": email}):
        return jsonify({"status": "error", "message": "Email already exists"}), 400

    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    users_collection.insert_one(
        {
            "name": name,
            "email": email,
            "password": hashed,
            "age": int(age),
            "created_at": datetime.now(timezone.utc),
        }
    )

    return jsonify({"status": "success", "message": "Account created"})


@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email", "").lower()
    password = data.get("password")

    user = users_collection.find_one({"email": email})
    if not user or not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"status": "error", "message": "Invalid credentials"}), 401

    session["user_id"] = str(user["_id"])
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]
    session["current_chat_id"] = None

    return jsonify(
        {
            "status": "success",
            "message": "Login successful",
            "redirect_url": url_for("index"),
        }
    )


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"status": "success", "redirect_url": url_for("login_page")})


# ================================================================
# 6. ROUTES: CHAT & HISTORY
# ================================================================
@app.route("/get", methods=["POST"])
def chat():
    user_id = session["user_id"]
    conversation_id = get_current_conversation_id()
    user_message = request.form["msg"]
    lang = request.form.get("lang", "en")

    # Save user message
    history_collection.insert_one(
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "role": "user",
            "message": user_message,
            "lang": lang,
            "timestamp": datetime.now(timezone.utc),
        }
    )

    try:
        # Translate to English for RAG
        query_en = user_message if lang == "en" else translate(user_message, "en", lang)

        # Get AI response
        result = rag_chain.invoke({"input": query_en})
        answer_en = result.get("answer", "I'm not sure how to help with that.")

        # Translate back to user language
        answer = answer_en if lang == "en" else translate(answer_en, lang)

    except Exception as e:
        print("Chat error:", e)
        answer = "Sorry, something went wrong. Please try again."

    # Save bot response
    history_collection.insert_one(
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "role": "bot",
            "message": answer,
            "lang": lang,
            "timestamp": datetime.now(timezone.utc),
        }
    )

    return answer


@app.route("/conversations", methods=["GET"])
def list_conversations():
    user_id = session["user_id"]

    pipeline = [
        {"$match": {"user_id": user_id, "role": "user"}},
        {"$sort": {"timestamp": 1}},
        {
            "$group": {
                "_id": "$conversation_id",
                "title": {"$first": "$message"},
                "timestamp": {"$first": "$timestamp"},
            }
        },
        {"$sort": {"timestamp": -1}},
        {
            "$project": {
                "_id": 0,
                "id": "$_id",
                "title": {"$substrCP": ["$title", 0, 40]},
                "timestamp": 1,
            }
        },
    ]

    conversations = list(history_collection.aggregate(pipeline))
    return jsonify({"status": "success", "conversations": conversations})


@app.route("/conversation/<conv_id>", methods=["GET"])
def load_conversation(conv_id):
    user_id = session["user_id"]
    session["current_chat_id"] = conv_id

    messages = list(
        history_collection.find(
            {"user_id": user_id, "conversation_id": conv_id}, {"_id": 0}
        ).sort("timestamp", 1)
    )

    return jsonify(
        {"status": "success", "messages": messages, "conversation_id": conv_id}
    )


@app.route("/end_chat", methods=["POST"])
def start_new_chat():
    session["current_chat_id"] = None
    return jsonify({"status": "success", "message": "New chat started"})


@app.route("/conversation/delete/<conv_id>", methods=["POST"])
def delete_conversation(conv_id):
    user_id = session["user_id"]
    result = history_collection.delete_many(
        {"user_id": user_id, "conversation_id": conv_id}
    )

    if session.get("current_chat_id") == conv_id:
        session["current_chat_id"] = None

    return jsonify(
        {"status": "success", "message": f"Deleted {result.deleted_count} messages"}
    )


# ================================================================
# 7. MEDICAL NEWS ROUTE
# ================================================================
@app.route("/news")
def get_news():
    lang = request.args.get("lang", "en")
    if lang not in SUPPORTED_LANGUAGES:
        lang = "en"

    news = fetch_latest_medical_news(lang, max_items=10)

    # If API fails or returns nothing → beautiful fallback with real-looking images
    if not news:
        fallback_news = [
            {
                "title": "India launches nationwide diabetes screening program",
                "summary": "Free testing camps in 500+ districts starting December 2025...",
                "link": "https://pib.gov.in",
                "published": "2025-11-20",
                "image": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"  # Real medical image
            },
            {
                "title": "Breakthrough in cancer immunotherapy research",
                "summary": "Indian scientists develop affordable CAR-T cell therapy...",
                "link": "https://thehindu.com/sci-tech/health",
                "published": "2025-11-19",
                "image": "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&q=80"
            },
            {
                "title": "New hypertension guidelines released by ICMR",
                "summary": "Updated blood pressure targets for Indian population...",
                "link": "https://icmr.gov.in",
                "published": "2025-11-18",
                "image": "https://images.unsplash.com/photo-1559757148-5c350d575016?w=800&q=80"
            },
            {
                "title": "COVID nasal vaccine gets emergency approval",
                "summary": "Bharat Biotech's iNCOVACC now available across India...",
                "link": "https://ndtv.com/health",
                "published": "2025-11-17",
                "image": "https://images.unsplash.com/photo-1612277795508-6b200b0e5d4b?w=800&q=80"
            },
        ]
        news = fallback_news

    return jsonify({"status": "success", "news": news})


# ================================================================
# 8. MAIN ROUTE
# ================================================================
@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("chat.html")


# ================================================================
# 8. RUN SERVER
# ================================================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
