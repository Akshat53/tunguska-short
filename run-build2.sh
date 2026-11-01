#!/bin/bash
cd /home/ubuntu/projects/tunguska-short
export TEMP=/home/ubuntu/projects/tunguska-short/.tmp
export TMPDIR="$TEMP"
mkdir -p "$TEMP" output/checks
echo "=== redirect run start $(date -u +%FT%TZ) ===" >> build.log
claude -p "$(cat REDIRECT.md)" --continue --model opus --max-turns 200 --dangerously-skip-permissions 2>&1 | tee -a build.log
echo "EXIT=$? $(date -u +%FT%TZ)" | tee -a build.log
