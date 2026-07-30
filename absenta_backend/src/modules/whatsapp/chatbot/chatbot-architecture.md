# ARSITEKTUR CHATBOT WHATSAPP MODULAR (ABSENTA)

## 📌 Deskripsi Arsitektur
Modul WhatsApp Chatbot Absenta dirancang menggunakan pola **Command Registry, Dynamic Context, dan Finite State Machine (FSM)**.
Arsitektur ini mengisolasi setiap domain layanan (Guru, Siswa, Orang Tua, Keuangan, dsb.) ke dalam berkas *handler* mandiri sehingga memudahkan pengembangan puluhan layanan baru di masa depan tanpa memicu efek samping (*regression free*).

---

## 🏛️ Komponen Utama

### 1. Core Engine (`chatbot/core/`)
* **`ChatbotContext`**: Interface konteks tunggal yang mengkapsulasi JID, nomor HP, pesan masukan, data persona (Guru, Siswa, OrangTua), tenant, dan peran aktif.
* **`SessionStateManager (FSM Engine)`**: Pengelola sesi dialog interaktif multi-step generik. Mendukung auto-expiration (TTL 5 menit) dan pembatalan global (`0`, `BATAL`, `MENU`).
* **`ChatbotRouter`**: Central router yang mendaftarkan seluruh *command handler* dan mencocokkan input pengguna.

### 2. Formatter Builder (`chatbot/formatters/`)
* **`WaMessageBuilder`**: Helper generik penyusun tampilan pesan WhatsApp (header, bullet list, menu section, status badge, dan footer petunjuk).

### 3. Domain Handlers (`chatbot/handlers/`)
* **`handlers/guru/`**: Mengelola seluruh fitur persona Guru (`GuruProfileHandler`, `GuruJadwalHandler`, `GuruPresensiHandler`, `GuruSupervisiHandler`, `GuruWalikelasHandler`).
* **`handlers/siswa/`**: Mengelola seluruh fitur persona Siswa (`SiswaHandler`).
* **`handlers/ortu/`**: Mengelola seluruh fitur persona Orang Tua (`OrtuHandler`).
* **`handlers/common/`**: Mengelola pemilihan multi-role dan penanganan nomor yang belum terdaftar.

---

## 📖 Panduan 3-Langkah Menambahkan Layanan Chatbot Baru

Bila Anda ingin menambahkan layanan baru di WhatsApp Chatbot Absenta (misal: **Modul Cek Tagihan SPP / Keuangan**):

### Langkah 1: Buat Handler Baru di Folder Domain Terkait
Buat berkas baru di `handlers/ortu/ortu-billing.handler.ts`:
```typescript
import { ChatbotContext } from '../../core/chatbot-context';

export class OrtuBillingHandler {
  static async handleCekTagihan(ctx: ChatbotContext): Promise<string> {
    const ortu = ctx.ortu;
    // Logika query billing ke database...
    return `💳 *Informasi Tagihan SPP Ananda*\n...`;
  }
}
```

### Langkah 2: Daftarkan Opsi Menu pada Formatter Menu
Tambahkan opsi menu baru di `formatOrtuMenu` pada `wa-chatbot-commands.ts`:
```text
[5] 💳 Cek Tagihan SPP & Keuangan Ananda
```

### Langkah 3: Daftarkan Command di Router (`ChatbotRouter`)
Buka `chatbot-router.ts` dan tambahkan pengkondisian route:
```typescript
if (choice === '5') return OrtuBillingHandler.handleCekTagihan(ctx);
```

---

## 🔒 Prinsip Desain & Hardening
1. **DRY (Don't Repeat Yourself)**: Pembuatan tampilan pesan wajib memanfaatkan `WaMessageBuilder`.
2. **State Isolation**: Setiap dialog interaktif yang memerlukan beberapa langkah input pengguna wajib menggunakan `SessionStateManager`.
3. **Type Safety**: Seluruh *context* dan handler wajib lolos uji `npx tsc --noEmit` secara bersih.
