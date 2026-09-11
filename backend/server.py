from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import secrets
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Fayr Admin API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fayr")


# ----------------------------- Helpers -----------------------------
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return str(uuid.uuid4())


def rand_int(a, b):
    return a + secrets.randbelow(b - a + 1)


def rand_choice(seq):
    return secrets.choice(list(seq))


PROJ = {"_id": 0}


async def log_audit(actor: str, action: str, entity: str, entity_id: str, meta: Dict[str, Any] = None):
    await db.audit_logs.insert_one({
        "id": new_id(),
        "actor": actor,
        "action": action,
        "entity": entity,
        "entity_id": entity_id,
        "meta": meta or {},
        "timestamp": now_iso(),
    })


# ----------------------------- Models -----------------------------
class Message(BaseModel):
    id: str = Field(default_factory=new_id)
    author_type: str  # customer | agent | note | system
    author_name: str
    body: str
    created_at: str = Field(default_factory=now_iso)


class ReplyIn(BaseModel):
    body: str
    mode: str = "reply"  # reply | note
    agent_name: str = "You"


class AssignIn(BaseModel):
    agent_id: str
    by: str = "You"


class TransferIn(BaseModel):
    agent_id: str
    note: Optional[str] = ""
    by: str = "You"
    escalate: bool = False


class StatusIn(BaseModel):
    status: str


class PresenceIn(BaseModel):
    presence: str


class ClaimDecisionIn(BaseModel):
    reason: Optional[str] = ""
    by: str = "You"


class PayoutDecisionIn(BaseModel):
    reason: Optional[str] = ""
    by: str = "You"


class AiReplyIn(BaseModel):
    ticket_id: Optional[str] = None
    chat_id: Optional[str] = None
    context: Optional[str] = ""


class AiSummaryIn(BaseModel):
    chat_id: Optional[str] = None
    ticket_id: Optional[str] = None


# ----------------------------- Seed Data -----------------------------
MARKETPLACES = ["Amazon", "Flipkart", "Meesho", "Myntra"]

AGENTS_SEED = [
    {"name": "Ananya Sharma", "email": "ananya@fayr.in", "team": "customer_support", "role": "Support Lead", "presence": "online", "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Karan Mehta", "email": "karan@fayr.in", "team": "customer_support", "role": "Support Agent", "presence": "online", "avatar": "https://images.unsplash.com/photo-1633332755192-727a05c4013d?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Sneha Iyer", "email": "sneha@fayr.in", "team": "customer_support", "role": "Support Agent", "presence": "away", "avatar": "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Rahul Verma", "email": "rahul@fayr.in", "team": "operations", "role": "Ops Specialist", "presence": "online", "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Divya Rao", "email": "divya@fayr.in", "team": "operations", "role": "Verification Analyst", "presence": "busy", "avatar": "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Priya Nair", "email": "priya@fayr.in", "team": "finance", "role": "Finance Manager", "presence": "online", "avatar": "https://images.unsplash.com/photo-1607746882042-944635dfe10e?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Arjun Kapoor", "email": "arjun@fayr.in", "team": "finance", "role": "Payments Analyst", "presence": "offline", "avatar": "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Meera Joshi", "email": "meera@fayr.in", "team": "frontend_ops", "role": "Frontend Ops Lead", "presence": "online", "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
    {"name": "Vikram Malhotra", "email": "vikram@fayr.in", "team": "admin", "role": "Admin / Head of Ops", "presence": "online", "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=entropy&cs=srgb&fm=jpg&w=200&q=80"},
]

TICKET_SEED = [
    ("My refund for Amazon order is delayed", "Rohan Gupta", "rohan.g@gmail.com", "Amazon", "high", "open",
     "Hi team, I completed my review 12 days ago and the return window has closed but I haven't received my refund of ₹1,499 yet. Order ID 402-7788991. Please help."),
    ("Review got rejected — why?", "Sana Khan", "sana.khan@outlook.com", "Flipkart", "medium", "open",
     "I submitted my Flipkart review and uploaded the screenshot but the claim was rejected. Can someone explain what went wrong?"),
    ("Cannot withdraw wallet balance", "Aditya Menon", "aditya.menon@gmail.com", "Meesho", "urgent", "escalated",
     "I have ₹2,100 in my Fayr wallet from 3 completed tasks but the withdraw button keeps failing. This is urgent, I need the money."),
    ("UPI ID verification stuck", "Neha Bansal", "neha.bansal@gmail.com", "Amazon", "medium", "pending",
     "My UPI ID has been 'under verification' for 4 days. When will it be approved?"),
    ("Product returned but review still live", "Ishaan Roy", "ishaan.roy@yahoo.com", "Myntra", "low", "open",
     "I want to confirm — I returned the product but kept my review live. Will I still get the refund?"),
    ("How many tickets do I get per month?", "Pooja Desai", "pooja.desai@gmail.com", "Flipkart", "low", "resolved",
     "Just wanted to understand the ticket economy — how many claims can I make?"),
    ("Duplicate account warning", "Manish Tiwari", "manish.t@gmail.com", "Amazon", "high", "open",
     "I got a message that my account may be flagged for duplicate UPI. I only have one account, please check."),
    ("App crashes on review upload", "Kavya Reddy", "kavya.reddy@gmail.com", "Meesho", "high", "pending",
     "Every time I try to upload my review screenshot the app crashes on the confirmation screen. Using Android 13."),
]

CHAT_SEED = [
    ("Rohan Gupta", "rohan.g@gmail.com", "Amazon", "active", "frustrated",
     [("customer", "Hi, my refund is stuck since 2 weeks"),
      ("agent", "Hi Rohan, let me pull up your order details."),
      ("customer", "It's order 402-7788991, review is still live"),
      ("customer", "Please this is really frustrating")]),
    ("Sana Khan", "sana.khan@outlook.com", "Flipkart", "waiting", "neutral",
     [("customer", "Hello, is anyone there?"),
      ("customer", "I have a question about my rejected claim")]),
    ("Tarun Shah", "tarun.shah@gmail.com", "Myntra", "active", "positive",
     [("customer", "Hey! Loving the app, quick question"),
      ("agent", "Thank you Tarun! Go ahead 😊"),
      ("customer", "When does my holding period end for the kurta review?")]),
    ("Ritu Agarwal", "ritu.a@gmail.com", "Meesho", "waiting", "frustrated",
     [("customer", "My withdrawal failed twice!!"),
      ("customer", "Need help immediately")]),
]

CLAIM_SEED = [
    ("Rohan Gupta", "+91 98765 43210", "Amazon", "boAt Rockerz 450 Bluetooth Headphones", "402-7788991", 1499, 0.94, "passed"),
    ("Sana Khan", "+91 91234 56780", "Flipkart", "Redmi Smart Band 2", "OD4451900228", 1799, 0.61, "pending"),
    ("Aditya Menon", "+91 99887 76655", "Meesho", "Cotton Kurta Set (M)", "MSO-88213445", 699, 0.88, "passed"),
    ("Kavya Reddy", "+91 90000 12345", "Meesho", "Stainless Steel Water Bottle", "MSO-55120987", 499, 0.45, "failed"),
    ("Ishaan Roy", "+91 98111 22334", "Myntra", "Roadster Slim Fit Jeans", "MYN-77451288", 1299, 0.79, "pending"),
    ("Manish Tiwari", "+91 97654 33221", "Amazon", "Wildcraft 44L Rucksack", "402-9988776", 2199, 0.91, "passed"),
]

WITHDRAWAL_SEED = [
    ("Rohan Gupta", "+91 98765 43210", "rohan.g@okaxis", 1499, 3, 1499),
    ("Aditya Menon", "+91 99887 76655", "aditya@okhdfcbank", 2100, 4, 2100),
    ("Ritu Agarwal", "+91 96543 21789", "ritu.a@ybl", 699, 1, 699),
    ("Neha Bansal", "+91 93456 78901", "neha.bansal@oksbi", 999, 2, 999),
    ("Tarun Shah", "+91 90909 80808", "tarun@paytm", 1299, 2, 1299),
]

BANNER_SEED = [
    ("Amazon Great Indian Sale — 2x Rewards", "Amazon", "live", "Home Hero", 4.8, 128400),
    ("Flipkart Big Billion Days Boost", "Flipkart", "scheduled", "Home Hero", 0.0, 0),
    ("Meesho Mega Review Rewards", "Meesho", "live", "Category Top", 3.1, 74200),
    ("Myntra EORS Fashion Fest", "Myntra", "draft", "Home Hero", 0.0, 0),
]

REWARD_SEED = [
    ("Standard Refund Reward", "Amazon", 100, "active"),
    ("Festive Bonus Reward", "Flipkart", 110, "active"),
    ("New User Welcome Reward", "Meesho", 100, "active"),
    ("Premium Category Reward", "Myntra", 105, "paused"),
]

UX_SEED = [
    ("Review upload crashes on Android 13", "critical", "open"),
    ("UPI screen not scrolling on small devices", "high", "in_progress"),
    ("Wallet balance shows stale value after refund", "high", "open"),
    ("Marketplace logo blurry on hero card", "low", "resolved"),
]


async def do_seed(force=False):
    if not force and await db.agents.count_documents({}) > 0:
        return {"seeded": False, "message": "Data already present"}

    for c in ["agents", "tickets", "chats", "claims", "withdrawals", "banners", "reward_rules",
              "ux_issues", "audit_logs", "kb_articles", "canned_responses", "ai_examples"]:
        await db[c].delete_many({})

    agents = []
    for a in AGENTS_SEED:
        doc = {"id": new_id(), "active_tickets": rand_int(1, 8), **a}
        agents.append(doc)
    await db.agents.insert_many([dict(a) for a in agents])

    cs_agents = [a for a in agents if a["team"] == "customer_support"]
    ops_agents = [a for a in agents if a["team"] == "operations"]
    fin_agents = [a for a in agents if a["team"] == "finance"]

    base = datetime.now(timezone.utc)
    tickets = []
    for i, (subj, name, email, mkt, pri, status, body) in enumerate(TICKET_SEED):
        created = base - timedelta(hours=rand_int(1, 72))
        assignee = None
        if status != "open" or i % 3 == 0:
            assignee = rand_choice(cs_agents)["id"]
        sla_hours = {"urgent": 2, "high": 8, "medium": 24, "low": 48}[pri]
        tickets.append({
            "id": new_id(),
            "subject": subj, "from_name": name, "from_email": email,
            "marketplace": mkt, "priority": pri, "status": status,
            "team": "customer_support", "channel": "email",
            "assignee_id": assignee,
            "sentiment": rand_choice(["positive", "neutral", "frustrated"]),
            "sla_due": (created + timedelta(hours=sla_hours)).isoformat(),
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
            "messages": [{"id": new_id(), "author_type": "customer", "author_name": name, "body": body, "created_at": created.isoformat()}],
        })
    await db.tickets.insert_many([dict(t) for t in tickets])

    chats = []
    for name, email, mkt, status, sentiment, msgs in CHAT_SEED:
        started = base - timedelta(minutes=rand_int(2, 40))
        msg_objs = []
        for j, (atype, mbody) in enumerate(msgs):
            msg_objs.append({"id": new_id(), "author_type": atype, "author_name": name if atype == "customer" else "Ananya Sharma", "body": mbody, "created_at": (started + timedelta(minutes=j)).isoformat()})
        assignee = rand_choice(cs_agents)["id"] if status == "active" else None
        chats.append({
            "id": new_id(), "customer_name": name, "customer_email": email, "marketplace": mkt,
            "status": status, "assignee_id": assignee, "sentiment": sentiment,
            "waiting": status == "waiting",
            "handled_by": "human", "ai_active": False, "handoff_reason": None,
            "started_at": started.isoformat(),
            "last_at": (started + timedelta(minutes=len(msgs))).isoformat(),
            "messages": msg_objs,
        })
    await db.chats.insert_many([dict(c) for c in chats])

    claims = []
    for name, mob, mkt, prod, oid, amt, conf, vis in CLAIM_SEED:
        created = base - timedelta(hours=rand_int(1, 96))
        claims.append({
            "id": new_id(), "user_name": name, "user_mobile": mob, "marketplace": mkt,
            "product_title": prod, "order_id": oid, "claim_amount": amt,
            "ocr_confidence": conf, "visibility_check": vis,
            "ocr_text": f"Order {oid}\n{prod}\nTotal: ₹{amt}.00\nDelivered\nReturn window: 7 days",
            "screenshot_url": "",
            "status": "pending" if vis != "failed" else "pending",
            "assignee_id": rand_choice(ops_agents)["id"] if ops_agents else None,
            "created_at": created.isoformat(),
        })
    await db.claims.insert_many([dict(c) for c in claims])

    withdrawals = []
    for name, mob, upi, amt, tcount, bal in WITHDRAWAL_SEED:
        created = base - timedelta(hours=rand_int(1, 60))
        ledger = [
            {"type": "credit", "amount": amt, "balance": bal, "note": "Refund reward credited", "date": (created - timedelta(days=2)).isoformat()},
            {"type": "hold", "amount": 0, "balance": bal, "note": "Withdrawal requested", "date": created.isoformat()},
        ]
        withdrawals.append({
            "id": new_id(), "user_name": name, "user_mobile": mob, "upi_id": upi,
            "amount": amt, "tickets_count": tcount, "wallet_balance": bal,
            "upi_status": rand_choice(["verified", "pending"]),
            "status": "pending", "assignee_id": fin_agents[0]["id"] if fin_agents else None,
            "created_at": created.isoformat(), "ledger": ledger,
        })
    await db.withdrawals.insert_many([dict(w) for w in withdrawals])

    kb_seed = [
        ("What is Fayr?", "Getting Started", "Fayr is an incentivized review and refund platform for Indian e-commerce marketplaces (Amazon, Flipkart, Meesho, Myntra). A user claims a task, buys the product, writes a genuine review, and once the review is publicly live and the marketplace return window has closed, Fayr refunds the product amount to the user."),
        ("Ticket Economy", "Rewards", "Every user starts with 15 tickets. Claiming a task deducts 5 tickets, which are consumed once the product is purchased. Tickets are returned if a claim expires, and 10 tickets are returned to the user after a task is completed successfully."),
        ("Refunds & Holding Period", "Refunds", "A refund is only released after the review is publicly live AND the marketplace return window has closed. During the holding period Fayr re-runs a public visibility check; if the review was deleted mid-hold, the refund is stopped before it releases."),
        ("Verification & Evidence", "Verification", "Public scraping of the live review is the primary verification path. Screenshot/OCR is only a supporting fallback, never the sole evidence, and never auto-approves. Pending OCR cases must be approved by a support/ops staff member before a task advances."),
        ("Wallet & Withdrawals", "Payments", "The wallet is an append-only double-entry ledger stored in integer paise. Withdrawals are finance-gated: a finance team member approves each payout, and the user's UPI/bank details are verified before disbursement."),
        ("Fraud & Account Rules", "Trust & Safety", "Multiple accounts are detected via UPI/bank de-duplication and PAN anchoring. Screenshot forgery is countered by the evidence hierarchy (live scrape beats DKIM email beats screenshot). Deleting a review after payout can trigger a clawback per the Terms."),
        ("Supported Marketplaces", "Getting Started", "Fayr targets Amazon, Flipkart, Meesho, Myntra, Blinkit, Zepto and Instamart. Amazon and Flipkart are live first; others are rolling out."),
        ("Login & OTP", "Account", "Fayr uses mobile-number-only authentication. Users log in with their phone number and a one-time password (OTP) delivered over SMS."),
    ]
    await db.kb_articles.insert_many([
        {"id": new_id(), "title": t, "category": cat, "content": c, "tags": [], "source": "CLAUDE.md", "updated_at": now_iso()}
        for (t, cat, c) in kb_seed
    ])

    canned_seed = [
        ("Refund delayed", "Refunds", "both", "Thanks for reaching out! I can see your review is live \u2014 refunds are released only after your review stays public past the marketplace return window. Once that window closes, your \u20b9 amount is credited to your Fayr wallet automatically. I'll keep an eye on this one for you."),
        ("Review rejected", "Verification", "both", "I understand the frustration. A claim can be rejected if the live review couldn't be verified on the product page or the details didn't match the order. Could you share the review link so I can take a closer look?"),
        ("Withdrawal failed", "Payments", "both", "Sorry about the trouble withdrawing! Withdrawals go through a quick finance verification and your UPI ID needs to be verified first. Let me check your UPI status and get this moving for you."),
        ("UPI verification pending", "Payments", "both", "Your UPI is currently under verification \u2014 this is a one-time security check before your first payout. It usually clears within a day. I'll flag it to speed things up."),
        ("How ticket economy works", "Rewards", "both", "Great question! You start with 15 tickets. Claiming a task uses 5 (locked when you buy), and you get 10 back once the task is completed. If a claim expires, your tickets are returned."),
        ("App crash / bug", "Technical", "both", "Sorry you hit a glitch! Could you tell me your app version and phone model? As a quick fix, clearing the app cache and retrying the upload resolves this for most users while our team pushes a fix."),
    ]
    await db.canned_responses.insert_many([
        {"id": new_id(), "title": t, "category": cat, "channel": ch, "body": b, "usage_count": rand_int(3, 40), "updated_at": now_iso()}
        for (t, cat, ch, b) in canned_seed
    ])

    example_seed = [
        ("when will i get my refund", "Your refund releases automatically once your review stays live past the return window \u2014 I can see yours is on track, hang tight!", "chat"),
        ("my withdrawal is not working", "Let me check your UPI verification status \u2014 that's usually why a withdrawal doesn't go through. I'll sort it out.", "chat"),
        ("why was my review rejected", "It looks like we couldn't verify the live review on the product page. Share the review link and I'll re-check it right away.", "email"),
        ("how many tickets do i have", "You start with 15 tickets \u2014 claiming a task uses 5 and you get 10 back on completion. Want me to check your current balance?", "chat"),
    ]
    await db.ai_examples.insert_many([
        {"id": new_id(), "user_question": q, "agent_reply": r, "channel": ch, "source": "agent_reply", "created_at": now_iso()}
        for (q, r, ch) in example_seed
    ])

    await db.banners.insert_many([
        {"id": new_id(), "title": t, "marketplace": m, "status": s, "placement": p, "ctr": ctr, "impressions": imp}
        for (t, m, s, p, ctr, imp) in BANNER_SEED
    ])
    await db.reward_rules.insert_many([
        {"id": new_id(), "name": n, "marketplace": m, "reward_pct": r, "status": s}
        for (n, m, r, s) in REWARD_SEED
    ])
    await db.ux_issues.insert_many([
        {"id": new_id(), "title": t, "severity": sev, "status": s, "reported_by": "In-App Feedback"}
        for (t, sev, s) in UX_SEED
    ])

    await log_audit("system", "seed", "database", "all")
    return {"seeded": True, "message": "Demo data seeded"}


# ----------------------------- Routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "Fayr Admin API", "status": "ok"}


@api_router.post("/seed")
async def seed(force: bool = False):
    return await do_seed(force=force)


@api_router.get("/agents")
async def get_agents(team: Optional[str] = None):
    q = {"team": team} if team else {}
    return await db.agents.find(q, PROJ).to_list(200)


@api_router.patch("/agents/{agent_id}/presence")
async def set_presence(agent_id: str, body: PresenceIn):
    r = await db.agents.update_one({"id": agent_id}, {"$set": {"presence": body.presence}})
    if r.matched_count == 0:
        raise HTTPException(404, "Agent not found")
    await log_audit("You", "presence_change", "agent", agent_id, {"presence": body.presence})
    return await db.agents.find_one({"id": agent_id}, PROJ)


# ----- Tickets -----
@api_router.get("/tickets")
async def get_tickets(status: Optional[str] = None, marketplace: Optional[str] = None, q: Optional[str] = None):
    query = {"team": "customer_support"}
    if status and status != "all":
        query["status"] = status
    if marketplace and marketplace != "all":
        query["marketplace"] = marketplace
    if q:
        query["$or"] = [
            {"subject": {"$regex": q, "$options": "i"}},
            {"from_name": {"$regex": q, "$options": "i"}},
            {"from_email": {"$regex": q, "$options": "i"}},
        ]
    return await db.tickets.find(query, PROJ).sort("created_at", -1).to_list(200)


@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str):
    t = await db.tickets.find_one({"id": ticket_id}, PROJ)
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t


@api_router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, body: ReplyIn):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(404, "Ticket not found")
    msg = {"id": new_id(), "author_type": "note" if body.mode == "note" else "agent",
           "author_name": body.agent_name, "body": body.body, "created_at": now_iso()}
    update = {"$push": {"messages": msg}, "$set": {"updated_at": now_iso()}}
    if body.mode != "note" and t.get("status") == "open":
        update["$set"]["status"] = "pending"
    await db.tickets.update_one({"id": ticket_id}, update)
    await log_audit(body.agent_name, "reply" if body.mode != "note" else "note", "ticket", ticket_id)
    if body.mode != "note":
        last_cust = next((m["body"] for m in reversed(t.get("messages", [])) if m["author_type"] == "customer"), "")
        if last_cust and "AI" not in body.agent_name:
            await db.ai_examples.insert_one({"id": new_id(), "user_question": last_cust, "agent_reply": body.body,
                                             "channel": "email", "source": "agent_reply", "created_at": now_iso()})
        await db.tickets.update_one({"id": ticket_id}, {"$set": {"ai_draft": None}})
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api_router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(ticket_id: str, body: AssignIn):
    agent = await db.agents.find_one({"id": body.agent_id}, PROJ)
    if not agent:
        raise HTTPException(404, "Agent not found")
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"assignee_id": body.agent_id, "updated_at": now_iso()}})
    await log_audit(body.by, "assign", "ticket", ticket_id, {"agent": agent["name"]})
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api_router.post("/tickets/{ticket_id}/transfer")
async def transfer_ticket(ticket_id: str, body: TransferIn):
    t = await db.tickets.find_one({"id": ticket_id})
    if not t:
        raise HTTPException(404, "Ticket not found")
    agent = await db.agents.find_one({"id": body.agent_id}, PROJ)
    if not agent:
        raise HTTPException(404, "Target agent not found")
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": f"Ticket transferred to {agent['name']} ({agent['role']})." + (f" Note: {body.note}" if body.note else ""),
               "created_at": now_iso()}
    upd = {"$set": {"assignee_id": body.agent_id, "updated_at": now_iso()}, "$push": {"messages": sys_msg}}
    if body.escalate:
        upd["$set"]["status"] = "escalated"
    await db.tickets.update_one({"id": ticket_id}, upd)
    await log_audit(body.by, "transfer", "ticket", ticket_id, {"to": agent["name"], "escalate": body.escalate})
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


@api_router.patch("/tickets/{ticket_id}/status")
async def set_ticket_status(ticket_id: str, body: StatusIn):
    await db.tickets.update_one({"id": ticket_id}, {"$set": {"status": body.status, "updated_at": now_iso()}})
    await log_audit("You", "status_change", "ticket", ticket_id, {"status": body.status})
    return await db.tickets.find_one({"id": ticket_id}, PROJ)


# ----- Chats -----
@api_router.get("/chats")
async def get_chats(status: Optional[str] = None):
    query = {}
    if status and status != "all":
        query["status"] = status
    return await db.chats.find(query, PROJ).sort("last_at", -1).to_list(200)


@api_router.get("/chats/{chat_id}")
async def get_chat(chat_id: str):
    c = await db.chats.find_one({"id": chat_id}, PROJ)
    if not c:
        raise HTTPException(404, "Chat not found")
    return c


@api_router.post("/chats/{chat_id}/message")
async def send_chat_message(chat_id: str, body: ReplyIn):
    c = await db.chats.find_one({"id": chat_id})
    if not c:
        raise HTTPException(404, "Chat not found")
    msg = {"id": new_id(), "author_type": "agent", "author_name": body.agent_name, "body": body.body, "created_at": now_iso()}
    upd = {"$push": {"messages": msg}, "$set": {"last_at": now_iso(), "waiting": False, "handled_by": "human", "ai_active": False}}
    if c.get("status") == "waiting":
        upd["$set"]["status"] = "active"
    await db.chats.update_one({"id": chat_id}, upd)
    last_cust = next((m["body"] for m in reversed(c.get("messages", [])) if m["author_type"] == "customer"), "")
    if last_cust and "AI" not in body.agent_name:
        await db.ai_examples.insert_one({"id": new_id(), "user_question": last_cust, "agent_reply": body.body,
                                         "channel": "chat", "source": "agent_reply", "created_at": now_iso()})
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.post("/chats/{chat_id}/assign")
async def assign_chat(chat_id: str, body: AssignIn):
    agent = await db.agents.find_one({"id": body.agent_id}, PROJ)
    if not agent:
        raise HTTPException(404, "Agent not found")
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": f"Chat picked up by {agent['name']}.", "created_at": now_iso()}
    await db.chats.update_one({"id": chat_id}, {"$set": {"assignee_id": body.agent_id, "status": "active", "waiting": False, "handled_by": "human", "ai_active": False}, "$push": {"messages": sys_msg}})
    await log_audit(body.by, "assign", "chat", chat_id, {"agent": agent["name"]})
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.post("/chats/{chat_id}/transfer")
async def transfer_chat(chat_id: str, body: TransferIn):
    agent = await db.agents.find_one({"id": body.agent_id}, PROJ)
    if not agent:
        raise HTTPException(404, "Target agent not found")
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": f"Chat transferred to {agent['name']} ({agent['role']})." + (f" Note: {body.note}" if body.note else ""),
               "created_at": now_iso()}
    await db.chats.update_one({"id": chat_id}, {"$set": {"assignee_id": body.agent_id, "status": "transferred"}, "$push": {"messages": sys_msg}})
    await log_audit(body.by, "transfer", "chat", chat_id, {"to": agent["name"]})
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.patch("/chats/{chat_id}/status")
async def set_chat_status(chat_id: str, body: StatusIn):
    await db.chats.update_one({"id": chat_id}, {"$set": {"status": body.status}})
    return await db.chats.find_one({"id": chat_id}, PROJ)


# ----- Operations / Claims -----
@api_router.get("/claims")
async def get_claims(status: Optional[str] = None):
    query = {}
    if status and status != "all":
        query["status"] = status
    return await db.claims.find(query, PROJ).sort("created_at", -1).to_list(200)


@api_router.post("/claims/{claim_id}/approve")
async def approve_claim(claim_id: str, body: ClaimDecisionIn):
    c = await db.claims.find_one({"id": claim_id})
    if not c:
        raise HTTPException(404, "Claim not found")
    await db.claims.update_one({"id": claim_id}, {"$set": {"status": "approved"}})
    await log_audit(body.by, "approve_claim", "claim", claim_id)
    return await db.claims.find_one({"id": claim_id}, PROJ)


@api_router.post("/claims/{claim_id}/reject")
async def reject_claim(claim_id: str, body: ClaimDecisionIn):
    c = await db.claims.find_one({"id": claim_id})
    if not c:
        raise HTTPException(404, "Claim not found")
    await db.claims.update_one({"id": claim_id}, {"$set": {"status": "rejected", "reject_reason": body.reason}})
    await log_audit(body.by, "reject_claim", "claim", claim_id, {"reason": body.reason})
    return await db.claims.find_one({"id": claim_id}, PROJ)


# ----- Finance / Withdrawals -----
@api_router.get("/withdrawals")
async def get_withdrawals(status: Optional[str] = None):
    query = {}
    if status and status != "all":
        query["status"] = status
    return await db.withdrawals.find(query, PROJ).sort("created_at", -1).to_list(200)


@api_router.post("/withdrawals/{wid}/approve")
async def approve_withdrawal(wid: str, body: PayoutDecisionIn):
    w = await db.withdrawals.find_one({"id": wid})
    if not w:
        raise HTTPException(404, "Withdrawal not found")
    ledger_entry = {"type": "debit", "amount": w["amount"], "balance": w["wallet_balance"] - w["amount"], "note": "Payout disbursed to UPI", "date": now_iso()}
    await db.withdrawals.update_one({"id": wid}, {"$set": {"status": "paid", "wallet_balance": w["wallet_balance"] - w["amount"]}, "$push": {"ledger": ledger_entry}})
    await log_audit(body.by, "approve_payout", "withdrawal", wid, {"amount": w["amount"]})
    return await db.withdrawals.find_one({"id": wid}, PROJ)


@api_router.post("/withdrawals/{wid}/reject")
async def reject_withdrawal(wid: str, body: PayoutDecisionIn):
    w = await db.withdrawals.find_one({"id": wid})
    if not w:
        raise HTTPException(404, "Withdrawal not found")
    await db.withdrawals.update_one({"id": wid}, {"$set": {"status": "rejected", "reject_reason": body.reason}})
    await log_audit(body.by, "reject_payout", "withdrawal", wid, {"reason": body.reason})
    return await db.withdrawals.find_one({"id": wid}, PROJ)


# ----- Frontend Ops -----
@api_router.get("/banners")
async def get_banners():
    return await db.banners.find({}, PROJ).to_list(200)


@api_router.get("/reward-rules")
async def get_reward_rules():
    return await db.reward_rules.find({}, PROJ).to_list(200)


@api_router.get("/ux-issues")
async def get_ux_issues():
    return await db.ux_issues.find({}, PROJ).to_list(200)


# ----- Admin -----
@api_router.get("/audit-logs")
async def get_audit_logs(limit: int = 40):
    return await db.audit_logs.find({}, PROJ).sort("timestamp", -1).to_list(limit)


@api_router.get("/metrics/{team}")
async def get_metrics(team: str):
    if team == "customer_support":
        total = await db.tickets.count_documents({})
        open_c = await db.tickets.count_documents({"status": "open"})
        pending = await db.tickets.count_documents({"status": "pending"})
        escalated = await db.tickets.count_documents({"status": "escalated"})
        resolved = await db.tickets.count_documents({"status": "resolved"})
        chats_waiting = await db.chats.count_documents({"status": "waiting"})
        chats_active = await db.chats.count_documents({"status": "active"})
        return {"total_tickets": total, "open": open_c, "pending": pending, "escalated": escalated,
                "resolved": resolved, "chats_waiting": chats_waiting, "chats_active": chats_active,
                "avg_response_mins": 14, "sla_compliance": 92}
    if team == "operations":
        pend = await db.claims.count_documents({"status": "pending"})
        appr = await db.claims.count_documents({"status": "approved"})
        rej = await db.claims.count_documents({"status": "rejected"})
        failed_vis = await db.claims.count_documents({"visibility_check": "failed"})
        return {"pending": pend, "approved": appr, "rejected": rej, "failed_visibility": failed_vis,
                "avg_review_mins": 6, "auto_flagged": failed_vis}
    if team == "finance":
        pend = await db.withdrawals.count_documents({"status": "pending"})
        paid = await db.withdrawals.count_documents({"status": "paid"})
        rej = await db.withdrawals.count_documents({"status": "rejected"})
        ws = await db.withdrawals.find({}, PROJ).to_list(500)
        pending_amt = sum(w["amount"] for w in ws if w["status"] == "pending")
        paid_amt = sum(w["amount"] for w in ws if w["status"] == "paid")
        return {"pending": pend, "paid": paid, "rejected": rej, "pending_amount": pending_amt, "paid_amount": paid_amt}
    if team == "frontend_ops":
        live = await db.banners.count_documents({"status": "live"})
        rules = await db.reward_rules.count_documents({})
        open_ux = await db.ux_issues.count_documents({"status": "open"})
        return {"live_banners": live, "reward_rules": rules, "open_ux_issues": open_ux}
    if team == "admin":
        agents = await db.agents.count_documents({})
        online = await db.agents.count_documents({"presence": "online"})
        tickets = await db.tickets.count_documents({})
        claims = await db.claims.count_documents({})
        withdrawals = await db.withdrawals.count_documents({})
        return {"total_staff": agents, "online_staff": online, "total_tickets": tickets,
                "total_claims": claims, "total_withdrawals": withdrawals}
    raise HTTPException(404, "Unknown team")


# ----- AI -----
CLAUDE_MODELS = [
    "claude-sonnet-4-6",
    "claude-sonnet-5",
    "claude-opus-4-7",
    "claude-haiku-4-5-20251001",
]
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-4-6")


async def run_llm(system: str, prompt: str, model: str = None) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=new_id(),
        system_message=system,
    ).with_model("anthropic", model or CLAUDE_MODEL)
    resp = await chat.send_message(UserMessage(text=prompt))
    return resp


@api_router.post("/ai/reply-suggestions")
async def ai_reply_suggestions(body: AiReplyIn):
    convo = ""
    subject = ""
    if body.ticket_id:
        t = await db.tickets.find_one({"id": body.ticket_id})
        if t:
            subject = t.get("subject", "")
            convo = "\n".join([f"{m['author_type']}: {m['body']}" for m in t.get("messages", [])])
    elif body.chat_id:
        c = await db.chats.find_one({"id": body.chat_id})
        if c:
            convo = "\n".join([f"{m['author_type']}: {m['body']}" for m in c.get("messages", [])])
    system = ("You are an assistant for Fayr, an incentivized review & refund platform for Indian e-commerce "
              "(Amazon, Flipkart, Meesho, Myntra). Users earn refunds after their review stays publicly live past "
              "the return window. Draft empathetic, concise, professional support replies. Never promise money that "
              "isn't due. Use Indian English and ₹ for amounts.")
    prompt = (f"Subject: {subject}\n\nConversation so far:\n{convo}\n\n"
              "Write exactly 3 short suggested agent replies, each 2-4 sentences, covering different tones "
              "(1: empathetic resolution, 2: request more info, 3: policy explanation). "
              "Return ONLY the three replies separated by a line containing '---'. No numbering, no preamble.")
    try:
        text = await run_llm(system, prompt)
        parts = [p.strip() for p in text.split("---") if p.strip()]
        if len(parts) < 2:
            parts = [p.strip("-• \n") for p in text.split("\n\n") if p.strip()][:3]
        return {"suggestions": parts[:3]}
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


@api_router.post("/ai/chat-summary")
async def ai_chat_summary(body: AiSummaryIn):
    convo = ""
    if body.chat_id:
        c = await db.chats.find_one({"id": body.chat_id})
        if c:
            convo = "\n".join([f"{m['author_type']}: {m['body']}" for m in c.get("messages", [])])
    elif body.ticket_id:
        t = await db.tickets.find_one({"id": body.ticket_id})
        if t:
            convo = "\n".join([f"{m['author_type']}: {m['body']}" for m in t.get("messages", [])])
    if not convo:
        raise HTTPException(404, "Conversation not found")
    system = "You summarize customer conversations for Fayr support agents. Be crisp and factual."
    prompt = (f"Conversation:\n{convo}\n\n"
              "Return in this exact format:\n"
              "SUMMARY: <one sentence>\n"
              "POINTS: <3 short bullet points separated by ' | '>\n"
              "SENTIMENT: <one word: positive/neutral/frustrated>\n"
              "NEXT: <one recommended next action>")
    try:
        text = await run_llm(system, prompt)
        result = {"summary": "", "points": [], "sentiment": "neutral", "next": "", "raw": text}
        for line in text.splitlines():
            line = line.strip()
            if line.upper().startswith("SUMMARY:"):
                result["summary"] = line.split(":", 1)[1].strip()
            elif line.upper().startswith("POINTS:"):
                result["points"] = [p.strip("-• ") for p in line.split(":", 1)[1].split("|") if p.strip()]
            elif line.upper().startswith("SENTIMENT:"):
                result["sentiment"] = line.split(":", 1)[1].strip().lower()
            elif line.upper().startswith("NEXT:"):
                result["next"] = line.split(":", 1)[1].strip()
        return result
    except Exception as e:
        logger.error(f"AI error: {e}")
        raise HTTPException(500, f"AI service error: {str(e)}")


# ============================= AI AGENT ENGINE =============================
IST = timezone(timedelta(hours=5, minutes=30))
HUMAN_REQUEST_KEYWORDS = [
    "human", "real agent", "real person", "representative", "talk to someone", "speak to someone",
    "customer care", "support executive", "connect me to", "live agent", "not a bot", "not a robot",
    "want an agent", "talk to a person", "real support",
]
STOPWORDS = set("the a an is are was were do does did i you my me we our us to of in on for and or but not it "
                "this that with cant cant't have has had will would should can could get got be been am so if "
                "at as by from your their there here what when why how who whom about into out up down".split())


class StartChatIn(BaseModel):
    customer_name: str
    marketplace: str = "Amazon"
    message: str
    customer_email: Optional[str] = ""


class CustomerMsgIn(BaseModel):
    body: str


class HandoffIn(BaseModel):
    reason: Optional[str] = "Requested by user"


class TakeoverIn(BaseModel):
    agent_id: str


class KBIn(BaseModel):
    title: str
    category: str = "General"
    content: str
    tags: List[str] = []


class CannedIn(BaseModel):
    title: str
    category: str = "General"
    channel: str = "both"
    body: str


def greeting_for_now():
    h = datetime.now(IST).hour
    if h < 12:
        return "Good morning"
    if h < 17:
        return "Good afternoon"
    return "Good evening"


def extract_json(text):
    if not text:
        return None
    t = text.strip()
    t = re.sub(r"^```(json)?", "", t).strip()
    t = re.sub(r"```$", "", t).strip()
    m = re.search(r"\{.*\}", t, re.S)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def build_kb_context():
    kb = await db.kb_articles.find({}, PROJ).to_list(100)
    canned = await db.canned_responses.find({}, PROJ).to_list(100)
    examples = await db.ai_examples.find({}, PROJ).sort("created_at", -1).to_list(15)
    kb_text = "\n".join(["- [" + a.get("category", "General") + "] " + a["title"] + ": " + a["content"] for a in kb]) or "No articles yet."
    canned_text = "\n".join(["- " + c["title"] + ": " + c["body"] for c in canned]) or "No canned responses yet."
    ex_text = "\n".join(["User: " + e["user_question"] + "\nAgent: " + e["agent_reply"] for e in examples]) or "No prior examples yet."
    return kb_text, canned_text, ex_text


SUPPORT_PERSONA = (
    "You are 'Fayr Assistant', the AI customer support agent for Fayr, an incentivized review & refund "
    "platform for Indian e-commerce (Amazon, Flipkart, Meesho, Myntra). You speak like a warm, real human "
    "support agent from India \u2014 never robotic. Rules you must always follow: "
    "1) Be concise and genuinely helpful. Never over-explain or repeat information you already gave. "
    "2) Vary your wording every single turn \u2014 never reuse a greeting or sentence you already used in this conversation. "
    "3) Never pressure the user, never push to close the chat, never over-convince. Let the conversation breathe. "
    "4) Use the knowledge base and canned responses below as your source of truth, and mirror the tone of the past human agent replies. "
    "5) Use Indian English and the \u20b9 symbol for money. Sound human \u2014 friendly, empathetic, respectful."
)


async def _kb_system():
    kb_text, canned_text, ex_text = await build_kb_context()
    return (SUPPORT_PERSONA + "\n\nKNOWLEDGE BASE:\n" + kb_text +
            "\n\nCANNED RESPONSES:\n" + canned_text +
            "\n\nHOW OUR HUMAN AGENTS REPLY (learn their tone & handling):\n" + ex_text)


async def ai_chat_reply(chat):
    system = await _kb_system()
    history = "\n".join([m["author_type"].upper() + ": " + m["body"]
                         for m in chat.get("messages", []) if m["author_type"] in ("customer", "agent")])
    prompt = (
        "Current time of day in India: " + greeting_for_now() + ".\n"
        "Conversation so far:\n" + history + "\n\n"
        "Write the best next reply as Fayr Assistant. If it is just a greeting, thanks, or small talk, greet warmly using "
        "the time of day and ask how you can help (do not repeat a greeting you already used) \u2014 this is always something "
        "you can handle, so set needs_handoff=false and confidence to at least 0.9. Set needs_handoff to true ONLY if: the user "
        "asks for a human/real agent, you are genuinely not confident you can resolve their issue, or the user is clearly "
        "frustrated or angry. When handing off, your message should reassure them you're connecting them to a teammate.\n\n"
        "Respond ONLY with a JSON object with keys: message (string), needs_handoff (boolean), "
        "handoff_reason (string, empty if none), confidence (number 0 to 1), sentiment (positive, neutral, or frustrated)."
    )
    text = ""
    try:
        text = await run_llm(system, prompt)
    except Exception as e:
        logger.error("AI chat error: " + str(e))
        return {"message": "Let me connect you with one of our support teammates who can help you further.",
                "needs_handoff": True, "handoff_reason": "AI temporarily unavailable", "confidence": 0.0, "sentiment": "neutral"}
    return extract_json(text) or {"message": text, "needs_handoff": False, "handoff_reason": "",
                                   "confidence": 0.6, "sentiment": "neutral"}


async def ai_email_reply(ticket):
    system = await _kb_system()
    convo = "\n".join([m["author_type"].upper() + ": " + m["body"]
                       for m in ticket.get("messages", []) if m["author_type"] in ("customer", "agent", "note")])
    prompt = (
        "Subject: " + ticket.get("subject", "") + "\nConversation:\n" + convo + "\n\n"
        "Draft the best email reply as Fayr Assistant. Set auto_send to true ONLY if this is a simple, well-covered FAQ "
        "you can fully and confidently answer, and it does NOT involve money disbursement, account bans/flags, refunds "
        "being denied, or an angry complaint. For anything sensitive, risky, or where you are unsure, set auto_send=false "
        "so a human agent reviews your draft.\n\n"
        "Respond ONLY with a JSON object with keys: message (string, the full email reply), auto_send (boolean), "
        "confidence (number 0 to 1), canned_used (string title or empty), category (string)."
    )
    text = ""
    try:
        text = await run_llm(system, prompt)
    except Exception as e:
        logger.error("AI email error: " + str(e))
        return {"message": "", "auto_send": False, "confidence": 0.0, "canned_used": "", "category": "General"}
    return extract_json(text) or {"message": text, "auto_send": False, "confidence": 0.5, "canned_used": "", "category": "General"}


async def _ai_turn(chat_id):
    chat = await db.chats.find_one({"id": chat_id})
    if not chat or not chat.get("ai_active"):
        return {"acted": False}
    last_customer = next((m["body"] for m in reversed(chat["messages"]) if m["author_type"] == "customer"), "")
    forced = any(k in last_customer.lower() for k in HUMAN_REQUEST_KEYWORDS)
    data = await ai_chat_reply(chat)
    conf = float(data.get("confidence", 0.7) or 0.7)
    needs = bool(data.get("needs_handoff")) or forced or conf < 0.45
    reason = data.get("handoff_reason") or ("User asked for a human agent" if forced else ("AI low confidence" if conf < 0.45 else ""))
    ai_msg = {"id": new_id(), "author_type": "agent", "author_name": "Fayr Assistant (AI)",
              "body": data.get("message", ""), "created_at": now_iso(), "ai": True}
    await db.chats.update_one({"id": chat_id}, {"$push": {"messages": ai_msg},
                              "$set": {"last_at": now_iso(), "sentiment": data.get("sentiment", "neutral")}})
    if needs:
        sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
                   "body": "AI handed this chat to a human agent \u2014 " + (reason or "needs human help") + ".",
                   "created_at": now_iso()}
        await db.chats.update_one({"id": chat_id}, {"$push": {"messages": sys_msg},
                                  "$set": {"ai_active": False, "handled_by": "human", "status": "waiting",
                                           "waiting": True, "handoff_reason": reason}})
        await log_audit("Fayr Assistant (AI)", "handoff", "chat", chat_id, {"reason": reason})
    return {"acted": True, "handoff": needs, "reason": reason, "confidence": conf,
            "sentiment": data.get("sentiment", "neutral"), "message": data.get("message", "")}


@api_router.post("/chats/start")
async def start_chat(body: StartChatIn):
    now = now_iso()
    email = body.customer_email or (body.customer_name.lower().replace(" ", ".") + "@example.com")
    chat = {
        "id": new_id(), "customer_name": body.customer_name, "customer_email": email,
        "marketplace": body.marketplace, "status": "active", "assignee_id": None, "sentiment": "neutral",
        "waiting": False, "handled_by": "ai", "ai_active": True, "handoff_reason": None,
        "started_at": now, "last_at": now,
        "messages": [{"id": new_id(), "author_type": "customer", "author_name": body.customer_name,
                      "body": body.message, "created_at": now}],
    }
    await db.chats.insert_one(dict(chat))
    meta = await _ai_turn(chat["id"])
    updated = await db.chats.find_one({"id": chat["id"]}, PROJ)
    return {"chat": updated, "ai": meta}


@api_router.post("/chats/{chat_id}/customer-message")
async def customer_message(chat_id: str, body: CustomerMsgIn):
    chat = await db.chats.find_one({"id": chat_id})
    if not chat:
        raise HTTPException(404, "Chat not found")
    msg = {"id": new_id(), "author_type": "customer", "author_name": chat["customer_name"],
           "body": body.body, "created_at": now_iso()}
    setd = {"last_at": now_iso()}
    if not chat.get("ai_active"):
        setd["waiting"] = True
    await db.chats.update_one({"id": chat_id}, {"$push": {"messages": msg}, "$set": setd})
    meta = {"acted": False}
    if chat.get("ai_active"):
        meta = await _ai_turn(chat_id)
    updated = await db.chats.find_one({"id": chat_id}, PROJ)
    return {"chat": updated, "ai": meta}


@api_router.post("/chats/{chat_id}/handoff")
async def chat_handoff(chat_id: str, body: HandoffIn):
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": "Handed off to a human agent \u2014 " + (body.reason or "manual handoff") + ".", "created_at": now_iso()}
    await db.chats.update_one({"id": chat_id}, {"$set": {"ai_active": False, "handled_by": "human",
                              "status": "waiting", "waiting": True, "handoff_reason": body.reason}, "$push": {"messages": sys_msg}})
    await log_audit("You", "handoff", "chat", chat_id, {"reason": body.reason})
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.post("/chats/{chat_id}/resume-ai")
async def resume_ai(chat_id: str):
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": "Fayr Assistant (AI) resumed handling this chat.", "created_at": now_iso()}
    await db.chats.update_one({"id": chat_id}, {"$set": {"ai_active": True, "handled_by": "ai", "status": "active", "waiting": False, "handoff_reason": None}, "$push": {"messages": sys_msg}})
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.post("/tickets/{ticket_id}/ai-process")
async def ai_process_ticket(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    data = await ai_email_reply(ticket)
    mode = "sent" if data.get("auto_send") else "draft"
    if mode == "sent":
        msg = {"id": new_id(), "author_type": "agent", "author_name": "Fayr Assistant (AI)",
               "body": data.get("message", ""), "created_at": now_iso(), "ai": True}
        upd = {"$push": {"messages": msg}, "$set": {"updated_at": now_iso(), "ai_handled": True, "ai_draft": None}}
        if ticket.get("status") == "open":
            upd["$set"]["status"] = "pending"
        await db.tickets.update_one({"id": ticket_id}, upd)
    else:
        await db.tickets.update_one({"id": ticket_id}, {"$set": {"ai_draft": data.get("message", ""), "ai_handled": False}})
    await log_audit("Fayr Assistant (AI)", "ai_" + mode, "ticket", ticket_id, {"confidence": data.get("confidence")})
    updated = await db.tickets.find_one({"id": ticket_id}, PROJ)
    return {"mode": mode, "confidence": data.get("confidence"), "canned_used": data.get("canned_used", ""),
            "draft": data.get("message", ""), "ticket": updated}


# ----- Knowledge Base CRUD -----
@api_router.get("/kb-articles")
async def list_kb():
    return await db.kb_articles.find({}, PROJ).sort("updated_at", -1).to_list(200)


@api_router.post("/kb-articles")
async def create_kb(body: KBIn):
    doc = {"id": new_id(), "source": "manual", "updated_at": now_iso(), **body.model_dump()}
    await db.kb_articles.insert_one(dict(doc))
    await log_audit("You", "create", "kb_article", doc["id"], {"title": body.title})
    return await db.kb_articles.find_one({"id": doc["id"]}, PROJ)


@api_router.patch("/kb-articles/{aid}")
async def update_kb(aid: str, body: KBIn):
    await db.kb_articles.update_one({"id": aid}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    await log_audit("You", "update", "kb_article", aid, {"title": body.title})
    return await db.kb_articles.find_one({"id": aid}, PROJ)


@api_router.delete("/kb-articles/{aid}")
async def delete_kb(aid: str):
    await db.kb_articles.delete_one({"id": aid})
    return {"deleted": True}


# ----- Canned Responses CRUD -----
@api_router.get("/canned-responses")
async def list_canned():
    return await db.canned_responses.find({}, PROJ).sort("usage_count", -1).to_list(200)


@api_router.post("/canned-responses")
async def create_canned(body: CannedIn):
    doc = {"id": new_id(), "usage_count": 0, "updated_at": now_iso(), **body.model_dump()}
    await db.canned_responses.insert_one(dict(doc))
    await log_audit("You", "create", "canned_response", doc["id"], {"title": body.title})
    return await db.canned_responses.find_one({"id": doc["id"]}, PROJ)


@api_router.patch("/canned-responses/{cid}")
async def update_canned(cid: str, body: CannedIn):
    await db.canned_responses.update_one({"id": cid}, {"$set": {**body.model_dump(), "updated_at": now_iso()}})
    await log_audit("You", "update", "canned_response", cid, {"title": body.title})
    return await db.canned_responses.find_one({"id": cid}, PROJ)


@api_router.delete("/canned-responses/{cid}")
async def delete_canned(cid: str):
    await db.canned_responses.delete_one({"id": cid})
    return {"deleted": True}


# ----- Training Insights -----
@api_router.get("/ai/training-insights")
async def training_insights():
    examples = await db.ai_examples.find({}, PROJ).sort("created_at", -1).to_list(1000)
    kb_count = await db.kb_articles.count_documents({})
    canned_count = await db.canned_responses.count_documents({})
    freq = {}
    for e in examples:
        for w in re.findall(r"[a-zA-Z]+", (e.get("user_question") or "").lower()):
            if len(w) < 3 or w in STOPWORDS:
                continue
            freq[w] = freq.get(w, 0) + 1
    top = sorted(freq.items(), key=lambda x: -x[1])[:12]
    by_channel = {}
    for e in examples:
        ch = e.get("channel", "other")
        by_channel[ch] = by_channel.get(ch, 0) + 1
    ai_started = await db.chats.count_documents({"$or": [{"handled_by": "ai"}, {"handoff_reason": {"$ne": None}}]})
    handoffs = await db.chats.count_documents({"handoff_reason": {"$nin": [None, ""]}})
    resolved_by_ai = max(ai_started - handoffs, 0)
    canned = await db.canned_responses.find({}, PROJ).sort("usage_count", -1).to_list(10)
    return {
        "examples_count": len(examples),
        "kb_count": kb_count,
        "canned_count": canned_count,
        "top_keywords": [{"word": w, "count": c} for w, c in top],
        "by_channel": by_channel,
        "recent_examples": examples[:8],
        "ai_chats": ai_started,
        "handoffs": handoffs,
        "resolved_by_ai": resolved_by_ai,
        "top_canned": [{"title": c["title"], "usage_count": c.get("usage_count", 0)} for c in canned],
    }


@api_router.get("/ai/config")
async def ai_config():
    return {"provider": "anthropic", "active_model": CLAUDE_MODEL, "available_models": CLAUDE_MODELS}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await do_seed(force=False)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
