#!/bin/bash
# usage: scripts/mux.sh <video.mp4> <out.mp4> : picture + final mix (audio/out/mix.wav), AAC 48 kHz, prints duration + loudness
set -e
ffmpeg -v error -y -i "$1" -i audio/out/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$2"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$2")
A=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$2")
L=$(ffmpeg -hide_banner -i "$2" -map 0:a:0 -af loudnorm=print_format=json -f null - 2>&1 | grep '"input_i"' | sed 's/.*: "\(.*\)".*/\1/')
echo "MUX $2 duration=$D audio=$A lufs=$L"
