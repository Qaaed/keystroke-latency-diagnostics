# Keynostics

Keynostics is a web application for measuring typing performance and keyboard latency. It combines a browser-based typing test with per-key telemetry so users can review speed, accuracy, key dwell time, key-to-key flight time, and leaderboard performance.

The project is designed for physical keyboard testing. Mobile and software keyboards can distort latency measurements because browser key events and input timing do not behave the same way as hardware keyboard events.

## Features

- Typing tests in words mode and code mode
- Configurable test durations
- Real-time WPM and accuracy tracking
- Per-key dwell time measurement
- Key-to-key flight time measurement
- Live keystroke feed after each session
- Keyboard heatmap and latency visualization
- Saved telemetry sessions by authenticated user
- User profile with historical session summaries
- Leaderboard for comparing saved typing results
- Keyboard hardware selection with custom keyboard support

## How It Works

Keynostics captures browser keyboard events during a typing test.

1. When a key is pressed, the frontend records a `keydown` timestamp with `performance.now()`.
2. When the key is released, the frontend records a `keyup` timestamp.
3. Dwell time is calculated as the time between `keydown` and `keyup` for the same key.
4. Flight time is calculated as the gap between releasing one key and pressing the next key.
5. The typing engine compares user input against the target text to calculate accuracy.
6. At the end of the test, the session is saved through the FastAPI backend.
7. The backend validates the payload, associates it with the Firebase-authenticated user, and stores it in the database.
8. Profile and leaderboard pages aggregate saved sessions to show long-term performance.

## Tech Stack

### Frontend

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Firebase Authentication
- Recharts for latency visualization

### Backend

- FastAPI
- SQLAlchemy
- Pydantic
- Firebase Admin SDK
- Uvicorn

### Database

- PostgreSQL in production
- SQLite-compatible model support for local development
- JSON/JSONB storage for per-session keystroke telemetry

## Project Structure

```text
keystroke-latency-diagnostics/
  backend/
    main.py                 FastAPI routes and Firebase auth checks
    database.py             SQLAlchemy engine and session setup
    models.py               Database models
    schemas.py              Pydantic request and response schemas
    requirements.txt        Backend Python dependencies
    Dockerfile              Backend deployment image
    sql/                    Database migration helpers

  frontend/
    src/
      app/                  Next.js app routes and layout
      components/           Shared UI and typing components
      hooks/                Telemetry capture hooks
      lib/                  API, Firebase, and metrics helpers
      types/                Shared TypeScript types
    package.json            Frontend scripts and dependencies
```

## Requirements

- Node.js compatible with Next.js 16
- npm
- Python 3.10 or newer
- PostgreSQL database connection string
- Firebase project for authentication
- Firebase service account credentials for the backend

## Environment Variables

### Frontend

Create `frontend/.env.local` for local development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

`NEXT_PUBLIC_API_URL` is optional in code because the frontend has a production fallback, but it should be set for local development.

### Backend

Create `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
```

For Firebase Admin credentials, use one of the following:

- Add a local `backend/firebase-credentials.json` file for development.
- Set `FIREBASE_JSON` to the full Firebase service account JSON string in production.

Do not commit real credentials or private keys.

## Local Development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The backend will run at:

```text
http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:

```text
http://localhost:3000
```

## Frontend Scripts

Run from the `frontend/` directory.

```bash
npm run dev      # Start the local development server
npm run build    # Build the production app
npm run start    # Start the production server after building
npm run lint     # Run ESLint
```

## API Overview

All telemetry endpoints require a Firebase bearer token.

### `POST /telemetry/`

Saves a completed typing session.

The payload includes:

- Hardware profile
- Test mode
- Duration
- WPM
- Accuracy
- Per-key telemetry data

### `GET /telemetry/`

Returns saved telemetry sessions for the authenticated user.

### `GET /users/me/profile`

Returns aggregate profile statistics for the authenticated user.

### `GET /leaderboard`

Returns ranked users based on saved session performance.

### `GET /leaderboard/{firebase_uid}`

Returns detailed leaderboard data, mode breakdowns, and recent sessions for a selected user.

## Data Model Summary

Each telemetry session stores:

- Firebase user id
- Hardware profile
- Typing mode
- Test duration
- WPM
- Accuracy
- Raw keystroke telemetry array
- Creation timestamp

Each keystroke entry can include:

- Key value
- Physical key code
- Sequence index
- Key down timestamp
- Key up timestamp
- Dwell time
- Flight time
- Expected key
- Correctness flag

## Deployment Notes

The project is structured for separate frontend and backend deployments.

Typical deployment targets:

- Frontend: Vercel or another Next.js hosting provider
- Backend: Docker-capable host such as Hugging Face Spaces, Render, Fly.io, or a VM
- Database: PostgreSQL provider such as Neon

Production configuration should include:

- `NEXT_PUBLIC_API_URL` pointing to the deployed backend
- Firebase web configuration on the frontend
- `DATABASE_URL` on the backend
- `FIREBASE_JSON` or an equivalent service account credential on the backend

## Notes on Measurement Accuracy

Keynostics uses browser keyboard event timing. This is useful for comparative diagnostics, but it is not a laboratory-grade hardware measurement system. Results can be affected by:

- Browser scheduling
- Operating system event handling
- Keyboard firmware and polling rate
- Bluetooth or wireless latency
- Display refresh and system load
- Mobile and software keyboards

For the most consistent results, test on a desktop or laptop with a physical keyboard and avoid switching browsers or devices between comparisons.
