# ============================================
#  AI Chatbot Backend using Gemini + Pinecone + Multilingual Support
# ============================================

from flask import Flask, render_template, request
from src.helper import download_hugging_face_embeddings
from langchain_pinecone import PineconeVectorStore
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate
from dotenv import load_dotenv
from src.prompt import *
from deep_translator import GoogleTranslator
import os

# -----------------------------
# 🔹 Initialize Flask App
# -----------------------------
app = Flask(__name__)

# -----------------------------
# 🔹 Load Environment Variables
# -----------------------------
load_dotenv()
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

os.environ["PINECONE_API_KEY"] = PINECONE_API_KEY
os.environ["GOOGLE_API_KEY"] = GOOGLE_API_KEY

# -----------------------------
# 🔹 Setup Embeddings + Pinecone
# -----------------------------
embeddings = download_hugging_face_embeddings()
index_name = "medical-chatbot"

docsearch = PineconeVectorStore.from_existing_index(
    index_name=index_name,
    embedding=embeddings
)
retriever = docsearch.as_retriever(search_type="similarity", search_kwargs={"k": 3})

# -----------------------------
# 🔹 Initialize Gemini LLM (LangChain Wrapper)
# -----------------------------
chatModel = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3
)

# -----------------------------
# 🔹 Define Prompt Template
# -----------------------------
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    ("human", "{input}")
])

# -----------------------------
# 🔹 Build Retrieval-Augmented Generation Chain
# -----------------------------
question_answer_chain = create_stuff_documents_chain(chatModel, prompt)
rag_chain = create_retrieval_chain(retriever, question_answer_chain)

# -----------------------------
# 🔹 Translation Utility
# -----------------------------
def translate_text(text, target_lang, source_lang="auto"):
    """
    Use deep-translator (GoogleTranslator backend)
    Supports: en, hi, ta, te
    """
    try:
        if target_lang not in ["en", "hi", "ta", "te"]:
            return text
        translated = GoogleTranslator(source=source_lang, target=target_lang).translate(text)
        return translated
    except Exception as e:
        print("⚠️ Translation Error:", e)
        return text  # fallback to original if fails

# -----------------------------
# 🔹 Flask Routes
# -----------------------------
@app.route("/")
def index():
    return render_template("chat.html")

@app.route("/get", methods=["POST"])
def chat():
    msg = request.form["msg"]
    user_lang = request.form.get("lang", "en")

    print(f"User Query (raw): {msg} | Selected lang: {user_lang}")

    try:
        # 1️⃣ Translate user input to English (for embeddings + Gemini)
        msg_en = msg if user_lang == "en" else translate_text(msg, "en", source_lang=user_lang)

        # 2️⃣ Run through RAG
        response = rag_chain.invoke({"input": msg_en})
        answer_en = response.get("answer", "I'm not sure how to answer that.")

        # 3️⃣ Translate output back to user’s language
        answer_final = answer_en if user_lang == "en" else translate_text(answer_en, user_lang, source_lang="en")

    except Exception as e:
        print("Error during RAG/translation:", e)
        answer_final = (
            "⚠️ ఏదో పొరపాటు జరిగింది. / कुछ गलती हो गई। / ஏதோ தவறு ஏற்பட்டது. / Sorry, something went wrong."
        )

    print("Response (final):", answer_final)
    return str(answer_final)

# -----------------------------
# 🔹 Run Flask App
# -----------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
