from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import time
import hmac
import hashlib
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt
import razorpay
from agora_token_builder import RtcTokenBuilder


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Config
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
AGORA_APP_ID = os.environ['AGORA_APP_ID']
AGORA_APP_CERTIFICATE = os.environ['AGORA_APP_CERTIFICATE']
RAZORPAY_KEY_ID = os.environ['RAZORPAY_KEY_ID']
RAZORPAY_KEY_SECRET = os.environ['RAZORPAY_KEY_SECRET']

# Connections
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
razor_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# FastAPI app
app = FastAPI(title="Coin Connect API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class TokenRequest(BaseModel):
    channel_name: str
    uid: int = 0  # 0 = let agora assign

class CreateOrderIn(BaseModel):
    pack_id: str  # one of pack ids

class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class SpendCoinsIn(BaseModel):
    minutes: int
    channel_name: str

# ---------- Coin Packs ----------
COIN_PACKS = {
    "pack_100": {"id": "pack_100", "coins": 100, "price_inr": 99, "label": "Starter"},
    "pack_500": {"id": "pack_500", "coins": 550, "price_inr": 449, "label": "Popular", "badge": "Best Value"},
    "pack_1000": {"id": "pack_1000", "coins": 1200, "price_inr": 799, "label": "Pro"},
    "pack_5000": {"id": "pack_5000", "coins": 6500, "price_inr": 3499, "label": "Elite"},
}

CALL_COST_PER_MIN = 10  # 10 coins per minute

# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + 60 * 60 * 24 * 30,  # 30 days
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------- Auth Routes ----------
@api.get("/")
async def root():
    return {"message": "Coin Connect API", "status": "ok"}

@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name,
        "password_hash": hash_password(body.password),
        "coins": 50,  # welcome bonus 50 coins
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_jwt(user_id)
    return {
        "token": token,
        "user": {"id": user_id, "email": body.email.lower(), "name": body.name, "coins": 50},
    }

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_jwt(user["id"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "coins": user.get("coins", 0),
        },
    }

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}

# ---------- Coin Packs ----------
@api.get("/packs")
async def get_packs():
    return {"packs": list(COIN_PACKS.values()), "call_cost_per_min": CALL_COST_PER_MIN}

# ---------- Razorpay ----------
@api.get("/payments/config")
async def payments_config():
    return {"razorpay_key_id": RAZORPAY_KEY_ID}

@api.post("/payments/create-order")
async def create_order(body: CreateOrderIn, user: dict = Depends(get_current_user)):
    pack = COIN_PACKS.get(body.pack_id)
    if not pack:
        raise HTTPException(status_code=400, detail="Invalid pack")
    amount_paise = pack["price_inr"] * 100
    receipt = f"rcpt_{user['id'][:8]}_{int(time.time())}"[:40]
    try:
        order = razor_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {"pack_id": pack["id"], "user_id": user["id"]},
        })
    except Exception as e:
        logger.exception("Razorpay order create failed")
        raise HTTPException(status_code=500, detail=f"Payment order failed: {e}")

    await db.orders.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order["id"],
        "user_id": user["id"],
        "pack_id": pack["id"],
        "coins": pack["coins"],
        "amount": amount_paise,
        "currency": "INR",
        "status": "created",
        "created_at": now_iso(),
    })
    return {
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID,
        "pack": pack,
        "user": {"name": user["name"], "email": user["email"]},
    }

@api.post("/payments/verify")
async def verify_payment(body: VerifyPaymentIn, user: dict = Depends(get_current_user)):
    # Verify signature
    generated_sig = hmac.new(
        RAZORPAY_KEY_SECRET.encode(),
        f"{body.razorpay_order_id}|{body.razorpay_payment_id}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if not hmac.compare_digest(generated_sig, body.razorpay_signature):
        await db.orders.update_one(
            {"order_id": body.razorpay_order_id},
            {"$set": {"status": "signature_failed"}},
        )
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    order = await db.orders.find_one({"order_id": body.razorpay_order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Order does not belong to user")
    if order["status"] == "paid":
        # Idempotent
        current = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
        return {"success": True, "coins_added": 0, "balance": current.get("coins", 0)}

    coins_to_add = order["coins"]
    await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": coins_to_add}})
    await db.orders.update_one(
        {"order_id": body.razorpay_order_id},
        {"$set": {
            "status": "paid",
            "payment_id": body.razorpay_payment_id,
            "paid_at": now_iso(),
        }},
    )
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "type": "credit",
        "coins": coins_to_add,
        "source": "razorpay",
        "pack_id": order["pack_id"],
        "order_id": body.razorpay_order_id,
        "payment_id": body.razorpay_payment_id,
        "amount_inr": order["amount"] // 100,
        "created_at": now_iso(),
    })
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"success": True, "coins_added": coins_to_add, "balance": updated["coins"]}

# ---------- Agora ----------
@api.post("/agora/token")
async def agora_token(body: TokenRequest, user: dict = Depends(get_current_user)):
    if user.get("coins", 0) < CALL_COST_PER_MIN:
        raise HTTPException(status_code=402, detail="Insufficient coins to start a call")

    channel = body.channel_name.strip()
    if not channel:
        raise HTTPException(status_code=400, detail="Channel name required")

    uid = body.uid if body.uid else 0
    expire_ts = int(time.time()) + 3600  # 1 hour
    role = 1  # Publisher

    token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID,
        AGORA_APP_CERTIFICATE,
        channel,
        uid,
        role,
        expire_ts,
    )
    # Log call start
    call_id = str(uuid.uuid4())
    await db.calls.insert_one({
        "id": call_id,
        "user_id": user["id"],
        "channel_name": channel,
        "uid": uid,
        "started_at": now_iso(),
        "duration_minutes": 0,
        "status": "started",
    })
    return {
        "token": token,
        "app_id": AGORA_APP_ID,
        "channel": channel,
        "uid": uid,
        "expires_at": expire_ts,
        "call_id": call_id,
    }

@api.post("/agora/end-call")
async def end_call(data: dict, user: dict = Depends(get_current_user)):
    call_id = data.get("call_id")
    minutes = max(0, int(data.get("minutes", 0)))
    if not call_id:
        raise HTTPException(status_code=400, detail="call_id required")
    call = await db.calls.find_one({"id": call_id, "user_id": user["id"]}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    if call.get("status") == "ended":
        current = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
        return {"success": True, "coins_spent": 0, "balance": current.get("coins", 0)}

    cost = minutes * CALL_COST_PER_MIN
    # Cap cost to current balance
    current = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    cost = min(cost, current.get("coins", 0))
    if cost > 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": -cost}})
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "type": "debit",
            "coins": cost,
            "source": "call",
            "call_id": call_id,
            "channel_name": call["channel_name"],
            "minutes": minutes,
            "created_at": now_iso(),
        })
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {
            "duration_minutes": minutes,
            "coins_spent": cost,
            "ended_at": now_iso(),
            "status": "ended",
        }},
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"success": True, "coins_spent": cost, "balance": updated["coins"]}

# ---------- History ----------
@api.get("/transactions")
async def list_transactions(user: dict = Depends(get_current_user)):
    cursor = db.transactions.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).limit(100)
    items = await cursor.to_list(length=100)
    return {"transactions": items}

@api.get("/calls")
async def list_calls(user: dict = Depends(get_current_user)):
    cursor = db.calls.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).limit(50)
    items = await cursor.to_list(length=50)
    return {"calls": items}

# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
