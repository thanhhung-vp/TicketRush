# AGENTS.md

## Project map
- frontend/: React 18 + Vite + TailwindCSS app
- backend/: Node.js + Express + Socket.io API
- backend/migrations/: PostgreSQL schema and migration runner
- docker-compose.yml: local PostgreSQL + Redis

## Scope rules
- For frontend tasks, inspect frontend/src first. Do not inspect backend unless API behavior is needed.
- For backend tasks, inspect backend/src and backend/migrations first. Do not inspect frontend unless UI behavior is needed.
- Do not inspect node_modules, dist, build, coverage, logs, or generated files.
- Do not edit package-lock.json unless dependencies change.
- Do not edit .env files. Use .env.example for documentation.

## Commands
Backend:
- cd backend && npm run dev
- cd backend && npm run migrate
- cd backend && npm test

Frontend:
- cd frontend && npm run dev
- cd frontend && npm run build

## Before editing
- List the files you plan to inspect.
- Prefer minimal patches.
- Run targeted commands only.