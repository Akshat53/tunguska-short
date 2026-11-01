#!/bin/bash
# usage: scripts/finish.sh <picture.mp4> <out.mp4> [intro_s=0.8] [outro_s=3]
# Builds the bookend sounds, then concatenates intro card + picture + outro card with audio (intro.wav + mix.wav + outro.wav).
# Needs: audio/out/mix.wav (score.py + finalize.sh), brand/card-intro.png, brand/card-outro.png, .venv with numpy/scipy.
set -e
PIC="$1"; OUT="$2"; ID="${3:-0.8}"; OD="${4:-3}"
(cd audio && ../.venv/bin/python bookends.py "$ID" "$OD")
FI=$(python3 -c "print(round($ID*30))")
ffmpeg -v error -y -loop 1 -framerate 30 -t "$ID" -i brand/card-intro.png -i "$PIC" -loop 1 -framerate 30 -t "$OD" -i brand/card-outro.png \
 -i audio/out/intro.wav -i audio/out/mix.wav -i audio/out/outro.wav -filter_complex \
 "[0:v]zoompan=z='1.08-0.08*min(on/$FI,1)':d=1:s=1080x1920:fps=30,fade=t=in:st=0:d=0.15:color=white,format=yuv420p,setsar=1[v0];[1:v]fps=30,format=yuv420p,setsar=1[v1];[2:v]zoompan=z='1+0.05*on/90':d=1:s=1080x1920:fps=30,format=yuv420p,setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v];[3:a][4:a][5:a]concat=n=3:v=0:a=1,aresample=48000[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf "${CRF:-16}" -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
echo "built $OUT"
