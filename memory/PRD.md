# Coin Connect — PRD

## Concept
A premium random-video-call mobile app where users buy coin packs via Razorpay and spend coins (10/min) on Agora video calls.

## Tech
- Frontend: Expo Router SDK 54 (React Native), file-based routes
- Backend: FastAPI + Motor (MongoDB)
- Integrations: **Agora RTC** (Web SDK in WebView), **Razorpay Checkout** (web SDK + WebView fallback), **Emergent Google Auth**
- Auth: JWT (email+password) + Google OAuth (Emergent-managed) — both yield app JWTs.

## Screens (file-based)
- `/(auth)/login` — Pink flame logo, "Continue with Google", "More options" link to demo email login.
- `/(tabs)/match` — Dark purple bg, animated radar rings, central avatar, "Tap Start to find a match", pink Start button → Agora call.
- `/(tabs)/explore` — White, "Explore" title, 6 profile cards with names/countries, pink call buttons.
- `/(tabs)/chat` — White, "Messages", mock recent chats.
- `/(tabs)/profile` — Pink hero card, Coins/Credits/History stats, Get VIP CTA, language, camera-beauty toggle, Privacy/Terms/Community, Sign out.
- `/store` — Buy coin packs (4 packs, 99–3499 INR).
- `/checkout` — Razorpay JS SDK (web) / WebView (native).
- `/history` — Activity ledger.
- `/call/[channel]` — Agora video call screen (mute, camera, end-call), minute-billing.

## Backend endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `POST /api/auth/google-session` — exchanges Emergent session_id for app JWT
- `GET /api/packs`, `GET /api/payments/config`
- `POST /api/payments/create-order`, `POST /api/payments/verify`
- `POST /api/agora/token`, `POST /api/agora/end-call`
- `GET /api/explore` — 6 mock profiles + online_count
- `GET /api/transactions`, `GET /api/calls`

## Revenue / Growth hooks built-in
- Welcome bonus 50 coins drives sign-ups.
- "Best Value" highlighted pack pushes higher-ticket purchase.
- Bonus coins on bigger packs (1200 for ₹799, 6500 for ₹3499) raises AOV.
- "Get VIP" CTA on profile signals upsell path.

## Publish readiness
- `app.json` has app name "Coin Connect", scheme `coinconnect`, dark UI, iOS camera/mic usage descriptions, Android `CAMERA`/`RECORD_AUDIO`/`INTERNET` permissions.
- All credentials in `/app/backend/.env` only — no hardcoding.
- Use the **Publish** button (top-right of Emergent) to build APK/IPA & submit to stores.

## Known caveats (informational, not blocking)
- The native Razorpay flow uses an in-app WebView. The Web preview uses Razorpay JS directly (because react-native-webview has no web platform).
- Agora calls require camera/mic browser permission on web preview; on native devices, app permissions kick in.
