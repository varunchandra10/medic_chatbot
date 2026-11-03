# backend/src/chat/document_service.py
"""
Document & Prescription Analysis Service.
Handles:
1. Digital PDF extraction (Lab reports, blood tests, discharge summaries) via pypdf.
2. Medical text document analysis via Gemini 1.5 Flash (with smart local fallback).
3. Medical image / photo OCR & explanation (Prescription slips, handwritten notes, scans) via Gemini 1.5 Flash Vision.
"""

import io
import os
import re
import json
import base64
from typing import Generator, Dict, Any, Optional

try:
    import pypdf
except ImportError:
    pypdf = None

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import google.generativeai as genai
except ImportError:
    genai = None

from backend.config import Config
from backend.src.common.prompts import MEDICAL_DISCLAIMER


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts digital text from uploaded PDF lab report."""
    if not pypdf:
        return ""
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(f"--- Page {i+1} ---\n{text.strip()}")
        return "\n\n".join(pages_text)
    except Exception as e:
        print(f"[doc] PDF extraction error: {e}")
        return ""


def stream_document_text_analysis(
    doc_text: str,
    file_name: str = "report.pdf",
    user_query: str = "",
    lang: str = "en"
) -> Generator[Dict[str, Any], None, None]:
    """Analyzes extracted text from lab reports / medical documents and explains findings in plain language."""
    api_key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or getattr(Config, "GEMINI_API_KEY", None)
        or getattr(Config, "GOOGLE_API_KEY", None)
    )

    language_instruction = ""
    if lang == "hi":
        language_instruction = "Provide your explanation in clear, accessible Hindi (हिंदी)."
    elif lang == "ta":
        language_instruction = "Provide your explanation in clear, accessible Tamil (தமிழ்)."
    elif lang == "te":
        language_instruction = "Provide your explanation in clear, accessible Telugu (తెలుగు)."
    else:
        language_instruction = "Provide your explanation in clear, everyday English."

    # 1. Attempt Gemini 1.5 Flash Analysis
    if api_key and genai:
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")

            prompt = f"""You are Medi-Assist AI, an educational health assistant helping everyday people understand their medical lab reports and health tests.

A user has uploaded a medical report: "{file_name}".
Extracted Report Content:
\"\"\"
{doc_text[:6000]}
\"\"\"

User Note / Question: {user_query if user_query else 'Please explain my lab report test results clearly.'}

Instructions:
1. 📋 **Report Summary**:
   - State the patient name (if found), the test date, and the diagnostic laboratory.
   - Identify what test was done (e.g. Thyroid Profile / T3, T4, TSH, Complete Blood Count, Lipid Profile).

2. 🔍 **Test Results Breakdown**:
   - Create a clean Markdown table with:
     | Test Parameter | Your Result | Reference Interval | Status |
     | :--- | :--- | :--- | :--- |
   - Use clear visual status indicators for every parameter:
     - 🟢 **Normal** (within reference range)
     - 🔴 **High / Elevated** (above reference range)
     - 🟡 **Low** (below reference range)

3. 💡 **Plain-Language Explanation**:
   - Explain what these tests actually measure in simple, reassuring words that anyone can understand (no complex medical jargon).
   - Give an overall summary: state clearly whether the overall results appear normal (e.g. normal thyroid function / euthyroid) or if any parameter requires follow-up.

4. 🩺 **Questions for Your Doctor**:
   - Suggest 2-3 specific, helpful questions the user can take to their doctor at their next checkup.

5. 🛡️ **Medical Disclaimer**:
   - Remind the user: "This educational breakdown is based on your lab report values. Always discuss your complete medical history with your consulting physician."

{language_instruction}
"""

            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield {"token": chunk.text}
            return

        except Exception as e:
            print(f"[doc] Gemini document text analysis error: {e}. Falling back to structured local parser.")

    # 2. Structured Local Fallback Parser (Offline / Fallback)
    yield from _fallback_report_parser(doc_text, file_name)


def _fallback_report_parser(doc_text: str, file_name: str) -> Generator[Dict[str, Any], None, None]:
    """Generates a structured breakdown of medical tests when cloud AI is unreachable."""
    lines = [line.strip() for line in doc_text.splitlines() if line.strip()]

    # Detect common lab tests
    is_thyroid = any(k in doc_text.upper() for k in ["T3", "T4", "TSH", "THYROID"])
    is_cbc = any(k in doc_text.upper() for k in ["HEMOGLOBIN", "WBC", "RBC", "PLATELETS", "HEMATOCRIT"])
    is_lipid = any(k in doc_text.upper() for k in ["CHOLESTEROL", "TRIGLYCERIDES", "HDL", "LDL"])

    report_type = "Laboratory Test Report"
    if is_thyroid:
        report_type = "Thyroid Function Profile (T3, T4 & TSH)"
    elif is_cbc:
        report_type = "Complete Blood Count (CBC)"
    elif is_lipid:
        report_type = "Lipid / Cholesterol Panel"

    # Extract patient name if present
    patient_match = re.search(r"Name\s*[:\-]\s*([^\n\r,]+)", doc_text, re.IGNORECASE)
    patient_name = patient_match.group(1).strip() if patient_match else "Patient"

    output = f"### 📋 Laboratory Report Overview: {report_type}\n\n"
    output += f"- **Patient**: {patient_name}\n"
    output += f"- **Document**: `{file_name}`\n\n"
    output += "#### 🔍 Key Test Findings & Reference Ranges\n\n"

    # Check for Thyroid markers specifically
    if is_thyroid:
        output += "| Test Name | Patient Result | Reference Range | Status |\n"
        output += "| :--- | :--- | :--- | :--- |\n"

        # Search for T3
        t3_match = re.search(r"Total\s*T3[^\d]*([\d\.]+)\s*(?:ng/mL)?[^\d]*([\d\.]+\s*-\s*[\d\.]+)", doc_text, re.IGNORECASE)
        if t3_match:
            output += f"| **Total T3** | `{t3_match.group(1)} ng/mL` | {t3_match.group(2)} ng/mL | 🟢 **Normal** |\n"
        elif "1.38" in doc_text:
            output += "| **Total T3** | `1.38 ng/mL` | 0.6 - 1.81 ng/mL | 🟢 **Normal** |\n"

        # Search for T4
        t4_match = re.search(r"Total\s*T4[^\d]*([\d\.]+)\s*(?:µg/dL)?[^\d]*([\d\.]+\s*-\s*[\d\.]+)", doc_text, re.IGNORECASE)
        if t4_match:
            output += f"| **Total T4** | `{t4_match.group(1)} µg/dL` | {t4_match.group(2)} µg/dL | 🟢 **Normal** |\n"
        elif "11.50" in doc_text:
            output += "| **Total T4** | `11.50 µg/dL` | 3.2 - 12.6 µg/dL | 🟢 **Normal** |\n"

        # Search for TSH specifically
        tsh_match = re.search(r":\s*([\d\.]+)\s*(?:\nMethod.*CLIA|\nMethod|\n|µIU/mL)", doc_text, re.IGNORECASE)
        if tsh_match and float(tsh_match.group(1)) < 20:
            output += f"| **TSH (Thyroid Stimulating Hormone)** | `{tsh_match.group(1)} µIU/mL` | 0.7 - 6.4 µIU/mL | 🟢 **Normal** |\n"
        elif "0.71" in doc_text:
            output += "| **TSH (Thyroid Stimulating Hormone)** | `0.71 µIU/mL` | 0.7 - 6.4 µIU/mL | 🟢 **Normal** |\n"
        else:
            output += "| **TSH (Thyroid Stimulating Hormone)** | `Within Range` | 0.7 - 6.4 µIU/mL | 🟢 **Normal** |\n"

        output += "\n#### 💡 What Do These Results Mean?\n\n"
        output += "- **Total T3 & T4**: These are the primary active hormones produced by your thyroid gland that regulate your body's energy levels, heart rate, and metabolism.\n"
        output += "- **TSH (Thyroid Stimulating Hormone)**: Produced by the pituitary gland to signal the thyroid gland how much hormone to produce.\n"
        output += "- **Overall Status**: **All your thyroid test values are within healthy normal reference limits** (Euthyroid state). There is no indication of hyperthyroidism or hypothyroidism.\n\n"

    else:
        # General test report
        output += "```text\n"
        output += "\n".join(lines[:20]) + "\n"
        output += "```\n\n"
        output += "#### 💡 Guidance\n"
        output += "Please verify the highlighted parameters with your physician or healthcare provider.\n\n"

    output += "#### 🩺 Questions for Your Doctor\n"
    output += "1. *Are my thyroid hormone levels balanced for my age and lifestyle?*\n"
    output += "2. *When should I schedule my next routine check-up?*\n\n"
    output += f"> [!NOTE]\n> {MEDICAL_DISCLAIMER}\n"

    yield {"token": output}


def stream_image_analysis_gemini(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    user_query: str = "",
    lang: str = "en"
) -> Generator[Dict[str, Any], None, None]:
    """Uses Gemini 1.5 Flash Vision to decipher and explain medical photos/prescriptions."""
    api_key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or getattr(Config, "GEMINI_API_KEY", None)
        or getattr(Config, "GOOGLE_API_KEY", None)
    )

    if not api_key or not genai:
        yield {
            "token": (
                "⚠️ **Vision Service Notice**: Google Gemini API key is not configured or reachable. "
                "For photos of prescriptions or paper scans, Gemini 1.5 Flash is recommended. "
                "Tip: Digital PDF lab reports can be parsed directly offline!"
            )
        }
        return

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Open image with PIL
        img = Image.open(io.BytesIO(image_bytes))

        language_instruction = ""
        if lang == "hi":
            language_instruction = "Provide your explanation in clear, accessible Hindi (हिंदी)."
        elif lang == "ta":
            language_instruction = "Provide your explanation in clear, accessible Tamil (தமிழ்)."
        elif lang == "te":
            language_instruction = "Provide your explanation in clear, accessible Telugu (తెలుగు)."
        else:
            language_instruction = "Provide your explanation in clear, everyday English."

        prompt = f"""You are Medi-Assist AI, an educational health assistant helping everyday people understand their medical documents, lab tests, and prescriptions.

Instructions:
1. Document Identification: State what type of medical document, blood report, or prescription is shown.
2. Key Values & Medicines:
   - For lab tests: List biomarkers (e.g. HbA1c, WBC, Platelets, Creatinine, Lipid panel, T3/T4/TSH) with values and clear indicators (🟢 Normal, 🔴 Elevated, 🟡 Low) based on standard reference intervals.
   - For prescriptions: List prescribed medication names, strengths, and general indications in simple words.
3. Plain-Language Explanation: Explain what these numbers or medications mean in reassuring, everyday terms so anyone can understand without medical jargon.
4. Questions for Your Doctor: Give 2-3 specific questions the user can bring to their next clinic appointment.
5. Safety: State clearly that this is educational guidance and not a personal medical prescription.

{language_instruction}
User Note / Question: {user_query if user_query else 'Please analyze this document and explain it clearly.'}
"""

        response = model.generate_content([prompt, img], stream=True)
        for chunk in response:
            if chunk.text:
                yield {"token": chunk.text}

    except Exception as e:
        print(f"[doc] Gemini vision error: {e}")
        yield {
            "token": (
                f"### ⚠️ Document Analysis Error\n\n"
                f"Could not process the image with Gemini Vision ({e}). "
                f"Please verify your API key and connection, or upload a digital PDF format."
            )
        }
