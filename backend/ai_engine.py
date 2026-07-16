"""Gemma AI engine for NyaySetu — handles all interactions with Google's Gemma model."""

import os
import json
import re
from typing import AsyncGenerator
from dotenv import load_dotenv

try:
    from google import genai
except Exception:  # pragma: no cover - fallback when SDK is unavailable
    genai = None
from prompts import (
    CHAT_SYSTEM, DOCUMENT_ANALYSIS_SYSTEM, DRAFT_SYSTEM,
    PATHWAY_SYSTEM, RIGHTS_SYSTEM, INTAKE_SYSTEM,
)

load_dotenv()

API_KEY = (os.getenv("GEMINI_API_KEY") or os.getenv("GEMMA_API_KEY") or "").strip()
client = genai.Client(api_key=API_KEY) if genai and API_KEY else None
MODEL = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")

LANGUAGE_NAMES = {
    "en": "English", "hi": "Hindi", "bn": "Bengali", "ta": "Tamil",
    "te": "Telugu", "mr": "Marathi", "gu": "Gujarati", "kn": "Kannada",
    "ml": "Malayalam", "pa": "Punjabi", "es": "Spanish", "fr": "French",
}


def _lang_instruction(lang: str) -> str:
    """Generate a language instruction string."""
    name = LANGUAGE_NAMES.get(lang, "English")
    if lang == "en":
        return ""
    return f"\n\nIMPORTANT: Respond entirely in {name} ({lang}). The user prefers {name}."


def _is_ai_available() -> bool:
    return client is not None


def _chunk_text(text: str, chunk_size: int = 260) -> AsyncGenerator[str, None]:
    async def generator():
        for index in range(0, len(text), chunk_size):
            yield text[index:index + chunk_size]
    return generator()


def _keyword_match(text: str, patterns: list[str]) -> bool:
    lower = text.lower()
    return any(pattern in lower for pattern in patterns)


def _fallback_chat_text(message: str, language: str) -> str:
    if _keyword_match(message, ["evict", "eviction", "landlord", "rent", "deposit"]):
        return (
            "Here is a practical tenant-focused starting point:\n\n"
            "1. Save every message, rent receipt, and notice.\n"
            "2. Ask for the demand in writing and keep the reply.\n"
            "3. Check your rent agreement for notice period and deposit rules.\n"
            "4. If there is an illegal eviction threat, contact the local police and a lawyer quickly.\n\n"
            "⚖️ Remember: I'm an AI assistant, not a lawyer. For serious legal matters, please consult a qualified advocate."
        )
    if _keyword_match(message, ["salary", "wage", "employer", "harassment", "fired", "termination"]):
        return (
            "Here is a sensible workplace action plan:\n\n"
            "1. Preserve emails, attendance records, salary slips, and appointment letter.\n"
            "2. Send a short written reminder asking for dues or a reason for termination.\n"
            "3. If the issue is harassment or unpaid wages, escalate to the labor office or legal counsel.\n"
            "4. Do not sign any resignation or settlement paper until you understand the terms.\n\n"
            "⚖️ Remember: I'm an AI assistant, not a lawyer. For serious legal matters, please consult a qualified advocate."
        )
    if _keyword_match(message, ["refund", "defective", "consumer", "online", "product"]):
        return (
            "For a consumer issue, start here:\n\n"
            "1. Keep invoice, screenshots, delivery proof, and complaint emails.\n"
            "2. Ask the seller for replacement, repair, or refund in writing.\n"
            "3. If they ignore you, file a consumer complaint with the evidence.\n"
            "4. Add a deadline in your reminder so the issue does not drag on.\n\n"
            "⚖️ Remember: I'm an AI assistant, not a lawyer. For serious legal matters, please consult a qualified advocate."
        )
    return (
        f"I understand your concern. Based on what you shared, here is a simple next-step plan:\n\n"
        "1. Write down the facts in date order.\n"
        "2. Gather documents, screenshots, receipts, and messages.\n"
        "3. Send a written complaint or notice before escalating.\n"
        "4. If the matter is urgent or involves money, property, or safety, talk to a qualified lawyer quickly.\n\n"
        "⚖️ Remember: I'm an AI assistant, not a lawyer. For serious legal matters, please consult a qualified advocate."
    )


def _fallback_document_analysis(text: str, language: str) -> dict:
    lower = text.lower()
    clauses = [
        {
            "title": "Key obligation",
            "original_text": "Relevant obligation and deadlines are reviewed from the uploaded text.",
            "explanation": "Look carefully for duties, payment terms, or response deadlines that affect you.",
            "risk_level": "medium",
            "action_needed": "Check every obligation against your records before replying or signing.",
        }
    ]
    deadlines = []
    if re.search(r"\b\d{1,2}\s*(days?|weeks?|months?)\b", lower):
        deadlines.append({
            "date": "Mentioned in the document",
            "action": "Track every stated deadline and respond before it expires",
            "consequence": "Missing it may weaken your position",
        })
    if any(word in lower for word in ["terminate", "evict", "penalty", "fine", "interest"]):
        clauses.append({
            "title": "Risk / penalty clause",
            "original_text": "The document includes a clause that may create financial or legal risk.",
            "explanation": "This section could let the other side penalize you, end the agreement, or demand money.",
            "risk_level": "high",
            "action_needed": "Get clarification in writing before accepting or signing.",
        })
    if any(word in lower for word in ["refund", "return", "cancellation", "consumer"]):
        clauses.append({
            "title": "Consumer protection clause",
            "original_text": "The document seems to mention refund, cancellation, or return rights.",
            "explanation": "This may help you if the goods or service are defective or not delivered as promised.",
            "risk_level": "favorable",
            "action_needed": "Keep proof so you can rely on this clause later.",
        })
    return {
        "summary": "This is a quick AI-assisted review of the uploaded document. It highlights likely risk areas, but a lawyer should review it before you act.",
        "document_type": "notice" if any(word in lower for word in ["notice", "demand"]) else "contract",
        "key_parties": ["You", "Other Party"],
        "clauses": clauses,
        "deadlines": deadlines,
        "overall_risk": "high" if any(clause["risk_level"] == "high" for clause in clauses) else "medium",
        "recommended_actions": [
            "Save a copy of the original document",
            "Mark every deadline on a calendar",
            "Do not sign anything until the unclear parts are explained",
        ],
        "disclaimer": "This is an AI analysis. Please consult a qualified lawyer for legal advice.",
    }


def _fallback_draft(draft_type: str, details: str, language: str) -> str:
    title_map = {
        "consumer_complaint": "Consumer Complaint",
        "rti_application": "RTI Application",
        "legal_notice": "Legal Notice",
        "police_complaint": "Police Complaint",
        "workplace_complaint": "Workplace Complaint",
        "tenant_notice": "Tenant Notice",
    }
    title = title_map.get(draft_type, "Legal Draft")
    return f"""DRAFT: {title}

[YOUR NAME]
[YOUR ADDRESS]
[DATE]

Subject: {title}

Respected Sir/Madam,

I am writing regarding the following issue:

{details}

Please treat this as a formal request/complaint and take appropriate action at the earliest.

Prayer:
I request you to resolve the matter promptly and provide written confirmation.

Thank you.

Sincerely,
[YOUR NAME]

⚠️ This is an AI-generated draft. Please have it reviewed by a qualified lawyer before submission."""


def _fallback_pathway(situation: str, language: str) -> dict:
    steps = [
        {
            "step_number": 1,
            "title": "Collect evidence",
            "description": "Save messages, emails, receipts, notices, and any other proof that shows what happened.",
            "timeline": "Today",
            "authority": "Your own records first",
            "documents_needed": ["Screenshots", "Receipts", "Identity proof"],
            "estimated_cost": "Free",
            "tips": "Keep the originals and create one folder for everything.",
        },
        {
            "step_number": 2,
            "title": "Send a written complaint",
            "description": "Write a short complaint or notice to the other side and ask for a clear response by a fixed date.",
            "timeline": "Day 1-3",
            "authority": "Opposite party / concerned office",
            "documents_needed": ["Complaint draft", "Supporting proof"],
            "estimated_cost": "Free",
            "tips": "Keep a copy and note the delivery date.",
        },
        {
            "step_number": 3,
            "title": "Escalate if ignored",
            "description": "If there is no proper response, move to the correct authority such as police, consumer forum, labor office, or court.",
            "timeline": "Day 7-30",
            "authority": "Appropriate government office",
            "documents_needed": ["Previous complaint", "Evidence file"],
            "estimated_cost": "Low to moderate",
            "tips": "Ask the office for filing requirements before visiting.",
        },
    ]
    return {
        "situation_summary": f"Quick plan based on your issue: {situation[:180]}",
        "applicable_laws": ["Relevant local law", "Procedure law"],
        "steps": steps,
        "total_timeline": "1-4 weeks",
        "total_cost_estimate": "Usually free to low cost for the first steps",
        "important_notes": ["Act quickly if there is a deadline.", "Keep everything in writing."],
        "when_to_get_lawyer": "Get a lawyer quickly if money, eviction, dismissal, threats, or court papers are involved.",
    }


def _fallback_rights(category: str, scenario: str, language: str) -> dict:
    category_name = category.replace("_", " ").title()
    return {
        "category": category_name,
        "scenario": scenario or "General rights overview",
        "your_rights": [
            {
                "right": "Right to clear information",
                "explanation": "You can ask for the terms, charges, deadlines, and consequences in plain language.",
                "legal_basis": "General consumer / civil protection principles",
                "how_to_exercise": "Ask for written terms and keep a copy.",
            },
            {
                "right": "Right to challenge unfair treatment",
                "explanation": "If someone treats you unfairly, you can complain and ask for a correction.",
                "legal_basis": "Relevant civil, labor, or consumer law",
                "how_to_exercise": "File a written complaint with proof.",
            },
        ],
        "common_violations": [
            "Pressure to sign without reading",
            "Refusal to give written proof or a receipt",
        ],
        "what_to_do_if_violated": [
            "Collect evidence immediately",
            "Send a written complaint",
            "Escalate to the correct authority if the issue is ignored",
        ],
        "helplines": [
            {
                "name": "Local legal aid / helpline",
                "number": "Check your district legal services authority",
                "purpose": "Free or low-cost legal guidance",
            }
        ],
        "disclaimer": "AI-generated information. Consult a lawyer for specific legal advice.",
    }


# ── Chat (streaming) ───────────────────────────────────────────────────────

async def stream_chat(
    message: str,
    history: list[dict],
    language: str = "en",
) -> AsyncGenerator[str, None]:
    """Stream a chat response from Gemma token by token."""

    # Build conversation contents for the API
    contents = []
    for msg in history:
        contents.append(
            genai.types.Content(
                role="user" if msg["role"] == "user" else "model",
                parts=[genai.types.Part(text=msg["content"])],
            )
        )
    contents.append(
        genai.types.Content(
            role="user",
            parts=[genai.types.Part(text=message)],
        )
    )

    system_instruction = CHAT_SYSTEM + _lang_instruction(language)

    if not _is_ai_available():
        async for chunk in _chunk_text(_fallback_chat_text(message, language)):
            yield chunk
        return

    try:
        response = await client.aio.models.generate_content_stream(
            model=MODEL,
            contents=contents,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7,
                top_p=0.9,
                max_output_tokens=2048,
            ),
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception:
        async for chunk in _chunk_text(_fallback_chat_text(message, language)):
            yield chunk


# ── Document Analysis ──────────────────────────────────────────────────────

async def analyze_document(text: str, language: str = "en") -> dict:
    """Analyze a legal document and return structured risk analysis."""

    prompt = f"""Analyze this legal document and respond in {LANGUAGE_NAMES.get(language, 'English')}.

DOCUMENT TEXT:
---
{text}
---

Provide your analysis as valid JSON following the schema in your instructions."""

    system_instruction = DOCUMENT_ANALYSIS_SYSTEM + _lang_instruction(language)

    if not _is_ai_available():
        return _fallback_document_analysis(text, language)

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )
    except Exception:
        return _fallback_document_analysis(text, language)

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response text
        text_response = response.text
        start = text_response.find("{")
        end = text_response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text_response[start:end])
        return {
            "summary": text_response,
            "document_type": "unknown",
            "clauses": [],
            "deadlines": [],
            "overall_risk": "medium",
            "recommended_actions": ["Please consult a lawyer for detailed analysis."],
            "disclaimer": "AI analysis — consult a qualified lawyer.",
        }


async def analyze_image(image_bytes: bytes, mime_type: str, language: str = "en") -> dict:
    """Analyze a legal document image/photo directly using Gemini multimodal capability."""
    if not _is_ai_available():
        return _fallback_document_analysis("[Scanned Image Contract]", language)
        
    image_part = genai.types.Part.from_bytes(
        data=image_bytes,
        mime_type=mime_type
    )
    
    prompt = f"Analyze this legal document image and respond in {LANGUAGE_NAMES.get(language, 'English')}. Provide your analysis as valid JSON following the schema in DOCUMENT_ANALYSIS_SYSTEM."
    system_instruction = DOCUMENT_ANALYSIS_SYSTEM + _lang_instruction(language)
    
    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[image_part, prompt],
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.3,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        return _fallback_document_analysis(f"[Multimodal analysis failed: {str(e)}]", language)



# ── Draft Generation (streaming) ──────────────────────────────────────────

async def stream_draft(
    draft_type: str,
    details: str,
    language: str = "en",
) -> AsyncGenerator[str, None]:
    """Generate a legal draft with streaming."""

    prompt = f"""Generate a {draft_type} based on this situation:

{details}

Language: {LANGUAGE_NAMES.get(language, 'English')}

Create a complete, properly formatted legal document ready to be customized and submitted."""

    system_instruction = DRAFT_SYSTEM + _lang_instruction(language)

    if not _is_ai_available():
        async for chunk in _chunk_text(_fallback_draft(draft_type, details, language)):
            yield chunk
        return

    try:
        response = await client.aio.models.generate_content_stream(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=3072,
            ),
        )

        async for chunk in response:
            if chunk.text:
                yield chunk.text
    except Exception:
        async for chunk in _chunk_text(_fallback_draft(draft_type, details, language)):
            yield chunk


# ── Legal Pathway ─────────────────────────────────────────────────────────

async def generate_pathway(situation: str, language: str = "en") -> dict:
    """Generate a step-by-step legal action plan."""

    prompt = f"""Create a detailed legal action plan for this situation:

{situation}

Language: {LANGUAGE_NAMES.get(language, 'English')}

Respond with a structured JSON action plan following your instructions."""

    system_instruction = PATHWAY_SYSTEM + _lang_instruction(language)

    if not _is_ai_available():
        return _fallback_pathway(situation, language)

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )
    except Exception:
        return _fallback_pathway(situation, language)

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        text_r = response.text
        start = text_r.find("{")
        end = text_r.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text_r[start:end])
        return {"situation_summary": text_r, "steps": [], "important_notes": []}


# ── Rights Explorer ────────────────────────────────────────────────────────

async def explore_rights(
    category: str,
    scenario: str = "",
    language: str = "en",
) -> dict:
    """Explore legal rights for a given category and scenario."""

    prompt = f"""Explain the legal rights for this category: {category}
{"Specific scenario: " + scenario if scenario else "Give a comprehensive overview."}

Language: {LANGUAGE_NAMES.get(language, 'English')}

Respond with structured JSON following your instructions."""

    system_instruction = RIGHTS_SYSTEM + _lang_instruction(language)

    if not _is_ai_available():
        return _fallback_rights(category, scenario, language)

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.4,
                max_output_tokens=4096,
                response_mime_type="application/json",
            ),
        )
    except Exception:
        return _fallback_rights(category, scenario, language)

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        text_r = response.text
        start = text_r.find("{")
        end = text_r.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text_r[start:end])
        return {"category": category, "your_rights": [], "disclaimer": "Consult a lawyer."}


def _fallback_intake(text: str, language: str) -> dict:
    lower = text.lower()
    category = "Other"
    subcategory = "General legal issue"
    urgency = "Medium"
    immediate_risks = ["Delay can weaken your position"]
    evidence = ["Screenshots", "Messages", "Receipts"]
    helpful_questions = ["What happened first?", "Do you have any written proof?"]
    next_steps = [
        "Write the facts in date order",
        "Collect proof in one folder",
        "Send a written complaint before escalating",
    ]
    likely_paths = [
        {
            "path": "Document and preserve evidence",
            "why": "Every legal matter becomes easier when the facts are organized.",
            "when": "Immediately",
        }
    ]

    if any(word in lower for word in ["evict", "landlord", "rent", "deposit", "tenant"]):
        category, subcategory, urgency = "Housing", "Tenant dispute / eviction", "High"
        immediate_risks = ["You may lose time if you ignore the notice", "Wrong response could weaken your case"]
        evidence = ["Rent agreement", "Payment receipts", "Notice or messages", "Photos or videos"]
        helpful_questions = ["Did you receive a written notice?", "Is there a rent agreement?", "How much deposit or rent is involved?"]
        next_steps = [
            "Do not ignore the notice",
            "Collect rent agreement and payment proof",
            "Send a written reply or ask for legal help quickly",
        ]
        likely_paths = [
            {"path": "Reply in writing", "why": "Creates a record that you responded on time.", "when": "Immediately"},
            {"path": "Legal pathway / landlord dispute escalation", "why": "Helps identify the proper authority and next step.", "when": "Within 24 hours"},
        ]
    elif any(word in lower for word in ["salary", "wage", "employer", "fired", "terminated", "harassment"]):
        category, subcategory, urgency = "Employment", "Salary / termination / workplace issue", "High"
        immediate_risks = ["Back pay or benefits may be delayed", "Evidence can disappear if you wait"]
        evidence = ["Appointment letter", "Salary slips", "Emails", "Attendance records"]
        helpful_questions = ["Were you fired or forced to resign?", "Do you have salary slips or emails?", "Is there harassment involved?"]
        next_steps = [
            "Save all job-related proof",
            "Write a formal request for dues or explanation",
            "Escalate to labor authority or lawyer if ignored",
        ]
        likely_paths = [
            {"path": "Formal demand letter", "why": "Forces a written record of the issue.", "when": "Immediately"},
            {"path": "Employment dispute escalation", "why": "Useful when wages, termination, or harassment is involved.", "when": "Within 1-3 days"},
        ]
    elif any(word in lower for word in ["refund", "defective", "consumer", "online", "product", "service"]):
        category, subcategory, urgency = "Consumer", "Defective product / refund / service issue", "Medium"
        immediate_risks = ["Refund windows can close", "Seller may claim you never complained"]
        evidence = ["Invoice", "Order screenshots", "Delivery proof", "Complaint emails"]
        helpful_questions = ["What product or service failed?", "Have you asked for replacement or refund in writing?"]
        next_steps = [
            "Preserve order proof and screenshots",
            "Ask the seller for resolution in writing",
            "Escalate to consumer complaint if ignored",
        ]
        likely_paths = [
            {"path": "Written consumer complaint", "why": "Creates the first formal record.", "when": "Immediately"},
            {"path": "Consumer forum escalation", "why": "Best if refund or replacement is refused.", "when": "Within a few days"},
        ]

    return {
        "case_summary": f"Quick AI triage based on your issue: {text[:180]}",
        "intent": {
            "category": category,
            "subcategory": subcategory,
            "urgency": urgency,
            "confidence": 0.68,
        },
        "facts": {
            "people_involved": ["User", "Opposite party"],
            "important_dates": ["Any notice date or deadline mentioned"],
            "money_involved": ["If money or compensation is involved, note the amount"],
            "documents_mentioned": evidence[:3],
        },
        "missing_information": helpful_questions,
        "risk_analysis": {
            "overall_risk": "high" if urgency in ("High", "Critical") else "medium",
            "why_it_matters": "You should act quickly and keep proof before sending any reply or complaint.",
            "immediate_risks": immediate_risks,
            "deadline_warning": "If a notice or deadline exists, respond as soon as possible.",
        },
        "evidence_to_collect": evidence,
        "likely_paths": likely_paths,
        "helpful_questions": helpful_questions,
        "recommended_next_steps": next_steps,
        "disclaimer": "This is AI guidance, not legal advice.",
    }


async def intake_case(text: str, language: str = "en") -> dict:
    """Convert a raw legal problem into a structured triage map."""

    prompt = f"""Analyze this legal problem and create a structured intake summary.

User Problem:
{text}

Language: {LANGUAGE_NAMES.get(language, 'English')}

Return a JSON object matching the required schema."""

    if not _is_ai_available():
        return _fallback_intake(text, language)

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=INTAKE_SYSTEM + _lang_instruction(language),
                temperature=0.3,
                max_output_tokens=3072,
                response_mime_type="application/json",
            ),
        )
    except Exception:
        return _fallback_intake(text, language)

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        text_r = response.text
        start = text_r.find("{")
        end = text_r.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text_r[start:end])
        return _fallback_intake(text, language)
