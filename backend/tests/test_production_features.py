"""Tests for production features: matching, chat, report/block, razorpay payment link."""
import os
import uuid
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://coin-connect-3.preview.emergentagent.com").rstrip("/")

def reg(email_prefix, gender="boy"):
    email = f"TEST_{email_prefix}_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "pass1234",
                            "name": email_prefix.title(), "gender": gender})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["token"], data["user"]

def hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Packs with razorpay_payment_link ----------
def test_packs_returns_razorpay_payment_link():
    r = requests.get(f"{BASE_URL}/api/packs")
    assert r.status_code == 200
    data = r.json()
    assert "razorpay_payment_link" in data
    assert data["razorpay_payment_link"].startswith("https://rzp.io/")


# ---------- Matching ----------
class TestMatching:
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, request):
        tb, ub = reg("boy", "boy")
        tg, ug = reg("girl", "girl")
        # Clear any previous queue state
        requests.post(f"{BASE_URL}/api/match/cancel", headers=hdr(tb))
        requests.post(f"{BASE_URL}/api/match/cancel", headers=hdr(tg))
        request.cls.tb, request.cls.ub = tb, ub
        request.cls.tg, request.cls.ug = tg, ug

    def test_match_join_first_waiting_second_matched(self):
        # Boy joins first with pref=girl
        r1 = requests.post(f"{BASE_URL}/api/match/join",
                           json={"preference": "girl"}, headers=hdr(self.tb))
        assert r1.status_code == 200, r1.text
        assert r1.json()["status"] == "waiting"

        # Girl joins with pref=boy -> should match
        r2 = requests.post(f"{BASE_URL}/api/match/join",
                           json={"preference": "boy"}, headers=hdr(self.tg))
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert d2["status"] == "matched"
        assert d2["channel"].startswith("ccm_")
        assert d2["peer"]["id"] == self.ub["id"]

        # Boy status should also be matched with same channel
        rs = requests.get(f"{BASE_URL}/api/match/status", headers=hdr(self.tb))
        assert rs.status_code == 200
        ds = rs.json()
        assert ds["status"] == "matched"
        assert ds["channel"] == d2["channel"]
        assert ds["peer"]["id"] == self.ug["id"]

    def test_match_clear_and_cancel(self):
        # Clear boy's match
        r = requests.post(f"{BASE_URL}/api/match/clear", headers=hdr(self.tb))
        assert r.status_code == 200
        rs = requests.get(f"{BASE_URL}/api/match/status", headers=hdr(self.tb))
        assert rs.json()["status"] == "idle"
        # Girl still matched; cancel hers
        rc = requests.post(f"{BASE_URL}/api/match/cancel", headers=hdr(self.tg))
        assert rc.status_code == 200
        assert rc.json()["status"] == "cancelled"

    def test_preference_filter_prevents_pairing(self):
        # Both are boys; boy1 pref girl, boy2 pref girl → should NOT pair
        t1, u1 = reg("bA", "boy")
        t2, u2 = reg("bB", "boy")
        requests.post(f"{BASE_URL}/api/match/join",
                      json={"preference": "girl"}, headers=hdr(t1))
        r = requests.post(f"{BASE_URL}/api/match/join",
                          json={"preference": "girl"}, headers=hdr(t2))
        assert r.json()["status"] == "waiting"
        # cleanup
        requests.post(f"{BASE_URL}/api/match/cancel", headers=hdr(t1))
        requests.post(f"{BASE_URL}/api/match/cancel", headers=hdr(t2))

    def test_match_any_pairs(self):
        t1, u1 = reg("anyA", "boy")
        t2, u2 = reg("anyB", "girl")
        requests.post(f"{BASE_URL}/api/match/join",
                      json={"preference": "any"}, headers=hdr(t1))
        r = requests.post(f"{BASE_URL}/api/match/join",
                          json={"preference": "any"}, headers=hdr(t2))
        assert r.json()["status"] == "matched"
        requests.post(f"{BASE_URL}/api/match/clear", headers=hdr(t1))
        requests.post(f"{BASE_URL}/api/match/clear", headers=hdr(t2))

    def test_online_count(self):
        r = requests.get(f"{BASE_URL}/api/match/online-count")
        assert r.status_code == 200
        data = r.json()
        assert "waiting" in data and "online_estimate" in data
        assert data["online_estimate"] >= 3


# ---------- Chat ----------
class TestChat:
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, request):
        t1, u1 = reg("chatA", "boy")
        t2, u2 = reg("chatB", "girl")
        request.cls.t1, request.cls.u1 = t1, u1
        request.cls.t2, request.cls.u2 = t2, u2

    def test_send_message_and_fetch(self):
        r = requests.post(f"{BASE_URL}/api/chat/send",
                          json={"to_user_id": self.u2["id"], "text": "Hi Riya"},
                          headers=hdr(self.t1))
        assert r.status_code == 200, r.text
        msg = r.json()["message"]
        assert msg["text"] == "Hi Riya"
        assert msg["from_user_id"] == self.u1["id"]

        # Reply
        r2 = requests.post(f"{BASE_URL}/api/chat/send",
                           json={"to_user_id": self.u1["id"], "text": "Hey Aman"},
                           headers=hdr(self.t2))
        assert r2.status_code == 200

        # Fetch messages
        rm = requests.get(f"{BASE_URL}/api/chat/messages/{self.u2['id']}",
                          headers=hdr(self.t1))
        assert rm.status_code == 200
        data = rm.json()
        assert len(data["messages"]) == 2
        assert data["peer"]["id"] == self.u2["id"]
        texts = [m["text"] for m in data["messages"]]
        assert "Hi Riya" in texts and "Hey Aman" in texts

    def test_send_empty_message_400(self):
        r = requests.post(f"{BASE_URL}/api/chat/send",
                          json={"to_user_id": self.u2["id"], "text": "   "},
                          headers=hdr(self.t1))
        assert r.status_code == 400

    def test_send_to_self_400(self):
        r = requests.post(f"{BASE_URL}/api/chat/send",
                          json={"to_user_id": self.u1["id"], "text": "me"},
                          headers=hdr(self.t1))
        assert r.status_code == 400

    def test_conversations_list(self):
        r = requests.get(f"{BASE_URL}/api/chat/conversations",
                         headers=hdr(self.t1))
        assert r.status_code == 200
        convs = r.json()["conversations"]
        assert len(convs) >= 1
        found = [c for c in convs if c["peer"]["id"] == self.u2["id"]]
        assert found, "Expected conversation with u2"
        assert "last_text" in found[0] and "last_at" in found[0]
        # no _id leak
        for c in convs:
            assert "_id" not in c


# ---------- Report / Block ----------
class TestReportBlock:
    @pytest.fixture(scope="class", autouse=True)
    def setup(self, request):
        t1, u1 = reg("rpA", "boy")
        t2, u2 = reg("rpB", "girl")
        request.cls.t1, request.cls.u1 = t1, u1
        request.cls.t2, request.cls.u2 = t2, u2

    def test_report_user(self):
        r = requests.post(f"{BASE_URL}/api/report",
                          json={"user_id": self.u2["id"], "reason": "spam",
                                "context": "test"}, headers=hdr(self.t1))
        assert r.status_code == 200
        assert r.json()["success"] is True

    def test_report_self_400(self):
        r = requests.post(f"{BASE_URL}/api/report",
                          json={"user_id": self.u1["id"], "reason": "x"},
                          headers=hdr(self.t1))
        assert r.status_code == 400

    def test_block_and_list_and_unblock(self):
        # Block u2
        r = requests.post(f"{BASE_URL}/api/block",
                          json={"user_id": self.u2["id"]}, headers=hdr(self.t1))
        assert r.status_code == 200 and r.json()["success"] is True

        # List blocked
        rl = requests.get(f"{BASE_URL}/api/blocked", headers=hdr(self.t1))
        assert rl.status_code == 200
        ids = [b["id"] for b in rl.json()["blocked"]]
        assert self.u2["id"] in ids

        # Chat to blocked user → 403
        rc = requests.post(f"{BASE_URL}/api/chat/send",
                           json={"to_user_id": self.u2["id"], "text": "hello"},
                           headers=hdr(self.t1))
        assert rc.status_code == 403

        # Reverse direction should also be blocked
        rc2 = requests.post(f"{BASE_URL}/api/chat/send",
                            json={"to_user_id": self.u1["id"], "text": "hi"},
                            headers=hdr(self.t2))
        assert rc2.status_code == 403

        # Explore excludes blocked
        re_ = requests.get(f"{BASE_URL}/api/explore", headers=hdr(self.t1))
        assert re_.status_code == 200
        real_ids = [p["id"] for p in re_.json()["profiles"] if p.get("real")]
        assert self.u2["id"] not in real_ids

        # Unblock
        ru = requests.post(f"{BASE_URL}/api/unblock",
                           json={"user_id": self.u2["id"]}, headers=hdr(self.t1))
        assert ru.status_code == 200
        rl2 = requests.get(f"{BASE_URL}/api/blocked", headers=hdr(self.t1))
        assert self.u2["id"] not in [b["id"] for b in rl2.json()["blocked"]]

    def test_block_self_400(self):
        r = requests.post(f"{BASE_URL}/api/block",
                          json={"user_id": self.u1["id"]}, headers=hdr(self.t1))
        assert r.status_code == 400
