# BUSINESS RULES - AUTH

### 1. Security & Token Policy
- **Token Lifespan**: Access token berdurasi pendek (15 menit) dan Refresh token berdurasi panjang (7 hari) yang disimpan di secure HTTP-only cookie.
- **Tenant Guard**: Resolusi tenant ID wajib bersumber dari token JWT terverifikasi, bukan header host untuk mencegah pembajakan domain.
- **Failed Login Lockout**: Percobaan login gagal sebanyak 5 kali berturut-turut pada email yang sama dalam 1 menit akan memicu pembatasan (Rate Limit 429).

### 2. Organizational Caching
- **Invalidation**: Setiap modifikasi profil Guru, kelas binaan wali kelas, atau mutasi jabatan struktural wajib memicu pembersihan cache Redis (`organizationalContextCache`) seketika.
