// YouTube uploader for the Inkfall channels. No npm deps (Node 20+ fetch).
// Secrets live OUTSIDE the repo in ~/.config/inkfall/ (override with INKFALL_YT_DIR):
//   client_secret.json        OAuth client from Google Cloud (web or desktop type)
//   token-<channel>.json      refresh token per channel, written by `auth` (chmod 600)
// Never print, commit or paste these files.
//
// usage:
//   node scripts/yt_upload.mjs auth   <channel>            one-time per channel (global | india): opens the browser; pick the right channel there
//   node scripts/yt_upload.mjs whoami <channel>            prints the channel the saved token uploads to
//   node scripts/yt_upload.mjs upload <channel> --file out/x.mp4 --title-file t.txt --desc-file d.txt
//        [--tags "a,b"] [--lang en|hi] [--category 27] [--privacy private|unlisted|public] [--publish-at 2026-11-03T08:00:00-05:00]
//        [--thumb brand/x.png] [--ai true] [--dry-run]
//   node scripts/yt_upload.mjs comment <channel> --video <id> --text-file pinned.txt   posts a top-level comment (pin it in the app)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { execFileSync } from "node:child_process";

const DIR = process.env.INKFALL_YT_DIR ?? path.join(os.homedir(), ".config/inkfall");
const PORT = Number(process.env.YT_PORT ?? 8765);
const REDIRECT = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.force-ssl"];

const die = (m) => { console.error(m); process.exit(1); };
const [cmd, channel, ...rest] = process.argv.slice(2);
if (!cmd || !channel) die("usage: yt_upload.mjs auth|whoami|upload|comment <global|india> [...]");
if (!/^[a-z0-9-]+$/.test(channel)) die("channel must be a short name like global or india");
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (!rest[i].startsWith("--")) die(`unexpected ${rest[i]}`);
  const k = rest[i].slice(2), v = rest[i + 1];
  if (v === undefined || v.startsWith("--")) args[k] = "true"; else { args[k] = v; i++; }
}

function client() {
  const p = path.join(DIR, "client_secret.json");
  if (!fs.existsSync(p)) die(`missing ${p} (OAuth client JSON from Google Cloud)`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const c = j.installed ?? j.web;
  if (!c) die("client_secret.json has no 'installed' or 'web' section");
  return c;
}
const tokPath = path.join(DIR, `token-${channel}.json`);

async function tokenReq(body) {
  const c = client();
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...body }),
  });
  const j = await r.json();
  if (!r.ok) die(`token error: ${j.error} ${j.error_description ?? ""}`);
  return j;
}

async function accessToken() {
  if (!fs.existsSync(tokPath)) die(`no token for '${channel}': run  node scripts/yt_upload.mjs auth ${channel}`);
  const t = JSON.parse(fs.readFileSync(tokPath, "utf8"));
  const j = await tokenReq({ grant_type: "refresh_token", refresh_token: t.refresh_token });
  return j.access_token;
}

async function api(method, url, at, body) {
  const r = await fetch(url, { method, headers: { authorization: `Bearer ${at}`, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) die(`${method} ${url.split("?")[0]} -> ${r.status} ${j.error?.message ?? ""}`);
  return j;
}
const myChannel = async (at) => (await api("GET", "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", at)).items?.[0];

async function auth() {
  const c = client();
  const state = Math.random().toString(36).slice(2);
  const url = `${c.auth_uri ?? "https://accounts.google.com/o/oauth2/v2/auth"}?` + new URLSearchParams({
    client_id: c.client_id, redirect_uri: REDIRECT, response_type: "code", scope: SCOPES.join(" "),
    access_type: "offline", prompt: "consent select_account", state,
  });
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== "/oauth2callback") { res.writeHead(404).end(); return; }
      const ok = u.searchParams.get("state") === state && u.searchParams.get("code");
      res.writeHead(200, { "content-type": "text/html" }).end(ok ? "<h2>Inkfall: signed in. You can close this tab.</h2>" : `<h2>Sign-in failed: ${u.searchParams.get("error") ?? "bad state"}</h2>`);
      srv.close();
      ok ? resolve(u.searchParams.get("code")) : reject(new Error(u.searchParams.get("error") ?? "bad state"));
    }).listen(PORT, "127.0.0.1", () => {
      console.log(`Opening the browser. Sign in, then CHOOSE THE '${channel}' CHANNEL when Google asks which account/channel.`);
      try { execFileSync("open", [url]); } catch { console.log(url); }
    });
    setTimeout(() => { srv.close(); reject(new Error("timed out after 5 min")); }, 300000).unref();
  }).catch((e) => die(`auth failed: ${e.message}`));
  const t = await tokenReq({ grant_type: "authorization_code", code, redirect_uri: REDIRECT });
  if (!t.refresh_token) die("Google returned no refresh token; remove the app at myaccount.google.com/permissions and run auth again");
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(tokPath, JSON.stringify({ refresh_token: t.refresh_token, scope: t.scope }), { mode: 0o600 });
  const ch = await myChannel(t.access_token);
  console.log(`saved token for '${channel}' -> channel: ${ch?.snippet?.title ?? "(none found)"} ${ch ? `(${ch.id})` : ""}`);
}

async function upload() {
  const file = args.file ?? die("--file required");
  if (!fs.existsSync(file)) die(`no such file ${file}`);
  const read = (k) => (args[k] ? fs.readFileSync(args[k], "utf8").trim() : undefined);
  const title = read("title-file") ?? args.title ?? die("--title-file or --title required");
  const description = read("desc-file") ?? args.description ?? "";
  if (title.length > 100) die(`title is ${title.length} chars (max 100)`);
  const privacy = args.privacy ?? "private";
  const status = { privacyStatus: args["publish-at"] ? "private" : privacy, selfDeclaredMadeForKids: false, containsSyntheticMedia: args.ai !== "false" };
  if (args["publish-at"]) status.publishAt = new Date(args["publish-at"]).toISOString();
  const lang = args.lang ?? "en";
  const meta = {
    snippet: { title, description, categoryId: args.category ?? "27", defaultLanguage: lang, defaultAudioLanguage: lang,
      tags: args.tags ? args.tags.split(",").map((s) => s.trim()).filter(Boolean) : undefined },
    status,
  };
  const at = await accessToken();
  const ch = await myChannel(at);
  const size = fs.statSync(file).size;
  console.log(`channel: ${ch?.snippet?.title}  file: ${file} (${(size / 1e6).toFixed(1)} MB)\ntitle: ${title}\nprivacy: ${status.privacyStatus}${status.publishAt ? `  publishAt: ${status.publishAt}` : ""}  lang: ${lang}  AI-altered: ${status.containsSyntheticMedia}`);
  if (args["dry-run"]) { console.log("dry run: nothing uploaded"); return; }

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: { authorization: `Bearer ${at}`, "content-type": "application/json; charset=UTF-8", "x-upload-content-type": "video/*", "x-upload-content-length": String(size) },
    body: JSON.stringify(meta),
  });
  if (!init.ok) die(`upload init -> ${init.status} ${(await init.json().catch(() => ({}))).error?.message ?? ""}`);
  const loc = init.headers.get("location");
  const up = await fetch(loc, { method: "PUT", headers: { "content-type": "video/*", "content-length": String(size) }, body: fs.readFileSync(file) });
  const v = await up.json().catch(() => ({}));
  if (!up.ok) die(`upload -> ${up.status} ${v.error?.message ?? ""}`);
  console.log(`UPLOADED id=${v.id}  https://youtube.com/shorts/${v.id}  status=${v.status?.privacyStatus}${v.status?.publishAt ? ` publishAt=${v.status.publishAt}` : ""}`);

  if (args.thumb) {
    const r = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${v.id}`, {
      method: "POST", headers: { authorization: `Bearer ${at}`, "content-type": "image/png" }, body: fs.readFileSync(args.thumb),
    });
    console.log(r.ok ? "thumbnail set" : `thumbnail not set (${r.status}; needs a verified channel, or Shorts ignore it): pick the cover in the app`);
  }
}

async function comment() {
  const video = args.video ?? die("--video required");
  const text = args["text-file"] ? fs.readFileSync(args["text-file"], "utf8").trim() : args.text ?? die("--text-file required");
  const at = await accessToken();
  const r = await api("POST", "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet", at,
    { snippet: { videoId: video, topLevelComment: { snippet: { textOriginal: text } } } });
  console.log(`comment posted (${r.id}); pin it in the YouTube app: comment ... > Pin`);
}

const run = { auth, whoami: async () => { const c = await myChannel(await accessToken()); console.log(`'${channel}' uploads to: ${c?.snippet?.title} (${c?.id})`); }, upload, comment }[cmd];
if (!run) die(`unknown command ${cmd}`);
await run();
