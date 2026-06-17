package com.absenta.app.ui.features.academic

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class StrukturOrganisasiViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _strukturs = MutableStateFlow<List<StrukturOrganisasi>>(emptyList())
    val strukturs: StateFlow<List<StrukturOrganisasi>> = _strukturs.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    // Form/Reference Options
    private val _kelasList = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasList: StateFlow<List<KelasDetail>> = _kelasList.asStateFlow()

    private val _jurusanList = MutableStateFlow<List<JurusanDetail>>(emptyList())
    val jurusanList: StateFlow<List<JurusanDetail>> = _jurusanList.asStateFlow()

    private val _guruList = MutableStateFlow<List<GuruDetail>>(emptyList())
    val guruList: StateFlow<List<GuruDetail>> = _guruList.asStateFlow()

    private val _siswaList = MutableStateFlow<List<SiswaDetail>>(emptyList())
    val siswaList: StateFlow<List<SiswaDetail>> = _siswaList.asStateFlow()

    // State operations
    private val _executing = MutableStateFlow(false)
    val executing: StateFlow<Boolean> = _executing.asStateFlow()

    // Search / Filter
    val searchQuery = MutableStateFlow("")
    val filterActive = MutableStateFlow<Boolean?>(null)

    // RBAC
    private val _canView = MutableStateFlow(false)
    val canView: StateFlow<Boolean> = _canView.asStateFlow()

    private val _canManage = MutableStateFlow(false)
    val canManage: StateFlow<Boolean> = _canManage.asStateFlow()

    init {
        checkPermissionsAndFetch()
    }

    private fun checkPermissionsAndFetch() {
        viewModelScope.launch {
            _isLoading.value = true
            val caps = sessionManager.capabilitiesFlow.first()
            val role = sessionManager.userRoleFlow.first()
            val isAdmin = role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN"

            _canView.value = isAdmin || caps.contains("academic.structures.view.list") || caps.contains("academic.structures.view.tree")
            _canManage.value = isAdmin || caps.contains("academic.structures.create") || caps.contains("academic.structures.update") || caps.contains("academic.structures.delete") || caps.contains("academic.structures.assign")

            if (!_canView.value) {
                _isLoading.value = false
                _errorMessage.value = "Anda tidak memiliki akses untuk melihat Struktur Organisasi"
                return@launch
            }

            // Load references in parallel
            launch { loadKelasList() }
            launch { loadJurusanList() }
            launch { loadGuruList() }
            launch { loadSiswaList() }

            // Observe search & filters
            launch {
                searchQuery.collect { fetchStrukturList() }
            }
            launch {
                filterActive.collect { fetchStrukturList() }
            }
        }
    }

    private var fetchJob: Job? = null

    fun fetchStrukturList() {
        if (!_canView.value) return
        fetchJob?.cancel()
        fetchJob = viewModelScope.launch {
            if (searchQuery.value.trim().isNotEmpty()) {
                delay(300)
            }
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val response = academicService.getStrukturTree()
                if (response.isSuccessful && response.body()?.success == true) {
                    val rawMap = response.body()?.data ?: emptyMap()
                    val allStrukturs = rawMap.values.flatten()
                    
                    val searchVal = searchQuery.value.trim().lowercase()
                    val isActiveFilter = filterActive.value
                    
                    val filtered = allStrukturs.filter { item ->
                        val matchesActive = isActiveFilter == null || item.is_active == isActiveFilter
                        val matchesSearch = searchVal.isBlank() || 
                                item.nama.lowercase().contains(searchVal) ||
                                item.kode.lowercase().contains(searchVal) ||
                                (item.kelas_name?.lowercase()?.contains(searchVal) ?: false) ||
                                (item.unit_kode?.lowercase()?.contains(searchVal) ?: false) ||
                                (item.unit_name?.lowercase()?.contains(searchVal) ?: false)
                        
                        matchesActive && matchesSearch
                    }
                    
                    _strukturs.value = filtered
                } else {
                    _errorMessage.value = response.body()?.message ?: "Gagal memuat struktur organisasi"
                }
            } catch (e: Exception) {
                if (e !is kotlinx.coroutines.CancellationException) {
                    Log.e("AbsentaDebug", "Error loading tree struktur organisasi", e)
                    _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
                }
            } finally {
                if (coroutineContext[Job]?.isCancelled != true) {
                    _isLoading.value = false
                }
            }
        }
    }

    private suspend fun loadKelasList() {
        try {
            val res = academicService.getKelas(limit = 100)
            if (res.isSuccessful && res.body()?.success == true) {
                _kelasList.value = res.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading kelas lists", e)
        }
    }

    private suspend fun loadJurusanList() {
        try {
            val res = academicService.getJurusan(limit = 100)
            if (res.isSuccessful && res.body()?.success == true) {
                _jurusanList.value = res.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading jurusan lists", e)
        }
    }

    private suspend fun loadGuruList() {
        try {
            val res = academicService.getGuru(limit = 200)
            if (res.isSuccessful && res.body()?.success == true) {
                _guruList.value = res.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading guru lists", e)
        }
    }

    private suspend fun loadSiswaList() {
        try {
            val res = academicService.getSiswa(limit = 500, status = "AKTIF")
            if (res.isSuccessful && res.body()?.success == true) {
                _siswaList.value = res.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading siswa lists", e)
        }
    }

    fun createStrukturOrganisasi(payload: Map<String, Any?>, onSuccess: () -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val res = academicService.createStruktur(payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Struktur organisasi berhasil dibuat"
                    fetchStrukturList()
                    onSuccess()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal membuat struktur"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error creating struktur", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun updateStrukturOrganisasi(id: String, payload: Map<String, Any?>, onSuccess: () -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val res = academicService.updateStruktur(id, payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Struktur organisasi berhasil diperbarui"
                    fetchStrukturList()
                    onSuccess()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal memperbarui struktur"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error updating struktur", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun deleteStrukturOrganisasi(id: String) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val res = academicService.deleteStruktur(id)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Struktur organisasi berhasil dihapus"
                    fetchStrukturList()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal menghapus struktur"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error deleting struktur", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    // Personil Assignments
    fun assignGuru(
        strukturId: String,
        guruId: String,
        positionId: String,
        unitId: String? = null,
        kelasId: String? = null,
        onSuccess: () -> Unit
    ) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val payload = mutableMapOf<String, Any?>(
                    "guru_id" to guruId,
                    "position_id" to positionId,
                    "is_active" to true
                )
                if (!unitId.isNullOrBlank()) {
                    payload["unit_id"] = unitId
                }
                if (!kelasId.isNullOrBlank()) {
                    payload["kelas_id"] = kelasId
                }
                val res = academicService.assignGuruToStruktur(strukturId, payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Guru berhasil ditugaskan"
                    fetchStrukturList()
                    onSuccess()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal menugaskan guru"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error assigning guru", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun removeGuru(strukturId: String, guruId: String) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val res = academicService.removeGuruFromStruktur(strukturId, guruId)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Penugasan guru berhasil dihapus"
                    fetchStrukturList()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal menghapus penugasan guru"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error removing guru assignment", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun assignSiswa(
        strukturId: String,
        siswaId: String,
        positionId: String,
        unitId: String? = null,
        kelasId: String? = null,
        onSuccess: () -> Unit
    ) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val payload = mutableMapOf<String, Any?>(
                    "siswa_id" to siswaId,
                    "position_id" to positionId,
                    "is_active" to true
                )
                if (!unitId.isNullOrBlank()) {
                    payload["unit_id"] = unitId
                }
                if (!kelasId.isNullOrBlank()) {
                    payload["kelas_id"] = kelasId
                }
                val res = academicService.assignSiswaToStruktur(strukturId, payload)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Siswa berhasil ditugaskan"
                    fetchStrukturList()
                    onSuccess()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal menugaskan siswa"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error assigning siswa", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun removeSiswa(strukturId: String, siswaId: String) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val res = academicService.removeSiswaFromStruktur(strukturId, siswaId)
                if (res.isSuccessful && res.body()?.success == true) {
                    _successMessage.value = "Penugasan siswa berhasil dihapus"
                    fetchStrukturList()
                } else {
                    _errorMessage.value = res.body()?.message ?: "Gagal menghapus penugasan siswa"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error removing siswa assignment", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }

    fun resetSuccessMessage() {
        _successMessage.value = null
    }
}
