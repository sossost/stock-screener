CREATE TABLE "portfolio_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text DEFAULT '0' NOT NULL,
	"cash_balance" numeric DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_settings_user_id_unique" UNIQUE("user_id")
);
