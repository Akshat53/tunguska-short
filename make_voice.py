import asyncio, json, sys, subprocess
import edge_tts

RATE = sys.argv[1] if len(sys.argv) > 1 else "+12%"
VOICE = "en-US-ChristopherNeural"
TEXT = open("voice/narration.txt").read().strip()

async def main():
    words = []
    com = edge_tts.Communicate(TEXT, VOICE, rate=RATE, boundary="WordBoundary")
    with open("voice/voice.mp3", "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({
                    "word": chunk["text"],
                    "start": round(chunk["offset"] / 1e7, 3),
                    "end": round((chunk["offset"] + chunk["duration"]) / 1e7, 3),
                })
    json.dump(words, open("voice/words.json", "w"), indent=1)

asyncio.run(main())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", "voice/voice.mp3", "-ar", "44100", "-ac", "1", "voice/voice.wav"], check=True)
d = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "voice/voice.wav"], capture_output=True, text=True).stdout.strip()
print(f"RATE={RATE} DURATION={float(d):.2f}s WORDS={len(json.load(open('voice/words.json')))}")
