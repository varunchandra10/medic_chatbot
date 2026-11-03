# src/auth/utils.py
from functools import wraps
from flask import session, jsonify, request, redirect, url_for
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()


def init_bcrypt(app):
    """Initialize Bcrypt extension on the Flask app."""
    bcrypt.init_app(app)


def hash_password(password: str) -> str:
    """Hash plaintext password with Bcrypt."""
    return bcrypt.generate_password_hash(password).decode("utf-8")


def check_password(password_hash: str, password: str) -> bool:
    """Verify password against stored Bcrypt hash."""
    return bcrypt.check_password_hash(password_hash, password)


def login_required(f):
    """
    Route decorator ensuring user is authenticated via active session.
    Returns 403 JSON or redirects based on request context.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if "user_id" not in session:
            if request.is_json or request.path.startswith("/get") or request.path.startswith("/conversation"):
                return jsonify({"status": "error", "message": "Unauthorized"}), 403
            return redirect(url_for("auth.login_page"))
        return f(*args, **kwargs)

    return decorated_function

