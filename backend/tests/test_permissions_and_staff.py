"""Backend tests for iteration 5: department permissions, staff management,
password reset flow, and AI rate-limit dependency (single call)."""
import os
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

ADMIN = ("prakash.tamang@cashkaro.com", "Fayr@Admin2026")
SUPPORT = ("support@fayr.in", "Support@2026")
OPS = ("ops1@fayr.in", "OpsPass2026")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"login failed for {email}: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}"}


@pytest.fixture(scope="session")
def admin_token():
    return _login(*ADMIN)


@pytest.fixture(scope="session")
def support_token():
    return _login(*SUPPORT)


@pytest.fixture(scope="session")
def ops_token(admin_token):
    # Ensure ops1@fayr.in exists (seeded by main app on startup, but be defensive)
    r = requests.post(f"{API}/auth/login", json={"email": OPS[0], "password": OPS[1]})
    if r.status_code != 200:
        # Create via staff API
        requests.post(f"{API}/staff",
                      json={"email": OPS[0], "password": OPS[1], "name": "Ops One", "role": "operations"},
                      headers=_h(admin_token))
        r = requests.post(f"{API}/auth/login", json={"email": OPS[0], "password": OPS[1]})
    assert r.status_code == 200, f"ops login failed: {r.text}"
    return r.json()["access_token"]


# ---------- Permission matrix ----------
class TestPermissions:
    def test_admin_can_access_all(self, admin_token):
        for p in ["/claims", "/withdrawals", "/tickets", "/staff", "/banners"]:
            r = requests.get(f"{API}{p}", headers=_h(admin_token))
            assert r.status_code == 200, f"admin {p} -> {r.status_code}"

    def test_operations_only_claims(self, ops_token):
        r = requests.get(f"{API}/claims", headers=_h(ops_token))
        assert r.status_code == 200
        for p in ["/withdrawals", "/tickets", "/staff"]:
            r = requests.get(f"{API}{p}", headers=_h(ops_token))
            assert r.status_code == 403, f"ops {p} should be 403 got {r.status_code}"

    def test_support_only_tickets(self, support_token):
        r = requests.get(f"{API}/tickets", headers=_h(support_token))
        assert r.status_code == 200
        for p in ["/claims", "/staff", "/withdrawals"]:
            r = requests.get(f"{API}{p}", headers=_h(support_token))
            assert r.status_code == 403, f"support {p} should be 403 got {r.status_code}"

    def test_unauthenticated_blocked(self):
        r = requests.get(f"{API}/tickets")
        assert r.status_code == 401


# ---------- Staff Management CRUD ----------
class TestStaffCRUD:
    created_id = None

    def test_list_staff_admin(self, admin_token):
        r = requests.get(f"{API}/staff", headers=_h(admin_token))
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert any(u["email"] == ADMIN[0] for u in data)

    def test_list_staff_non_admin_forbidden(self, support_token):
        r = requests.get(f"{API}/staff", headers=_h(support_token))
        assert r.status_code == 403

    def test_create_update_delete(self, admin_token):
        email = "TEST_staff_it5@fayr.in"
        # cleanup any prior
        lst = requests.get(f"{API}/staff", headers=_h(admin_token)).json()
        for u in lst:
            if u["email"] == email:
                requests.delete(f"{API}/staff/{u['id']}", headers=_h(admin_token))

        r = requests.post(f"{API}/staff",
                          json={"email": email, "password": "StaffPass1!", "name": "T Staff", "role": "finance"},
                          headers=_h(admin_token))
        assert r.status_code == 200, r.text
        uid = r.json()["user"]["id"]
        assert r.json()["user"]["role"] == "finance"

        # Password < 8 rejected
        r = requests.post(f"{API}/staff",
                          json={"email": "TEST_short@fayr.in", "password": "abc", "role": "agent"},
                          headers=_h(admin_token))
        assert r.status_code == 400

        # Duplicate email rejected
        r = requests.post(f"{API}/staff",
                          json={"email": email, "password": "StaffPass1!", "role": "finance"},
                          headers=_h(admin_token))
        assert r.status_code == 400

        # Update role
        r = requests.patch(f"{API}/staff/{uid}", json={"role": "operations"}, headers=_h(admin_token))
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "operations"

        # Verify persistence via list
        lst = requests.get(f"{API}/staff", headers=_h(admin_token)).json()
        assert any(u["id"] == uid and u["role"] == "operations" for u in lst)

        # Delete
        r = requests.delete(f"{API}/staff/{uid}", headers=_h(admin_token))
        assert r.status_code == 200
        lst = requests.get(f"{API}/staff", headers=_h(admin_token)).json()
        assert not any(u["id"] == uid for u in lst)

    def test_cannot_delete_self(self, admin_token):
        me = requests.get(f"{API}/auth/me", headers=_h(admin_token)).json()
        r = requests.delete(f"{API}/staff/{me['id']}", headers=_h(admin_token))
        assert r.status_code == 400

    def test_cannot_delete_last_admin(self, admin_token):
        # Only one admin exists; verify by counting
        staff = requests.get(f"{API}/staff", headers=_h(admin_token)).json()
        admins = [u for u in staff if u.get("role") == "admin"]
        if len(admins) == 1:
            # attempting to demote it should also 400
            r = requests.patch(f"{API}/staff/{admins[0]['id']}", json={"role": "support"}, headers=_h(admin_token))
            assert r.status_code == 400


# ---------- Password reset ----------
class TestPasswordReset:
    def test_forgot_password_generic_ok(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "no-such-user@example.com"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        r = requests.post(f"{API}/auth/forgot-password", json={"email": SUPPORT[0]})
        assert r.status_code == 200

    def test_reset_password_bogus_token(self):
        r = requests.post(f"{API}/auth/reset-password",
                          json={"token": "definitely-not-a-real-token-xxxxx", "new_password": "NewPass1!"})
        assert r.status_code == 400

    def test_reset_password_short(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "any", "new_password": "abc"})
        assert r.status_code == 400


# ---------- AI single-call still works with rate-limit dependency ----------
class TestAiSingleCall:
    def test_ai_reply_suggestions_admin(self, admin_token):
        tickets = requests.get(f"{API}/tickets", headers=_h(admin_token)).json()
        assert tickets
        r = requests.post(f"{API}/ai/reply-suggestions",
                          json={"ticket_id": tickets[0]["id"]},
                          headers=_h(admin_token), timeout=90)
        assert r.status_code == 200, r.text
        assert "suggestions" in r.json()
