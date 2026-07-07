# BUSINESS RULES - USER MANAGEMENT

### 1. Roles & Permissions Safety
- **No Self-Promotion**: Pengguna dilarang mengubah perannya sendiri ke jenjang yang lebih tinggi atau menambahkan kapabilitas ke perannya yang melebihi wewenang perannya saat ini.
- **Audit Logging**: Setiap tindakan reset password pengguna lain atau perubahan hak akses peran wajib mencatat detail log ke `activityLogService` lengkap dengan parameter yang diubah.
