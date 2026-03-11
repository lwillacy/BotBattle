# Tari Agent Arena

A repeated Prisoner's Dilemma game engine where autonomous agents compete in matches, earning points based on their cooperative or defecting strategies.

## Prerequisites

- Node.js 18+
- npm 8+
- PostgreSQL 14+

## Repository Structure

```
tari-agent-arena/
  apps/
    server/          # Express API server
    web/             # Next.js frontend (Phase 2)
  packages/
    shared/          # Shared TypeScript types
    sample-agents/   # Three sample agent implementations
```

## Setup

### 1. Install dependencies

```bash
cd /path/to/BotBattle
npm install
```

### 2. Configure environment

```bash
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your database credentials
```

Default `.env` content:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/tari_agent_arena
PORT=3000
```

### 3. Create the database

```bash
createdb tari_agent_arena
# or using psql:
psql -U postgres -c "CREATE DATABASE tari_agent_arena;"
```

### 4. Run database migrations

```bash
cd apps/server
npx prisma migrate dev --name init
```

### 5. Generate Prisma client

```bash
cd apps/server
npx prisma generate
```

### 6. Seed the database

```bash
cd apps/server
npm run prisma:seed
```

This creates 3 agent owners, 3 agents (pointing to local sample agent ports), and 2 completed matches with full round data.

## One-Command Demo (recommended for demo day)

```bash
# From the repo root — runs migrations, seeds data, starts everything
npm run demo
```

Then open **http://localhost:3001/demo** and click **Run Demo Match**.

That's the entire demo workflow. No separate terminals needed.

What `npm run demo` does:
1. Runs `prisma migrate deploy` (idempotent, safe to run multiple times)
2. Seeds the database with demo owners, agents, and sample match data
3. Starts the backend at `http://localhost:3000` with `DEMO_MODE=true`
4. Starts the frontend at `http://localhost:3001`

The demo agents (Trusting, Opportunist, Tit-for-Tat) run **in-process** inside
the backend — no separate sample-agent servers are needed.

---

## Running the Server

```bash
cd apps/server
npm run dev
# Server starts on http://localhost:3000
```

Or with compiled JS:
```bash
cd apps/server
npm run build
npm start
```

## Running the Frontend (Phase 2)

```bash
cd apps/web
npm run dev
# Frontend starts on http://localhost:3001
```

The frontend proxies all `/api/*` requests to the backend at `http://localhost:3000`.
If your backend runs on a different port, set `BACKEND_URL` in `apps/web/.env.local`:

```bash
cp apps/web/.env.local.example apps/web/.env.local
# Edit BACKEND_URL if needed (default: http://localhost:3000)
```

### Frontend pages

| Page | URL | Notes |
|---|---|---|
| Home | `http://localhost:3001/` | How It Works, payoff matrix, CTAs |
| Match | `http://localhost:3001/matches/[id]` | **Demo priority** — live polling + replay |
| Agents | `http://localhost:3001/agents` | Agent roster with metadata |
| Leaderboard | `http://localhost:3001/leaderboard` | Ranked by total profit |

## Running Sample Agents

Each sample agent is a simple Express server. Run them in separate terminals:

```bash
# Terminal 1: Trusting Agent (port 3101)
cd packages/sample-agents
npm run start:trusting

# Terminal 2: Opportunist Agent (port 3102)
npm run start:opportunist

# Terminal 3: Tit-for-Tat Agent (port 3103)
npm run start:tit-for-tat
```

Or run all at once (requires `concurrently`):
```bash
cd packages/sample-agents
npm run start:all
```

### Agent Strategies

| Agent | Port | Strategy |
|-------|------|----------|
| Trusting Agent | 3101 | Always TRUST unless betrayed twice in a row, then DEFECT once |
| Opportunist Agent | 3102 | TRUST rounds 1-10, DEFECT rounds 11+ when close or ahead |
| Tit-for-Tat Agent | 3103 | TRUST first round, then mirror opponent's previous action |

## Running Tests

```bash
cd apps/server
npm test
```

Tests cover:
- `resolver.test.ts` - Payoff matrix all 4 action combinations
- `initiator.test.ts` - Initiator rotation over 15 rounds
- `rulesHash.test.ts` - Hash stability and collision resistance
- `matchRunner.test.ts` - Score accumulation over simulated 15-round match
- `timeout.test.ts` - Agent caller timeout behavior
- `invalidResponse.test.ts` - Agent caller invalid response handling

## API Reference

### Health

```bash
# GET /health
curl http://localhost:3000/health
```

### Agents

```bash
# Create an agent
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "OWNER_ID_HERE",
    "name": "My Agent",
    "endpointUrl": "http://localhost:3101/decision",
    "minStake": 1.0,
    "maxStake": 50.0,
    "status": "active",
    "defaultActionOnTimeout": "DEFECT"
  }'

# List all agents
curl http://localhost:3000/agents

# Get agent with stats
curl http://localhost:3000/agents/AGENT_ID

# Validate agent endpoint
curl -X POST http://localhost:3000/agents/AGENT_ID/validate
```

### Matches

```bash
# Create a match
curl -X POST http://localhost:3000/matches \
  -H "Content-Type: application/json" \
  -d '{
    "agentAId": "AGENT_A_ID",
    "agentBId": "AGENT_B_ID",
    "stakePerAgent": 10.0,
    "rulesVersion": "trust-defect-v1"
  }'

# Start a match (synchronous - waits for completion)
curl -X POST http://localhost:3000/matches/MATCH_ID/start

# Get match state
curl http://localhost:3000/matches/MATCH_ID

# Get match rounds with decisions
curl http://localhost:3000/matches/MATCH_ID/rounds
```

### Leaderboard

```bash
# Get leaderboard (sorted by wins, then profit)
curl http://localhost:3000/leaderboard
```

## Game Rules (trust-defect-v1)

| Action Pair | Agent A Payoff | Agent B Payoff |
|-------------|---------------|---------------|
| TRUST / TRUST | +3 | +3 |
| TRUST / DEFECT | -4 | +5 |
| DEFECT / TRUST | +5 | -4 |
| DEFECT / DEFECT | 0 | 0 |

- **Total rounds**: 15
- **Decision window**: 1000ms per round
- **Initiator**: alternates each round (round 1 random), recorded on every round but provides no direct scoring bonus (`initiatorBonus: 0`)
- **Default action on timeout**: DEFECT

## Architecture Notes

- **Match runner** runs synchronously when `POST /matches/:id/start` is called
- **Ledger entries** track all financial events (stakes, bonuses, payoffs, payouts)
- **Stats** are computed on-the-fly from DB queries (no materialized stats table)
- **Rules** are snapshotted and hashed at match creation time to ensure immutability
- **Agent calls** use `AbortController` + `setTimeout` for deadline enforcement
