import { readdir, readFile } from "node:fs/promises";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: "require" });

function decode(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extract(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']/i);
  const cityId = html.match(/<input[^>]*name=["']city_ids\[\]["'][^>]*value=["']([^"']*)["']/i)
    || html.match(/<input[^>]*value=["']([^"']*)["'][^>]*name=["']city_ids\[\]["']/i);
  const summary = html.match(/Showing\s+[\d\s]*-\s*[\d\s]*of\s*([\d,]+)/i);
  const cards = (html.match(/class="hotel-card"/g) || []).length;
  return {
    seoTitle: title ? decode(title[1]) : "",
    metaDescription: desc ? decode(desc[1]) : "",
    cityId: cityId ? cityId[1].trim() : "",
    summaryTotal: summary ? Number(summary[1].replace(/[^\d]/g, "")) : null,
    cards,
  };
}

try {
  const dirs = (await readdir("site-public/destination-wedding", { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const rows = await sql`select * from city_pages`;
  const existing = new Map(rows.map((r) => [r.city, r]));

  const out = [];
  let mismatches = 0;
  for (const city of dirs) {
    let html;
    try {
      html = await readFile(`site-public/destination-wedding/${city}/index.html`, "utf8");
    } catch {
      continue;
    }
    const got = extract(html);
    const row = existing.get(city);
    out.push({ city, ...got, hasRow: Boolean(row) });
    if (row) {
      const diffs = [];
      if (decode(row.seo_title) !== got.seoTitle) diffs.push(`title: db=${JSON.stringify(row.seo_title)} file=${JSON.stringify(got.seoTitle)}`);
      if (decode(row.meta_description) !== got.metaDescription) diffs.push("description differs");
      if (String(row.city_id) !== got.cityId) diffs.push(`cityId: db=${row.city_id} file=${got.cityId}`);
      if (diffs.length) {
        mismatches += 1;
        if (mismatches <= 6) console.log(`MISMATCH ${city}: ${diffs.join(" | ")}`);
      }
    }
  }
  console.log(`\nextracted ${out.length} cities; ${mismatches} disagree with the stored row`);
  console.log("\nthe missing thirteen:");
  for (const r of out.filter((r) => !r.hasRow)) {
    console.log(`  ${r.city.padEnd(13)} id=${r.cityId.padEnd(4)} cards=${String(r.cards).padEnd(3)} summary=${r.summaryTotal} :: ${r.seoTitle.slice(0, 58)}`);
  }
  const noId = out.filter((r) => !r.cityId);
  if (noId.length) console.log(`\nno city id found in the file: ${noId.map((r) => r.city).join(", ")}`);
} finally {
  await sql.end({ timeout: 5 });
}
