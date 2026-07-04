# TECH STACK

Backend Core:
- **Fastify**: Engine web asinkron berkecepatan tinggi.
- **Prisma**: Manajemen skema database dan *type-safe query*.
- **TypeScript**: Pengembangan berbasis tipe data statis.

Security & Auth:
- **JWT (Stateless)**: Otorisasi berbasis token tanpa penyimpanan session server.
- **Bcrypt**: Hashing PIN transaksi dan password user.
- **Capabilities (CBAC)**: Kontrol akses berbasis kemampuan/fitur spesifik.

Middleware & Services:
- **Redis**: Caching layer untuk entitlements, organizational scope, serta broker job/antrean BullMQ.
- **Socket.io**: Komunikasi dua arah real-time untuk IoT dan dashboard.
- **Axios**: Integrasi dengan License Server, webhooks, dan API eksternal.
- **BullMQ**: Pemrosesan antrean dan background job secara asinkron.
- **@whiskeysockets/baileys**: WhatsApp Gateway multi-tenant bawaan (built-in) menggunakan pool pattern koneksi per tenant.
- **Nodemailer & Firebase Admin SDK (FCM) & Web-Push**: Pengiriman notifikasi transaksional via email, mobile push notification, dan browser push.

Storage & Documents:
- **Google Drive API**: Penyimpanan dokumen PKL, MoU, dan portofolio khusus untuk modul Hubin.
- **AWS SDK for S3 (@aws-sdk/client-s3)**: Driver penyimpanan umum berbasis cloud (S3-compatible) terintegrasi untuk dokumen/invoice platform.
- **Puppeteer**: Pembuatan dokumen PDF dinamis secara asinkron (kartu pelajar, bundel kelulusan siswa, ekspor dokumen). PDFKit tidak digunakan.

Infrastructure Tools:
- **PM2**: Monitoring proses dan auto-restart backend.
- **Nginx**: Load balancing dan manajemen domain/SSL.
- **WireGuard**: Protokol VPN untuk tunneling akses publik.

Payment Gateways:
- **Midtrans**: (Integrated) Gateway pembayaran utama Indonesia.
- **Xendit**: (Alternative) Pendukung pembayaran tenant.
- **Tripay**: (Integrated) Gateway saluran pembayaran (payment channel) Indonesia dengan simulator dan pengecekan kesehatan internal terintegrasi.
- **Stripe**: (Integrated) Gateway pembayaran global untuk penanganan berlangganan paket (subscriptions) SaaS.
