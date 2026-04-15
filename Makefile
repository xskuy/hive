.PHONY: dev dev-infra dev-web dev-backend dev-agents stop

# Levanta todo
dev: dev-infra dev-web dev-backend dev-agents

# Solo bases de datos
dev-infra:
	docker compose up -d

# Solo frontend
dev-web:
	sh scripts/dev-web.sh &

# Solo backend transaccional
dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8001 &

# Solo backend de agentes
dev-agents:
	sh scripts/dev-agents.sh &

# Parar todo
stop:
	docker compose down
	-pkill -f "next dev" 2>/dev/null
	-pkill -f "next-server" 2>/dev/null
	-pkill -f "agents/.venv/bin/uvicorn" 2>/dev/null
	-pkill -f "backend/.venv/bin/uvicorn" 2>/dev/null
	-rm -f .next/dev/lock
