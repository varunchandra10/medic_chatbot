# backend/src/auth/routes.py
import re
import time
import urllib.parse
import requests
from flask import Blueprint, request, jsonify, session, redirect
from ..common.db import get_users_collection
from ..common.limiter import limiter
from .utils import hash_password, check_password

try:
    from backend.config import Config
except ImportError:
    from config import Config

try:
    from google.oauth2 import id_token
    from google.auth.transport import requests as google_requests
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/auth/config", methods=["GET"])
def get_auth_config():
    """Returns public authentication configuration for frontend clients."""
    return jsonify({
        "google_client_id": getattr(Config, "GOOGLE_CLIENT_ID", "") or "",
        "google_enabled": bool(getattr(Config, "GOOGLE_CLIENT_ID", "") or True)
    }), 200


@auth_bp.route("/api/auth/me", methods=["GET"])
def get_current_user():
    """Returns current active user profile or unauthenticated state."""
    user_email = session.get("user_email")

    if user_email:
        users = get_users_collection()
        user = users.find_one({"email": user_email})
        if user:
            return jsonify({
                "authenticated": True,
                "user": {
                    "id": user.get("id"),
                    "name": user.get("name") or user_email.split("@")[0],
                    "email": user.get("email"),
                    "picture": user.get("picture") or session.get("user_picture"),
                    "auth_provider": user.get("auth_provider") or "local",
                    "created_at": user.get("created_at")
                }
            }), 200

    # Not authenticated
    return jsonify({
        "authenticated": False,
        "user": None
    }), 200


@auth_bp.route("/api/auth/profile", methods=["POST", "PUT"])
def update_profile():
    """Updates user profile details."""
    user_email = session.get("user_email")
    if not user_email:
        return jsonify({"status": "error", "message": "Authentication required."}), 401

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()

    users = get_users_collection()
    update_data = {}
    if name:
        update_data["name"] = name
        session["user_name"] = name

    if update_data:
        users.update_one({"email": user_email}, update_data)

    user = users.find_one({"email": user_email})
    return jsonify({
        "status": "success",
        "message": "Profile updated successfully.",
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "picture": user.get("picture"),
            "auth_provider": user.get("auth_provider", "local")
        }
    }), 200


@auth_bp.route("/api/auth/google", methods=["POST"])
@limiter.limit("30 per minute")
def google_auth():
    """Authenticates or registers a user via Google OAuth 2.0 (Google Identity Services)."""
    data = request.get_json(silent=True) or {}
    credential = data.get("credential")  # JWT ID Token from Google GIS
    access_token = data.get("access_token")  # Access Token from Google OAuth2 Token Client

    user_info = None

    # 1. Verify access_token with Google's userinfo API
    if access_token:
        try:
            resp = requests.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=8
            )
            if resp.status_code == 200:
                user_info = resp.json()
        except Exception as e:
            print(f"[google_auth] Userinfo fetch error: {e}")

    # 2. Verify credential (ID Token)
    if not user_info and credential:
        client_id = getattr(Config, "GOOGLE_CLIENT_ID", "")
        # Try local verification via google.oauth2.id_token
        if GOOGLE_AUTH_AVAILABLE and client_id:
            try:
                user_info = id_token.verify_oauth2_token(
                    credential,
                    google_requests.Request(),
                    client_id
                )
            except Exception as e:
                print(f"[google_auth] Local verification fallback: {e}")
                user_info = None

        # Fallback: Verify directly via Google's tokeninfo API
        if not user_info:
            try:
                resp = requests.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={credential}",
                    timeout=8
                )
                if resp.status_code == 200:
                    user_info = resp.json()
            except Exception as e:
                print(f"[google_auth] Tokeninfo verification error: {e}")

    if not user_info or not user_info.get("email"):
        return jsonify({
            "status": "error",
            "message": "Google authentication failed. Please try again."
        }), 400

    email = user_info.get("email", "").strip().lower()
    name = user_info.get("name") or email.split("@")[0]
    picture = user_info.get("picture") or ""

    users_collection = get_users_collection()
    user = users_collection.find_one({"email": email})

    if not user:
        # Create new Google OAuth user
        insert_res = users_collection.insert_one({
            "name": name,
            "email": email,
            "password_hash": "oauth:google",
            "picture": picture,
            "auth_provider": "google",
            "created_at": time.time(),
        })
        user_id = str(insert_res.inserted_id) if hasattr(insert_res, "inserted_id") else str(time.time())
    else:
        user_id = str(user.get("id", ""))
        # Update picture and auth_provider if missing
        users_collection.update_one(
            {"email": email},
            {"picture": picture, "auth_provider": "google"}
        )

    # Establish authenticated session
    session["user_id"] = user_id
    session["user_name"] = name
    session["user_email"] = email
    session["user_picture"] = picture

    return jsonify({
        "status": "success",
        "message": "Signed in with Google successfully.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "picture": picture,
            "auth_provider": "google"
        }
    }), 200


@auth_bp.route("/api/auth/google/login", methods=["GET"])
def google_login_redirect():
    """Redirects user to official Google OAuth 2.0 authorization screen."""
    client_id = getattr(Config, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        return jsonify({"status": "error", "message": "GOOGLE_CLIENT_ID is not configured in .env"}), 400

    # Match URIs 8 in Google Cloud Console
    redirect_uri = getattr(Config, "GOOGLE_REDIRECT_URI", "http://localhost:5173/api/auth/google/callback")
    session["oauth_redirect_uri"] = redirect_uri

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account"
    }
    google_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
    return redirect(google_url)


@auth_bp.route("/api/auth/google/callback", methods=["GET"])
def google_callback():
    """Handles OAuth 2.0 code exchange redirect callback from Google."""
    code = request.args.get("code")
    if not code:
        return redirect("/?error=google_auth_failed")

    client_id = getattr(Config, "GOOGLE_CLIENT_ID", "")
    client_secret = getattr(Config, "GOOGLE_CLIENT_SECRET", "")
    redirect_uri = session.get("oauth_redirect_uri") or getattr(Config, "GOOGLE_REDIRECT_URI", "http://localhost:5173/api/auth/google/callback")

    token_resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        },
        timeout=10
    )
    if token_resp.status_code != 200:
        print(f"[google_callback] Token exchange error: {token_resp.text}")
        return redirect("/?error=token_exchange_failed")

    token_data = token_resp.json()
    access_token = token_data.get("access_token")

    user_resp = requests.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=8
    )
    if user_resp.status_code != 200:
        return redirect("/?error=userinfo_failed")

    user_info = user_resp.json()
    email = user_info.get("email", "").strip().lower()
    name = user_info.get("name") or email.split("@")[0]
    picture = user_info.get("picture") or ""

    users_collection = get_users_collection()
    user = users_collection.find_one({"email": email})
    if not user:
        ins = users_collection.insert_one({
            "name": name,
            "email": email,
            "password_hash": "oauth:google",
            "picture": picture,
            "auth_provider": "google",
            "created_at": time.time(),
        })
        user_id = str(ins.inserted_id) if hasattr(ins, "inserted_id") else str(time.time())
    else:
        user_id = str(user.get("id", ""))
        users_collection.update_one({"email": email}, {"picture": picture, "auth_provider": "google"})

    session["user_id"] = user_id
    session["user_name"] = name
    session["user_email"] = email
    session["user_picture"] = picture

    return redirect("/")


@auth_bp.route("/register", methods=["POST"])
@auth_bp.route("/api/auth/register", methods=["POST"])
@limiter.limit("10 per minute")
def register():
    data = request.get_json(silent=True) or request.form or {}
    if not data:
        return jsonify({"status": "error", "message": "Invalid request payload"}), 400

    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not name or not email or not password:
        return jsonify({"status": "error", "message": "Name, email, and password are required"}), 400

    EMAIL_REGEX = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    if not re.match(EMAIL_REGEX, email):
        return jsonify({"status": "error", "message": "Invalid email address format"}), 400

    if len(password) < 6:
        return jsonify({"status": "error", "message": "Password must be at least 6 characters long"}), 400

    users_collection = get_users_collection()
    if users_collection.find_one({"email": email}):
        return jsonify({"status": "error", "message": "An account with this email already exists"}), 400

    hashed = hash_password(password)
    insert_res = users_collection.insert_one({
        "name": name,
        "email": email,
        "password_hash": hashed,
        "auth_provider": "local",
        "created_at": time.time(),
    })

    user_id = str(insert_res.inserted_id) if hasattr(insert_res, "inserted_id") else str(time.time())

    # Start active session immediately
    session["user_id"] = user_id
    session["user_name"] = name
    session["user_email"] = email

    return jsonify({
        "status": "success",
        "message": "Account created successfully.",
        "user": {
            "id": user_id,
            "name": name,
            "email": email,
            "auth_provider": "local"
        }
    }), 201


@auth_bp.route("/login", methods=["POST"])
@auth_bp.route("/api/auth/login", methods=["POST"])
@limiter.limit("15 per minute")
def login():
    data = request.get_json(silent=True) or request.form or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password")

    if not email or not password:
        return jsonify({"status": "error", "message": "Email and password are required"}), 400

    users_collection = get_users_collection()
    user = users_collection.find_one({"email": email})

    stored_hash = user.get("password_hash") if user else None
    if not user or not stored_hash or not check_password(stored_hash, password):
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401

    session["user_id"] = str(user.get("id", ""))
    session["user_name"] = user.get("name", "User")
    session["user_email"] = user.get("email", email)
    session["user_picture"] = user.get("picture", "")

    return jsonify({
        "status": "success",
        "message": "Login successful.",
        "user": {
            "id": user.get("id"),
            "name": user.get("name"),
            "email": user.get("email"),
            "picture": user.get("picture", ""),
            "auth_provider": user.get("auth_provider", "local")
        }
    }), 200


@auth_bp.route("/logout", methods=["GET", "POST"])
@auth_bp.route("/api/auth/logout", methods=["GET", "POST"])
def logout():
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully"}), 200
