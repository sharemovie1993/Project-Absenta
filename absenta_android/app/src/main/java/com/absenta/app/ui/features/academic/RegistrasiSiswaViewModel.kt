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

class RegistrasiSiswaViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _siswas = MutableStateFlow<List<SiswaDetail>>(emptyList())
    val siswas: StateFlow<List<SiswaDetail>> = _siswas.asStateFlow()

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

    // Reference options
    private val _kelasList = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasList: StateFlow<List<KelasDetail>> = _kelasList.asStateFlow()

    private val _tahunPelajaranList = MutableStateFlow<List<TahunPelajaranDetail>>(emptyList())
    val tahunPelajaranList: StateFlow<List<TahunPelajaranDetail>> = _tahunPelajaranList.asStateFlow()

    private val _semesterList = MutableStateFlow<List<SemesterDetail>>(emptyList())
    val semesterList: StateFlow<List<SemesterDetail>> = _semesterList.asStateFlow()

    // Selected filters
    val selectedKelasId = MutableStateFlow("")
    val selectedTahunPelajaranId = MutableStateFlow("")
    val selectedSemesterId = MutableStateFlow("")
    val akademikFilter = MutableStateFlow("ALL") // ALL, TERDAFTAR, BELUM

    // Stats
    private val _globalStats = MutableStateFlow<AcademicRegistrationStatsData?>(null)
    val globalStats: StateFlow<AcademicRegistrationStatsData?> = _globalStats.asStateFlow()

    private val _isLoadingStats = MutableStateFlow(true)
    val isLoadingStats: StateFlow<Boolean> = _isLoadingStats.asStateFlow()

    // Check status map: siswaId -> status
    private val _checkingMap = MutableStateFlow<Map<String, String?>>(emptyMap())
    val checkingMap: StateFlow<Map<String, String?>> = _checkingMap.asStateFlow()

    // Sync state
    private val _syncLoading = MutableStateFlow(false)
    val syncLoading: StateFlow<Boolean> = _syncLoading.asStateFlow()

    private val _syncResult = MutableStateFlow<String?>(null)
    val syncResult: StateFlow<String?> = _syncResult.asStateFlow()

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
            _canView.value = caps.contains("academic.students.view.list")
            _canCreate.value = caps.contains("academic.students.create")
            _canEdit.value = caps.contains("academic.students.update")

            if (!_canView.value) {
                _isLoading.value = false
                return@launch
            }

            // Load dropdowns and active state
            launch { loadReferences() }

            // Observe filters and search queries to reload students list
            launch {
                searchQuery.collect { fetchSiswaList(1) }
            }
            launch {
                itemsPerPage.collect { fetchSiswaList(1) }
            }
            launch {
                selectedKelasId.collect { fetchSiswaList(1) }
            }
            launch {
                selectedTahunPelajaranId.collect {
                    fetchRegistrationStats()
                    fetchSiswaList(1)
                }
            }
            launch {
                selectedSemesterId.collect {
                    fetchRegistrationStats()
                    fetchSiswaList(1)
                }
            }
        }
    }

    private suspend fun loadReferences() {
        try {
            // Load Kelas list
            val kelasRes = academicService.getKelas(limit = 100)
            if (kelasRes.isSuccessful && kelasRes.body()?.success == true) {
                _kelasList.value = kelasRes.body()?.data ?: emptyList()
            }

            // Load Tahun Pelajaran list
            val tpRes = academicService.getTahunPelajaran(limit = 100)
            if (tpRes.isSuccessful && tpRes.body()?.success == true) {
                _tahunPelajaranList.value = tpRes.body()?.data ?: emptyList()
            }

            // Load active TP
            val activeTpRes = academicService.getActiveTahunPelajaran()
            if (activeTpRes.isSuccessful && activeTpRes.body()?.success == true) {
                activeTpRes.body()?.data?.let {
                    selectedTahunPelajaranId.value = it.id
                }
            }

            // Load Semester list
            val semRes = academicService.getSemester(limit = 100)
            if (semRes.isSuccessful && semRes.body()?.success == true) {
                _semesterList.value = semRes.body()?.data ?: emptyList()
            }

            // Load active Semester
            val activeSemRes = academicService.getActiveSemester()
            if (activeSemRes.isSuccessful && activeSemRes.body()?.success == true) {
                activeSemRes.body()?.data?.let {
                    selectedSemesterId.value = it.id
                }
            }

        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error loading registration references", e)
        }
    }

    fun fetchRegistrationStats() {
        val tpId = selectedTahunPelajaranId.value
        val semId = selectedSemesterId.value
        if (tpId.isEmpty() || semId.isEmpty()) return

        viewModelScope.launch {
            _isLoadingStats.value = true
            try {
                val response = academicService.getAcademicRegistrationStats(tpId, semId)
                if (response.isSuccessful && response.body()?.success == true) {
                    _globalStats.value = response.body()?.data
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading registration stats", e)
            } finally {
                _isLoadingStats.value = false
            }
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
                val kelasVal = selectedKelasId.value.takeIf { it.isNotEmpty() }
                val response = academicService.getSiswa(
                    page = page,
                    limit = itemsPerPage.value,
                    search = searchVal,
                    kelasId = kelasVal,
                    status = "AKTIF" // Frontend loads active students for registration
                )
                if (response.isSuccessful && response.body()?.success == true) {
                    val body = response.body()!!
                    val list = body.data ?: emptyList()
                    _siswas.value = list
                    _currentPage.value = body.pagination?.page ?: page
                    _totalPages.value = body.pagination?.totalPages ?: 1
                    _totalItems.value = body.pagination?.total ?: 0

                    // Run academic check snapshots on the list
                    launch { checkSiswaRegistrationStatuses(list) }
                } else {
                    _errorMessage.value = "Gagal memuat daftar siswa"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading registration siswa list", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private suspend fun checkSiswaRegistrationStatuses(list: List<SiswaDetail>) {
        val tpId = selectedTahunPelajaranId.value
        val semId = selectedSemesterId.value
        if (tpId.isEmpty() || semId.isEmpty() || list.isEmpty()) {
            _checkingMap.value = emptyMap()
            return
        }

        try {
            val ids = list.map { it.id }
            val payload = mapOf(
                "ids" to ids,
                "year_id" to tpId,
                "semester_id" to semId
            )
            val response = academicService.checkAcademicStatus(payload)
            if (response.isSuccessful && response.body()?.success == true) {
                _checkingMap.value = response.body()?.data ?: emptyMap()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Error checking academic statuses", e)
        }
    }

    fun syncStudents() {
        if (!_canEdit.value) return
        val kelasId = selectedKelasId.value.takeIf { it.isNotEmpty() }
        viewModelScope.launch {
            _syncLoading.value = true
            _syncResult.value = null
            try {
                val payload = mutableMapOf<String, Any?>()
                if (kelasId != null) {
                    payload["kelas_id"] = kelasId
                }
                val response = academicService.syncSiswaAkademik(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    _syncResult.value = response.body()?.message ?: "Sinkronisasi berhasil dilakukan!"
                    // Reload list and stats
                    fetchSiswaList(_currentPage.value)
                    fetchRegistrationStats()
                } else {
                    _errorMessage.value = response.body()?.message ?: "Sinkronisasi gagal"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error syncing students", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _syncLoading.value = false
            }
        }
    }

    fun resetSyncResult() {
        _syncResult.value = null
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
