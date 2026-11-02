#!/bin/bash
# usage: scripts/finish.sh <picture.mp4> <out.mp4> [intro_s=0.8] [outro_s=3]
# Builds the bookend sounds, then concatenates intro card + picture + outro card with audio (intro.wav + mix.wav + outro.wav).
# Needs: audio/out/mix.wav (score.py + finalize.sh), brand/card-intro.png, brand/card-outro.png, .venv with numpy/scipy.
# env (all optional; defaults = the Tunguska setup): AUDIO_OUT=<dir with mix.wav, gets intro/outro.wav>, INTRO_CARD=, OUTRO_CARD=,
#   SIZE=540x960 (draft: cards scaled to the picture size), INTRO_STATIC=1 (hold the intro card perfectly still, no zoom / white fade: e.g. a thumbnail that must be pickable as the Shorts cover)
#   Opt-in "no intro" format (all unset = the original layout, unchanged): NO_INTRO=1 (no intro card: frame 0 is the picture),
#   PRE_OUTRO_CARD=<png> (a perfectly still card, e.g. the thumbnail, held just before the outro so it can be picked as the cover),
#   PRE_OUTRO_S=0.4 (its length, silent). Example: NO_INTRO=1 PRE_OUTRO_CARD=brand/<slug>-thumb.png PRE_OUTRO_S=0.4 ... finish.sh pic out 0 1.5
set -e
PIC="$1"; OUT="$2"; ID="${3:-0.8}"; OD="${4:-3}"
AO="${AUDIO_OUT:-audio/out}"; IC="${INTRO_CARD:-brand/card-intro.png}"; OC="${OUTRO_CARD:-brand/card-outro.png}"
[ "$AO" = "audio/out" ] || export AUDIO_OUT="$(cd "$AO" && pwd)"
BI="$ID"; [ -n "$NO_INTRO" ] && BI=1.0   # no intro card: intro.wav is still written (unused)
(cd audio && ../.venv/bin/python bookends.py "$BI" "$OD")
SZ="${SIZE:-1080x1920}"; PS=""; [ -n "$SIZE" ] && PS="scale=${SIZE/x/:}:flags=lanczos,"
if [ -n "$NO_INTRO" ] || [ -n "$PRE_OUTRO_CARD" ]; then
  # opt-in layout: [intro card] + picture + [still pre-outro card] + outro card, audio [intro.wav] + mix.wav + [silence] + outro.wav
  PO="${PRE_OUTRO_S:-0.4}"; IN=(); VF=""; AF=""; VL=""; AL=""; n=0
  A0="aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo"
  if [ -z "$NO_INTRO" ]; then
    FI=$(python3 -c "print(round($ID*30))")
    V0="zoompan=z='1.08-0.08*min(on/$FI,1)':d=1:s=$SZ:fps=30,fade=t=in:st=0:d=0.15:color=white"
    [ -n "$INTRO_STATIC" ] && V0="scale=${SZ/x/:}:flags=lanczos,fps=30"
    IN+=(-loop 1 -framerate 30 -t "$ID" -i "$IC" -i "$AO/intro.wav")
    VF+="[$n:v]$V0,format=yuv420p,setsar=1[v$n];"; AF+="[$((n+1)):a]$A0[a$n];"; VL+="[v$n]"; AL+="[a$n]"; n=$((n+2))
  fi
  IN+=(-i "$PIC" -i "$AO/mix.wav")
  VF+="[$n:v]fps=30,${PS}format=yuv420p,setsar=1[v$n];"; AF+="[$((n+1)):a]$A0[a$n];"; VL+="[v$n]"; AL+="[a$n]"; n=$((n+2))
  if [ -n "$PRE_OUTRO_CARD" ]; then
    IN+=(-loop 1 -framerate 30 -t "$PO" -i "$PRE_OUTRO_CARD" -f lavfi -t "$PO" -i "anullsrc=r=48000:cl=stereo")
    VF+="[$n:v]scale=${SZ/x/:}:flags=lanczos,fps=30,format=yuv420p,setsar=1[v$n];"; AF+="[$((n+1)):a]$A0[a$n];"; VL+="[v$n]"; AL+="[a$n]"; n=$((n+2))
  fi
  IN+=(-loop 1 -framerate 30 -t "$OD" -i "$OC" -i "$AO/outro.wav")
  VF+="[$n:v]zoompan=z='1+0.05*on/90':d=1:s=$SZ:fps=30,format=yuv420p,setsar=1[v$n];"; AF+="[$((n+1)):a]$A0[a$n];"; VL+="[v$n]"; AL+="[a$n]"; n=$((n+2))
  k=$((n/2))
  ffmpeg -v error -y "${IN[@]}" -filter_complex "$VF$AF${VL}concat=n=$k:v=1:a=0[v];${AL}concat=n=$k:v=0:a=1,aresample=48000[a]" \
   -map "[v]" -map "[a]" -c:v libx264 -crf "${CRF:-16}" -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
  echo "built $OUT"; exit 0
fi
FI=$(python3 -c "print(round($ID*30))")
V0="zoompan=z='1.08-0.08*min(on/$FI,1)':d=1:s=$SZ:fps=30,fade=t=in:st=0:d=0.15:color=white"
[ -n "$INTRO_STATIC" ] && V0="scale=${SZ/x/:}:flags=lanczos,fps=30"
ffmpeg -v error -y -loop 1 -framerate 30 -t "$ID" -i "$IC" -i "$PIC" -loop 1 -framerate 30 -t "$OD" -i "$OC" \
 -i "$AO/intro.wav" -i "$AO/mix.wav" -i "$AO/outro.wav" -filter_complex \
 "[0:v]$V0,format=yuv420p,setsar=1[v0];[1:v]fps=30,${PS}format=yuv420p,setsar=1[v1];[2:v]zoompan=z='1+0.05*on/90':d=1:s=$SZ:fps=30,format=yuv420p,setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0[v];[3:a][4:a][5:a]concat=n=3:v=0:a=1,aresample=48000[a]" \
 -map "[v]" -map "[a]" -c:v libx264 -crf "${CRF:-16}" -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
echo "built $OUT"
