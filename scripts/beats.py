# usage: python3 scripts/beats.py <words.json> [fps=30]
# Prints every word with its start frame, plus a line break at each sentence end, so shot cuts in a story's
# timeline can be placed on the voice (frame = round(start * fps)).
import json, sys
words = json.load(open(sys.argv[1], encoding="utf-8")); fps = int(sys.argv[2]) if len(sys.argv) > 2 else 30
line = []
for w in words:
    line.append(f"{w['word']}@{round(w['start']*fps)}")
    if w["word"].rstrip().endswith((".", "?", "!", "।", "—")):
        print(" ".join(line)); line = []
if line: print(" ".join(line))
print(f"\nTOTAL FRAMES ≈ {round(words[-1]['end']*fps)+15}")
