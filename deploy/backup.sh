#!/usr/bin/env bash
#
# Dumps the database to deploy/backups/ and keeps the last N days.
#
# This is the only copy of anything that cannot be rebuilt: user accounts and the subjects each
# student put on their timetable. Everything else — the catalogue, the events — is re-read from
# Wise on demand and does not need backing up.
set -euo pipefail

cd "$(dirname "$0")/.."

KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DEST="${BACKUP_DIR:-deploy/backups}"

mkdir -p "$DEST"

# Credentials come from .env, the same file the database container was created with.
#
# Read line by line rather than `source`: .env is a key=value file, not a shell script, and
# values are not required to be shell-safe. WISE_USER_AGENT alone contains parentheses, which
# a sourcing script fails on with a syntax error that points at the wrong thing entirely.
read_env() {
  [[ -f .env ]] || return 0
  local line
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*$ ]] && continue
    [[ "$line" == *=* ]] || continue
    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key//[[:space:]]/}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    printf -v "$key" '%s' "$value"
    export "${key?}"
  done < .env
}
read_env

: "${POSTGRES_USER:?POSTGRES_USER is not set; is .env present?}"
: "${POSTGRES_DB:?POSTGRES_DB is not set; is .env present?}"

stamp="$(date '+%Y%m%d-%H%M%S')"
out="$DEST/wiser-$stamp.sql.gz"

echo "dumping to $out"

# -Fp plain SQL, gzipped: restoring needs nothing but psql and gunzip, which matters when you
# are restoring precisely because something is broken.
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" database \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists \
  | gzip -9 > "$out"

# A dump that is suspiciously small is usually an error message, not a database.
size="$(stat -c%s "$out")"
if (( size < 1024 )); then
  echo "dump is only ${size} bytes — treating as failed" >&2
  rm -f "$out"
  exit 1
fi

echo "wrote $out ($(numfmt --to=iec "$size"))"

deleted="$(find "$DEST" -name 'wiser-*.sql.gz' -mtime "+$KEEP_DAYS" -print -delete | wc -l)"
echo "pruned $deleted backup(s) older than $KEEP_DAYS days"

# To restore:
#   gunzip -c deploy/backups/wiser-YYYYmmdd-HHMMSS.sql.gz \
#     | docker compose exec -T database psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
