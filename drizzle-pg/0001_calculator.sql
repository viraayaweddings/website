CREATE TABLE "calculator_cities" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_hotels" (
	"id" integer PRIMARY KEY NOT NULL,
	"city_id" integer NOT NULL,
	"name" text NOT NULL,
	"total_rooms" integer DEFAULT 0 NOT NULL,
	"published" integer DEFAULT 1 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotel_id" integer NOT NULL,
	"month" text NOT NULL,
	"room_price" text DEFAULT '0.00' NOT NULL,
	"lunch_price" text DEFAULT '0.00' NOT NULL,
	"hitea_price" text DEFAULT '0.00' NOT NULL,
	"dinner_price" text DEFAULT '0.00' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calculator_currencies" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"symbol" text DEFAULT '' NOT NULL,
	"rate_to_usd" text DEFAULT '1' NOT NULL,
	"is_default" integer DEFAULT 0 NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "calculator_cities_name_idx" ON "calculator_cities" USING btree ("name");
--> statement-breakpoint
CREATE INDEX "calculator_hotels_city_idx" ON "calculator_hotels" USING btree ("city_id");
--> statement-breakpoint
CREATE INDEX "calculator_hotels_name_idx" ON "calculator_hotels" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "calculator_prices_hotel_month_idx" ON "calculator_prices" USING btree ("hotel_id","month");
