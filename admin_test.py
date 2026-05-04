"""
Admin endpoints + change-password tests for /api/...
Runs against EXPO_PUBLIC_BACKEND_URL from /app/frontend/.env
"""
import os
import sys
import time
import uuid
import json
from pathlib import Path

import requests

# Load BACKEND URL
ENV_PATH = Path("/app/frontend/.env")
BACKEND_URL = None
for line in ENV_PATH.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL=") or line.startswith("REACT_APP_BACKEND_URL="):
        BACKEND_URL = line.split("=", 1)[1].strip()
        break
assert BACKEND_URL, "Backend URL not found"
API = BACKEND_URL.rstrip("/") + "/api"
print(f"Using API: {API}")

ADMIN_EMAIL = "ghulam000786@gmail.com"
ADMIN_PW = "CoinAdmin@786"

results = []
def record(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} :: {detail}")
    results.append((name, ok, detail))

def post(path, json_body=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.post(API + path, json=json_body or {}, headers=headers, timeout=30)

def get(path, token=None, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return requests.get(API + path, headers=headers, params=params, timeout=30)


# 1) Admin login
r = post("/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PW})
if r.status_code != 200:
    print("Admin login failed:", r.status_code, r.text)
    sys.exit(1)
data = r.json()
admin_token = data["token"]
admin_user = data["user"]
record("admin login + is_admin=true", admin_user.get("is_admin") is True,
       f"is_admin={admin_user.get('is_admin')}")

# admin /auth/me
r = get("/auth/me", token=admin_token)
record("admin /auth/me is_admin", r.status_code == 200 and r.json()["user"].get("is_admin") is True,
       f"status={r.status_code}")

# Normal user
boy_email = "aman.boy@test.com"
r = post("/auth/login", {"email": boy_email, "password": "pass1234"})
if r.status_code != 200:
    # create
    boy_email = f"boy_{uuid.uuid4().hex[:6]}@test.com"
    r = post("/auth/register", {"email": boy_email, "password": "pass1234", "name": "Boy Tester"})
    boy_token = r.json()["token"]
    post("/users/onboarding", {"gender": "boy", "age": 25}, token=boy_token)
else:
    boy_token = r.json()["token"]
r = get("/auth/me", token=boy_token)
boy_user = r.json()["user"]
record("non-admin user is_admin=false", boy_user.get("is_admin") is False,
       f"is_admin={boy_user.get('is_admin')}")

# 2) /admin/me
r = get("/admin/me", token=admin_token)
record("GET /admin/me admin -> 200", r.status_code == 200, f"status={r.status_code}")
r = get("/admin/me", token=boy_token)
record("GET /admin/me non-admin -> 403", r.status_code == 403, f"status={r.status_code}")
r = get("/admin/me")
record("GET /admin/me no token -> 401", r.status_code == 401, f"status={r.status_code}")

# 3) /admin/stats
r = get("/admin/stats", token=admin_token)
ok = r.status_code == 200
js = r.json() if ok else {}
ok2 = ok and "payouts_by_status" in js and "users" in js
u = js.get("users", {})
ok3 = ok2 and u.get("total", -1) >= 0 and (u.get("girls", 0) + u.get("boys", 0)) <= u.get("total", 0)
record("GET /admin/stats", ok3, f"status={r.status_code} users={u}")

# 4) /admin/payouts
r = get("/admin/payouts", token=admin_token, params={"status": "pending"})
record("GET /admin/payouts?status=pending -> 200", r.status_code == 200, f"status={r.status_code}")
pending_list = r.json().get("payouts", []) if r.status_code == 200 else []
r2 = get("/admin/payouts", token=admin_token, params={"status": "all"})
record("GET /admin/payouts?status=all -> 200", r2.status_code == 200, f"status={r2.status_code}")
for s in ("approved", "paid", "rejected"):
    rs = get("/admin/payouts", token=admin_token, params={"status": s})
    items = rs.json().get("payouts", []) if rs.status_code == 200 else []
    bad = [it for it in items if it.get("status") != s]
    record(f"GET /admin/payouts?status={s} filter", rs.status_code == 200 and not bad,
           f"status={rs.status_code} count={len(items)}")

# 5) Setup girl + create pending payout
girl_email = "riya.girl@test.com"
r = post("/auth/login", {"email": girl_email, "password": "pass1234"})
if r.status_code != 200:
    girl_email = f"girl_{uuid.uuid4().hex[:6]}@test.com"
    r = post("/auth/register", {"email": girl_email, "password": "pass1234", "name": "Riya Girl"})
    girl_token = r.json()["token"]
    post("/users/onboarding", {"gender": "girl", "age": 23}, token=girl_token)
else:
    girl_token = r.json()["token"]

# Set credits to 500 directly via mongo
import subprocess
def set_credits(email, credits):
    cmd = [
        "python", "-c",
        f"""
import asyncio, os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
load_dotenv('/app/backend/.env')
async def go():
    c = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = c[os.environ['DB_NAME']]
    res = await db.users.update_one({{'email': '{email}'}}, {{'$set': {{'credits': {credits}, 'gender': 'girl', 'age': 23}}}})
    print('matched', res.matched_count, 'modified', res.modified_count)
asyncio.run(go())
"""
    ]
    out = subprocess.run(cmd, capture_output=True, text=True)
    print("set_credits:", out.stdout, out.stderr)

set_credits(girl_email, 500)
# refresh token user
r = get("/auth/me", token=girl_token)
girl_user = r.json()["user"]
print("girl credits after set:", girl_user.get("credits"))

# Create UPI payout request 200 credits
r = post("/payout/request", {"amount": 200, "method": "upi", "upi_id": "test@paytm"}, token=girl_token)
ok = r.status_code == 200 and r.json().get("payout", {}).get("status") == "pending"
record("girl POST /payout/request 200 UPI pending", ok, f"status={r.status_code} body={r.text[:200]}")
payout_id = r.json()["payout"]["id"] if ok else None

# Verify item appears in admin list
r = get("/admin/payouts", token=admin_token, params={"status": "pending"})
listed = [p for p in r.json().get("payouts", []) if p.get("id") == payout_id]
ok = len(listed) == 1
required_fields = {"id", "user_id", "user_name", "user_email", "credits", "inr_amount",
                   "method", "details", "status", "created_at"}
missing = required_fields - set(listed[0].keys()) if listed else required_fields
record("payout listed with required fields", ok and not missing, f"missing={missing}")

# 6) Approve
r = post(f"/admin/payouts/{payout_id}/approve", {"note": "Looks good"}, token=admin_token)
ok = r.status_code == 200 and r.json()["payout"]["status"] == "approved"
po = r.json().get("payout", {}) if ok else {}
ok2 = ok and po.get("admin_note") == "Looks good" and po.get("reviewed_by") == ADMIN_EMAIL and po.get("reviewed_at")
record("POST approve -> approved + meta", ok2, f"status={r.status_code} note={po.get('admin_note')} by={po.get('reviewed_by')}")

# Approve again - per code, approve allowed only when not paid/rejected -> approved is allowed -> 200 idempotent
r2 = post(f"/admin/payouts/{payout_id}/approve", {"note": "again"}, token=admin_token)
behavior = "200" if r2.status_code == 200 else f"{r2.status_code}"
record(f"Approve again behavior (observed {behavior})", r2.status_code in (200, 400),
       f"status={r2.status_code} body={r2.text[:120]}")

# 7) mark-paid
r = post(f"/admin/payouts/{payout_id}/mark-paid",
         {"note": "Done", "transaction_ref": "UTR12345"}, token=admin_token)
ok = r.status_code == 200 and r.json()["payout"]["status"] == "paid"
po = r.json().get("payout", {}) if ok else {}
ok2 = ok and po.get("transaction_ref") == "UTR12345" and po.get("paid_at")
record("POST mark-paid -> paid + tx_ref + paid_at", ok2,
       f"status={r.status_code} tx={po.get('transaction_ref')} paid_at={po.get('paid_at')}")

r2 = post(f"/admin/payouts/{payout_id}/mark-paid", {"note": "again"}, token=admin_token)
record("mark-paid again -> 400 already paid",
       r2.status_code == 400 and "already paid" in r2.text.lower(),
       f"status={r2.status_code} body={r2.text[:120]}")

# 8) reject (need a fresh pending payout)
# top up girl credits
set_credits(girl_email, 400)
r = post("/payout/request", {"amount": 150, "method": "upi", "upi_id": "test2@paytm"}, token=girl_token)
ok = r.status_code == 200 and r.json().get("payout", {}).get("status") == "pending"
record("create 2nd pending payout 150", ok, f"status={r.status_code} body={r.text[:200]}")
payout_id2 = r.json()["payout"]["id"] if ok else None

# pre-reject credits
r = get("/auth/me", token=girl_token)
pre_credits = r.json()["user"]["credits"]
print("pre-reject credits:", pre_credits)

r = post(f"/admin/payouts/{payout_id2}/reject", {"note": "Bad UPI"}, token=admin_token)
ok = r.status_code == 200 and r.json()["payout"]["status"] == "rejected"
record("POST reject -> rejected", ok, f"status={r.status_code} body={r.text[:200]}")

r = get("/auth/me", token=girl_token)
post_credits = r.json()["user"]["credits"]
print("post-reject credits:", post_credits)
record("rejected payout refunded credits", post_credits == pre_credits + 150,
       f"pre={pre_credits} post={post_credits} diff={post_credits-pre_credits}")

r = post(f"/admin/payouts/{payout_id2}/reject", {"note": "again"}, token=admin_token)
record("reject again -> 400 already rejected",
       r.status_code == 400 and "already rejected" in r.text.lower(),
       f"status={r.status_code} body={r.text[:120]}")

# 9) Change password
r = post("/account/change-password", {"current_password": "WrongPass", "new_password": "NewPass@123"}, token=admin_token)
record("change-password wrong current -> 400",
       r.status_code == 400 and "current password is incorrect" in r.text.lower(),
       f"status={r.status_code} body={r.text[:120]}")

r = post("/account/change-password", {"current_password": ADMIN_PW, "new_password": "NewPass@123"}, token=admin_token)
record("change-password correct -> 200", r.status_code == 200, f"status={r.status_code}")

r = post("/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PW})
record("login old password after change -> 401", r.status_code == 401, f"status={r.status_code}")

r = post("/auth/login", {"email": ADMIN_EMAIL, "password": "NewPass@123"})
ok = r.status_code == 200
record("login new password -> 200", ok, f"status={r.status_code}")
admin_token = r.json()["token"] if ok else admin_token

# Reset back to original
r = post("/account/change-password", {"current_password": "NewPass@123", "new_password": ADMIN_PW}, token=admin_token)
record("change-password reset to original -> 200", r.status_code == 200, f"status={r.status_code}")

# Confirm reset by login
r = post("/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PW})
record("login original after reset -> 200", r.status_code == 200, f"status={r.status_code}")
admin_token = r.json()["token"] if r.status_code == 200 else admin_token

r = post("/account/change-password", {"current_password": ADMIN_PW, "new_password": "abc"}, token=admin_token)
record("change-password too short -> 400",
       r.status_code == 400 and "at least 6" in r.text.lower(),
       f"status={r.status_code} body={r.text[:120]}")

# 10) Authorization: non-admin to admin endpoints
endpoints_get = ["/admin/me", "/admin/stats", "/admin/payouts"]
for ep in endpoints_get:
    rr = get(ep, token=boy_token)
    record(f"non-admin GET {ep} -> 403", rr.status_code == 403, f"status={rr.status_code}")
for ep in [f"/admin/payouts/{payout_id}/approve",
           f"/admin/payouts/{payout_id}/reject",
           f"/admin/payouts/{payout_id}/mark-paid"]:
    rr = post(ep, {"note": "x"}, token=boy_token)
    record(f"non-admin POST {ep} -> 403", rr.status_code == 403, f"status={rr.status_code}")

# Final summary
total = len(results)
passed = sum(1 for _, ok, _ in results if ok)
print(f"\n========== {passed}/{total} passed ==========")
failed = [(n, d) for n, ok, d in results if not ok]
if failed:
    print("FAILURES:")
    for n, d in failed:
        print(f" - {n} :: {d}")
    sys.exit(2)
sys.exit(0)
