#!/bin/bash
# usage: bash blender/build.sh [prop ...]   (no names = every blender/props/*.py) -> public/props/<prop>.png
set -e; cd "$(dirname "$0")/.."
BL="${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}"
[ -x "$BL" ] || { echo "Blender not found; brew install --cask blender (or set BLENDER=...)"; exit 1; }
mkdir -p public/props
names=("$@"); [ ${#names[@]} -eq 0 ] && names=($(ls blender/props/*.py | xargs -n1 basename | sed 's/\.py$//'))
for n in "${names[@]}"; do
  "$BL" -b -P "blender/props/$n.py" -- "$PWD/public/props/$n.png" "${SIZE:-1400}" 2>&1 | grep -E "Saved|Error|Traceback" || true
  .venv/bin/python blender/crop.py "public/props/$n.png"
done
