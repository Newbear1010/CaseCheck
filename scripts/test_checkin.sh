#!/usr/bin/env bash
set -euo pipefail

if [[ -n "${DEBUG:-}" ]]; then
  set -x
fi

ENV_FILE="${ENV_FILE:-.env}"

load_env_file() {
  local file_path="$1"
  if [[ ! -f "$file_path" ]]; then
    return 0
  fi
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
      local key="${line%%=*}"
      local value="${line#*=}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      export "$key=$value"
    fi
  done < "$file_path"
}

load_env_file "$ENV_FILE"

BASE_URL="${BASE_URL:-}"
ACTIVITY_ID="${ACTIVITY_ID:-}"
ADMIN_USERNAME="${ADMIN_USERNAME:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
PARTICIPANT_USERNAME="${PARTICIPANT_USERNAME:-}"
PARTICIPANT_PASSWORD="${PARTICIPANT_PASSWORD:-}"
GATE_ID="${GATE_ID:-main}"
SKIP_START="${SKIP_START:-0}"
SKIP_REGISTER="${SKIP_REGISTER:-0}"
SKIP_QR="${SKIP_QR:-0}"
QR_CODE="${QR_CODE:-}"

if [[ -z "$ACTIVITY_ID" ]]; then
  echo "ERROR: ACTIVITY_ID is required."
  echo "Usage: ACTIVITY_ID=... ENV_FILE=.env ./scripts/test_checkin.sh"
  exit 1
fi

if [[ -z "$BASE_URL" ]]; then
  echo "ERROR: BASE_URL is required."
  exit 1
fi

if [[ -z "$ADMIN_USERNAME" || -z "$ADMIN_PASSWORD" ]]; then
  echo "ERROR: ADMIN_USERNAME and ADMIN_PASSWORD are required."
  exit 1
fi

if [[ -z "$PARTICIPANT_USERNAME" || -z "$PARTICIPANT_PASSWORD" ]]; then
  echo "ERROR: PARTICIPANT_USERNAME and PARTICIPANT_PASSWORD are required."
  exit 1
fi

json_value() {
  local key="$1"
  local file_path="$2"
  python - "$key" "$file_path" <<'PY'
import json, sys
key = sys.argv[1]
file_path = sys.argv[2]
try:
    with open(file_path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
except Exception:
    print("")
    sys.exit(1)
print(eval("data" + key))
PY
}

login() {
  local username="$1"
  local password="$2"
  curl -s --show-error --max-time 10 -X POST "$BASE_URL/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$username\",\"password\":\"$password\"}"
}

api_post() {
  local url="$1"
  local token="$2"
  local payload="$3"
  curl -s --show-error --max-time 10 -X POST "$url" \
    -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" \
    -d "$payload"
}

echo "==> Logging in admin..."
admin_resp="$(login "$ADMIN_USERNAME" "$ADMIN_PASSWORD")"
admin_tmp="$(mktemp)"
printf '%s' "$admin_resp" > "$admin_tmp"
ADMIN_TOKEN="$(json_value "['data']['access_token']" "$admin_tmp" || true)"
rm -f "$admin_tmp"
if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "ERROR: Admin login failed or returned non-JSON."
  echo "Response:"
  printf '%s\n' "$admin_resp"
  exit 1
fi

echo "==> Logging in participant..."
participant_resp="$(login "$PARTICIPANT_USERNAME" "$PARTICIPANT_PASSWORD")"
participant_tmp="$(mktemp)"
printf '%s' "$participant_resp" > "$participant_tmp"
PARTICIPANT_TOKEN="$(json_value "['data']['access_token']" "$participant_tmp" || true)"
rm -f "$participant_tmp"
if [[ -z "${PARTICIPANT_TOKEN:-}" ]]; then
  echo "ERROR: Participant login failed or returned non-JSON."
  echo "Response:"
  printf '%s\n' "$participant_resp"
  exit 1
fi

echo "==> Starting activity (ignore errors if already started)..."
if [[ "$SKIP_START" != "1" ]]; then
  start_resp="$(api_post "$BASE_URL/v1/activities/$ACTIVITY_ID/start" "$ADMIN_TOKEN" "{}")"
  if [[ -n "${DEBUG:-}" ]]; then
    echo "Start response: $start_resp"
  fi
fi

echo "==> Registering participant..."
if [[ "$SKIP_REGISTER" != "1" ]]; then
  register_resp="$(api_post "$BASE_URL/v1/attendance/register" "$PARTICIPANT_TOKEN" "{\"activity_id\":\"$ACTIVITY_ID\"}")"
  if [[ -n "${DEBUG:-}" ]]; then
    echo "Register response: $register_resp"
  fi
fi

echo "==> Generating QR code..."
if [[ "$SKIP_QR" != "1" && -z "${QR_CODE:-}" ]]; then
  qr_resp="$(api_post "$BASE_URL/v1/attendance/qr-code" "$ADMIN_TOKEN" "{\"activity_id\":\"$ACTIVITY_ID\",\"gate_id\":\"$GATE_ID\",\"code_type\":\"CHECK_IN\"}")"
  qr_tmp="$(mktemp)"
  printf '%s' "$qr_resp" > "$qr_tmp"
  QR_CODE="$(json_value "['data']['code']" "$qr_tmp" || true)"
  rm -f "$qr_tmp"
  if [[ -z "${QR_CODE:-}" ]]; then
    echo "ERROR: QR code response missing or invalid."
    echo "Response:"
    printf '%s\n' "$qr_resp"
    exit 1
  fi
fi

echo "==> Checking in participant..."
curl -s -X POST "$BASE_URL/v1/attendance/check-in" \
  -H "Authorization: Bearer $PARTICIPANT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"qr_code\":\"$QR_CODE\"}" | python -m json.tool

echo "==> Done."
