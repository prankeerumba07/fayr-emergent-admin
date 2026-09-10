# Fayr Admin Panel — PRD

## Original Problem Statement
Build an internal Admin Panel for **Fayr** (a standalone incentivized review & refund platform for Indian e-commerce marketplaces: Amazon, Flipkart, Meesho, Myntra). The panel must have separate sections per internal team and take inspiration from Freshdesk/Freshchat for how users connect, how emails reach agents, how chats arrive and get assigned/transferred, and escalation when an agent is unavailable. The user's existing panel looked too basic and needed a strong redesign.

## Architecture
- **Frontend:** React 19 (CRA/CRACO), TailwindCSS, shadcn/ui, Framer Motion, Recharts, Sonner, lucide-react. Multi-pane SaaS dashboard, light theme (Plus Jakarta Sans / Inter / JetBrains Mono).
- **Backend:** FastAPI + Motor (MongoDB), all routes under `/api`. Demo data auto-seeded on startup (idempotent `POST /api/seed`).
- **AI:** emergentintegrations `LlmChat` with Claude Sonnet 4.6 via `EMERGENT_LLM_KEY` — reply suggestions + chat summary/sentiment.
- **Auth:** None (per user choice); acting agent + presence selectable in the top bar.

## User Personas
- Support agent (email tickets + live chat), Operations reviewer (OCR/visibility), Finance analyst (payouts/ledger), Frontend Ops manager (banners/rewards/UX), Admin/Management (staff routing, SLA, audit).

## Core Requirements (static)
5 team sections; Freshdesk-style shared inbox with assign/transfer/escalate; Freshchat-style live chat with pickup/transfer; ops verification queue; finance-gated withdrawals with wallet ledger; admin oversight; AI assist.

## Implemented (2026-06)
- **Customer Support:** shared email inbox (list/filter/search), threaded conversation, reply + internal-note composer, agent assignment, transfer/escalate dialog, resolve; Live Chat console with queue, pickup, messaging, transfer; AI reply suggestions + chat summary.
- **Operations:** OCR claim verification queue, confidence bars, visibility-check status, OCR inspection modal, approve/reject.
- **Finance:** withdrawal/refund queue, UPI status, approve (disburse)/reject, wallet ledger modal (append-only double-entry).
- **Frontend Ops:** campaign banners, reward rules, UX issues + metrics.
- **Admin/Management:** stat cards, team-capacity chart, audit log, staff roster with presence & load.
- **Global:** sidebar nav, acting-agent switcher, presence toggle, toasts, metrics per team.
- Verified: backend 19/19 pytest, frontend full happy path (100%).

## Backlog / Remaining
- **P1:** Real inbound email/chat integration (currently simulated demo data — MOCKED).
- **P1:** Staff authentication & role-based permissions if multi-user access is needed.
- **P2:** Canned response templates, SLA config editor, CSAT, real-time websockets for live chat, attachments/file upload.

## Next Tasks
- Await user feedback on look & flows; wire real channels or auth if requested.
