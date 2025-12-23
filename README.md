# Aira Control Tower

A Notion-like, minimal operator console to test, supervise, and train an FSM-driven AI voice agent.

## Overview

This is an **internal admin/operator console** for managing Aira, an AI voice agent. The UI provides tools for:
- Testing voice interactions via text simulation
- Monitoring live calls in real-time
- Reviewing call history with advanced filtering
- Training and managing prompts per FSM state
- Viewing qualification data captured during calls

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Test Aira │Live      │Call      │Prompt    │Qual.     │  │
│  │          │Monitor   │Review    │Training  │Snapshot  │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend (FastAPI)                         │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │Webcall   │Calls     │FSM       │Prompts   │Stats     │  │
│  │APIs      │APIs      │APIs      │APIs      │APIs      │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│                            │                                │
│              FSM Engine (Deterministic)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       MongoDB                               │
│  ┌──────────┬──────────┬──────────┐                        │
│  │Calls     │Prompts   │Stats     │                        │
│  └──────────┴──────────┴──────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

1. **UI never decides conversation logic** - FSM is the single source of truth
2. **FSM is deterministic** - States and transitions cannot be edited via UI
3. **Prompts can be trained** - Per state/language, with draft → publish workflow
4. **Minimalistic design** - Notion-like, calm, purposeful interface

## Modules

### 1. Test Aira (Dev/Test Mode)
- Start webcall sessions via text simulation
- Supports multiple languages (EN, ES, FR, DE)
- Shows FSM state transitions in real-time
- Clearly labeled as test mode (no IVR integration)

### 2. Live Call Monitor (Read-only)
- Real-time view of active calls
- Stats: Active calls, Total calls, Completed, Demo intents
- Shows: Call status, FSM state, Language, Turn count
- Auto-refreshes every 5 seconds

### 3. Call Review (High Volume Ready)
- Paginated list supporting 500+ calls/day
- Filters: Exit reason, Demo intent, Date range
- Click call → view full conversation timeline
- Audio replay placeholder per turn

### 4. Prompt Training (Admin Only)
- Per FSM State + Language prompt management
- Tabs: Active / Drafts / Weak prompts
- Workflow:
  - Create new prompt → saved as Draft
  - Edit draft → update text
  - Publish draft → becomes Active
  - Mark Active as Weak → must provide replacement text
- FSM logic and transitions are NOT editable

### 5. Qualification Snapshot (Read-only)
- CRM payload view
- Shows: Captured answers, Objections, Demo intent
- View-only (no CRM writeback)

## API Reference

### Webcall APIs
- `POST /api/webcall/start` - Start a new test call
- `POST /api/webcall/input` - Send user input, get Aira response
- `POST /api/webcall/end` - End a call

### Call APIs
- `GET /api/calls/live` - Get active calls
- `GET /api/calls` - Paginated call history with filters
- `GET /api/calls/{id}` - Full call details with timeline
- `GET /api/calls/{id}/qualification` - Qualification data

### FSM APIs (Read-only)
- `GET /api/fsm/states` - All FSM state definitions
- `GET /api/fsm/states/{state}` - Single state info

### Prompt APIs
- `GET /api/prompts` - List prompts with filters
- `POST /api/prompts` - Create new prompt (as draft)
- `PUT /api/prompts/{id}` - Update draft prompt
- `POST /api/prompts/{id}/mark-weak` - Mark as weak + provide replacement
- `POST /api/prompts/{id}/publish` - Publish draft to active

### Stats API
- `GET /api/stats` - Dashboard statistics

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

The frontend runs on port 3000, backend on 8001.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, shadcn/ui components
- **Backend**: FastAPI, Motor (async MongoDB)
- **Database**: MongoDB
- **State Machine**: Simulated FSM (pluggable to real FSM)

## FSM States

| State | Description | Transitions |
|-------|-------------|-------------|
| greeting | Initial greeting | → language_selection, qualification |
| language_selection | Detect/confirm language | → qualification |
| qualification | Gather user info | → objection_handling, demo_offer, closing |
| objection_handling | Handle concerns | → qualification, demo_offer, closing |
| demo_offer | Offer product demo | → confirmation, objection_handling, closing |
| confirmation | Confirm demo details | → closing, transfer |
| closing | End conversation | (terminal) |
| transfer | Transfer to human | (terminal) |
| fallback | Handle unknown inputs | → greeting, qualification |

## Design Constraints Met

- ✅ No authentication/roles required
- ✅ No analytics dashboards
- ✅ No IVR configuration
- ✅ No CRM writeback
- ✅ Notion-like minimal design
- ✅ FSM read-only (only prompts trainable)
- ✅ Prepared for future integrations

## Future Integration Hooks

- IVR integration (replace test mode)
- CRM writeback (from qualification data)
- ElevenLabs audio playback (audio URLs ready)
- Real FSM engine connection (replace simulated)
