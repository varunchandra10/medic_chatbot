# backend/src/common/formatter.py
"""
Clinical Text Formatter & Normalizer.
Transforms raw extracted medical textbook chunks into beautifully structured,
clean markdown with bullet points, symptom lists, and section headers.
"""

import re


def format_clinical_text(text: str) -> str:
    """
    Cleans raw OCR / PDF medical text into structured markdown:
    - Strips running headers, chapter numbers, and publisher stamps.
    - Decodes spaced-out headings (e.g. E S S E N T I A L S  O F  D I A G N O S I S).
    - Converts bullet characters (», •) into clean markdown list items.
    - Recombines split words and fixes punctuation spacing.
    - Adds clear clinical headers (Symptoms, Complications, Treatment).
    """
    if not text:
        return ""

    # 1. Strip running header noise (e.g. OTOZOAL & HELMINTHIC INFECTIONS1521 CMDT 2022...)
    text = re.sub(r'^[A-Z\s&]+\d+\s+CMDT\s+\d{4}[A-Z\s]*', '', text)
    text = re.sub(r'^\d+\s+CHAPTER\s+\d+.*', '', text)
    text = re.sub(r'^CHAPTER\s+\d+.*', '', text)

    # 2. Fix spaced-out headings
    text = re.sub(
        r'E\s*S\s*S\s*E\s*N\s*T\s*I\s*A\s*L\s*S\s*O\s*F\s*D\s*I\s*A\s*G\s*N\s*O\s*S\s*I\s*S',
        '\n\n### 🩺 Essentials of Diagnosis\n',
        text,
        flags=re.IGNORECASE,
    )

    # 3. Known clinical section markers to upgrade to markdown headers
    section_patterns = [
        (r'General Considerations', '### 📋 General Considerations & Overview'),
        (r'Clinical Findings', '### 🩺 Clinical Findings & Presentation'),
        (r'Symptoms and Signs', '### 🩺 Symptoms & Signs'),
        (r'Physical Examination', '### 🔍 Physical Examination'),
        (r'Laboratory Findings', '### 🔬 Diagnostic & Laboratory Tests'),
        (r'Complications', '### ⚠️ Potential Complications'),
        (r'Treatment', '### 💊 Clinical Treatment & Management'),
        (r'Prevention', '### 🛡️ Prevention & Precautions'),
        (r'Prognosis', '### 📈 Prognosis & Outcome'),
        (r'When to Refer', '### 🚨 When to Refer to a Specialist'),
        (r'When to Admit', '### 🚨 When to Admit to Hospital'),
    ]

    for orig, header in section_patterns:
        text = re.sub(
            rf'(?:^|\s)({orig})(?::|\s|[A-Z])',
            f'\n\n{header}\n',
            text,
            flags=re.IGNORECASE,
        )

    # 4. Convert bullet characters (», •) into clean list items
    text = re.sub(r'\s*[»•]\s*', '\n- ', text)

    # 5. Fix punctuation and word-boundary concatenation
    text = re.sub(r'([;:,])([a-zA-Z])', r'\1 \2', text)
    text = re.sub(r'(\.)([A-Z])', r'\1 \2', text)
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)

    # 6. Common medical word mergers from PDF extractors
    common_merges = {
        'inmost': 'in most',
        'ofthousands': 'of thousands',
        'thinblood': 'thin blood',
        'CentralAmerica': 'Central America',
        'SoutheastAsia': 'Southeast Asia',
        'frommalaria': 'from malaria',
        'andmortality': 'and mortality',
        'hypotension,pulmonary': 'hypotension, pulmonary',
        'injury,hypoglycemia': 'injury, hypoglycemia',
        'acidosis,and': 'acidosis, and',
        'simplefebrile': 'simple febrile',
        'dis-ease': 'disease',
        'organdysfunction': 'organ dysfunction',
    }
    for bad, good in common_merges.items():
        text = text.replace(bad, good)

    # 7. Normalize multi-line spacing
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()

