package com.absenta.app.ui.features.academic

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.local.SessionManager
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BackupViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
    private val gson = Gson()

    private val _loadingExport = MutableStateFlow(false)
    val loadingExport: StateFlow<Boolean> = _loadingExport.asStateFlow()

    private val _loadingImport = MutableStateFlow(false)
    val loadingImport: StateFlow<Boolean> = _loadingImport.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    // Preview Stats
    private val _previewStats = MutableStateFlow<BackupPreviewStats?>(null)
    val previewStats: StateFlow<BackupPreviewStats?> = _previewStats.asStateFlow()

    private val _parsedJsonData = MutableStateFlow<Map<String, Any?>?>(null)
    val parsedJsonData: StateFlow<Map<String, Any?>?> = _parsedJsonData.asStateFlow()

    // RBAC
    private val _canManage = MutableStateFlow(false)
    val canManage: StateFlow<Boolean> = _canManage.asStateFlow()

    init {
        checkPermissions()
    }

    private fun checkPermissions() {
        viewModelScope.launch {
            val role = sessionManager.userRoleFlow.first()
            val caps = sessionManager.capabilitiesFlow.first()
            // backup biasanya diijinkan untuk admin/superadmin
            _canManage.value = role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN" || caps.contains("academic.backup.manage")
        }
    }

    fun exportData(onSaveFile: (String, String) -> Unit) {
        if (!_canManage.value) {
            _errorMessage.value = "Akses ditolak: Anda tidak memiliki wewenang ekspor data"
            return
        }
        viewModelScope.launch {
            _loadingExport.value = true
            _errorMessage.value = null
            try {
                val res = academicService.exportAcademicData()
                if (res.isSuccessful && res.body() != null) {
                    val jsonString = res.body()!!.string()
                    val dateStr = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date())
                    val fileName = "academic-backup-$dateStr.json"
                    onSaveFile(fileName, jsonString)
                    _successMessage.value = "Data berhasil diekspor"
                } else {
                    _errorMessage.value = "Gagal mengunduh file cadangan dari server"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error exporting academic data", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _loadingExport.value = false
            }
        }
    }

    fun parseBackupJson(jsonString: String): Boolean {
        _errorMessage.value = null
        try {
            val mapType = object : TypeToken<Map<String, Any?>>() {}.type
            val jsonMap: Map<String, Any?> = gson.fromJson(jsonString, mapType)
            
            // Extract the 'data' map from backup
            val dataObj = jsonMap["data"] as? Map<*, *> ?: jsonMap
            
            fun getLength(key: String): Int {
                val list = dataObj[key] as? List<*> ?: emptyList<Any>()
                return list.size
            }

            val stats = BackupPreviewStats(
                sekolah = getLength("sekolah"),
                tahunPelajaran = getLength("tahunPelajaran"),
                semester = getLength("semester"),
                jurusan = getLength("jurusan"),
                mapel = getLength("mapel"),
                jenisKegiatan = getLength("jenisKegiatanMaster"),
                strukturOrganisasi = getLength("strukturOrganisasi"),
                guru = getLength("guru"),
                siswa = getLength("siswa"),
                kelas = getLength("kelas"),
                waliKelas = getLength("waliKelas"),
                guruMapel = getLength("guruMapel"),
                kelasMapel = getLength("kelasMapel"),
                siswaAkademik = getLength("siswaAkademik"),
                totalRecords = 0
            )

            val total = stats.sekolah + stats.tahunPelajaran + stats.semester + stats.jurusan +
                    stats.mapel + stats.jenisKegiatan + stats.strukturOrganisasi + stats.guru +
                    stats.siswa + stats.kelas + stats.waliKelas + stats.guruMapel +
                    stats.kelasMapel + stats.siswaAkademik
            
            _previewStats.value = stats.copy(totalRecords = total)
            _parsedJsonData.value = jsonMap
            return true
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error parsing backup JSON", e)
            _errorMessage.value = "File Cadangan Tidak Valid: Format JSON tidak dapat dikenali"
            _previewStats.value = null
            _parsedJsonData.value = null
            return false
        }
    }

    fun executeRestore(onSuccess: (String) -> Unit) {
        val payload = _parsedJsonData.value
        if (payload == null) {
            _errorMessage.value = "Tidak ada data cadangan yang dimuat"
            return
        }
        if (!_canManage.value) {
            _errorMessage.value = "Akses ditolak"
            return
        }

        viewModelScope.launch {
            _loadingImport.value = true
            _errorMessage.value = null
            try {
                val res = academicService.importAcademicData(payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    val msg = res.body()?.message ?: "Restorasi data cadangan berhasil diselesaikan"
                    _successMessage.value = msg
                    onSuccess(msg)
                    clearFilePreview()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal memulihkan data cadangan"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error importing backup data", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _loadingImport.value = false
            }
        }
    }

    fun clearFilePreview() {
        _previewStats.value = null
        _parsedJsonData.value = null
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }

    fun resetSuccessMessage() {
        _successMessage.value = null
    }
}

data class BackupPreviewStats(
    val sekolah: Int,
    val tahunPelajaran: Int,
    val semester: Int,
    val jurusan: Int,
    val mapel: Int,
    val jenisKegiatan: Int,
    val strukturOrganisasi: Int,
    val guru: Int,
    val siswa: Int,
    val kelas: Int,
    val waliKelas: Int,
    val guruMapel: Int,
    val kelasMapel: Int,
    val siswaAkademik: Int,
    val totalRecords: Int
)
