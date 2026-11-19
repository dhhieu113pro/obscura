#!/data/data/com.termux/files/usr/bin/bash
# Interleaved speed/RAM comparison: pwterm (system Chromium) vs obscura (CDP).
#
#   PWTERM_DIR=$HOME/pwterm ./compare.sh [rounds]
#
# obscura must already be serving:  obscura serve --port 9222 --stealth
# Requires: node, a pwterm checkout with node_modules, ps/awk for the RAM sampling.

set -euo pipefail

PWTERM_DIR="${PWTERM_DIR:-$HOME/pwterm}"
CDP_URL="${CDP_URL:-http://127.0.0.1:9222}"
ROUNDS="${1:-5}"
HERE="$(cd "$(dirname "$0")" && pwd)"
TMPDIR="${TMPDIR:-${PREFIX:-/tmp}/tmp}"
mkdir -p "$TMPDIR"
export PWTERM_DIR CDP_URL

curl -sf --max-time 5 "$CDP_URL/json/version" >/dev/null \
  || { echo "obscura is not serving at $CDP_URL — run: obscura serve --port 9222 --stealth" >&2; exit 1; }

# Peak total RSS (KB) of every process whose command line matches $1, sampled
# every 200 ms until the benchmark process exits.
peak_rss() {
  local pattern="$1" bpid="$2" max=0 total
  while kill -0 "$bpid" 2>/dev/null; do
    total=$(ps -eo rss=,args= | grep -i -- "$pattern" | grep -v grep | awk '{s+=$1} END {print s+0}')
    [ "$total" -gt "$max" ] && max=$total
    sleep 0.2
  done
  echo "$((max / 1024))"
}

run_one() {
  local name="$1" script="$2" pattern="$3"
  local out="$TMPDIR/bench-$name.json" err="$TMPDIR/bench-$name.err"
  node "$HERE/$script" >"$out" 2>"$err" &
  local pid=$!
  local mem
  mem=$(peak_rss "$pattern" "$pid")
  wait "$pid" || { echo "$name failed: $(tail -1 "$err")" >&2; return 1; }
  local json total goto_ms
  json=$(tail -1 "$out")
  local total goto_ms
  total=$(echo "$json" | grep -o '"total_ms":[0-9]*' | cut -d: -f2)
  goto_ms=$(echo "$json" | grep -o '"goto_ms":[0-9]*' | cut -d: -f2)
  echo "$total,$goto_ms,$mem"
}

echo "round,pwterm_total_ms,pwterm_goto_ms,pwterm_peak_mb,obscura_total_ms,obscura_goto_ms,obscura_peak_mb"
for i in $(seq 1 "$ROUNDS"); do
  P=$(run_one pwterm pwterm-login.cjs 'chrom')
  O=$(run_one obscura obscura-login.cjs 'obscura')
  echo "$i,$P,$O"
done
