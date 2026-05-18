# Keynostics

Keynostics is a web application for measuring typing performance and keyboard latency. It combines a browser-based typing test with per-key telemetry so users can review speed, accuracy, key dwell time, key-to-key flight time, and leaderboard performance.

The project is designed for physical keyboard testing. Mobile and software keyboards can distort latency measurements because browser key events and input timing do not behave the same way as hardware keyboard events.

## Why Keynostics Is Different

Keynostics goes beyond a standard typing speed test by pairing typing results with keyboard latency diagnostics. Instead of only reporting WPM and accuracy, it records per-key timing so users can see how their keyboard, browser, device, and typing rhythm affect each session.

- Combines typing performance with per-key latency measurement
- Tracks dwell time, flight time, correctness, and sequence data for each key event
- Supports hardware profile selection so results can be compared by keyboard setup
- Stores authenticated session history for long-term progress tracking
- Provides profile summaries and leaderboard views from saved telemetry
- Focuses on practical browser-based diagnostics without requiring special hardware

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
 
| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.4 | React framework with App Router |
| React | 19.2.4 | UI library |
| TypeScript | 5 | Type safety |
| Tailwind CSS | 4 | Utility-first styling |
| Firebase Web SDK | — | Authentication |
| Recharts | — | Charts and latency visualization |
| ESLint | — | Code linting with Next.js config |
 
### Backend
 
| Technology | Purpose |
|---|---|
| FastAPI | Web framework and routing |
| Uvicorn | ASGI server |
| SQLAlchemy | ORM and database abstraction |
| Pydantic | Request/response validation |
| Firebase Admin SDK | Server-side authentication verification |
| python-dotenv | Environment variable loading |
| psycopg2 | PostgreSQL driver |
 
### Database
 
| Technology | Use Case |
|---|---|
| PostgreSQL | Production database |
| SQLite | Local development alternative |
| JSON/JSONB | Per-session keystroke telemetry storage |
---


## Project Structure

```text
keystroke-latency-diagnostics/
  .github/
    workflows/
      ci.yml                Pull request and main branch checks
      docker-publish.yml    GHCR image publishing workflow

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
    Dockerfile              Frontend standalone Next.js image

  docker-compose.yml        Local full-stack Docker setup
```

## Requirements

- Node.js compatible with Next.js 16
- npm
- Python 3.10 or newer
- PostgreSQL database connection string
- Firebase project for authentication
- Firebase service account credentials for the backend
- Docker and Docker Compose, if running the containerized stack

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

For Docker Compose, expose the Firebase web values to Compose from your shell or a root `.env` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

The Compose file builds the frontend with `NEXT_PUBLIC_API_URL=http://localhost:7860` so the browser can call the containerized backend through the host-mapped backend port.

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

### Docker Compose

Use Docker Compose to run the full stack locally:

```bash
docker compose up --build
```

The services will be available at:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:7860
API docs: http://localhost:7860/docs
```

Compose reads backend secrets from `backend/.env`. Frontend Firebase public values must be available to Compose from the shell environment or a root `.env` file before the frontend image is built.

To rebuild after changing frontend environment values:

```bash
docker compose build --no-cache frontend
docker compose up
```

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

## Docker Images

### Backend Image

The backend Dockerfile builds a FastAPI/Uvicorn image from `python:3.10-slim` and exposes port `7860`.

```bash
cd backend
docker build -t keynostics-api .
docker run --env-file .env -p 7860:7860 keynostics-api
```

### Frontend Image

The frontend Dockerfile builds a standalone Next.js production image with Node 20 Alpine. Public Next.js environment variables are build arguments, so provide them when building the image.

```powershell
cd frontend
docker build -t keynostics-web ^
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:7860 ^
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-web-api-key ^
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com ^
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id .
docker run -p 3000:3000 keynostics-web
```

On macOS or Linux shells, replace the PowerShell line-continuation character `^` with `\`.

## Frontend Scripts

Run from the `frontend/` directory.

```bash
npm run dev      # Start the local development server
npm run build    # Build the production app
npm run start    # Start the production server after building
npm run lint     # Run ESLint
```

## CI/CD

GitHub Actions workflows live in `.github/workflows/`.

### CI

`ci.yml` runs on pull requests and pushes to `main`.

- Installs frontend dependencies with `npm ci`
- Runs `npm run lint`
- Builds the Next.js frontend with placeholder public Firebase values
- Installs backend Python dependencies
- Compiles backend Python files
- Builds the backend and frontend Docker images without pushing them

### Docker Publish

`docker-publish.yml` runs on pushes to `main`, version tags matching `v*.*.*`, and manual dispatches. It publishes two images to GitHub Container Registry:

- `ghcr.io/<owner>/<repo>-api`
- `ghcr.io/<owner>/<repo>-web`

The workflow uses `GITHUB_TOKEN` for GHCR publishing. Configure these GitHub Actions repository variables before publishing the frontend image:

```text
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
```

## Endpoints

The backend exposes a FastAPI JSON API. All application endpoints require a Firebase bearer token in the `Authorization` header:

```text
Authorization: Bearer <firebase-id-token>
```

Base URLs:

- Local backend: `http://localhost:8000`
- Production backend: configured in the frontend with `NEXT_PUBLIC_API_URL`

### `POST /telemetry/`

Saves a completed typing session.

The payload includes:

- Hardware profile
- Test mode
- Duration
- WPM
- Accuracy
- Per-key telemetry data

Response: the saved telemetry session.

### `GET /telemetry/`

Returns full saved telemetry sessions for the authenticated user, ordered from newest to oldest.

### `GET /telemetry/sessions`

Returns saved session summaries for the authenticated user, ordered from newest to oldest. This is useful for profile and history views that do not need the full raw telemetry payload.

### `GET /users/me/profile`

Returns aggregate profile statistics for the authenticated user.

### `GET /leaderboard`

Returns ranked users based on saved session performance.

### `GET /leaderboard/{firebase_uid}`

Returns detailed leaderboard data, mode breakdowns, and recent sessions for a selected user.

### Backend API Docs

FastAPI also provides generated documentation when the backend is running:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI schema: `http://localhost:8000/openapi.json`

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

## Deployments
 
### Frontend Deployment
 
| Aspect | Details |
|---|---|
| **Target Platforms** | Vercel, Next.js hosting providers, Docker-capable hosts |
| **Environment Variables** | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` |
| **Build Command** | `cd frontend && npm install && npm run build` |
| **Docker Build** | `cd frontend && docker build -t keynostics-web --build-arg NEXT_PUBLIC_API_URL=<backend-url> --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=<key> --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<domain> --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id> .` |
| **Container Port** | `3000` |
 
### Backend Deployment
 
| Aspect | Details |
|---|---|
| **Target Platforms** | Docker-capable hosts (Hugging Face Spaces, Render, Fly.io, Railway, VM) |
| **Environment Variables** | `DATABASE_URL` (PostgreSQL), `FIREBASE_JSON` (service account JSON string) |
| **Containerization** | Docker with Uvicorn on port 7860 |
| **Build Command** | `cd backend && docker build -t keynostics-api . && docker run -p 7860:7860 --env-file .env keynostics-api` |
 
### Database Deployment
 
| Aspect | Details |
|---|---|
| **Target Platforms** | Neon, Supabase, Render PostgreSQL, Railway PostgreSQL, managed PostgreSQL providers |
| **Setup** | Backend creates SQLAlchemy tables on startup |
| **Data Storage** | JSON/JSONB-compatible columns for per-session telemetry |
| **Migration** | Keep same connection string unless intentionally migrating data |
 

The backend creates SQLAlchemy tables on startup and stores per-session telemetry in JSON/JSONB-compatible columns. Existing deployments should keep the same database connection string unless migrating data intentionally.

## Notes on Measurement Accuracy

Keynostics uses browser keyboard event timing. This is useful for comparative diagnostics, but it is not a laboratory-grade hardware measurement system. Results can be affected by:

- Browser scheduling
- Operating system event handling
- Keyboard firmware and polling rate
- Bluetooth or wireless latency
- Display refresh and system load
- Mobile and software keyboards

For the most consistent results, test on a desktop or laptop with a physical keyboard and avoid switching browsers or devices between comparisons.
