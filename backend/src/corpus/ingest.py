# backend/src/corpus/ingest.py
"""
Master Corpus Ingestion & Update Pipeline.
Orchestrates:
1. Scanning data/ for clinical PDFs.
2. Checking SHA-256 hashes against data/doc_registry.json.
3. Clean extraction, sanitization, and sentence-level semantic chunking.
4. FastEmbed ONNX embedding and ChromaDB indexing.
5. Updating the document registry.
"""

import json
import os
import sys
import time
from typing import Dict, List
from tqdm import tqdm

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))

from backend.src.corpus.extractor import MedicalCorpusExtractor, get_file_sha256
from backend.src.common.vectorstore import LocalChromaStore

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data"))
REGISTRY_PATH = os.path.join(DATA_DIR, "doc_registry.json")


def load_doc_registry() -> Dict[str, dict]:
    """Loads document registry containing processed file hashes and chunk counts."""
    if os.path.exists(REGISTRY_PATH):
        try:
            with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_doc_registry(registry: Dict[str, dict]):
    """Persists document registry to disk."""
    os.makedirs(os.path.dirname(REGISTRY_PATH), exist_ok=True)
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=2)


def run_ingestion(force: bool = False, pdf_target: str = None):
    """
    Runs the complete corpus ingestion pipeline.
    If force=False, skips already-processed files whose hash has not changed.
    """
    print("\n" + "=" * 65)
    print("      MEDI-ASSIST AI v2.0: HIGH-PRECISION CORPUS INGESTION      ")
    print("=" * 65)

    if not os.path.exists(DATA_DIR):
        print(f"[Error] Data directory not found at {DATA_DIR}")
        return

    # Discover PDFs
    if pdf_target:
        candidate_files = [pdf_target] if os.path.exists(pdf_target) else []
    else:
        candidate_files = [
            os.path.join(DATA_DIR, f)
            for f in os.listdir(DATA_DIR)
            if f.lower().endswith(".pdf")
        ]

    if not candidate_files:
        print("[Notice] No PDF documents found in data/ folder.")
        return

    print(f"Found {len(candidate_files)} PDF document(s) in {DATA_DIR}:")
    for f in candidate_files:
        size_mb = os.path.getsize(f) / (1024 * 1024)
        print(f"  • {os.path.basename(f)} ({size_mb:.1f} MB)")

    registry = load_doc_registry()
    extractor = MedicalCorpusExtractor(chunk_size=1000, chunk_overlap=150)
    vector_store = LocalChromaStore()

    start_total_time = time.time()
    total_new_chunks = 0

    for pdf_path in candidate_files:
        filename = os.path.basename(pdf_path)
        current_hash = get_file_sha256(pdf_path)

        # Check if already up-to-date
        prev_entry = registry.get(filename)
        if not force and prev_entry and prev_entry.get("hash") == current_hash:
            print(f"\n[SKIP] '{filename}' is already indexed ({prev_entry.get('chunk_count', 0)} chunks). Unchanged.")
            continue

        print(f"\n[PROCESSING] Extracting & Normalizing: {filename}")
        doc_start = time.time()

        # Step 1: Extraction with progress tracking
        pbar = None

        def page_callback(current, total):
            nonlocal pbar
            if pbar is None:
                pbar = tqdm(total=total, desc=f"  Pages [{filename[:25]}...]", unit="page")
            pbar.update(1)

        documents = extractor.extract_document(pdf_path, progress_callback=page_callback)
        if pbar:
            pbar.close()

        extraction_time = time.time() - doc_start
        print(f"  -> Extracted {len(documents):,} clean chunks in {extraction_time:.1f}s")

        if not documents:
            print("  [Warning] No valid chunks generated for this file.")
            continue

        # Step 2: Embedding & Ingestion into ChromaDB
        print(f"  -> Generating FastEmbed ONNX vectors and upserting into ChromaDB...")
        embed_start = time.time()

        embed_pbar = tqdm(total=len(documents), desc=f"  Embeddings [{filename[:20]}...]", unit="chunk")

        def embed_callback(current, total):
            embed_pbar.n = current
            embed_pbar.refresh()

        vector_store.add_documents(documents, batch_size=150, progress_callback=embed_callback)
        embed_pbar.close()

        embed_time = time.time() - embed_start
        print(f"  -> Indexed {len(documents):,} chunks in {embed_time:.1f}s")

        # Step 3: Update Registry
        registry[filename] = {
            "hash": current_hash,
            "chunk_count": len(documents),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        save_doc_registry(registry)
        total_new_chunks += len(documents)

    total_time = time.time() - start_total_time
    total_vectors = vector_store.count()

    print("\n" + "=" * 65)
    print("                 INGESTION COMPLETE SUMMARY                     ")
    print("=" * 65)
    print(f"  • New Chunks Processed: {total_new_chunks:,}")
    print(f"  • Total Vectors in ChromaDB: {total_vectors:,}")
    print(f"  • Storage Location: {vector_store.persist_dir}")
    print(f"  • Total Time Elapsed: {total_time:.1f} seconds")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    force_run = "--force" in sys.argv
    run_ingestion(force=force_run)

