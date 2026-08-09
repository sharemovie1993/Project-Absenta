-- Add TRIPAY to PaymentGateway enum for existing database
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentGateway' AND e.enumlabel = 'TRIPAY'
  ) THEN
    ALTER TYPE "PaymentGateway" ADD VALUE 'TRIPAY';
  END IF;
END$$;

