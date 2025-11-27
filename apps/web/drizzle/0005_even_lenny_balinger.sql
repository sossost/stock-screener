CREATE TABLE "daily_ratios" (
	"symbol" text NOT NULL,
	"date" text NOT NULL,
	"pe_ratio" numeric,
	"ps_ratio" numeric,
	"pb_ratio" numeric,
	"peg_ratio" numeric,
	"ev_ebitda" numeric,
	"market_cap" numeric,
	"eps_ttm" numeric,
	"revenue_ttm" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_daily_ratios_symbol_date" UNIQUE("symbol","date")
);
--> statement-breakpoint
ALTER TABLE "daily_ratios" ADD CONSTRAINT "daily_ratios_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_daily_ratios_symbol_date" ON "daily_ratios" USING btree ("symbol","date");