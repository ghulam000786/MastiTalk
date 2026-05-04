# Coin Connect — PRD (Production-Ready)

## Concept
Random video-call mobile app on Expo + FastAPI. Users buy coins via Razorpay, get matched 1-to-1 with another user, video call via Agora (10 coins/min), chat after the call, and report/block bad actors.

## Tech
- Frontend: Expo Router SDK 54 (file-based routing)
- Backend: FastAPI + Motor (MongoDB)
- Realtime: HTTP polling (match every 2s, chat every 4s) — easily upgradable to WebSocket
- Payments: Razorpay JS (web) / WebView (native) + standalone Razorpay payment link
- Video/Voice: Agora Web SDK (iframe on web, WebView on native)
- Auth: JWT email+password (with gender) + Emergent-managed Google OAuth

## Screens
| Path | Purpose |
|---|---|
| `/(auth)/login` | Continue with Google · Sign up · Sign in (with gender boy/girl) |
| `/(tabs)/match` | Random matching with preference chips (Anyone/Boys/Girls), pulsing rings, live online count |
| `/(tabs)/explore` | Real users + curated profiles grid (excludes blocked users) |
| `/(tabs)/chat` | Real conversations list (polled) |
| `/chat/[peer]` | 1-to-1 messaging, video-call shortcut, report/block menu |
| `/(tabs)/profile` | Avatar, stats (coins/credits/history), Get VIP, Language, Camera beauty, Privacy/Terms/Blocked Users, Sign out |
| `/store` | 4 coin packs (Razorpay JS/WebView checkout) + Quick Pay via rzp.io link |
| `/checkout` | Razorpay flow with signature verify |
| `/call/[channel]` | Agora call w/ peer name in header, Report button (red) top-right, mute, camera-flip, end-call |
| `/report` | 8 confidential report reasons + textarea |
| `/privacy` | Privacy Policy (8 sections) |
| `/terms` | Terms of Service (9 sections) |
| `/blocked` | Manage blocked users with Unblock action |
| `/history` | Activity ledger (credits + debits) |

## Backend endpoints (45+)
- Auth: register, login, google-session, me
- Packs: get-packs (returns razorpay_payment_link)
- Payments: create-order, verify
- Agora: token, end-call
- Match: join, status, cancel, clear, online-count (in-memory queue with gender preference + block-aware)
- Explore: list profiles (auth-gated, blocked-aware)
- Chat: send, messages/{peer}, conversations
- Moderation: report, block, unblock, blocked
- History: transactions, calls

## Production-ready features
- Real 1-to-1 matching with gender preference, both sides honored
- Real-time chat (4s polling) with messages stored in MongoDB
- Confidential report flow (8 reasons + free-text)
- Block/Unblock — affects matching, chat, explore
- Privacy Policy + Terms of Service screens (Play Store + App Store compliant copy)
- Razorpay JS-based checkout (web) + WebView (native) + Quick Pay link fallback
- Agora calls: iframe on web, WebView on native, microphone & camera permissions declared in app.json

## Test Coverage
- Backend: 38/38 pytest passing (regression + production features)
- Frontend: 11/13 Playwright flows verified

## Remaining caveats (small / informational)
- Razorpay Quick Pay link cannot auto-credit coins without webhook setup; user must share Payment ID with support.
- Razorpay TEST keys configured. Switch to LIVE keys before public release.
- Match queue is in-memory; restart of backend resets the waiting queue (matched users continue normally).
- Web preview uses iframe-based Agora; production native will use react-native-webview.

## To Publish
1. (Optional) Razorpay → switch to LIVE Key ID / Secret in `/app/backend/.env`.
2. Tap **Publish** in Emergent (top-right) → builds APK/IPA → submit to Play Store / App Store.
