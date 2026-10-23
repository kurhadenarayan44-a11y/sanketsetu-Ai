# SankatSetu AI (संकटसेतु)
### Turning Human Intent into Verified Action &middot; Gemini Societal-Benefit Operations Dashboard

[![Gemini](https://img.shields.io/badge/Gemini%20API-3.8%20Flash-indigo.svg)](https://ai.google.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB.svg)](https://react.dev/)
[![Tailwind](https://img.shields.io/badge/UI-Tailwind%20CSS-38B2AC.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20WAL-003B57.svg)](https://www.sqlite.org/)

---

## 1. Hackathon Problem Statement & Solution

During civic crises, accidents, or extreme weather events, citizens submit messy, panicked, multi-issue messages such as:
> *"Heavy rain has caused waterlogging near my college. There is a large pothole hidden under the water, traffic is stuck, and the nearby streetlight is not working."*

Standard chatbots lump all issues into a generic reply or hallucinate fake department phone numbers and ETA. 

**SankatSetu AI** acts as a **universal bridge** between human intent and complex public systems. Its innovation is:
$$\text{ONE MESSY INPUT} \longrightarrow \text{MULTIPLE IDENTIFIED HAZARDS} \longrightarrow \text{TASK PLAN} \longrightarrow \text{REAL TOOLS} \longrightarrow \text{VERIFICATION} \longrightarrow \text{HUMAN-APPROVED ACTION}$$

### Truth-Verification Principle (Zero Hallucination Policy)
- **User-Provided:** Direct citizen observation.
- **AI-Inferred:** Structured decomposition hypothesis from Gemini.
- **Tool-Verified:** Ground truth established via OpenStreetMap geocoding or live meteorological telemetry.
- **Missing Information:** Explicitly flagged (e.g. unverified street name) instead of inventing coordinates.
- **Consequential Action Gate:** No official dispatches or external work orders occur without human operator authorization.

---

## 2. Real Agent Architecture (10-Stage Pipeline)

1. **UNDERSTAND**: Multi-modal ingestion of natural language text, voice transcripts, and photo evidence.
2. **DECOMPOSE**: Gemini decomposes messy statements into atomic problem subtasks.
3. **PLAN**: Orchestrates multi-agency tool execution plans and dependency graphs.
4. **VALIDATE**: Checks required dispatch parameters (street, landmark, description).
5. **SELECT TOOLS**: Dynamically routes to location resolvers, computer vision, and weather APIs.
6. **EXECUTE**: Runs bounded tool calls with real-time latency and parameter tracking.
7. **VERIFY**: Audits tool outputs to differentiate verified facts from AI hypotheses.
8. **RECOVER IF NEEDED**: Detects tool errors (e.g. sensor outages), logging failures and engaging safety fallbacks.
9. **REQUEST APPROVAL**: Prepares submission previews requiring human operator sign-off.
10. **PRESENT RESULTS**: Generates persistent reports with authentic tracking IDs (`SST-2026-XXXX`).

---

## 3. Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet (OpenStreetMap)
- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, SQLite (WAL mode)
- **AI Intelligence**: Official Google Gen AI SDK (`google-genai`), Gemini 3.8 Flash
- **Dual Engine Operation**:
  - **REAL GEMINI MODE**: Activated when `GEMINI_API_KEY` is provided in `.env`.
  - **DETERMINISTIC DEMO MODE**: Zero-config mode for hackathon judges requiring no API key. Uses local Python heuristics and rule engines with identical schema contracts.

---

## 4. Evaluator Demonstration Scenarios (1-Click in Workspace)

Judges can test the 3 core scenarios directly from the top bar in the Agent Workspace:

### Scenario 1 — Incomplete Input (Missing Location Clarification Gate)
- **Input**: *"There is a deep road cave-in and broken water pipe causing major issues, but I'm rushing and didn't mention where."*
- **Agent Behavior**: Decomposes the cave-in hazard, verifies that location details are missing, **refuses to hallucinate coordinates**, and pauses in `AWAITING_CLARIFICATION`.
- **Action**: A modal prompts the user to provide the street/landmark. Once submitted, the agent resumes and finalizes the report.

### Scenario 2 — Multiple Problems (Compound Multimodal Decomposition)
- **Input**: *"Heavy rain has caused waterlogging near my college at MG Road Junction. There is a large pothole hidden under the water, traffic is stuck, and the nearby streetlight is not working."*
- **Agent Behavior**: Decomposes into **4 atomic subtasks** (Waterlogging, Road damage/pothole, Traffic obstruction, Streetlight failure), assesses explainable severity (e.g. High for submerged pothole), resolves coordinates on OpenStreetMap, and creates 4 tracked reports.

### Scenario 3 — Tool Failure & Transparent Recovery
- **Input**: *"High voltage power line sparking near municipal school at Shivaji Nagar."* (with Fault Injection enabled)
- **Agent Behavior**: Municipal sensor gateway times out (504). The agent detects the failure honestly, logs `FAILED` in the tool console, activates the **Emergency Safety Protocol**, issues life-safety guidance, and routes to emergency hotline SOPs.

---

## 5. Localhost Execution (macOS)

### Quick Start (Automated Script)
Run the bundled startup script from the project root:
```bash
./run_local.sh
```

### Manual Step-by-Step Start

#### 1. Backend Setup
```bash
# Navigate to workspace
cd /Users/hanmantkurhade/sanketsetu_AI

# Create virtual environment & install dependencies
python3 -m venv backend/venv
./backend/venv/bin/pip install -r backend/requirements.txt

# Start FastAPI backend
PYTHONPATH=backend ./backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend Setup (in a separate terminal)
```bash
cd /Users/hanmantkurhade/sanketsetu_AI/frontend
npm install
npm run dev
```
- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)

---

## 6. Running Automated Tests

Run the full automated test suite verifying input validation, multi-issue splitting, severity rules, tool failure recovery, and database persistence:
```bash
cd /Users/hanmantkurhade/sanketsetu_AI
PYTHONPATH=backend ./backend/venv/bin/pytest backend/tests/ -v
```

All 14 tests execute and pass in < 3 seconds.

---

## 7. Project Structure

```
sanketsetu_AI/
├── run_local.sh                 # 1-click startup script for macOS
├── .env.example                 # Environment template
├── backend/
│   ├── requirements.txt         # FastAPI, Google GenAI SDK, Pydantic, Pillow
│   ├── app/
│   │   ├── main.py              # FastAPI application & CORS
│   │   ├── config.py            # Settings & Gemini environment check
│   │   ├── database.py          # SQLite WAL schema & session management
│   │   ├── models/schemas.py    # Pydantic models & validation
│   │   ├── agent/
│   │   │   ├── orchestrator.py  # 10-stage bounded agent orchestrator
│   │   │   └── gemini_client.py # Dual-mode SDK bridge (Real Gemini vs Demo)
│   │   ├── tools/
│   │   │   ├── classifier.py    # classify_issue(), assess_severity()
│   │   │   ├── extractor.py     # split_into_subtasks(), extract_structured_details()
│   │   │   ├── validator.py     # validate_required_information(), verify_tool_result()
│   │   │   ├── geocoding.py     # resolve_location() via OpenStreetMap Nominatim
│   │   │   ├── image_analyzer.py# analyze_uploaded_image() multimodal CV
│   │   │   ├── public_data.py   # check_available_public_data() via Open-Meteo
│   │   │   ├── planner.py       # generate_action_plan() multi-agency routing
│   │   │   └── report_tools.py  # save_report(), retrieve_report(), tracking IDs
│   │   └── routers/             # API endpoints for agent, reports, integrations
│   └── tests/                   # Pytest automated test suites
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, VoiceInput, LocationPicker, Console, IssueCard
│   │   ├── pages/               # LandingPage, WorkspacePage, ResultsPage, HistoryPage, StatusPage
│   │   ├── services/api.ts      # Fetch API client
│   │   ├── types/index.ts       # TypeScript domain models
│   │   ├── App.tsx              # Main state & view routing
│   │   └── index.css            # Futuristic cyber aesthetics & styling
│   └── package.json             # Vite, React, Tailwind, Leaflet
└── README.md
```

---

## 8. Consequential Action & Safety Philosophy

SankatSetu AI enforces a strict boundary:
1. It assists human judgment with multi-hazard decomposition and factual verification.
2. It **never** triggers external notifications, dispatches, or state changes autonomously without explicit human sign-off via the Consequential Action Gate.
3. In life-threatening emergencies, immediate safety advisories are rendered immediately without waiting for optional AI inference.
