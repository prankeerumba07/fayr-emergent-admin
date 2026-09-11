# Auth Testing Playbook (Fayr Ops Desk)

## Accounts
- Admin: prakash.tamang@cashkaro.com / Fayr@Admin2026
- Support: support@fayr.in / Support@2026

## Step 1 — MongoDB
mongosh → use test_database
db.users.find({role:"admin"}).pretty()
Verify bcrypt hash starts with `$2b$`; unique index on users.email; index on login_attempts.identifier.

## Step 2 — API (Bearer token)
API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" -d '{"email":"prakash.tamang@cashkaro.com","password":"Fayr@Admin2026"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['access_token'])")
curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN"

Login returns { access_token, user }. /auth/me returns the same user with the Bearer token.
Wrong password → 401 "Invalid email or password".

## Step 3 — Frontend
- Visiting the app while logged out shows the Login screen (data-testid login-email-input / login-password-input / login-submit-btn).
- After login, the full panel loads. Topbar has data-testid="logout-btn" which clears the session.
