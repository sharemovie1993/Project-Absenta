CREATE UNIQUE INDEX "ObservabilityMetric_global_unique_metric_type_time_bucket_null_tenant"
ON "ObservabilityMetric" ("metric_type", "time_bucket")
WHERE "tenant_id" IS NULL;
