# Rule: Frontend Authorization Verification & DRY Standard

## Mandatory Rules for Frontend Authorization Work:
1. **Double-Pass Verification**: Every authorization / capability migration task MUST be verified twice:
   - Pass 1: Automated project-wide regex/script scan.
   - Pass 2: Manual line-by-line inspection of target files.
2. **Centralized `useCapabilities()` Hook**: NEVER write ad-hoc role checks or repetitive capability `||` expressions in individual components. ALWAYS consume the centralized `useCapabilities()` hook (`src/hooks/useCapabilities.ts`).
3. **Empirical Build Verification**: ALWAYS run `npx tsc --noEmit` and `npm run build` to prove 0 compilation errors before declaring task completion.
