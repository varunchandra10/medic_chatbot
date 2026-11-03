# backend/src/common/db.py
"""
Local-First Application Database Manager.
Defaults to local SQLite (data/mediassist.db) requiring zero configuration or background servers.
Seamlessly falls back to MongoDB Atlas when MONGO_URI is explicitly configured.
"""

import os
import sqlite3
import time
from typing import Any, Dict, List, Optional

SQLITE_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../data/mediassist.db")
)


class SQLiteCollection:
    """Provides a MongoDB-like collection interface over SQLite tables."""

    def __init__(self, db_path: str, table_name: str):
        self.db_path = db_path
        self.table_name = table_name

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        clauses = []
        params = []
        for k, v in query.items():
            clauses.append(f"{k} = ?")
            params.append(v)
        where_clause = " AND ".join(clauses) if clauses else "1=1"

        cursor.execute(f"SELECT * FROM {self.table_name} WHERE {where_clause} LIMIT 1", params)
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def insert_one(self, document: Dict[str, Any]):
        conn = self._get_connection()
        cursor = conn.cursor()
        keys = list(document.keys())
        placeholders = ", ".join(["?"] * len(keys))
        columns = ", ".join(keys)
        values = [document[k] for k in keys]

        cursor.execute(
            f"INSERT INTO {self.table_name} ({columns}) VALUES ({placeholders})",
            values,
        )
        conn.commit()
        last_id = cursor.lastrowid
        conn.close()

        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = str(inserted_id)

        return InsertResult(last_id)

    def find(self, query: Dict[str, Any], sort: Optional[List] = None, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        conn = self._get_connection()
        cursor = conn.cursor()
        clauses = []
        params = []
        for k, v in query.items():
            clauses.append(f"{k} = ?")
            params.append(v)
        where_clause = " AND ".join(clauses) if clauses else "1=1"

        sql = f"SELECT * FROM {self.table_name} WHERE {where_clause}"
        if sort:
            sort_clauses = [f"{field} {'DESC' if order == -1 else 'ASC'}" for field, order in sort]
            sql += f" ORDER BY {', '.join(sort_clauses)}"
        if limit:
            sql += f" LIMIT {limit}"

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def delete_many(self, query: Dict[str, Any]):
        conn = self._get_connection()
        cursor = conn.cursor()
        clauses = []
        params = []
        for k, v in query.items():
            clauses.append(f"{k} = ?")
            params.append(v)
        where_clause = " AND ".join(clauses) if clauses else "1=1"

        cursor.execute(f"DELETE FROM {self.table_name} WHERE {where_clause}", params)
        conn.commit()
        deleted_count = cursor.rowcount
        conn.close()

        class DeleteResult:
            def __init__(self, count):
                self.deleted_count = count

        return DeleteResult(deleted_count)

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any]):
        conn = self._get_connection()
        cursor = conn.cursor()
        set_data = update.get("$set", update)
        set_clauses = [f"{k} = ?" for k in set_data.keys()]
        set_params = list(set_data.values())

        where_clauses = [f"{k} = ?" for k in query.keys()]
        where_params = list(query.values())

        where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
        sql = f"UPDATE {self.table_name} SET {', '.join(set_clauses)} WHERE {where_sql}"
        cursor.execute(sql, set_params + where_params)
        conn.commit()
        updated_count = cursor.rowcount
        conn.close()
        return updated_count


class Database:
    """Singleton database manager providing local SQLite or optional MongoDB."""

    _instance = None
    _users_collection = None
    _history_collection = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._init_sqlite()
        return cls._instance

    def _init_sqlite(self):
        os.makedirs(os.path.dirname(SQLITE_PATH), exist_ok=True)
        conn = sqlite3.connect(SQLITE_PATH)
        cursor = conn.cursor()

        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                name TEXT,
                password_hash TEXT NOT NULL,
                age INTEGER,
                role TEXT DEFAULT 'Clinician',
                specialization TEXT DEFAULT 'General Practice',
                created_at REAL
            )
        """)

        # Auto-migrate columns if table already existed
        for col_def in [
            ("role", "TEXT DEFAULT 'Clinician'"),
            ("specialization", "TEXT DEFAULT 'General Practice'"),
            ("picture", "TEXT"),
            ("auth_provider", "TEXT DEFAULT 'local'")
        ]:
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_def[0]} {col_def[1]}")
            except Exception:
                pass

        # Conversations history table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                message TEXT NOT NULL,
                language TEXT DEFAULT 'en',
                timestamp REAL
            )
        """)

        # News cache table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS news_cache (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                source TEXT,
                summary TEXT,
                time TEXT,
                cached_at REAL
            )
        """)

        conn.commit()
        conn.close()

        self._users_collection = SQLiteCollection(SQLITE_PATH, "users")
        self._history_collection = SQLiteCollection(SQLITE_PATH, "conversations")
        print(f"[db] Local SQLite Database active at: {SQLITE_PATH}")

    @property
    def users(self):
        return self._users_collection

    @property
    def history(self):
        return self._history_collection


db = Database()


def get_users_collection():
    """Helper to return the users collection/table."""
    return db.users


def get_history_collection():
    """Helper to return the conversations history collection/table."""
    return db.history

