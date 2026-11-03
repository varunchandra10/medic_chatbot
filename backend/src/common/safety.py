# backend/src/common/safety.py
import re
from typing import Optional
from .translator import translate
from .prompts import MEDICAL_DISCLAIMER

# =====================================================================
# EMERGENCY RED-FLAG REGEX PATTERNS
# =====================================================================
EMERGENCY_PATTERNS = [
    # 1. Cardiac / Acute Chest Distress
    r"\b(chest\s*pain|heart\s*attack|crushing\s*chest|cardiac\s*arrest|chest\s*pressure|pain\s*(radiating\s*to|in)\s*(my\s*)?(left\s*arm|jaw|neck))\b",
    # 2. Stroke / FAST (Face, Arms, Speech, Time)
    r"\b(stroke|facial\s*droop(ing)?|face\s*droop(ing)?|arm\s*weakness|slurred\s*speech|loss\s*of\s*speech|sudden\s*numbness\s*on\s*one\s*side|cannot\s*move\s*(my\s*)?(arm|leg|face))\b",
    # 3. Severe Dyspnea / Airway Obstruction
    r"\b(can'?t\s*breathe|cannot\s*breathe|gasping\s*for\s*(air|breath)|severe\s*shortness\s*of\s*breath|suffocating|choking|unable\s*to\s*breathe)\b",
    # 4. Crisis / Self-Harm / Suicidal Ideation
    r"\b(suicid(e|al)|kill\s*myself|end\s*my\s*life|want\s*to\s*die|self[-\s]*harm|overdos(e|ing)|take\s*all\s*(my\s*)?pills)\b",
    # 5. Anaphylaxis / Severe Acute Allergic Reaction
    r"\b(anaphyla(xis|ctic)|throat\s*(is\s*)?closing|swollen\s*tongue\s*and\s*throat|can'?t\s*swallow\s*after\s*eating|severe\s*allergic\s*reaction)\b",
    # 6. Uncontrolled Acute Bleeding
    r"\b(uncontrolled\s*bleeding|bleeding\s*heavily|coughing\s*up\s*(large\s*amounts\s*of\s*)?blood|vomiting\s*blood)\b",
]

COMPILED_EMERGENCY_REGEX = [
    re.compile(pattern, re.IGNORECASE) for pattern in EMERGENCY_PATTERNS
]

# Standard Emergency Hotline Advisory in English
EMERGENCY_ADVISORY_EN = (
    "🚨 MEDICAL EMERGENCY DETECTED\n\n"
    "If you or someone nearby is experiencing acute symptoms such as severe chest pain, "
    "difficulty breathing, signs of stroke, acute allergic shock, or thoughts of self-harm, "
    "please IMMEDIATELY contact emergency services or proceed to the nearest emergency room:\n\n"
    "• India: Call 112 (National Emergency) or 108 (Ambulance)\n"
    "• United States & Canada: Call 911 (or 988 for Suicide & Crisis Lifeline)\n"
    "• United Kingdom: Call 999\n\n"
    "Do NOT rely on an AI assistant during a life-threatening medical situation. "
    "Emergency personnel can provide life-saving intervention immediately."
)

# Prompt Injection Detection Patterns
INJECTION_PATTERNS = [
    r"ignore\s*(all|previous|prior)\s*instructions",
    r"disregard\s*(all|previous|prior)\s*prompts",
    r"you\s*are\s*now\s*an\s*unrestricted",
    r"dan\s*mode|jailbreak",
    r"system\s*prompt\s*override",
    r"bypass\s*(content|medical|safety)\s*filters",
]

COMPILED_INJECTION_REGEX = [
    re.compile(pattern, re.IGNORECASE) for pattern in INJECTION_PATTERNS
]

INJECTION_REFUSAL_EN = (
    "I am an educational medical assistant. I operate under strict clinical safety "
    "and ethical boundaries and cannot override established medical guidelines."
)


def check_emergency_triage(text: str, lang: str = "en") -> Optional[str]:
    """
    Deterministic triage filter.
    Returns an urgent advisory message if acute red-flag symptoms are detected,
    or None if input is safe to proceed to RAG.
    """
    if not text or not text.strip():
        return None

    cleaned = text.strip()

    # Scan for any emergency red-flag match
    for regex in COMPILED_EMERGENCY_REGEX:
        if regex.search(cleaned):
            print(f"[triage] [ALERT] EMERGENCY TRIGGER MATCHED: '{regex.pattern}' in input: '{cleaned[:50]}...'")
            if lang and lang.lower() != "en":
                return translate(EMERGENCY_ADVISORY_EN, target_lang=lang, source_lang="en")
            return EMERGENCY_ADVISORY_EN

    return None


def check_prompt_injection(text: str, lang: str = "en") -> Optional[str]:
    """
    Input validation filter to prevent prompt jailbreaks.
    Returns a refusal string if malicious injection is detected, or None if input is safe.
    """
    if not text or not text.strip():
        return None

    cleaned = text.strip()
    for regex in COMPILED_INJECTION_REGEX:
        if regex.search(cleaned):
            print(f"[safety] ⚠️ PROMPT INJECTION DETECTED: '{regex.pattern}' in input: '{cleaned[:50]}...'")
            if lang and lang.lower() != "en":
                return translate(INJECTION_REFUSAL_EN, target_lang=lang, source_lang="en")
            return INJECTION_REFUSAL_EN

    return None


def append_medical_disclaimer(response_text: str) -> str:
    """Appends standardized clinical disclaimer footnote to non-emergency responses."""
    if not response_text:
        return response_text

    disclaimer_block = f"\n\n---\n*{MEDICAL_DISCLAIMER}*"
    if MEDICAL_DISCLAIMER not in response_text:
        return response_text + disclaimer_block

    return response_text

