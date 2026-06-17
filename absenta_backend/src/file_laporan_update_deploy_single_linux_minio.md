Laporan Implementasi — MiniIO (Simulasi S3) untuk Deployment Single Node (Linux)

Ringkasan Perubahan
- Menambahkan service MiniIO dan init bucket ke docker-compose single node (dengan dan tanpa nginx).
- Menu 21 (SINGLE tanpa nginx) sudah memakai docker-compose.linux.single.no-nginx.yml yang sudah berisi container MiniIO (S3).
- Mengganti tag image MiniIO/MC menjadi default latest + bisa dioverride (MINIO_IMAGE, MINIO_MC_IMAGE) agar tidak gagal jika tag release tertentu tidak tersedia.
- Mengupdate deploylinux.sh agar membaca /etc/absenta/single.env secara aman (tanpa dieksekusi), sehingga nilai yang terlanjur memakai backtick/spasi tetap terbaca dan tidak memicu env kosong/warning di docker compose.
- Mengupdate deploylinux.sh agar selalu menyuntikkan env untuk docker compose interpolation via --env-file (mencegah warning MINIO_ROOT_* / S3_BUCKET saat docker dipanggil via sudo atau environment tidak ikut terbawa).
- Mengupdate deploylinux.sh agar menyimpan dan mengekspor variabel environment terkait MiniIO/S3 (persist di /etc/absenta/single.env).
- Mengupdate absenta-deploy/env/env.common untuk konfigurasi STORAGE_DRIVER=s3 dan parameter S3/MiniIO.

Build
- npm run build: SUCCESS
