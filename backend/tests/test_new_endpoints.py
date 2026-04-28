"""Tests for newly added endpoints: /api/explore, /api/auth/google-session"""
import os
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://coin-connect-3.preview.emergentagent.com").rstrip("/")


# ---------- Explore ----------
def test_explore_returns_six_profiles_and_online_count():
    r = requests.get(f"{BASE_URL}/api/explore")
    assert r.status_code == 200, r.text
    data = r.json()
    assert "profiles" in data
    assert "online_count" in data
    assert len(data["profiles"]) == 6
    # Validate each profile has the expected keys
    for p in data["profiles"]:
        for key in ("id", "name", "country", "flag", "online", "photo"):
            assert key in p, f"Missing key {key}"
    online_actual = sum(1 for p in data["profiles"] if p["online"])
    assert data["online_count"] == online_actual
    # No mongo _id leakage
    assert "_id" not in data


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
