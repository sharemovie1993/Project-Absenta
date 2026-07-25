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

class JenisKegiatanViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _items = MutableStateFlow<List<JenisKegiatanMaster>>(emptyList())
    val items: StateFlow<List<JenisKegiatanMaster>> = _items.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // Pagination/Filters
    val searchQuery = MutableStateFlow("")
    val itemsPerPage = MutableStateFlow(10)
    private val _totalItems = MutableStateFlow(0)
    val totalItems: StateFlow<Int> = _totalItems.asStateFlow()
    private val _currentPage = MutableStateFlow(1)
    val currentPage: StateFlow<Int> = _currentPage.asStateFlow()
    private val _totalPages = MutableStateFlow(1)
    val totalPages: StateFlow<Int> = _totalPages.asStateFlow()

    // RBAC
    private val _canManage = MutableStateFlow(false)
    val canManage: StateFlow<Boolean> = _canManage.asStateFlow()

    init {
        fetchInitialData()
    }

    private fun fetchInitialData() {
        viewModelScope.launch {
            _isLoading.value = true
            val caps = sessionManager.capabilitiesFlow.first()
            val role = sessionManager.userRoleFlow.first()
            val isAdmin = role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN"

            _canManage.value = isAdmin || caps.contains("academic.activities.types.manage")

            // Observe search changes
            launch {
                searchQuery.collect { fetchJenisKegiatanList(1) }
            }
            launch {
                itemsPerPage.collect { fetchJenisKegiatanList(1) }
            }
        }
    }

    fun fetchJenisKegiatanList(page: Int = 1) {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val searchVal = searchQuery.value.takeIf { it.isNotBlank() }
                val response = academicService.getJenisKegiatanMaster(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    _items.value = body.data ?: emptyList()
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0
                } else {
                    _errorMessage.value = "Gagal memuat kategori kegiatan"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading jenis kegiatan list", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun createJenisKegiatan(nama: String, tipe: String, urutan: Int, aktif: Boolean, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val payload = mapOf(
                    "nama" to nama,
                    "tipe" to tipe,
                    "urutan" to urutan,
                    "aktif" to aktif
                )
                val response = academicService.createJenisKegiatanMaster(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchJenisKegiatanList(1)
                } else {
                    onError(response.body()?.message ?: "Gagal membuat kategori")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun updateJenisKegiatan(id: String, nama: String, tipe: String, urutan: Int, aktif: Boolean, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val payload = mapOf(
                    "nama" to nama,
                    "tipe" to tipe,
                    "urutan" to urutan,
                    "aktif" to aktif
                )
                val response = academicService.updateJenisKegiatanMaster(id, payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchJenisKegiatanList(_currentPage.value)
                } else {
                    onError(response.body()?.message ?: "Gagal memperbarui kategori")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteJenisKegiatan(id: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            try {
                val response = academicService.deleteJenisKegiatanMaster(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                    fetchJenisKegiatanList(_currentPage.value)
                } else {
                    onError(response.body()?.message ?: "Gagal menghapus kategori")
                }
            } catch (e: Exception) {
                onError("Koneksi bermasalah: ${e.localizedMessage}")
            }
        }
    }

    fun deleteMultipleJenisKegiatan(ids: List<String>, onSuccess: (Int, Int) -> Unit) {
        if (!_canManage.value) return
        viewModelScope.launch {
            var successCount = 0
            var failCount = 0
            ids.forEach { id ->
                try {
                    val response = academicService.deleteJenisKegiatanMaster(id)
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
            fetchJenisKegiatanList(_currentPage.value)
        }
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
