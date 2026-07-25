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

class GuruMapelViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _items = MutableStateFlow<List<GuruMapelDetail>>(emptyList())
    val items: StateFlow<List<GuruMapelDetail>> = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Form / Filter options
    private val _guruOptions = MutableStateFlow<List<GuruDetail>>(emptyList())
    val guruOptions: StateFlow<List<GuruDetail>> = _guruOptions.asStateFlow()

    private val _mapelOptions = MutableStateFlow<List<MapelDetail>>(emptyList())
    val mapelOptions: StateFlow<List<MapelDetail>> = _mapelOptions.asStateFlow()

    // Filters
    val searchQuery = MutableStateFlow("")
    val filterGuruId = MutableStateFlow("")
    val filterMapelId = MutableStateFlow("")

    // Stats
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

            _canView.value = caps.contains("academic.teaching.view")
            _canManage.value = isAdmin || caps.contains("academic.teaching.manage")

            if (!_canView.value) {
                _isLoading.value = false
                return@launch
            }

            // Load dropdown lists
            launch { loadDropdownOptions() }

            // Load stats
            launch { fetchAcademicStats() }

            // Observe search and filter changes
            launch {
                searchQuery.collect { fetchGuruMapelList() }
            }
            launch {
                filterGuruId.collect { fetchGuruMapelList() }
            }
            launch {
                filterMapelId.collect { fetchGuruMapelList() }
            }
        }
    }

    private suspend fun loadDropdownOptions() {
        try {
            val guruRes = academicService.getGuru(limit = 100)
            if (guruRes.isSuccessful && guruRes.body()?.success == true) {
                _guruOptions.value = guruRes.body()?.data ?: emptyList()
            }

            val mapelRes = academicService.getMapel(limit = 100)
            if (mapelRes.isSuccessful && mapelRes.body()?.success == true) {
                _mapelOptions.value = mapelRes.body()?.data ?: emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading guru-mapel references", e)
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

    fun fetchGuruMapelList() {
        if (!_canView.value) {
            _isLoading.value = false
            return
        }
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val guruVal = filterGuruId.value.takeIf { it.isNotEmpty() }
                val mapelVal = filterMapelId.value.takeIf { it.isNotEmpty() }
                val response = academicService.listGuruMapel(
                    guruId = guruVal,
                    mapelId = mapelVal
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val allItems = response.body()?.data ?: emptyList()
                    val searchVal = searchQuery.value.trim().lowercase()

                    // Filter locally by search query as done in webapp
                    _items.value = if (searchVal.isEmpty()) {
                        allItems
                    } else {
                        allItems.filter { gm ->
                            val guruName = gm.Guru?.nama_guru?.lowercase() ?: ""
                            val mapelName = gm.Mapel?.nama_mapel?.lowercase() ?: ""
                            val mapelCode = gm.Mapel?.kode_mapel?.lowercase() ?: ""
                            guruName.contains(searchVal) || mapelName.contains(searchVal) || mapelCode.contains(searchVal)
                        }
                    }
                } else {
                    _errorMessage.value = "Gagal memuat data guru mapel"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading guru mapel list", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun assignGuruMapel(guruId: String, mapelId: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val payload = mapOf("guru_id" to guruId, "mapel_id" to mapelId)
                val response = academicService.assignGuruMapel(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchGuruMapelList()
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menetapkan guru mapel")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun removeGuruMapel(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val response = academicService.removeGuruMapel(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchGuruMapelList()
                    launch { fetchAcademicStats() }
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus penugasan")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun removeMultipleGuruMapel(ids: List<String>, onSuccess: (Int, Int) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            var successCount = 0
            var failCount = 0
            ids.forEach { id ->
                try {
                    val response = academicService.removeGuruMapel(id)
                    if (response.isSuccessful && response.body()?.success == true) {
                        successCount++
                    } else {
                        failCount++
                    }
                } catch (e: Exception) {
                    failCount++
                }
            }
            onSuccess(successCount, failCount)
            fetchGuruMapelList()
            launch { fetchAcademicStats() }
        }
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
