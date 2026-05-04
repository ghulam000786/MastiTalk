#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Female revenue model: Boys pay 17 coins/min, Girls earn 8 credits/min. 100 credits = ₹40.
  Min redeem 100 credits. Manual admin approval. Plus fix mute and back-camera switch on call screen.

backend:
  - task: "Female revenue model — heartbeat / end-call credits/coins logic"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Updated CALL_COST_PER_MIN=17, CALL_EARN_PER_MIN=8, CREDIT_TO_INR_RATE=0.40. /agora/end-call now credits girls and debits boys based on user.gender. /match/join and /agora/token now skip insufficient-coin check for girls."
        - working: true
          agent: "testing"
          comment: "All checks pass via /app/backend_test.py against live EXPO_PUBLIC_BACKEND_URL. GET /api/packs returns constants (17/8/100/0.40). /api/agora/token: girl with default 50 coins -> 200 + token + call_id; boy with coins=0 -> 402 'Insufficient coins'; boy with coins=50 -> 200. /api/agora/end-call: girl minutes=3 -> credits_earned=24, coins_spent=0, /auth/me credits+=24 and coins unchanged; boy minutes=2 -> coins_spent=34, balance reduced by 34, credits_earned=0. Repeat end-call on same call_id returns success with 0/0 deltas (idempotent). /api/match/join: girl coins=0 -> 200 (waiting); boy coins=0 -> 402; boy coins=50 -> 200."

  - task: "Payout / Redeem endpoints"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added GET /api/payout/config (returns credits, rate, min, gender), POST /api/payout/request (validates UPI/bank, deducts credits, creates payout in pending), GET /api/payout/history."
        - working: true
          agent: "testing"
          comment: "All payout cases pass."

  - task: "Admin endpoints + change-password"
    implemented: true
    working: true
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "GET /api/admin/me, /api/admin/stats, /api/admin/payouts?status=, POST /api/admin/payouts/{id}/{approve|reject|mark-paid}, POST /api/account/change-password. ADMIN_EMAILS env (ghulam000786@gmail.com) marks user is_admin via public_user. Reject refunds credits."
        - working: true
          agent: "testing"
          comment: "All 35/35 admin + change-password checks pass via /app/admin_test.py against EXPO_PUBLIC_BACKEND_URL. Coverage: (1) Admin login returns is_admin=true on user; /auth/me admin token also is_admin=true; non-admin (boy) is_admin=false. (2) GET /api/admin/me — admin 200, non-admin 403, no-token 401. (3) GET /api/admin/stats returns payouts_by_status + users{total=50,girls=20,boys=27}; girls+boys<=total. (4) GET /api/admin/payouts filters status=pending|all|approved|paid|rejected correctly; payout items contain id,user_id,user_name,user_email,credits,inr_amount,method,details,status,created_at. (5) Set girl (riya.girl@test.com) credits=500 directly in Mongo, POST /api/payout/request {amount:200,method:'upi',upi_id:'test@paytm'} -> 200 status=pending. (6) Approve with note='Looks good' -> 200, status=approved, admin_note set, reviewed_by='ghulam000786@gmail.com', reviewed_at present. Calling approve again on an already-approved payout returns 200 (idempotent overwrite — code only blocks 'paid'/'rejected'); behavior observed and acceptable per spec. (7) mark-paid {note:'Done', transaction_ref:'UTR12345'} -> 200, status=paid, paid_at present, transaction_ref stored; second mark-paid returns 400 'Payout is already paid'. (8) Created 2nd pending payout amount=150; pre-reject credits=250; reject -> 200 status=rejected, post-reject credits=400 (refund of 150 verified); reject again -> 400 'Payout is already rejected'. (9) Change-password: wrong current_password -> 400 'Current password is incorrect'; correct (CoinAdmin@786 -> NewPass@123) -> 200; login with old pw -> 401; login with new -> 200; reset back to CoinAdmin@786 -> 200; new_password='abc' (too short) -> 400 'must be at least 6 characters'. Default credentials are unchanged. (10) Authorization: non-admin token gets 403 on every /api/admin/* GET and POST endpoint tested. No issues found."

frontend:
  - task: "Profile screen — gender-aware UI + Redeem CTA"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/(tabs)/profile.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Gender pill now reflects user's actual gender. Girls see Credits + Earnings tiles and a 'Redeem to UPI / Bank' CTA. Boys see Coins + Credits + 'Get Coins' CTA."

  - task: "Redeem screen — UPI/Bank form + history"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/redeem.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "New screen with method picker (UPI/Bank), amount with quick chips, validations, submit, and payout history with status pill."

  - task: "Store screen — earnings view for girls + dynamic cost"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/store.tsx"
    stuck_count: 0
    priority: "low"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Girls now see Earnings hero + Redeem button. Boys still see packs. Cost-per-min uses dynamic value from /packs."

  - task: "Call screen — fix mute & back-camera switch"
    implemented: true
    working: "NA"
    file: "/app/frontend/app/call/[channel].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Replaced direct contentWindow.toggleMute() (broken cross-origin srcDoc) with postMessage commands. Added real camera switch using AgoraRTC.getCameras() + setDevice(nextDeviceId), with facingMode fallback for single-camera devices. Mute now uses setMuted(). Bottom mute button shows muted state with red highlight + mic-off icon."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 0
  run_ui: false

test_plan:
  current_focus:
    - "Female revenue model — heartbeat / end-call credits/coins logic"
    - "Payout / Redeem endpoints"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Implemented female revenue model end-to-end. Need backend testing for: (1) /agora/token and /match/join allowing girls without coin balance, blocking boys with low coins; (2) /agora/end-call crediting girls (8 credits/min) and debiting boys (17 coins/min); (3) /payout/config returning gender + rate; (4) /payout/request validation (min 100 credits, UPI shape, bank fields, IFSC length 11), credit deduction, payout doc created with status='pending'; (5) /payout/history returning user's payouts. Test credentials in /app/memory/test_credentials.md. Use existing accounts; if needed, create new boy + girl accounts via /api/auth/register then /api/users/onboarding."
    - agent: "testing"
      message: "Backend tests complete — 23/23 pass via /app/backend_test.py against EXPO_PUBLIC_BACKEND_URL. Covered: GET /api/packs constants (17/8/100/0.40); /api/agora/token (girl bypass, boy 402 when coins=0, boy 200 when coins=50); /api/agora/end-call (girl 3min->credits_earned=24 credits+=24 coins unchanged; boy 2min->coins_spent=34 balance-=34; idempotent replay returns 0 deltas); /api/match/join (girl coins=0 ok, boy coins=0 -> 402, boy coins=50 ok); /api/payout/config girl payload; /api/payout/request (boy->403, below MIN 100->400, UPI valid 150 with credits=200 -> pending credits=150 inr=60 and credits=50 after, invalid UPI->400, bank missing fields->400, bank amount=50->400, bank valid amount=100->pending inr=40, amount>credits->400 'Not enough credits'); /api/payout/history returns 2 pending payouts desc with method+details intact. No issues found."
    - agent: "testing"
      message: "Admin + change-password tests complete — 35/35 pass via /app/admin_test.py against EXPO_PUBLIC_BACKEND_URL. Verified: admin login + is_admin flag; /admin/me 200/403/401; /admin/stats payouts_by_status & users counts; /admin/payouts filters (pending/all/approved/paid/rejected) with required fields (id,user_id,user_name,user_email,credits,inr_amount,method,details,status,created_at); approve sets status+admin_note+reviewed_by+reviewed_at (idempotent on already-approved); mark-paid sets transaction_ref+paid_at, second call -> 400 'already paid'; reject refunds credits (pre=250 post=400 +150) and second call -> 400 'already rejected'; /account/change-password wrong-current 400, success 200, old pw 401 then new 200, reset back success, too-short 400 (admin password reset to original CoinAdmin@786 — test_credentials.md unchanged); non-admin 403 across all /admin/* endpoints. No issues found."