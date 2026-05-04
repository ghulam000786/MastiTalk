"""
Backend tests for Coin Connect female revenue model + payout endpoints.
Targets endpoints in /app/backend/server.py.
"""
import os
import sys
import json
import uuid
import time
import asyncio
from pathlib import Path

import requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# --- config -----------------------------------------------------------------
FRONTEND_ENV = Path("/app/frontend/.env")
load_dotenv(FRONTEND_ENV)
BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
if not BASE:
    print("ERROR: EXPO_PUBLIC_BACKEND_URL not set")
    sys.exit(1)
API = f"{BASE}/api"

load_dotenv("/app/backend/.env")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

results = []  # (name, ok, note)

def record(name, ok, note=""):
    results.append((name, ok, note))
    status = "PASS" if ok else "FAIL"
    short = note if len(note) < 400 else note[:400] + "..."
    print(f"[{status}] {name} :: {short}")


def jpost(path, token=None, body=None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    r = requests.post(f"{API}{path}", headers=h, data=json.dumps(body or {}), timeout=30)
    return r


def jget(path, token=None):
    h = {}
    if token:
        h["Authorization"] = f"Bearer {token}"
    r = requests.get(f"{API}{path}", headers=h, timeout=30)
    return r


async def mongo_set_user(email, fields):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    res = await db.users.update_one({"email": email.lower()}, {"$set": fields})
    client.close()
    return res.modified_count


def set_user(email, fields):
    return asyncio.run(mongo_set_user(email, fields))


def register_and_onboard(name, email, password, gender, age):
    # try register
    r = jpost("/auth/register", body={"email": email, "password": password, "name": name})
    if r.status_code == 400:
        # already exists - login
        r = jpost("/auth/login", body={"email": email, "password": password})
        assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    elif r.status_code != 200:
        raise AssertionError(f"register failed {r.status_code} {r.text}")
    data = r.json()
    token = data["token"]
    # onboarding - set gender & age
    r2 = jpost("/users/onboarding", token=token, body={"gender": gender, "age": age})
    assert r2.status_code == 200, f"onboarding failed {r2.status_code} {r2.text}"
    return token


def main():
    print(f"API base: {API}")

    # --------- 1) /api/packs ----------
    r = jget("/packs")
    ok = r.status_code == 200
    body = r.json() if ok else {}
    checks = ok and (
        body.get("call_cost_per_min") == 17 and
        body.get("call_earn_per_min") == 8 and
        body.get("min_payout_credits") == 100 and
        abs(float(body.get("credit_to_inr_rate", 0)) - 0.40) < 1e-6
    )
    record("GET /api/packs constants", checks, f"status={r.status_code} keys={ {k: body.get(k) for k in ['call_cost_per_min','call_earn_per_min','min_payout_credits','credit_to_inr_rate']} }")

    # --------- 2) Create boy + girl ----------
    stamp = str(int(time.time()))
    boy_email = f"rahul.boy.{stamp}@cctest.com"
    girl_email = f"aisha.girl.{stamp}@cctest.com"
    try:
        boy_tok = register_and_onboard("Rahul Sharma", boy_email, "Password@123", "boy", 22)
        girl_tok = register_and_onboard("Aisha Khan", girl_email, "Password@123", "girl", 22)
        record("Register + onboard boy/girl", True, f"boy={boy_email} girl={girl_email}")
    except Exception as e:
        record("Register + onboard boy/girl", False, str(e))
        return

    # Verify /auth/me for both
    rm = jget("/auth/me", token=boy_tok)
    boy_me = rm.json()["user"]
    rm = jget("/auth/me", token=girl_tok)
    girl_me = rm.json()["user"]
    record("/auth/me gender+coins after onboarding",
           boy_me["gender"] == "boy" and girl_me["gender"] == "girl" and boy_me.get("coins") == 50 and girl_me.get("coins") == 50,
           f"boy={boy_me} girl={girl_me}")

    # --------- 3) /agora/token ----------
    # girl with default 50 coins should pass
    r = jpost("/agora/token", token=girl_tok, body={"channel_name": "test_x", "uid": 0})
    girl_tok_resp = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and "token" in girl_tok_resp and "call_id" in girl_tok_resp
    record("POST /agora/token girl default coins -> 200", ok, f"status={r.status_code} body={str(r.text)[:200]}")
    girl_call_id = girl_tok_resp.get("call_id")

    # boy with 0 coins => 402
    set_user(boy_email, {"coins": 0})
    r = jpost("/agora/token", token=boy_tok, body={"channel_name": "test_x", "uid": 0})
    ok = r.status_code == 402
    record("POST /agora/token boy 0 coins -> 402", ok, f"status={r.status_code} body={r.text[:200]}")

    # reset boy coins=50, should succeed
    set_user(boy_email, {"coins": 50})
    r = jpost("/agora/token", token=boy_tok, body={"channel_name": "test_x", "uid": 0})
    boy_tok_resp = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and "token" in boy_tok_resp and "call_id" in boy_tok_resp
    record("POST /agora/token boy coins=50 -> 200", ok, f"status={r.status_code} body={str(r.text)[:200]}")
    boy_call_id = boy_tok_resp.get("call_id")

    # --------- 4) /agora/end-call ----------
    # girl 3 minutes: 24 credits
    girl_me_before = jget("/auth/me", token=girl_tok).json()["user"]
    r = jpost("/agora/end-call", token=girl_tok, body={"call_id": girl_call_id, "minutes": 3})
    ok = r.status_code == 200
    body = r.json() if ok else {}
    ok = ok and body.get("credits_earned") == 24 and body.get("coins_spent") == 0
    girl_me_after = jget("/auth/me", token=girl_tok).json()["user"]
    delta_credits = girl_me_after["credits"] - girl_me_before["credits"]
    coins_unchanged = girl_me_after["coins"] == girl_me_before["coins"]
    ok = ok and delta_credits == 24 and coins_unchanged
    record("POST /agora/end-call girl 3min -> credits_earned=24 credits+=24 coins unchanged",
           ok, f"status={r.status_code} resp={body} delta_credits={delta_credits} coins_unchanged={coins_unchanged}")

    # idempotent re-call for girl
    r2 = jpost("/agora/end-call", token=girl_tok, body={"call_id": girl_call_id, "minutes": 3})
    b2 = r2.json() if r2.status_code == 200 else {}
    ok = r2.status_code == 200 and b2.get("credits_earned") == 0 and b2.get("coins_spent") == 0
    record("POST /agora/end-call girl idempotent -> 0 deltas", ok, f"status={r2.status_code} resp={b2}")

    # boy 2 minutes: coins_spent=34, balance reduced by 34
    boy_me_before = jget("/auth/me", token=boy_tok).json()["user"]
    r = jpost("/agora/end-call", token=boy_tok, body={"call_id": boy_call_id, "minutes": 2})
    body = r.json() if r.status_code == 200 else {}
    boy_me_after = jget("/auth/me", token=boy_tok).json()["user"]
    delta_coins = boy_me_before["coins"] - boy_me_after["coins"]
    ok = (r.status_code == 200 and body.get("coins_spent") == 34 and
          body.get("credits_earned") == 0 and delta_coins == 34)
    record("POST /agora/end-call boy 2min -> coins_spent=34 balance-=34 credits_earned=0",
           ok, f"status={r.status_code} resp={body} delta_coins={delta_coins}")

    # idempotent re-call for boy
    r2 = jpost("/agora/end-call", token=boy_tok, body={"call_id": boy_call_id, "minutes": 2})
    b2 = r2.json() if r2.status_code == 200 else {}
    ok = r2.status_code == 200 and b2.get("credits_earned") == 0 and b2.get("coins_spent") == 0
    record("POST /agora/end-call boy idempotent -> 0 deltas", ok, f"status={r2.status_code} resp={b2}")

    # --------- 5) /match/join ----------
    # clear any pending match queue entries
    jpost("/match/cancel", token=girl_tok)
    jpost("/match/cancel", token=boy_tok)

    # girl with 0 coins -> 200
    set_user(girl_email, {"coins": 0})
    r = jpost("/match/join", token=girl_tok, body={"preference": "any"})
    ok = r.status_code == 200 and r.json().get("status") in ("waiting", "matched")
    record("POST /match/join girl coins=0 -> 200 waiting/matched", ok, f"status={r.status_code} body={r.text[:200]}")
    jpost("/match/cancel", token=girl_tok)

    # boy with 0 coins -> 402
    set_user(boy_email, {"coins": 0})
    r = jpost("/match/join", token=boy_tok, body={"preference": "any"})
    ok = r.status_code == 402
    record("POST /match/join boy coins=0 -> 402", ok, f"status={r.status_code} body={r.text[:200]}")

    # reset boy coins, should succeed
    set_user(boy_email, {"coins": 50})
    r = jpost("/match/join", token=boy_tok, body={"preference": "any"})
    ok = r.status_code == 200 and r.json().get("status") in ("waiting", "matched")
    record("POST /match/join boy coins=50 -> 200", ok, f"status={r.status_code} body={r.text[:200]}")
    jpost("/match/cancel", token=boy_tok)

    # --------- 6) /payout/config ----------
    r = jget("/payout/config", token=girl_tok)
    ok = r.status_code == 200
    body = r.json() if ok else {}
    ok = ok and (
        body.get("min_payout_credits") == 100 and
        abs(float(body.get("credit_to_inr_rate", 0)) - 0.40) < 1e-6 and
        body.get("call_earn_per_min") == 8 and
        body.get("gender") == "girl" and
        "credits" in body and "inr_equivalent" in body
    )
    # verify inr_equivalent math
    credits = body.get("credits", 0)
    ok = ok and abs(body.get("inr_equivalent", -1) - round(credits * 0.40, 2)) < 1e-6
    record("GET /payout/config girl returns correct fields", ok, f"status={r.status_code} body={body}")

    # --------- 7) /payout/request ----------
    # 7a. boy forbidden
    r = jpost("/payout/request", token=boy_tok, body={"amount": 100, "method": "upi", "upi_id": "x@paytm"})
    ok = r.status_code == 403
    record("POST /payout/request as boy -> 403", ok, f"status={r.status_code} body={r.text[:200]}")

    # 7b. girl with credits < 100 => 400 min redeem
    # Ensure girl credits are low; after test 4 she had credits=24
    cur_credits = jget("/auth/me", token=girl_tok).json()["user"]["credits"]
    # drop to <100 if needed
    if cur_credits >= 100:
        set_user(girl_email, {"credits": 20})
    r = jpost("/payout/request", token=girl_tok, body={"amount": 50, "method": "upi", "upi_id": "aisha@paytm"})
    ok = r.status_code == 400 and "Minimum" in r.text
    record("POST /payout/request girl amount<100 -> 400 minimum", ok, f"status={r.status_code} body={r.text[:200]}")

    # 7c. set credits=200, submit valid UPI with amount=150 => 200, credits=50 after
    set_user(girl_email, {"credits": 200})
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": 150, "method": "upi", "upi_id": "alice@paytm"})
    body = r.json() if r.status_code == 200 else {}
    payout = body.get("payout", {})
    me_after = jget("/auth/me", token=girl_tok).json()["user"]
    ok = (r.status_code == 200 and payout.get("status") == "pending" and
          payout.get("credits") == 150 and abs(payout.get("inr_amount", 0) - 60.0) < 1e-6 and
          me_after["credits"] == 50)
    record("POST /payout/request UPI valid 150 -> 200 pending, inr_amount=60, credits=50",
           ok, f"status={r.status_code} payout={payout} credits_after={me_after.get('credits')}")

    # 7d. invalid UPI (no @)
    set_user(girl_email, {"credits": 200})
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": 150, "method": "upi", "upi_id": "alicepaytm"})
    ok = r.status_code == 400 and "UPI" in r.text
    record("POST /payout/request invalid UPI -> 400", ok, f"status={r.status_code} body={r.text[:200]}")

    # 7e. method=bank missing fields -> 400
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": 150, "method": "bank"})  # all missing
    ok = r.status_code == 400
    record("POST /payout/request bank missing fields -> 400", ok, f"status={r.status_code} body={r.text[:200]}")

    # 7f. method=bank with amount=50 -> 400 (below min 100)
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": 50, "method": "bank",
                    "account_name": "Alice", "account_number": "1234567890",
                    "ifsc": "HDFC0001234", "bank_name": "HDFC"})
    ok = r.status_code == 400
    record("POST /payout/request bank amount=50 -> 400 (below MIN)", ok, f"status={r.status_code} body={r.text[:200]}")

    # bank amount=100 with credits>=100 -> 200
    set_user(girl_email, {"credits": 200})
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": 100, "method": "bank",
                    "account_name": "Alice", "account_number": "1234567890",
                    "ifsc": "HDFC0001234", "bank_name": "HDFC"})
    body = r.json() if r.status_code == 200 else {}
    payout = body.get("payout", {})
    ok = (r.status_code == 200 and payout.get("status") == "pending" and
          payout.get("credits") == 100 and abs(payout.get("inr_amount", 0) - 40.0) < 1e-6 and
          payout.get("method") == "bank" and
          payout.get("details", {}).get("ifsc") == "HDFC0001234")
    record("POST /payout/request bank valid amount=100 -> 200 pending inr=40",
           ok, f"status={r.status_code} payout={payout}")

    # 7g. amount > available credits -> 400 not enough credits
    # current credits after above = 100 (200-100)
    me = jget("/auth/me", token=girl_tok).json()["user"]
    amt = me["credits"] + 500  # far greater
    if amt < 100:
        amt = 500
    r = jpost("/payout/request", token=girl_tok,
              body={"amount": amt, "method": "upi", "upi_id": "alice@paytm"})
    ok = r.status_code == 400 and "Not enough" in r.text
    record("POST /payout/request amount > credits -> 400 Not enough credits",
           ok, f"status={r.status_code} body={r.text[:200]} tried_amount={amt} had={me['credits']}")

    # --------- 8) /payout/history ----------
    r = jget("/payout/history", token=girl_tok)
    ok = r.status_code == 200
    body = r.json() if ok else {}
    payouts = body.get("payouts", [])
    ok = ok and len(payouts) >= 2
    # Check ordering desc by created_at
    if len(payouts) >= 2:
        ts = [p.get("created_at", "") for p in payouts]
        ordered = all(ts[i] >= ts[i+1] for i in range(len(ts)-1))
        ok = ok and ordered
    # Check details presence and statuses
    methods = {p.get("method") for p in payouts}
    statuses = {p.get("status") for p in payouts}
    ok = ok and "upi" in methods and "bank" in methods and statuses == {"pending"}
    record("GET /payout/history girl lists pending payouts desc with details",
           ok, f"status={r.status_code} count={len(payouts)} methods={methods} statuses={statuses}")

    # summary
    total = len(results)
    passed = sum(1 for _, ok, _ in results if ok)
    print("\n====== SUMMARY ======")
    print(f"{passed}/{total} passed")
    for name, ok, note in results:
        st = "PASS" if ok else "FAIL"
        print(f"[{st}] {name}")
    print(f"\nTest users (created): boy={boy_email}, girl={girl_email}")

    # exit code
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
