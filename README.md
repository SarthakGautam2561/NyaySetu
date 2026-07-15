# ⚖️ NyaySetu (न्यायसेतु) — Bridge to Justice

**Multilingual AI Legal Assistant powered by Google Gemma 4**

NyaySetu helps ordinary citizens understand their legal rights, analyze documents, draft complaints, and navigate the legal system — all in simple language.

## Hackathon Story
NyaySetu is built for first-time legal system users in India: people facing eviction, unpaid salary, consumer fraud, or a notice they cannot understand. It turns legal confusion into a clear next step using Gemma 4 for multilingual reasoning, structured outputs, document understanding, and legal drafting.

For the full submission package, see [docs/HACKATHON_SUBMISSION.md](docs/HACKATHON_SUBMISSION.md).

## 🚀 Quick Start

1. **Get API Key** from [Google AI Studio](https://aistudio.google.com/)
2. Add key to `backend/.env` as `GEMINI_API_KEY` or `GEMMA_API_KEY`
3. Run `start.bat` or:
```bash
cd backend
py -3.13 -m pip install -r requirements.txt
py -3.13 main.py
```
4. Open http://localhost:8000

## ✨ Features

| Module | Description |
|--------|-------------|
| 💬 AI Legal Chat | Conversational legal guidance with streaming |
| 📄 Document X-Ray | Upload documents → clause-by-clause risk analysis |
| ✍️ Draft Generator | Auto-generate complaints, RTI, notices |
| 🗺️ Legal Pathway | Step-by-step action plans with timelines |
| 🎤 Voice Assistant | Speak your problem in any language |
| 📚 Rights Explorer | Know your rights by category |
| 🧭 Case Compass | Structured intake: category, urgency, missing info, evidence |

## 🌐 Supported Languages

English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Spanish, French

## ⚠️ Disclaimer

NyaySetu is an AI assistant, NOT a replacement for professional legal advice. Always consult a qualified lawyer for serious legal matters.

## 🛠 Tech Stack

- **AI**: Google Gemma 4 (26B) via Gemini API
- **Backend**: Python FastAPI + Uvicorn
- **Frontend**: Vanilla HTML/CSS/JS (SPA)
- **Database**: SQLite
- **Fallback mode**: Works without a Gemma key for local demo data

## Demo Flow
1. Open the landing page and choose a language.
2. Ask a legal question in chat.
3. Upload a notice or contract for clause-by-clause analysis.
4. Generate a draft from the same issue.
5. Show the legal pathway timeline.
6. Try the voice assistant.
7. End by showing rights exploration in another language.
8. Use Case Compass to turn the same problem into a structured legal triage map.
