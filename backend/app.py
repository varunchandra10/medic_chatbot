# backend/app.py
import os
import sys
from pathlib import Path
from flask import Flask, jsonify, send_from_directory

# Automatically register project root and backend directory in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent

for _p in (str(BASE_DIR), str(BACKEND_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

try:
    from backend.config import Config
    from backend.src.auth.utils import init_bcrypt
    from backend.src.common.limiter import limiter
    from backend.src.auth.routes import auth_bp
    from backend.src.chat.routes import chat_bp
except ImportError:
    from config import Config
    from src.auth.utils import init_bcrypt
    from src.common.limiter import limiter
    from src.auth.routes import auth_bp
    from src.chat.routes import chat_bp


def create_app(config_class=Config):
    """Application factory configuring modern React frontend and API blueprints."""
    dist_dir = str(BASE_DIR / "frontend" / "dist")
    assets_dir = str(BASE_DIR / "frontend" / "dist" / "assets")

    app = Flask(
        __name__,
        static_folder=assets_dir,
        static_url_path="/assets",
    )
    app.config.from_object(config_class)
    app.secret_key = config_class.SECRET_KEY

    # Initialize extensions
    init_bcrypt(app)
    limiter.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(chat_bp)

    @app.route("/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "version": "2.0.0",
            "engine": "ChromaDB + FastEmbed ONNX",
            "ui": "React + Vite (Modern Adapted)"
        }), 200

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        """Serves compiled React frontend and public assets."""
        if path != "" and os.path.exists(os.path.join(dist_dir, path)):
            return send_from_directory(dist_dir, path)
        if os.path.exists(os.path.join(dist_dir, "index.html")):
            return send_from_directory(dist_dir, "index.html")
        return jsonify({"message": "Frontend build not found. Run 'npm run build' inside frontend/"}), 404

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)


