# Paytm PG — UAT Issue Report

Static, no-build report site (vanilla HTML/CSS/JS). Reads gap rows live from Google Sheet
`1taeplqlRJGmUUCkMzvc2wzhCvcmkzGnvjbLDrYxPFqg` (tab **Gaps**) via the gviz CSV endpoint.
Config constants (`SHEET_ID`, `SHEET_TAB`) are at the top of `app.js`.

- `index.html` – live data · `index.html?demo=1` – clearly labelled example data
- `?theme=dark|light` forces a theme (otherwise follows the toggle / `prefers-color-scheme`).

## 1. Publish on GitHub Pages
```bash
cd pg-uat-report
git init && git add index.html app.js styles.css README.md
git commit -m "Design gap report"
git branch -M main
git remote add origin https://github.com/<org-or-user>/<repo>.git
git push -u origin main
```
Then on GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**.
After ~1 min the site is at `https://<org-or-user>.github.io/<repo>/`.
Local preview: `python3 -m http.server 8000` → http://localhost:8000/?demo=1

## 2. Sharing required for live data
The browser fetches the sheet anonymously, so the Sheet and the media files must be
**Anyone with the link → Viewer** (media lives in PG UAT › *Slack Media*:
https://drive.google.com/drive/folders/1UB5ISj21TGFO1IJqk8C3tTbI7Y__Rg1a).
Until then the page shows an explanatory error and images fall back to link tiles.

## 3. Sheet schema (tab "Gaps")
Columns are matched **by header name**, so order can change and extra columns are ignored:

| Col | Header | Values |
|---|---|---|
| A | ID | e.g. PG-012 |
| B | Date Reported | yyyy-mm-dd |
| C | Reported By | |
| D | Journey | |
| E | Screen | |
| F | Issue | |
| G | Platform | Android / iOS / Both (dropdown) |
| H | Suggested Improvement | |
| I | Severity | Critical / High / Medium / Low (dropdown) |
| J | Theme | Light / Dark / Both (dropdown) |
| K | Media Status | Attached / Not required (dropdown) |
| L | Media Links | one or more Drive links, one per line |
| M | Status | Open / In Progress / Fixed / Won't Fix (dropdown) |
| N | Owner | |
| O | Slack Link | permalink to the #uat message |
| P | Notes | |

Slack #uat post → row mapping: Journey→D, Screen→E, Issue→F, "Android or apple"→G, Suggested improvement→H,
Severity→I, dark/light/both→J, Screenshot/Video→K. Upload Slack attachments to *Slack Media*, then paste
their Drive links (`/file/d/<id>/view`) into L.

**Media rendering:** each link is shown as a Drive thumbnail. A link is treated as a **video** (play tile that
opens Drive) if its line contains the word `video` or ends in `.mp4/.mov/.m4v/.webm` — e.g. write
`video: https://drive.google.com/file/d/<id>/view`. If a thumbnail fails it becomes a link tile.
When Media Status is *Not required* no media placeholder is shown.
The two rows marked EXAMPLE in the sheet are samples — delete them once real data is added.

## 4. Confidentiality
"Anyone with the link" plus a public GitHub Pages site means **anyone who finds the URL can read the
sheet and screenshots**, and the sheet ID is visible in the page source. Do not include customer data,
PII, real card/UPI/account numbers, internal URLs, or unreleased-feature details you can't expose.
Prefer a private repo with Pages restricted to the org (GitHub Enterprise) or an internal host,
mask screenshots, and revoke link sharing when UAT ends.
