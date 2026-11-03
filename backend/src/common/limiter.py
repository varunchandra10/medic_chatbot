# backend/src/common/limiter.py
from flask import session, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def get_user_session_or_ip() -> str:
    """
    Key function for per-session rate limiting on authenticated endpoints.
    Falls back to client IP address if user session is not present.
    """
    return session.get("user_id") or get_remote_address()


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
    storage_uri="memory://",
)

