# ⌨️ Keystroke Latency Diagnostics

<div align="center">

**Microscopic analysis of your keyboard performance**

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql)](https://neon.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 🎯 What is This?

A **real-time typing diagnostics tool** that measures your mechanical keyboard performance at the **microsecond level**. Unlike traditional typing tests that only measure speed and accuracy, this captures the actual physics of how your fingers interact with your keyboard.

### The Data Points

- **Dwell Time** — How long (in milliseconds) each key switch is physically held down before the spring releases
- **Flight Time** — How many milliseconds it takes your finger to travel between keys (e.g., from Q to W)

### Why This Matters

- **Visualize bottlenecks** — Discover which fingers lag by 30ms+ and slow you down
- **A/B test switches** — Swap from Browns to Reds, retest, and see objective performance changes
- **Optimize your layout** — See if switching to Dvorak or Colemak actually helps *your* hands
- **Track improvements** — Historical data shows progress as muscle memory develops

---

## Features

- **High-precision timing** using `performance.now()` API
- **Live telemetry feed** showing real-time dwell/flight data
- **Interactive charts** visualizing average latency by key
- **Keyboard heatmap** (coming soon) — Green = fast, Red = slow
- **Cloud sync** to PostgreSQL database via FastAPI backend
- **Type-safe** end-to-end with TypeScript + Pydantic validation
- **Serverless deployment** on Vercel + Hugging Face + Neon

---

## 🖼️ Demo

Will add after full version is complete

```bash
# Quick preview
npm run dev  # Frontend on localhost:3000
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.2** (React 19, App Router)
- **TypeScript** for type safety
- **Tailwind CSS 4** for styling
- **Recharts** for data visualization
- **Custom React hooks** for telemetry capture

### Backend
- **FastAPI** for async API endpoints
- **Pydantic** for request/response validation
- **SQLAlchemy** as ORM
- **Uvicorn** ASGI server
- **python-dotenv** for environment management

### Database
- **PostgreSQL** (hosted on Neon.tech)
- **JSONB column** for efficient keystroke array storage
- **Automatic migrations** with SQLAlchemy

### Deployment
- **Frontend:** Vercel
- **Backend:** Hugging Face Spaces
- **Database:** Neon (serverless Postgres)

---

## 🚀 Setup

### Prerequisites

- Node.js 20.9+ (for Next.js 16)
- Python 3.10+ (for FastAPI)
- A Neon.tech account (free tier works)

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Qaaed/keystroke-diagnostics.git
cd keystroke-diagnostics
```

### 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://user:password@host/database
EOF

# Run the server
uvicorn main:app --reload --port 8000
```

The backend will be available at `http://localhost:8000`

### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

---

## 📁 Project Structure

```
keystroke-diagnostics/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── models.py            # SQLAlchemy database models
│   ├── schemas.py           # Pydantic validation schemas
│   ├── database.py          # Database connection & session
│   ├── requirements.txt     # Python dependencies
│   ├── Dockerfile           # For Hugging Face deployment
│   └── .env                 # Environment variables (gitignored)
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx         # Main typing test page
    │   │   ├── layout.tsx       # Root layout
    │   │   └── globals.css      # Global styles
    │   ├── components/
    │   │   └── LatencyChart.tsx # Recharts visualization
    │   └── hooks/
    │       └── useTelemetry.ts  # Keystroke capture hook
    ├── package.json
    ├── tsconfig.json
    └── .env.local           # Environment variables (gitignored)
```

---

## 🌐 Deployment

### Deploy Backend to Hugging Face

1. Create a new Space on [Hugging Face](https://huggingface.co/spaces)
2. Choose **Docker** as the SDK
3. Push your `backend/` folder:

```bash
cd backend
git init
git remote add hf https://huggingface.co/spaces/<your-username>/<space-name>
git add .
git commit -m "Deploy backend"
git push hf main
```

4. Set environment variable `DATABASE_URL` in Space settings

### Deploy Frontend to Vercel

```bash
cd frontend
vercel deploy --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` = Your Hugging Face Space URL

### Database Setup (Neon)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (starts with `postgresql://`)
4. Add to backend `.env` as `DATABASE_URL`

> **Note:** Replace `postgres://` with `postgresql://` in the connection string

---

## 📊 API Endpoints

### `POST /telemetry/`

Save a typing session.

**Request:**
```json
{
  "hardware_profile": "GMMK Modular 60%",
  "wpm": 85,
  "accuracy": 98.5,
  "keystroke_data": [
    { "key": "h", "dwell_time": 67.3, "flight_time": 102.1 },
    { "key": "e", "dwell_time": 71.2, "flight_time": 95.8 }
  ]
}
```

**Response:**
```json
{
  "id": 1,
  "hardware_profile": "GMMK Modular 60%",
  "wpm": 85.0,
  "accuracy": 98.5,
  "keystroke_data": [...],
  "created_at": "2026-04-22T14:30:00Z"
}
```

### `GET /telemetry/`

Retrieve all saved sessions.

---

## 🧪 How It Works

1. **Capture Phase**
   - `keydown` event → Start timer with `performance.now()`
   - `keyup` event → Calculate dwell time
   - Calculate flight time from previous key release

2. **Visualization Phase**
   - Real-time feed shows last 10 keystrokes
   - Chart aggregates average latency per key
   - WPM calculated from total time and character count

3. **Sync Phase**
   - JSON payload sent to FastAPI backend
   - Pydantic validates data structure
   - SQLAlchemy ORM saves to PostgreSQL
   - JSONB column efficiently stores keystroke arrays

---


---

