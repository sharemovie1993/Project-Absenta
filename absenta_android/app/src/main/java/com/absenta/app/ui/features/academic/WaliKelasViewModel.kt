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

class WaliKelasViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _assignments = MutableStateFlow<List<WaliKelasStrukturAssignment>>(emptyList())
    val assignments: StateFlow<List<WaliKelasStrukturAssignment>> = _assignments.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _totalItems = MutableStateFlow(0)
    val totalItems: StateFlow<Int> = _totalItems.asStateFlow()

    private val _currentPage = MutableStateFlow(1)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()

    private val _totalPages = MutableStateFlow(1)
    val totalPages: StateFlow<Int> = _totalPages.asStateFlow()

    // Form inputs options
    private val _guruOptions = MutableStateFlow<List<GuruDetail>>(emptyList())
    val guruOptions: StateFlow<List<GuruDetail>> = _guruOptions.asStateFlow()

    private val _kelasOptions = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasOptions: StateFlow<List<KelasDetail>> = _kelasOptions.asStateFlow()

    // Filters
    val searchQuery = MutableStateFlow("")
    val includeInactive = MutableStateFlow(false)
    val itemsPerPage = MutableStateFlow(10)

    // Academic Stats
    private val _stats = MutableStateFlow<AcademicStatsData?>(null)
    val stats: StateFlow<AcademicStatsData?> = _stats.asStateFlow()
    private val _isLoadingStats = MutableStateFlow(true)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

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

            _canView.value = caps.contains("academic.homeroom.view")
            _canManage.value = isAdmin || caps.contains("academic.homeroom.manage")

            if (!_canView.value) {
                _isLoading.value = false
                return@launch
            }

            // Load options for dialogs
            launch { loadDropdownOptions() }

            // Fetch stats
            launch { fetchAcademicStats() }

            // Observe search and toggle changes
            launch {
                searchQuery.collect { fetchAssignments(1) }
            }
            launch {
                includeInactive.collect { fetchAssignments(1) }
            }
            launch {
                itemsPerPage.collect { fetchAssignments(1) }
            }
        }
    }

    private suspend fun loadDropdownOptions() {
        try {
            val guruRes = academicService.getGuru(limit = 100)
            if (guruRes.isSuccessful && guruRes.body()?.success == true) {
                _guruOptions.value = guruRes.body()?.data ?: emptyList()
            }

            val kelasRes = academicService.getKelas(limit = 100)
            if (kelasRes.isSuccessful && kelasRes.body()?.success == true) {
                _kelasOptions.value = kelasRes.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading wali kelas dropdowns", e)
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

    fun fetchAssignments(page: Int = 1) {
        if (!_canView.value) {
            _isLoading.value = false
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val response = academicService.getWaliKelasStrukturList(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal,
                    includeInactive = includeInactive.value
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _assignments.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat penugasan wali kelas"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading assignments", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun assignWaliKelas(kelasId: String, guruId: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val payload = mapOf("kelas_id" to kelasId, "guru_id" to guruId)
                val response = academicService.assignWaliKelasStruktur(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchAssignments(1)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menugaskan wali kelas")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun nonaktifWaliKelas(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val response = academicService.nonaktifWaliKelasStruktur(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchAssignments(_currentPage.value)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menonaktifkan penugasan")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun nonaktifMultipleWaliKelas(ids: List<String>, onSuccess: (succeeded: Int, failed: Int) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            var succeeded = 0
            var failed = 0
            ids.forEach { id ->
                try {
                    val response = academicService.nonaktifWaliKelasStruktur(id)
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
                fetchAssignments(_currentPage.value)
                launch { fetchAcademicStats() }
            }
            onSuccess(succeeded, failed)
        }
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
