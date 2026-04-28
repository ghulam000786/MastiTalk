# Auth Testing Playbook for Coin Connect

This app uses BOTH:
1. Email/password JWT auth (legacy, working)
2. Emergent-managed Google Auth (new) - uses URL fragment session_id flow

## Test User (email/password)
- email: smoke@test.com
- password: pass1234

## To create Google Auth test user via mongo
```
mongosh --eval "
use('coin_connect');
var userId = 'user_' + Math.random().toString(36).slice(2,14);
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  id: userId,
  email: 'test.google.' + Date.now() + '@example.com',
  name: 'Test Google User',
  picture: 'https://via.placeholder.com/150',
  coins: 100,
  created_at: new Date().toISOString()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Token: ' + sessionToken);
"
```

## Frontend flow
1. Click "Continue with Google" → redirects to https://auth.emergentagent.com/?redirect={origin}/
2. Lands back at {origin}/#session_id=xxx
3. Frontend detects fragment, POSTs to /api/auth/google-session, receives JWT, saves it, redirects to /home
