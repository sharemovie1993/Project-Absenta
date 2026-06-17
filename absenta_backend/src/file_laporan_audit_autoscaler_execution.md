Audit Autoscaler Execution — Laporan

- Verifikasi publish event pada Redis channel infra-control berhasil.
- Verifikasi control agent subscribe channel infra-control.
- Menambahkan service control agent (absenta-worker-agent) pada docker-compose.windows.yml.
- Menambahkan worker container template (attendance-2/3, billing-2, notification-2) agar autoscaler bisa start/stop instance.
- Memperbaiki control agent: eksekusi start/stop/restart container memakai Docker Engine API via /var/run/docker.sock.
- Verifikasi lewat logs container agent menunjukkan received infra-control event dan aksi start/stop container terjadi.

