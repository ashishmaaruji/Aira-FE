# Aira Control Tower

A Notion-like, minimal operator console to test, supervise, and train Aira — an FSM-driven AI voice agent.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   React Frontend                            │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Test Aira │Live      │Call      │Prompt    │Qual.     │  │
│  │          │Monitor   │Review    │Training  │Snapshot  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│               Spring Boot Backend                           │
│                (Single Source of Truth)                     │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │FSM       │Audio     │Prompts   │Calls     │Webcall   │  │
│  │Engine    │Service   │Service   │Service   │API       │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Important: No Separate Backend

This Control Tower is **frontend-only**. It integrates directly with the existing Spring Boot backend.

- ❌ NO FastAPI
- ❌ NO MongoDB 
- ✅ Spring Boot is the single source of truth

## Quick Start

### 1. Start Spring Boot Backend

```bash
cd /path/to/spring-boot-project
./mvnw spring-boot:run
# Or
java -jar target/aira-backend.jar
```

Spring Boot should be running on `http://localhost:8080`

### 2. Start React Frontend

```bash
cd /app/frontend

# Install dependencies (first time only)
yarn install

# Start development server
yarn start
```

Frontend runs on `http://localhost:3000`

### 3. Use Control Tower

Open `http://localhost:3000` in your browser.

## Modules

### 1. Test Aira (Dev/Test Mode)
- Start webcall sessions via text simulation
- Languages: **HINGLISH** and **ENGLISH** only
- Shows FSM state, silence count, objection count
- Real audio playback per Aira turn
- Uses: `POST /webcall/start`, `POST /webcall/input`, `POST /webcall/end`

### 2. Live Monitor (Read-only)
- Real-time view of active calls (auto-refresh 5s)
- Shows: Status, FSM state, Language, Turn count
- Uses: `GET /admin/calls/live`

### 3. Call Review (High Volume Ready)
- Paginated list with filters (Exit Reason, Demo Intent, Date)
- Click call → opens side drawer with full timeline
- Real audio replay per Aira utterance
- Uses: `GET /admin/calls`, `GET /admin/calls/{id}`

### 4. Prompt Training (Admin Only)
- Per FSM State + Language (HINGLISH/ENGLISH)
- Workflow: Create Draft → Edit → Publish
- Mark Active prompts as Weak (requires replacement)
- FSM logic is read-only
- Uses: `GET /admin/prompts`, `PUT /admin/prompts/draft`, `POST /admin/prompts/publish`

### 5. Qualification Snapshot (Read-only)
- CRM payload view
- Captured answers, Objections, Demo intent
- Uses: `GET /admin/calls/{id}/qualification`

## Spring Boot API Endpoints

### Available (Confirmed)
```
POST /webcall/start        - Start test call
POST /webcall/input        - Send user input
POST /webcall/end          - End call
GET  /audio/{file}.mp3     - Serve audio files
```

### Admin Endpoints (Expected)
```
GET  /admin/calls/live           - Live calls list
GET  /admin/calls                - Call history (paginated)
GET  /admin/calls/{id}           - Call detail with timeline
GET  /admin/calls/{id}/qualification - Qualification data
GET  /admin/prompts              - List prompts
PUT  /admin/prompts/draft        - Save draft
POST /admin/prompts/publish      - Publish prompt
GET  /admin/fsm/states           - FSM state definitions
```

**Note:** Admin endpoints are mocked in the frontend until Spring Boot implements them.

## Configuration

### Frontend Environment
Edit `/app/frontend/.env`:

```env
# Local development
REACT_APP_BACKEND_URL=http://localhost:8080

# Production
REACT_APP_BACKEND_URL=https://your-spring-boot-server.com
```

## Design Philosophy

- **Notion-like**: Minimal, calm, purposeful
- **Typography > Decoration**: Clean text hierarchy
- **Purposeful Colors**: Green = conversion, Amber = intent, Red = drop
- **No Popups/Modals**: All details in side drawers
- **Internal Use Only**: Admin/operator console, not end-user facing

## Languages Supported

- **HINGLISH** (Hindi + English)
- **ENGLISH**

ES/FR/DE have been removed per requirements.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui
- **Backend**: Spring Boot (external, not part of this repo)
- **Audio**: Served via Spring Boot `/audio/{file}.mp3`

## Folder Structure

```
/app/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── lib/           # API client
│   │   └── App.js         # Main app
│   └── .env               # Backend URL config
├── backend_deprecated/    # Old FastAPI (not used)
└── README.md             # This file
```

## Development Notes

1. **Hot Reload**: Frontend auto-reloads on file changes
2. **Mock Data**: Admin endpoints return mock data until Spring Boot implements them
3. **Audio**: Audio URLs are constructed as `${BACKEND_URL}/audio/${filename}`
4. **Side Drawers**: Used for all detail views (no modals)
