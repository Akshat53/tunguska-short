// usage: node --env-file=.env.local scripts/make_voice_el.mjs <dir> <voiceId> [model=eleven_v4] [stability=0.6] [similarity=0.75]
// ElevenLabs counterpart of make_voice.py: reads <dir>/narration.txt -> <dir>/voice.mp3, voice.wav (44.1 kHz mono) and
// words.json ([{word,start,end}] in seconds, same format the warp/beat tools read), built from the character alignment.
// The key comes from ELEVENLABS_API_KEY (.env.local, loaded by --env-file); never put it in code.
// Then smooth it: .venv/bin/python scripts/tighten_pauses.py <dir>
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const [dir, voiceId, modelId = "eleven_v4", stab = "0.6", sim = "0.75"] = process.argv.slice(2);
if (!dir || !voiceId) { console.error("usage: make_voice_el.mjs <dir> <voiceId> [model] [stability] [similarity]"); process.exit(3); }
if (!process.env.ELEVENLABS_API_KEY) { console.error("ELEVENLABS_API_KEY missing: run with node --env-file=.env.local"); process.exit(3); }
const P = (n) => path.join(dir, n);
// '#' lines are comments; blank lines are beat breaks (kept as newlines, the model pauses on them)
const text = fs.readFileSync(P("narration.txt"), "utf8").split("\n").filter((l) => !l.trim().startsWith("#")).join("\n").trim();

const client = new ElevenLabsClient();
let res;
try {
  res = await client.textToSpeech.convertWithTimestamps(voiceId, {
    text, modelId, languageCode: "hi", outputFormat: "mp3_44100_128",
    voiceSettings: { stability: Number(stab), similarityBoost: Number(sim) },
  });
} catch (e) {
  console.error(`ElevenLabs error: ${e?.statusCode ?? ""} ${e?.message ?? e}`);
  process.exit(1);
}
fs.writeFileSync(P("voice.mp3"), Buffer.from(res.audioBase64, "base64"));

// characters -> words (split on whitespace; punctuation stays attached, like edge-tts words minus the marks)
const al = res.alignment ?? res.normalizedAlignment;
const words = [];
let cur = null;
al.characters.forEach((ch, i) => {
  if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } return; }
  const s = al.characterStartTimesSeconds[i], e = al.characterEndTimesSeconds[i];
  if (!cur) cur = { word: "", start: s, end: e };
  cur.word += ch; cur.end = e;
});
if (cur) words.push(cur);
const clean = words
  .map((w) => ({ word: w.word.replace(/[।,.?!…"'“”‘’]/g, ""), start: +w.start.toFixed(3), end: +w.end.toFixed(3) }))
  .filter((w) => w.word);
fs.writeFileSync(P("words.json"), JSON.stringify(clean, null, 1));

execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", P("voice.mp3"), "-ar", "44100", "-ac", "1", P("voice.wav")]);
const dur = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", P("voice.wav")]).toString().trim();
console.log(`VOICE=${voiceId} MODEL=${modelId} DURATION=${(+dur).toFixed(2)}s FRAMES=${Math.round(+dur * 30)} WORDS=${clean.length}`);
