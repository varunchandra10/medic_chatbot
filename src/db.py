from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

client = MongoClient(MONGO_URL)
db = client["medical_chatbot"]

users_collection = db["users"]
history_collection = db["chat_history"]   # NEW COLLECTION

