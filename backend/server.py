from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import random
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

    for c in ["agents", "tickets", "chats", "claims", "withdrawals", "banners", "reward_rules", "ux_issues", "audit_logs"]:
        await db[c].delete_many({})

    agents = []
    for a in AGENTS_SEED:
        doc = {"id": new_id(), "active_tickets": random.randint(1, 8), **a}
        agents.append(doc)
    await db.agents.insert_many([dict(a) for a in agents])

    cs_agents = [a for a in agents if a["team"] == "customer_support"]
    ops_agents = [a for a in agents if a["team"] == "operations"]
    fin_agents = [a for a in agents if a["team"] == "finance"]

    base = datetime.now(timezone.utc)
    tickets = []
    for i, (subj, name, email, mkt, pri, status, body) in enumerate(TICKET_SEED):
        created = base - timedelta(hours=random.randint(1, 72))
        assignee = None
        if status != "open" or i % 3 == 0:
            assignee = random.choice(cs_agents)["id"]
        sla_hours = {"urgent": 2, "high": 8, "medium": 24, "low": 48}[pri]
        tickets.append({
            "id": new_id(),
            "subject": subj, "from_name": name, "from_email": email,
            "marketplace": mkt, "priority": pri, "status": status,
            "team": "customer_support", "channel": "email",
            "assignee_id": assignee,
            "sentiment": random.choice(["positive", "neutral", "frustrated"]),
            "sla_due": (created + timedelta(hours=sla_hours)).isoformat(),
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
            "messages": [{"id": new_id(), "author_type": "customer", "author_name": name, "body": body, "created_at": created.isoformat()}],
        })
    await db.tickets.insert_many([dict(t) for t in tickets])

    chats = []
    for name, email, mkt, status, sentiment, msgs in CHAT_SEED:
        started = base - timedelta(minutes=random.randint(2, 40))
        msg_objs = []
        for j, (atype, mbody) in enumerate(msgs):
            msg_objs.append({"id": new_id(), "author_type": atype, "author_name": name if atype == "customer" else "Ananya Sharma", "body": mbody, "created_at": (started + timedelta(minutes=j)).isoformat()})
        assignee = random.choice(cs_agents)["id"] if status == "active" else None
        chats.append({
            "id": new_id(), "customer_name": name, "customer_email": email, "marketplace": mkt,
            "status": status, "assignee_id": assignee, "sentiment": sentiment,
            "waiting": status == "waiting",
            "started_at": started.isoformat(),
            "last_at": (started + timedelta(minutes=len(msgs))).isoformat(),
            "messages": msg_objs,
        })
    await db.chats.insert_many([dict(c) for c in chats])

    claims = []
    for name, mob, mkt, prod, oid, amt, conf, vis in CLAIM_SEED:
        created = base - timedelta(hours=random.randint(1, 96))
        claims.append({
            "id": new_id(), "user_name": name, "user_mobile": mob, "marketplace": mkt,
            "product_title": prod, "order_id": oid, "claim_amount": amt,
            "ocr_confidence": conf, "visibility_check": vis,
            "ocr_text": f"Order {oid}\n{prod}\nTotal: ₹{amt}.00\nDelivered\nReturn window: 7 days",
            "screenshot_url": "",
            "status": "pending" if vis != "failed" else "pending",
            "assignee_id": random.choice(ops_agents)["id"] if ops_agents else None,
            "created_at": created.isoformat(),
        })
    await db.claims.insert_many([dict(c) for c in claims])

    withdrawals = []
    for name, mob, upi, amt, tcount, bal in WITHDRAWAL_SEED:
        created = base - timedelta(hours=random.randint(1, 60))
        ledger = [
            {"type": "credit", "amount": amt, "balance": bal, "note": "Refund reward credited", "date": (created - timedelta(days=2)).isoformat()},
            {"type": "hold", "amount": 0, "balance": bal, "note": "Withdrawal requested", "date": created.isoformat()},
        ]
        withdrawals.append({
            "id": new_id(), "user_name": name, "user_mobile": mob, "upi_id": upi,
            "amount": amt, "tickets_count": tcount, "wallet_balance": bal,
            "upi_status": random.choice(["verified", "pending"]),
            "status": "pending", "assignee_id": fin_agents[0]["id"] if fin_agents else None,
            "created_at": created.isoformat(), "ledger": ledger,
        })
    await db.withdrawals.insert_many([dict(w) for w in withdrawals])

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
    upd = {"$push": {"messages": msg}, "$set": {"last_at": now_iso(), "waiting": False}}
    if c.get("status") == "waiting":
        upd["$set"]["status"] = "active"
    await db.chats.update_one({"id": chat_id}, upd)
    return await db.chats.find_one({"id": chat_id}, PROJ)


@api_router.post("/chats/{chat_id}/assign")
async def assign_chat(chat_id: str, body: AssignIn):
    agent = await db.agents.find_one({"id": body.agent_id}, PROJ)
    if not agent:
        raise HTTPException(404, "Agent not found")
    sys_msg = {"id": new_id(), "author_type": "system", "author_name": "System",
               "body": f"Chat picked up by {agent['name']}.", "created_at": now_iso()}
    await db.chats.update_one({"id": chat_id}, {"$set": {"assignee_id": body.agent_id, "status": "active", "waiting": False}, "$push": {"messages": sys_msg}})
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
async def run_llm(system: str, prompt: str) -> str:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    chat = LlmChat(
        api_key=os.environ["EMERGENT_LLM_KEY"],
        session_id=new_id(),
        system_message=system,
    ).with_model("anthropic", "claude-sonnet-4-6")
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
