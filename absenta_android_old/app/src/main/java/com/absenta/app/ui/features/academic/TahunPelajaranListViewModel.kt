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

class TahunPelajaranListViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _tahunPelajarans = MutableStateFlow<List<TahunPelajaranDetail>>(emptyList())
    val tahunPelajarans: StateFlow<List<TahunPelajaranDetail>> = _tahunPelajarans.asStateFlow()

    private val _activeYear = MutableStateFlow<TahunPelajaranDetail?>(null)
    val activeYear: StateFlow<TahunPelajaranDetail?> = _activeYear.asStateFlow()

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
            _canView.value = caps.contains("academic.years.view.list")
            _canCreate.value = caps.contains("academic.years.create")
            _canEdit.value = caps.contains("academic.years.update")

            launch { fetchActiveYearAndStats() }

            launch {
                searchQuery.collect { fetchTahunPelajaranList(1) }
            }
            launch {
                itemsPerPage.collect { fetchTahunPelajaranList(1) }
            }
        }
    }

    suspend fun fetchActiveYearAndStats() {
        _isLoadingStats.value = true
        try {
            val statsRes = academicService.getAcademicStats()
            if (statsRes.isSuccessful && statsRes.body()?.success == true) {
                _stats.value = statsRes.body()?.data
            }

            val activeRes = academicService.getActiveTahunPelajaran()
            if (activeRes.isSuccessful && activeRes.body()?.success == true) {
                _activeYear.value = activeRes.body()?.data
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading active year & stats", e)
        } finally {
            _isLoadingStats.value = false
        }
    }

    fun fetchTahunPelajaranList(page: Int = 1) {
        if (!_canView.value) {
            _isLoading.value = false
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val response = academicService.getTahunPelajaran(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _tahunPelajarans.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat daftar tahun pelajaran"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading tahun pelajaran list", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun createTahunPelajaran(tahun: String, isActive: Boolean, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val payload = mapOf("tahun" to tahun, "is_active" to isActive)
                val response = academicService.createTahunPelajaran(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchTahunPelajaranList(_currentPage.value)
                    launch { fetchActiveYearAndStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal membuat tahun pelajaran")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun updateTahunPelajaran(id: String, tahun: String, isActive: Boolean, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val payload = mapOf("tahun" to tahun, "is_active" to isActive)
                val response = academicService.updateTahunPelajaran(id, payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchTahunPelajaranList(_currentPage.value)
                    launch { fetchActiveYearAndStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal mengupdate tahun pelajaran")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun activateYear(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.activateTahunPelajaran(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchTahunPelajaranList(_currentPage.value)
                    launch { fetchActiveYearAndStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal mengaktifkan periode")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteTahunPelajaran(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            try {
                val response = academicService.deleteTahunPelajaran(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchTahunPelajaranList(_currentPage.value)
                    launch { fetchActiveYearAndStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus tahun pelajaran")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteMultipleTahunPelajaran(ids: List<String>, onSuccess: (succeeded: Int, failed: Int) -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            var succeeded = 0
            var failed = 0
            ids.forEach { id ->
                try {
                    val response = academicService.deleteTahunPelajaran(id)
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
                fetchTahunPelajaranList(_currentPage.value)
                launch { fetchActiveYearAndStats() }
            }
            onSuccess(succeeded, failed)
        }
    }
}
