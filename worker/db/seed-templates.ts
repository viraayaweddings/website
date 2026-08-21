/**
 * Seeds page shells from the generated template bundle.
 */
import { inArray } from "drizzle-orm";
import type { Db } from "./client";
import { pageTemplates } from "./schema";
import { PAGE_TEMPLATES } from "./page-templates.generated";

/** Inserts any shell that is not already stored. Safe to run repeatedly. */
export async function seedPageTemplates(db: Db): Promise<void> {
  const keys = PAGE_TEMPLATES.map((template) => template.key);
  if (!keys.length) return;

  const existing = await db
    .select({ key: pageTemplates.key })
    .from(pageTemplates)
    .where(inArray(pageTemplates.key, keys));
  const stored = new Set(existing.map((row) => row.key));
  const missing = PAGE_TEMPLATES.filter((template) => !stored.has(template.key));
  if (!missing.length) return;

  const now = new Date();
  for (const template of missing) {
    try {
      await db
        .insert(pageTemplates)
        .values({
          key: template.key,
          kind: template.kind,
          html: template.html,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: pageTemplates.key,
          set: { kind: template.kind, html: template.html, updatedAt: now },
        });
    } catch (error) {
      console.error(
        `[templates] could not seed ${template.key}`,
        error instanceof Error ? error.message : error,
      );
    }
  }
}
