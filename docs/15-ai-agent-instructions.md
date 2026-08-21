# Instructions for Future AI Coding Agents

How to use this documentation system when modifying the codebase.

---

## Before Making Changes

1. **Read the Master Documentation** starting at [docs/README.md](./README.md)
2. **Locate the feature/module** in the documentation hierarchy:
   - Admin feature → [02-admin/](./02-admin/README.md)
   - API change → [04-api.md](./04-api.md)
   - Database change → [05-database.md](./05-database.md)
   - Auth change → [06-auth.md](./06-auth.md)
3. **Review dependencies** in [12-dependency-map.md](./12-dependency-map.md)
4. **Check change impact** in [13-change-impact.md](./13-change-impact.md)
5. **Identify documented files** in [11-file-index.md](./11-file-index.md) — do not broad-search the repo if docs already list the files

---

## During Changes

1. **Follow existing conventions** — match naming, patterns, and abstractions in surrounding code
2. **Minimal scope** — only change what's required for the task
3. **Do not fix unrelated issues** unless explicitly asked
4. **Reference documented workflows** in [07-workflows.md](./07-workflows.md) to understand side effects

---

## After Making Changes

1. **Update Master Documentation** for any change to:
   - Routes, pages, or API endpoints
   - Server actions or their validation
   - Form fields
   - Database schema (tables, columns, relationships)
   - Auth/permission rules
   - External integrations or env vars
   - Reusable components
   - Workflows or business rules

2. **Run documentation sync:**
   ```bash
   npm run docs:sync
   ```

3. **Verify synchronization:**
   ```bash
   npm run docs:validate
   ```
   Target: **Documentation Sync Status: PASS**

4. **Report remaining gaps** if validation fails or items could not be verified

---

## Documentation Update Checklist

When you add or modify code, update these sections as applicable:

| Change type | Update |
| --- | --- |
| New admin page | `02-admin/routes.md`, `02-admin/README.md`, `03-routes.md` |
| New server action | `02-admin/actions.md`, `04-api.md` |
| New form field (admin) | `02-admin/forms.md` |
| New public static page | `public-site/routes.md`, `public-site/page-types.md` |
| New public form | `public-site/forms.md`, `04-api.md` |
| Public JS change | `public-site/javascript.md` |
| Injection handler change | `public-site/rendering.md`, `backend/README.md` |
| Calculator/search change | `public-site/search-calculator.md`, `04-api.md` |
| Admin content affecting public site | `public-site/website-admin-map.md` |
| New DB table/column | `05-database.md`, run migration |
| New API endpoint | `03-routes.md`, `04-api.md` |
| SEO/metadata change | `public-site/seo.md` |
| New component (admin) | `10-components.md`, `11-file-index.md` |
| Auth change | `06-auth.md` |
| New env var | `09-configuration.md`, `.env.example` |
| New integration | `08-integrations.md` |
| Workflow change | `07-workflows.md`, `public-site/workflows.md` |
| Security change | `security/README.md` |

---

## What NOT to Document in Master Docs

- Bug reports or recommendations → [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md)
- Hypothetical future features
- Assumed functionality not verified in code

---

## Search Strategy

**Prefer documentation lookup over codebase search:**

1. Check [docs/README.md](./README.md) table of contents
2. **Website feature?** → [public-site/README.md](./public-site/README.md)
3. **Admin feature?** → [02-admin/README.md](./02-admin/README.md)
4. **Admin → site impact?** → [public-site/website-admin-map.md](./public-site/website-admin-map.md)
5. Check [11-file-index.md](./11-file-index.md) for file paths
6. Check [public-site/forms.md](./public-site/forms.md) for public forms
7. Check [02-admin/actions.md](./02-admin/actions.md) for server actions
8. Check [05-database.md](./05-database.md) for schema
9. Only then search the codebase for undocumented details

---

## Schema Changes

1. Edit `worker/db/schema.ts`
2. Generate migration: `npx drizzle-kit generate`
3. Add import to `worker/db/migrations.ts`
4. Update admin forms/actions if needed
5. Update injection handlers if public rendering affected
6. Update `05-database.md`
7. Run `npm run docs:sync`

---

## Limitations of Automated Sync

The sync system can:
- Detect new routes, actions, and DB tables via code scan
- Validate that documented entities appear in docs text
- Track git commit drift

The sync system cannot:
- Automatically write prose documentation for new features
- Verify behavioral correctness of documentation
- Detect semantic changes to existing documented items

**AI agents and developers must manually update documentation content when behavior changes.**

---

## Audit Findings

Issues, bugs, and recommendations are in [AUDIT-FINDINGS.md](./AUDIT-FINDINGS.md). Do not conflate these with how the system currently works. Fix issues only when explicitly requested.
