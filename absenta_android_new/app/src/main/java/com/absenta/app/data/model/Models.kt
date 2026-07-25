package com.absenta.app.data.model

import com.google.gson.annotations.SerializedName
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Format tanggal dari YYYY-MM-DD ke format "17 Jul 2026" */
fun formatDateIndonesian(raw: String?): String {
    if (raw.isNullOrBlank()) return "-"
    return try {
        val cleanDate = raw.take(10)
        val sdfInput = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val date = sdfInput.parse(cleanDate)
        if (date != null) {
            val sdfOutput = SimpleDateFormat("dd MMM yyyy", Locale("id", "ID"))
            return sdfOutput.format(date)
        }
        cleanDate
    } catch (e: Exception) {
        raw.take(10)
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH & LOGIN MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/** Request body untuk endpoint login */
data class LoginRequest(
    val email: String? = null,
    val identifier: String? = null,
    val password: String
)

/** Response dari endpoint login */
data class LoginResponse(
    val success: Boolean,
    val message: String?,
    val data: LoginData?
)

/** Data payload dari response login */
data class LoginData(
    @SerializedName("token") val tokenStr: String? = null,
    @SerializedName("access_token") val accessTokenStr: String? = null,
    @SerializedName("refreshToken") val refreshTokenStr: String? = null,
    @SerializedName("refresh_token") val refreshTokenLegacyStr: String? = null,
    val user: UserProfile
) {
    val accessToken: String
        get() = tokenStr ?: accessTokenStr ?: ""
    val refreshToken: String
        get() = refreshTokenStr ?: refreshTokenLegacyStr ?: ""
}

/** Request body untuk refresh token */
data class RefreshTokenRequest(
    @SerializedName("refresh_token") val refreshToken: String
)

/** Request payload untuk bypass terlambat di gerbang */
data class BypassLateRequest(
    @SerializedName("siswa_id") val siswaId: String,
    val note: String? = "Bypass Mode"
)

/** Response dari endpoint refresh token */
data class RefreshTokenResponse(
    val success: Boolean,
    @SerializedName("access_token") val accessToken: String?,
    @SerializedName("refresh_token") val refreshToken: String?
)

// ═══════════════════════════════════════════════════════════════════════════════
// USER PROFILE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/** Response wrapper untuk GET /api/auth/me */
data class AuthMeResponse(
    val success: Boolean,
    val message: String?,
    val data: UserProfile?
)

/** Profil lengkap pengguna yang login */
data class UserProfile(
    val id: String = "me",
    @SerializedName("full_name") val fullName: String? = null,
    val name: String? = null,
    val email: String? = null,
    val username: String? = null,
    val role: UserRole? = null,
    val capabilities: List<String> = emptyList(),
    @SerializedName("tenant_id") val tenantId: String? = null,
    @SerializedName("photo_url") val photoUrl: String? = null,
    @SerializedName("foto_url") val fotoUrlRaw: String? = null,
    @SerializedName("avatar_url") val avatarUrl: String? = null,
    @SerializedName("foto") val fotoRaw: String? = null,
    val phone: String? = null,
    val address: String? = null,
    @SerializedName("tenant") val tenantInfo: TenantInfo? = null,
    @SerializedName("siswa_id") val siswaIdRaw: String? = null,
    @SerializedName("siswa_profile") val siswaProfileAlt: SiswaProfile? = null,
    @SerializedName("guru_profile") val guruProfileAlt: GuruProfile? = null,
    @SerializedName("Siswa") val siswaObj: SiswaProfile? = null,
    @SerializedName("Guru") val guruObj: GuruProfile? = null
) {
    val siswaId: String?
        get() = siswaIdRaw ?: siswa?.id

    val siswa: SiswaProfile?
        get() = siswaProfileAlt ?: siswaObj

    val guru: GuruProfile?
        get() = guruProfileAlt ?: guruObj

    val displayName: String
        get() = siswa?.namaSiswa ?: guru?.namaGuru ?: fullName ?: name ?: username ?: email ?: "Pengguna"

    val resolvedPhotoUrl: String?
        get() {
            val raw = photoUrl ?: fotoUrlRaw ?: avatarUrl ?: fotoRaw ?: siswa?.fotoUrl ?: siswa?.foto ?: guru?.fotoUrl ?: guru?.foto
            if (raw.isNullOrEmpty()) return null
            if (raw.startsWith("http://") || raw.startsWith("https://")) return raw
            return "http://10.10.10.250:3004${if (raw.startsWith("/")) "" else "/"}$raw"
        }
}

data class TenantInfo(
    val id: String? = null,
    val name: String? = null,
    val domain: String? = null
)

/** Role pengguna */
data class UserRole(
    val id: String = "role",
    val name: String = "USER"
)

/** Profil khusus Siswa */
data class SiswaProfile(
    val id: String,
    @SerializedName("nama_siswa") val namaSiswa: String? = null,
    val nisn: String? = null,
    val nis: String? = null,
    @SerializedName("no_rfid") val noRfid: String? = null,
    @SerializedName("foto_url") val fotoUrl: String? = null,
    @SerializedName("foto") val foto: String? = null,
    @SerializedName("no_hp") val noHp: String? = null,
    val alamat: String? = null,
    @SerializedName("tanggal_lahir") val tanggalLahir: String? = null,
    @SerializedName("tempat_lahir") val tempatLahir: String? = null,
    @SerializedName("jenis_kelamin") val jenisKelamin: String? = null,
    val agama: String? = null,
    @SerializedName("Kelas") val kelas: KelasInfo? = null,
    @SerializedName("Jurusan") val jurusan: MasterJurusanItem? = null
)

/** Profil khusus Guru/Pegawai */
data class GuruProfile(
    val id: String,
    @SerializedName("nama_guru") val namaGuru: String? = null,
    val nip: String? = null,
    @SerializedName("foto_url") val fotoUrl: String? = null,
    @SerializedName("foto") val foto: String? = null,
    @SerializedName("jenis_ptk") val jenisPtk: String? = null,
    @SerializedName("no_hp") val noHp: String? = null,
    val alamat: String? = null,
    @SerializedName("tanggal_lahir") val tanggalLahir: String? = null,
    @SerializedName("tempat_lahir") val tempatLahir: String? = null,
    @SerializedName("jenis_kelamin") val jenisKelamin: String? = null,
    val agama: String? = null,
    @SerializedName("status_kepegawaian") val statusKepegawaian: String? = null,
    @SerializedName("pendidikan_terakhir") val pendidikanTerakhir: String? = null
)

/** Informasi kelas */
data class KelasInfo(
    val id: String? = null,
    @SerializedName("nama_kelas") val namaKelas: String? = null,
    @SerializedName("tingkat") val tingkat: Int? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// MENU / NAVIGATION MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class MenuResponse(
    val success: Boolean,
    val data: List<MenuGroup>?
)

data class MenuGroup(
    val group: String?,
    val items: List<MenuItem>
)

data class MenuItem(
    val key: String,
    val label: String,
    val icon: String?,
    val route: String?,
    val capability: String?
)

// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE / PRESENSI MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class TapRequest(
    @SerializedName("siswa_id") val siswaId: String? = null,
    val token: String? = null,
    val arah: String = "GERBANG_DATANG"
)

data class TapResponse(
    val success: Boolean,
    val message: String?,
    val data: TapData?
)

data class TapData(
    val id: String?,
    val status: String?,
    val arah: String?,
    @SerializedName("created_at") val createdAt: String?,
    @SerializedName("is_terlambat") val isTerlambat: Boolean? = false,
    @SerializedName("siswa_info") val siswaInfoData: AbsensiSiswaInfo? = null,
    @SerializedName("guru_info") val guruInfoData: AbsensiGuruInfo? = null,
    val siswa: AbsensiSiswaInfo? = null,
    val guru: AbsensiGuruInfo? = null
) {
    val resolvedSiswa: AbsensiSiswaInfo?
        get() = siswaInfoData ?: siswa
    val resolvedGuru: AbsensiGuruInfo?
        get() = guruInfoData ?: guru
}

data class AbsensiSiswaInfo(
    val id: String?,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("nama_siswa") val namaSiswa: String? = null,
    val nama: String? = null,
    val nisn: String? = null,
    val nis: String? = null,
    @SerializedName("kelas_nama") val kelasNama: String? = null
) {
    val displayName: String
        get() = namaSiswa ?: nama ?: fullName ?: "Siswa"
}

data class AbsensiGuruInfo(
    val id: String?,
    @SerializedName("nama_guru") val namaGuru: String? = null,
    val nama: String? = null,
    val nip: String? = null,
    @SerializedName("jenis_ptk") val jenisPtk: String? = "PENDIDIK"
) {
    val displayName: String
        get() = namaGuru ?: nama ?: "Guru"
}

data class AttendanceSummary(
    val hadir: Int = 0,
    val izin: Int = 0,
    val sakit: Int = 0,
    val alpa: Int = 0,
    val terlambat: Int = 0,
    @SerializedName("total_hari") val totalHari: Int = 0,
    @SerializedName("persentase_hadir") val persentaseHadir: Double = 0.0
)

data class MyAttendanceResponse(
    val success: Boolean,
    val message: String? = null,
    val data: MyAttendanceData? = null
)

data class MyAttendanceData(
    @SerializedName("nama_siswa") val namaSiswa: String? = null,
    @SerializedName("bulan") val bulan: String? = null,
    @SerializedName("persentase_kehadiran") val persentaseKehadiran: Double = 0.0,
    @SerializedName("total_hadir") val totalHadir: Int = 0,
    @SerializedName("total_izin") val totalIzin: Int = 0,
    @SerializedName("total_sakit") val totalSakit: Int = 0,
    @SerializedName("total_alpa") val totalAlpa: Int = 0,
    @SerializedName("total_terlambat") val totalTerlambat: Int = 0,
    @SerializedName("total_poin") val totalPoin: Int = 0,
    @SerializedName("detail") val records: List<AttendanceRecord>? = null,
    val summary: AttendanceSummary? = null
) {
    val resolvedSummary: AttendanceSummary
        get() = summary ?: AttendanceSummary(
            hadir = totalHadir,
            izin = totalIzin,
            sakit = totalSakit,
            alpa = totalAlpa,
            terlambat = totalTerlambat,
            persentaseHadir = persentaseKehadiran
        )
}

data class AttendanceRecord(
    val id: String = "",
    val tanggal: String? = null,
    val status: String? = null,
    val arah: String? = null,
    val keterangan: String? = null,
    @SerializedName("waktu_tap") val waktuTap: String? = null,
    @SerializedName("jam_datang") val jamDatang: String? = null,
    @SerializedName("jam_pulang") val jamPulang: String? = null,
    @SerializedName("is_terlambat") val isTerlambat: Boolean? = false
)

// ═══════════════════════════════════════════════════════════════════════════════
// SESI KELAS MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class SesiKelasListResponse(
    val success: Boolean,
    val data: List<SesiKelas>?,
    val pagination: PaginationInfo?
)

data class ProgresMateriData(
    @SerializedName("judul_materi") val judulMateri: String? = null,
    val deskripsi: String? = null,
    @SerializedName("pencapaian_persen") val pencapaianPersen: Int? = 0,
    val kendala: String? = null
)

data class SesiCountData(
    @SerializedName("AbsenSiswa") val absenSiswa: Int = 0
)

data class SesiKelasSummaryData(
    val hadir: Int = 0,
    @SerializedName("HADIR") val hadirUpper: Int = 0,
    val total: Int = 0
) {
    val resolvedHadir: Int
        get() = maxOf(hadir, hadirUpper)
}

data class SesiKelasResponse(
    val success: Boolean,
    val data: SesiKelas?
)

typealias SesiKelasItem = SesiKelas

data class SesiKelas(
    val id: String,
    @SerializedName("nama_sesi") val namaSesi: String?,
    val tanggal: String?,
    val status: String?,
    @SerializedName("kelas_id") val kelasId: String?,
    @SerializedName("waktu_mulai") val waktuMulai: String? = null,
    @SerializedName("waktu_selesai") val waktuSelesai: String? = null,
    @SerializedName("sumber_sesi") val sumberSesi: String? = null,
    @SerializedName("sumber") val sumber: String? = null,
    @SerializedName("materi_dibahas") val materiDibahas: String? = null,
    @SerializedName("catatan_kbm") val catatanKbm: String? = null,
    @SerializedName("ProgresMateri") val progresMateri: ProgresMateriData? = null,
    @SerializedName("summary") val summary: SesiKelasSummaryData? = null,
    @SerializedName("_count") val countData: SesiCountData? = null,
    @SerializedName("Kelas") val kelas: KelasInfo? = null,
    @SerializedName("Mapel") val mapel: MapelInfo? = null,
    @SerializedName("Guru") val guru: GuruProfile? = null,
    @SerializedName("total_siswa") val totalSiswa: Int = 0,
    @SerializedName("total_hadir") val totalHadir: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null
) {
    val displayNama: String
        get() = namaSesi ?: mapel?.namaMapel ?: "Sesi KBM"

    val displayGuru: String
        get() = guru?.namaGuru ?: "Guru Pengajar"

    val displayMapel: String
        get() = mapel?.namaMapel ?: namaSesi ?: "Mata Pelajaran"

    val displayKelas: String
        get() = kelas?.namaKelas ?: "Kelas KBM"

    val waktuDisplay: String
        get() = waktuFormatted

    val jurnalKbm: String
        get() = materiDibahas ?: progresMateri?.judulMateri ?: ""

    val kelasNama: String?
        get() = kelas?.namaKelas

    val tanggalFormatted: String
        get() = formatDateIndonesian(tanggal)

    val waktuFormatted: String
        get() {
            fun parseTime(raw: String?): String {
                if (raw.isNullOrBlank()) return ""
                return try {
                    if (raw.contains("T")) {
                        val sdfInput = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm", java.util.Locale.getDefault())
                        sdfInput.timeZone = java.util.TimeZone.getTimeZone("UTC")
                        val date = sdfInput.parse(raw.take(16))
                        if (date != null) {
                            val sdfOutput = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault())
                            sdfOutput.timeZone = java.util.TimeZone.getTimeZone("Asia/Jakarta")
                            return sdfOutput.format(date)
                        }
                    }
                    raw.take(5)
                } catch (e: Exception) {
                    raw.take(5)
                }
            }
            val start = parseTime(waktuMulai)
            val end = parseTime(waktuSelesai)
            return if (start.isNotBlank() && end.isNotBlank()) {
                "$start – $end WIB"
            } else if (start.isNotBlank()) {
                "$start WIB"
            } else {
                "Jam Pelajaran Reguler"
            }
        }

    val resolvedMateri: String
        get() = (materiDibahas ?: progresMateri?.judulMateri ?: progresMateri?.deskripsi).takeIf { !it.isNullOrBlank() } ?: "Materi KBM Reguler"

    val resolvedCatatan: String
        get() = (catatanKbm ?: progresMateri?.deskripsi).takeIf { !it.isNullOrBlank() } ?: "Jurnal mengajar tersimpan."

    val resolvedHadirCount: Int
        get() {
            val sumHadir = summary?.resolvedHadir ?: 0
            if (sumHadir > 0) return sumHadir
            if (totalHadir > 0) return totalHadir
            if (countData != null && countData.absenSiswa > 0) return countData.absenSiswa
            return 0
        }
    /** True jika sesi dibuat otomatis dari template/sistem, False jika manual */
    val isOtomatisSistem: Boolean
        get() {
            val src = (sumberSesi ?: sumber ?: "").uppercase().trim()
            return src == "TEMPLATE" || src == "SISTEM" || src == "AUTOMATIC"
        }

    /** Resolved Status 3 Kondisi (SEGERA MULAI, BERLANGSUNG, SELESAI, TERLEWAT) */
    val resolvedStatus: String
        get() {
            val s = (status ?: "").uppercase().trim()
            if (s == "SELESAI" || s == "CLOSED") return "SELESAI"
            if (s == "SEGERA_MULAI" || s == "UPCOMING") return "SEGERA MULAI"

            // Hitung jam dinamis jika status backend "AKTIF" / null
            val now = Date()
            fun parseFull(str: String?): Date? {
                if (str.isNullOrBlank()) return null
                return try {
                    if (str.contains("T")) {
                        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                        sdf.timeZone = TimeZone.getTimeZone("UTC")
                        sdf.parse(str.take(19))
                    } else if (str.contains(" ")) {
                        val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
                        sdf.parse(str)
                    } else null
                } catch (e: Exception) { null }
            }

            val startAt = parseFull(waktuMulai)
            val endAt = parseFull(waktuSelesai)

            if (startAt != null && endAt != null) {
                if (now < startAt) return "SEGERA MULAI"
                if (now >= startAt && now <= endAt) return "BERLANGSUNG"
                if (now > endAt) return "TERLEWAT"
            }
            return if (s.isNotBlank()) s else "BERLANGSUNG"
        }

    /** Format tampilan range waktu, misal "07:00 – 09:00" */
    val timeRangeDisplay: String
        get() {
            fun parseTime(fullStr: String?): String {
                if (fullStr.isNullOrBlank()) return ""
                val trimmed = fullStr.trim()

                // ISO Format (misal: "2026-07-24T06:20:00.000Z") -> Konversi UTC ke Asia/Jakarta WIB
                if (trimmed.contains("T")) {
                    try {
                        val sdfInput = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
                        sdfInput.timeZone = TimeZone.getTimeZone("UTC")
                        val date = sdfInput.parse(trimmed.take(19))
                        if (date != null) {
                            val sdfOutput = SimpleDateFormat("HH:mm", Locale.getDefault())
                            sdfOutput.timeZone = TimeZone.getTimeZone("Asia/Jakarta")
                            return sdfOutput.format(date)
                        }
                    } catch (e: Exception) {}
                }

                // Format "2026-07-24 13:20:00"
                if (trimmed.contains(" ")) {
                    val timePart = trimmed.split(" ").getOrNull(1) ?: ""
                    if (timePart.length >= 5) return timePart.take(5)
                }

                return trimmed.take(5)
            }

            val start = parseTime(waktuMulai)
            val end = parseTime(waktuSelesai)
            return if (start.isNotBlank() && end.isNotBlank()) {
                "$start – $end"
            } else if (start.isNotBlank()) {
                start
            } else {
                "-"
            }
        }
}

data class CreateSesiRequest(
    @SerializedName("nama_sesi") val namaSesi: String,
    val tanggal: String,
    @SerializedName("kelas_id") val kelasId: String,
    @SerializedName("mapel_id") val mapelId: String? = null
)

data class CreateSesiManualRequest(
    @SerializedName("nama_sesi") val namaSesi: String? = null,
    @SerializedName("kelas_id") val kelasId: String,
    @SerializedName("guru_id") val guruId: String? = null,
    @SerializedName("mapel_id") val mapelId: String? = null,
    @SerializedName("jenis_kegiatan_id") val jenisKegiatanId: String? = null,
    val tanggal: String? = null,
    @SerializedName("waktu_mulai") val waktuMulai: String? = null,
    @SerializedName("waktu_selesai") val waktuSelesai: String? = null,
    val keterangan: String? = null
)

data class MasterJenisKegiatanResponse(
    val success: Boolean,
    val data: List<MasterJenisKegiatanItem>? = null
)

data class PetugasCheckResponse(
    val success: Boolean,
    val data: PetugasCheckData? = null
)

data class PetugasCheckData(
    val active: Boolean = false,
    @SerializedName("managed_kelas_ids") val managedKelasIds: List<String>? = null,
    @SerializedName("managed_kelas_names") val managedKelasNames: String? = null,
    @SerializedName("is_petugas_kelas") val isPetugasKelas: Boolean = false
)

data class MasterJenisKegiatanItem(
    val id: String = "",
    @SerializedName("nama_jenis") val namaJenis: String? = null,
    @SerializedName("nama_kegiatan") val namaKegiatanStr: String? = null,
    val kode: String? = null
) {
    val namaKegiatan: String
        get() = namaJenis ?: namaKegiatanStr ?: kode ?: "KBM Reguler"
}

data class AbsenSiswaRequest(
    @SerializedName("siswa_id") val siswaId: String,
    val status: String,
    val keterangan: String? = null
)

data class SesiAbsensiResponse(
    val success: Boolean,
    val data: List<SiswaAbsensiItem>?
)

data class SiswaAbsensiItem(
    val id: String = "",
    @SerializedName("siswa_id") val siswaIdRaw: String? = null,
    @SerializedName("siswa_akademik_id") val siswaAkademikIdRaw: String? = null,
    @SerializedName("nama_siswa") val namaSiswaRaw: String? = null,
    @SerializedName("nisn") val nisnRaw: String? = null,
    @SerializedName("nis") val nisRaw: String? = null,
    val status: String? = "PENDING",
    @SerializedName("waktu_tap") val waktuTap: String? = null,
    @SerializedName("foto_url") val fotoUrl: String? = null,
    @SerializedName("no_rfid") val noRfid: String? = null,
    @SerializedName("Siswa") val siswaObj: AbsensiSiswaInfo? = null
) {
    val siswaId: String
        get() = siswaIdRaw ?: siswaObj?.id ?: id

    val siswaAkademikId: String
        get() = siswaAkademikIdRaw ?: siswaId

    val namaSiswa: String
        get() = namaSiswaRaw ?: siswaObj?.namaSiswa ?: siswaObj?.fullName ?: "Siswa"

    val nis: String
        get() = nisRaw ?: siswaObj?.nis ?: "-"

    val nisn: String
        get() = nisnRaw ?: siswaObj?.nisn ?: "-"

    val displayNis: String
        get() = nis.takeIf { it != "-" && it.isNotBlank() } ?: nisn.takeIf { it != "-" && it.isNotBlank() } ?: "-"
}

data class NotPresentStudentItem(
    val id: String = "",
    @SerializedName("nama_siswa") val namaSiswa: String? = null,
    @SerializedName("nis") val nis: String? = null,
    @SerializedName("nisn") val nisn: String? = null,
    @SerializedName("kelas_id") val kelasId: String? = null,
    @SerializedName("Kelas") val kelas: KelasInfo? = null
) {
    val displayNis: String
        get() = nis?.takeIf { it.isNotBlank() } ?: nisn?.takeIf { it.isNotBlank() } ?: "-"
}

data class NotPresentStudentsResponse(
    val success: Boolean,
    val data: List<NotPresentStudentItem>? = null
)

data class MarkGateAbsenceRequest(
    @SerializedName("siswa_id") val siswaId: String,
    val status: String
)

data class GerbangStatsResponse(
    val success: Boolean,
    val data: GerbangStatsData? = null
)

data class GerbangStatsData(
    val date: String? = null,
    val masuk: Int = 0,
    val keluar: Int = 0,
    @SerializedName("total_target") val totalTarget: Int = 0,
    @SerializedName("total_taps") val totalTaps: Int = 0,
    @SerializedName("students_entered") val studentsEntered: Int = 0,
    @SerializedName("students_exited") val studentsExited: Int = 0,
    @SerializedName("total_students_target") val totalStudentsTarget: Int = 0,
    @SerializedName("currently_present") val currentlyPresent: Int = 0
) {
    val resolvedMasuk: Int
        get() = if (masuk > 0) masuk else studentsEntered
    val resolvedKeluar: Int
        get() = if (keluar > 0) keluar else studentsExited
    val resolvedTotalTarget: Int
        get() = if (totalTarget > 0) totalTarget else totalStudentsTarget
    val resolvedBelum: Int
        get() = maxOf(0, resolvedTotalTarget - resolvedMasuk)
    val progressPercent: Int
        get() = if (resolvedTotalTarget > 0) Math.round((resolvedMasuk.toFloat() / resolvedTotalTarget.toFloat()) * 100f).toInt() else 0
}

data class SesiTapRequest(
    val identifier: String? = null,
    @SerializedName("siswa_id") val siswaId: String? = null,
    @SerializedName("siswa_akademik_id") val siswaAkademikId: String? = null,
    val status: String? = "HADIR"
)

data class SesiTapResponse(
    val success: Boolean,
    val message: String? = null,
    val data: SesiTapData? = null
)

data class SesiTapData(
    val id: String? = null,
    val status: String? = null,
    @SerializedName("siswa") val siswa: SiswaInfo? = null
)

data class AbsenSiswaSesiResponse(
    val success: Boolean,
    val data: List<AbsenSiswaSesiItem>? = null
)

data class AbsenSiswaSesiItem(
    val id: String = "",
    @SerializedName("siswa_id") val siswaId: String? = null,
    val status: String? = "ALPA",
    @SerializedName("is_terlambat") val isTerlambat: Boolean = false,
    @SerializedName("waktu_absen") val waktuAbsen: String? = null,
    @SerializedName("Siswa") val siswa: SiswaInfo? = null
)

data class ProgresMateriRequest(
    @SerializedName("materi_dibahas") val materiDibahas: String? = null,
    @SerializedName("catatan_kbm") val catatanKbm: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// ACADEMIC / JADWAL MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class MyScheduleResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<JadwalHarian>? = null
)

data class JadwalHarian(
    val id: String = "",
    val hari: String? = null,
    @SerializedName("slot_index") val slotIndex: Int? = null,
    @SerializedName("jam_mulai") val jamMulai: String? = null,
    @SerializedName("jam_selesai") val jamSelesai: String? = null,
    @SerializedName("mata_pelajaran") val mataPelajaranStr: String? = null,
    @SerializedName("nama_guru") val namaGuruStr: String? = null,
    @SerializedName("nama_kelas") val namaKelasStr: String? = null,
    @SerializedName("Mapel") val mapelObj: MapelInfo? = null,
    @SerializedName("Guru") val guruObj: GuruInfo? = null,
    @SerializedName("Kelas") val kelasObj: KelasInfo? = null
) {
    val mataPelajaran: String
        get() = mapelObj?.namaMapel ?: mataPelajaranStr ?: "Mata Pelajaran"
    val namaGuru: String?
        get() = guruObj?.namaGuru ?: namaGuruStr
    val namaKelas: String?
        get() = kelasObj?.namaKelas ?: namaKelasStr
    val jamKe: Int
        get() = slotIndex ?: 1
}

data class MapelInfo(
    @SerializedName("nama_mapel") val namaMapel: String? = null,
    @SerializedName("kode_mapel") val kodeMapel: String? = null
)

data class GuruInfo(
    val id: String? = null,
    @SerializedName("nama_guru") val namaGuru: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// KESISWAAN / POIN MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class MyPoinResponse(
    val success: Boolean,
    val message: String? = null,
    val data: MyPoinData? = null
)

data class MyPoinData(
    val list: List<PoinItem>? = null,
    val summary: PoinSummary? = null
) {
    val items: List<PoinItem>
        get() = list ?: summary?.pelanggaran ?: emptyList()
}

data class PoinSummary(
    @SerializedName("total_poin_pelanggaran") val totalPoinPelanggaran: Int = 0,
    @SerializedName("total_poin_prestasi") val totalPoinPrestasi: Int = 0,
    @SerializedName("net_poin") val netPoin: Int = 0,
    val pelanggaran: List<PoinItem>? = null,
    val prestasi: List<PoinItem>? = null
)

data class PoinItem(
    val id: String = "",
    val poin: Int? = 0,
    val keterangan: String? = null,
    val tanggal: String? = null,
    val jenis: String? = null,
    val status: String? = null,
    @SerializedName("jenis_pelanggaran") val jenisPelanggaran: String? = null,
    @SerializedName("Siswa") val siswa: SiswaInfo? = null
) {
    val displayKeterangan: String
        get() = jenisPelanggaran ?: keterangan ?: "Catatan Pelanggaran"

    val displaySiswa: String
        get() = siswa?.namaSiswa ?: "Siswa"

    val displayPelanggaran: String
        get() = jenisPelanggaran ?: keterangan ?: "Catatan Poin"

    val tanggalFormatted: String
        get() = formatDateIndonesian(tanggal)
}

data class SiswaInfo(
    val id: String? = null,
    @SerializedName("nama_siswa") val namaSiswa: String? = null,
    val nis: String? = null,
    @SerializedName("Kelas") val kelas: KelasInfo? = null
)

data class JenisPelanggaranItem(
    val id: String,
    @SerializedName("nama_pelanggaran") val namaPelanggaranStr: String? = null,
    val nama: String? = null,
    val poin: Int? = 0,
    val kategori: String? = null
) {
    val namaPelanggaran: String
        get() = namaPelanggaranStr ?: nama ?: "Pelanggaran"
}

data class ReportPelanggaranRequest(
    @SerializedName("siswa_id") val siswaId: String,
    val tanggal: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
    @SerializedName("jenis_pelanggaran") val jenisPelanggaran: String,
    @SerializedName("jenis_pelanggaran_id") val jenisPelanggaranId: String? = null,
    val keterangan: String? = null,
    val poin: Int = 10
)

// ═══════════════════════════════════════════════════════════════════════════════
// MASTER DATA REFERENCE MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class MasterKelasResponse(
    val success: Boolean,
    val data: List<MasterKelasItem>?
)

data class MasterKelasItem(
    val id: String,
    @SerializedName("nama_kelas") val namaKelas: String?,
    val tingkat: Int?
)

data class MasterMapelResponse(
    val success: Boolean,
    val data: List<MasterMapelItem>?
)

data class MasterMapelItem(
    val id: String,
    @SerializedName("nama_mapel") val namaMapel: String?,
    @SerializedName("kode_mapel") val kodeMapel: String?
)

data class MasterGuruResponse(
    val success: Boolean,
    val data: List<MasterGuruItem>?
)

data class MasterGuruItem(
    val id: String,
    @SerializedName("nama_guru") val namaGuru: String?,
    val nip: String?,
    val email: String?
)

data class MasterJurusanResponse(
    val success: Boolean,
    val data: List<MasterJurusanItem>?
)

data class MasterJurusanItem(
    val id: String,
    val nama: String?,
    val kode: String?,
    val singkatan: String?
)

data class MasterTahunPelajaranResponse(
    val success: Boolean,
    val data: List<MasterTahunPelajaranItem>?
)

data class MasterTahunPelajaranItem(
    val id: String,
    val tahun: String?,
    @SerializedName("is_active") val isActive: Boolean = false
)

// ═══════════════════════════════════════════════════════════════════════════════
// PIKET & SURAT IZIN SISWA MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class IzinKeluarSiswaResponse(
    val success: Boolean,
    val data: List<IzinKeluarSiswaItem>? = null
)

data class CreatePermitResponse(
    val success: Boolean,
    val data: IzinKeluarSiswaItem? = null
)

data class IzinKeluarSiswaItem(
    val id: String = "",
    @SerializedName("siswa_akademik_id") val siswaAkademikId: String? = null,
    @SerializedName("guru_piket_id") val guruPiketId: String? = null,
    @SerializedName("jam_keluar") val jamKeluar: String? = null,
    @SerializedName("jam_kembali") val jamKembali: String? = null,
    val alasan: String? = null,
    @SerializedName("tipe_izin") val tipeIzin: String? = null,
    val status: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("SiswaAkademik") val siswaAkademikObj: SiswaAkademikPermitInfo? = null,
    @SerializedName("GuruPiket") val guruPiketObj: GuruInfo? = null
) {
    val namaSiswa: String
        get() = siswaAkademikObj?.siswa?.namaSiswa ?: "Siswa"

    val displayNamaSiswa: String
        get() = namaSiswa

    val nis: String
        get() = siswaAkademikObj?.siswa?.nis ?: "-"

    val kelasNama: String
        get() = siswaAkademikObj?.kelas?.namaKelas ?: "-"

    val displayKelas: String
        get() = kelasNama

    val displayTipeIzin: String
        get() = when ((tipeIzin ?: "").uppercase()) {
            "IZIN_KELUAR" -> "🚗 Izin Keluar"
            "PULANG_AWAL" -> "🏠 Pulang Awal"
            "IZIN_JURUSAN" -> "🛠️ Izin Jurusan"
            else -> "🚗 Surat Izin"
        }

    val jamKeluarFormatted: String
        get() = jamKeluar?.split("T")?.getOrNull(1)?.take(5) ?: jamKeluar?.take(5) ?: "--:--"

    val displayJamKeluar: String
        get() = jamKeluarFormatted

    val jamKembaliFormatted: String
        get() = jamKembali?.split("T")?.getOrNull(1)?.take(5) ?: jamKembali?.take(5) ?: ""

    val displayJamKembali: String
        get() = jamKembaliFormatted
}

data class SiswaAkademikPermitInfo(
    val id: String? = null,
    @SerializedName("siswa") val siswa: SiswaInfo? = null,
    @SerializedName("kelas") val kelas: KelasInfo? = null
)

data class CreatePermitRequest(
    @SerializedName("siswa_akademik_id") val siswaAkademikId: String,
    @SerializedName("guru_piket_id") val guruPiketId: String? = null,
    val alasan: String,
    @SerializedName("tipe_izin") val tipeIzin: String,
    @SerializedName("jam_keluar") val jamKeluar: String? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// SUPERVISI KBM & PENGAJARAN GURU MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class SupervisiResponse(
    val success: Boolean,
    val data: List<SupervisiItem>? = null
)

data class CreateSupervisiResponse(
    val success: Boolean,
    val data: SupervisiItem? = null
)

data class SupervisiItem(
    val id: String = "",
    @SerializedName("guru_id") val guruId: String? = null,
    @SerializedName("supervisor_id") val supervisorId: String? = null,
    val tanggal: String? = null,
    @SerializedName("jam_ke") val jamKe: Int? = null,
    val kelas: String? = null,
    val mapel: String? = null,
    val catatan: String? = null,
    val nilai: Int? = null,
    val status: String? = null,
    @SerializedName("is_verified") val isVerified: Boolean? = null,
    @SerializedName("target_pembelajaran") val targetPembelajaran: String? = null,
    @SerializedName("Guru") val guru: GuruInfo? = null,
    @SerializedName("Supervisor") val supervisor: GuruInfo? = null
) {
    val namaGuru: String
        get() = guru?.namaGuru ?: "Guru Pengajar"

    val namaSupervisor: String
        get() = supervisor?.namaGuru ?: "Kepala Sekolah / Kurikulum"

    val tanggalFormatted: String
        get() = formatDateIndonesian(tanggal)

    val nilaiFormatted: String
        get() = if (nilai != null) "$nilai / 100" else "Belum Dinilai"
}

data class CreateSupervisiRequest(
    @SerializedName("guru_id") val guruId: String,
    val tanggal: String,
    val kelas: String? = null,
    val mapel: String? = null,
    val nilai: Int? = null,
    val catatan: String? = null,
    @SerializedName("target_pembelajaran") val targetPembelajaran: String? = null,
    val status: String = "COMPLETED"
)

// ═══════════════════════════════════════════════════════════════════════════════
// KALENDER AKADEMIK & AGENDA SEKOLAH MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class KalenderResponse(
    val success: Boolean,
    val data: List<KalenderEventItem>? = null
)

data class CreateKalenderResponse(
    val success: Boolean,
    val data: KalenderEventItem? = null
)

data class KalenderEventItem(
    val id: String = "",
    val judul: String? = null,
    val jenis: String? = null,
    @SerializedName("tanggal_mulai") val tanggalMulai: String? = null,
    @SerializedName("tanggal_selesai") val tanggalSelesai: String? = null,
    val keterangan: String? = null,
    @SerializedName("tahun_pelajaran_id") val tahunPelajaranId: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
) {
    val displayJudul: String
        get() = judul ?: "Agenda Sekolah"

    val displayJenis: String
        get() = when ((jenis ?: "").uppercase()) {
            "LIBUR_NASIONAL" -> "🔴 Libur Nasional"
            "LIBUR_SEKOLAH" -> "📙 Libur Sekolah"
            "UJIAN" -> "📝 Ujian / Evaluasi"
            "KBM" -> "📗 Hari Efektif KBM"
            else -> "📌 Agenda Sekolah"
        }

    val tanggalMulaiFormatted: String
        get() = formatDateIndonesian(tanggalMulai)

    val tanggalSelesaiFormatted: String
        get() = formatDateIndonesian(tanggalSelesai)

    val rangeDisplay: String
        get() {
            val start = tanggalMulaiFormatted
            val end = tanggalSelesaiFormatted
            return if (start == end || tanggalSelesai.isNullOrBlank()) start else "$start – $end"
        }
}

data class CreateKalenderRequest(
    val judul: String,
    val jenis: String,
    @SerializedName("tanggal_mulai") val tanggalMulai: String,
    @SerializedName("tanggal_selesai") val tanggalSelesai: String,
    val keterangan: String? = null,
    @SerializedName("tahun_pelajaran_id") val tahunPelajaranId: String? = null
)

data class KalenderStatsResponse(
    val success: Boolean = true,
    val data: KalenderStatsData? = null
)

data class KalenderStatsData(
    @SerializedName("total_events") val totalEvents: Int = 0,
    @SerializedName("hari_libur") val hariLibur: Int = 0,
    @SerializedName("hari_ujian") val hariUjian: Int = 0,
    @SerializedName("hari_kegiatan") val hariKegiatan: Int = 0,
    @SerializedName("minggu_efektif") val mingguEfektif: Int = 0,
    @SerializedName("calculated_minggu_efektif") val calculatedMingguEfektif: Int = 0,
    @SerializedName("calculated_minggu_efektif_s1") val calculatedMingguEfektifS1: Int = 0,
    @SerializedName("calculated_minggu_efektif_s2") val calculatedMingguEfektifS2: Int = 0
)

data class BulkSeedKalenderRequest(
    @SerializedName("tahun_pelajaran_id") val tahunPelajaranId: String
)

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFIKASI & PENGUMUMAN SEKOLAH MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class NotificationResponse(
    val success: Boolean = true,
    val message: String? = null,
    val data: NotificationDataWrapper? = null
)

data class NotificationDataWrapper(
    @SerializedName("recentNotifications") val recentNotifications: List<NotificationItem>? = null,
    val logs: List<NotificationItem>? = null
) {
    val items: List<NotificationItem>
        get() = recentNotifications ?: logs ?: emptyList()
}

data class NotificationItem(
    val id: String = "",
    val judul: String? = null,
    val title: String? = null,
    val pesan: String? = null,
    val message: String? = null,
    val content: String? = null,
    val tipe: String? = null,
    val status: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    val isRead: Boolean = false
) {
    val displayJudul: String
        get() = judul ?: title ?: "Pengumuman Sekolah"

    val displayPesan: String
        get() = pesan ?: message ?: content ?: "Informasi pengumuman dari sekolah."

    val createdAtFormatted: String
        get() = formatDateIndonesian(createdAt)
}

// ═══════════════════════════════════════════════════════════════════════════════
// BIMBINGAN KONSELING (BPBK) MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class KonselingResponse(
    val success: Boolean = true,
    val message: String? = null,
    val data: KonselingDataWrapper? = null
)

data class KonselingDataWrapper(
    val list: List<KonselingItem>? = null,
    val pagination: PaginationInfo? = null
)

data class CreateKonselingResponse(
    val success: Boolean = true,
    val message: String? = null,
    val data: KonselingItem? = null
)

data class KonselingItem(
    val id: String = "",
    @SerializedName("siswa_id") val siswaId: String? = null,
    val tanggal: String? = null,
    val tipe: String? = null,
    val masalah: String? = null,
    val solusi: String? = null,
    val status: String? = null,
    @SerializedName("guru_bk") val guruBk: SiswaInfo? = null,
    @SerializedName("Siswa") val siswa: SiswaInfo? = null
) {
    val displayNamaSiswa: String
        get() = siswa?.namaSiswa ?: "Siswa"

    val displayMasalah: String
        get() = masalah ?: "Catatan konseling siswa."

    val displaySolusi: String
        get() = solusi ?: "Tindak lanjut bimbingan konseling."

    val displayTipe: String
        get() = when ((tipe ?: "").uppercase()) {
            "INDIVIDU" -> "👤 Sesi Individu"
            "KELOMPOK" -> "👥 Sesi Kelompok"
            "KLASIKAL" -> "🏫 Sesi Klasikal"
            else -> "💬 Bimbingan BK"
        }

    val tanggalFormatted: String
        get() = formatDateIndonesian(tanggal)
}

data class CreateKonselingRequest(
    @SerializedName("siswa_id") val siswaId: String,
    val tanggal: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
    val tipe: String = "INDIVIDU",
    val masalah: String,
    val solusi: String? = null,
    val status: String = "PROSES",
    val visibility: String = "SENSITIVE"
)

// ═══════════════════════════════════════════════════════════════════════════════
// HUBIN / MONITORING PKL PRAKERIN MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class PklResponse(
    val success: Boolean = true,
    val message: String? = null,
    val data: PklDataWrapper? = null
)

data class PklDataWrapper(
    val list: List<PklItem>? = null,
    val pagination: PaginationInfo? = null
)

data class PklItem(
    val id: String = "",
    @SerializedName("siswa_id") val siswaId: String? = null,
    @SerializedName("mitra_id") val mitraId: String? = null,
    @SerializedName("tanggal_mulai") val tanggalMulai: String? = null,
    @SerializedName("tanggal_selesai") val tanggalSelesai: String? = null,
    val status: String? = null,
    @SerializedName("Siswa") val siswa: SiswaInfo? = null,
    @SerializedName("Mitra") val mitra: MitraPklInfo? = null,
    @SerializedName("Pembimbing") val pembimbing: GuruInfo? = null
) {
    val displayNamaSiswa: String
        get() = siswa?.namaSiswa ?: "Siswa PKL"

    val displayPerusahaan: String
        get() = mitra?.nama ?: "Mitra Industri PKL"

    val displayPembimbing: String
        get() = pembimbing?.namaGuru ?: "Guru Pembimbing"

    val rangeFormatted: String
        get() {
            val start = formatDateIndonesian(tanggalMulai)
            val end = formatDateIndonesian(tanggalSelesai)
            return if (start == end || tanggalSelesai.isNullOrBlank()) start else "$start – $end"
        }
}

data class MitraPklInfo(
    val id: String? = null,
    val nama: String? = null,
    val alamat: String? = null
)

data class CreatePklAbsensiRequest(
    @SerializedName("penempatan_id") val penempatanId: String,
    val tanggal: String = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
    val kegiatan: String,
    val status: String = "HADIR"
)

data class CreatePklPenempatanRequest(
    @SerializedName("siswa_id") val siswaId: String,
    @SerializedName("mitra_id") val mitraId: String,
    @SerializedName("tanggal_mulai") val tanggalMulai: String,
    @SerializedName("tanggal_selesai") val tanggalSelesai: String? = null,
    @SerializedName("pembimbing_id") val pembimbingId: String? = null,
    val status: String = "AKTIF"
)

data class MitraPklResponse(
    val success: Boolean = true,
    val data: List<MitraPklInfo>? = null
)

data class MasterSemesterResponse(
    val success: Boolean,
    val data: List<MasterSemesterItem>?
)

data class MasterSemesterItem(
    val id: String,
    @SerializedName("nama_semester") val namaSemester: String?,
    @SerializedName("is_active") val isActive: Boolean = false
)

data class MasterJenisPelanggaranResponse(
    val success: Boolean,
    val data: List<JenisPelanggaranItem>?
)

data class MasterSiswaResponse(
    val success: Boolean,
    val data: List<MasterSiswaItem>?
)

data class MasterSiswaItem(
    val id: String,
    @SerializedName("nama_siswa") val namaSiswa: String?,
    val nis: String?,
    val nisn: String?,
    @SerializedName("kelas_id") val kelasId: String?,
    @SerializedName("Kelas") val kelas: KelasInfo?
)

data class UniversalSearchResponse(
    val success: Boolean,
    val data: List<UniversalSearchItem>? = null
)

data class UniversalSearchItem(
    val id: String = "",
    val type: String? = null,
    val name: String? = null,
    val identifier: String? = null,
    val rfid: String? = null,
    val kelas: String? = null,
    @SerializedName("original_data") val originalData: MasterSiswaItem? = null
)

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD / KPI MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class DashboardOverviewResponse(
    val success: Boolean,
    val data: DashboardOverview?
)

data class DashboardOverview(
    @SerializedName("total_siswa") val totalSiswa: Int = 0,
    @SerializedName("total_guru") val totalGuru: Int = 0,
    @SerializedName("siswa_hadir") val hadirSiswa: Int = 0,
    @SerializedName("guru_hadir") val hadirGuru: Int = 0,
    @SerializedName("siswa_izin") val izinSiswa: Int = 0,
    @SerializedName("siswa_sakit") val sakitSiswa: Int = 0,
    @SerializedName("siswa_alpa") val alpaSiswa: Int = 0,
    @SerializedName("persentase_siswa") val persentaseHadirSiswa: Double = 0.0,
    @SerializedName("persentase_guru") val persentaseHadirGuru: Double = 0.0,
    @SerializedName("gate_masuk") val gateMasuk: Int = 0,
    @SerializedName("gate_pulang") val gatePulang: Int = 0,
    @SerializedName("anomali") val anomali: List<AnomalyItem>? = null
)

data class AnomalyItem(
    val type: String,
    val message: String,
    val severity: String = "warning"
)

// ═══════════════════════════════════════════════════════════════════════════════
// PARENT APP MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class ParentDashboardResponse(
    val success: Boolean,
    val message: String?,
    val data: ParentDashboardData?
)

data class ParentDashboardData(
    @SerializedName("students") val children: List<ChildInfo>?,
    @SerializedName("active_students") val activeChildren: List<ChildInfo>?
)

data class ChildInfo(
    val id: String,
    @SerializedName("nama_lengkap") val namaLengkap: String?,
    @SerializedName("nama_siswa") val namaSiswa: String?,
    val nisn: String?,
    val nis: String?,
    @SerializedName("foto_url") val fotoUrl: String?,
    @SerializedName("Kelas") val kelas: KelasInfo?,
    @SerializedName("gate_status") val gateStatus: GateStatusInfo?
) {
    val nama: String
        get() = namaLengkap ?: namaSiswa ?: "Anak"
}

data class GateStatusInfo(
    val status: String?,
    @SerializedName("waktu_datang") val waktuDatang: String?,
    @SerializedName("waktu_pulang") val waktuPulang: String?
)

data class ChildGateStatusResponse(
    val success: Boolean,
    val data: ChildGateStatus?
)

data class ChildGateStatus(
    @SerializedName("jam_datang") val jamDatang: String?,
    @SerializedName("jam_pulang") val jamPulang: String?,
    val status: String?,
    val tanggal: String?
)

// ═══════════════════════════════════════════════════════════════════════════════
// PROFILE UPLOAD MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class UploadResponse(
    val success: Boolean,
    val message: String?,
    val data: UploadData?
)

data class UploadData(
    val url: String?,
    val filename: String?
)

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC / SHARED MODELS
// ═══════════════════════════════════════════════════════════════════════════════

data class GenericResponse(
    val success: Boolean,
    val message: String?,
    val data: Any?
)

data class PaginationInfo(
    val total: Int = 0,
    val limit: Int = 20,
    val offset: Int = 0,
    @SerializedName("total_pages") val totalPages: Int = 1,
    @SerializedName("current_page") val currentPage: Int = 1
)

data class SiswaListResponse(
    val success: Boolean,
    val data: List<SiswaProfile>?
)

data class GuruListResponse(
    val success: Boolean,
    val data: List<GuruProfile>?
)

data class MemberDocsResponse(
    val success: Boolean,
    val data: List<MemberDocItem>?
)

data class MemberDocItem(
    val id: String,
    val kategori: String?,
    @SerializedName("file_original_name") val fileOriginalName: String? = null
)
