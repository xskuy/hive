# Hive

SaaS platform with a Next.js control plane, a transactional FastAPI backend,
and a LangGraph-powered agents backend.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js, shadcn/ui (radix-luma), Tailwind CSS |
| Transactional backend | Python, FastAPI, SQLAlchemy, Alembic |
| Agents backend | Python, FastAPI, LangGraph, LangChain, MCP |
| Database | PostgreSQL |
| Cache / Queues | Redis |
| Market data | yfinance, Tavily |

## Project structure

```
hive/
├── app/                  # Next.js pages
│   ├── dashboard/        # Main dashboard (sidebar layout)
│   └── page.tsx          # Redirects to /dashboard
├── components/           # UI components (shadcn)
├── features/             # Frontend feature modules
├── backend/              # Transactional FastAPI service
│   ├── app/
│   │   ├── core/         # Settings, DB, shared infrastructure
│   │   └── features/     # Domain modules (Market Sentinel)
│   └── alembic/          # Database migrations
├── agents/               # LangGraph / MCP backend
│   ├── app/
│   │   ├── routers/      # FastAPI endpoints
│   │   ├── services/     # Orchestrator (LangGraph)
│   │   ├── agents/       # Agent definitions
│   │   └── mcp_servers/  # MCP server configs
│   └── config/           # Settings (pydantic-settings)
├── docker-compose.yml    # PostgreSQL + Redis
└── Makefile              # Dev commands
```

## Prerequisites

- [Bun](https://bun.sh)
- [uv](https://docs.astral.sh/uv/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Setup

1. Clone the repo and install dependencies:

```bash
cd hive
bun install
cd backend && uv sync
cd ../agents && uv sync
```

2. Configure environment variables:

```bash
# Frontend
cp .env.local.example .env.local

# Transactional backend
cp backend/.env.example backend/.env

# Agents backend
cp agents/.env.example agents/.env
```

Fill in the API keys you need for your flows, especially `OPENAI_API_KEY`,
`ANTHROPIC_API_KEY`, and `TAVILY_API_KEY`.

3. Start everything:

```bash
make dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8001 |
| Backend docs | http://localhost:8001/docs |
| Agents API | http://localhost:8000 |
| Agents docs | http://localhost:8000/docs |

## Commands

```bash
make dev          # Start all services
make dev-infra    # Start only PostgreSQL + Redis
make dev-web      # Start only Next.js
make dev-backend  # Start only transactional FastAPI
make dev-agents   # Start only agents FastAPI
make stop         # Stop everything
```

## Adding UI components

```bash
bunx --bun shadcn@latest add <component>
```
