CREATE TABLE "calculator_taxes" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"percent" text DEFAULT '0.00' NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "calculator_taxes_position_idx" ON "calculator_taxes" USING btree ("position");
--> statement-breakpoint
-- The rate the calculators hardcoded as `grandTotal * 0.09` twice, and as
-- `* 1.18` on /compare-hotel. Seeded so the migration is behaviour-preserving:
-- an existing site keeps quoting the same total, and the numbers are editable
-- from the admin panel from here on.
INSERT INTO "calculator_taxes" ("code", "label", "percent", "published", "position")
VALUES
	('cgst', 'CGST', '9.00', 1, 0),
	('sgst', 'SGST', '9.00', 1, 1)
ON CONFLICT ("code") DO NOTHING;
