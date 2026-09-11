## Fayr Admin Panel — PRD

## Original Problem Statement
Build an internal Admin Panel for **Fayr** (incentivized review & refund platform for Indian e-commerce: Amazon, Flipkart, Meesho, Myntra) with per-team sections, Freshdesk/Freshchat-inspired support, and (v2) an **autonomous AI support agent** that answers chats & emails, learns from every agent reply, and hands off to humans when needed.

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

## Team, Access & Recovery — 2026-06 (iteration 5)
Four features added, all verified 100% (backend 13/13 pytest + full frontend flows — `/app/test_reports/iteration_5.json`):
- **Department Permissions:** role→section access enforced server-side via `authorize_request` + `section_for_path` (mounted on `api_router`) and mirrored on the frontend (`ROLE_SECTIONS`, filtered Sidebar, role-gated routes, `NoAccess` page). Map: admin→all; support→Fayr Assistant + Customer Support; operations→Operations; frontend_ops→Frontend Ops; finance→Finance; agent→none. Disallowed routes redirect to the role's default section.
- **Staff Management:** admin-only `/api/staff` CRUD + `StaffManager` UI on Admin page (add teammate w/ temp password + department, inline role change, delete with confirm). Guards: unique email, min 8-char password, cannot delete self or last admin, cannot demote last admin.
- **Password Reset:** public `/api/auth/forgot-password` (generic response, no enumeration) emails a 1-hour secure link via **Emergent-managed Resend** (`email_service.py`, verified 202 from proxy); `/api/auth/reset-password` validates token+expiry. Public frontend routes `/forgot-password` & `/reset-password`, plus a "Forgot password?" link on Login. `password_reset_tokens` has a TTL index.
- **AI Rate Limit:** `enforce_ai_limit` dependency caps AI-calling endpoints at 50/user/day (`AI_DAILY_LIMIT`), tracked atomically in `ai_usage`, returns 429 when exceeded.
- **Invite by Email:** admin-only `POST /api/staff/invite` creates a pending user (unusable random password, `pending_invite=true`) and emails a 72h secure invite link (`send_invite_email`); teammate sets their own password via the existing `/reset-password?token=...&invite=1` page, which clears `pending_invite`. UI: "Invite by email" (primary) + "Add directly" buttons in Team Management, with an "Invite pending" badge on rows. Verified end-to-end (invite→can't-login→set-password→login), non-admin 403, duplicate 400.
- New envs: `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`, `FRONTEND_URL`, `AI_DAILY_LIMIT`.

## Security Hardening — 2026-06 (Security Audit remediation)
Full-app security audit run; all Critical/High/Medium findings fixed and verified via curl:
- **SEC-001 (CRITICAL) fixed:** All business/finance/admin/AI routes now require a valid JWT. `api_router` mounted with `dependencies=[Depends(get_current_user)]`; only `/`, `/auth/login`, `/auth/refresh` are public (`public_router`). Auth helpers relocated to top of `server.py`.
- **SEC-002 (HIGH) fixed:** AI endpoints (chat/email/suggestions/ai-process) now behind auth — no anonymous LLM cost abuse. (Rate-limiting per-user still recommended; AI auto-send for simple FAQs kept as an intentional product feature.)
- **SEC-003 (MEDIUM) fixed:** `scripts/bundle_source.py` no longer bundles `.env`/`test_credentials.md`/`auth_testing.md` (hard EXCLUDE_NAMES guard); ships `.env.example` instead. Regenerated `/app/fayr-admin-source.{zip,txt}` — verified zero real secret values present. `JWT_SECRET` rotated. `test_auth.py` reads creds from env.
- **SEC-004 (MEDIUM) fixed:** `/api/auth/register` is now admin-only (`require_admin`) with server-side role allow-list and no token issuance to caller — no self-assigned admin.
- **Hardening:** `CORS_ORIGINS` set to explicit frontend origin (no `*`); ticket-search `q` wrapped in `re.escape` (ReDoS). Verified: unauth→401, admin→200, non-admin seed/register→403.
- **Deferred (P3):** localStorage token→HttpOnly-only, cookie SameSite tighten, department-level RBAC (Task 3).


- New sidebar section **Fayr Assistant** (`/assistant`) with 5 tabs: AI Live Chat, AI Email, Knowledge Base, Canned Responses, Training Insights. Redesigned light/indigo-violet, glassy, airy look distinct from Freshdesk.
- **Autonomous AI (Claude Sonnet 4.6)**: greets & answers human-like (time-of-day greetings, varied wording, no over-convincing), returns confidence + sentiment per turn.
- **Handoff** on: user asks for human, confidence < 45%, or frustration. Manual hand-off, human takeover, and resume-AI supported. Graceful fallback → handoff if LLM unavailable.
- **AI Email**: auto-sends simple replies, auto-drafts complex ones for agent review & send.
- **Continuous learning**: every human agent reply + canned response is captured into `ai_examples` and read as context on every conversation; KB & canned are fully editable and apply instantly. KB seeded from CLAUDE.md.
- **Training Insights**: replies learned, KB/canned counts, AI resolution vs handoff, top question keywords, learning-by-channel, recent learned replies, top canned.
- Verified: backend 10/10 new AI tests + 19 original pass; frontend all AI flows pass (100%).
- Backlog: real inbound email/chat channel, staff auth, split server.py into routers (optional).
