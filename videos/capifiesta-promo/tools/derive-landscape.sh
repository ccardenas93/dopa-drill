#!/usr/bin/env bash
# 16:9 version for YouTube: the vertical render centred on the brand blue with
# the logo on both sides (brand pillarbox). Usage: bash tools/derive-landscape.sh
set -euo pipefail
cd "$(dirname "$0")/.."
IN=${1:-renders/video.mp4}
OUT=${2:-renders/video-16x9.mp4}
LOGO=${3:-assets/logo-transparent.png}
ffmpeg -y -i "$IN" -loop 1 -i "$LOGO" -filter_complex "\
color=c=0x3b6bff:s=1920x1080:r=30[bg0];\
[bg0]drawgrid=w=30:h=30:t=1:c=white@0.12[bg];\
[1:v]scale=420:-1,split[lg1][lg2];\
[bg][lg1]overlay=x=100:y=(H-h)/2[bgl];\
[bgl][lg2]overlay=x=W-w-100:y=(H-h)/2[bglr];\
[0:v]scale=-2:1080[fg];\
[bglr][fg]overlay=x=(W-w)/2:y=0:shortest=1[v]" \
  -map "[v]" -map 0:a -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart "$OUT"
echo "wrote $OUT"
