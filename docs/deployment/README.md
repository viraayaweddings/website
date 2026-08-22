# Deployment

> **Status:** Partially documented in [Architecture](../01-architecture.md) and [Configuration](../09-configuration.md).

---

## Vercel

1. `npm run build`
2. Vercel deploys `.vercel/output` directly (Build Output API)
3. Bindings from `.openai/hosting.json`

## Secondary: Vercel

`vercel.json` present but not primary target.

---

## To Document Later

- Step-by-step deployment guide
- Environment setup per stage
- Rollback procedures
- Postgres migrations, applied on first request per instance
