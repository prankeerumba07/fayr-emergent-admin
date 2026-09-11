"""Auth (JWT email/password) endpoint tests for Fayr Ops Desk."""
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://support-ops-panel-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# --- Login ---
def test_login_success(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and isinstance(data["access_token"], str) and len(data["access_token"]) > 30
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] in ("admin", "owner", "agent")


def test_login_wrong_password(s):
    # different email to avoid contaminating lockout counter for the admin
    r = s.post(f"{API}/auth/login", json={"email": "noone-xyz@fayr.in", "password": "wrong"})
    assert r.status_code == 401


# --- /auth/me ---
def test_me_with_bearer(s):
    login = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).json()
    token = login["access_token"]
    r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == ADMIN_EMAIL


def test_me_no_token():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_invalid_token():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert r.status_code == 401


# --- Brute-force lockout ---
def test_brute_force_lockout():
    email = f"bruteforce-{int(time.time())}@fayr.in"
    for _ in range(5):
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
        assert r.status_code == 401
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
    assert r.status_code == 429, f"Expected 429 after 5 fails, got {r.status_code}: {r.text}"


# --- Regression: bearer works on protected endpoints ---
def test_protected_endpoints_with_bearer():
    token = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).json()["access_token"]
    h = {"Authorization": f"Bearer {token}"}
    for path in ["/agents", "/tickets", "/chats", "/claims", "/withdrawals", "/kb-articles", "/canned-responses", "/audit-logs"]:
        r = requests.get(f"{API}{path}", headers=h)
        assert r.status_code == 200, f"{path} -> {r.status_code} {r.text[:200]}"


def test_protected_endpoints_without_bearer_are_public_or_401():
    # We just record behaviour — the auth spec says the frontend gates the panel; API-level enforcement optional.
    r = requests.get(f"{API}/agents")
    # Accept either 200 (public) or 401 (protected)
    assert r.status_code in (200, 401), r.status_code
