# backend/src/chat/react_agent.py
"""
Medical ReAct (Reasoning + Acting) and Chain-of-Thought (CoT) Engine.
Implements multi-step clinical reasoning:
Thought -> Action -> Observation -> Final Clinical Synthesis.
Supports streaming thought steps to the UI alongside real-time token streaming.
"""

import json
import os
import requests
from typing import Dict, Generator, List, Optional
from .agent_tools import (
    tool_search_clinical_knowledge,
    tool_check_emergency_triage,
    tool_get_health_bulletins,
)
from ..common.prompts import SYSTEM_PROMPT, MEDICAL_DISCLAIMER

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")


class MedicalReActAgent:
    """Autonomous medical agent executing Chain-of-Thought reasoning with specialized tools."""

    def __init__(self, model_name: str = OLLAMA_MODEL):
        self.model_name = model_name

    def run_agentic_cycle(self, query: str, lang: str = "en") -> Generator[Dict, None, None]:
        """
        Executes a 3-step clinical ReAct cycle:
        1. Thought & Triage (Emergency Evaluation)
        2. Action & Observation (Semantic ChromaDB Retrieval)
        3. Final Synthesis (Chain-of-Thought Clinical Guidance)
        """
        thought_steps = []

        # ==============================================================
        # STEP 1: Chain-of-Thought & Emergency Triage Evaluation
        # ==============================================================
        step1_thought = f"Analyzing patient presentation: '{query[:60]}...'. Evaluating for acute emergency red flags."
        thought_steps.append({"step": 1, "type": "thought", "text": step1_thought})
        yield {"react_step": {"type": "thought", "step": 1, "text": step1_thought}}

        triage_result = tool_check_emergency_triage(query)
        if "CRITICAL EMERGENCY DETECTED" in triage_result:
            emergency_alert = "CRITICAL EMERGENCY DETECTED: Immediately contact emergency services (112 / 911 / 108)."
            thought_steps.append({"step": 1, "type": "action", "text": "Triggered immediate emergency triage interception."})
            yield {"emergency_triage": emergency_alert}
            yield {
                "token": (
                    f"**[CRITICAL MEDICAL EMERGENCY DETECTED]**\n\n"
                    f"{triage_result}\n\n"
                    f"Please call 112 / 911 / 108 or proceed to the nearest emergency room immediately.\n\n"
                    f"{MEDICAL_DISCLAIMER}"
                ),
                "citations": [{
                    "book_title": "Emergency Medicine Protocol (AHA / BLS)",
                    "page": "Triage 1",
                    "excerpt": triage_result
                }],
                "react_history": thought_steps
            }
            return

        # ==============================================================
        # STEP 2: Clinical Tool Execution (ChromaDB Retrieval)
        # ==============================================================
        step2_action = f"Executing tool: search_clinical_knowledge('{query[:50]}')"
        thought_steps.append({"step": 2, "type": "action", "text": step2_action})
        yield {"react_step": {"type": "action", "step": 2, "text": step2_action}}

        obs_text, citations = tool_search_clinical_knowledge(query)
        obs_summary = f"Retrieved {len(citations)} verified excerpts from {', '.join(set(c['book_title'] for c in citations)) if citations else 'textbooks'}."
        thought_steps.append({"step": 2, "type": "observation", "text": obs_summary})
        yield {"react_step": {"type": "observation", "step": 2, "text": obs_summary}}

        # ==============================================================
        # STEP 3: Synthesis & Chain-of-Thought Response Generation
        # ==============================================================
        step3_thought = "Synthesizing evidence-based response using retrieved medical findings and clinical guidelines."
        thought_steps.append({"step": 3, "type": "thought", "text": step3_thought})
        yield {"react_step": {"type": "thought", "step": 3, "text": step3_thought}}

        # Construct Agentic Scratchpad Prompt
        react_prompt = (
            f"You are Medi-Assist AI, an expert clinical educational assistant.\n"
            f"Below is your internal reasoning process and verified textbook excerpts:\n\n"
            f"--- INTERNAL CHAIN-OF-THOUGHT SCRATCHPAD ---\n"
            f"Thought: Patient inquired about '{query}'. No acute life-threatening emergency was triggered.\n"
            f"Action: Searched 19,712 textbook vectors (ChromaDB).\n"
            f"Observation: Retrieved peer-reviewed excerpts.\n"
            f"Thought: Now formulate an educational, empathetic clinical response with clear sections.\n\n"
            f"--- VERIFIED CLINICAL TEXTBOOK CONTEXT ---\n{obs_text}\n\n"
            f"--- PATIENT QUERY ---\n{query}\n\n"
            f"Instructions:\n"
            f"1. Explain the condition or answer the inquiry clearly using bullet points and bold terms.\n"
            f"2. Structure with sections: Overview, Symptoms / Key Findings, Management / Precautions, and References.\n"
            f"3. Maintain medical accuracy based strictly on the excerpts."
        )

        # Stream via local Ollama (or offline fallback)
        try:
            url = f"{OLLAMA_HOST}/api/generate"
            payload = {
                "model": self.model_name,
                "prompt": react_prompt,
                "system": SYSTEM_PROMPT,
                "stream": True,
                "options": {"temperature": 0.2},
            }
            res = requests.post(url, json=payload, stream=True, timeout=(3.0, 90.0))
            if res.status_code == 200:
                first_chunk = True
                for line in res.iter_lines():
                    if line:
                        data = json.loads(line)
                        tok = data.get("response", "")
                        if first_chunk:
                            yield {"token": tok, "citations": citations, "react_history": thought_steps}
                            first_chunk = False
                        else:
                            yield {"token": tok}
                        if data.get("done", False):
                            break
                return
        except Exception as e:
            print(f"[react] Local model streaming error ({e}). Using offline formatted synthesis...")

        # Offline Fallback with ReAct metadata
        yield {
            "token": f"### [Clinical Guidance - Offline Synthesis]\n\n{obs_text}\n",
            "citations": citations,
            "react_history": thought_steps
        }


react_agent = MedicalReActAgent()
