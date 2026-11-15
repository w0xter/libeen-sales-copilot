#!/usr/bin/env bash
# Ejecuta el benchmark contra la rama local; inicia Next.js si no hay servidor.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATASET="${INTAKE_EVAL_DATASET:-$ROOT/evaluation/libeen_ai_lead_intake_eval_v1.zip}"
PORT="${INTAKE_EVAL_PORT:-3000}"
URL="${INTAKE_EVAL_URL:-http://127.0.0.1:${PORT}/api/intake}"
OUTPUT="${INTAKE_EVAL_OUTPUT:-$ROOT/evaluation/results/latest}"
SERVER_PID=""
CUSTOM_URL=0
DRY=0
for arg in "$@"; do
  case "$arg" in
    --url) CUSTOM_URL=1 ;;
    --dry-run|--help|-h) DRY=1 ;;
  esac
done
cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT
if [[ "$DRY" -eq 0 && "$CUSTOM_URL" -eq 0 && "${INTAKE_EVAL_NO_SERVER:-0}" != 1 ]]; then
  mkdir -p "$OUTPUT"
  if ! curl -s -o /dev/null --max-time 2 "$URL"; then
    if [[ ! -x "$ROOT/node_modules/.bin/next" ]]; then
      echo 'Dependencias no instaladas. Ejecuta pnpm install --frozen-lockfile.' >&2
      exit 1
    fi
    echo "Iniciando Next.js local en puerto ${PORT} (logs: $OUTPUT/server.log)..."
    ( cd "$ROOT" && exec ./node_modules/.bin/next dev --hostname 127.0.0.1 --port "$PORT" ) > "$OUTPUT/server.log" 2>&1 &
    SERVER_PID="$!"
    for _ in $(seq 1 90); do
      if curl -s -o /dev/null --max-time 2 "$URL"; then break; fi
      if ! kill -0 "$SERVER_PID" 2>/dev/null; then
        echo 'Next.js terminó antes de estar disponible:' >&2
        tail -n 30 "$OUTPUT/server.log" >&2
        exit 1
      fi
      sleep 1
    done
    if ! curl -s -o /dev/null --max-time 2 "$URL"; then
      echo 'La API no ha quedado disponible; comprueba server.log.' >&2
      exit 1
    fi
  fi
fi
exec_args=(--dataset "$DATASET" --url "$URL" --output "$OUTPUT")
python3 "$ROOT/scripts/evaluate_intake.py" "${exec_args[@]}" "$@"
