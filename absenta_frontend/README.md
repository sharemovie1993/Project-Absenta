
## API Configuration (FINAL LOCK 2025)

**Strict Rule:**
- **Frontend** MUST use `VITE_API_BASE_URL` ending with `/api`.
  - Example: `https://api.absenta.id/api`
- **Backend** MUST strictly enforce CORS to `*.absenta.id`.
- **NO** hardcoded URLs allowed in code.

**Environment Variables:**
Check `.env.example` for the canonical configuration.
