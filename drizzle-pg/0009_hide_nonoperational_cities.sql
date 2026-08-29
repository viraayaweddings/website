-- Hides the 29 cities the business does not currently work in.
--
-- `published = 0` is the column's stated purpose: "Hidden from the picker
-- without losing its hotels or their prices". Every city picker on the site
-- reads it through buildConfig() in worker/site/calculator-store.ts, so this
-- one write reaches the header mega-menu, the venue filter on /hotel-listing,
-- the cost calculators, the Choose Hotels rows on /check-hotel-availability
-- and the select2 on /compare-hotel at once.
--
-- Deliberately NOT a delete. These cities keep their hotels, their prices and
-- their /destination-wedding/<city>/ pages, which stay live and indexed -- so
-- re-entering a market is a click in /admin/calculator, not a restore. The
-- eight cities withdrawn for good are a different operation entirely
-- (scripts/lib/retired-cities.mjs), and their rows are already gone.
--
-- Runs once, and it is the `__migrations` ledger in scripts/db-migrate.mjs and
-- worker/db/apply-pg-migrations.ts that makes it so: once this file's name is
-- recorded there it is never executed again, which is what lets an editor turn
-- a city back on at /admin/calculator without the next deploy hiding it.
-- The `published <> 0` filter below is not that guarantee -- it only skips rows
-- already hidden, so their `updated_at` is not churned. Re-run by hand, this
-- statement WOULD hide a re-published city again.
--
-- The complement of this list -- the 16 cities left published -- is
-- OPERATIONAL_CITY_IDS in worker/db/operational-cities.ts, which is what a
-- freshly seeded database uses. tests/operational-cities.test.mjs asserts the
-- two describe the same 45 cities, because a database rebuilt from the seed
-- has to come up matching one migrated by this file.
UPDATE "calculator_cities"
SET "published" = 0, "updated_at" = now()
WHERE "id" IN (
	1,  -- Lucknow
	2,  -- Noida
	20, -- Kovalam
	21, -- kerala
	23, -- Bengal
	24, -- Karnataka
	25, -- Kolkata
	28, -- Ahmedabad
	29, -- Surat
	34, -- Barwara
	35, -- Raipur
	36, -- Guwahati
	40, -- Bhopal
	41, -- Vrindavan
	42, -- Sakleshpur
	43, -- Gwalior
	44, -- Haridwar
	46, -- Daman
	47, -- Indore
	51, -- kasauli
	55, -- Karnal
	56, -- khimsar
	67, -- Bhubaneswar
	68, -- Lakshadweep
	69, -- Andaman
	70, -- Ajabgarh
	71, -- Karjat
	72, -- Khopoli
	73  -- Lonavala
) AND "published" <> 0;
