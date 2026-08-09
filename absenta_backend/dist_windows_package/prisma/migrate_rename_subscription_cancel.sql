DO $$
DECLARE
  has_cancelled BOOLEAN;
  has_canceled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'CANCELLED'
  ) INTO has_cancelled;

  SELECT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'SubscriptionStatus' AND e.enumlabel = 'CANCELED'
  ) INTO has_canceled;

  IF has_canceled AND NOT has_cancelled THEN
    ALTER TYPE "SubscriptionStatus" RENAME VALUE 'CANCELED' TO 'CANCELLED';
  END IF;
END$$;
