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

class KelasListViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _kelases = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelases: StateFlow<List<KelasDetail>> = _kelases.asStateFlow()

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

    private val _stats = MutableStateFlow<AcademicStatsData?>(null)
    val stats: StateFlow<AcademicStatsData?> = _stats.asStateFlow()

    private val _isLoadingStats = MutableStateFlow(true)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

    // Guru dropdown to select Wali Kelas
    private val _guruList = MutableStateFlow<List<GuruDetail>>(emptyList())
    val guruList: StateFlow<List<GuruDetail>> = _guruList.asStateFlow()

    val searchQuery = MutableStateFlow("")
    val itemsPerPage = MutableStateFlow(10)

    private val _canCreate = MutableStateFlow(false)
    val canCreate: StateFlow<Boolean> = _canCreate.asStateFlow()

    private val _canEdit = MutableStateFlow(false)
    val canEdit: StateFlow<Boolean> = _canEdit.asStateFlow()

    private val _canView = MutableStateFlow(false)
    val canView: StateFlow<Boolean> = _canView.asStateFlow()

    init {
        fetchInitialData()
    }

    private fun fetchInitialData() {
        viewModelScope.launch {
            _isLoading.value = true
            val caps = sessionManager.capabilitiesFlow.first()
            _canView.value = caps.contains("academic.structures.view.list")
            _canCreate.value = caps.contains("academic.structures.create")
            _canEdit.value = caps.contains("academic.structures.update")

            launch { fetchAcademicStats() }
            launch { fetchGuruDropdown() }

            launch {
                searchQuery.collect { fetchKelasList(1) }
            }
            launch {
                itemsPerPage.collect { fetchKelasList(1) }
            }
        }
    }

    suspend fun fetchGuruDropdown() {
        try {
            val response = academicService.getGuru(limit = 100)
            if (response.isSuccessful && response.body()?.success == true) {
                _guruList.value = response.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading guru list for wali kelas selection", e)
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

    fun fetchKelasList(page: Int = 1) {
        if (!_canView.value) {
            _isLoading.value = false
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val response = academicService.getKelas(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _kelases.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat daftar kelas"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading kelas list", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun createKelas(body: Map<String, Any?>, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.createKelas(body)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchKelasList(1)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menambahkan kelas")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun updateKelas(id: String, body: Map<String, Any?>, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.updateKelas(id, body)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchKelasList(_currentPage.value)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal memperbarui kelas")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteKelas(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.deleteKelas(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchKelasList(_currentPage.value)
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus kelas")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteMultipleKelas(ids: List<String>, onSuccess: (succeeded: Int, failed: Int) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            var succeeded = 0
            var failed = 0
            ids.forEach { id ->
                try {
                    val response = academicService.deleteKelas(id)
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
                fetchKelasList(_currentPage.value)
                launch { fetchAcademicStats() }
            }
            onSuccess(succeeded, failed)
        }
    }
}
