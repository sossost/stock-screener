CREATE TABLE "asset_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '0' NOT NULL,
	"date" timestamp NOT NULL,
	"total_assets" numeric NOT NULL,
	"cash" numeric NOT NULL,
	"position_value" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_asset_snapshots_user_date" UNIQUE("user_id","date")
);
--> statement-breakpoint
CREATE TABLE "trade_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trade_id" integer NOT NULL,
	"action_type" text NOT NULL,
	"action_date" timestamp with time zone DEFAULT now() NOT NULL,
	"price" numeric NOT NULL,
	"quantity" integer NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '0' NOT NULL,
	"symbol" text NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"strategy" text,
	"plan_entry_price" numeric,
	"plan_stop_loss" numeric,
	"plan_target_price" numeric,
	"plan_targets" jsonb,
	"entry_reason" text,
	"commission_rate" numeric DEFAULT '0.07',
	"final_pnl" numeric,
	"final_roi" numeric,
	"final_r_multiple" numeric,
	"mistake_type" text,
	"review_note" text,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "trade_actions" ADD CONSTRAINT "trade_actions_trade_id_trades_id_fk" FOREIGN KEY ("trade_id") REFERENCES "public"."trades"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_asset_snapshots_user_date" ON "asset_snapshots" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_trade_actions_trade_id" ON "trade_actions" USING btree ("trade_id");--> statement-breakpoint
CREATE INDEX "idx_trade_actions_date" ON "trade_actions" USING btree ("action_date");--> statement-breakpoint
CREATE INDEX "idx_trades_user_status" ON "trades" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_trades_user_symbol" ON "trades" USING btree ("user_id","symbol");--> statement-breakpoint
CREATE INDEX "idx_trades_start_date" ON "trades" USING btree ("start_date");