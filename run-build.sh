#!/bin/bash
cd /home/ubuntu/projects/tunguska-short
export TEMP=/home/ubuntu/projects/tunguska-short/.tmp
export TMPDIR="$TEMP"
mkdir -p "$TEMP" output/checks
[ -d .git ] || git init -q
echo "=== build start $(date -u +%FT%TZ) ===" >> build.log
claude -p "$(cat BRIEF.md)" --model opus --max-turns 250 --dangerously-skip-permissions 2>&1 | tee -a build.log
echo "EXIT=$? $(date -u +%FT%TZ)" | tee -a build.log
