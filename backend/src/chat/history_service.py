# backend/src/chat/history_service.py
from datetime import datetime, timezone
from ..common.db import get_history_collection
from langchain_core.messages import HumanMessage, AIMessage


def save_message(user_id: str, conversation_id: str, role: str, message: str, lang: str = "en"):
    """Persist a user or bot message to the MongoDB chat_history collection."""
    history = get_history_collection()
    history.insert_one(
        {
            "user_id": user_id,
            "conversation_id": conversation_id,
            "role": role,
            "message": message,
            "lang": lang,
            "timestamp": datetime.now(timezone.utc),
        }
    )


def list_conversations(user_id: str):
    """Retrieve distinct conversation sessions with their first message title."""
    history = get_history_collection()
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
    return list(history.aggregate(pipeline))


def get_conversation_messages(user_id: str, conversation_id: str):
    """Retrieve all chronological messages for a specific conversation session."""
    history = get_history_collection()
    return list(
        history.find(
            {"user_id": user_id, "conversation_id": conversation_id},
            {"_id": 0},
        ).sort("timestamp", 1)
    )


def get_recent_history(user_id: str, conversation_id: str, limit: int = 6):
    """
    Retrieve the most recent N turns formatted as LangChain BaseMessage objects
    (HumanMessage / AIMessage) for conversational RAG context.
    """
    history = get_history_collection()
    raw_messages = list(
        history.find(
            {"user_id": user_id, "conversation_id": conversation_id},
            {"_id": 0, "role": 1, "message": 1},
        )
        .sort("timestamp", -1)
        .limit(limit)
    )

    # Reverse to chronological order (oldest -> newest of the last N)
    raw_messages.reverse()

    formatted = []
    for m in raw_messages:
        role = m.get("role")
        content = m.get("message", "")
        if role == "user":
            formatted.append(HumanMessage(content=content))
        elif role == "bot":
            formatted.append(AIMessage(content=content))

    return formatted


def delete_conversation(user_id: str, conversation_id: str):
    """Delete all messages associated with a conversation session."""
    history = get_history_collection()
    result = history.delete_many({"user_id": user_id, "conversation_id": conversation_id})
    return result.deleted_count
