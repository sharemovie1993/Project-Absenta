# Repository Artifact Cleanup Report
Generated on: 2026-03-16T13:12:46.813Z

## Summary
- Total files scanned: 991
- Runtime used files (tracked list): 6
- Artifacts SAFE_TO_DELETE: 0
- Artifacts REVIEW_REQUIRED: 1

## Runtime Used Files
- docs/action_catalog_canonical_futureproof.md
- prisma/seed_policies.ts
- scripts/audit/capability-domain-classifier.ts
- scripts/audit/rbac-baseline-generator.ts
- src/config/capabilities.ts
- src/config/capability-domains.generated.ts

## Artifacts SAFE_TO_DELETE
- None

## Artifacts REVIEW_REQUIRED
- src/file_laporan_mapping_blueprint_middleware_refactor.md (legacy-reference)

## Deleted Files
- action_catalog_cleaned.md
- ACTION_CATALOG_CLEANUP_REPORT.md
- action_catalog_removed_capabilities.json
- capability_alias_map.json
- CAPABILITY_DOMAIN_CLASSIFICATION_REPORT.md
- capability_domain_map.json
- CAPABILITY_NAMING_CLEANUP_SUGGESTION.md
- rbac_audit_result.json
- RBAC_BASELINE_RECONSTRUCTION_REPORT.md
- RBAC_BASELINE_SUGGESTION.md
- RBAC_CAPABILITY_AUDIT_REPORT.md

## Moved Scripts
- scripts/audit/action-catalog-cleanup.ts -> scripts/archive/action-catalog-cleanup.ts
- scripts/audit/capability-naming-audit.ts -> scripts/archive/capability-naming-audit.ts
- scripts/audit/capability-naming-refactor-exec.ts -> scripts/archive/capability-naming-refactor-exec.ts
- scripts/audit/rbac-capability-audit.ts -> scripts/archive/rbac-capability-audit.ts

## Validation
- npm run build: SUCCESS
- npm run test: SUCCESS
