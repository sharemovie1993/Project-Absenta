# BUSINESS RULES - MENU

### 1. Menu Authorization
- **Capability Guard**: Menu hanya akan muncul pada sidebar jika pengguna memiliki kapabilitas (`required_capability`) yang cocok. Jika menu tersebut tidak memiliki aturan kapabilitas, ia dianggap menu publik yang tampil untuk semua pengguna terotentikasi.
- **Org Scope Filter**: Beberapa menu khusus (seperti "Konseling BK" atau "Kasus Kesiswaan") difilter lebih lanjut berdasarkan posisi jabatan aktif aktor.
