# TODO WHATSAPP DEVICE GATEWAY

## High Priority
- [x] **Baileys Session Pool Manager**: Mengelola pool koneksi WA per tenant secara aman.
- [x] **QR Code Generator API**: Menyediakan QR login dinamis untuk scan HP.

## Medium Priority
- [ ] **Queue Message Dispatcher**: Mengatur jeda pengiriman pesan (misal: delay 2-5 detik antar pesan) agar nomor WhatsApp sekolah tidak diblokir oleh pihak WhatsApp karena dianggap spam.

## Low Priority
- [ ] **WhatsApp Connection Status Webhook**: Mengabarkan status online/offline via socket.io.

## Saran Fitur Baru
- [ ] **WhatsApp Business API Driver**: Dukungan driver opsional menggunakan jalur resmi WhatsApp Business API bagi sekolah berkebutuhan traffic sangat tinggi.
