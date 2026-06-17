-- AddCheckConstraint
ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_paid_period_required"
CHECK (
  status <> 'PAID'
  OR (
    period_start IS NOT NULL
    AND period_end IS NOT NULL
    AND period_end > period_start
  )
) NOT VALID;

