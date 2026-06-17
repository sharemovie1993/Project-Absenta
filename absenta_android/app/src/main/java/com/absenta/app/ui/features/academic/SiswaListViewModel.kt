package com.absenta.app.ui.features.academic

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

data class WaliKelasInfo(
    val id: String,
    val nama: String
)

class SiswaListViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    // State lists & loaders
    private val _siswas = MutableStateFlow<List<SiswaDetail>>(emptyList())
    val siswas: StateFlow<List<SiswaDetail>> = _siswas.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Pagination info
    private val _totalItems = MutableStateFlow(0)
    val totalItems: StateFlow<Int> = _totalItems.asStateFlow()

    private val _currentPage = MutableStateFlow(1)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()

    private val _totalPages = MutableStateFlow(1)
    val totalPages: StateFlow<Int> = _totalPages.asStateFlow()

    // Stats
    private val _stats = MutableStateFlow<AcademicStatsData?>(null)
    val stats: StateFlow<AcademicStatsData?> = _stats.asStateFlow()

    private val _activeSiswaCount = MutableStateFlow(0)
    val activeSiswaCount: StateFlow<Int> = _activeSiswaCount.asStateFlow()

    private val _registeredCount = MutableStateFlow<Int?>(null)
    val registeredCount: StateFlow<Int?> = _registeredCount.asStateFlow()

    private val _isLoadingStats = MutableStateFlow(true)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

    // Filter dropdowns list
    private val _kelasList = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasList: StateFlow<List<KelasDetail>> = _kelasList.asStateFlow()

    private val _tahunPelajaranList = MutableStateFlow<List<TahunPelajaranDetail>>(emptyList())
    val tahunPelajaranList: StateFlow<List<TahunPelajaranDetail>> = _tahunPelajaranList.asStateFlow()

    private val _semesterList = MutableStateFlow<List<SemesterDetail>>(emptyList())
    val semesterList: StateFlow<List<SemesterDetail>> = _semesterList.asStateFlow()

    // Filters selection state
    val searchQuery = MutableStateFlow("")
    val filterKelasId = MutableStateFlow("")
    val filterStatus = MutableStateFlow("")
    val filterGender = MutableStateFlow("")

    // Capabilities
    private val _canCreate = MutableStateFlow(false)
    val canCreate: StateFlow<Boolean> = _canCreate.asStateFlow()

    private val _canEdit = MutableStateFlow(false)
    val canEdit: StateFlow<Boolean> = _canEdit.asStateFlow()

    private val _canView = MutableStateFlow(false)
    val canView: StateFlow<Boolean> = _canView.asStateFlow()

    private val _canSendAccess = MutableStateFlow(false)
    val canSendAccess: StateFlow<Boolean> = _canSendAccess.asStateFlow()

    private val _isIsolatedScope = MutableStateFlow(false)
    val isIsolatedScope: StateFlow<Boolean> = _isIsolatedScope.asStateFlow()

    private val _waliKelasData = MutableStateFlow<WaliKelasInfo?>(null)
    val waliKelasData: StateFlow<WaliKelasInfo?> = _waliKelasData.asStateFlow()

    val itemsPerPage = MutableStateFlow(10)

    init {
        fetchInitialData()
    }

    private fun fetchInitialData() {
        viewModelScope.launch {
            _isLoading.value = true
            
            // Read capabilities from SessionManager
            val caps = sessionManager.capabilitiesFlow.first()
            val userRole = sessionManager.userRoleFlow.first() ?: ""
            val waliKelasDi = sessionManager.waliKelasDiFlow.first()
            val positionCodes = sessionManager.positionCodesFlow.first()

            _canView.value = caps.contains("academic.students.view.list")
            _canCreate.value = caps.contains("academic.students.create")
            _canEdit.value = caps.contains("academic.students.update")
            _canSendAccess.value = caps.contains("academic.students.send.access_token")

            // Isolated scope check (Wali Kelas)
            val isWalas = caps.contains("dashboard.view.walikelas") || !waliKelasDi.isNullOrEmpty() || positionCodes.contains("WALIKELAS") || positionCodes.contains("WALI")
            _isIsolatedScope.value = userRole == "GURU" && isWalas
            
            if (isWalas && !waliKelasDi.isNullOrEmpty()) {
                _waliKelasData.value = WaliKelasInfo(
                    id = waliKelasDi,
                    nama = waliKelasDi
                )
                // Set default filter kelas to Wali Kelas class
                filterKelasId.value = waliKelasDi
            }

            // Fetch dropdowns & stats
            launch { fetchKelasDropdown() }
            launch { fetchAcademicStats() }

            // Observe filters and reload
            launch {
                searchQuery.collect { fetchSiswaList(1) }
            }
            launch {
                filterKelasId.collect { fetchSiswaList(1) }
            }
            launch {
                filterStatus.collect { fetchSiswaList(1) }
            }
            launch {
                filterGender.collect { fetchSiswaList(1) }
            }
            launch {
                itemsPerPage.collect { fetchSiswaList(1) }
            }
        }
    }

    private suspend fun fetchKelasDropdown() {
        try {
            val response = academicService.getKelas(limit = 100)
            if (response.isSuccessful && response.body()?.success == true) {
                _kelasList.value = response.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading kelas list", e)
        }
    }

    suspend fun fetchAcademicStats() {
        _isLoadingStats.value = true
        try {
            // 1. Stats summary
            val statsRes = academicService.getAcademicStats()
            if (statsRes.isSuccessful && statsRes.body()?.success == true) {
                _stats.value = statsRes.body()?.data
            }

            // 2. Active students count (get limit=1, status=AKTIF to read pagination total)
            val activeRes = academicService.getSiswa(page = 1, limit = 1, status = "AKTIF")
            if (activeRes.isSuccessful && activeRes.body()?.success == true) {
                _activeSiswaCount.value = activeRes.body()?.pagination?.total ?: 0
            }

            // 3. Registration Stats from active year & semester
            val yearsRes = academicService.getTahunPelajaran(limit = 100)
            val semestersRes = academicService.getSemester(limit = 100)
            if (yearsRes.isSuccessful) {
                _tahunPelajaranList.value = yearsRes.body()?.data ?: emptyList()
            }
            if (semestersRes.isSuccessful) {
                _semesterList.value = semestersRes.body()?.data ?: emptyList()
            }
            if (yearsRes.isSuccessful && semestersRes.isSuccessful) {
                val activeYear = yearsRes.body()?.data?.find { it.is_active }
                val activeSemester = semestersRes.body()?.data?.find { it.is_active }
                if (activeYear != null && activeSemester != null) {
                    val regRes = academicService.getAcademicRegistrationStats(activeYear.id, activeSemester.id)
                    if (regRes.isSuccessful && regRes.body()?.success == true) {
                        _registeredCount.value = regRes.body()?.data?.registered
                    }
                }
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading stats", e)
        } finally {
            _isLoadingStats.value = false
        }
    }

    fun fetchSiswaList(page: Int = 1) {
        if (!_canView.value) return
        
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val kelasVal = filterKelasId.value.takeIf { it.isNotBlank() }
                val statusVal = filterStatus.value.takeIf { it.isNotBlank() }
                val genderVal = filterGender.value.takeIf { it.isNotBlank() }

                val response = academicService.getSiswa(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal,
                    kelasId = kelasVal,
                    status = statusVal,
                    gender = genderVal
                )

                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _siswas.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat data siswa"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading siswa", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteSiswa(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.deleteSiswa(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    // Reload list & stats
                    fetchSiswaList(_currentPage.value)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus siswa")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteMultipleSiswa(ids: List<String>, onSuccess: (succeeded: Int, failed: Int) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            var succeeded = 0
            var failed = 0
            ids.forEach { id ->
                try {
                    val response = academicService.deleteSiswa(id)
                    if (response.isSuccessful && response.body()?.success == true) {
                        succeeded++
                    } else {
                        failed++
                    }
                } catch (e: Exception) {
                    failed++
                }
            }
            if (succeeded > 0) {
                fetchSiswaList(_currentPage.value)
                launch { fetchAcademicStats() }
            }
            onSuccess(succeeded, failed)
        }
    }

    fun deleteAllSiswa(onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.deleteAllSiswa()
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    // Reset page and reload list & stats
                    _currentPage.value = 1
                    fetchSiswaList(1)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus semua siswa")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun sendParentAccess(id: String, onSuccess: (name: String, phone: String) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.sendParentAccess(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    val data = response.body()?.data
                    if (data != null) {
                        onSuccess(data.nama, data.phone)
                    } else {
                        onSuccess("Orang Tua", "")
                    }
                } else {
                    onError(response.body()?.message ?: "Gagal mengirim link akses")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun createSiswa(body: Map<String, Any?>, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.createSiswa(body)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchSiswaList(1)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menambahkan siswa")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun updateSiswa(id: String, body: Map<String, Any?>, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.updateSiswa(id, body)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchSiswaList(_currentPage.value)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal memperbarui siswa")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }
}
