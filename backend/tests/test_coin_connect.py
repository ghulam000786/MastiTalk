import os
import time
import uuid
import hmac
import hashlib
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://coin-connect-3.preview.emergentagent.com").rstrip("/")
RAZORPAY_KEY_SECRET = "oTJfaijW5M3nP3GCXPx5rU5O"

UNIQUE = uuid.uuid4().hex[:8]
TEST_EMAIL = f"TEST_{UNIQUE}@example.com"
TEST_PASSWORD = "pass1234"
TEST_NAME = "TEST User"

state = {}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def auth_headers():
    return {"Authorization": f"Bearer {state['token']}", "Content-Type": "application/json"}


# ---------- Health ----------
def test_root(client):
    r = client.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ---------- Auth ----------
def test_register(client):
    r = client.post(f"{BASE_URL}/api/auth/register",
                    json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["coins"] == 50
    assert data["user"]["email"] == TEST_EMAIL.lower()
    state["token"] = data["token"]
    state["user_id"] = data["user"]["id"]


def test_register_duplicate(client):
    r = client.post(f"{BASE_URL}/api/auth/register",
                    json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": TEST_NAME})
    assert r.status_code == 400


def test_login(client):
    r = client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data
    assert data["user"]["coins"] == 50


def test_login_invalid(client):
    r = client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": TEST_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_me(client):
    r = client.get(f"{BASE_URL}/api/auth/me", headers=auth_headers())
    assert r.status_code == 200
    user = r.json()["user"]
    assert user["email"] == TEST_EMAIL.lower()
    assert "_id" not in user
    assert "password_hash" not in user


def test_me_unauthorized(client):
    r = client.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 401


# ---------- Packs ----------
def test_packs(client):
    r = client.get(f"{BASE_URL}/api/packs")
    assert r.status_code == 200
    data = r.json()
    assert data["call_cost_per_min"] == 10
    assert len(data["packs"]) == 4
    ids = {p["id"] for p in data["packs"]}
    assert ids == {"pack_100", "pack_500", "pack_1000", "pack_5000"}


# ---------- Payments ----------
def test_create_order(client):
    r = client.post(f"{BASE_URL}/api/payments/create-order",
                    json={"pack_id": "pack_100"}, headers=auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["order_id"].startswith("order_")
    assert data["amount"] == 9900
    assert data["currency"] == "INR"
    assert data["pack"]["id"] == "pack_100"
    state["order_id"] = data["order_id"]


def test_create_order_invalid_pack(client):
    r = client.post(f"{BASE_URL}/api/payments/create-order",
                    json={"pack_id": "invalid"}, headers=auth_headers())
    assert r.status_code == 400


def test_create_order_unauthorized(client):
    r = client.post(f"{BASE_URL}/api/payments/create-order",
                    json={"pack_id": "pack_100"})
    assert r.status_code == 401


def test_verify_invalid_signature(client):
    r = client.post(f"{BASE_URL}/api/payments/verify",
                    json={
                        "razorpay_order_id": state["order_id"],
                        "razorpay_payment_id": "pay_FAKE12345",
                        "razorpay_signature": "invalid_signature_value",
                    }, headers=auth_headers())
    assert r.status_code == 400


def test_verify_valid_signature_credits_coins(client):
    # Simulate Razorpay callback with a correctly-computed signature
    fake_payment_id = f"pay_TEST_{uuid.uuid4().hex[:12]}"
    msg = f"{state['order_id']}|{fake_payment_id}".encode()
    sig = hmac.new(RAZORPAY_KEY_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    r = client.post(f"{BASE_URL}/api/payments/verify",
                    json={
                        "razorpay_order_id": state["order_id"],
                        "razorpay_payment_id": fake_payment_id,
                        "razorpay_signature": sig,
                    }, headers=auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert data["coins_added"] == 100
    assert data["balance"] == 150  # 50 welcome + 100


# ---------- Agora ----------
def test_agora_token(client):
    channel = f"test_ch_{UNIQUE}"
    r = client.post(f"{BASE_URL}/api/agora/token",
                    json={"channel_name": channel, "uid": 0}, headers=auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["token"]
    assert data["app_id"] == "c029ff21a31143f8832576612dfb6f9b"
    assert data["channel"] == channel
    assert "call_id" in data
    state["call_id"] = data["call_id"]
    state["channel"] = channel


def test_end_call_deducts_coins(client):
    r = client.post(f"{BASE_URL}/api/agora/end-call",
                    json={"call_id": state["call_id"], "minutes": 1},
                    headers=auth_headers())
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["success"] is True
    assert data["coins_spent"] == 10
    assert data["balance"] == 140  # 150 - 10


def test_agora_token_insufficient_coins(client):
    # Create a fresh user, drain coins then test 402
    email2 = f"TEST_low_{uuid.uuid4().hex[:8]}@example.com"
    r = client.post(f"{BASE_URL}/api/auth/register",
                    json={"email": email2, "password": "pass1234", "name": "LowCoin"})
    assert r.status_code == 200
    token2 = r.json()["token"]
    h = {"Authorization": f"Bearer {token2}", "Content-Type": "application/json"}

    # Start call (50 coins -> ok)
    ch = f"drain_{uuid.uuid4().hex[:6]}"
    rt = client.post(f"{BASE_URL}/api/agora/token",
                     json={"channel_name": ch}, headers=h)
    assert rt.status_code == 200
    cid = rt.json()["call_id"]
    # End with 5 minutes -> 50 coins (capped to balance 50)
    re_ = client.post(f"{BASE_URL}/api/agora/end-call",
                      json={"call_id": cid, "minutes": 5}, headers=h)
    assert re_.status_code == 200
    assert re_.json()["balance"] == 0

    # Now token request should be 402
    r2 = client.post(f"{BASE_URL}/api/agora/token",
                     json={"channel_name": "x"}, headers=h)
    assert r2.status_code == 402


def test_agora_token_unauthorized(client):
    r = client.post(f"{BASE_URL}/api/agora/token", json={"channel_name": "x"})
    assert r.status_code == 401


# ---------- History ----------
def test_transactions(client):
    r = client.get(f"{BASE_URL}/api/transactions", headers=auth_headers())
    assert r.status_code == 200
    txs = r.json()["transactions"]
    assert isinstance(txs, list)
    # We should have at least one credit (razorpay) and one debit (call)
    types = {t["type"] for t in txs}
    assert "credit" in types
    assert "debit" in types
    for t in txs:
        assert "_id" not in t


def test_calls(client):
    r = client.get(f"{BASE_URL}/api/calls", headers=auth_headers())
    assert r.status_code == 200
    calls = r.json()["calls"]
    assert isinstance(calls, list)
    assert len(calls) >= 1
    for c in calls:
        assert "_id" not in c


# ---------- Smoke credentials ----------
def test_smoke_credentials_login(client):
    r = client.post(f"{BASE_URL}/api/auth/login",
                    json={"email": "smoke@test.com", "password": "pass1234"})
    assert r.status_code == 200
