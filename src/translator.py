# src/translator.py
from deep_translator import LibreTranslator, MyMemoryTranslator, GoogleTranslator
from typing import Optional
import traceback

# Supported front-end language codes
SUPPORTED_LANGS = {"en", "hi", "ta", "te"}

def translate_text(text: str, src_lang: str, tgt_lang: str) -> str:
    """
    Translate text from src_lang -> tgt_lang.
    Tries: LibreTranslate -> MyMemory -> GoogleTranslator.
    Returns original text on failure.
    """
    if not text:
        return text

    src = (src_lang or "en").lower()
    tgt = (tgt_lang or "en").lower()

    # Short-circuit if same language
    if src == tgt:
        return text

    print(f"[translator] Translating from {src} -> {tgt}")

    # 1️⃣ Try LibreTranslate (public instance)
    try:
        t = LibreTranslator(source=src, target=tgt).translate(text)
        if t and t.strip() != text.strip():
            print("[translator] ✅ LibreTranslate success")
            return t
    except Exception as e:
        print(f"[translator] LibreTranslate failed: {e}")
        traceback.print_exc(limit=1)

    # 2️⃣ Fallback: MyMemoryTranslator
    try:
        t = MyMemoryTranslator(source=src, target=tgt).translate(text)
        if t and t.strip() != text.strip():
            print("[translator] ✅ MyMemory success")
            return t
    except Exception as e:
        print(f"[translator] MyMemory failed: {e}")
        traceback.print_exc(limit=1)

    # 3️⃣ Fallback: GoogleTranslator (usually handles Tamil best)
    try:
        t = GoogleTranslator(source=src, target=tgt).translate(text)
        if t and t.strip() != text.strip():
            print("[translator] ✅ GoogleTranslator success")
            return t
    except Exception as e:
        print(f"[translator] GoogleTranslator failed: {e}")
        traceback.print_exc(limit=1)

    print("[translator] ⚠️ All translators failed — returning original text")
    return text
