# Fase 3.2: Data Layer, Models, & 9 Retrofit Services

## 📡 Daftar 9 Retrofit API Services (`com.absenta.app.data.api`)

1. **`AuthService.kt`**: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`, `POST /api/parent-app/auth/login`.
2. **`MenuService.kt`**: `GET /api/menu` (Dynamic Navigation).
3. **`ProfileService.kt`**: `GET /api/users/me`, `PATCH /api/users/me`, `POST /api/users/me/photo`, `POST /api/users/me/documents` (Multipart).
4. **`AttendanceService.kt`**: `POST /api/attendance/tap`, `GET /api/attendance/my`.
5. **`SesiKelasService.kt`**: `GET /api/sessions`, `POST /api/sessions`, `PATCH /api/sessions/{id}/close`, `DELETE /api/sessions/{id}`, `GET/POST /api/sessions/{id}/attendance`, `POST /api/sessions/{id}/teacher-attendance`.
6. **`AcademicService.kt`**: `GET /api/academic/my-schedule`.
7. **`KesiswaanService.kt`**: `GET /api/kesiswaan/my-poin`.
8. **`DashboardService.kt`**: `GET /api/dashboard/overview`.
9. **`ParentService.kt`**: `GET /api/parent-app/children`, `GET /api/parent-app/children/{id}/gate-status`, `GET /api/parent-app/children/{id}/attendance`.

---

## 💾 Storage Layer (`TokenManager.kt`)

Menggunakan **Jetpack DataStore Preferences** untuk menyimpan:
- `access_token` & `refresh_token`
- `user_id`, `user_name`, `user_role`
- `capabilities` (JSON List)
- `base_url` (Dapat diubah per-sekolah)
- `is_parent` (Flag alur login orang tua)
