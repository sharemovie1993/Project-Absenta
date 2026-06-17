package com.absenta.app.ui.dashboard

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
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DashboardViewModel(application: Application) : AndroidViewModel(application) {
    private val context = application.applicationContext
    private val sessionManager = SessionManager(context)

    // User session flows exposed as StateFlows
    private val _userRole = MutableStateFlow("")
    val userRole: StateFlow<String> = _userRole.asStateFlow()

    private val _userName = MutableStateFlow("Pengguna")
    val userName: StateFlow<String> = _userName.asStateFlow()

    private val _positionCodes = MutableStateFlow<List<String>>(emptyList())
    val positionCodes: StateFlow<List<String>> = _positionCodes.asStateFlow()

    private val _waliKelasDi = MutableStateFlow<String?>(null)
    val waliKelasDi: StateFlow<String?> = _waliKelasDi.asStateFlow()

    private val _enabledFeatures = MutableStateFlow<List<String>>(emptyList())
    val enabledFeatures: StateFlow<List<String>> = _enabledFeatures.asStateFlow()

    private val _activeHubs = MutableStateFlow<List<String>>(emptyList())
    val activeHubs: StateFlow<List<String>> = _activeHubs.asStateFlow()

    private val _userCapabilities = MutableStateFlow<List<String>>(emptyList())
    val userCapabilities: StateFlow<List<String>> = _userCapabilities.asStateFlow()

    private val _sidebarMenuJson = MutableStateFlow<String?>(null)
    val sidebarMenuJson: StateFlow<String?> = _sidebarMenuJson.asStateFlow()

    // Timeline States
    private val _timelineItems = MutableStateFlow<List<JadwalTemplateEntry>>(emptyList())
    val timelineItems: StateFlow<List<JadwalTemplateEntry>> = _timelineItems.asStateFlow()

    private val _isTimelineLoading = MutableStateFlow(false)
    val isTimelineLoading: StateFlow<Boolean> = _isTimelineLoading.asStateFlow()

    // Wali Kelas States
    private val _waliKelasAttendanceRate = MutableStateFlow<Double?>(null)
    val waliKelasAttendanceRate: StateFlow<Double?> = _waliKelasAttendanceRate.asStateFlow()

    private val _waliKelasAbsentStudents = MutableStateFlow<List<com.absenta.app.ui.dashboard.widgets.AbsentStudent>>(emptyList())
    val waliKelasAbsentStudents: StateFlow<List<com.absenta.app.ui.dashboard.widgets.AbsentStudent>> = _waliKelasAbsentStudents.asStateFlow()

    private val _isWaliKelasLoading = MutableStateFlow(false)
    val isWaliKelasLoading: StateFlow<Boolean> = _isWaliKelasLoading.asStateFlow()

    // Kurikulum States
    private val _kurikulumHealthScore = MutableStateFlow(100)
    val kurikulumHealthScore: StateFlow<Int> = _kurikulumHealthScore.asStateFlow()

    private val _kurikulumActiveClasses = MutableStateFlow(0)
    val kurikulumActiveClasses: StateFlow<Int> = _kurikulumActiveClasses.asStateFlow()

    private val _kurikulumTotalClasses = MutableStateFlow(0)
    val kurikulumTotalClasses: StateFlow<Int> = _kurikulumTotalClasses.asStateFlow()

    private val _kurikulumTeacherPresent = MutableStateFlow(0)
    val kurikulumTeacherPresent: StateFlow<Int> = _kurikulumTeacherPresent.asStateFlow()

    private val _kurikulumTotalTeachers = MutableStateFlow(0)
    val kurikulumTotalTeachers: StateFlow<Int> = _kurikulumTotalTeachers.asStateFlow()

    private val _kurikulumSupervisionCount = MutableStateFlow(0)
    val kurikulumSupervisionCount: StateFlow<Int> = _kurikulumSupervisionCount.asStateFlow()

    private val _isKurikulumLoading = MutableStateFlow(false)
    val isKurikulumLoading: StateFlow<Boolean> = _isKurikulumLoading.asStateFlow()

    // Kesiswaan States
    private val _kesiswaanActiveIzinCount = MutableStateFlow(0)
    val kesiswaanActiveIzinCount: StateFlow<Int> = _kesiswaanActiveIzinCount.asStateFlow()

    private val _kesiswaanPointsToday = MutableStateFlow(0)
    val kesiswaanPointsToday: StateFlow<Int> = _kesiswaanPointsToday.asStateFlow()

    private val _isKesiswaanLoading = MutableStateFlow(false)
    val isKesiswaanLoading: StateFlow<Boolean> = _isKesiswaanLoading.asStateFlow()

    // BK States
    private val _bkNewCases = MutableStateFlow(0)
    val bkNewCases: StateFlow<Int> = _bkNewCases.asStateFlow()

    private val _bkHandledCases = MutableStateFlow(0)
    val bkHandledCases: StateFlow<Int> = _bkHandledCases.asStateFlow()

    private val _bkCriticalStudents = MutableStateFlow(0)
    val bkCriticalStudents: StateFlow<Int> = _bkCriticalStudents.asStateFlow()

    private val _isBkLoading = MutableStateFlow(false)
    val isBkLoading: StateFlow<Boolean> = _isBkLoading.asStateFlow()

    // Hubin States
    private val _hubinActivePklStudents = MutableStateFlow(0)
    val hubinActivePklStudents: StateFlow<Int> = _hubinActivePklStudents.asStateFlow()

    private val _hubinActivePartners = MutableStateFlow(0)
    val hubinActivePartners: StateFlow<Int> = _hubinActivePartners.asStateFlow()

    private val _hubinPendingReports = MutableStateFlow(0)
    val hubinPendingReports: StateFlow<Int> = _hubinPendingReports.asStateFlow()

    private val _isHubinLoading = MutableStateFlow(false)
    val isHubinLoading: StateFlow<Boolean> = _isHubinLoading.asStateFlow()

    // Sarpras States
    private val _sarprasActiveBorrows = MutableStateFlow(0)
    val sarprasActiveBorrows: StateFlow<Int> = _sarprasActiveBorrows.asStateFlow()

    private val _sarprasAvailableAssets = MutableStateFlow(0)
    val sarprasAvailableAssets: StateFlow<Int> = _sarprasAvailableAssets.asStateFlow()

    private val _sarprasPendingMaintenance = MutableStateFlow(0)
    val sarprasPendingMaintenance: StateFlow<Int> = _sarprasPendingMaintenance.asStateFlow()

    private val _isSarprasLoading = MutableStateFlow(false)
    val isSarprasLoading: StateFlow<Boolean> = _isSarprasLoading.asStateFlow()

    // Toolman States
    private val _toolmanToolsBorrowed = MutableStateFlow(0)
    val toolmanToolsBorrowed: StateFlow<Int> = _toolmanToolsBorrowed.asStateFlow()

    private val _toolmanToolsAvailable = MutableStateFlow(0)
    val toolmanToolsAvailable: StateFlow<Int> = _toolmanToolsAvailable.asStateFlow()

    private val _toolmanDamagedReports = MutableStateFlow(0)
    val toolmanDamagedReports: StateFlow<Int> = _toolmanDamagedReports.asStateFlow()

    private val _isToolmanLoading = MutableStateFlow(false)
    val isToolmanLoading: StateFlow<Boolean> = _isToolmanLoading.asStateFlow()

    // Kaprog States
    private val _kaprogTotalTeachers = MutableStateFlow(0)
    val kaprogTotalTeachers: StateFlow<Int> = _kaprogTotalTeachers.asStateFlow()

    private val _kaprogActiveClasses = MutableStateFlow(0)
    val kaprogActiveClasses: StateFlow<Int> = _kaprogActiveClasses.asStateFlow()

    private val _kaprogSupervisionCount = MutableStateFlow(0)
    val kaprogSupervisionCount: StateFlow<Int> = _kaprogSupervisionCount.asStateFlow()

    private val _isKaprogLoading = MutableStateFlow(false)
    val isKaprogLoading: StateFlow<Boolean> = _isKaprogLoading.asStateFlow()

    // Kabeng States
    private val _kabengActiveBengkel = MutableStateFlow(0)
    val kabengActiveBengkel: StateFlow<Int> = _kabengActiveBengkel.asStateFlow()

    private val _kabengAvailableTools = MutableStateFlow(0)
    val kabengAvailableTools: StateFlow<Int> = _kabengAvailableTools.asStateFlow()

    private val _kabengPracticeSchedules = MutableStateFlow(0)
    val kabengPracticeSchedules: StateFlow<Int> = _kabengPracticeSchedules.asStateFlow()

    private val _isKabengLoading = MutableStateFlow(false)
    val isKabengLoading: StateFlow<Boolean> = _isKabengLoading.asStateFlow()

    // BKK States
    private val _bkkAlumniPlaced = MutableStateFlow(0)
    val bkkAlumniPlaced: StateFlow<Int> = _bkkAlumniPlaced.asStateFlow()

    private val _bkkActiveJobs = MutableStateFlow(0)
    val bkkActiveJobs: StateFlow<Int> = _bkkActiveJobs.asStateFlow()

    private val _bkkPendingApplications = MutableStateFlow(0)
    val bkkPendingApplications: StateFlow<Int> = _bkkPendingApplications.asStateFlow()

    private val _isBkkLoading = MutableStateFlow(false)
    val isBkkLoading: StateFlow<Boolean> = _isBkkLoading.asStateFlow()

    // Gerbang States
    private val _gerbangTotalScansToday = MutableStateFlow(0)
    val gerbangTotalScansToday: StateFlow<Int> = _gerbangTotalScansToday.asStateFlow()

    private val _gerbangLateStudents = MutableStateFlow(0)
    val gerbangLateStudents: StateFlow<Int> = _gerbangLateStudents.asStateFlow()

    private val _gerbangGateStatus = MutableStateFlow("AKTIF")
    val gerbangGateStatus: StateFlow<String> = _gerbangGateStatus.asStateFlow()

    private val _isGerbangLoading = MutableStateFlow(false)
    val isGerbangLoading: StateFlow<Boolean> = _isGerbangLoading.asStateFlow()

    // Kepsek Escalations
    private val _kepsekEscalations = MutableStateFlow<List<com.absenta.app.ui.dashboard.widgets.EscalationItem>>(emptyList())
    val kepsekEscalations: StateFlow<List<com.absenta.app.ui.dashboard.widgets.EscalationItem>> = _kepsekEscalations.asStateFlow()

    // Services
    private val rekapService = ApiClient.getClient(context).create(AttendanceRekapService::class.java)
    private val kesiswaanService = ApiClient.getClient(context).create(KesiswaanService::class.java)
    private val piketService = ApiClient.getClient(context).create(PiketService::class.java)
    private val hubinService = ApiClient.getClient(context).create(HubinService::class.java)
    private val dashboardService = ApiClient.getClient(context).create(DashboardService::class.java)
    private val sarprasService = ApiClient.getClient(context).create(SarprasService::class.java)
    private val attendanceService = ApiClient.getClient(context).create(AttendanceService::class.java)

    init {
        loadSessionAndData()
    }

    fun loadSessionAndData() {
        viewModelScope.launch {
            // Mengamati nama pengguna secara dinamis
            launch {
                sessionManager.userNameFlow.collect { name ->
                    _userName.value = name ?: "Pengguna"
                }
            }

            // Mengamati json menu secara dinamis
            launch {
                sessionManager.sidebarMenuJsonFlow.collect { json ->
                    _sidebarMenuJson.value = json
                }
            }

            // Menggabungkan alur data sesi utama dan memicu pemuatan ulang dashboard jika ada perubahan
            val sessionFlows: List<kotlinx.coroutines.flow.Flow<Any?>> = listOf(
                sessionManager.userRoleFlow,
                sessionManager.positionCodesFlow,
                sessionManager.waliKelasDiFlow,
                sessionManager.enabledFeaturesFlow,
                sessionManager.activeHubsFlow,
                sessionManager.capabilitiesFlow
            )

            var loadJob: kotlinx.coroutines.Job? = null

            combine(sessionFlows) { array ->
                val role = array[0] as String? ?: ""
                @Suppress("UNCHECKED_CAST")
                val positions = array[1] as List<String>
                val wali = array[2] as String?
                @Suppress("UNCHECKED_CAST")
                val features = array[3] as List<String>
                @Suppress("UNCHECKED_CAST")
                val hubs = array[4] as List<String>
                @Suppress("UNCHECKED_CAST")
                val caps = array[5] as List<String>

                val changed = _userRole.value != role ||
                        _positionCodes.value != positions ||
                        _waliKelasDi.value != wali ||
                        _enabledFeatures.value != features ||
                        _activeHubs.value != hubs ||
                        _userCapabilities.value != caps

                if (changed) {
                    _userRole.value = role
                    _positionCodes.value = positions
                    _waliKelasDi.value = wali
                    _enabledFeatures.value = features
                    _activeHubs.value = hubs
                    _userCapabilities.value = caps
                    true
                } else {
                    false
                }
            }.collect { shouldLoad ->
                if (shouldLoad) {
                    loadJob?.cancel()
                    loadJob = viewModelScope.launch {
                        delay(300)
                        loadDashboardData()
                    }
                }
            }
        }
    }

    fun loadDashboardData() {
        val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val role = _userRole.value
        val positions = _positionCodes.value
        val waliKelas = _waliKelasDi.value
        val caps = _userCapabilities.value

        val can = { capability: String -> caps.contains(capability) }
        val isWaliKelas = can("dashboard.view.walikelas") || !waliKelas.isNullOrEmpty() || positions.contains("WALIKELAS") || positions.contains("WALI") || positions.contains("HOMEROOM")
        val isKurikulum = can("dashboard.view.kurikulum") || can("attendance.sessions.view.list") || role == "KURIKULUM" || positions.contains("KURIKULUM")
        val isStrictKesiswaan = can("dashboard.view.kesiswaan") || role == "KESISWAAN" || positions.contains("KESISWAAN")
        val isKesiswaan = isStrictKesiswaan || can("dashboard.view.piket") || can("attendance.piket.view") || can("attendance.piket.manage") || positions.contains("PIKET")
        val isKepsek = can("dashboard.view.kepsek") || positions.contains("KEPALA_SEKOLAH") || positions.contains("KEPSEK") || positions.contains("KEPALA SEKOLAH")
        val isSarpras = role == "SARPRAS" || positions.contains("SARPRAS") || positions.contains("SARANA")
        val isHubin = can("dashboard.view.hubin") || role == "HUBIN" || positions.contains("HUBIN") || positions.contains("HUBUNGAN_INDUSTRI")
        val isGlobalHubin = can("hubin.partners.manage") || role == "ADMIN" || positions.contains("HUBIN")
        val isToolman = positions.contains("TOOLMAN") || positions.contains("TOOL_MAN") || positions.contains("PENJAGA_LAB")
        val isKaprog = role == "KAPROG" || positions.contains("KAPROG") || positions.contains("KEPALA_PROGRAM")
        val isKabeng = positions.contains("KABENG") || positions.contains("KEPALA_BENGKEL")
        val isBpbk = positions.contains("BPBK") || positions.contains("BK") || positions.contains("BIMBINGAN_KONSELING") || positions.contains("KONSELING")
        val isBkk = positions.contains("BKK") || positions.contains("BURSA_KERJA")
        val isGerbang = positions.contains("GERBANG") || positions.contains("OPERATOR_GERBANG") || positions.contains("GATE")

        // Load timeline
        if (role.isNotEmpty() && role != "PARENT" && role != "WALI_MURID" && role != "ORTU") {
            viewModelScope.launch {
                _isTimelineLoading.value = true
                try {
                    val response = attendanceService.getMyJadwalTemplate(todayStr)
                    if (response.isSuccessful) {
                        _timelineItems.value = response.body()?.data ?: emptyList()
                    } else {
                        _timelineItems.value = emptyList()
                    }
                } catch (e: Exception) {
                    _timelineItems.value = emptyList()
                    Log.e("AbsentaDebug", "Error fetching timeline", e)
                } finally {
                    _isTimelineLoading.value = false
                }
            }
        }

        // Wali Kelas Load
        if (isWaliKelas) {
            viewModelScope.launch {
                _isWaliKelasLoading.value = true
                try {
                    val response = rekapService.getRekapHarian(date = todayStr, kelasId = waliKelas)
                    if (response.isSuccessful && response.body()?.success == true) {
                        val rekapData = response.body()?.data
                        val list = rekapData?.list ?: emptyList()
                        val total = list.size
                        val presentCount = list.count { it.status.uppercase() == "HADIR" || it.status.uppercase() == "TERLAMBAT" }
                        _waliKelasAttendanceRate.value = if (total > 0) (presentCount.toDouble() / total.toDouble()) * 100.0 else null
                        _waliKelasAbsentStudents.value = list.filter { it.status.uppercase() != "HADIR" && it.status.uppercase() != "TERLAMBAT" }
                            .map { com.absenta.app.ui.dashboard.widgets.AbsentStudent(id = it.siswa_id, nama = it.nama, status = it.status) }
                    } else {
                        _waliKelasAttendanceRate.value = null
                        _waliKelasAbsentStudents.value = emptyList()
                    }
                } catch (e: Exception) {
                    _waliKelasAttendanceRate.value = null
                    _waliKelasAbsentStudents.value = emptyList()
                    Log.e("AbsentaDebug", "Wali Kelas load error", e)
                } finally {
                    _isWaliKelasLoading.value = false
                }
            }
        }

        // Kurikulum Load
        if (isKurikulum || isKepsek) {
            viewModelScope.launch {
                _isKurikulumLoading.value = true
                try {
                    val monitoringRes = dashboardService.getKbmGlobalMonitoring(tanggal = todayStr)
                    if (monitoringRes.isSuccessful && monitoringRes.body()?.success == true) {
                        val d = monitoringRes.body()?.data
                        if (d != null) {
                            _kurikulumHealthScore.value    = d.healthScore
                            _kurikulumActiveClasses.value  = d.activeClasses
                            _kurikulumTotalClasses.value   = d.totalClasses
                            _kurikulumTeacherPresent.value = d.teacherPresent
                            _kurikulumTotalTeachers.value  = d.totalTeachers
                            _kurikulumSupervisionCount.value = d.supervisionCount
                        } else {
                            _kurikulumHealthScore.value = 0; _kurikulumActiveClasses.value = 0
                            _kurikulumTotalClasses.value = 0; _kurikulumTeacherPresent.value = 0
                            _kurikulumTotalTeachers.value = 0; _kurikulumSupervisionCount.value = 0
                        }
                    } else {
                        val kbmRes     = dashboardService.getDailyClassStats(todayStr)
                        val teacherRes = dashboardService.getDailyTeacherStats(todayStr)
                        val active = if (kbmRes.isSuccessful) kbmRes.body()?.data?.kelasAktif ?: 0 else 0
                        val totalK = if (kbmRes.isSuccessful) kbmRes.body()?.data?.totalKelas ?: 0 else 0
                        val presentT = if (teacherRes.isSuccessful) teacherRes.body()?.data?.guruHadir ?: 0 else 0
                        val totalT  = if (teacherRes.isSuccessful) teacherRes.body()?.data?.totalGuru ?: 0 else 0
                        _kurikulumActiveClasses.value = active
                        _kurikulumTotalClasses.value = totalK
                        _kurikulumTeacherPresent.value = presentT
                        _kurikulumTotalTeachers.value = totalT
                        val kt = if (totalK > 0) totalK else 1
                        val gt = if (totalT > 0) totalT else 1
                        _kurikulumHealthScore.value = Math.round((active.toFloat() / kt.toFloat()) * 60 + (presentT.toFloat() / gt.toFloat()) * 40)
                        _kurikulumSupervisionCount.value = 0
                    }
                } catch (e: Exception) {
                    _kurikulumHealthScore.value = 0; _kurikulumActiveClasses.value = 0; _kurikulumTotalClasses.value = 0
                    _kurikulumTeacherPresent.value = 0; _kurikulumTotalTeachers.value = 0; _kurikulumSupervisionCount.value = 0
                    Log.e("AbsentaDebug", "Kurikulum load error", e)
                } finally {
                    _isKurikulumLoading.value = false
                }
            }
        }

        // Kesiswaan Load
        if (isKesiswaan) {
            viewModelScope.launch {
                _isKesiswaanLoading.value = true
                try {
                    val permitsResponse = piketService.getDailyPermits(date = todayStr)
                    val violationsResponse = kesiswaanService.getPelanggaran(limit = 100)
                    _kesiswaanActiveIzinCount.value = if (permitsResponse.isSuccessful && permitsResponse.body()?.success == true) {
                        permitsResponse.body()?.data?.count { it.status.uppercase() == "DISETUJUI" } ?: 0
                    } else { 0 }
                    _kesiswaanPointsToday.value = if (violationsResponse.isSuccessful && violationsResponse.body()?.success == true) {
                        violationsResponse.body()?.data?.list?.filter {
                            try { it.tanggal.startsWith(todayStr) } catch (e: Exception) { false }
                        }?.sumOf { it.poin } ?: 0
                    } else { 0 }
                } catch (e: Exception) {
                    _kesiswaanActiveIzinCount.value = 0
                    _kesiswaanPointsToday.value = 0
                    Log.e("AbsentaDebug", "Kesiswaan load error", e)
                } finally {
                    _isKesiswaanLoading.value = false
                }
            }
        }

        // BK Load
        if (isBpbk) {
            _bkNewCases.value = 0
            _bkHandledCases.value = 0
            _bkCriticalStudents.value = 0
        }

        // Hubin Load
        if (isHubin) {
            viewModelScope.launch {
                _isHubinLoading.value = true
                try {
                    val statsRes = dashboardService.getHubinStats()
                    if (statsRes.isSuccessful && statsRes.body()?.success == true) {
                        val d = statsRes.body()?.data
                        _hubinActivePklStudents.value = (d?.pklAktif ?: 0).takeIf { it > 0 } ?: (d?.totalSiswaPkl ?: 0)
                        _hubinActivePartners.value    = d?.totalMitra ?: 0
                        _hubinPendingReports.value    = d?.pendingReports ?: 0
                    } else {
                        _hubinActivePklStudents.value = 0; _hubinActivePartners.value = 0; _hubinPendingReports.value = 0
                    }
                } catch (e: Exception) {
                    _hubinActivePklStudents.value = 0; _hubinActivePartners.value = 0; _hubinPendingReports.value = 0
                    Log.e("AbsentaDebug", "Hubin load error", e)
                } finally {
                    _isHubinLoading.value = false
                }
            }
        }

        // Kepsek Escalations Load
        if (isKepsek) {
            viewModelScope.launch {
                try {
                    val escalRes = dashboardService.getKepsekEscalations(limit = 10)
                    if (escalRes.isSuccessful && escalRes.body()?.success == true) {
                        _kepsekEscalations.value = (escalRes.body()?.data ?: emptyList()).map {
                            com.absenta.app.ui.dashboard.widgets.EscalationItem(it.id, it.judul, it.deskripsi)
                        }
                    } else {
                        _kepsekEscalations.value = emptyList()
                    }
                } catch (e: Exception) {
                    _kepsekEscalations.value = emptyList()
                    Log.e("AbsentaDebug", "Kepsek escalation load error", e)
                }
            }
        }

        // Sarpras Load
        if (isSarpras) {
            viewModelScope.launch {
                _isSarprasLoading.value = true
                try {
                    val sarprasRes = sarprasService.getStats()
                    if (sarprasRes.isSuccessful && sarprasRes.body()?.success == true) {
                        val d = sarprasRes.body()?.data
                        _sarprasActiveBorrows.value      = d?.totalLoaned ?: 0
                        _sarprasAvailableAssets.value    = d?.totalAssets ?: 0
                        _sarprasPendingMaintenance.value = d?.totalBroken ?: 0
                    } else {
                        _sarprasActiveBorrows.value = 0; _sarprasAvailableAssets.value = 0; _sarprasPendingMaintenance.value = 0
                    }
                } catch (e: Exception) {
                    _sarprasActiveBorrows.value = 0; _sarprasAvailableAssets.value = 0; _sarprasPendingMaintenance.value = 0
                    Log.e("AbsentaDebug", "Sarpras load error", e)
                } finally {
                    _isSarprasLoading.value = false
                }
            }
        }

        // Toolman Load
        if (isToolman) {
            viewModelScope.launch {
                _isToolmanLoading.value = true
                try {
                    val toolmanRes = dashboardService.getToolmanStats()
                    if (toolmanRes.isSuccessful && toolmanRes.body()?.success == true) {
                        val d = toolmanRes.body()?.data
                        _toolmanToolsBorrowed.value = d?.toolsBorrowed ?: 0
                        _toolmanToolsAvailable.value = d?.toolsAvailable ?: 0
                        _toolmanDamagedReports.value = d?.damagedReports ?: 0
                    } else {
                        _toolmanToolsBorrowed.value = 0; _toolmanToolsAvailable.value = 0; _toolmanDamagedReports.value = 0
                    }
                } catch (e: Exception) {
                    _toolmanToolsBorrowed.value = 0; _toolmanToolsAvailable.value = 0; _toolmanDamagedReports.value = 0
                    Log.e("AbsentaDebug", "Toolman load error", e)
                } finally {
                    _isToolmanLoading.value = false
                }
            }
        }

        // Kaprog Load
        if (isKaprog) {
            viewModelScope.launch {
                _isKaprogLoading.value = true
                try {
                    val kaprogRes = dashboardService.getKaprogStats()
                    if (kaprogRes.isSuccessful && kaprogRes.body()?.success == true) {
                        val d = kaprogRes.body()?.data
                        _kaprogTotalTeachers.value = d?.totalTeachers ?: 0
                        _kaprogActiveClasses.value = d?.activeClasses ?: 0
                        _kaprogSupervisionCount.value = d?.supervisionCount ?: 0
                    } else {
                        _kaprogTotalTeachers.value = 0; _kaprogActiveClasses.value = 0; _kaprogSupervisionCount.value = 0
                    }
                } catch (e: Exception) {
                    _kaprogTotalTeachers.value = 0; _kaprogActiveClasses.value = 0; _kaprogSupervisionCount.value = 0
                    Log.e("AbsentaDebug", "Kaprog load error", e)
                } finally {
                    _isKaprogLoading.value = false
                }
            }
        }

        // Kabeng Load
        if (isKabeng) {
            viewModelScope.launch {
                _isKabengLoading.value = true
                try {
                    val kabengRes = dashboardService.getKabengStats()
                    if (kabengRes.isSuccessful && kabengRes.body()?.success == true) {
                        val d = kabengRes.body()?.data
                        _kabengActiveBengkel.value = d?.activeBengkel ?: 0
                        _kabengAvailableTools.value = d?.availableTools ?: 0
                        _kabengPracticeSchedules.value = d?.practiceSchedules ?: 0
                    } else {
                        _kabengActiveBengkel.value = 0; _kabengAvailableTools.value = 0; _kabengPracticeSchedules.value = 0
                    }
                } catch (e: Exception) {
                    _kabengActiveBengkel.value = 0; _kabengAvailableTools.value = 0; _kabengPracticeSchedules.value = 0
                    Log.e("AbsentaDebug", "Kabeng load error", e)
                } finally {
                    _isKabengLoading.value = false
                }
            }
        }

        // BKK Load
        if (isBkk) {
            viewModelScope.launch {
                _isBkkLoading.value = true
                try {
                    val bkkRes = dashboardService.getBkkStats()
                    if (bkkRes.isSuccessful && bkkRes.body()?.success == true) {
                        val d = bkkRes.body()?.data
                        _bkkAlumniPlaced.value = d?.alumniPlaced ?: 0
                        _bkkActiveJobs.value = d?.activeJobs ?: 0
                        _bkkPendingApplications.value = d?.pendingApplications ?: 0
                    } else {
                        _bkkAlumniPlaced.value = 0; _bkkActiveJobs.value = 0; _bkkPendingApplications.value = 0
                    }
                } catch (e: Exception) {
                    _bkkAlumniPlaced.value = 0; _bkkActiveJobs.value = 0; _bkkPendingApplications.value = 0
                    Log.e("AbsentaDebug", "BKK load error", e)
                } finally {
                    _isBkkLoading.value = false
                }
            }
        }

        // Gerbang Load
        if (isGerbang) {
            viewModelScope.launch {
                _isGerbangLoading.value = true
                try {
                    val gerbangRes = dashboardService.getGerbangStats()
                    if (gerbangRes.isSuccessful && gerbangRes.body()?.success == true) {
                        val d = gerbangRes.body()?.data
                        _gerbangTotalScansToday.value = d?.totalScansToday ?: 0
                        _gerbangLateStudents.value    = d?.lateStudents ?: 0
                        _gerbangGateStatus.value      = d?.gateStatus ?: "AKTIF"
                    } else {
                        _gerbangTotalScansToday.value = 0; _gerbangLateStudents.value = 0; _gerbangGateStatus.value = "AKTIF"
                    }
                } catch (e: Exception) {
                    _gerbangTotalScansToday.value = 0; _gerbangLateStudents.value = 0; _gerbangGateStatus.value = "AKTIF"
                    Log.e("AbsentaDebug", "Gerbang load error", e)
                } finally {
                    _isGerbangLoading.value = false
                }
            }
        }
    }

    suspend fun clearSession() {
        sessionManager.clearSession()
    }
}
