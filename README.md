# 🩺 Multilingual Medical Chatbot (Flask + LangChain + Gemini + Pinecone)

## 🚀 Overview
This project implements a **multilingual medical chatbot** built with **Flask** and **LangChain**, powered by **Gemini 2.0 Flash** for language understanding and **Pinecone** for semantic search.

It supports **English**, **Hindi**, **Tamil**, and **Telugu** through real-time translation and retrieval-augmented generation (RAG).

---

## 🧠 Key Technologies Used

| Component | Technology |
|------------|-------------|
| **Backend Framework** | Flask (Python) |
| **LLM & RAG Orchestration** | LangChain |
| **Large Language Model (LLM)** | Gemini 2.0 Flash (via `langchain-google-genai`) |
| **Vector Database** | Pinecone |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace) |
| **Multilingual Support** | `deep-translator` |
| **Frontend** | HTML5, CSS3, jQuery, JavaScript |

---

## ⚙️ Setup Instructions

### 🧩 Step 1: Clone the Repository

```bash
git clone https://github.com/varunchandra10/medic_chatbot.git
cd medical-chatbot
```

*(Replace the above link with your actual GitHub repo URL)*

---

### 🧩 Step 2: Create and Activate Virtual Environment

```bash
python -m venv venv
```

**Activate Environment:**

- **Linux/macOS/Git Bash**
  ```bash
  source venv/bin/activate
  ```
- **Windows (Command Prompt)**
  ```bash
  venv\Scripts\activate.bat
  ```
- **Windows (PowerShell)**
  ```bash
  .\venv\Scripts\Activate.ps1
  ```

---

### 🧩 Step 3: Install Required Packages

```bash
pip install -r requirements.txt
```

---

### 🧩 Step 4: Set Up Environment Variables

Create a `.env` file in the root directory and add:

```
PINECONE_API_KEY=your_pinecone_api_key
GOOGLE_API_KEY=your_google_genai_api_key
```

---

### 🧩 Step 5: (Optional) Run Setup Script

If you have a `template.sh` setup script:

```bash
chmod +x template.sh
./template.sh
```

---

### 🧩 Step 6: Start the Flask Application

```bash
python app.py
```

By default, the app runs at:  
👉 **http://127.0.0.1:5000/**

---

## 💬 How to Use the Chatbot

1. **Open the chatbot** in your browser: [http://127.0.0.1:5000](http://127.0.0.1:5000)
2. **Select your preferred language** (English, Hindi, Tamil, or Telugu).
3. **Enter your medical question** (e.g., "What are the symptoms of diabetes?").
4. The chatbot will:
   - Translate your question to English (if necessary)
   - Retrieve relevant medical context from Pinecone
   - Generate a concise, medically sound answer using Gemini 2.0 Flash
   - Translate it back to your selected language
5. **View the response** — rendered in Markdown with chat bubbles and animations.

---

## 🎥 Demo

🌐 **Live Demo:** [https://your-demo-link.com](https://your-demo-link.com)  
🎬 **Demo Video:** [https://youtu.be/your-demo-video](https://youtu.be/your-demo-video)

*(Replace with your actual deployment or video demo link)*

---

## 🧩 Architecture

### 🧱 1. Data Ingestion Pipeline

| Component | Files Used | Function |
|------------|-------------|----------|
| **Document Loading** | `helper.py` | Loads PDF files from the `data/` directory using `DirectoryLoader` and `PyPDFLoader`. |
| **Preprocessing & Chunking** | `helper.py` | Uses `RecursiveCharacterTextSplitter` (chunk size 500, overlap 20) to split content into chunks. |
| **Embedding** | `helper.py`, `store_index.py` | Uses `all-MiniLM-L6-v2` to embed each chunk into a 384-dimensional vector. |
| **Vector Storage** | `store_index.py` | Stores embedded vectors in the `medical-chatbot` index in Pinecone. |

---

### 💬 2. Query Processing Pipeline

| Step | Components | Description |
|------|-------------|-------------|
| **1. User Input & Language** | `chat.html`, `chat.js` | User selects a language (`en`, `hi`, `ta`, `te`) and sends the message to Flask. |
| **2. Input Translation** | `app.py` (`deep_translator`) | Converts non-English queries to English. |
| **3. Context Retrieval** | `app.py`, `store_index.py` | Embeds the query and retrieves top-3 similar context chunks from Pinecone. |
| **4. Answer Generation (RAG)** | `app.py`, `prompt.py` | Combines context + question and sends to Gemini 2.0 Flash to generate a medical response. |
| **5. Output Translation** | `app.py` (`deep_translator`) | Translates the response back to the user’s chosen language. |
| **6. Display** | `chat.js`, `app.py` | Renders Markdown-formatted output in chat UI. |

---

## 🌐 Frontend Features

- 🌗 Dynamic dark/light theming  
- 💬 Smooth chat animations  
- 📝 Markdown-rendered messages  
- 🌍 Multilingual support (English, Hindi, Tamil, Telugu)  
- 🧾 Scrollable conversation history  

---

## 🧾 Example Workflow

1. User selects **Telugu** and asks: _"డయాబెటిస్ లక్షణాలు ఏమిటి?"_  
2. Query → translated to English  
3. Pinecone retrieves top-3 chunks  
4. Gemini 2.0 Flash generates a concise English answer  
5. Answer → translated back to Telugu  
6. UI displays: _"డయాబెటిస్ యొక్క ప్రధాన లక్షణాలు ఇవి..."_

---

## 🛠️ Folder Structure

```
medical-chatbot/
│
├── app.py
├── helper.py
├── store_index.py
├── prompt.py
├── requirements.txt
├── template.sh
│
├── data/                  # PDF documents for ingestion
├── static/                # CSS, JS, images
├── templates/             # HTML templates (chat.html)
└── venv/                  # Virtual environment
```

---

## 🧑‍💻 API Endpoints

| Endpoint | Method | Description |
|-----------|---------|-------------|
| `/` | GET | Loads chat UI |
| `/get` | POST | Accepts JSON `{ msg, lang }`, returns translated AI response |

---

## 💡 Future Improvements

- ⏱️ Streamed responses (real-time output)  
- 🗣️ Voice input/output support  
- 🧾 Multi-document summarization  
- 💻 UI upgrade using React or Vue  
- 🩺 Integration with live medical databases  

---

## 🧑‍⚕️ Author

**Developed by:** Team RTX  
**Team Members:** Kola Varun Chandra, Anabhyan S, Sri Gurubhaguvela D  
**GitHub:** [https://github.com/YourGitHubProfile](https://github.com/YourGitHubProfile)  
**Email:** kvarunchandra19@gmail.com  

---

🩺 _A multilingual AI-powered assistant designed to make healthcare knowledge accessible to everyone._
