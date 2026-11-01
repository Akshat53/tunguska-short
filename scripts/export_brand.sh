#!/bin/bash
# usage: bash scripts/export_brand.sh [name ...]      (no names = all)
# Renders brand/src/<name>.html -> brand/<name>.png with headless Google Chrome (fonts load from Google Fonts, so be online).
# Size comes from the html/body width+height in each file. Watermarks render with a transparent background.
# To make a new thumbnail: copy brand/src/roopkund-thumb.html to brand/src/<story>-thumb.html, edit the text/SVG, run this.
set -e; cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Google Chrome not found; set CHROME=/path/to/chrome"; exit 1; }
PROFILE=$(mktemp -d)
names=("$@"); [ ${#names[@]} -eq 0 ] && names=($(ls brand/src/*.html | xargs -n1 basename | sed 's/\.html$//'))
for n in "${names[@]}"; do
  f="brand/src/$n.html"; [ -f "$f" ] || { echo "missing $f"; exit 1; }
  w=$(grep -o 'width:[0-9]*px' "$f" | head -1 | tr -dc 0-9); h=$(grep -o 'height:[0-9]*px' "$f" | head -1 | tr -dc 0-9)
  bg=(); [[ $n == watermark-* ]] && bg=(--default-background-color=00000000)
  perl -e 'alarm 60; exec @ARGV' "$CHROME" --headless=new --hide-scrollbars "${bg[@]}" --user-data-dir="$PROFILE" \
    --window-size="$w,$h" --virtual-time-budget=5000 --screenshot="$PWD/brand/$n.png" "file://$PWD/$f" >/dev/null 2>&1
  echo "brand/$n.png ${w}x${h}"
done
rm -rf "$PROFILE"
