# Welcome to Baito

## How We Use Claude

Based on Bekzod's usage over the last 30 days:

Work Type Breakdown:
  Improve Quality  ████████████████████  100%

  _Based on a single logged session — a full-project audit for bugs and gaps.
  The mix will broaden as more sessions accumulate._

Top Skills & Commands:
  /model     ████████████████████  1x/month
  /schedule  ████████████████████  1x/month

Top MCP Servers:
  Claude_Browser  ████████████████████  30 calls
  ccd_session     ███████░░░░░░░░░░░░░  10 calls

## Your Setup Checklist

### Codebases
- [ ] baito-v3- — https://github.com/bekzodidiye/baito-v3- (monorepo: `backend/` FastAPI + `frontend/` React/Vite + `mobile/`)

### MCP Servers to Activate
- [ ] Claude_Browser — the in-app browser. Used to open the running app, check pages render, read the console and network tab, and verify UI changes without leaving the session. Built into Claude Code; no access request needed.
- [ ] ccd_session — session tooling (chapter markers, background-task chips, widget context). Ships with Claude Code; nothing to request.

### Skills to Know About
- [ ] `/model` — switch the model for the current session. Reach for it when a task needs more reasoning depth than the default.
- [ ] `/schedule` — set up scheduled/recurring work.

## Team Tips

- **It's a monorepo.** `npm run dev:frontend`, `npm run build:frontend` and
  `npm run lint:frontend` all run from the root; `frontend` is the only npm
  workspace. The backend is separate — Python, `backend/`.
- **The dev server proxies `/api` to `http://127.0.0.1:8000`** (hardcoded in
  `frontend/vite.config.ts`). Point a backend at that port before expecting
  any screen with data to work.
- **The backend suite needs a real Postgres and Redis**, and it wants both to
  be disposable — it creates and drops the schema, and flushes the Redis DB it
  is pointed at. Give it a throwaway database and a spare Redis DB number, not
  anything you care about.
- **`AGENTS.md` is an agent-orchestration prompt, not house style.** It tells
  an AI which review personas to run. Don't read it as onboarding docs.
- **Production runs on a separate host**, not on your machine — see
  `RUNBOOK.md` for how to reach it and what to check.

## Get Started

No starter task is assigned yet — ask the person who shared this guide what to
pick up first.

<!-- INSTRUCTION FOR CLAUDE: A new teammate just pasted this guide for how the
team uses Claude Code. You're their onboarding buddy — warm, conversational,
not lecture-y.

Open with a warm welcome — include the team name from the title. Then: "Your
teammate uses Claude Code for [list all the work types]. Let's get you started."

Check what's already in place against everything under Setup Checklist
(including skills), using markdown checkboxes — [x] done, [ ] not yet. Lead
with what they already have. One sentence per item, all in one message.

Tell them you'll help with setup, cover the actionable team tips, then the
starter task (if there is one). Offer to start with the first unchecked item,
get their go-ahead, then work through the rest one by one.

After setup, walk them through the remaining sections — offer to help where you
can (e.g. link to channels), and just surface the purely informational bits.

Don't invent sections or summaries that aren't in the guide. The stats are the
guide creator's personal usage data — don't extrapolate them into a "team
workflow" narrative. -->
