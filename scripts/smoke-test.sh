#!/usr/bin/env bash
# Automated smoke tests for the deployed HackOps application.
#
# Tests three tiers:
#   1. Unauthenticated — health, public pages, auth enforcement
#   2. Auth flow — Easy Auth redirect and /.auth/me endpoint
#   3. Authenticated API — full CRUD if session cookie provided
#
# Usage:
#   ./scripts/smoke-test.sh                          # Tier 1 only
#   ./scripts/smoke-test.sh --cookie <cookie-value>  # All tiers
#   ./scripts/smoke-test.sh --base-url <url>         # Custom URL
#
# Exit codes: 0 = all pass, 1 = failures detected

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────

BASE_URL="https://app-hackops-dev.azurewebsites.net"
SESSION_COOKIE=""
VERBOSE=false
TIMEOUT=10
RETRIES=3
RETRY_DELAY=5

# ── Colors ────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Counters ──────────────────────────────────────────────────────────────

PASS=0
FAIL=0
SKIP=0
TOTAL=0

# ── Usage ─────────────────────────────────────────────────────────────────

usage() {
  cat <<USAGE
Usage: $(basename "$0") [OPTIONS]

Automated smoke tests for the deployed HackOps application.

Options:
  -u, --base-url URL      App base URL [default: $BASE_URL]
  -c, --cookie COOKIE     AppServiceAuthSession cookie value (enables auth tests)
  -v, --verbose            Show response bodies
  -t, --timeout SECS      Request timeout [default: $TIMEOUT]
  -r, --retries N          Retry count for health check [default: $RETRIES]
  -h, --help               Show this help

Test Tiers:
  Tier 1 (always):  Health endpoint, page rendering, auth enforcement
  Tier 2 (cookie):  Easy Auth /.auth/me, /api/me
  Tier 3 (cookie):  API CRUD operations (read-only, no data mutation)
USAGE
}

# ── Argument Parsing ──────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
  case $1 in
    -u|--base-url) BASE_URL="${2%/}"; shift 2 ;;
    -c|--cookie) SESSION_COOKIE="$2"; shift 2 ;;
    -v|--verbose) VERBOSE=true; shift ;;
    -t|--timeout) TIMEOUT="$2"; shift 2 ;;
    -r|--retries) RETRIES="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────

log_header() {
  echo ""
  echo -e "${BOLD}${CYAN}=== $1 ===${NC}"
  echo ""
}

assert_status() {
  local description="$1"
  local url="$2"
  local expected="$3"
  local method="${4:-GET}"
  local extra_args=("${@:5}")

  TOTAL=$((TOTAL + 1))

  local curl_args=(-s -o /tmp/smoke-body.txt -w "%{http_code}" \
    --max-time "$TIMEOUT" -X "$method")

  if [[ -n "$SESSION_COOKIE" ]]; then
    curl_args+=(-H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}")
  fi

  curl_args+=("${extra_args[@]}" "${url}")

  local status
  status=$(curl "${curl_args[@]}" 2>/dev/null || echo "000")

  if [[ "$status" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC}  $description (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  $description — expected $expected, got $status"
    FAIL=$((FAIL + 1))
    if [[ "$VERBOSE" == "true" ]] && [[ -f /tmp/smoke-body.txt ]]; then
      echo "        Body: $(head -c 200 /tmp/smoke-body.txt)"
    fi
  fi
}

assert_status_one_of() {
  local description="$1"
  local url="$2"
  shift 2
  local expected_codes=("$@")

  TOTAL=$((TOTAL + 1))

  local curl_args=(-s -o /tmp/smoke-body.txt -w "%{http_code}" \
    --max-time "$TIMEOUT" --max-redirs 0)

  local status
  status=$(curl "${curl_args[@]}" "${url}" 2>/dev/null || echo "000")
  # Normalize — curl may concatenate codes on redirects
  status="${status: -3}"

  local matched=false
  for code in "${expected_codes[@]}"; do
    if [[ "$status" == "$code" ]]; then
      matched=true
      break
    fi
  done

  if [[ "$matched" == "true" ]]; then
    echo -e "  ${GREEN}PASS${NC}  $description (HTTP $status)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  $description — expected one of [${expected_codes[*]}], got $status"
    FAIL=$((FAIL + 1))
  fi
}

assert_redirect() {
  local description="$1"
  local url="$2"
  local redirect_contains="$3"

  TOTAL=$((TOTAL + 1))

  local location
  location=$(curl -s -o /dev/null -w "%{redirect_url}" \
    --max-time "$TIMEOUT" --max-redirs 0 "${url}" 2>/dev/null || echo "")

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time "$TIMEOUT" --max-redirs 0 "${url}" 2>/dev/null || echo "000")

  if [[ "$status" =~ ^30[0-9]$ ]] && [[ "$location" == *"$redirect_contains"* ]]; then
    echo -e "  ${GREEN}PASS${NC}  $description (HTTP $status → $redirect_contains)"
    PASS=$((PASS + 1))
  elif [[ "$status" =~ ^30[0-9]$ ]]; then
    echo -e "  ${YELLOW}WARN${NC}  $description — redirects to: $location (expected *$redirect_contains*)"
    FAIL=$((FAIL + 1))
  else
    echo -e "  ${RED}FAIL${NC}  $description — expected 3xx redirect, got $status"
    FAIL=$((FAIL + 1))
  fi
}

assert_json_field() {
  local description="$1"
  local url="$2"
  local jq_filter="$3"
  local expected="$4"

  TOTAL=$((TOTAL + 1))

  local curl_args=(-s --max-time "$TIMEOUT")

  if [[ -n "$SESSION_COOKIE" ]]; then
    curl_args+=(-H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}")
  fi

  local body
  body=$(curl "${curl_args[@]}" "${url}" 2>/dev/null || echo "{}")
  local actual
  actual=$(echo "$body" | jq -r "$jq_filter" 2>/dev/null || echo "PARSE_ERROR")

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC}  $description ($jq_filter = $actual)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  $description — expected $jq_filter=$expected, got $actual"
    FAIL=$((FAIL + 1))
    if [[ "$VERBOSE" == "true" ]]; then
      echo "        Body: $(echo "$body" | head -c 200)"
    fi
  fi
}

skip_test() {
  local description="$1"
  local reason="$2"
  TOTAL=$((TOTAL + 1))
  SKIP=$((SKIP + 1))
  echo -e "  ${YELLOW}SKIP${NC}  $description — $reason"
}

# ── Banner ────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}HackOps Smoke Test Suite${NC}"
echo -e "Target: ${CYAN}${BASE_URL}${NC}"
echo -e "Cookie: ${SESSION_COOKIE:+provided}${SESSION_COOKIE:-not provided (Tier 1 only)}"
echo -e "Date:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# ═══════════════════════════════════════════════════════════════════════════
# TIER 1 — Unauthenticated Tests
# ═══════════════════════════════════════════════════════════════════════════

log_header "Tier 1: Health & Infrastructure"

# Health endpoint with retry
echo "  Checking health (up to $RETRIES attempts)..."
HEALTH_OK=false
for i in $(seq 1 "$RETRIES"); do
  STATUS=$(curl -s -o /tmp/smoke-body.txt -w "%{http_code}" \
    --max-time "$TIMEOUT" "${BASE_URL}/api/health" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "200" ]]; then
    HEALTH_OK=true
    break
  fi
  echo -e "  ${YELLOW}...${NC}  Attempt $i: HTTP $STATUS — retrying in ${RETRY_DELAY}s"
  sleep "$RETRY_DELAY"
done

TOTAL=$((TOTAL + 1))
if [[ "$HEALTH_OK" == "true" ]]; then
  echo -e "  ${GREEN}PASS${NC}  GET /api/health → 200"
  PASS=$((PASS + 1))

  # Parse health response
  HEALTH_STATUS=$(jq -r '.status // .data.status // "unknown"' /tmp/smoke-body.txt 2>/dev/null || echo "unknown")
  COSMOS_STATUS=$(jq -r '.checks[]? | select(.name=="cosmos-db") | .status // "missing"' /tmp/smoke-body.txt 2>/dev/null || echo "not-checked")
  echo -e "        Overall: $HEALTH_STATUS | Cosmos DB: $COSMOS_STATUS"
else
  echo -e "  ${RED}FAIL${NC}  GET /api/health — not reachable after $RETRIES attempts"
  FAIL=$((FAIL + 1))
  echo -e "\n${RED}App is not reachable. Aborting remaining tests.${NC}"
  echo -e "\nResults: ${PASS} passed, ${FAIL} failed, ${SKIP} skipped / ${TOTAL} total"
  exit 1
fi

log_header "Tier 1: Page Rendering"

# Pages should return 200 or redirect to auth (both acceptable)
assert_status_one_of "GET / (landing page)" "${BASE_URL}/" 200 302 307
assert_status_one_of "GET /join" "${BASE_URL}/join" 200 302 307
assert_status_one_of "GET /dashboard" "${BASE_URL}/dashboard" 200 302 307
assert_status_one_of "GET /admin" "${BASE_URL}/admin" 200 302 307 403

log_header "Tier 1: Auth Guard Enforcement"

# Protected API endpoints must reject unauthenticated requests (401 or 302 redirect)
# We test WITHOUT the cookie to verify guards work
GUARD_CURL_ARGS=(-s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" --max-redirs 0)

for endpoint in "/api/hackathons" "/api/rubrics" "/api/challenges" "/api/roles" "/api/config"; do
  TOTAL=$((TOTAL + 1))
  STATUS=$(curl "${GUARD_CURL_ARGS[@]}" "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")
  if [[ "$STATUS" == "401" || "$STATUS" == "302" || "$STATUS" == "403" ]]; then
    echo -e "  ${GREEN}PASS${NC}  GET $endpoint rejects unauthed (HTTP $STATUS)"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  GET $endpoint should reject unauthed — got $STATUS"
    FAIL=$((FAIL + 1))
  fi
done

log_header "Tier 1: Easy Auth Flow"

# The /.auth/login/github endpoint should exist and redirect to GitHub
assert_redirect "GET /.auth/login/github redirects to GitHub" \
  "${BASE_URL}/.auth/login/github" "github.com"

# ═══════════════════════════════════════════════════════════════════════════
# TIER 2 — Authenticated Identity Tests (requires cookie)
# ═══════════════════════════════════════════════════════════════════════════

log_header "Tier 2: Authenticated Identity"

if [[ -z "$SESSION_COOKIE" ]]; then
  skip_test "GET /.auth/me (claims)" "no --cookie provided"
  skip_test "GET /api/me (app identity)" "no --cookie provided"
else
  # /.auth/me returns Easy Auth claims
  TOTAL=$((TOTAL + 1))
  AUTH_ME_BODY=$(curl -s --max-time "$TIMEOUT" \
    -H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}" \
    "${BASE_URL}/.auth/me" 2>/dev/null || echo "[]")
  AUTH_ME_LEN=$(echo "$AUTH_ME_BODY" | jq 'length' 2>/dev/null || echo "0")

  if [[ "$AUTH_ME_LEN" -gt 0 ]]; then
    GITHUB_LOGIN=$(echo "$AUTH_ME_BODY" | jq -r '.[0].user_claims[]? | select(.typ | endswith("/name")) | .val // "unknown"' 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}PASS${NC}  GET /.auth/me — authenticated as: $GITHUB_LOGIN"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  GET /.auth/me — no claims returned (cookie expired?)"
    FAIL=$((FAIL + 1))
    if [[ "$VERBOSE" == "true" ]]; then
      echo "        Body: $(echo "$AUTH_ME_BODY" | head -c 200)"
    fi
  fi

  # /api/me returns app-level identity
  TOTAL=$((TOTAL + 1))
  API_ME_BODY=$(curl -s --max-time "$TIMEOUT" \
    -H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}" \
    "${BASE_URL}/api/me" 2>/dev/null || echo "{}")
  API_ME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" \
    -H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}" \
    "${BASE_URL}/api/me" 2>/dev/null || echo "000")

  if [[ "$API_ME_STATUS" == "200" ]]; then
    APP_USER=$(echo "$API_ME_BODY" | jq -r '.data.githubLogin // .githubLogin // "unknown"' 2>/dev/null || echo "unknown")
    APP_ROLE=$(echo "$API_ME_BODY" | jq -r '.data.role // .role // "unknown"' 2>/dev/null || echo "unknown")
    echo -e "  ${GREEN}PASS${NC}  GET /api/me — user: $APP_USER, role: $APP_ROLE"
    PASS=$((PASS + 1))
  else
    echo -e "  ${RED}FAIL${NC}  GET /api/me — expected 200, got $API_ME_STATUS"
    FAIL=$((FAIL + 1))
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# TIER 3 — Authenticated API Tests (read-only, requires cookie)
# ═══════════════════════════════════════════════════════════════════════════

log_header "Tier 3: Authenticated API (Read-Only)"

if [[ -z "$SESSION_COOKIE" ]]; then
  skip_test "GET /api/hackathons" "no --cookie provided"
  skip_test "GET /api/rubrics" "no --cookie provided"
  skip_test "GET /api/challenges" "no --cookie provided"
  skip_test "GET /api/config" "no --cookie provided"
  skip_test "GET /api/roles" "no --cookie provided"
else
  # Read-only GET endpoints that should return 200 + JSON for authed users
  for endpoint in "/api/hackathons" "/api/rubrics" "/api/challenges"; do
    TOTAL=$((TOTAL + 1))
    STATUS=$(curl -s -o /tmp/smoke-body.txt -w "%{http_code}" \
      --max-time "$TIMEOUT" \
      -H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}" \
      "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")

    if [[ "$STATUS" == "200" ]]; then
      IS_JSON=$(jq -e '.' /tmp/smoke-body.txt &>/dev/null && echo "true" || echo "false")
      if [[ "$IS_JSON" == "true" ]]; then
        echo -e "  ${GREEN}PASS${NC}  GET $endpoint → 200 (valid JSON)"
        PASS=$((PASS + 1))
      else
        echo -e "  ${YELLOW}WARN${NC}  GET $endpoint → 200 but response is not JSON"
        FAIL=$((FAIL + 1))
      fi
    elif [[ "$STATUS" == "403" ]]; then
      echo -e "  ${GREEN}PASS${NC}  GET $endpoint → 403 (role restriction, auth works)"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}FAIL${NC}  GET $endpoint — expected 200/403, got $STATUS"
      FAIL=$((FAIL + 1))
    fi
  done

  # Admin-only endpoints — 200 if admin, 403 if not
  for endpoint in "/api/config" "/api/roles"; do
    TOTAL=$((TOTAL + 1))
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      --max-time "$TIMEOUT" \
      -H "Cookie: AppServiceAuthSession=${SESSION_COOKIE}" \
      "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")

    if [[ "$STATUS" == "200" || "$STATUS" == "403" ]]; then
      echo -e "  ${GREEN}PASS${NC}  GET $endpoint → $STATUS (auth enforced)"
      PASS=$((PASS + 1))
    else
      echo -e "  ${RED}FAIL${NC}  GET $endpoint — expected 200/403, got $STATUS"
      FAIL=$((FAIL + 1))
    fi
  done
fi

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════

echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}Results:${NC} ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}, ${YELLOW}${SKIP} skipped${NC} / ${TOTAL} total"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Cleanup
rm -f /tmp/smoke-body.txt

if [[ "$FAIL" -gt 0 ]]; then
  echo -e "\n${RED}Some tests failed.${NC}"
  exit 1
else
  echo -e "\n${GREEN}All tests passed!${NC}"
  exit 0
fi
