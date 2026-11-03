# backend/src/translator.py - Backwards compatibility wrapper
from backend.src.common.translator import (
    translate,
    SUPPORTED_LANGUAGES,
    get_cache_stats,
    clear_translation_cache,
)

SUPPORTED_LANGS = SUPPORTED_LANGUAGES


def translate_text(text: str, src_lang: str, tgt_lang: str) -> str:
    return translate(text, target_lang=tgt_lang, source_lang=src_lang)
