from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import uuid
import time
import hmac
import hashlib
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone

import bcrypt
import jwt
import razorpay
import httpx
from agora_token_builder import RtcTokenBuilder


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
AGORA_APP_ID = os.environ['AGORA_APP_ID']
AGORA_APP_CERTIFICATE = os.environ['AGORA_APP_CERTIFICATE']
RAZORPAY_KEY_ID = os.environ['RAZORPAY_KEY_ID']
RAZORPAY_KEY_SECRET = os.environ['RAZORPAY_KEY_SECRET']
RAZORPAY_PAYMENT_LINK = os.environ.get('RAZORPAY_PAYMENT_LINK', '')

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
razor_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

app = FastAPI(title="Coin Connect API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    gender: Optional[str] = None
    age: Optional[int] = None

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

class MatchJoinIn(BaseModel):
    preference: Optional[str] = "any"  # "boy", "girl", "any"

class SendMessageIn(BaseModel):
    to_user_id: str
    text: str

class ReportIn(BaseModel):
    user_id: str
    reason: str
    context: Optional[str] = ""

class BlockIn(BaseModel):
    user_id: str

# ---------- Data ----------
COIN_PACKS = {
    "pack_100": {"id": "pack_100", "coins": 100, "price_inr": 99, "label": "Starter"},
    "pack_500": {"id": "pack_500", "coins": 550, "price_inr": 449, "label": "Popular", "badge": "Best Value"},
    "pack_1000": {"id": "pack_1000", "coins": 1200, "price_inr": 799, "label": "Pro"},
    "pack_5000": {"id": "pack_5000", "coins": 6500, "price_inr": 3499, "label": "Elite"},
}
CALL_COST_PER_MIN = 10

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

# In-memory matching queue. Structure: {user_id: {gender, preference, ts, state, peer_id, channel}}
# For production scale, swap with Redis.
match_queue: dict = {}
match_lock = asyncio.Lock()

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
        "id": u["id"], "email": u["email"], "name": u["name"],
        "picture": u.get("picture"), "coins": u.get("coins", 0),
        "credits": u.get("credits", 0), "gender": u.get("gender", "boy"),
    }

def conversation_id(a: str, b: str) -> str:
    return "_".join(sorted([a, b]))

# ---------- Auth ----------
@api.get("/")
async def root():
    return {"message": "Coin Connect API", "status": "ok"}

@api.post("/auth/register")
async def register(body: RegisterIn):
    if body.age is None or body.age < 18:
        raise HTTPException(status_code=400, detail="You must be at least 18 years old to use Coin Connect.")
    if body.age > 120:
        raise HTTPException(status_code=400, detail="Please enter a valid age.")
    gender = (body.gender or "").lower().strip()
    if gender not in ("boy", "girl"):
        raise HTTPException(status_code=400, detail="Please select your gender (Boy or Girl).")
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id, "email": body.email.lower(), "name": body.name,
        "password_hash": hash_password(body.password),
        "coins": 50, "credits": 0,
        "gender": gender,
        "age": body.age,
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
        await db.users.update_one({"id": user["id"]}, {"$set": {"name": name, "picture": picture}})
        user["name"] = name; user["picture"] = picture

    return {"token": create_jwt(user["id"]), "user": public_user(user)}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": public_user(user)}

# ---------- Packs ----------
@api.get("/packs")
async def get_packs():
    return {
        "packs": list(COIN_PACKS.values()),
        "call_cost_per_min": CALL_COST_PER_MIN,
        "razorpay_payment_link": RAZORPAY_PAYMENT_LINK,
    }

# ---------- Razorpay ----------
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
        await db.orders.update_one({"order_id": body.razorpay_order_id}, {"$set": {"status": "signature_failed"}})
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
    token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel, uid, 1, expire_ts,
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
        {"$set": {"duration_minutes": minutes, "coins_spent": cost, "ended_at": now_iso(), "status": "ended"}},
    )
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"success": True, "coins_spent": cost, "balance": updated["coins"]}

# ---------- Real-time Random Matching ----------
# Users enter queue; worker-free pairing happens synchronously on each join.
@api.post("/match/join")
async def match_join(body: MatchJoinIn, user: dict = Depends(get_current_user)):
    if user.get("coins", 0) < CALL_COST_PER_MIN:
        raise HTTPException(status_code=402, detail="Insufficient coins to start a call")

    # Get blocks both directions
    blocked_by_me = await db.blocks.find({"user_id": user["id"]}, {"_id": 0, "blocked_id": 1}).to_list(200)
    block_set = {b["blocked_id"] for b in blocked_by_me}
    blocked_me = await db.blocks.find({"blocked_id": user["id"]}, {"_id": 0, "user_id": 1}).to_list(200)
    block_set.update(b["user_id"] for b in blocked_me)

    user_gender = (user.get("gender") or "boy").lower()
    pref = (body.preference or "any").lower()

    async with match_lock:
        # Clean up stale entries (>60s old, non-matched)
        now = time.time()
        stale = [uid for uid, v in match_queue.items()
                 if v.get("state") == "waiting" and now - v.get("ts", now) > 60]
        for uid in stale:
            match_queue.pop(uid, None)

        # If user already has a pending entry, return current state
        cur = match_queue.get(user["id"])
        if cur and cur.get("state") == "matched":
            return {"status": "matched", "channel": cur["channel"], "peer": cur.get("peer")}
        if cur and cur.get("state") == "waiting":
            pass  # will try pairing below

        # Try pair with another waiting user
        pair = None
        for other_id, v in list(match_queue.items()):
            if other_id == user["id"]:
                continue
            if v.get("state") != "waiting":
                continue
            if other_id in block_set:
                continue
            other_gender = (v.get("gender") or "boy").lower()
            other_pref = (v.get("preference") or "any").lower()
            # Preference check both sides
            if pref != "any" and other_gender != pref:
                continue
            if other_pref != "any" and user_gender != other_pref:
                continue
            pair = (other_id, v)
            break

        if pair:
            other_id, other_v = pair
            channel = f"ccm_{uuid.uuid4().hex[:12]}"
            peer_me = await db.users.find_one({"id": other_id}, {"_id": 0, "password_hash": 0})
            peer_them = {"id": user["id"], "name": user["name"], "picture": user.get("picture"),
                         "gender": user_gender}
            peer_me_pub = {"id": peer_me["id"], "name": peer_me["name"],
                           "picture": peer_me.get("picture"), "gender": peer_me.get("gender", "boy")} if peer_me else None

            match_queue[user["id"]] = {
                "state": "matched", "channel": channel, "peer": peer_me_pub,
                "gender": user_gender, "preference": pref, "ts": now,
            }
            match_queue[other_id] = {
                "state": "matched", "channel": channel, "peer": peer_them,
                "gender": other_v.get("gender"), "preference": other_v.get("preference"), "ts": now,
            }
            return {"status": "matched", "channel": channel, "peer": peer_me_pub}

        # No pair → enter queue
        match_queue[user["id"]] = {
            "state": "waiting", "gender": user_gender, "preference": pref, "ts": now,
        }
    return {"status": "waiting"}

@api.get("/match/status")
async def match_status(user: dict = Depends(get_current_user)):
    entry = match_queue.get(user["id"])
    if not entry:
        return {"status": "idle"}
    if entry.get("state") == "matched":
        return {"status": "matched", "channel": entry["channel"], "peer": entry.get("peer")}
    return {"status": "waiting"}

@api.post("/match/cancel")
async def match_cancel(user: dict = Depends(get_current_user)):
    async with match_lock:
        match_queue.pop(user["id"], None)
    return {"status": "cancelled"}

@api.post("/match/clear")
async def match_clear(user: dict = Depends(get_current_user)):
    """Clear my matched entry after call ends."""
    async with match_lock:
        entry = match_queue.get(user["id"])
        if entry and entry.get("state") == "matched":
            match_queue.pop(user["id"], None)
    return {"status": "cleared"}

@api.get("/match/online-count")
async def match_online_count():
    # Users active in the last 10 minutes + waiting queue
    ten_min_ago = datetime.now(timezone.utc).timestamp() - 600
    waiting = sum(1 for v in match_queue.values() if v.get("state") == "waiting")
    return {"waiting": waiting, "online_estimate": max(waiting * 2, 3)}

# ---------- Explore ----------
@api.get("/explore")
async def explore(user: dict = Depends(get_current_user)):
    # Pull real recent users (other than self) + fallback to mock
    blocked = await db.blocks.find({"user_id": user["id"]}, {"_id": 0, "blocked_id": 1}).to_list(500)
    block_set = {b["blocked_id"] for b in blocked}

    cursor = db.users.find(
        {"id": {"$ne": user["id"], "$nin": list(block_set)}},
        {"_id": 0, "password_hash": 0},
    ).sort("created_at", -1).limit(20)
    real_users = await cursor.to_list(length=20)
    real = [{
        "id": u["id"], "name": u["name"],
        "country": u.get("country", "—"), "flag": "🌐",
        "online": True,  # treated online for demo
        "photo": u.get("picture") or f"https://ui-avatars.com/api/?name={u['name']}&background=FF2D7B&color=fff&size=400",
        "real": True,
    } for u in real_users]

    combined = real + EXPLORE_PROFILES
    online = sum(1 for p in combined if p.get("online"))
    return {"profiles": combined[:20], "online_count": online}

# ---------- Chat ----------
@api.get("/chat/conversations")
async def chat_conversations(user: dict = Depends(get_current_user)):
    # Get latest message per conversation where user is participant
    pipeline = [
        {"$match": {"participants": user["id"]}},
        {"$sort": {"created_at": -1}},
        {"$group": {
            "_id": "$conversation_id",
            "last_text": {"$first": "$text"},
            "last_sender": {"$first": "$from_user_id"},
            "last_at": {"$first": "$created_at"},
            "participants": {"$first": "$participants"},
        }},
        {"$sort": {"last_at": -1}},
        {"$limit": 50},
    ]
    msgs = await db.messages.aggregate(pipeline).to_list(length=50)
    result = []
    for m in msgs:
        peer_id = next((p for p in m["participants"] if p != user["id"]), None)
        if not peer_id:
            continue
        peer = await db.users.find_one({"id": peer_id}, {"_id": 0, "id": 1, "name": 1, "picture": 1})
        if not peer:
            continue
        result.append({
            "conversation_id": m["_id"],
            "peer": {
                "id": peer["id"], "name": peer["name"],
                "picture": peer.get("picture") or f"https://ui-avatars.com/api/?name={peer['name']}&background=FF2D7B&color=fff&size=200",
            },
            "last_text": m["last_text"],
            "last_at": m["last_at"],
            "is_mine": m["last_sender"] == user["id"],
        })
    return {"conversations": result}

@api.get("/chat/messages/{peer_id}")
async def chat_messages(peer_id: str, user: dict = Depends(get_current_user)):
    conv_id = conversation_id(user["id"], peer_id)
    cursor = db.messages.find({"conversation_id": conv_id}, {"_id": 0}).sort("created_at", 1).limit(200)
    items = await cursor.to_list(length=200)
    peer = await db.users.find_one({"id": peer_id}, {"_id": 0, "id": 1, "name": 1, "picture": 1, "gender": 1})
    if not peer:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "messages": items,
        "peer": {
            "id": peer["id"], "name": peer["name"],
            "picture": peer.get("picture") or f"https://ui-avatars.com/api/?name={peer['name']}&background=FF2D7B&color=fff&size=200",
        },
    }

@api.post("/chat/send")
async def chat_send(body: SendMessageIn, user: dict = Depends(get_current_user)):
    text = (body.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Message too long")
    if body.to_user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    # Check blocks
    blocked = await db.blocks.find_one({
        "$or": [
            {"user_id": user["id"], "blocked_id": body.to_user_id},
            {"user_id": body.to_user_id, "blocked_id": user["id"]},
        ]
    })
    if blocked:
        raise HTTPException(status_code=403, detail="Cannot message this user")
    peer = await db.users.find_one({"id": body.to_user_id}, {"_id": 0})
    if not peer:
        raise HTTPException(status_code=404, detail="User not found")
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": conversation_id(user["id"], body.to_user_id),
        "participants": sorted([user["id"], body.to_user_id]),
        "from_user_id": user["id"],
        "to_user_id": body.to_user_id,
        "text": text,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return {"message": msg}

# ---------- Report / Block ----------
@api.post("/report")
async def report_user(body: ReportIn, user: dict = Depends(get_current_user)):
    if body.user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    await db.reports.insert_one({
        "id": str(uuid.uuid4()),
        "reporter_id": user["id"],
        "reported_id": body.user_id,
        "reason": (body.reason or "").strip()[:200] or "unspecified",
        "context": (body.context or "").strip()[:500],
        "created_at": now_iso(),
        "status": "open",
    })
    return {"success": True}

@api.post("/block")
async def block_user(body: BlockIn, user: dict = Depends(get_current_user)):
    if body.user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    existing = await db.blocks.find_one({"user_id": user["id"], "blocked_id": body.user_id})
    if existing:
        return {"success": True, "already_blocked": True}
    await db.blocks.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "blocked_id": body.user_id,
        "created_at": now_iso(),
    })
    return {"success": True}

@api.post("/unblock")
async def unblock_user(body: BlockIn, user: dict = Depends(get_current_user)):
    await db.blocks.delete_one({"user_id": user["id"], "blocked_id": body.user_id})
    return {"success": True}

@api.get("/blocked")
async def blocked_users(user: dict = Depends(get_current_user)):
    blocks = await db.blocks.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    result = []
    for b in blocks:
        u = await db.users.find_one({"id": b["blocked_id"]}, {"_id": 0, "id": 1, "name": 1, "picture": 1})
        if u:
            result.append({
                "id": u["id"], "name": u["name"],
                "picture": u.get("picture") or f"https://ui-avatars.com/api/?name={u['name']}&background=FF2D7B&color=fff&size=200",
                "blocked_at": b["created_at"],
            })
    return {"blocked": result}

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
