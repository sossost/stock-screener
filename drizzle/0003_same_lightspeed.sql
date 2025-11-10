CREATE TABLE "portfolio" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"symbol" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "uq_portfolio_session_symbol" UNIQUE("session_id","symbol")
);
--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_symbol_symbols_symbol_fk" FOREIGN KEY ("symbol") REFERENCES "public"."symbols"("symbol") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_portfolio_session" ON "portfolio" USING btree ("session_id");