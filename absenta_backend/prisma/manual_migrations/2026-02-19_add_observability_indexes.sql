DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'SystemEventLog_domain_created_at_idx'
  ) THEN
    CREATE INDEX "SystemEventLog_domain_created_at_idx" ON "SystemEventLog" ("domain", "created_at");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'SystemEventLog_event_type_created_at_idx'
  ) THEN
    CREATE INDEX "SystemEventLog_event_type_created_at_idx" ON "SystemEventLog" ("event_type", "created_at");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'SystemEventLog_tenant_id_created_at_idx'
  ) THEN
    CREATE INDEX "SystemEventLog_tenant_id_created_at_idx" ON "SystemEventLog" ("tenant_id", "created_at");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'QueueJobLog_queue_name_created_at_idx'
  ) THEN
    CREATE INDEX "QueueJobLog_queue_name_created_at_idx" ON "QueueJobLog" ("queue_name", "created_at");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'QueueJobLog_status_created_at_idx'
  ) THEN
    CREATE INDEX "QueueJobLog_status_created_at_idx" ON "QueueJobLog" ("status", "created_at");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE indexname = 'QueueJobLog_tenant_id_created_at_idx'
  ) THEN
    CREATE INDEX "QueueJobLog_tenant_id_created_at_idx" ON "QueueJobLog" ("tenant_id", "created_at");
  END IF;
END $$;
