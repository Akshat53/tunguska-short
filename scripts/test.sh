#!/bin/bash
# usage: npm test   (or bash scripts/test.sh)   Fast checks (~15 s, no rendering):
#  1 TypeScript   2 storyboard validates   3 validator catches 10 injected faults   4 timeline unchanged vs the stored snapshot
set -e; cd "$(dirname "$0")/.."
echo "[1/4] tsc";                         npx tsc --noEmit
echo "[2/4] storyboard";                  node --no-warnings scripts/validate-storyboard.mjs | tail -1
echo "[3/4] validator self-test";         node --no-warnings scripts/validate-storyboard.mjs --selftest | tail -3
echo "[4/4] timeline vs snapshot";        node --no-warnings scripts/story-snapshot.mjs out/snap-now.json >/dev/null && python3 scripts/snapshot-diff.py tests/fixtures/tunguska-story.snapshot.json out/snap-now.json
echo "ALL TESTS PASSED"
