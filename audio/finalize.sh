#!/bin/bash
# Two-pass ffmpeg loudnorm of the pre-mix to -14 LUFS integrated / -1.5 dBTP, 48 kHz stereo, exact picture length.
set -e
cd "$(dirname "$0")/out"
J=$(ffmpeg -hide_banner -i mix_pre.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
ffmpeg -hide_banner -y -i mix_pre.wav -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true:print_format=summary" -ar 48000 -c:a pcm_s24le mix.wav 2>&1 | grep -E "Input Integrated|Output Integrated|Output True Peak|Normalization Type"
