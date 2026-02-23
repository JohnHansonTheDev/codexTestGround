# Pocket Pixel // Game Boy Clone

This project is a static browser game (HTML + CSS + JS with React via ESM CDN), and is configured to deploy automatically to **GitHub Pages**.

## Run locally

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Run on GitHub Pages

1. Push this branch to GitHub.
2. In your repository, open **Settings → Pages**.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Run (or wait for) the **Deploy static site to GitHub Pages** workflow.
5. Your game will be available at:

```text
https://<your-github-username>.github.io/<your-repo-name>/
```

If your default branch is not `main`, update `.github/workflows/deploy-pages.yml` to match your branch name.
