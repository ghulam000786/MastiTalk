# Coin Connect – Product Requirements Document

## Overview
Coin Connect is a mobile video-calling app (Expo React Native) where users purchase coin packs via Razorpay and spend coins to make 1-to-1 video calls powered by Agora.

## Tech Stack
- Frontend: Expo Router (SDK 54), React Native, react-native-webview
- Backend: FastAPI + Motor (MongoDB)
- Integrations: Agora RTC (via Web SDK in WebView), Razorpay Checkout (in WebView)
- Auth: JWT (email + password, bcrypt hashed)

## Core Features
1. Sign up / Sign in (JWT). New users get 50 free coins.
2. Home dashboard – coin balance, quick actions, start call by channel name.
3. Coin Store – buy coin packs (100/550/1200/6500 coins).
4. Checkout – Razorpay secure checkout inside WebView with signature verification.
5. Video Call – Agora Web SDK in WebView; mute/camera/end-call controls; minute-based billing (10 coins / minute).
6. Activity History – credits (purchases) and debits (call spends) with timestamps.
7. Profile – user info, balance, sign out.

## Backend Endpoints
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/packs`
- `GET /api/payments/config`
- `POST /api/payments/create-order`, `POST /api/payments/verify`
- `POST /api/agora/token`, `POST /api/agora/end-call`
- `GET /api/transactions`, `GET /api/calls`

## Revenue enhancement (built-in)
- Welcome bonus (50 coins) drives sign-ups.
- "Best Value" highlighted pack nudges higher-ticket purchases.
- Bonus coins on larger packs (550 for ₹449, 1200 for ₹799, 6500 for ₹3499) increases average order value.

## Credentials (test)
- Agora App ID: `c029ff21a31143f8832576612dfb6f9b` (configured)
- Razorpay test key: `rzp_test_ShfLVkUYr0sCwT` (configured)
