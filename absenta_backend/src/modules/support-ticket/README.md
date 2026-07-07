# MODULE SUPPORT TICKET

## Deskripsi
Modul Support Ticket adalah portal pusat bantuan (*Customer Helpdesk*) terintegrasi yang menghubungkan Admin Sekolah (Tenant) langsung dengan tim bantuan platform Absenta.id untuk pelaporan bug atau permohonan fitur baru.

## Aktor & Peran
- **Admin Sekolah (Tenant Admin)**: Membuat tiket bantuan, mengirim pesan lampiran detail, dan memberikan rating bintang pelayanan.
- **Platform Support Agent**: Menangani tiket masuk, mengubah prioritas tiket, merujuk artikel solusi bantuan (*Knowledge Base*).

## Sub-Modul & Fitur Terimplementasi
### 1. Helpdesk System
- **Ticket Lifecycle**: Transisi status tiket (`OPEN`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`).
- **Knowledge Base (FAQ)**: Repositori artikel panduan cara penggunaan aplikasi.
- **Quick Replies**: Draf jawaban cepat agen bantuan untuk pertanyaan umum.

## Teknologi & Pattern
- **Pattern**: Customer Support Workflow, SLA Monitoring.
- **Database**: Tabel `SupportTicket`, `TicketMessage`, `KnowledgeBaseArticle`.
