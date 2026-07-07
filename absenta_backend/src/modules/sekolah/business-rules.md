# BUSINESS RULES - SEKOLAH

### 1. Profile Strictness
- **One Tenant One School**: Setiap tenant hanya dapat memiliki satu profil sekolah (`Sekolah`).
- **NPSN Format**: NPSN wajib berupa 8 digit angka numerik valid.
- **Geofencing Coordinates**: Koordinat sekolah harus di-set secara presisi (bernilai valid latitude/longitude) sebelum fitur absensi berbasis lokasi diizinkan aktif.
