# =================================================================
# MEDI-ASSIST AI BACKEND (Auth + RAG + Multilingual + Chat History)
# =================================================================

from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_bcrypt import Bcrypt
from dotenv import load_dotenv
from datetime import datetime, timezone
import os
import pymongo
from pymongo.errors import ServerSelectionTimeoutError
from bson.objectid import ObjectId # ⬅️ ADDED: For unique conversation IDs

# LangChain + Pinecone
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from langchain_community.embeddings import HuggingFaceEmbeddings

# Translation
from deep_translator import GoogleTranslator


# ================================================================
# 1️⃣ ENVIRONMENT + CONFIG
# ================================================================
load_dotenv()

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY= os.getenv("GOOGLE_API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017/")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY


# ================================================================
# 2️⃣ INITIAL APP
# ================================================================
app = Flask(__name__)
app.secret_key = SECRET_KEY
bcrypt = Bcrypt(app)

# ================================================================
# 3️⃣ DATABASE SETUP
# ================================================================
class MockCollection:
    def find_one(self, *a, **k): raise RuntimeError("Database not connected.")
    def insert_one(self, *a, **k): raise RuntimeError("Database not connected.")
    def delete_many(self, *a, **k): raise RuntimeError("Database not connected.")
    def find(self, *a, **k): 
        if 'sort' in k: del k['sort']
        return []
    def aggregate(self, *a, **k): return [] # Added aggregate mock
     
client = None
db = None
users_collection   = MockCollection()
history_collection = MockCollection()

def setup_database():
    global client, db, users_collection, history_collection
    try:
        client = pymongo.MongoClient( MONGO_URL, serverSelectionTimeoutMS=5000, connectTimeoutMS=5000)
        client.admin.command("ismaster")
        db = client["medical_chatbot"]
        users_collection   = db["users"]
        history_collection = db["chat_history"]
        # Ensure indexes are set for efficient querying
        history_collection.create_index([("user_id", pymongo.ASCENDING), ("timestamp", pymongo.ASCENDING)])
        history_collection.create_index([("user_id", pymongo.ASCENDING), ("conversation_id", pymongo.ASCENDING)])
        print("✅ MongoDB Connected Successfully")
    except Exception as e:
        print("❌ MongoDB Connection Failed:", e)
setup_database()


# ================================================================
# 4️⃣ RAG SETUP (Unchanged)
# ================================================================
SYSTEM_PROMPT = ( 
                 "You are a medical assistant. " 
                 "Use the retrieved context to answer. "
                 "If not sure, say you don’t know. "
                 "Keep answers short (max 3 sentences).\n\n{context}"
)

def download_hf_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

SUPPORTED_LANGS = {"en", "hi", "ta", "te"}

def translate_text(text, target_lang, source_lang="auto"):
    try:
        if target_lang not in SUPPORTED_LANGS:
            return text
        return GoogleTranslator(source=source_lang, target=target_lang).translate(text)
    except:
        return text


print("⏳ Initializing RAG...")
try:
    embeddings = download_hf_embeddings()
    index_name = "medical-chatbot"
    docsearch = PineconeVectorStore.from_existing_index(
        index_name=index_name, embedding=embeddings
        )
    retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})
    llm = ChatGoogleGenerativeAI( model="gemini-2.0-flash",google_api_key=GOOGLE_API_KEY, temperature=0.3)
    prompt = ChatPromptTemplate.from_messages([ ("system", SYSTEM_PROMPT), ("human", "{input}")])
    qa_chain = create_stuff_documents_chain(llm, prompt)
    rag_chain = create_retrieval_chain(retriever, qa_chain)
    print("✅ RAG Ready")
except Exception as e:
    print("❌ RAG Setup Failed:", e)
    class MockRAG:
        def invoke(self, inp):
            return {"answer": "RAG backend unavailable."}
    rag_chain = MockRAG()


# ================================================================
# 5️⃣ AUTH GUARD (Updated secure paths)
# ================================================================
@app.before_request
def protect_endpoints():
    secure_paths = {"/get", "/conversations", "/conversation", "/end_chat"} # ⬅️ UPDATED
    if request.path in secure_paths or request.path.startswith("/conversation/"): # ⬅️ ADDED check for dynamic route
        if "user_id" not in session:
            return jsonify({"status": "error", "message": "Unauthorized"}), 403


# ================================================================
# 6️⃣ AUTH ROUTES (Unchanged)
# ================================================================
@app.route("/register", methods=["GET"])
def register_page():
    return render_template("register.html")


@app.route("/register", methods=["POST"])
def register():
    data     = request.json
    name     = data.get("name")
    email    = data.get("email", "").lower()
    password = data.get("password")
    age      = data.get("age")
    if not all([name, email, password, age]):
        return jsonify({"status": "error", "message": "All fields required"}), 400
    try:
        if users_collection.find_one({"email": email}):
            return jsonify({"status": "error", "message": "Email already exists"}), 400
        hashed = bcrypt.generate_password_hash(password).decode("utf-8")
        users_collection.insert_one({ "name": name,  "email": email, "password": hashed, "age": age})
        return jsonify({"status": "success", "message": "Account created"})
    except Exception as e:
        return jsonify({"status": "error", "message": "Database error"}), 500

@app.route("/login", methods=["GET"])
def login_page():
    return render_template("login.html")

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    email = data.get("email", "").lower()
    password = data.get("password")
    try:
        user = users_collection.find_one({"email": email})
    except:
        return jsonify({"status": "error", "message": "Database error"}), 500
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404
    if not bcrypt.check_password_hash(user["password"], password):
        return jsonify({"status": "error", "message": "Invalid password"}), 401
    
    session["user_id"] = str(user["_id"])
    session["user_name"] = user["name"]
    session["user_email"] = user["email"]
    session["current_chat_id"] = None # ⬅️ ADDED: Initialize chat ID
    
    return jsonify({"status": "success", "message": "Login successful", "redirect_url": url_for("index")})


@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({ "status": "success", "redirect_url": url_for("login_page") })


# ================================================================
# 7️⃣ CHAT + HISTORY (MODIFIED)
# ================================================================
def get_current_chat_id():
    # Gets current chat ID from session or creates a new one
    chat_id = session.get("current_chat_id")
    if not chat_id:
        # If no ID exists, create a new one (using a string representation of ObjectId)
        chat_id = str(ObjectId())
        session["current_chat_id"] = chat_id
    return chat_id


@app.route("/get", methods=["POST"])
def chat():
    user_id = session["user_id"]
    conversation_id = get_current_chat_id() # ⬅️ MODIFIED
    msg = request.form["msg"]
    user_lang= request.form.get("lang", "en")
    # Save user message
    history_collection.insert_one({ "user_id": user_id, "conversation_id": conversation_id, # ⬅️ ADDED
                                   "role": "user",
                                   "message": msg,
                                   "lang": user_lang,
                                   "timestamp": datetime.now(timezone.utc)
                                   })
    try:
        # Translate input → English
        msg_en = msg if user_lang == "en" else translate_text(msg, "en", source_lang=user_lang)
        # RAG
        response = rag_chain.invoke({"input": msg_en})
        answer_en = response.get("answer", "I am not sure about that.")
        # Translate output → user's language
        answer_final = answer_en if user_lang == "en" else translate_text(answer_en, user_lang)
    except Exception as e:
        print("❌ Chat Error:", e)
        answer_final = "⚠️ Internal error — try again."
    
    # Save bot reply
    history_collection.insert_one({ "user_id": user_id,
                                   "conversation_id": conversation_id, # ⬅️ ADDED
                                   "role": "bot",
                                   "message": answer_final,
                                   "lang": user_lang,
                                   "timestamp": datetime.now(timezone.utc)
                                   })
    return answer_final


@app.route("/conversations", methods=["GET"])
def get_conversations():
    """Returns a list of all chat conversations for the user."""
    user_id = session["user_id"]
    # MongoDB aggregation to group messages by conversation_id
    # # and get the first message text as the title.
    pipeline = [
        {"$match": {"user_id": user_id, "role": "user"}},
        {"$sort": {"timestamp": 1}},
        {"$group": {
            "_id": "$conversation_id",
            "title": {"$first": "$message"},
            "timestamp": {"$first": "$timestamp"}
        }},
        {"$sort": {"timestamp": -1}}, # Newest chats first
        {"$project": {
            "_id": 0,
            "id": "$_id",
            "title": {"$substrCP": ["$title", 0, 40]}, # Truncate title
            "timestamp": 1
            }}]
    conversations = list(history_collection.aggregate(pipeline))
    return jsonify({"status": "success", "conversations": conversations})


@app.route("/conversation/<id>", methods=["GET"])
def get_conversation(id):
    """Returns all messages for a specific conversation ID."""
    user_id = session["user_id"]
    # Set the current chat ID to the requested ID
    session["current_chat_id"] = id
    msgs = list(history_collection.find(
        {"user_id": user_id, "conversation_id": id},
        {"_id": 0}
    ).sort("timestamp", 1))
    return jsonify({"status": "success", "messages": msgs, "conversation_id": id})


@app.route("/end_chat", methods=["POST"])
def end_chat():
    """Clears the current conversation ID from the session, effectively starting a new thread."""
    session["current_chat_id"] = None
    return jsonify({"status": "success", "message": "New conversation started"})


@app.route("/conversation/delete/<id>", methods=["POST"])
def delete_conversation(id):
    """Deletes a specific conversation by ID."""
    user_id = session["user_id"]
    history_collection.delete_many({"user_id": user_id, "conversation_id": id})
    # If the user deletes the chat they are currently viewing, reset the session ID
    if session.get("current_chat_id") == id:
        session["current_chat_id"] = None
    return jsonify({"status": "success", "message": f"Conversation {id} deleted"})


# ⬅️ REMOVED: /history and /history/clear are now /conversations and /end_chat (or /conversation/delete/<id>)

# ================================================================
# 8️⃣ DEFAULT ROUTE
# ================================================================
@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login_page"))
    return render_template("chat.html")


# ================================================================
# 9️⃣ RUN
# ================================================================
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=8080, debug=True)

if __name__ == "__main__":
    # Use environment variable PORT or default to 5000
    port = int(os.environ.get("PORT", 5000)) 
    app.run(host="0.0.0.0", port=port, debug=True)