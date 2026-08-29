/**
 * Replaces a confirmed set of branded hotel social images with each venue's
 * existing banner, then removes the obsolete objects from R2 and `media`.
 *
 * The operation is deliberately idempotent. Deployment can retry safely after
 * a network failure, and an unexpected reference stops deletion rather than
 * leaving a live page with a missing image.
 */
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import postgres from "postgres";

const apply = process.argv.includes("--apply");
const ifConfigured = process.argv.includes("--if-configured");

const WATERMARK_KEYS = [
  "legacy/037a81dbe22db6b6.png",
  "legacy/0454541679de7e1e.png",
  "legacy/04a7dc97b4f257ca.png",
  "legacy/090b5847f294e3c6.jpg",
  "legacy/0a709cd7c1846072.png",
  "legacy/100e0a7ab646ca28.png",
  "legacy/1412785aeee5e07f.png",
  "legacy/15842b8b2b9b629f.png",
  "legacy/16615d9292979985.png",
  "legacy/2d5f00c877e99289.jpg",
  "legacy/2e10a74a4b819d46.png",
  "legacy/2edc9752793bf812.png",
  "legacy/31205e22e6332059.png",
  "legacy/3b2484f65f522569.png",
  "legacy/3b668e9ad516de4a.jpg",
  "legacy/3de3d73e1957894f.png",
  "legacy/3dfb3c1c8b23f1ed.png",
  "legacy/467bea5663aec4bd.png",
  "legacy/4be3c7915d73cc57.jpg",
  "legacy/5a79ecd7713e32cc.png",
  "legacy/5a97d5b73ed591d3.jpg",
  "legacy/5f2690156d4c5ec2.png",
  "legacy/5f9250eb5ea738e1.png",
  "legacy/658e094f9891fffa.jpg",
  "legacy/67e2bc024cfde8ce.png",
  "legacy/70f792fc4087757a.jpg",
  "legacy/767e4024c9588bf4.jpg",
  "legacy/78a30261ad93f6de.png",
  "legacy/8132c89e4dbe09e2.png",
  "legacy/827e2920b7e8cf76.png",
  "legacy/8944934004dbcd92.png",
  "legacy/90badcd3c4ca89b9.jpg",
  "legacy/9906de4b02f79369.png",
  "legacy/a51fe0ca992c03d6.png",
  "legacy/a562c789000c1734.jpg",
  "legacy/aa803452c8b157c3.png",
  "legacy/b2513284a6c2a9f5.png",
  "legacy/b9f86e1bdc20460b.png",
  "legacy/c0e8688bb58eefc1.jpg",
  "legacy/c26b4564a5b40d8c.png",
  "legacy/c321d8b0adda8ac3.png",
  "legacy/d24888517be943c3.jpg",
  "legacy/d7010784ea7f7185.png",
  "legacy/da505b1643d67711.jpg",
  "legacy/daee0f38438d40be.png",
  "legacy/e49f0992755c530e.png",
  "legacy/ec29662cecd2f824.jpg",
  "legacy/fdfa41285d9b633e.png",
];

// Fresh databases still contain the pre-migration static paths. Keeping those
// markers here makes the same cleanup work after a complete restore or rebuild.
const WATERMARK_SOURCES = [
  "/storage/hotel/seo/2qcUNH0kPuv28TYAELpHjaqZBxTSmkrjrkOrszlW.png",
  "/storage/hotel/seo/6NoVB0AeZirhZ7WVIh88HfTqGajYYh7tuRkbT353.png",
  "/storage/hotel/seo/7wGJrXmiTmWT0cir1ZaBgYeZgGB3d7Q1k8xc8isn.png",
  "/storage/hotel/seo/8UAy3Is7CNCBbwINAlLmyMhtzKkvqmZt9TH1zLxh.png",
  "/storage/hotel/seo/9SjQR5OYvYAEPDbYOUHFGzNUDFJ267hw4tsAsZEf.jpg",
  "/storage/hotel/seo/aDutXtlS3cRO6Ov21aWOEZVboSapMcGECNgEFB0e.jpg",
  "/storage/hotel/seo/atgcbHjXe3BbhuxY4qnHtd3NTPOUdEzU18d311mc.png",
  "/storage/hotel/seo/atO7paqFqcIsQ9QC4wfoI7fMph9HM4HbZP64fkqx.jpg",
  "/storage/hotel/seo/b4Gobakj2WPMlJ1D8JkU7R8Se0U8pYI0rvTR6zTm.png",
  "/storage/hotel/seo/bR98pmiZgeEYUHDq1BLpgrN1euFSRHxWZAgiHurZ.png",
  "/storage/hotel/seo/cdWmpTOsGGlZ5XCc1YGQJOLsIbRXMmlKW9NBHQC7.png",
  "/storage/hotel/seo/dEYCBKh0xWIKmQLTLxFjYGEBroxJNoa9J815rG8G.png",
  "/storage/hotel/seo/DGCoD1LWMLALCvIm0CdtIFKcAxiMljpAtcySwwvJ.png",
  "/storage/hotel/seo/DjcKRYlM3YsfsQpj2e0cSN7l9EW3dZmZ8cBngSJS.jpg",
  "/storage/hotel/seo/dNEIyd0UP0UWeQkVhAqPqhPy9JF8wdBl62Uzw4BY.png",
  "/storage/hotel/seo/fjeRQptK62IcCYlvGTkJZ1GXPDj7sI8SdQhBI352.jpg",
  "/storage/hotel/seo/FlaxkQZiyEjakYxEgWL4tOuRGICOhSA5I6Ia8rze.png",
  "/storage/hotel/seo/GX6nE9bAP5dxibMhXeR1LG2I8dctNHwJF3LkN5yW.png",
  "/storage/hotel/seo/HbJ6v4mjSfIed9oLgLwyi3iibFmFPUzcP3wxJzoe.png",
  "/storage/hotel/seo/hyzMhDtMhFCbiJ4qYCgLhZLxe74ymhF53vSLZFat.png",
  "/storage/hotel/seo/i94HQUDMPwp9KXuK2vcLh7u4ypDhiJ7oMCbk59ql.png",
  "/storage/hotel/seo/iHBMOP751xDYq1FfNXt0VE0pvewr48gJPVzOhyz8.jpg",
  "/storage/hotel/seo/ish9k4kL8fbynio79ed1zVWupS02IKbbSmHsKeuY.png",
  "/storage/hotel/seo/JaK69MPod9LuiIzVtQxnaMnHZrvKQsODaBKJ5TwJ.jpg",
  "/storage/hotel/seo/JDwYO2nwN78RdQNube3qWxVXTrMjz0owAiYp8v8H.png",
  "/storage/hotel/seo/jHFKrYCGHCkV63jySnsFm8eNJ6IwxsB9dwDRXoAK.png",
  "/storage/hotel/seo/JKrBx4duHiZW9Q9dm3dOVsE5lIUieJ4ZDCenKYZX.png",
  "/storage/hotel/seo/LIBU4DZOjSLJ9kh9XR8EMQNEY4k4zAjrdXiSsx6X.png",
  "/storage/hotel/seo/MkYIeBhOVCMPPmWzcpqL9F0HXsbSNJSuaWRgHWrC.jpg",
  "/storage/hotel/seo/ngYLDWPFfPWr09DfdvoUnNp81QggjgU6wbuXkKTZ.png",
  "/storage/hotel/seo/nhcICpd3ixfrh1KS0CjEqoHxiNZ2QoiSvrHASMkb.png",
  "/storage/hotel/seo/nhmTo1XJ3aSOMGAQ4suI9NEQunQ1RyMzwq6dFEjP.jpg",
  "/storage/hotel/seo/ok9FJ243HqllyzVnQWhJk4Mb9rbkrx1YxxRjJLFk.jpg",
  "/storage/hotel/seo/oNjKnzVCOy7nt7ENzwiwa4nhoUYZYbsOcvgIY8nV.jpg",
  "/storage/hotel/seo/oX4WOiTmlfTUhfK1gacENUbzwmiBZaYDCmInDzbF.jpg",
  "/storage/hotel/seo/PayscxDJkIFJzboWQP5uEZQEQRXlacDGyjtSSSiS.png",
  "/storage/hotel/seo/QwTdLHrQEHSkKeRYE47Jx6l2oU92EK1BnXwQ9xSo.png",
  "/storage/hotel/seo/RfkbVJn622sYFgcshucdKShYGYe10HKlLwNjQaLE.png",
  "/storage/hotel/seo/rp13WERiUqCYTvMo2QJBnJNjW1Pl0qtf3YegKSZB.jpg",
  "/storage/hotel/seo/SNw3jNn18wkxkLrFL4w6WuCQoihCh5X6AJmmYUVX.png",
  "/storage/hotel/seo/tDUTJqt0z0POxRP6C1E8QabBmLXeBKVucEwhTNx7.jpg",
  "/storage/hotel/seo/uldRgpm5Z8PdPnmbotyBcHasFrJ5SCygMzhumtVM.png",
  "/storage/hotel/seo/V8AO3NuEJxsu5FUmJtbdxDHWuLkXeV8AGUinBMQB.png",
  "/storage/hotel/seo/vGTImOlbEzjr2bDJgLRfLpcl6yZr6MyldwPHUdSg.png",
  "/storage/hotel/seo/viRINhwBV5Ps8IR7Ry5jVwDDqg1Q0fweEmc0Vdsz.png",
  "/storage/hotel/seo/WDIrZzxXlzrV4SLq88hE7vSXUNb7kWmggduRNZxs.png",
  "/storage/hotel/seo/WLNcsTMeXWUEYoQHnRVTo3EgcrGyrmMH3Vhw7U4K.png",
  "/storage/hotel/seo/YfF8lfJc7OioR0OgfgDpgRSzRZ0uXTYcqMgxoFxI.png",
];

const keySet = new Set(WATERMARK_KEYS);
const watermarkMarkers = [...WATERMARK_KEYS, ...WATERMARK_SOURCES];
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || "";
const r2Configured = Boolean(accountId && accessKeyId && secretAccessKey && bucket);

if (!databaseUrl || (apply && !r2Configured)) {
  if (ifConfigured) {
    const missing = [!databaseUrl && "database", apply && !r2Configured && "R2"].filter(Boolean).join(" and ");
    console.log(`[watermark-cleanup] ${missing} not configured here; nothing to do.`);
    process.exit(0);
  }
  throw new Error(!databaseUrl ? "Set DATABASE_URL." : "Set the R2 credentials and bucket.");
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, ssl: "require" });
const r2 = apply
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  : null;

function keysIn(value) {
  const text = value && typeof value === "object" ? JSON.stringify(value) : String(value || "");
  return watermarkMarkers.filter((marker) => text.includes(marker));
}

async function inspect(db) {
  const [hotels, slides, posts, pages, templates, settings, mediaRows] = await Promise.all([
    db`select id, city, slug, name, og_image, banner_image, thumbnail_image,
        highlights, gallery, description, faqs from hotels order by id`,
    db`select id, image_key from hero_slides`,
    db`select id, og_image, banner_image, card_image, body_html, faqs from blog_posts`,
    db`select path, html from static_pages`,
    db`select key, html from page_templates`,
    db`select key, value from settings`,
    db`select key from media where key = any(${WATERMARK_KEYS}) order by key`,
  ]);

  const hotelUpdates = [];
  const unexpected = [];

  for (const hotel of hotels) {
    const ogKeys = keysIn(hotel.og_image);
    const thumbnailKeys = keysIn(hotel.thumbnail_image);
    const unsupported = [
      ["banner_image", hotel.banner_image],
      ["highlights", hotel.highlights],
      ["gallery", hotel.gallery],
      ["description", hotel.description],
      ["faqs", hotel.faqs],
    ].flatMap(([field, value]) => keysIn(value).map((key) => `hotels/${hotel.id}.${field}: ${key}`));
    unexpected.push(...unsupported);

    if (ogKeys.length || thumbnailKeys.length) {
      if (!hotel.banner_image || keysIn(hotel.banner_image).length) {
        unexpected.push(`hotels/${hotel.id}.banner_image cannot replace the branded image`);
      } else {
        hotelUpdates.push({
          id: hotel.id,
          venue: `${hotel.city}/${hotel.slug}`,
          replaceOg: ogKeys.length > 0,
          replaceThumbnail: thumbnailKeys.length > 0,
          bannerImage: hotel.banner_image,
        });
      }
    }
  }

  const otherGroups = [
    ["hero_slides", slides],
    ["blog_posts", posts],
    ["static_pages", pages],
    ["page_templates", templates],
    ["settings", settings],
  ];
  for (const [table, rows] of otherGroups) {
    for (const row of rows) {
      for (const [field, value] of Object.entries(row)) {
        for (const key of keysIn(value)) unexpected.push(`${table}.${field}: ${key}`);
      }
    }
  }

  return {
    hotelUpdates,
    referenceCount: hotelUpdates.reduce(
      (count, row) => count + Number(row.replaceOg) + Number(row.replaceThumbnail),
      0,
    ),
    unexpected,
    mediaKeys: mediaRows.map((row) => row.key),
  };
}

function report(state, stage) {
  console.log(
    `[watermark-cleanup] ${stage}: ${state.hotelUpdates.length} hotel(s), ` +
      `${state.referenceCount} image reference(s), ${state.mediaKeys.length} media row(s), ` +
      `${state.unexpected.length} unexpected reference(s).`,
  );
}

async function deleteR2Objects() {
  const queue = [...WATERMARK_KEYS];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const key = queue.pop();
      if (!key || !keySet.has(key)) throw new Error("Refused an unknown media key.");
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    }
  });
  await Promise.all(workers);
}

try {
  const before = await inspect(sql);
  report(before, "audit");
  if (before.unexpected.length) {
    before.unexpected.forEach((reference) => console.error(`  ! ${reference}`));
    throw new Error("Unexpected branded-image references must be resolved before cleanup.");
  }

  if (!apply) {
    console.log("[watermark-cleanup] dry run only; pass --apply to replace and delete.");
    process.exitCode = before.hotelUpdates.length || before.mediaKeys.length ? 1 : 0;
  } else {
    if (before.hotelUpdates.length) {
      await sql.begin(async (tx) => {
        for (const row of before.hotelUpdates) {
          if (row.replaceOg && row.replaceThumbnail) {
            await tx`update hotels set og_image = ${row.bannerImage},
              thumbnail_image = ${row.bannerImage}, updated_at = now() where id = ${row.id}`;
          } else if (row.replaceOg) {
            await tx`update hotels set og_image = ${row.bannerImage},
              updated_at = now() where id = ${row.id}`;
          } else if (row.replaceThumbnail) {
            await tx`update hotels set thumbnail_image = ${row.bannerImage},
              updated_at = now() where id = ${row.id}`;
          }
        }
        await tx`
          insert into content_version (id, version, updated_at)
          values (1, 1, now())
          on conflict (id) do update
            set version = content_version.version + 1, updated_at = now()
        `;
      });
    }

    const repointed = await inspect(sql);
    report(repointed, "after replacement");
    if (repointed.hotelUpdates.length || repointed.referenceCount || repointed.unexpected.length) {
      throw new Error("Branded-image references remain after replacement.");
    }

    await deleteR2Objects();
    console.log(`[watermark-cleanup] deleted ${WATERMARK_KEYS.length} R2 object key(s).`);

    const deletedRows = await sql`
      delete from media where key = any(${WATERMARK_KEYS}) returning key
    `;
    console.log(`[watermark-cleanup] deleted ${deletedRows.length} media row(s).`);

    const verification = await inspect(sql);
    report(verification, "verification");
    if (verification.hotelUpdates.length || verification.mediaKeys.length || verification.unexpected.length) {
      throw new Error("Cleanup verification failed.");
    }
  }
} finally {
  r2?.destroy();
  await sql.end({ timeout: 5 });
}
