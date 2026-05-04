"""Tests for newly added endpoints: /api/explore, /api/auth/google-session"""
import os
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://coin-connect-3.preview.emergentagent.com").rstrip("/")


# ---------- Explore (now auth-gated for block filtering) ----------
def test_explore_returns_profiles_and_online_count():
    # Register a user to call auth-gated /explore
    import uuid as _u
    email = f"TEST_explore_{_u.uuid4().hex[:8]}@example.com"
    reg = requests.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": "pass1234", "name": "ExplUser"})
    assert reg.status_code == 200
    tok = reg.json()["token"]
    r = requests.get(f"{BASE_URL}/api/explore",
                     headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "profiles" in data and "online_count" in data
    # At least the 6 mock profiles should come through; real users may add more
    assert len(data["profiles"]) >= 6
    for p in data["profiles"]:
        for key in ("id", "name", "country", "flag", "online", "photo"):
            assert key in p, f"Missing key {key}"
    assert "_id" not in data

def test_explore_unauthorized():
    r = requests.get(f"{BASE_URL}/api/explore")
    assert r.status_code == 401


# ---------- Google Session ----------
def test_google_session_invalid_returns_401():
    r = requests.post(
        f"{BASE_URL}/api/auth/google-session",
        json={"session_id": "definitely-not-a-real-session-xyz-123"},
    )
    # Backend should reject invalid Emergent session with 401
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


def test_google_session_missing_body_returns_422():
    # Pydantic validation should kick in
    r = requests.post(f"{BASE_URL}/api/auth/google-session", json={})
    assert r.status_code in (400, 422), r.text
