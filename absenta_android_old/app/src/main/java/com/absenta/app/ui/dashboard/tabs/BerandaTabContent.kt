package com.absenta.app.ui.dashboard.tabs

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.ui.dashboard.DashboardViewModel
import com.absenta.app.ui.dashboard.widgets.*

@Composable
fun BerandaTabContent(
    viewModel: DashboardViewModel,
    onNavigateToSchedule: () -> Unit,
    onNavigateToTeachingJournal: () -> Unit,
    onNavigateToViolations: () -> Unit,
    onNavigateToPiket: () -> Unit,
    onNavigateToAttendanceRekap: () -> Unit,
    onNavigateToSarpras: () -> Unit,
    onNavigateToCounseling: () -> Unit,
    gatedNavigateToCoopPOS: () -> Unit,
    gatedNavigateToCoopSavings: () -> Unit,
    gatedNavigateToCoopLoans: () -> Unit,
    gatedNavigateToScanner: () -> Unit,
    gatedNavigateToPklVerification: () -> Unit,
    gatedNavigateToGenericDetail: (String) -> Unit,
    onActionTimeline: (com.absenta.app.data.api.JadwalTemplateEntry) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    // Session Data
    val userName by viewModel.userName.collectAsState()
    val positionCodes by viewModel.positionCodes.collectAsState()
    val userRole by viewModel.userRole.collectAsState()
    val waliKelasDi by viewModel.waliKelasDi.collectAsState()
    val userCapabilities by viewModel.userCapabilities.collectAsState()

    // Timeline Data
    val timelineItems by viewModel.timelineItems.collectAsState()
    val isTimelineLoading by viewModel.isTimelineLoading.collectAsState()

    // Structural Panel Data
    val waliKelasAttendanceRate by viewModel.waliKelasAttendanceRate.collectAsState()
    val waliKelasAbsentStudents by viewModel.waliKelasAbsentStudents.collectAsState()
    val isWaliKelasLoading by viewModel.isWaliKelasLoading.collectAsState()

    val kurikulumHealthScore by viewModel.kurikulumHealthScore.collectAsState()
    val kurikulumActiveClasses by viewModel.kurikulumActiveClasses.collectAsState()
    val kurikulumTotalClasses by viewModel.kurikulumTotalClasses.collectAsState()
    val kurikulumTeacherPresent by viewModel.kurikulumTeacherPresent.collectAsState()
    val kurikulumTotalTeachers by viewModel.kurikulumTotalTeachers.collectAsState()
    val kurikulumSupervisionCount by viewModel.kurikulumSupervisionCount.collectAsState()
    val isKurikulumLoading by viewModel.isKurikulumLoading.collectAsState()

    val kesiswaanActiveIzinCount by viewModel.kesiswaanActiveIzinCount.collectAsState()
    val kesiswaanPointsToday by viewModel.kesiswaanPointsToday.collectAsState()
    val isKesiswaanLoading by viewModel.isKesiswaanLoading.collectAsState()

    val bkNewCases by viewModel.bkNewCases.collectAsState()
    val bkHandledCases by viewModel.bkHandledCases.collectAsState()
    val bkCriticalStudents by viewModel.bkCriticalStudents.collectAsState()
    val isBkLoading by viewModel.isBkLoading.collectAsState()

    val hubinActivePklStudents by viewModel.hubinActivePklStudents.collectAsState()
    val hubinActivePartners by viewModel.hubinActivePartners.collectAsState()
    val hubinPendingReports by viewModel.hubinPendingReports.collectAsState()
    val isHubinLoading by viewModel.isHubinLoading.collectAsState()

    val sarprasActiveBorrows by viewModel.sarprasActiveBorrows.collectAsState()
    val sarprasAvailableAssets by viewModel.sarprasAvailableAssets.collectAsState()
    val sarprasPendingMaintenance by viewModel.sarprasPendingMaintenance.collectAsState()
    val isSarprasLoading by viewModel.isSarprasLoading.collectAsState()

    val toolmanToolsBorrowed by viewModel.toolmanToolsBorrowed.collectAsState()
    val toolmanToolsAvailable by viewModel.toolmanToolsAvailable.collectAsState()
    val toolmanDamagedReports by viewModel.toolmanDamagedReports.collectAsState()
    val isToolmanLoading by viewModel.isToolmanLoading.collectAsState()

    val kaprogTotalTeachers by viewModel.kaprogTotalTeachers.collectAsState()
    val kaprogActiveClasses by viewModel.kaprogActiveClasses.collectAsState()
    val kaprogSupervisionCount by viewModel.kaprogSupervisionCount.collectAsState()
    val isKaprogLoading by viewModel.isKaprogLoading.collectAsState()

    val kabengActiveBengkel by viewModel.kabengActiveBengkel.collectAsState()
    val kabengAvailableTools by viewModel.kabengAvailableTools.collectAsState()
    val kabengPracticeSchedules by viewModel.kabengPracticeSchedules.collectAsState()
    val isKabengLoading by viewModel.isKabengLoading.collectAsState()

    val bkkAlumniPlaced by viewModel.bkkAlumniPlaced.collectAsState()
    val bkkActiveJobs by viewModel.bkkActiveJobs.collectAsState()
    val bkkPendingApplications by viewModel.bkkPendingApplications.collectAsState()
    val isBkkLoading by viewModel.isBkkLoading.collectAsState()

    val gerbangTotalScansToday by viewModel.gerbangTotalScansToday.collectAsState()
    val gerbangLateStudents by viewModel.gerbangLateStudents.collectAsState()
    val gerbangGateStatus by viewModel.gerbangGateStatus.collectAsState()
    val isGerbangLoading by viewModel.isGerbangLoading.collectAsState()

    val kepsekEscalations by viewModel.kepsekEscalations.collectAsState()

    val can = { capability: String ->
        userCapabilities.contains(capability)
    }

    val isWaliKelas = can("dashboard.view.walikelas") || !waliKelasDi.isNullOrEmpty() || positionCodes.contains("WALIKELAS") || positionCodes.contains("WALI") || positionCodes.contains("HOMEROOM")
    val isKurikulum = can("dashboard.view.kurikulum") || can("attendance.sessions.view.list") || userRole == "KURIKULUM" || positionCodes.contains("KURIKULUM")
    val isStrictKesiswaan = can("dashboard.view.kesiswaan") || userRole == "KESISWAAN" || positionCodes.contains("KESISWAAN")
    val isKesiswaan = isStrictKesiswaan || can("dashboard.view.piket") || can("attendance.piket.view") || can("attendance.piket.manage") || positionCodes.contains("PIKET")
    val isKepsek = can("dashboard.view.kepsek") || positionCodes.contains("KEPALA_SEKOLAH") || positionCodes.contains("KEPSEK") || positionCodes.contains("KEPALA SEKOLAH")
    val isSarpras = userRole == "SARPRAS" || positionCodes.contains("SARPRAS") || positionCodes.contains("SARANA")
    val isHubin = can("dashboard.view.hubin") || userRole == "HUBIN" || positionCodes.contains("HUBIN") || positionCodes.contains("HUBUNGAN_INDUSTRI")
    val isGlobalHubin = can("hubin.partners.manage") || userRole == "ADMIN" || positionCodes.contains("HUBIN")
    val isToolman = positionCodes.contains("TOOLMAN") || positionCodes.contains("TOOL_MAN") || positionCodes.contains("PENJAGA_LAB")
    val isKaprog = userRole == "KAPROG" || positionCodes.contains("KAPROG") || positionCodes.contains("KEPALA_PROGRAM")
    val isKabeng = positionCodes.contains("KABENG") || positionCodes.contains("KEPALA_BENGKEL")
    val isBpbk = positionCodes.contains("BPBK") || positionCodes.contains("BK") || positionCodes.contains("BIMBINGAN_KONSELING") || positionCodes.contains("KONSELING")
    val isBkk = positionCodes.contains("BKK") || positionCodes.contains("BURSA_KERJA")
    val isGerbang = positionCodes.contains("GERBANG") || positionCodes.contains("OPERATOR_GERBANG") || positionCodes.contains("GATE")

    LazyColumn(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC)),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // 1. Welcome Banner & Quick Actions
        item {
            StaffWelcomeQuickActionsCard(
                userName = userName,
                positionCodes = positionCodes,
                isWaliKelas = isWaliKelas,
                isKurikulum = isKurikulum,
                onNavigateToSchedule = onNavigateToSchedule,
                onNavigateToTeachingJournal = onNavigateToTeachingJournal,
                onNavigateToViolations = onNavigateToViolations,
                onNavigateToGenericDetail = gatedNavigateToGenericDetail
            )
        }

        // Lini Masa & Statistik Pengajaran
        if (userRole.isNotEmpty() && userRole != "PARENT" && userRole != "WALI_MURID" && userRole != "ORTU") {
            item {
                StaffScheduleWidget(
                    timelineItems = timelineItems,
                    isLoading = isTimelineLoading,
                    onAction = onActionTimeline,
                    onOpenJournal = { _, _ ->
                        onNavigateToTeachingJournal()
                    }
                )
            }
        }

        // 2. Judul Section
        item {
            Text(
                text = "Panel Jabatan Struktural",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E293B)
            )
        }

        val isCoopStaff = positionCodes.any {
            it in listOf("BENDAHARA_KOPERASI", "KETUA_KOPERASI", "SEKRETARIS_KOPERASI", "MANAJER_TOKO_KOPERASI")
        }
        val hasAnyStructural = isKepsek || isWaliKelas || isKurikulum || isKesiswaan || isHubin || isSarpras || isToolman || isKaprog || isKabeng || isBpbk || isBkk || isGerbang || isCoopStaff

        val activeRenderList = mutableListOf<Pair<String, @Composable () -> Unit>>()
        val list = activeRenderList

        if (isKepsek) {
            list.add("KEPSEK" to {
                KepsekEscalationCard(escalations = kepsekEscalations)
            })
        }

        if (isWaliKelas) {
            list.add("WALIKELAS" to {
                val className = if (!waliKelasDi.isNullOrEmpty()) waliKelasDi!! else "Kelas Perwalian"
                WaliKelasSidebarPanel(
                    namaKelas = className,
                    attendanceRate = waliKelasAttendanceRate,
                    absentStudents = waliKelasAbsentStudents,
                    isLoading = isWaliKelasLoading,
                    hasData = waliKelasAttendanceRate != null,
                    onViewRekap = { onNavigateToAttendanceRekap() },
                    onFollowUp = { student ->
                        try {
                            val dialIntent = android.content.Intent(android.content.Intent.ACTION_DIAL).apply {
                                data = android.net.Uri.parse("tel:")
                            }
                            context.startActivity(dialIntent)
                        } catch (e: Exception) {
                            android.widget.Toast.makeText(context, "Tidak dapat melakukan panggilan", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    }
                )
            })
        }

        if (isKurikulum) {
            list.add("KURIKULUM" to {
                KurikulumSidebarPanel(
                    healthScore = kurikulumHealthScore,
                    activeClasses = kurikulumActiveClasses,
                    totalClasses = kurikulumTotalClasses,
                    teacherPresent = kurikulumTeacherPresent,
                    totalTeachers = kurikulumTotalTeachers,
                    supervisionCount = kurikulumSupervisionCount,
                    isLoading = isKurikulumLoading,
                    onMonitor = { onNavigateToAttendanceRekap() }
                )
            })
        }

        if (isKesiswaan) {
            list.add("KESISWAAN" to {
                KesiswaanSidebarPanel(
                    isPiketHariIni = positionCodes.any { it.equals("PIKET", ignoreCase = true) } || can("dashboard.view.piket") || can("attendance.piket.view") || can("attendance.piket.manage"),
                    activeIzinCount = kesiswaanActiveIzinCount,
                    pointsToday = kesiswaanPointsToday,
                    isLoading = isKesiswaanLoading,
                    onOpenPiket = { onNavigateToPiket() },
                    onOpenMonitoring = if (isStrictKesiswaan) { { onNavigateToViolations() } } else null
                )
            })
        }

        if (isGlobalHubin || hubinActivePklStudents > 0) {
            list.add("HUBIN" to {
                HubinSidebarPanel(
                    activePklStudents = hubinActivePklStudents,
                    activePartners = hubinActivePartners,
                    pendingReports = hubinPendingReports,
                    isLoading = isHubinLoading,
                    onMonitor = { gatedNavigateToPklVerification() }
                )
            })
        }

        if (isSarpras) {
            list.add("SARPRAS" to {
                SarpraSidebarPanel(
                    activeBorrows = sarprasActiveBorrows,
                    availableAssets = sarprasAvailableAssets,
                    pendingMaintenance = sarprasPendingMaintenance,
                    isLoading = isSarprasLoading,
                    onManage = { onNavigateToSarpras() }
                )
            })
        }

        if (isToolman) {
            list.add("TOOLMAN" to {
                ToolmanSidebarPanel(
                    toolsBorrowed = toolmanToolsBorrowed,
                    toolsAvailable = toolmanToolsAvailable,
                    damagedReports = toolmanDamagedReports,
                    isLoading = isToolmanLoading,
                    onManage = { onNavigateToSarpras() }
                )
            })
        }

        if (isKaprog) {
            list.add("KAPROG" to {
                val progName = positionCodes.firstOrNull { it.startsWith("KAPROG_") }?.replace("KAPROG_", "") ?: "Jurusan"
                KaprogSidebarPanel(
                    totalTeachers = kaprogTotalTeachers,
                    activeClasses = kaprogActiveClasses,
                    supervisionCount = kaprogSupervisionCount,
                    programName = progName,
                    isLoading = isKaprogLoading,
                    onMonitor = { onNavigateToAttendanceRekap() }
                )
            })
        }

        if (isKabeng) {
            list.add("KABENG" to {
                val bengName = positionCodes.firstOrNull { it.startsWith("KABENG_") }?.replace("KABENG_", "") ?: "Bengkel"
                KabengSidebarPanel(
                    activeBengkel = kabengActiveBengkel,
                    availableTools = kabengAvailableTools,
                    practiceSchedules = kabengPracticeSchedules,
                    bengkelName = bengName,
                    isLoading = isKabengLoading,
                    onManage = { onNavigateToSarpras() }
                )
            })
        }

        if (isBpbk) {
            list.add("BPBK" to {
                BpbkSidebarPanel(
                    newCases = bkNewCases,
                    handledCases = bkHandledCases,
                    criticalStudents = bkCriticalStudents,
                    isLoading = isBkLoading,
                    onOpenData = { onNavigateToCounseling() }
                )
            })
        }

        if (isBkk) {
            list.add("BKK" to {
                BkkSidebarPanel(
                    alumniPlaced = bkkAlumniPlaced,
                    activeJobs = bkkActiveJobs,
                    pendingApplications = bkkPendingApplications,
                    isLoading = isBkkLoading,
                    onOpenPortal = { gatedNavigateToGenericDetail("Portal Karir BKK") }
                )
            })
        }

        if (isGerbang) {
            list.add("GERBANG" to {
                GerbangSidebarPanel(
                    totalScansToday = gerbangTotalScansToday,
                    lateStudents = gerbangLateStudents,
                    gateStatus = gerbangGateStatus,
                    isLoading = isGerbangLoading,
                    onOpenGerbang = { gatedNavigateToScanner() }
                )
            })
        }

        if (isCoopStaff) {
            list.add("KOPERASI" to {
                val primaryPosition = positionCodes.firstOrNull {
                    it in listOf("BENDAHARA_KOPERASI", "KETUA_KOPERASI", "SEKRETARIS_KOPERASI", "MANAJER_TOKO_KOPERASI")
                } ?: "Pengurus Koperasi"

                val readableName = when (primaryPosition) {
                    "BENDAHARA_KOPERASI" -> "Bendahara Koperasi"
                    "KETUA_KOPERASI" -> "Ketua Koperasi"
                    "SEKRETARIS_KOPERASI" -> "Sekretaris Koperasi"
                    "MANAJER_TOKO_KOPERASI" -> "Manajer Toko Koperasi"
                    else -> "Pengurus Koperasi"
                }

                CooperativeWidget(
                    positionName = readableName,
                    onNavigateToPOS = gatedNavigateToCoopPOS,
                    onNavigateToSavings = gatedNavigateToCoopSavings,
                    onNavigateToLoans = gatedNavigateToCoopLoans
                )
            })
        }

        val orderedList = list.sortedBy { getPositionOrder(it.first) }

        orderedList.forEach { (_, composable) ->
            item {
                composable()
            }
        }

        // Fallback Widget jika guru tidak memiliki posisi struktural apapun
        if (!hasAnyStructural) {
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Text(
                            text = "Menu Akademik Umum",
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF0F172A)
                        )
                        Text(
                            text = "Akses modul pengajaran dasar dan jadwal mengajar harian Anda.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
                        )
                        Button(
                            onClick = { /* Open standard schedule */ },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                        ) {
                            Text("Lihat Jadwal Mengajar")
                        }
                    }
                }
            }
        }

        // Dampak Pembelajaran — simpan paling belakang
        if (userRole.isNotEmpty() && userRole != "PARENT" && userRole != "WALI_MURID" && userRole != "ORTU") {
            item {
                val totalStudents = timelineItems.sumOf { it.session?._summary?.total ?: 0 }
                val present = timelineItems.sumOf { (it.session?._summary?.HADIR ?: 0) + (it.session?._summary?.TERLAMBAT ?: 0) }
                val attendanceRate = if (totalStudents == 0) 0 else ((present.toDouble() / totalStudents.toDouble()) * 100.0).toInt()

                StaffImpactWidget(
                    totalStudents = totalStudents,
                    totalSessions = timelineItems.size,
                    attendanceRate = attendanceRate
                )
            }
        }
    }
}

private fun getPositionOrder(key: String): Int {
    return when (key) {
        "KAPROG" -> 1
        "KABENG" -> 2
        "TOOLMAN" -> 3
        "WALIKELAS" -> 4
        "BPBK" -> 5
        "KEPSEK" -> 6
        "KURIKULUM" -> 7
        "KESISWAAN" -> 8
        "HUBIN" -> 9
        "SARPRAS" -> 10
        "BKK" -> 11
        "GERBANG" -> 12
        "KOPERASI" -> 13
        else -> 99
    }
}
