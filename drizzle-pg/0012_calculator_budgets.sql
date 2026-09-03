CREATE TABLE "calculator_budgets" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"min_amount" text DEFAULT '0' NOT NULL,
	"max_amount" text DEFAULT '' NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "calculator_budgets_position_idx" ON "calculator_budgets" USING btree ("position");
--> statement-breakpoint
-- The four whole-stay bands the calculators offer. Amounts are rupees, held as
-- text for the same reason `calculator_prices` and `calculator_taxes` are: the
-- page scripts parse them and they round-trip as typed.
--
-- An empty "max_amount" means the band has no ceiling, so a fifth band can be
-- added later as an open-ended "5 Cr and above" without a migration.
INSERT INTO "calculator_budgets" ("code", "label", "min_amount", "max_amount", "published", "position")
VALUES
	('70l-1cr', '₹70 Lakh - ₹1 Crore', '7000000', '10000000', 1, 0),
	('1cr-2cr', '₹1 Crore - ₹2 Crore', '10000000', '20000000', 1, 1),
	('2cr-4cr', '₹2 Crore - ₹4 Crore', '20000000', '40000000', 1, 2),
	('4cr-5cr', '₹4 Crore - ₹5 Crore', '40000000', '50000000', 1, 3)
ON CONFLICT ("code") DO NOTHING;
