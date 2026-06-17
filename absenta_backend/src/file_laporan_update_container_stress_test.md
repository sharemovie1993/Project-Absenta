Update Container untuk Stress Test — Laporan

- Rebuild image Docker absenta-backend:latest dari source terbaru.
- Recreate container backend-api dan semua worker (infra, billing, notification, attendance, analytics, maintenance).
- Verifikasi endpoint /health backend merespons OK setelah update container.

