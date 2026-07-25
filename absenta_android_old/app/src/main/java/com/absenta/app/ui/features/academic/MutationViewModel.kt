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

class MutationViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _siswas = MutableStateFlow<List<SiswaDetail>>(emptyList())
    val siswas: StateFlow<List<SiswaDetail>> = _siswas.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Pagination/Filters
    val searchQuery = MutableStateFlow("")
    val filterKelasId = MutableStateFlow("")
    val itemsPerPage = MutableStateFlow(10)

    private val _totalItems = MutableStateFlow(0)
    val totalItems: StateFlow<Int> = _totalItems.asStateFlow()
    private val _currentPage = MutableStateFlow(1)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()
    private val _totalPages = MutableStateFlow(1)
    val totalPages: StateFlow<Int> = _totalPages.asStateFlow()

    // References
    private val _kelasList = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasList: StateFlow<List<KelasDetail>> = _kelasList.asStateFlow()

    // Academic Stats
    private val _stats = MutableStateFlow<AcademicStatsData?>(null)
    val stats: StateFlow<AcademicStatsData?> = _stats.asStateFlow()
    private val _isLoadingStats = MutableStateFlow(true)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

    // Mutation execution loader
    private val _executing = MutableStateFlow(false)
    val executing: StateFlow<Boolean> = _executing.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    // RBAC
    private val _canManage = MutableStateFlow(false)
    val canManage: StateFlow<Boolean> = _canManage.asStateFlow()

    private val _canView = MutableStateFlow(false)
    val canView: StateFlow<Boolean> = _canView.asStateFlow()

    init {
        fetchInitialData()
    }

    private fun fetchInitialData() {
        viewModelScope.launch {
            _isLoading.value = true
            val caps = sessionManager.capabilitiesFlow.first()
            val role = sessionManager.userRoleFlow.first()
            val isAdmin = role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN"

            _canView.value = caps.contains("academic.students.view.list")
            _canManage.value = isAdmin || caps.contains("academic.students.update")

            if (!_canView.value) {
                _isLoading.value = false
                return@launch
            }

            // Load Kelas Dropdown
            launch { loadKelasOptions() }

            // Load Stats
            launch { fetchAcademicStats() }

            // Observe search and filter changes
            launch {
                searchQuery.collect { fetchSiswaList(1) }
            }
            launch {
                filterKelasId.collect { fetchSiswaList(1) }
            }
            launch {
                itemsPerPage.collect { fetchSiswaList(1) }
            }
        }
    }

    private suspend fun loadKelasOptions() {
        try {
            val response = academicService.getKelas(limit = 100)
            if (response.isSuccessful && response.body()?.success == true) {
                _kelasList.value = response.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading kelas options for mutation", e)
        }
    }

    suspend fun fetchAcademicStats() {
        _isLoadingStats.value = true
        try {
            val statsRes = academicService.getAcademicStats()
            if (statsRes.isSuccessful && statsRes.body()?.success == true) {
                _stats.value = statsRes.body()?.data
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading stats", e)
        } finally {
            _isLoadingStats.value = false
        }
    }

    fun fetchSiswaList(page: Int = 1) {
        if (!_canView.value) {
            _isLoading.value = false
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val kelasVal = filterKelasId.value.takeIf { it.isNotEmpty() }
                // Mutation only filters active students to process mutasi/lulus
                val response = academicService.getSiswa(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal,
                    kelasId = kelasVal,
                    status = "AKTIF"
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _siswas.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat daftar siswa aktif"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading siswa list for mutation", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun executeBulkUpdate(ids: List<String>, status: String, dateStr: String, reason: String, onSuccess: () -> Unit) {
        if (!_canManage.value || ids.isEmpty()) return
        viewModelScope.launch {
            _executing.value = true
            _errorMessage.value = null
            try {
                val payload = mapOf(
                    "ids" to ids,
                    "status" to status,
                    "tanggal" to dateStr,
                    "keterangan" to reason
                )
                val response = academicService.bulkUpdateStatusSiswa(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    _successMessage.value = response.body()?.message ?: "Berhasil memperbarui status ${ids.size} siswa"
                    onSuccess()
                    fetchSiswaList(1)
                    launch { fetchAcademicStats() }
                } else {
                    _errorMessage.value = response.body()?.message ?: "Gagal memperbarui status siswa"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error executing bulk update", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _executing.value = false
            }
        }
    }

    fun resetSuccessMessage() {
        _successMessage.value = null
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
