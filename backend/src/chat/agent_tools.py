# backend/src/chat/agent_tools.py
"""
Clinical Agent Tools for ReAct Reasoning Engine.
Provides tools for:
1. Semantic search across the 19,712 textbook vectors (ChromaDB).
2. Deterministic emergency red-flag triage.
3. CDC / WHO public health advisory lookups.
"""

from typing import Dict, List, Tuple
from ..common.vectorstore import get_vector_store
from ..common.formatter import format_clinical_text
from ..common.safety import check_emergency_triage as safety_triage
from ..common.news import fetch_latest_medical_news


def tool_search_clinical_knowledge(query: str) -> Tuple[str, List[Dict]]:
    """
    Searches the 19,712 clinical textbook vectors in ChromaDB.
    Returns: (formatted_observation_text, list_of_citation_objects)
    """
    try:
        vs = get_vector_store()
        results = vs.similarity_search_with_score(query, k=2, score_threshold=0.60)
        if not results:
            return "No sufficiently relevant clinical reference found in textbooks for this query.", []

        citations = []
        obs_blocks = []

        for doc, score in results:
            book = doc.metadata.get("book_title", "Medical Reference")
            page = doc.metadata.get("page", "N/A")
            raw = doc.page_content.strip()
            formatted = format_clinical_text(raw)

            citations.append({
                "book_title": book,
                "page": page,
                "score": score,
                "excerpt": raw[:260] + "..." if len(raw) > 260 else raw,
            })
            obs_blocks.append(f"Source: {book} (Page {page})\n{formatted}")

        observation_text = "\n\n---\n\n".join(obs_blocks)
        return observation_text, citations
    except Exception as e:
        return f"Tool execution error: {str(e)}", []


def tool_check_emergency_triage(symptoms_text: str) -> str:
    """
    Evaluates acute red-flag medical emergencies (cardiac arrest, stroke, dyspnea, suicide, anaphylaxis).
    Returns emergency alert or 'Normal / Non-acute' status.
    """
    alert = safety_triage(symptoms_text)
    if alert:
        return f"CRITICAL EMERGENCY DETECTED: {alert}"
    return "Non-acute presentation. Safe to proceed with educational clinical RAG."


def tool_get_health_bulletins(topic: str = "") -> str:
    """
    Queries live or cached public health alerts from WHO / CDC / Medical feeds.
    """
    try:
        articles = fetch_latest_medical_news()
        if not articles:
            return "No active outbreak alerts found."
        summaries = [f"• {a.get('title')}: {a.get('summary', '')[:120]}" for a in articles[:2]]
        return "\n".join(summaries)
    except Exception as e:
        return f"Unable to fetch news bulletins ({e})."


AVAILABLE_TOOLS = {
    "search_clinical_knowledge": {
        "func": tool_search_clinical_knowledge,
        "description": "Searches clinical textbooks (CMDT, Harrison's, Gale Encyclopedia) for symptoms, disease definitions, and treatments."
    },
    "check_emergency_triage": {
        "func": tool_check_emergency_triage,
        "description": "Checks if the patient's symptoms indicate a life-threatening acute emergency requiring immediate 112/911/108 response."
    },
    "get_health_bulletins": {
        "func": tool_get_health_bulletins,
        "description": "Retrieves recent health alerts or epidemiological updates."
    }
}

