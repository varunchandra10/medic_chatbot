# backend/src/common/translator.py
from functools import lru_cache
from deep_translator import GoogleTranslator, MyMemoryTranslator, LibreTranslator

try:
    from backend.config import Config
except ImportError:
    from backend.config import Config

SUPPORTED_LANGUAGES = getattr(Config, "SUPPORTED_LANGUAGES", {"en", "hi", "ta", "te"})


@lru_cache(maxsize=1024)
def _translate_cached(text: str, src_lang: str, tgt_lang: str) -> str:
    """
    Internal cached multi-tier translation helper.
    Caches up to 1,024 unique phrases/responses in memory to minimize external network I/O.
    """
    src = (src_lang or "auto").lower()
    tgt = (tgt_lang or "en").lower()

    if src == tgt or not text or not text.strip():
        return text

    # Tier 1: GoogleTranslator (Best accuracy & broadest vocabulary for Hindi, Tamil, Telugu)
    try:
        translated = GoogleTranslator(source=src, target=tgt).translate(text)
        if translated and translated.strip():
            return translated
    except Exception as e:
        print(f"[translator] Tier 1 (GoogleTranslator) failed for {src}->{tgt}: {e}")

    # Tier 2: MyMemoryTranslator (Reliable secondary fallback for phrases <= 500 chars)
    if len(text) <= 500:
        try:
            translated = MyMemoryTranslator(source=src, target=tgt).translate(text)
            if translated and translated.strip() != text.strip():
                return translated
        except Exception as e:
            print(f"[translator] Tier 2 (MyMemoryTranslator) failed: {e}")

    # Tier 3: LibreTranslator
    try:
        translated = LibreTranslator(source=src, target=tgt).translate(text)
        if translated and translated.strip() != text.strip():
            return translated
    except Exception as e:
        print(f"[translator] Tier 3 (LibreTranslator) failed: {e}")

    # Final Graceful Fallback: Return original text unaltered
    print(f"[translator] ⚠️ All translators failed for {src}->{tgt}. Returning source text.")
    return text


def translate(text: str, target_lang: str, source_lang: str = "auto") -> str:
    """
    Public translation interface.
    Translates text to target_lang with LRU caching and multi-tier redundancy.
    """
    if not text or not text.strip():
        return text

    target = (target_lang or "en").lower()
    if target not in SUPPORTED_LANGUAGES:
        return text

    return _translate_cached(text.strip(), (source_lang or "auto").lower(), target)


def get_cache_stats():
    """Returns cache performance metrics (hits, misses, current size)."""
    return _translate_cached.cache_info()


def clear_translation_cache():
    """Flushes the in-memory translation cache."""
    _translate_cached.cache_clear()
