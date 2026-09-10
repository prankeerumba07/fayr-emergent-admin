"""Tests for the new Fayr Assistant AI Agent endpoints."""
import os
import time
import pytest
import requests
from pathlib import Path

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    for line in Path("/app/frontend/.env").read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

TIMEOUT = 90  # AI calls can be slow


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- Knowledge Base CRUD ---
def test_kb_list(s):
    r = s.get(f"{API}/kb-articles", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_kb_crud(s):
    r = s.post(f"{API}/kb-articles", json={
        "title": "TEST_ Article", "category": "Test", "content": "TEST body", "tags": ["t1"]
    }, timeout=15)
    assert r.status_code == 200
    art = r.json()
    aid = art["id"]
    assert art["title"] == "TEST_ Article"

    r = s.patch(f"{API}/kb-articles/{aid}", json={
        "title": "TEST_ Updated", "category": "Test", "content": "TEST body v2", "tags": []
    }, timeout=15)
    assert r.status_code == 200 and r.json()["title"] == "TEST_ Updated"

    r = s.delete(f"{API}/kb-articles/{aid}", timeout=15)
    assert r.status_code == 200 and r.json().get("deleted") is True


# --- Canned Responses CRUD ---
def test_canned_list(s):
    r = s.get(f"{API}/canned-responses", timeout=15)
    assert r.status_code == 200
    assert isinstance(r.json(), list) and len(r.json()) >= 1


def test_canned_crud(s):
    r = s.post(f"{API}/canned-responses", json={
        "title": "TEST_ Canned", "category": "Test", "channel": "both", "body": "TEST reply"
    }, timeout=15)
    assert r.status_code == 200
    cid = r.json()["id"]

    r = s.patch(f"{API}/canned-responses/{cid}", json={
        "title": "TEST_ Canned v2", "category": "Test", "channel": "chat", "body": "TEST v2"
    }, timeout=15)
    assert r.status_code == 200 and r.json()["title"] == "TEST_ Canned v2"

    r = s.delete(f"{API}/canned-responses/{cid}", timeout=15)
    assert r.status_code == 200


# --- Training insights ---
def test_training_insights_shape(s):
    r = s.get(f"{API}/ai/training-insights", timeout=15)
    assert r.status_code == 200
    d = r.json()
    for k in ("examples_count", "kb_count", "canned_count", "top_keywords",
              "by_channel", "recent_examples", "ai_chats", "handoffs",
              "resolved_by_ai", "top_canned"):
        assert k in d, f"missing {k}"
    assert isinstance(d["top_keywords"], list)
    assert isinstance(d["top_canned"], list)


# --- AI Chat start / greeting ---
@pytest.fixture(scope="module")
def started_chat(s):
    r = s.post(f"{API}/chats/start", json={
        "customer_name": "TEST_ Priya", "marketplace": "Amazon", "message": "hello"
    }, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "chat" in data and "ai" in data
    return data


def test_chat_start_ai_greeting(started_chat):
    chat = started_chat["chat"]
    ai = started_chat["ai"]
    assert chat["handled_by"] == "ai"
    assert chat["ai_active"] is True
    # AI message present
    ai_msgs = [m for m in chat["messages"] if m.get("ai")]
    assert len(ai_msgs) >= 1
    assert "Fayr Assistant" in ai_msgs[0]["author_name"]
    assert isinstance(ai.get("confidence"), (int, float))
    assert 0 <= ai["confidence"] <= 1


# --- AI handoff on human request keyword ---
def test_ai_handoff_on_human_request(s):
    r = s.post(f"{API}/chats/start", json={
        "customer_name": "TEST_ HandoffUser", "marketplace": "Flipkart", "message": "hi"
    }, timeout=TIMEOUT)
    assert r.status_code == 200
    cid = r.json()["chat"]["id"]

    r = s.post(f"{API}/chats/{cid}/customer-message",
               json={"body": "I want to talk to a human agent please"}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ai"].get("handoff") is True
    chat = data["chat"]
    assert chat["ai_active"] is False
    assert chat["handled_by"] == "human"
    assert chat["handoff_reason"]


# --- Manual handoff + resume ---
def test_manual_handoff_and_resume(s, started_chat):
    cid = started_chat["chat"]["id"]
    r = s.post(f"{API}/chats/{cid}/handoff", json={"reason": "TEST_ manual"}, timeout=15)
    assert r.status_code == 200
    assert r.json()["ai_active"] is False
    assert r.json()["status"] == "waiting"

    r = s.post(f"{API}/chats/{cid}/resume-ai", timeout=15)
    assert r.status_code == 200
    assert r.json()["ai_active"] is True
    assert r.json()["status"] == "active"


# --- Learning loop: agent reply captures ai_example ---
def test_learning_loop_from_agent_reply(s):
    before = s.get(f"{API}/ai/training-insights", timeout=15).json()["examples_count"]

    # create chat, handoff, send agent reply after customer msg exists
    r = s.post(f"{API}/chats/start", json={
        "customer_name": "TEST_ LearnUser", "marketplace": "Meesho",
        "message": "when will i get my refund"
    }, timeout=TIMEOUT)
    cid = r.json()["chat"]["id"]
    s.post(f"{API}/chats/{cid}/handoff", json={"reason": "TEST_"}, timeout=15)
    s.post(f"{API}/chats/{cid}/message",
           json={"body": "TEST_ hey — checking your order now", "agent_name": "Tester"},
           timeout=15)

    time.sleep(0.5)
    after = s.get(f"{API}/ai/training-insights", timeout=15).json()["examples_count"]
    assert after > before, f"examples did not grow: {before} -> {after}"


# --- AI email process (auto_send or draft) ---
def test_ai_process_ticket(s):
    tickets = s.get(f"{API}/tickets", timeout=15).json()
    tid = tickets[0]["id"]
    r = s.post(f"{API}/tickets/{tid}/ai-process", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["mode"] in ("sent", "draft")
    assert isinstance(d.get("confidence"), (int, float, type(None)))
    assert "ticket" in d
    if d["mode"] == "draft":
        assert d["ticket"].get("ai_draft"), "draft mode should populate ai_draft"
    else:
        # auto-sent: an AI-badged agent message appended
        ai_msgs = [m for m in d["ticket"]["messages"] if m.get("ai")]
        assert len(ai_msgs) >= 1
