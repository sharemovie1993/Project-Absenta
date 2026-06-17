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

class TransitionViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    // Reference options
    private val _tahunPelajaranList = MutableStateFlow<List<TahunPelajaranDetail>>(emptyList())
    val tahunPelajaranList: StateFlow<List<TahunPelajaranDetail>> = _tahunPelajaranList.asStateFlow()

    private val _kelasList = MutableStateFlow<List<KelasDetail>>(emptyList())
    val kelasList: StateFlow<List<KelasDetail>> = _kelasList.asStateFlow()

    // Wizard Selection State
    val selectedTahunLamaId = MutableStateFlow("")
    val selectedTahunBaruId = MutableStateFlow("")

    // Mapping state: fromKelasId -> toKelasId
    private val _classMappings = MutableStateFlow<Map<String, String>>(emptyMap())
    val classMappings: StateFlow<Map<String, String>> = _classMappings.asStateFlow()

    // Preview Result
    private val _previewData = MutableStateFlow<TransitionPreviewData?>(null)
    val previewData: StateFlow<TransitionPreviewData?> = _previewData.asStateFlow()

    // Overrides: siswaId -> status ('NAIK', 'TINGGAL', 'PINDAH', 'LULUS')
    private val _overrides = MutableStateFlow<Map<String, String>>(emptyMap())
    val overrides: StateFlow<Map<String, String>> = _overrides.asStateFlow()

    // Loaders
    private val _loadingYears = MutableStateFlow(true)
    val loadingYears: StateFlow<Boolean> = _loadingYears.asStateFlow()

    private val _loadingPreview = MutableStateFlow(false)
    val loadingPreview: StateFlow<Boolean> = _loadingPreview.asStateFlow()

    private val _loadingExecute = MutableStateFlow(false)
    val loadingExecute: StateFlow<Boolean> = _loadingExecute.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _step = MutableStateFlow(1)
    val step: StateFlow<Int> = _step.asStateFlow()

    init {
        fetchInitialData()
    }

    private fun fetchInitialData() {
        viewModelScope.launch {
            _loadingYears.value = true
            try {
                // Load TP List
                val tpRes = academicService.getTahunPelajaran(limit = 100)
                if (tpRes.isSuccessful && tpRes.body()?.success == true) {
                    val list = tpRes.body()?.data ?: emptyList()
                    _tahunPelajaranList.value = list
                    // Preselect active old year
                    val active = list.find { it.is_active }
                    if (active != null) {
                        selectedTahunLamaId.value = active.id
                    }
                }

                // Load Kelas List
                val kelasRes = academicService.getKelas(limit = 100)
                if (kelasRes.isSuccessful && kelasRes.body()?.success == true) {
                    _kelasList.value = kelasRes.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading transition references", e)
            } finally {
                _loadingYears.value = false
            }
        }
    }

    fun setStep(value: Int) {
        _step.value = value
    }

    fun updateClassMapping(fromKelasId: String, toKelasId: String) {
        val current = _classMappings.value.toMutableMap()
        if (toKelasId.isEmpty()) {
            current.remove(fromKelasId)
        } else {
            current[fromKelasId] = toKelasId
        }
        _classMappings.value = current
    }

    fun updateStudentOverride(siswaId: String, status: String) {
        val current = _overrides.value.toMutableMap()
        current[siswaId] = status
        _overrides.value = current
    }

    fun loadPreview(onSuccess: () -> Unit) {
        if (selectedTahunLamaId.value.isEmpty() || selectedTahunBaruId.value.isEmpty()) {
            _errorMessage.value = "Tahun sumber dan target wajib dipilih"
            return
        }

        viewModelScope.launch {
            _loadingPreview.value = true
            _errorMessage.value = null
            try {
                val mappings = _classMappings.value.map {
                    mapOf("fromKelasId" to it.key, "toKelasId" to it.value)
                }
                val payload = mapOf(
                    "tahunPelajaranLamaId" to selectedTahunLamaId.value,
                    "tahunPelajaranBaruId" to selectedTahunBaruId.value,
                    "mappingKelas" to mappings
                )
                val response = academicService.previewTransition(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    _previewData.value = response.body()?.data
                    onSuccess()
                } else {
                    _errorMessage.value = response.body()?.message ?: "Gagal memuat preview kenaikan kelas"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading transition preview", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _loadingPreview.value = false
            }
        }
    }

    fun executeTransition(onSuccess: () -> Unit) {
        if (_loadingExecute.value) return
        viewModelScope.launch {
            _loadingExecute.value = true
            _errorMessage.value = null
            try {
                val mappings = _classMappings.value.map {
                    mapOf("fromKelasId" to it.key, "toKelasId" to it.value)
                }
                val overrideList = _overrides.value.map {
                    mapOf("siswaId" to it.key, "status" to it.value)
                }
                val payload = mapOf(
                    "tahunPelajaranLamaId" to selectedTahunLamaId.value,
                    "tahunPelajaranBaruId" to selectedTahunBaruId.value,
                    "mappingKelas" to mappings,
                    "overrides" to overrideList
                )
                val response = academicService.executeTransition(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    onSuccess()
                } else {
                    _errorMessage.value = response.body()?.message ?: "Eksekusi kenaikan kelas gagal"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error executing transition", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _loadingExecute.value = false
            }
        }
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
