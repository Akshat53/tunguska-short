#!/bin/bash
# usage: scripts/qa.sh <final.mp4> [outdir=out/qa]  -> quality gate: size, duration, audio stream, loudness, contact sheet
set -e
V="$1"; O="${2:-out/qa}"; mkdir -p "$O"
echo "== streams"; ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate -of csv=p=0 "$V"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$V"); echo "duration=$D (target 55-72s)"
L=$(ffmpeg -hide_banner -i "$V" -map 0:a:0 -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | sed 's/.*: "\(.*\)".*/\1/'); echo "loudness=$L LUFS (target -14)"
ffmpeg -v error -y -i "$V" -vf "fps=1/6,scale=216:-1,tile=12x1" -frames:v 1 "$O/sheet.jpg" && echo "contact sheet: $O/sheet.jpg (LOOK AT IT: blur, black voids, wrong colours)"
