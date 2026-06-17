# TENANT CONTEXT INTEGRITY AUDIT
Generated on: 2026-03-16T13:49:15.305Z

## Summary
Total endpoints scanned: 352

SAFE: 349
TENANT_CONTEXT_VIOLATION: 0
REVIEW_REQUIRED: 3

## TENANT_CONTEXT_VIOLATION
- None

## REVIEW_REQUIRED
- src/middleware/cache-invalidation.middleware.ts | tenant dari params (via params variable)
- src/modules/superadmin/infra/routes/platformIntelligence.routes.ts | tenant dari params | platform_caps: superadmin.platform.intelligence.view
- src/modules/superadmin/tenant-detail/controllers/tenant-detail.controller.ts | tenantId destructure dari params
