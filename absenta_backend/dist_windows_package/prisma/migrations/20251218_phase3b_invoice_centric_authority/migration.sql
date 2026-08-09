ALTER TABLE "Billing" ADD COLUMN "status" "BillingStatus" NOT NULL DEFAULT 'UNPAID';

ALTER TABLE "Invoice" ADD COLUMN "subscription_id" TEXT;

UPDATE "Invoice" i
SET "subscription_id" = b."subscription_id"
FROM "Billing" b
WHERE i."billing_id" = b."id";

ALTER TABLE "Invoice" ALTER COLUMN "subscription_id" SET NOT NULL;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Invoice_subscription_id_idx" ON "Invoice"("subscription_id");
