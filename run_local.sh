#!/usr/bin/env bash
set -e

echo "============================================================"
echo "  SANKATSETU AI — TURNING HUMAN INTENT INTO VERIFIED ACTION  "
echo "  Operations Dashboard Startup Script                       "
echo "============================================================"

# Navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check Python environment
if [ ! -d "backend/venv" ]; then
    echo "[1/4] Setting up Python virtual environment..."
    python3 -m venv backend/venv
    ./backend/venv/bin/pip install --upgrade pip
    ./backend/venv/bin/pip install -r backend/requirements.txt
else
    echo "[1/4] Python virtual environment ready."
fi

# Check Node environment
if [ ! -d "frontend/node_modules" ]; then
    echo "[2/4] Installing frontend dependencies..."
    (cd frontend && npm install)
else
    echo "[2/4] Frontend dependencies ready."
fi

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "[*] Creating default .env from .env.example..."
    cp .env.example .env
    cp .env.example backend/.env
fi

echo "[3/4] Starting FastAPI backend on http://127.0.0.1:8000..."
PYTHONPATH=backend ./backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

echo "[4/4] Starting Vite React frontend on http://localhost:5173..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "Shutting down SankatSetu AI services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup INT TERM

echo ""
echo "============================================================"
echo "  SankatSetu AI is RUNNING LOCALLY!                        "
echo "  - Frontend:  http://localhost:5173                       "
echo "  - Backend:   http://127.0.0.1:8000                       "
echo "  - API Docs:  http://127.0.0.1:8000/docs                  "
echo "============================================================"
echo "Press Ctrl+C to stop all services."

wait
