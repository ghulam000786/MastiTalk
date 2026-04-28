from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
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
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timezone

import bcrypt
import jwt
import razorpay
import httpx
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

class GoogleSessionIn(BaseModel):
    session_id: str

class TokenRequest(BaseModel):
    channel_name: str
    uid: int = 0

class CreateOrderIn(BaseModel):
    pack_id: str

class VerifyPaymentIn(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

# ---------- Coin Packs ----------
COIN_PACKS = {
    "pack_100": {"id": "pack_100", "coins": 100, "price_inr": 99, "label": "Starter"},
    "pack_500": {"id": "pack_500", "coins": 550, "price_inr": 449, "label": "Popular", "badge": "Best Value"},
    "pack_1000": {"id": "pack_1000", "coins": 1200, "price_inr": 799, "label": "Pro"},
    "pack_5000": {"id": "pack_5000", "coins": 6500, "price_inr": 3499, "label": "Elite"},
}
CALL_COST_PER_MIN = 10

# ---------- Explore profiles (mock) ----------
EXPLORE_PROFILES = [
    {"id": "p_priya", "name": "Priya", "country": "India", "flag": "🇮🇳", "online": False,
     "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80"},
    {"id": "p_riya", "name": "Riya", "country": "India", "flag": "🇮🇳", "online": True,
     "photo": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80"},
    {"id": "p_ananya", "name": "Ananya", "country": "India", "flag": "🇮🇳", "online": True,
     "photo": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80"},
    {"id": "p_sara", "name": "Sara", "country": "Brazil", "flag": "🇧🇷", "online": False,
     "photo": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80"},
    {"id": "p_mei", "name": "Mei", "country": "Japan", "flag": "🇯🇵", "online": True,
     "photo": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80"},
    {"id": "p_zoe", "name": "Zoe", "country": "USA", "flag": "🇺🇸", "online": False,
     "photo": "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80"},
]

# ---------- Helpers ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_jwt(user_id: str) -> str:
    payload = {"sub": user_id, "iat": int(time.time()), "exp": int(time.time()) + 60 * 60 * 24 * 30}
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

def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u["name"],
        "picture": u.get("picture"),
        "coins": u.get("coins", 0),
        "credits": u.get("credits", 0),
        "gender": u.get("gender", "boy"),
    }

# ---------- Routes ----------
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
        "id": user_id, "email": body.email.lower(), "name": body.name,
        "password_hash": hash_password(body.password),
        "coins": 50, "credits": 0, "gender": "boy",
        "provider": "password", "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    return {"token": create_jwt(user_id), "user": public_user(user_doc)}

@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_jwt(user["id"]), "user": public_user(user)}

@api.post("/auth/google-session")
async def google_session(body: GoogleSessionIn):
    """Exchange an Emergent Auth session_id for our app JWT."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as h:
            r = await h.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
            )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Emergent session")
        data = r.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Emergent session lookup failed")
        raise HTTPException(status_code=502, detail=f"Auth provider error: {e}")

    email = (data.get("email") or "").lower().strip()
    name = data.get("name") or (email.split("@")[0] if email else "User")
    picture = data.get("picture")
    if not email:
        raise HTTPException(status_code=400, detail="No email returned from provider")

    user = await db.users.find_one({"email": email})
    if not user:
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id, "email": email, "name": name, "picture": picture,
            "password_hash": "", "coins": 50, "credits": 0, "gender": "boy",
            "provider": "google", "created_at": now_iso(),
        }
        await db.users.insert_one(user_doc)
        user = user_doc
    else:
        await db.users.update_one(
            {"id": user["id"]}, {"$set": {"name": name, "picture": picture}}
        )
        user["name"] = name; user["picture"] = picture

    return {"token": create_jwt(user["id"]), "user": public_user(user)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}

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
            "amount": amount_paise, "currency": "INR", "receipt": receipt,
            "payment_capture": 1,
            "notes": {"pack_id": pack["id"], "user_id": user["id"]},
        })
    except Exception as e:
        logger.exception("Razorpay order create failed")
        raise HTTPException(status_code=500, detail=f"Payment order failed: {e}")
    await db.orders.insert_one({
        "id": str(uuid.uuid4()), "order_id": order["id"], "user_id": user["id"],
        "pack_id": pack["id"], "coins": pack["coins"], "amount": amount_paise,
        "currency": "INR", "status": "created", "created_at": now_iso(),
    })
    return {
        "order_id": order["id"], "amount": amount_paise, "currency": "INR",
        "razorpay_key_id": RAZORPAY_KEY_ID, "pack": pack,
        "user": {"name": user["name"], "email": user["email"]},
    }

@api.post("/payments/verify")
async def verify_payment(body: VerifyPaymentIn, user: dict = Depends(get_current_user)):
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
        current = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
        return {"success": True, "coins_added": 0, "balance": current.get("coins", 0)}
    coins_to_add = order["coins"]
    await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": coins_to_add}})
    await db.orders.update_one(
        {"order_id": body.razorpay_order_id},
        {"$set": {"status": "paid", "payment_id": body.razorpay_payment_id, "paid_at": now_iso()}},
    )
    await db.transactions.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "type": "credit",
        "coins": coins_to_add, "source": "razorpay", "pack_id": order["pack_id"],
        "order_id": body.razorpay_order_id, "payment_id": body.razorpay_payment_id,
        "amount_inr": order["amount"] // 100, "created_at": now_iso(),
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
    expire_ts = int(time.time()) + 3600
    role = 1
    token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel, uid, role, expire_ts,
    )
    call_id = str(uuid.uuid4())
    await db.calls.insert_one({
        "id": call_id, "user_id": user["id"], "channel_name": channel,
        "uid": uid, "started_at": now_iso(), "duration_minutes": 0, "status": "started",
    })
    return {
        "token": token, "app_id": AGORA_APP_ID, "channel": channel, "uid": uid,
        "expires_at": expire_ts, "call_id": call_id,
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
    current = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    cost = min(cost, current.get("coins", 0))
    if cost > 0:
        await db.users.update_one({"id": user["id"]}, {"$inc": {"coins": -cost}})
        await db.transactions.insert_one({
            "id": str(uuid.uuid4()), "user_id": user["id"], "type": "debit",
            "coins": cost, "source": "call", "call_id": call_id,
            "channel_name": call["channel_name"], "minutes": minutes,
            "created_at": now_iso(),
        })
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"duration_minutes": minutes, "coins_spent": cost,
                  "ended_at": now_iso(), "status": "ended"}},
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"success": True, "coins_spent": cost, "balance": updated["coins"]}

# ---------- Explore / Discover ----------
@api.get("/explore")
async def explore():
    online = sum(1 for p in EXPLORE_PROFILES if p["online"])
    return {"profiles": EXPLORE_PROFILES, "online_count": online}

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
