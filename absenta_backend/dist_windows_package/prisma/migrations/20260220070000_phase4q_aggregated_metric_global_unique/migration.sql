-- Ensure uniqueness for global (tenant_id IS NULL) daily metrics
CREATE UNIQUE INDEX IF NOT EXISTS "aggregated_metric_daily_global_unique"
ON "aggregated_metric_daily" ("date", "metric_key")
WHERE "tenant_id" IS NULL;

