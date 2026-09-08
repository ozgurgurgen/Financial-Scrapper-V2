CREATE TABLE "analyst_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"market" varchar(20) NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_name" varchar(100) NOT NULL,
	"source_url" text,
	"author" varchar(100),
	"ticker" varchar(30) NOT NULL,
	"asset_name" text,
	"title" text NOT NULL,
	"raw_content" text,
	"recommendation" varchar(30) DEFAULT 'TUT',
	"target_price" numeric(16, 4),
	"current_price_at_report" numeric(16, 4),
	"upside_pct" numeric(8, 2),
	"currency" varchar(10) DEFAULT 'TRY',
	"publish_date" timestamp NOT NULL,
	"ai_summary" text,
	"ai_sentiment" varchar(20) DEFAULT 'NÖTR',
	"ai_sentiment_score" numeric(6, 3),
	"key_bull_arguments" jsonb,
	"key_bear_risks" jsonb,
	"is_synthesized" boolean DEFAULT false,
	"synthesized_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"source" varchar(50) NOT NULL,
	"normalized_value" numeric(20, 6),
	"date_period" varchar(50),
	"raw_data" jsonb,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "asset_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"asset_id" integer NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_code" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "assets_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "backfill_sync_state" (
	"task_name" varchar(100) PRIMARY KEY NOT NULL,
	"total_items" integer DEFAULT 0,
	"completed_items" integer DEFAULT 0,
	"current_item" varchar(100),
	"status" varchar(50) DEFAULT 'IDLE',
	"is_weekend_mode" boolean DEFAULT false,
	"last_error" text,
	"last_run_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bist_buybacks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"date" varchar(30) NOT NULL,
	"shares_bought" numeric(24, 2),
	"price_paid" numeric(16, 4),
	"total_try" numeric(24, 2),
	"cumulative_shares" numeric(24, 2),
	"percentage_of_capital" numeric(10, 4),
	"program_authorized_try" numeric(24, 2),
	"disclosure_id" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bist_financials" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"year" integer NOT NULL,
	"period" integer NOT NULL,
	"announced_date" varchar(30),
	"revenue" numeric(24, 2),
	"revenue_yoy" numeric(10, 4),
	"gross_profit" numeric(24, 2),
	"gross_margin" numeric(10, 4),
	"operating_profit" numeric(24, 2),
	"operating_margin" numeric(10, 4),
	"ebitda" numeric(24, 2),
	"ebitda_margin" numeric(10, 4),
	"net_profit" numeric(24, 2),
	"net_profit_yoy" numeric(10, 4),
	"net_margin" numeric(10, 4),
	"total_assets" numeric(24, 2),
	"current_assets" numeric(24, 2),
	"short_term_liabilities" numeric(24, 2),
	"long_term_liabilities" numeric(24, 2),
	"net_debt" numeric(24, 2),
	"equity" numeric(24, 2),
	"working_capital" numeric(24, 2),
	"free_cash_flow" numeric(24, 2),
	"operating_cash_flow" numeric(24, 2),
	"capex" numeric(24, 2),
	"paid_capital" numeric(24, 2),
	"retained_earnings" numeric(24, 2),
	"disclosure_id" varchar(50),
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bist_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"company_name" text,
	"sector" text,
	"price" numeric(12, 4),
	"change_pct" numeric(8, 4),
	"market_cap" numeric(20, 4),
	"volume" numeric(20, 4),
	"pe_ratio" numeric(10, 4),
	"pb_ratio" numeric(10, 4),
	"ev_ebitda" numeric(10, 4),
	"net_debt_ebitda" numeric(10, 4),
	"current_ratio" numeric(10, 4),
	"roe" numeric(10, 4),
	"dividend_yield" numeric(10, 4),
	"beta_5y" numeric(10, 4),
	"money_inflow_net_try" numeric(24, 2),
	"top_buyers" jsonb,
	"top_sellers" jsonb,
	"fifty_two_week_high" numeric(12, 4),
	"fifty_two_week_low" numeric(12, 4),
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "bist_stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "crypto_candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"timeframe" varchar(10) NOT NULL,
	"time" timestamp NOT NULL,
	"open" numeric(20, 4) NOT NULL,
	"high" numeric(20, 4) NOT NULL,
	"low" numeric(20, 4) NOT NULL,
	"close" numeric(20, 4) NOT NULL,
	"volume" numeric(24, 4),
	"rsi_14" numeric(10, 2),
	"macd" numeric(12, 4),
	"macd_signal" numeric(12, 4),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crypto_coins" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"category" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crypto_coins_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "crypto_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"news_id" varchar(150) NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"source" varchar(100),
	"published_on" timestamp NOT NULL,
	"categories" varchar(200),
	"sentiment" varchar(20),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crypto_news_news_id_unique" UNIQUE("news_id")
);
--> statement-breakpoint
CREATE TABLE "crypto_on_chain" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"date" varchar(30) NOT NULL,
	"in_out_money_pct" numeric(8, 2),
	"out_money_pct" numeric(8, 2),
	"large_txs_volume_usd" numeric(24, 2),
	"large_txs_count" integer,
	"network_growth_pct" numeric(8, 2),
	"concentration_whales_pct" numeric(8, 2),
	"sentiment_score" varchar(30),
	"summary_text" text,
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crypto_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"price" numeric(20, 4) NOT NULL,
	"change_24h" numeric(10, 4),
	"high_24h" numeric(20, 4),
	"low_24h" numeric(20, 4),
	"volume_24h" numeric(24, 2),
	"market_cap" numeric(24, 2),
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "crypto_prices_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "crypto_sync_metadata" (
	"stream_key" varchar(100) PRIMARY KEY NOT NULL,
	"last_sync_at" timestamp NOT NULL,
	"last_data_timestamp" timestamp,
	"next_allowed_fetch_at" timestamp NOT NULL,
	"records_added" integer DEFAULT 0,
	"api_calls_saved" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'SYNCED'
);
--> statement-breakpoint
CREATE TABLE "ipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_code" varchar(50) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"status" varchar(50) NOT NULL,
	"date_str" varchar(100),
	"countdown_days" integer,
	"price" varchar(100),
	"lot_size" varchar(100),
	"sentiment" varchar(50),
	"ai_summary" text,
	"ipo_size" varchar(100),
	"free_float" varchar(100),
	"price_stability" varchar(255),
	"lockup_commitment" varchar(255),
	"fund_usage" text,
	"discount_rate" varchar(100),
	"allocation_groups" text,
	"current_price" varchar(50),
	"day_change_pct" varchar(50),
	"ceiling_streak" integer,
	"max_ceiling_streak" integer,
	"broke_ceiling" boolean DEFAULT false,
	"break_date" varchar(50),
	"total_return_pct" varchar(50),
	"trading_days" integer,
	"offer_price" numeric(12, 4),
	"total_shares" numeric(24, 2),
	"ipo_size_try" numeric(24, 2),
	"dates" varchar(150),
	"distribution_type" varchar(100),
	"consortium_leader" text,
	"bist_market" varchar(100),
	"pe_ratio_ipo" numeric(10, 4),
	"prospectus_url" text,
	"fund_usage_json" jsonb,
	"allotment_result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kap_companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"sector" text,
	"city" varchar(100),
	"auditor" text,
	"address" text,
	CONSTRAINT "kap_companies_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "kap_disclosures" (
	"id" serial PRIMARY KEY NOT NULL,
	"disclosure_index" varchar(50) NOT NULL,
	"symbol" varchar(50),
	"company_name" text,
	"title" text NOT NULL,
	"publish_date" timestamp,
	"category" varchar(200),
	"summary" text,
	"full_text" text,
	"has_attachment" boolean DEFAULT false,
	"attachment_urls" jsonb,
	"related_companies" jsonb,
	"impact_level" varchar(30),
	"sentiment" varchar(30),
	"url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "kap_disclosures_disclosure_index_unique" UNIQUE("disclosure_index")
);
--> statement-breakpoint
CREATE TABLE "macro_indicators" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" text NOT NULL,
	"source" varchar(20),
	"value" numeric(16, 4),
	"unit" varchar(20),
	"date_period" varchar(50),
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "macro_indicators_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "market_news" (
	"id" serial PRIMARY KEY NOT NULL,
	"news_id" varchar(150) NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"url" text,
	"source" varchar(100),
	"published_on" timestamp NOT NULL,
	"categories" varchar(200),
	"sentiment" varchar(20),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "market_news_news_id_unique" UNIQUE("news_id")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"message" text,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_error_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(20) DEFAULT 'ERROR' NOT NULL,
	"module" varchar(50) DEFAULT 'SYSTEM' NOT NULL,
	"message" text NOT NULL,
	"stack_trace" text,
	"request_path" varchar(255),
	"request_method" varchar(20),
	"client_ip" varchar(100),
	"status_code" integer,
	"context_data" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar(100),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tefas_fund_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"fund_code" varchar(20) NOT NULL,
	"fund_name" text,
	"asset_symbol" varchar(50) NOT NULL,
	"asset_name" text NOT NULL,
	"asset_type" varchar(100) NOT NULL,
	"weight_pct" numeric(8, 4) NOT NULL,
	"nominal_shares" numeric(24, 2),
	"market_value" numeric(24, 2),
	"sector" varchar(100),
	"isin_code" varchar(50),
	"report_period" varchar(50),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tefas_funds" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"type" varchar(150),
	"management_fee" varchar(50),
	"buy_valour" varchar(50),
	"sell_valour" varchar(50),
	"trading_hours" varchar(100),
	"risk_value" varchar(20),
	"isin_code" varchar(50),
	"kap_link" text,
	"min_buy" numeric,
	"min_sell" numeric,
	"tefas_status" varchar(100),
	CONSTRAINT "tefas_funds_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tefas_historical_navs" (
	"id" serial PRIMARY KEY NOT NULL,
	"fund_code" varchar(20) NOT NULL,
	"date" timestamp NOT NULL,
	"price" numeric(20, 6) NOT NULL,
	"market_cap" numeric(20, 2),
	"shares" numeric(20, 2),
	"investor_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tefas_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"fund_id" integer NOT NULL,
	"date" timestamp NOT NULL,
	"price" numeric(20, 6),
	"daily_change" numeric(10, 4),
	"market_cap" numeric(20, 2),
	"shares" numeric(20, 2),
	"investor_count" integer,
	"market_share" numeric(10, 4),
	"volume" numeric(20, 2),
	"category_rank" integer,
	"category_total" integer,
	"return_1w" numeric(10, 4),
	"return_1m" numeric(10, 4),
	"return_3m" numeric(10, 4),
	"return_6m" numeric(10, 4),
	"return_1y" numeric(10, 4),
	"return_3y" numeric(10, 4),
	"return_5y" numeric(10, 4),
	"return_ytd" numeric(10, 4),
	"asset_allocation" jsonb,
	"benchmark_comparison" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "unmatched_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"source_code" varchar(100) NOT NULL,
	"raw_data" jsonb,
	"status" varchar(20) DEFAULT 'PENDING',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "us_etfs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"issuer" varchar(100),
	"currency" varchar(10) DEFAULT 'USD',
	"exchange" varchar(50) DEFAULT 'NYSE Arca',
	"price" numeric(16, 4),
	"change_pct" numeric(10, 4),
	"change" numeric(16, 4),
	"nav" numeric(16, 4),
	"aum" numeric(24, 2),
	"aum_formatted" varchar(50),
	"volume" numeric(24, 2),
	"avg_volume" numeric(24, 2),
	"expense_ratio" numeric(8, 4),
	"dividend_yield" numeric(8, 4),
	"distribution_frequency" varchar(50) DEFAULT 'Quarterly',
	"beta" numeric(10, 4),
	"sharpe_ratio" numeric(10, 4),
	"tracking_error" numeric(8, 4),
	"return_1y" numeric(10, 4),
	"return_3y" numeric(10, 4),
	"return_5y" numeric(10, 4),
	"inception_date" varchar(50),
	"fifty_two_week_high" numeric(16, 4),
	"fifty_two_week_low" numeric(16, 4),
	"benchmark_index" varchar(150),
	"holdings_count" integer,
	"top_holdings" jsonb,
	"sector_weights" jsonb,
	"description" text,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "us_etfs_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "us_historical_candles" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"asset_type" varchar(20) NOT NULL,
	"currency" varchar(10) DEFAULT 'USD',
	"period" varchar(20) DEFAULT 'DAILY',
	"date" varchar(30) NOT NULL,
	"timestamp" timestamp NOT NULL,
	"open" numeric(16, 4) NOT NULL,
	"high" numeric(16, 4) NOT NULL,
	"low" numeric(16, 4) NOT NULL,
	"close" numeric(16, 4) NOT NULL,
	"volume" numeric(24, 2) DEFAULT '0',
	"pe_ratio" numeric(12, 4),
	"dividend_yield" numeric(10, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "us_stocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(20) NOT NULL,
	"company_name" text NOT NULL,
	"sector" varchar(100),
	"industry" varchar(150),
	"exchange" varchar(50) DEFAULT 'NASDAQ',
	"rank" integer DEFAULT 1000,
	"price" numeric(16, 4),
	"change_pct" numeric(10, 4),
	"change" numeric(16, 4),
	"market_cap" numeric(24, 2),
	"market_cap_formatted" varchar(50),
	"volume" numeric(24, 2),
	"avg_volume" numeric(24, 2),
	"pe_ratio" numeric(12, 4),
	"forward_pe" numeric(12, 4),
	"peg_ratio" numeric(12, 4),
	"price_to_book" numeric(12, 4),
	"price_to_sales" numeric(12, 4),
	"enterprise_value" numeric(24, 2),
	"dividend_yield" numeric(10, 4),
	"dividend_date" varchar(50),
	"eps" numeric(12, 4),
	"forward_eps" numeric(12, 4),
	"beta" numeric(10, 4),
	"fifty_two_week_high" numeric(16, 4),
	"fifty_two_week_low" numeric(16, 4),
	"fifty_day_average" numeric(16, 4),
	"two_hundred_day_average" numeric(16, 4),
	"target_price" numeric(16, 4),
	"recommendation" varchar(50),
	"analyst_rating" numeric(6, 2),
	"revenue" numeric(24, 2),
	"net_income" numeric(24, 2),
	"profit_margin" numeric(10, 4),
	"operating_margin" numeric(10, 4),
	"return_on_equity" numeric(10, 4),
	"return_on_assets" numeric(10, 4),
	"debt_to_equity" numeric(12, 4),
	"free_cash_flow" numeric(24, 2),
	"short_ratio" numeric(10, 4),
	"shares_outstanding" numeric(24, 2),
	"country" varchar(50) DEFAULT 'United States',
	"city" varchar(100),
	"state" varchar(50),
	"website" text,
	"ceo" text,
	"full_time_employees" integer,
	"description" text,
	"last_updated" timestamp DEFAULT now(),
	CONSTRAINT "us_stocks_ticker_unique" UNIQUE("ticker")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
ALTER TABLE "asset_data" ADD CONSTRAINT "asset_data_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_mappings" ADD CONSTRAINT "asset_mappings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tefas_prices" ADD CONSTRAINT "tefas_prices_fund_id_tefas_funds_id_fk" FOREIGN KEY ("fund_id") REFERENCES "public"."tefas_funds"("id") ON DELETE no action ON UPDATE no action;