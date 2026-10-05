#!/usr/bin/env bash
#
# Pulls the latest commit, rebuilds, and swaps the running containers.
#
# The slow part — building images — happens while the old containers keep serving, so the only
# interruption is the swap itself: a few seconds. Run it from the timer at night rather than
# during the day, because "a few seconds" is still a few seconds.
#
# Usage:  deploy/update.sh [--force]
#           --force   rebuild and restart even when git brought nothing new
set -euo pipefail

cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)
HEALTH_URL="http://127.0.0.1:${FRONTEND_PORT:-8080}/api/wise/published"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Read FRONTEND_PORT from .env if it is set there rather than in the environment.
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' .env | tail -1 | cut -d= -f2- || true)"
  HEALTH_URL="http://127.0.0.1:${FRONTEND_PORT:-8080}/api/wise/published"
fi

before="$(git rev-parse HEAD)"

log "fetching"
git fetch --quiet origin
git pull --quiet --ff-only

after="$(git rev-parse HEAD)"

if [[ "$before" == "$after" && "${1:-}" != "--force" ]]; then
  log "already at $after, nothing to do"
  exit 0
fi

log "building ($before -> $after)"
"${COMPOSE[@]}" build

log "swapping containers"
"${COMPOSE[@]}" up -d --remove-orphans

# Give the backend a moment to apply migrations and come up before judging it.
log "waiting for health"
healthy=false
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done

if [[ "$healthy" != true ]]; then
  log "UNHEALTHY after update — rolling back to $before"
  git reset --hard --quiet "$before"
  "${COMPOSE[@]}" build
  "${COMPOSE[@]}" up -d --remove-orphans
  log "rolled back; investigate with: ${COMPOSE[*]} logs --tail 100"
  exit 1
fi

log "healthy at $after"

# Images from previous builds pile up fast on a laptop disk.
docker image prune -f >/dev/null
log "done"
