# Backend

This folder is intentionally empty.

The Aira Control Tower frontend integrates directly with the **Spring Boot backend**.

## Architecture

```
Frontend (React) → Spring Boot Backend
```

There is NO separate backend in this repository.

## Deprecated

The old FastAPI backend has been moved to `/app/backend_deprecated/` and is NOT used.

## Running

1. Start your Spring Boot backend (separately)
2. Start the React frontend: `cd /app/frontend && yarn start`
