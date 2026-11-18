# Absenta Ecosystem - Kredensial & Prosedur Deployment VPS

## 1. Deployer Terpusat
- **Lokasi Project**: `D:\BarayaProject\deployer`
- **Quick Deploy Script**:
  - `quick-deploy-licensing.bat` -> 1-klik langsung kompilasi di lokal & deploy ke VPS Server Lisensi (`103.196.155.87`).
  - `run.bat` -> Menu `[2] Quick Update` -> `[3] VPS Linux Remote` -> `[2] Server Lisensi` (PILIH MODE: `local`).

---

## 2. VPS Public (Server Lisensi Central & Gateway)
- **Lokasi Project**: `D:\BarayaProject\Project-Server-Lisensi`
- **Akun SSH**:
  - **IP**: `103.196.155.87`
  - **Domain**: `absenta.id` / `api.absenta.id`
  - **User**: `asepsuryadi`
  - **SSH Key**: `ls-key.pem`
  - **Remote Directory**: `/var/www/licensing-server`

> [!IMPORTANT]
> **ATURAN MUTLAK SERVER LISENSI: WAJIB BUILD DI LOKAL!**
> DILARANG menjalankan `npm run build` (`tsc` / `vite build`) langsung di dalam VPS.
> Kompilasi di dalam VPS memicu lonjakan CPU 100% (CPU Spike) yang mengakibatkan server hang/down. Seluruh proses kompilasi TypeScript dan Vite panel HARUS diselesaikan di komputer lokal, lalu hasilnya diunggah via SCP ke VPS.

### Prosedur Deploy Server Lisensi:
- **Cara 1 (1-Klik Otomatis - Recommended)**:
  Buka folder `D:\BarayaProject\Project-Server-Lisensi`, double-click:
  ```cmd
  deploy.bat
  ```
  *(Atau jalankan `npm run deploy` di terminal)*.
- **Cara 2 (PowerShell Langsung)**:
  ```powershell
  npm run deploy:fast
  # atau
  powershell -ExecutionPolicy Bypass -File .\deploy-fast.ps1
  ```
- **Alur yang Dijalankan `deploy-fast.ps1`**:
  1. Melakukan `npm run build` TypeScript Backend (`dist/`) di PC lokal.
  2. Melakukan build Vite Platform Panel (`public/`) di PC lokal.
  3. Mengompresi paket release ke `release_dist.tar.gz`.
  4. Mengunggah ke VPS via SCP menggunakan `ls-key.pem`.
  5. Ekstrak di VPS `/var/www/licensing-server` dan restart `pm2 restart licensing-server` (Zero CPU load di VPS!).

---

## 3. VPS Lokal (Server Produksi Platform Absenta - SMKN 1 PLD)
- **Lokasi Project**: `D:\BarayaProject\Project Absenta`
- **Akun SSH**:
  - **IP**: `10.10.10.99`
  - **Domain**: `smkn1pld.absenta.id`
  - **User**: `asep`
  - **Password**: `1`
  - **SSH Key**: `nginxonly.pem`

---

## 4. VPS Lokal (Server Produksi Platform Absenta - Demo & Staging)
- **Lokasi Project**: `D:\BarayaProject\Project Absenta`
- **Akun SSH**:
  - **IP**: `10.10.10.116`
  - **Domain**: `demo.absenta.id`
  - **User**: `asep`
  - **Password**: `1`
  - **SSH Key**: `nginxonly.pem`
- **Direktori Server**:
  - **Folder Produksi Aktif**: `/var/www/project-absenta`
  - **Folder Sandbox Staging Terisolasi**: `/var/www/project-absenta-staging`

> [!IMPORTANT]
> **ATURAN MUTLAK BUILD: DILARANG BUILD DI KOMPUTER LOKAL!**
> Komputer pengembang lokal memiliki keterbatasan RAM dan CPU yang hampir penuh. DILARANG menjalankan `npm run build` lokal. Seluruh pengujian kompilasi Vite dan build dialihkan langsung ke server VPS (`10.10.10.116`) yang memiliki 24 GB RAM dan 100+ GB SSD.

### Prosedur Deploy Aman Terisolasi (Zero-Downtime Safe Deploy):
Selalu gunakan alur staging terisolasi agar jika terjadi kesalahan kompilasi/TypeScript/syntax error, server produksi TIDAK PERNAH terdampak:

1. **Commit & Push dari Komputer Lokal**:
   ```bash
   git add .
   git commit -m "feat/fix: deskripsi perubahan"
   git push origin main
   ```
2. **Eksekusi Safe Deploy di VPS (1-Perintah Aman)**:
   ```bash
   ssh -i "D:\BarayaProject\deployer\nginxonly.pem" asep@10.10.10.116 "/var/www/deploy-safe.sh"
   ```

### Alur Kerja Otomatis `deploy-safe.sh`:
1. **Pull & Reset di Sandbox Staging**: Kode terbaru ditarik ke `/var/www/project-absenta-staging`.
2. **Testing Build di Staging**: Kompilasi dijalankan di direktori staging. Jika ada error, skrip **langsung STOP** dan folder produksi sama sekali TIDAK TERSENTUH (Zero Risk).
3. **Atomic Production Promotion**: Jika build staging sukses 100%, artifak hasil build disinkronkan ke `/var/www/project-absenta/absenta_frontend/dist`.
4. **PM2 Instant Reload**: Reload service `pm2 reload absenta-web:5175` tanpa downtime.
