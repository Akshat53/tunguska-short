# usage: python make_voice.py [dir=voice] [voice=en-US-ChristopherNeural] [rate=+12%]
# Reads <dir>/narration.txt -> <dir>/voice.mp3, voice.wav (44.1 kHz mono), words.json (word timings).
# Hindi voices: hi-IN-MadhurNeural, hi-IN-SwaraNeural. List all: edge-tts --list-voices
import asyncio, json, sys, subprocess, os
import edge_tts

D = sys.argv[1] if len(sys.argv) > 1 else "voice"
VOICE = sys.argv[2] if len(sys.argv) > 2 else "en-US-ChristopherNeural"
RATE = sys.argv[3] if len(sys.argv) > 3 else "+12%"
P = lambda n: os.path.join(D, n)
TEXT = open(P("narration.txt"), encoding="utf-8").read().strip()

async def main():
    words = []
    com = edge_tts.Communicate(TEXT, VOICE, rate=RATE, boundary="WordBoundary")
    with open(P("voice.mp3"), "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({
                    "word": chunk["text"],
                    "start": round(chunk["offset"] / 1e7, 3),
                    "end": round((chunk["offset"] + chunk["duration"]) / 1e7, 3),
                })
    json.dump(words, open(P("words.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)

asyncio.run(main())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", P("voice.mp3"), "-ar", "44100", "-ac", "1", P("voice.wav")], check=True)
d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", P("voice.wav")], capture_output=True, text=True).stdout.strip()
print(f"VOICE={VOICE} RATE={RATE} DURATION={float(d):.2f}s FRAMES={round(float(d)*30)} WORDS={len(json.load(open(P('words.json'), encoding='utf-8')))}")
