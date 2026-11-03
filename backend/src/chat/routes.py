# backend/src/chat/routes.py
import json
import time
import base64
from flask import (
    Blueprint,
    request,
    jsonify,
    session,
    Response,
    stream_with_context,
)
from ..common.translator import translate
from ..common.news import fetch_latest_medical_news
from ..common.limiter import limiter, get_user_session_or_ip
from ..common.prompts import MEDICAL_DISCLAIMER
from ..common.safety import (
    check_emergency_triage,
    check_prompt_injection,
    append_medical_disclaimer,
)
from .rag_service import rag_service
from .react_agent import react_agent
from .document_service import (
    extract_text_from_pdf,
    stream_image_analysis_gemini,
    stream_document_text_analysis,
)

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/get", methods=["POST"])
@limiter.limit("30 per minute", key_func=get_user_session_or_ip)
def chat():
    # Enforce authentication for consultation chat
    user_email = session.get("user_email")
    user_id = session.get("user_id")
    if not user_email and not user_id:
        def unauth_err():
            yield f"data: {json.dumps({'error': 'Unauthorized', 'token': 'Authentication required. Please sign in to consult with Medi-Assist.'})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(unauth_err(), mimetype="text/event-stream", status=401)

    data = request.get_json(silent=True) or request.form
    user_message = data.get("msg", "").strip()
    lang = (data.get("lang") or data.get("language") or "en").lower()
    is_agentic = data.get("agentic", True)
    if isinstance(is_agentic, str):
        is_agentic = is_agentic.lower() in ("true", "1", "yes")

    file_data = data.get("file_data")
    file_name = data.get("file_name", "document")
    file_type = (data.get("file_type") or "").lower()

    # Decode base64 file data if present
    file_bytes = None
    if file_data and "," in file_data:
        try:
            b64_content = file_data.split(",", 1)[1]
            file_bytes = base64.b64decode(b64_content)
        except Exception as e:
            print(f"[doc] Base64 decode error: {e}")

    # Fallback default query if user uploaded a file without text
    if not user_message and file_bytes:
        user_message = f"Please explain the medical test results, values, or medications in this {file_name}."

    if not user_message:
        def empty_err():
            yield f"data: {json.dumps({'token': 'Please enter a medical query or attach a lab report / prescription.'})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(empty_err(), mimetype="text/event-stream")

    # 1. Image Analysis via Gemini Vision
    is_image = file_type.startswith("image/") or file_name.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))
    if file_bytes and is_image:
        def stream_vision():
            for chunk in stream_image_analysis_gemini(
                file_bytes,
                mime_type=file_type or "image/jpeg",
                user_query=user_message,
                lang=lang
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_vision(), mimetype="text/event-stream")

    # 2. Digital PDF Lab Report Analysis via Document Service
    is_pdf = file_type == "application/pdf" or file_name.lower().endswith(".pdf")
    if file_bytes and is_pdf:
        extracted_text = extract_text_from_pdf(file_bytes)
        if extracted_text:
            def stream_doc():
                for chunk in stream_document_text_analysis(
                    doc_text=extracted_text,
                    file_name=file_name,
                    user_query=user_message,
                    lang=lang
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"
            return Response(stream_doc(), mimetype="text/event-stream")

    # 3. Prompt Injection Filter
    if check_prompt_injection(user_message):
        def injection_err():
            yield f"data: {json.dumps({'token': 'Security alert: Invalid command pattern detected.'})}\n\n"
            yield "data: [DONE]\n\n"
        return Response(injection_err(), mimetype="text/event-stream")

    # 2. Non-Agentic Direct Emergency Triage Interception
    if not is_agentic:
        emergency_msg = check_emergency_triage(user_message)
        if emergency_msg:
            def emergency_stream():
                alert_payload = {
                    "token": emergency_msg + "\n\n" + MEDICAL_DISCLAIMER,
                    "emergency_triage": "CRITICAL EMERGENCY DETECTED: Immediately contact emergency services.",
                    "citations": [{
                        "book_title": "Emergency Medicine Protocol (AHA / BLS)",
                        "page": "Triage 1",
                        "excerpt": emergency_msg
                    }]
                }
                yield f"data: {json.dumps(alert_payload)}\n\n"
                yield "data: [DONE]\n\n"
            return Response(emergency_stream(), mimetype="text/event-stream")

    # 3. Stream Response (ReAct Agentic Cycle or Direct RAG)
    def generate_response():
        # Translate query to English for medical vector matching if user asked in regional language
        query_in_english = user_message
        if lang != "en":
            try:
                query_in_english = translate(user_message, src=lang, dest="en")
            except Exception:
                query_in_english = user_message

        try:
            generator = (
                react_agent.run_agentic_cycle(query_in_english, lang=lang)
                if is_agentic
                else rag_service.query(query_in_english)
            )

            for chunk in generator:
                # If chunk contains text that needs regional translation
                if lang != "en" and "token" in chunk:
                    try:
                        translated_token = translate(chunk["token"], src="en", dest=lang)
                        chunk["token"] = translated_token
                    except Exception:
                        pass
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'Clinical query error: {str(e)}'})}\n\n"

        yield "data: [DONE]\n\n"

    return Response(stream_with_context(generate_response()), mimetype="text/event-stream")


@chat_bp.route("/api/news", methods=["GET"])
def get_news():
    """Returns curated public health bulletins (live or cached) by location."""
    lang = request.args.get("lang", "en")
    country = request.args.get("country", "in")
    try:
        articles = fetch_latest_medical_news(lang=lang, country=country)
        return jsonify({"news": articles, "country": country}), 200
    except Exception as e:
        # Fallback offline advisories
        return jsonify({
            "news": [
                {
                    "title": "Preventive Cardiovascular Health Guidelines",
                    "source": "AHA Health Advisory",
                    "published": "2025-11-20",
                    "summary": "Regular 150-minute weekly aerobic activity, blood pressure monitoring (<120/80 mmHg), and dietary sodium reduction (<2g/day).",
                    "image": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&q=80"
                },
                {
                    "title": "Seasonal Viral Infection & Respiratory Guidance",
                    "source": "WHO Health Advisory",
                    "published": "2025-11-19",
                    "summary": "Hydration, symptom tracking, and early isolation protocols for viral febrile illnesses.",
                    "image": "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&q=80"
                }
            ],
            "country": country
        }), 200


@chat_bp.route("/api/corpus/update", methods=["POST"])
def update_corpus():
    """Triggers incremental corpus ingestion scan."""
    try:
        from ..corpus.ingest import run_ingestion
        run_ingestion(force=False)
        return jsonify({"message": "Knowledge base updated successfully with any new or modified PDFs."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
