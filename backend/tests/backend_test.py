import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback: read frontend .env
    from pathlib import Path
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- Health / seed ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_seed(s):
    r = s.post(f"{API}/seed")
    assert r.status_code == 200


# ---------- Agents ----------
def test_agents_list(s):
    r = s.get(f"{API}/agents")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 5
    assert all("id" in a and "team" in a for a in data)


def test_agents_by_team(s):
    r = s.get(f"{API}/agents", params={"team": "customer_support"})
    assert r.status_code == 200
    assert all(a["team"] == "customer_support" for a in r.json())


def test_agent_presence(s):
    agents = s.get(f"{API}/agents").json()
    aid = agents[0]["id"]
    r = s.patch(f"{API}/agents/{aid}/presence", json={"presence": "busy"})
    assert r.status_code == 200
    assert r.json()["presence"] == "busy"


# ---------- Tickets ----------
def test_tickets_list_and_filter(s):
    r = s.get(f"{API}/tickets")
    assert r.status_code == 200
    tickets = r.json()
    assert len(tickets) > 0
    r2 = s.get(f"{API}/tickets", params={"status": "open"})
    assert r2.status_code == 200
    assert all(t["status"] == "open" for t in r2.json())
    r3 = s.get(f"{API}/tickets", params={"q": "refund"})
    assert r3.status_code == 200


def test_ticket_reply_assign_transfer_status(s):
    tickets = s.get(f"{API}/tickets").json()
    tid = tickets[0]["id"]
    agents = s.get(f"{API}/agents", params={"team": "customer_support"}).json()

    # reply
    r = s.post(f"{API}/tickets/{tid}/reply", json={"body": "TEST_reply", "mode": "reply", "agent_name": "Tester"})
    assert r.status_code == 200
    msgs = r.json()["messages"]
    assert any(m["body"] == "TEST_reply" and m["author_type"] == "agent" for m in msgs)

    # note
    r = s.post(f"{API}/tickets/{tid}/reply", json={"body": "TEST_note", "mode": "note", "agent_name": "Tester"})
    assert r.status_code == 200
    assert any(m["body"] == "TEST_note" and m["author_type"] == "note" for m in r.json()["messages"])

    # assign
    r = s.post(f"{API}/tickets/{tid}/assign", json={"agent_id": agents[0]["id"], "by": "Tester"})
    assert r.status_code == 200
    assert r.json()["assignee_id"] == agents[0]["id"]

    # transfer + escalate
    r = s.post(f"{API}/tickets/{tid}/transfer", json={"agent_id": agents[1]["id"], "note": "handover", "escalate": True, "by": "Tester"})
    assert r.status_code == 200
    assert r.json()["assignee_id"] == agents[1]["id"]
    assert r.json()["status"] == "escalated"

    # status resolve
    r = s.patch(f"{API}/tickets/{tid}/status", json={"status": "resolved"})
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"

    # verify persistence
    r = s.get(f"{API}/tickets/{tid}")
    assert r.status_code == 200
    assert r.json()["status"] == "resolved"


# ---------- Chats ----------
def test_chats_flow(s):
    chats = s.get(f"{API}/chats").json()
    assert len(chats) > 0
    cid = chats[0]["id"]
    agents = s.get(f"{API}/agents", params={"team": "customer_support"}).json()

    r = s.post(f"{API}/chats/{cid}/assign", json={"agent_id": agents[0]["id"]})
    assert r.status_code == 200
    assert r.json()["status"] == "active"

    r = s.post(f"{API}/chats/{cid}/message", json={"body": "TEST_chat_msg", "agent_name": "Tester"})
    assert r.status_code == 200
    assert any(m["body"] == "TEST_chat_msg" for m in r.json()["messages"])

    r = s.post(f"{API}/chats/{cid}/transfer", json={"agent_id": agents[1]["id"]})
    assert r.status_code == 200
    assert r.json()["assignee_id"] == agents[1]["id"]


# ---------- Claims ----------
def test_claims_flow(s):
    claims = s.get(f"{API}/claims").json()
    assert len(claims) >= 2
    r = s.post(f"{API}/claims/{claims[0]['id']}/approve", json={"by": "Tester"})
    assert r.status_code == 200 and r.json()["status"] == "approved"
    r = s.post(f"{API}/claims/{claims[1]['id']}/reject", json={"reason": "blurry", "by": "Tester"})
    assert r.status_code == 200 and r.json()["status"] == "rejected"


# ---------- Withdrawals ----------
def test_withdrawals_flow(s):
    ws = s.get(f"{API}/withdrawals").json()
    assert len(ws) >= 2
    pending = [w for w in ws if w["status"] == "pending"]
    r = s.post(f"{API}/withdrawals/{pending[0]['id']}/approve", json={"by": "Tester"})
    assert r.status_code == 200 and r.json()["status"] == "paid"
    r = s.post(f"{API}/withdrawals/{pending[1]['id']}/reject", json={"reason": "risk", "by": "Tester"})
    assert r.status_code == 200 and r.json()["status"] == "rejected"


# ---------- Frontend Ops ----------
def test_banners_rewards_ux(s):
    for path in ["banners", "reward-rules", "ux-issues"]:
        r = s.get(f"{API}/{path}")
        assert r.status_code == 200
        assert isinstance(r.json(), list) and len(r.json()) > 0


# ---------- Admin ----------
def test_audit_logs(s):
    r = s.get(f"{API}/audit-logs")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


@pytest.mark.parametrize("team", ["customer_support", "operations", "finance", "frontend_ops", "admin"])
def test_metrics(s, team):
    r = s.get(f"{API}/metrics/{team}")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


# ---------- AI ----------
def test_ai_reply_suggestions(s):
    tickets = s.get(f"{API}/tickets").json()
    r = s.post(f"{API}/ai/reply-suggestions", json={"ticket_id": tickets[0]["id"]}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert "suggestions" in data
    assert 1 <= len(data["suggestions"]) <= 3


def test_ai_chat_summary(s):
    chats = s.get(f"{API}/chats").json()
    r = s.post(f"{API}/ai/chat-summary", json={"chat_id": chats[0]["id"]}, timeout=60)
    assert r.status_code == 200
    data = r.json()
    assert "summary" in data and "sentiment" in data
