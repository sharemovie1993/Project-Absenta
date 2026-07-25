package com.absenta.app.data.api

import com.absenta.app.data.model.MasterGuruResponse
import com.absenta.app.data.model.MasterJenisKegiatanResponse
import com.absenta.app.data.model.MasterJenisPelanggaranResponse
import com.absenta.app.data.model.MasterJurusanResponse
import com.absenta.app.data.model.MasterKelasResponse
import com.absenta.app.data.model.MasterMapelResponse
import com.absenta.app.data.model.MasterSemesterResponse
import com.absenta.app.data.model.MasterSiswaResponse
import com.absenta.app.data.model.MasterTahunPelajaranResponse
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * ReferenceService — Retrofit interface untuk seluruh endpoint Data Master Reference backend.
 *
 * Digunakan oleh komponen Dropdown, Form Picker, dan Filter Layar.
 *
 * Endpoint real backend:
 * - [GET /api/academic/kelas]: Master daftar kelas
 * - [GET /api/academic/mapel]: Master daftar mata pelajaran
 * - [GET /api/academic/guru]: Master daftar guru/pendidik
 * - [GET /api/academic/jurusan]: Master daftar jurusan/kompetensi keahlian
 * - [GET /api/academic/tahun-pelajaran]: Master daftar tahun pelajaran
 * - [GET /api/academic/semester]: Master daftar semester
 * - [GET /api/kesiswaan/jenis-pelanggaran]: Master jenis pelanggaran & poin
 * - [GET /api/academic/siswa]: Master daftar siswa aktif
 * - [GET /api/academic/activities/types]: Master jenis kegiatan KBM
 */
interface ReferenceService {

    @GET("api/academic/kelas")
    suspend fun getKelasList(): Response<MasterKelasResponse>

    @GET("api/academic/mapel")
    suspend fun getMapelList(): Response<MasterMapelResponse>

    @GET("api/academic/guru")
    suspend fun getGuruList(): Response<MasterGuruResponse>

    @GET("api/academic/jurusan")
    suspend fun getJurusanList(): Response<MasterJurusanResponse>

    @GET("api/academic/tahun-pelajaran")
    suspend fun getTahunPelajaranList(): Response<MasterTahunPelajaranResponse>

    @GET("api/academic/semester")
    suspend fun getSemesterList(): Response<MasterSemesterResponse>

    @GET("api/kesiswaan/jenis-pelanggaran")
    suspend fun getJenisPelanggaranList(): Response<MasterJenisPelanggaranResponse>

    @GET("api/academic/siswa")
    suspend fun getSiswaList(
        @Query("kelas_id") kelasId: String? = null,
        @Query("search") search: String? = null
    ): Response<MasterSiswaResponse>

    @GET("api/academic/activities/types")
    suspend fun getJenisKegiatanList(): Response<MasterJenisKegiatanResponse>

    @GET("api/academic/universal-search")
    suspend fun universalSearch(
        @Query("q") query: String,
        @Query("limit") limit: Int = 15
    ): Response<com.absenta.app.data.model.UniversalSearchResponse>
}
