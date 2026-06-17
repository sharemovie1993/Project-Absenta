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

class SiswaCardsViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)
    private val academicService = ApiClient.getClient(context).create(AcademicService::class.java)

    private val _config = MutableStateFlow<StudentCardConfig?>(null)
    val config: StateFlow<StudentCardConfig?> = _config.asStateFlow()

    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _saveSuccess = MutableStateFlow(false)
    val saveSuccess: StateFlow<Boolean> = _saveSuccess.asStateFlow()

    // Preview student
    private val _previewStudent = MutableStateFlow<SiswaDetail?>(null)
    val previewStudent: StateFlow<SiswaDetail?> = _previewStudent.asStateFlow()

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

            _canManage.value = isAdmin || caps.contains("academic.student.card.view.config")

            launch { fetchCardConfig() }
            launch { fetchPreviewStudent() }
        }
    }

    fun fetchCardConfig() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                val response = academicService.getStudentCardConfig()
                if (response.isSuccessful && response.body()?.success == true) {
                    _config.value = response.body()?.data ?: createDefaultConfig()
                } else {
                    _config.value = createDefaultConfig()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading student card config", e)
                _config.value = createDefaultConfig()
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun fetchPreviewStudent() {
        viewModelScope.launch {
            try {
                val response = academicService.getSiswa(page = 1, limit = 1)
                if (response.isSuccessful && response.body()?.success == true) {
                    val list = response.body()?.data
                    if (!list.isNullOrEmpty()) {
                        _previewStudent.value = list[0]
                    }
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading preview student", e)
            }
        }
    }

    fun saveConfig(newConfig: StudentCardConfig) {
        if (!_canManage.value) return
        viewModelScope.launch {
            _isLoading.value = true
            _saveSuccess.value = false
            _errorMessage.value = null
            try {
                // Convert to map for API request payload
                val payload = mapOf(
                    "template" to newConfig.template,
                    "card_title" to newConfig.card_title,
                    "header_text" to newConfig.header_text,
                    "subheader_text" to newConfig.subheader_text,
                    "school_name" to newConfig.school_name,
                    "school_address" to newConfig.school_address,
                    "header_font_size" to newConfig.header_font_size,
                    "subheader_font_size" to newConfig.subheader_font_size,
                    "school_name_font_size" to newConfig.school_name_font_size,
                    "school_address_font_size" to newConfig.school_address_font_size,
                    "card_title_font_size" to newConfig.card_title_font_size,
                    "student_name_font_size" to newConfig.student_name_font_size,
                    "student_details_font_size" to newConfig.student_details_font_size,
                    "primary_color" to newConfig.primary_color,
                    "secondary_color" to newConfig.secondary_color,
                    "show_photo" to newConfig.show_photo,
                    "show_qrcode" to newConfig.show_qrcode,
                    "photo_x" to newConfig.photo_x,
                    "photo_y" to newConfig.photo_y,
                    "photo_scale" to newConfig.photo_scale,
                    "qrcode_x" to newConfig.qrcode_x,
                    "qrcode_y" to newConfig.qrcode_y,
                    "qrcode_scale" to newConfig.qrcode_scale,
                    "data_x" to newConfig.data_x,
                    "data_y" to newConfig.data_y
                )
                val response = academicService.updateStudentCardConfig(payload)
                if (response.isSuccessful && response.body()?.success == true) {
                    _config.value = response.body()?.data
                    _saveSuccess.value = true
                } else {
                    _errorMessage.value = response.body()?.message ?: "Gagal menyimpan konfigurasi"
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error saving student card config", e)
                _errorMessage.value = "Koneksi bermasalah: ${e.localizedMessage}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun resetSaveSuccess() {
        _saveSuccess.value = false
    }

    private fun createDefaultConfig(): StudentCardConfig {
        return StudentCardConfig(
            template = "vertical",
            card_title = "KARTU PELAJAR",
            header_text = "PEMERINTAH PROVINSI",
            school_name = "SMA NEGERI ABSENTA",
            school_address = "Jl. Antigravity No. 42",
            header_font_size = 8,
            subheader_font_size = 7,
            school_name_font_size = 10,
            school_address_font_size = 6,
            card_title_font_size = 11,
            student_name_font_size = 11,
            student_details_font_size = 9,
            primary_color = "#1E3C72",
            secondary_color = "#2A5298",
            show_photo = true,
            show_qrcode = true,
            photo_x = 0f,
            photo_y = 0f,
            photo_scale = 1f,
            qrcode_x = 0f,
            qrcode_y = 0f,
            qrcode_scale = 1f
        )
    }

    fun clearErrorMessage() {
        _errorMessage.value = null
    }
}
