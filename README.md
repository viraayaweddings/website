# Viraaya Weddings Website

Local production-ready clone of the Viraaya Weddings website.

## Requirements

- Node.js `>=22.13.0`
- npm

## Commands

```bash
npm install
npm run dev
npm run build
npm test
```

## Deployment

This working folder is synced to GitHub remote `origin` at `git@github-viraaya:viraayaweddings/website.git`.

The live Vercel project for `https://viraayaweddings.vercel.app/` is currently deploying from the `fix/audit-issues` branch. Keep future production changes on this branch and push with:

```bash
git push
```

## Project Layout

- `site-public/` contains the cloned HTML pages, images, fonts, CSS, scripts, and static assets served by the live site.
- `worker/` contains the Cloudflare Worker entry point and local calculator/search/form fallback endpoints.
- `app/` contains the minimal Vinext shell and metadata.
- `.openai/hosting.json` contains the Sites hosting project configuration.

The generated folders `dist/`, `.next/`, `.vinext/`, `.wrangler/`, `outputs/`, and the duplicate recovery `public/` folder are ignored and are not required in source control.
