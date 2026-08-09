-- Phase 5A: Guardrails & Safety
-- A. DB-Level Guard: Single PAID invoice per subscription per month
-- Create partial unique index to prevent multiple PAID invoices in the same month for the same subscription
-- Skipped: Expression indexes with non-IMMUTABLE functions not supported in this environment
 
 -- B. Idempotency hardening: skipped due to existing duplicate data; enforce at application layer
