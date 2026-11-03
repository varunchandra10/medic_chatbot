# backend/src/corpus/extractor.py
"""
High-Precision Medical Document Extractor & Normalizer.

Performs:
1. Stream-based PDF extraction to minimize memory usage.
2. Medical text sanitization (ligatures, hyphenated line-breaks, spacing).
3. Header, footer, copyright, and index-page filtering.
4. Sentence-preserving semantic chunking.
5. Rich metadata tagging (source, page, book title, chunk ID).
"""

import hashlib
import os
import re
from typing import Dict, Generator, List, Optional
from pypdf import PdfReader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

BOOK_TITLE_MAP = {
    "CURRENT_Medical_Diagnosis_and_Treatment.pdf": "Current Medical Diagnosis and Treatment (CMDT)",
    "Manual_of_Medicine.pdf": "Harrison's Manual of Medicine",
    "Medical_book.pdf": "The Gale Encyclopedia of Medicine",
}

# Regex to detect line-split hyphenated words (e.g. hy-\npertension -> hypertension)
HYPHEN_BREAK_REGEX = re.compile(r"(\b[A-Za-z]+)-\s*\n\s*([A-Za-z]+\b)")

# Common PDF ligature replacements
LIGATURE_MAP = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "’": "'",
    "‘": "'",
    "“": '"',
    "”": '"',
    "–": "-",
    "—": "-",
    "\xa0": " ",
}

# Running header/footer noise patterns
HEADER_FOOTER_REGEX = re.compile(
    r"^(?:page\s+\d+|\d+\s+chapter|\d+\s*$|copyright\s+©.*|all\s+rights\s+reserved.*)",
    re.IGNORECASE | re.MULTILINE,
)


def get_file_sha256(filepath: str) -> str:
    """Computes SHA-256 hash of a file for change tracking."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def clean_medical_text(text: str) -> str:
    """
    Sanitizes raw extracted PDF text:
    - Normalizes ligatures and smart quotes.
    - Recombines hyphenated medical terms across line breaks.
    - Strips recurring header/footer noise.
    - Normalizes whitespace while preserving paragraph breaks.
    """
    if not text:
        return ""

    # 1. Ligatures and encoding normalization
    for bad, good in LIGATURE_MAP.items():
        text = text.replace(bad, good)

    # 2. Recombine hyphenated line breaks (e.g., car-\ndiac -> cardiac)
    text = HYPHEN_BREAK_REGEX.sub(r"\1\2", text)

    # 3. Strip running headers and footers
    text = HEADER_FOOTER_REGEX.sub("", text)

    # 4. Normalize erratic horizontal spaces
    text = re.sub(r"[ \t]+", " ", text)

    # 5. Normalize excessive newlines (keep paragraph structure)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def is_junk_or_index_page(text: str, page_num: int, total_pages: int) -> bool:
    """
    Determines if a page should be excluded (e.g. index pages, TOC, blank pages).
    """
    cleaned = text.strip()
    # Skip nearly empty pages
    if len(cleaned) < 120:
        return True

    # Detect back-of-the-book index pages (typically last 10% of pages with dense numbers)
    if page_num > int(total_pages * 0.88):
        # Index pages have patterns like: "Asthma, 234, 235, 238-240"
        number_matches = len(re.findall(r"\b\d{1,4}\b", cleaned))
        total_words = len(cleaned.split())
        if total_words > 0 and (number_matches / total_words) > 0.25:
            return True

    # Detect front-matter table of contents (dense dots or leader characters)
    if page_num < int(total_pages * 0.08):
        if len(re.findall(r"\.{4,}", cleaned)) > 5:
            return True

    return False


class MedicalCorpusExtractor:
    """
    High-precision PDF extractor designed for clinical textbooks.
    Extracts, cleans, chunks, and attaches verified metadata.
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 150,
        min_chunk_length: int = 100,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_length = min_chunk_length
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
        )

    def extract_document(
        self, pdf_path: str, progress_callback=None
    ) -> List[Document]:
        """
        Extracts, cleans, and chunks a single PDF document.
        Yields rich LangChain Document objects with complete metadata.
        """
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF not found at {pdf_path}")

        filename = os.path.basename(pdf_path)
        book_title = BOOK_TITLE_MAP.get(filename, filename.replace(".pdf", "").replace("_", " "))
        doc_hash = get_file_sha256(pdf_path)[:12]

        reader = PdfReader(pdf_path)
        total_pages = len(reader.pages)
        documents: List[Document] = []

        chunk_counter = 0

        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1

            if progress_callback:
                progress_callback(page_num, total_pages)

            try:
                raw_text = page.extract_text() or ""
            except Exception:
                continue

            # Check for junk / index / TOC pages
            if is_junk_or_index_page(raw_text, page_num, total_pages):
                continue

            cleaned_text = clean_medical_text(raw_text)
            if len(cleaned_text) < self.min_chunk_length:
                continue

            # Split into semantic chunks
            page_chunks = self.splitter.split_text(cleaned_text)

            for chunk_idx, chunk_text in enumerate(page_chunks):
                chunk_text = chunk_text.strip()
                if len(chunk_text) < self.min_chunk_length:
                    continue

                chunk_counter += 1
                chunk_id = f"{doc_hash}_{page_num}_{chunk_idx}"

                metadata = {
                    "source": filename,
                    "book_title": book_title,
                    "page": page_num,
                    "chunk_id": chunk_id,
                    "chunk_index": chunk_counter,
                    "char_count": len(chunk_text),
                }

                documents.append(Document(page_content=chunk_text, metadata=metadata))

        return documents

