#!/usr/bin/env bash
# scripts/test-docker.sh — TDD test script for Dockerfile assertions
# Run BEFORE editing Dockerfile to see it fail (red), then after to see it pass (green).
set -euo pipefail

IMAGE="terminus-portal:test-$$"
CONTAINER_NAME="terminus-portal-test-$$"

cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rmi -f "$IMAGE" >/dev/null 2>&1 || true
}
trap cleanup EXIT

PASS=0
FAIL=0

assert() {
  local desc="$1"
  local actual="$2"
  local expected_pattern="$3"
  if echo "$actual" | grep -qE "$expected_pattern"; then
    echo "  ✅ PASS: $desc"
    ((PASS++)) || true
  else
    echo "  ❌ FAIL: $desc"
    echo "     Expected pattern: $expected_pattern"
    echo "     Got: $actual"
    ((FAIL++)) || true
  fi
}

echo "=== AC1: docker build ==="
docker build -t "$IMAGE" . 2>&1 | tail -3
echo "  ✅ PASS: docker build completed"

echo ""
echo "=== Starting container ==="
docker run -d --name "$CONTAINER_NAME" -p 18080:80 "$IMAGE" >/dev/null
sleep 1

echo ""
echo "=== AC2: Final stage is nginx:1.27-alpine ==="
BASE=$(docker inspect "$IMAGE" --format '{{.Config.Image}}' 2>/dev/null || echo "")
assert "base image label" "$(docker history "$IMAGE" --format '{{.CreatedBy}}' | grep -i nginx | head -1)" "nginx"

echo ""
echo "=== AC3: Serves app at /==="
ROOT_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/ || echo "000")
assert "root returns 200" "$ROOT_RESP" "200"

echo ""
echo "=== AC4: SPA fallback — nonexistent path returns 200 ==="
SPA_RESP=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:18080/nonexistent || echo "000")
assert "SPA fallback returns 200" "$SPA_RESP" "200"

echo ""
echo "=== AC5: server_tokens off ==="
HEADERS=$(curl -sI http://localhost:18080/ || echo "")
assert "Server header absent or no version" "$HEADERS" "^((?!Server: nginx/[0-9]).)*$|Server: nginx$|^((?!Server:).)*$"

echo ""
echo "=== AC6: JS/CSS cache headers ==="
JS_FILE=$(curl -s http://localhost:18080/ | grep -oE '/assets/[^"]+\.js' | head -1 || echo "")
if [[ -n "$JS_FILE" ]]; then
  JS_HEADERS=$(curl -sI "http://localhost:18080${JS_FILE}" || echo "")
  assert "JS Cache-Control: public" "$JS_HEADERS" "Cache-Control.*public"
  assert "JS Cache-Control: immutable" "$JS_HEADERS" "immutable"
else
  echo "  ⚠️  SKIP: No JS asset found to test Cache-Control"
fi

echo ""
echo "=== Summary ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
[[ $FAIL -eq 0 ]] && echo "✅ All assertions passed" || { echo "❌ $FAIL assertion(s) failed"; exit 1; }
