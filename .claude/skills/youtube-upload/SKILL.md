---
name: youtube-upload
description: Upload a finished Inkfall Short to YouTube (global @inkfallshorts or Inkfall India) with title, description, tags, AI-content flag and optional schedule. Use when the owner asks to upload, publish, post or schedule a video.
---

# Upload a Short to YouTube

Tool: `scripts/yt_upload.mjs` (no npm deps). Secrets live outside the repo in `~/.config/inkfall/`
(`client_secret.json`, `token-global.json`, `token-india.json`). Never print, cat, commit or paste them, and never
accept a key or token pasted in chat.

## 1. Check sign-in
```bash
node scripts/yt_upload.mjs whoami global     # or india
```
If it says "no token", the owner must sign in once (a browser opens; they pick the channel):
`node scripts/yt_upload.mjs auth global`. Run it yourself; tell them to choose the right channel in the browser.
If it fails with `redirect_uri_mismatch`, `access_denied` or "API not enabled", give them the fix from section 4.

## 2. Confirm with the owner BEFORE uploading (outward-facing action)
Show in one short block: channel (from `whoami`), file, title, privacy/schedule, language, and ask "upload?".
Defaults: global -> `--lang en`, title/description from `out/upload/<slug>-title.txt` / `-description.txt`;
india -> `--lang hi`, text from section J of the story's `script.md` (write it to `out/upload/` first, add `#Shorts`).
Run `--dry-run` first; it prints exactly what will be sent.

## 3. Upload
```bash
node scripts/yt_upload.mjs upload global --file out/<slug>/<slug>-en-final.mp4 \
  --title-file out/upload/<slug>-title.txt --desc-file out/upload/<slug>-description.txt \
  --tags "tag one,tag two" --lang en [--privacy private|unlisted|public] [--publish-at 2026-11-03T08:00:00-05:00] [--thumb brand/<slug>-thumb.png]
```
- Always set: not made for kids, category 27 (Education), AI-altered content = true (done by default).
- `--publish-at` schedules (video stays private until then).
- Report back the `https://youtube.com/shorts/<id>` link.
- Pinned comment: after the video is public, `node scripts/yt_upload.mjs comment global --video <id> --text-file out/upload/<slug>-pinned.txt`,
  then the owner pins it in the app (the API cannot pin). Comments fail on private/scheduled videos.
- Cover: Shorts usually ignore API thumbnails; our finals open on the thumbnail, so the owner picks the first frame in the app.

## 4. Known limits / owner fixes
- **Unverified Google Cloud project:** every API upload is locked to **private** until the project passes YouTube's
  API audit (form: https://support.google.com/youtube/contact/yt_api_form). Until then: upload, then the owner sets
  Public/Schedule in Studio (one tap). Say this when a public or scheduled upload comes back private.
- **OAuth app in "Testing" mode:** the owner's Google account must be a Test user, and tokens expire after 7 days
  (re-run `auth`). Publishing the consent screen to "In production" removes the 7-day limit.
- `redirect_uri_mismatch`: add `http://localhost:8765/oauth2callback` as an Authorized redirect URI on the OAuth client.
- Quota: 10,000 units/day; one upload costs 1,600, so about 6 uploads a day.
