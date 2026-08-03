# dr1pd.com — GitHub Pages deploy

Clean-URL structure: each page is a folder with an index.html.

- / → Index
- /q/ → Quant
- /c/ → Create
- /r/ → Résumé

## Deploy
1. Create a repo (e.g. `dr1pd-site`) and push the CONTENTS of this folder to the `main` branch root.
2. Repo Settings → Pages → Source: Deploy from a branch → `main` / `root`.
3. Custom domain: enter `dr1pd.com` (the CNAME file here keeps it pinned). At your DNS provider, add:
   - A records for apex `dr1pd.com`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - CNAME `www` → `<your-username>.github.io`
4. Enable "Enforce HTTPS" once the cert issues (a few minutes).

## Later
- Drop your hero b-roll in as `broll.mp4` at the repo root.
- File limit is 100 MB — if the b-roll is bigger, compress or host it elsewhere.
