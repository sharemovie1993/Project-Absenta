# Absenta Hardening Tools Development Rules

When you are instructed to register, define, or add a new hardening pillar or standard check in this project, you MUST perform all of the following steps to ensure end-to-end integration:

1. **Static Analysis Script**: Define the check logic in [audit-pages.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/audit-pages.cjs). Append the check to `jsonResults` and push a detailed error/warning message into the `issues` array if it fails.
2. **Dev Audit Server**: Sync the exact same check logic in [dev-audit-server.cjs](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/scripts/dev-audit-server.cjs) (under the real-time code analysis blocks, issues pushing, and returned JSON payload) so that the live "Preview Instruksi" and copyable prompt are correct.
3. **Hardening Registry**: Register the evaluation metadata block under `getHardeningConfig` in [hardeningRegistry.ts](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/config/hardeningRegistry.ts) using the new JSON key.
4. **Regenerate Reports**: Run `node ./scripts/audit-pages.cjs` inside the `absenta_frontend` directory to update [hardeningAuditReport.json](file:///d:/BarayaProject/Project%20Absenta/absenta_frontend/src/config/hardeningAuditReport.json).
5. **Verify Compilation**: Execute `npm run build` inside the `absenta_frontend` directory to verify there are no TypeScript or compilation errors.

Refer to the developer guide at [hardening_tools_guide.md](file:///d:/BarayaProject/Project%20Absenta/docs/hardening_tools_guide.md) for full architecture context and guidelines.
