package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface AcademicService {
    @GET("academic/siswa")
    suspend fun getSiswa(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null,
        @Query("kelas_id") kelasId: String? = null,
        @Query("status") status: String? = null,
        @Query("gender") gender: String? = null,
        @Query("user_id") userId: String? = null
    ): Response<AcademicSiswaResponse>

    @DELETE("academic/siswa/{id}")
    suspend fun deleteSiswa(@Path("id") id: String): Response<GenericAcademicResponse>

    @DELETE("academic/siswa/all")
    suspend fun deleteAllSiswa(): Response<GenericAcademicResponse>

    @POST("academic/siswa/{id}/send-access")
    suspend fun sendParentAccess(@Path("id") id: String): Response<ParentAccessResponse>

    @POST("academic/siswa")
    suspend fun createSiswa(@Body body: Map<String, @JvmSuppressWildcards Any?>): Response<GenericAcademicResponse>

    @PUT("academic/siswa/{id}")
    suspend fun updateSiswa(
        @Path("id") id: String,
        @Body body: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    @GET("academic/siswa/akademik/stats")
    suspend fun getAcademicRegistrationStats(
        @Query("year_id") yearId: String,
        @Query("semester_id") semesterId: String
    ): Response<AcademicRegistrationStatsResponse>

    @GET("academic/stats")
    suspend fun getAcademicStats(): Response<AcademicStatsResponse>

    @GET("academic/guru")
    suspend fun getGuru(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicGuruResponse>

    @GET("academic/kelas")
    suspend fun getKelas(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicKelasResponse>

    @GET("academic/mapel")
    suspend fun getMapel(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicMapelResponse>

    @GET("academic/tahun-pelajaran")
    suspend fun getTahunPelajaran(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicTahunPelajaranResponse>

    @GET("academic/semester")
    suspend fun getSemester(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicSemesterResponse>

    @GET("academic/jurusan")
    suspend fun getJurusan(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<AcademicJurusanResponse>

    // --- Tahun Pelajaran ---
    @GET("academic/tahun-pelajaran/active")
    suspend fun getActiveTahunPelajaran(): Response<SingleTahunPelajaranResponse>

    @POST("academic/tahun-pelajaran")
    suspend fun createTahunPelajaran(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleTahunPelajaranResponse>

    @PUT("academic/tahun-pelajaran/{id}")
    suspend fun updateTahunPelajaran(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleTahunPelajaranResponse>

    @PUT("academic/tahun-pelajaran/{id}/activate")
    suspend fun activateTahunPelajaran(
        @Path("id") id: String
    ): Response<SingleTahunPelajaranResponse>

    @DELETE("academic/tahun-pelajaran/{id}")
    suspend fun deleteTahunPelajaran(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Guru ---
    @POST("academic/guru")
    suspend fun createGuru(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleGuruResponse>

    @PUT("academic/guru/{id}")
    suspend fun updateGuru(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleGuruResponse>

    @DELETE("academic/guru/{id}")
    suspend fun deleteGuru(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Kelas ---
    @POST("academic/kelas")
    suspend fun createKelas(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleKelasResponse>

    @PUT("academic/kelas/{id}")
    suspend fun updateKelas(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleKelasResponse>

    @DELETE("academic/kelas/{id}")
    suspend fun deleteKelas(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Mapel ---
    @POST("academic/mapel")
    suspend fun createMapel(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleMapelResponse>

    @PUT("academic/mapel/{id}")
    suspend fun updateMapel(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleMapelResponse>

    @DELETE("academic/mapel/{id}")
    suspend fun deleteMapel(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Semester ---
    @GET("academic/semester/active")
    suspend fun getActiveSemester(): Response<SingleSemesterResponse>

    @POST("academic/semester")
    suspend fun createSemester(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleSemesterResponse>

    @PUT("academic/semester/{id}")
    suspend fun updateSemester(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleSemesterResponse>

    @PUT("academic/semester/{id}/activate")
    suspend fun activateSemester(
        @Path("id") id: String
    ): Response<SingleSemesterResponse>

    @DELETE("academic/semester/{id}")
    suspend fun deleteSemester(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Jurusan ---
    @POST("academic/jurusan")
    suspend fun createJurusan(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleJurusanResponse>

    @PUT("academic/jurusan/{id}")
    suspend fun updateJurusan(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleJurusanResponse>

    @DELETE("academic/jurusan/{id}")
    suspend fun deleteJurusan(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Registrasi Siswa ---
    @POST("academic/siswa/akademik/sync")
    suspend fun syncSiswaAkademik(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    @POST("academic/siswa/akademik/check-status")
    suspend fun checkAcademicStatus(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<CheckAcademicStatusResponse>

    // --- Wali Kelas ---
    @GET("academic/wali-kelas/struktur")
    suspend fun getWaliKelasStrukturList(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null,
        @Query("guru_id") guruId: String? = null,
        @Query("kelas_id") kelasId: String? = null,
        @Query("include_inactive") includeInactive: Boolean? = null
    ): Response<WaliKelasStrukturResponse>

    @POST("academic/wali-kelas/struktur/assign")
    suspend fun assignWaliKelasStruktur(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleWaliKelasStrukturResponse>

    @PUT("academic/wali-kelas/struktur/{id}/nonaktif")
    suspend fun nonaktifWaliKelasStruktur(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Guru Mapel ---
    @GET("academic/guru-mapel")
    suspend fun listGuruMapel(
        @Query("guru_id") guruId: String? = null,
        @Query("mapel_id") mapelId: String? = null
    ): Response<GuruMapelResponse>

    @POST("academic/guru-mapel")
    suspend fun assignGuruMapel(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleGuruMapelResponse>

    @DELETE("academic/guru-mapel/{id}")
    suspend fun removeGuruMapel(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Jenis Kegiatan Master ---
    @GET("academic/jenis-kegiatan-master")
    suspend fun getJenisKegiatanMaster(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null,
        @Query("search") search: String? = null
    ): Response<JenisKegiatanMasterResponse>

    @GET("academic/jenis-kegiatan-master/{id}")
    suspend fun getJenisKegiatanMasterById(
        @Path("id") id: String
    ): Response<SingleJenisKegiatanMasterResponse>

    @POST("academic/jenis-kegiatan-master")
    suspend fun createJenisKegiatanMaster(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleJenisKegiatanMasterResponse>

    @PUT("academic/jenis-kegiatan-master/{id}")
    suspend fun updateJenisKegiatanMaster(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleJenisKegiatanMasterResponse>

    @DELETE("academic/jenis-kegiatan-master/{id}")
    suspend fun deleteJenisKegiatanMaster(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    // --- Transition ---
    @POST("academic/transition/preview")
    suspend fun previewTransition(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<TransitionPreviewResponse>

    @POST("academic/transition/execute")
    suspend fun executeTransition(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<TransitionExecuteResponse>

    // --- Student Card Config ---
    @GET("academic/student-card-config")
    suspend fun getStudentCardConfig(): Response<StudentCardConfigResponse>

    @PUT("academic/student-card-config")
    suspend fun updateStudentCardConfig(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<StudentCardConfigResponse>

    // --- Mutation ---
    @POST("academic/siswa/bulk-status")
    suspend fun bulkUpdateStatusSiswa(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    // --- Struktur Organisasi ---
    @GET("academic/struktur-organisasi")
    suspend fun getStrukturList(
        @Query("is_active") isActive: Boolean? = null,
        @Query("search") search: String? = null,
        @Query("tenant_id") tenantId: String? = null
    ): Response<StrukturOrganisasiResponse>

    @GET("academic/struktur-organisasi/tree")
    suspend fun getStrukturTree(): Response<StrukturOrganisasiTreeResponse>

    @GET("academic/struktur-organisasi/{id}")
    suspend fun getStrukturDetail(
        @Path("id") id: String
    ): Response<SingleStrukturOrganisasiResponse>

    @POST("academic/struktur-organisasi")
    suspend fun createStruktur(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleStrukturOrganisasiResponse>

    @PUT("academic/struktur-organisasi/{id}")
    suspend fun updateStruktur(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<SingleStrukturOrganisasiResponse>

    @DELETE("academic/struktur-organisasi/{id}")
    suspend fun deleteStruktur(
        @Path("id") id: String
    ): Response<GenericAcademicResponse>

    @POST("academic/struktur-organisasi/{id}/guru")
    suspend fun assignGuruToStruktur(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    @DELETE("academic/struktur-organisasi/{id}/guru/{guruId}")
    suspend fun removeGuruFromStruktur(
        @Path("id") id: String,
        @Path("guruId") guruId: String
    ): Response<GenericAcademicResponse>

    @POST("academic/struktur-organisasi/{id}/siswa")
    suspend fun assignSiswaToStruktur(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    @DELETE("academic/struktur-organisasi/{id}/siswa/{siswaId}")
    suspend fun removeSiswaFromStruktur(
        @Path("id") id: String,
        @Path("siswaId") siswaId: String
    ): Response<GenericAcademicResponse>

    @GET("academic/struktur-organisasi/{id}/permissions")
    suspend fun getStrukturPermissions(
        @Path("id") id: String,
        @Query("tenant_id") tenantId: String? = null
    ): Response<StrukturPermissionResponse>

    @PUT("academic/struktur-organisasi/{id}/permissions")
    suspend fun updateStrukturPermissions(
        @Path("id") id: String,
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<StrukturPermissionResponse>

    // --- Backup ---
    @GET("academic/backup/export")
    suspend fun exportAcademicData(): Response<okhttp3.ResponseBody>

    @POST("academic/backup/import")
    suspend fun importAcademicData(
        @Body payload: Map<String, @JvmSuppressWildcards Any?>
    ): Response<GenericAcademicResponse>

    @GET("academic/guru/me")
    suspend fun getGuruMe(): Response<SingleGuruResponse>

    // --- Student Exit & Timeline Documents ---
    @Multipart
    @POST("academic/siswa/{id}/documents")
    suspend fun uploadSiswaDocument(
        @Path("id") id: String,
        @Part file: okhttp3.MultipartBody.Part,
        @Part("judul") judul: okhttp3.RequestBody,
        @Part("kategori") kategori: okhttp3.RequestBody
    ): Response<SingleSiswaDocumentResponse>

    @GET("academic/siswa/{id}/documents")
    suspend fun getSiswaDocuments(
        @Path("id") id: String
    ): Response<SiswaDocumentsResponse>

    @DELETE("academic/siswa/{id}/documents/{docId}")
    suspend fun deleteSiswaDocument(
        @Path("id") id: String,
        @Path("docId") docId: String
    ): Response<GenericAcademicResponse>

    @GET("academic/siswa/{id}/documents/{docId}/download")
    @Streaming
    suspend fun downloadSiswaDocument(
        @Path("id") id: String,
        @Path("docId") docId: String
    ): Response<okhttp3.ResponseBody>

    @GET("academic/siswa/{id}/exit-bundle")
    @Streaming
    suspend fun downloadSiswaExitBundle(
        @Path("id") id: String
    ): Response<okhttp3.ResponseBody>

    @GET("academic/siswa/{id}/timeline")
    suspend fun getSiswaTimeline(
        @Path("id") id: String
    ): Response<SiswaTimelineResponse>

    @Multipart
    @POST("academic/siswa/{id}/complete-exit")
    suspend fun completeSiswaExit(
        @Path("id") id: String,
        @Part file: okhttp3.MultipartBody.Part,
        @Part("status") status: okhttp3.RequestBody,
        @Part("alasan") alasan: okhttp3.RequestBody? = null
    ): Response<GenericAcademicResponse>
}

// Siswa Response
data class AcademicSiswaResponse(
    val success: Boolean,
    val data: List<SiswaDetail>?,
    val pagination: PaginationDetail? = null
)

data class PaginationDetail(
    val page: Int,
    val limit: Int,
    val total: Int,
    val totalPages: Int
)

data class SiswaDetail(
    val id: String,
    val tenant_id: String? = null,
    val user_id: String? = null,
    val nis: String,
    val nisn: String? = null,
    val nik: String? = null,
    val nama_siswa: String,
    val jenis_kelamin: String,
    val tempat_lahir: String? = null,
    val tanggal_lahir: String? = null,
    val alamat: String? = null,
    val no_hp: String? = null,
    val status: String,
    val no_rfid: String? = null,
    val kelas_id: String? = null,
    val tahun_pelajaran_id: String? = null,
    val semester_id: String? = null,
    val Kelas: KelasSimple? = null,
    val User: UserSimple? = null,
    val OrangTua: List<OrangTuaSimple>? = null
)

data class KelasSimple(
    val id: String,
    val nama_kelas: String,
    val tingkat: Int? = null
)

data class UserSimple(
    val id: String? = null,
    val email: String? = null
)

data class OrangTuaSimple(
    val id: String,
    val nama: String,
    val hubungan: String? = null,
    val no_hp: String? = null
)

data class GenericAcademicResponse(
    val success: Boolean,
    val message: String
)

data class ParentAccessResponse(
    val success: Boolean,
    val message: String,
    val data: ParentAccessData? = null
)

data class ParentAccessData(
    val nama: String,
    val phone: String
)

data class AcademicRegistrationStatsResponse(
    val success: Boolean,
    val data: AcademicRegistrationStatsData? = null
)

data class AcademicRegistrationStatsData(
    val registered: Int,
    val total_active: Int
)

data class AcademicStatsResponse(
    val success: Boolean,
    val message: String? = null,
    val data: AcademicStatsData? = null
)

data class AcademicStatsData(
    val total_jurusan: Int,
    val total_kelas: Int,
    val total_siswa: Int,
    val total_guru: Int,
    val total_mapel: Int,
    val total_semester: Int,
    val total_tahun_pelajaran: Int
)

// Guru Response
data class AcademicGuruResponse(
    val success: Boolean,
    val data: List<GuruDetail>?,
    val pagination: PaginationDetail? = null
)

data class GuruDetail(
    val id: String,
    val nama_guru: String,
    val nip: String?,
    val status_kepegawaian: String?,
    val jabatan: String?
)

// Kelas Response
data class AcademicKelasResponse(
    val success: Boolean,
    val data: List<KelasDetail>?,
    val pagination: PaginationDetail? = null
)

data class KelasDetail(
    val id: String,
    val nama_kelas: String,
    val tingkat: Int,
    val keterangan: String?,
    val is_active: Boolean,
    val WaliKelas: List<WaliKelasRelation>?
)

data class WaliKelasRelation(
    val id: String,
    val Guru: GuruSimple?
)

data class GuruSimple(
    val id: String,
    val nama_guru: String
)

// Mapel Response
data class AcademicMapelResponse(
    val success: Boolean,
    val data: List<MapelDetail>?,
    val pagination: PaginationDetail? = null
)

data class MapelDetail(
    val id: String,
    val nama_mapel: String,
    val kode_mapel: String?,
    val tingkat: Int?
)

// Tahun Pelajaran Response
data class AcademicTahunPelajaranResponse(
    val success: Boolean,
    val data: List<TahunPelajaranDetail>?,
    val pagination: PaginationDetail? = null
)

data class TahunPelajaranDetail(
    val id: String,
    val tahun: String,
    val is_active: Boolean
)

// Semester Response
data class AcademicSemesterResponse(
    val success: Boolean,
    val data: List<SemesterDetail>?,
    val pagination: PaginationDetail? = null
)

data class SemesterDetail(
    val id: String,
    val nama_semester: String,
    val is_active: Boolean
)

// Jurusan Response
data class AcademicJurusanResponse(
    val success: Boolean,
    val data: List<JurusanDetail>?,
    val pagination: PaginationDetail? = null
)

data class JurusanDetail(
    val id: String,
    val nama: String,
    val kode: String?,
    val singkatan: String?
)

data class SingleTahunPelajaranResponse(val success: Boolean, val message: String, val data: TahunPelajaranDetail?)
data class SingleGuruResponse(val success: Boolean, val message: String, val data: GuruDetail?)
data class SingleKelasResponse(val success: Boolean, val message: String, val data: KelasDetail?)
data class SingleMapelResponse(val success: Boolean, val message: String, val data: MapelDetail?)
data class SingleSemesterResponse(val success: Boolean, val message: String, val data: SemesterDetail?)
data class SingleJurusanResponse(val success: Boolean, val message: String, val data: JurusanDetail?)

// Additional Response Classes for new Academic Setup Modules
data class CheckAcademicStatusResponse(
    val success: Boolean,
    val data: Map<String, String?>?
)

data class WaliKelasStrukturResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<WaliKelasStrukturAssignment>?,
    val pagination: PaginationDetail? = null
)

data class SingleWaliKelasStrukturResponse(
    val success: Boolean,
    val message: String? = null,
    val data: WaliKelasStrukturAssignment?
)

data class WaliKelasStrukturAssignment(
    val id: String,
    val tenant_id: String? = null,
    val guru_id: String,
    val struktur_organisasi_id: String,
    val is_active: Boolean,
    val start_date: String? = null,
    val end_date: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
    val Guru: GuruSimpleInfo? = null,
    val StrukturOrganisasi: StrukturOrganisasiSimpleInfo? = null
)

data class GuruSimpleInfo(
    val id: String,
    val nama_guru: String,
    val nip: String? = null
)

data class StrukturOrganisasiSimpleInfo(
    val id: String,
    val kode: String,
    val kelas_id: String? = null,
    val Kelas: KelasSimple? = null
)

data class GuruMapelResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<GuruMapelDetail>?
)

data class SingleGuruMapelResponse(
    val success: Boolean,
    val message: String? = null,
    val data: GuruMapelDetail?
)

data class GuruMapelDetail(
    val id: String,
    val tenant_id: String? = null,
    val guru_id: String,
    val mapel_id: String,
    val created_at: String? = null,
    val updated_at: String? = null,
    val Guru: GuruDetail? = null,
    val Mapel: MapelDetail? = null
)

data class JenisKegiatanMasterResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<JenisKegiatanMaster>?,
    val pagination: PaginationDetail? = null
)

data class SingleJenisKegiatanMasterResponse(
    val success: Boolean,
    val message: String? = null,
    val data: JenisKegiatanMaster?
)

data class JenisKegiatanMaster(
    val id: String,
    val tenant_id: String? = null,
    val nama: String,
    val tipe: String,
    val urutan: Int? = null,
    val aktif: Boolean,
    val created_at: String? = null,
    val updated_at: String? = null
)

data class TransitionPreviewResponse(
    val success: Boolean,
    val message: String? = null,
    val data: TransitionPreviewData? = null
)

data class TransitionPreviewData(
    val total: Int,
    val byStatus: TransitionByStatus? = null,
    val warnings: List<String>? = null,
    val items: List<TransitionPreviewItem>? = null
)

data class TransitionByStatus(
    val NAIK: Int,
    val TINGGAL: Int,
    val PINDAH: Int,
    val LULUS: Int
)

data class TransitionPreviewItem(
    val siswaId: String,
    val namaSiswa: String,
    val fromKelas: String,
    val toKelas: String? = null,
    val status: String
)

data class TransitionExecuteResponse(
    val success: Boolean,
    val message: String? = null,
    val data: TransitionExecuteData? = null
)

data class TransitionExecuteData(
    val inserted: Int,
    val tahunPelajaranBaruId: String,
    val semester: String
)

data class StudentCardConfigResponse(
    val success: Boolean,
    val message: String? = null,
    val data: StudentCardConfig? = null
)

data class StudentCardConfig(
    val id: String? = null,
    val template: String, // 'vertical' | 'horizontal'
    val card_title: String,
    val header_text: String? = null,
    val subheader_text: String? = null,
    val school_name: String? = null,
    val school_address: String? = null,
    val header_font_size: Int,
    val subheader_font_size: Int,
    val school_name_font_size: Int,
    val school_address_font_size: Int,
    val card_title_font_size: Int,
    val student_name_font_size: Int,
    val student_details_font_size: Int,
    val primary_color: String,
    val secondary_color: String,
    val logo_url: String? = null,
    val show_photo: Boolean,
    val show_qrcode: Boolean,
    val photo_x: Float,
    val photo_y: Float,
    val photo_scale: Float,
    val qrcode_x: Float,
    val qrcode_y: Float,
    val qrcode_scale: Float,
    val data_x: Float? = null,
    val data_y: Float? = null,
    val photo_width: Float? = null,
    val photo_height: Float? = null,
    val qrcode_width: Float? = null,
    val qrcode_height: Float? = null,
    val card_width: Float? = null,
    val card_height: Float? = null,
    val header_height: Float? = null,
    val header_bg_color: String? = null,
    val header_text_color: String? = null,
    val footer_height: Float? = null,
    val footer_bg_color: String? = null,
    val show_border: Boolean? = null,
    val border_color: String? = null,
    val border_width: Float? = null,
    val print_paper_size: String? = null,
    val print_orientation: String? = null,
    val print_mode: String? = null,
    val print_margin_top: Float? = null,
    val print_margin_bottom: Float? = null,
    val print_margin_left: Float? = null,
    val print_margin_right: Float? = null,
    val print_gap_x: Float? = null,
    val print_gap_y: Float? = null,
    val print_custom_width: Float? = null,
    val print_custom_height: Float? = null,
    val print_auto_center_x: Boolean? = null,
    val print_auto_center_y: Boolean? = null
)

data class StrukturOrganisasiResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<StrukturOrganisasi>?
)

data class SingleStrukturOrganisasiResponse(
    val success: Boolean,
    val message: String? = null,
    val data: StrukturOrganisasi?
)

data class StrukturOrganisasi(
    val id: String,
    val tenant_id: String,
    val kode: String,
    val nama: String,
    val deskripsi: String? = null,
    val scope: String,
    val scope_type: String? = null,
    val unit_id: String? = null,
    val kelas_id: String? = null,
    val is_active: Boolean,
    val created_at: String? = null,
    val updated_at: String? = null,
    val _count: StrukturOrganisasiCounts? = null,
    val organizationalAssigns: List<OrganizationalAssignment>? = null,
    val members: List<StrukturMember>? = null,
    val unit_name: String? = null,
    val unit_kode: String? = null,
    val kelas_name: String? = null,
    val tingkat: Int? = null
)

data class StrukturOrganisasiTreeResponse(
    val success: Boolean,
    val message: String? = null,
    val data: Map<String, List<StrukturOrganisasi>>? = null
)

data class StrukturMember(
    val id: String,
    val userId: String,
    val unit_id: String? = null,
    val kelas_id: String? = null,
    val tingkat: Int? = null,
    val unit_kode: String? = null,
    val type: String, // "GURU" or "SISWA"
    val name: String,
    val details: String? = null,
    val updated_at: String? = null,
    val structId: String? = null,
    val structName: String? = null
)

data class StrukturOrganisasiCounts(
    val organizationalAssigns: Int = 0,
    val organizationalCaps: Int = 0
)

data class OrganizationalAssignment(
    val id: String,
    val position_id: String,
    val user_id: String,
    val is_active: Boolean,
    val unit_id: String? = null,
    val kelas_id: String? = null,
    val start_date: String? = null,
    val end_date: String? = null,
    val User: OrganizationalUserSimple? = null
)

data class OrganizationalUserSimple(
    val id: String,
    val Guru: GuruDetail? = null,
    val Siswa: SiswaDetail? = null
)

data class StrukturPermissionResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<StrukturPermissionItem>?
)

data class StrukturPermissionItem(
    val id: String,
    val struktur_organisasi_id: String,
    val permission_id: String,
    val permission: PermissionSimpleInfo? = null
)

data class PermissionSimpleInfo(
    val id: String,
    val description: String? = null,
    val group: String? = null
)

// Student Exit & Document Responses
data class SingleSiswaDocumentResponse(
    val success: Boolean,
    val message: String? = null,
    val data: SiswaDocumentDetail? = null
)

data class SiswaDocumentsResponse(
    val success: Boolean,
    val message: String? = null,
    val data: List<SiswaDocumentDetail>? = null
)

data class SiswaDocumentDetail(
    val id: String,
    val tenant_id: String,
    val siswa_id: String,
    val judul: String,
    val kategori: String,
    val file_original_name: String,
    val file_storage_path: String,
    val mime_type: String,
    val size_bytes: Long,
    val created_at: String,
    val updated_at: String
)

data class SiswaTimelineResponse(
    val success: Boolean,
    val data: List<SiswaTimelineItem>? = null
)

data class SiswaTimelineItem(
    val id: String,
    val tanggal: String,
    val tipe: String, // "STATUS_AKADEMIK" | "PELANGGARAN" | "DOKUMEN"
    val judul: String,
    val keterangan: String,
    val poin: Int? = null,
    val status: String? = null,
    val file_name: String? = null,
    val file_url: String? = null,
    val kategori_dokumen: String? = null,
    val size_bytes: Long? = null,
    val user_name: String
)
