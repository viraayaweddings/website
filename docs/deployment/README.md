# Deployment

> **Status:** Partially documented in [Architecture](../01-architecture.md) and [Configuration](../09-configuration.md).

---

## Primary: OpenAI Sites / Cloudflare Workers

1. `npm run build`
2. Deploy `dist/` via OpenAI Sites platform
3. Bindings from `.openai/hosting.json`

## Secondary: Vercel

`vercel.json` present but not primary target.

---

## To Document Later

- Step-by-step deployment guide
- Environment setup per stage
- Rollback procedures
- D1 migration in production
