# Paytm — Figma vs Live Design Gap Report

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
The browser fetches the sheet anonymously, so:
1. Sheet → **Share → General access → Anyone with the link → Viewer**.
2. Drive folders → same setting for both:
   - Figma screenshots: https://drive.google.com/drive/folders/1it0ZqZpM5CPM6kzx2hANCu6VRmzzz0bz
   - Live screenshots: https://drive.google.com/drive/folders/1lWAg6XX4pEME-rGIXGyYrpepU60kT-i-
Until then the page shows an explanatory error, and images show placeholders.

## 3. Adding a gap
1. Upload the Figma export to the Figma folder and the device screenshot to the Live folder
   (suggested names: `PG-012_figma.png`, `PG-012_live.png`).
2. For each file: right-click → **Share → Copy link** (format `https://drive.google.com/file/d/<id>/view`).
3. Add a row in the **Gaps** tab, columns in this order:
   `ID | Screen / Page | Component | Theme (Light/Dark) | Figma Expected | Live Actual | Severity (High/Medium/Low) | Owner | Status (Open/In Progress/Fixed/Won't Fix) | Figma Frame Link | Figma Screenshot (Drive link) | Live Screenshot (Drive link) | Notes`
4. Reload the page (Sheets' gviz endpoint can cache for a minute or two).
Drive links in `/file/d/<id>/view`, `open?id=<id>` or `uc?id=<id>` form are auto-converted to thumbnails.

## 4. Confidentiality
"Anyone with the link" plus a public GitHub Pages site means **anyone who finds the URL can read the
sheet and screenshots**, and the sheet ID is visible in the page source. Do not include customer data,
PII, real card/UPI/account numbers, internal URLs, or unreleased-feature details you can't expose.
Prefer a private repo with Pages restricted to the org (GitHub Enterprise) or an internal host,
mask screenshots, and revoke link sharing when UAT ends.
