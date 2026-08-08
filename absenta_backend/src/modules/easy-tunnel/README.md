# 🌐 Easy Tunnel Module - Absenta Backend Engine

Modul ini bertanggung jawab mengelola koneksi terowongan balik (Outbound Reverse Tunnel) WireGuard dari Server Sekolah On-Premise ke Cloud Gateway Server Lisensi Pusat (`absenta.id`).

---

## 🛡️ Arsitektur Multi-Tunnel Coexistence & Netmask Hardening

### 1. Netmask Host `/32` (Route Conflict Elimination)
* Seluruh konfigurasi tunnel WireGuard (`et-*.conf`) menggunakan netmask host `/32` (`Address = 10.0.0.X/32`).
* Method `WireGuardManager.writeConfig()` secara otomatis melakukan sanitasi netmask `/24` ke `/32` jika menerima berkas konfig lama. Ini menjamin rute IP terisolasi per-interface tingkat host dan mencegah pertabrakan rute kernel (*flapping*) di server yang menjalankan beberapa interface `et-*` secara bersamaan (seperti `et-smkn1pld`, `et-smp4`, `et-t`).

### 2. Multi-Tunnel Concurrent Coexistence
* Auto-kill switch `enforceSingleActiveTunnel()` telah dinonaktifkan.
* Pengelola WireGuard mendukung penuh **Multi-Tunnel Concurrent Coexistence** sehingga 1 host server sekolah dapat menyalakan banyak tunnel VPN sekaligus (misal: tunnel Absenta Core, tunnel Dapodik, tunnel E-Rapor, RDP) tanpa saling mematikan interface lain.

### 3. Persistent Keepalive & Automatic Reconnect
* Berkas konfigurasi WireGuard selalu menyertakan `PersistentKeepalive = 25` di bawah seksi `[Peer]` untuk mencegah NAT timeout pada ISP sekolah (Indihome/Biznet/Seluler 4G) dan menjaga koneksi tunnel tetap aktif 24/7 secara otomatis.

---

## 📂 Komponen Utama Modul
- `services/easy-tunnel.service.ts`: Pengelola logika bisnis, validasi lisensi remote, registrasi subdomain, dan pembaruan database tenant (`prisma.easyTunnel`).
- `../../services/wireguardManager.ts`: Engine manajemen low-level OS (Windows Service & Linux Systemd `wg-quick`), sanitasi netmask `/32`, dan eksekusi subprocess `wg`.
- `routes/easy-tunnel.routes.ts`: Controller API Fastify untuk manajemen UI Easy Tunnel di dashboard admin sekolah.
