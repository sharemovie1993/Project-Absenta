Diagnosa Stress Test UI Infra Control Tidak Bergerak — Laporan

- Akar masalah: request dari stress-attendance.js gagal tetapi error disembunyikan (catch kosong), sehingga job tidak benar-benar masuk queue.
- Akar masalah tambahan: limit global request memotong load besar (TOO_MANY_REQUESTS) setelah ambang tertentu.
- Perbaikan: menambahkan endpoint stress khusus yang bisa dipakai tanpa JWT tetapi dilindungi secret.
- Perbaikan: endpoint stress dibuat public di auth middleware dan diberi konfigurasi rate limit khusus agar tidak terkena limit global.
- Perbaikan: stress-attendance.js diubah agar menampilkan statistik sukses/gagal dan default mengarah ke endpoint stress.
- Verifikasi: enqueue massal berhasil (ok=6000 fail=0) dan Redis bull:attendance:wait menunjukkan backlog non-zero.

