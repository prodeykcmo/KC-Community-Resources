# Community Resource Finder (Simple)

A very simple static site (GitHub Pages) that reads your published Google Sheets CSV and shows:
- Language selector (UI)
- Category filter (Immigration & ICE first)
- Search
- Verification filter
- Per-resource handout page (print / save as PDF)

## 1) Publish your sheet as CSV
In Google Sheets:
File → Share → Publish to web → choose the sheet **FIND RESOURCES (TRANSLATED)** → format **CSV** → Publish.
Copy the CSV URL.

## 2) Configure the site
Open `scripts/config.js` and paste your URLs:
- DIRECTORY_CSV_URL: the published CSV URL
- SUBMIT_UPDATE_URL: your Google Form link (optional)

## 3) Deploy to GitHub Pages
- Create a new GitHub repo
- Upload the contents of this folder (not the zip itself)
- Repo Settings → Pages → Build and deployment: Deploy from branch → `main` / root
- Your site will be live at `https://<username>.github.io/<repo>/`

## Notes
- This template expects your CSV already includes a translated column ("Information (Translated)") based on your language selection in Sheets.
- If you later move to a separate Translations CSV (multiple translations per resource), we can upgrade the site to join translations by Org ID + Language.
