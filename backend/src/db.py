# src/db.py - Backwards compatibility wrapper
from backend.src.common.db import (
    get_users_collection,
    get_history_collection,
    db as db_instance,
)

users_collection = get_users_collection()
history_collection = get_history_collection()
db = db_instance
client = None
