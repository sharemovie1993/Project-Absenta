Instruksi Tahap Selanjutnya – Middleware Removal Plan

Tujuan tahap ini adalah menyusun rencana penghapusan middleware duplikat sebelum refactor dilakukan.

Tidak ada perubahan kode pada tahap ini.

Langkah audit:

1. Buat daftar middleware yang dipasang di setiap level:

global level
/api plugin level
module level

2. Tandai middleware yang seharusnya hanya ada satu kali.

Contoh:

AuthMiddleware
TenantMiddleware
CapabilityGuard

3. Buat tabel:

Middleware
Lokasi Saat Ini
Lokasi Target
Status

Contoh:

AuthMiddleware
global + /api + module
global
hapus duplikasi

TenantMiddleware
/api + module
/api
hapus module-level

CapabilityGuard
/api + module
/api
hapus module-level

4. Buat daftar module yang memasang middleware sendiri.

Contoh:

dashboard
attendance
billing
payment
invoice

5. Tentukan middleware mana yang harus dihapus dari setiap module.

6. Buat diagram pipeline setelah duplikasi dihapus.

Output yang diharapkan:

1 tabel removal plan
1 diagram pipeline baru

Tidak ada refactor kode pada tahap ini.
