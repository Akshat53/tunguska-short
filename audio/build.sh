#!/bin/bash
# usage: bash audio/build.sh   -> score (music + cues) -> loudness normalise -> sync/quality report. Exit 1 if the report fails.
set -e; cd "$(dirname "$0")/.."
.venv/bin/python audio/cues.py
(cd audio && ../.venv/bin/python score.py)
bash audio/finalize.sh
.venv/bin/python audio/report.py
