package com.absenta.app.ui.features.attendance

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.VibrationEffect
import android.os.Vibrator
import android.text.InputType
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ClearAll
import androidx.compose.material.icons.filled.Contactless
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.BypassLateRequest
import com.absenta.app.data.model.GerbangStatsData
import com.absenta.app.data.model.TapRequest
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Item Riwayat Tap Terakhir (Stacking Toast Cards)
 */
data class RecentScanItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val identifier: String,
    val kelas: String?,
    val timestamp: String,
    val statusBadge: String,
    val type: String // "SUCCESS", "WARNING", "ERROR", "BYPASS"
)

/**
 * Toast Banner State untuk Notifikasi status scan
 */
data class ToastBannerState(
    val message: String,
    val type: String // "SUCCESS", "WARNING", "ERROR"
)

/**
 * CameraScannerScreen — Terminal Gerbang Smart RFID Reader & Mode Bypass.
 *
 * Mengadopsi 1:1 fitur counter, waktu digital, toast notification stacking, dan mode bypass.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CameraScannerScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val scrollState = rememberScrollState()

    var scannerArah by remember { mutableStateOf("GERBANG_DATANG") }
    var isBypassMode by remember { mutableStateOf(false) }
    var isProcessing by remember { mutableStateOf(false) }
    var toastState by remember { mutableStateOf<ToastBannerState?>(null) }
    var lastScannedName by remember { mutableStateOf<String?>(null) }

    // Stacking Recent Scan Cards State (Riwayat Menumpuk ke Bawah)
    var recentScans by remember { mutableStateOf<List<RecentScanItem>>(emptyList()) }

    // Realtime Counter & Stats State
    var gerbangStats by remember { mutableStateOf(GerbangStatsData()) }
    var isLoadingStats by remember { mutableStateOf(false) }

    // Live Digital Clock State
    var currentTime by remember { mutableStateOf(Date()) }

    // Anti-looping duplicate guard (< 5000ms)
    var lastSubmittedToken by remember { mutableStateOf("") }
    var lastSubmittedTime by remember { mutableStateOf(0L) }

    // Menambahkan item scan baru ke posisi paling atas tumpukan
    fun addRecentScan(item: RecentScanItem) {
        recentScans = (listOf(item) + recentScans).take(15)
    }

    // Live Clock Ticker (Update waktu setiap 1 detik)
    LaunchedEffect(Unit) {
        while (true) {
            currentTime = Date()
            delay(1000)
        }
    }

    // High-Speed Audio Sound Generator (BEEP Feedback)
    fun playBeepSound(type: String) {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_MUSIC, 100)
            when (type) {
                "SUCCESS" -> toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
                "WARNING" -> toneGen.startTone(ToneGenerator.TONE_PROP_BEEP2, 250)
                else -> toneGen.startTone(ToneGenerator.TONE_SUP_ERROR, 300)
            }
        } catch (e: Exception) {}
    }

    // Fetch Stats Counter dari API backend GET /api/attendance/gerbang/stats
    val fetchStats = remember {
        suspend {
            try {
                isLoadingStats = true
                val retrofit = ApiClient.create(tokenManager)
                val service = retrofit.create(AttendanceService::class.java)
                val res = service.getGerbangStats()
                if (res.isSuccessful && res.body()?.data != null) {
                    gerbangStats = res.body()!!.data!!
                }
            } catch (e: Exception) {
            } finally {
                isLoadingStats = false
            }
        }
    }

    // Load initial stats saat screen dibuka
    LaunchedEffect(Unit) {
        fetchStats()
    }

    // Trigger Toast Message dengan Auto-Dismiss 4 detik
    fun showToast(msg: String, type: String) {
        toastState = ToastBannerState(msg, type)
        playBeepSound(type)
    }

    // Auto-clear toast setelah 4 detik
    LaunchedEffect(toastState) {
        if (toastState != null) {
            delay(4000)
            toastState = null
        }
    }

    suspend fun processTap(inputCode: String) {
        val trimmedToken = inputCode.trim()
        if (trimmedToken.isBlank() || isProcessing) return

        val timeStr = SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())

        // Anti-looping Guard (< 5000ms) untuk token yang sama
        val now = System.currentTimeMillis()
        if (trimmedToken == lastSubmittedToken && now - lastSubmittedTime < 5000) {
            vibrateDevice(context)
            showToast("ℹ️ DATA SUDAH TERTAUT: Kartu/ID ini baru saja di-scan", "WARNING")
            addRecentScan(
                RecentScanItem(
                    name = "ID $trimmedToken",
                    identifier = "Scan Duplikat (Anti-looping < 5s)",
                    kelas = "-",
                    timestamp = timeStr,
                    statusBadge = "DUPLIKAT",
                    type = "WARNING"
                )
            )
            return
        }

        isProcessing = true
        lastSubmittedToken = trimmedToken
        lastSubmittedTime = now
        vibrateDevice(context)

        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(AttendanceService::class.java)

            // Mode Bypass Terlambat Aktif
            if (isBypassMode) {
                val response = service.bypassLate(BypassLateRequest(siswaId = trimmedToken, note = "Bypass Mode"))
                if (response.isSuccessful && response.body()?.success == true) {
                    val sInfo = response.body()?.data?.resolvedSiswa
                    val nama = sInfo?.displayName ?: "Siswa"
                    val kelas = sInfo?.kelasNama ?: "Siswa Sekolah"
                    lastScannedName = nama
                    showToast("⚡ BYPASS BERHASIL: $nama - $kelas", "SUCCESS")
                    
                    addRecentScan(
                        RecentScanItem(
                            name = nama,
                            identifier = "NISN: ${sInfo?.nisn ?: sInfo?.nis ?: trimmedToken}",
                            kelas = kelas,
                            timestamp = "$timeStr • Datang (Bypass)",
                            statusBadge = "BYPASS",
                            type = "BYPASS"
                        )
                    )
                    fetchStats()
                } else {
                    val errStr = try { response.errorBody()?.string() } catch (e: Exception) { null }
                    val backendMsg = if (!errStr.isNullOrBlank()) {
                        try { JSONObject(errStr).optString("message", "Gagal memproses bypass") } catch (e: Exception) { "Gagal memproses bypass" }
                    } else {
                        response.body()?.message ?: "Gagal memproses bypass"
                    }
                    showToast("❌ $backendMsg", "ERROR")
                    addRecentScan(
                        RecentScanItem(
                            name = "Tap Gagal (Bypass)",
                            identifier = backendMsg,
                            kelas = "-",
                            timestamp = timeStr,
                            statusBadge = "GAGAL",
                            type = "ERROR"
                        )
                    )
                }
                return
            }

            // Mode Tap Normal (Submit langsung ke backend)
            val response = service.tap(
                TapRequest(
                    siswaId = trimmedToken,
                    token = trimmedToken,
                    arah = scannerArah
                )
            )

            val rawErrorBody = try { response.errorBody()?.string() } catch (e: Exception) { null }
            val rawMsg = if (!rawErrorBody.isNullOrBlank()) {
                try { JSONObject(rawErrorBody).optString("message", "") } catch (e: Exception) { "" }
            } else {
                response.body()?.message ?: ""
            }

            // Penanganan Tap Duplikat ("DATA SUDAH TERTAUT" / "dicatat sebelumnya")
            if (rawMsg.contains("SUDAH TERTAUT", ignoreCase = true) || rawMsg.contains("dicatat sebelumnya", ignoreCase = true)) {
                showToast("⚠️ DATA SUDAH TERTAUT: Absensi hari ini sudah dicatat sebelumnya", "WARNING")
                addRecentScan(
                    RecentScanItem(
                        name = "ID $trimmedToken",
                        identifier = "Absensi Anda hari ini sudah dicatat sebelumnya",
                        kelas = "-",
                        timestamp = timeStr,
                        statusBadge = "DUPLIKAT",
                        type = "WARNING"
                    )
                )
                return
            }

            // Tap Berhasil
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                val sInfo = data?.resolvedSiswa
                val gInfo = data?.resolvedGuru
                
                val nama = sInfo?.displayName ?: gInfo?.displayName ?: "ID $trimmedToken"
                val kelasStr = sInfo?.kelasNama ?: gInfo?.jenisPtk ?: "Umum"
                val kelasLabel = if (!sInfo?.kelasNama.isNullOrBlank()) " - ${sInfo?.kelasNama}" else ""
                val ptkLabel = if (!gInfo?.jenisPtk.isNullOrBlank()) " (${gInfo?.jenisPtk})" else ""

                val successMsg = if (sInfo != null) {
                    "✅ PRESENSI BERHASIL: $nama$kelasLabel"
                } else if (gInfo != null) {
                    "✅ PRESENSI BERHASIL: $nama$ptkLabel"
                } else {
                    "✅ PRESENSI BERHASIL: $nama"
                }

                lastScannedName = nama
                showToast(successMsg, "SUCCESS")

                val isTerlambat = data?.isTerlambat == true
                val arahLabel = if (scannerArah == "GERBANG_DATANG") "Datang" else "Pulang"
                val statusText = if (isTerlambat) "TERLAMBAT" else "HADIR"

                addRecentScan(
                    RecentScanItem(
                        name = nama,
                        identifier = "NIS/NIP: ${sInfo?.nisn ?: sInfo?.nis ?: gInfo?.nip ?: trimmedToken}",
                        kelas = kelasStr,
                        timestamp = "$timeStr • $arahLabel",
                        statusBadge = statusText,
                        type = "SUCCESS"
                    )
                )
                fetchStats()
            } else {
                // Tap Gagal / Ditolak
                val failMsg = if (rawMsg.isNotBlank()) rawMsg else "Siswa/Kartu tidak terdaftar dalam database"
                showToast("❌ GAGAL PRESENSI: $failMsg", "ERROR")
                addRecentScan(
                    RecentScanItem(
                        name = "Ditolak / Gagal",
                        identifier = failMsg,
                        kelas = "-",
                        timestamp = timeStr,
                        statusBadge = "DITOLAK",
                        type = "ERROR"
                    )
                )
            }
        } catch (e: Exception) {
            val errMsg = e.message ?: "Terjadi kesalahan jaringan"
            showToast("❌ KONEKSI GAGAL: $errMsg", "ERROR")
            addRecentScan(
                RecentScanItem(
                    name = "Error Koneksi",
                    identifier = errMsg,
                    kelas = "-",
                    timestamp = timeStr,
                    statusBadge = "ERROR",
                    type = "ERROR"
                )
            )
        } finally {
            isProcessing = false
        }
    }

    // Kalkulasi Status Waktu (Jam 07:00 Masuk, Toleransi 15 menit)
    val hour = SimpleDateFormat("HH", Locale.getDefault()).format(currentTime).toIntOrNull() ?: 0
    val minute = SimpleDateFormat("mm", Locale.getDefault()).format(currentTime).toIntOrNull() ?: 0
    val totalMinutes = hour * 60 + minute
    val targetMasukMinutes = 7 * 60 + 15 // 07:15
    val isLateTime = scannerArah == "GERBANG_DATANG" && totalMinutes > targetMasukMinutes
    val lateMinutesDiff = if (isLateTime) totalMinutes - (7 * 60) else 0

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Terminal Gerbang RFID",
                onNavigateBack = onNavigateBack
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // 1. LIVE DIGITAL CLOCK & JAM MASUK BAR
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(14.dp))
                        .border(1.dp, Border, RoundedCornerShape(14.dp))
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Row(verticalAlignment = Alignment.Bottom) {
                            Text(
                                SimpleDateFormat("HH:mm", Locale.getDefault()).format(currentTime),
                                fontSize = 34.sp,
                                fontWeight = FontWeight.Black,
                                fontFamily = FontFamily.Monospace,
                                color = TextPrimary
                            )
                            Text(
                                ":${SimpleDateFormat("ss", Locale.getDefault()).format(currentTime)}",
                                fontSize = 18.sp,
                                fontFamily = FontFamily.Monospace,
                                color = Primary,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.padding(bottom = 3.dp, start = 2.dp)
                            )
                        }
                        Text(
                            if (scannerArah == "GERBANG_DATANG") "Masuk: 07:00 • Toleransi: 15m" else "Pulang: 14:00",
                            fontSize = 12.sp,
                            color = TextSecondary,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val badgeBg = if (isBypassMode) Color(0xFFF59E0B).copy(alpha = 0.2f) else if (isLateTime) Danger.copy(alpha = 0.2f) else StatusHadir.copy(alpha = 0.2f)
                        val badgeColor = if (isBypassMode) Color(0xFFF59E0B) else if (isLateTime) Danger else StatusHadir
                        
                        Box(
                            modifier = Modifier
                                .background(badgeBg, RoundedCornerShape(8.dp))
                                .border(1.5.dp, badgeColor, RoundedCornerShape(8.dp))
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                if (isBypassMode) "BYPASS" else if (isLateTime) "TERLAMBAT +${lateMinutesDiff}m" else "TEPAT WAKTU",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = badgeColor
                            )
                        }

                        IconButton(
                            onClick = { scope.launch { fetchStats() } }
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Refresh Counter",
                                tint = Primary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }
                }

                // 2. REALTIME COUNTER ABSENSI GRID & PROGRESS BAR
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(14.dp))
                        .border(1.dp, Border, RoundedCornerShape(14.dp))
                        .padding(14.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            "📊 REALTIME COUNTER ABSENSI",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = TextSecondary
                        )
                        if (!lastScannedName.isNullOrEmpty()) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                                modifier = Modifier
                                    .background(Primary.copy(alpha = 0.2f), RoundedCornerShape(20.dp))
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Primary, modifier = Modifier.size(14.dp))
                                Text(
                                    "Terakhir: $lastScannedName",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Primary
                                )
                            }
                        }
                    }

                    // Grid 4 Counter Cards (HADIR, PULANG, BELUM, TARGET)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        // HADIR (MASUK)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(StatusHadir.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                                .border(1.dp, StatusHadir.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("HADIR", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = StatusHadir)
                                Text("${gerbangStats.resolvedMasuk}", fontSize = 22.sp, fontWeight = FontWeight.Black, color = StatusHadir)
                            }
                        }

                        // PULANG (KELUAR)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(Danger.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                                .border(1.dp, Danger.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("PULANG", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Danger)
                                Text("${gerbangStats.keluar}", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Danger)
                            }
                        }

                        // BELUM TAP
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(Color(0xFFF59E0B).copy(alpha = 0.15f), RoundedCornerShape(10.dp))
                                .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.4f), RoundedCornerShape(10.dp))
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("BELUM", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFFF59E0B))
                                Text("${gerbangStats.resolvedBelum}", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color(0xFFF59E0B))
                            }
                        }

                        // TOTAL TARGET
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .background(SurfaceVariantDark, RoundedCornerShape(10.dp))
                                .border(1.dp, Border, RoundedCornerShape(10.dp))
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("TARGET", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                                Text("${gerbangStats.resolvedTotalTarget}", fontSize = 22.sp, fontWeight = FontWeight.Black, color = TextPrimary)
                            }
                        }
                    }

                    // Rasio Kedatangan Animated Progress Bar (%)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("RASIO KEDATANGAN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                            Text("${gerbangStats.progressPercent}%", fontSize = 10.sp, fontWeight = FontWeight.Black, color = StatusHadir)
                        }
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(SurfaceVariantDark)
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(fraction = (gerbangStats.progressPercent.toFloat() / 100f).coerceIn(0f, 1f))
                                    .height(8.dp)
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(StatusHadir)
                            )
                        }
                    }
                }

                // 3. SAKELAR ARAH GERBANG (Datang vs Pulang)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("GERBANG_DATANG" to "🟢 Tap Datang (Masuk)", "GERBANG_PULANG" to "🔴 Tap Pulang").forEach { (arah, label) ->
                        val isSelected = scannerArah == arah
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(10.dp))
                                .clickable { scannerArah = arah }
                                .background(if (isSelected) SurfaceVariantDark else SurfaceDark)
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) (if (arah == "GERBANG_DATANG") StatusHadir else Danger) else Border,
                                    shape = RoundedCornerShape(10.dp)
                                )
                                .padding(vertical = 12.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                label,
                                color = if (isSelected) TextPrimary else TextSecondary,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }

                // 4. MODE BYPASS TERLAMBAT SWITCH CARD
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (isBypassMode) Color(0xFFF59E0B).copy(alpha = 0.15f) else SurfaceDark,
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = if (isBypassMode) 1.5.dp else 1.dp,
                            color = if (isBypassMode) Color(0xFFF59E0B) else Border,
                            shape = RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (isBypassMode) Color(0xFFF59E0B) else TextSecondary,
                            modifier = Modifier.size(20.dp)
                        )
                        Column {
                            Text(
                                "Mode Bypass Terlambat",
                                fontWeight = FontWeight.Bold,
                                fontSize = 12.sp,
                                color = if (isBypassMode) Color(0xFFF59E0B) else TextPrimary
                            )
                            Text(
                                if (isBypassMode) "Siswa terlambat dipaksa status HADIR" else "Status otomatis berdasarkan jam masuk",
                                fontSize = 10.sp,
                                color = TextSecondary
                            )
                        }
                    }
                    Switch(
                        checked = isBypassMode,
                        onCheckedChange = { isBypassMode = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = Color.White,
                            checkedTrackColor = Color(0xFFF59E0B)
                        )
                    )
                }

                // 5. HIGH-SPEED TERMINAL INPUT CARD (WhatsApp-like Native EditText)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(SurfaceDark, RoundedCornerShape(14.dp))
                        .border(1.dp, Border, RoundedCornerShape(14.dp))
                        .padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(if (isBypassMode) Color(0xFFF59E0B).copy(alpha = 0.15f) else Primary.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Default.Contactless,
                                contentDescription = null,
                                tint = if (isBypassMode) Color(0xFFF59E0B) else Primary,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Column {
                            Text(
                                if (isBypassMode) "Scan Kartu / Input ID (Bypass)" else "Tempelkan Kartu RFID / QR Code",
                                style = MaterialTheme.typography.titleSmall,
                                color = TextPrimary,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                "Standby menerima USB QR Reader, RFID, NISN, atau NIP",
                                style = MaterialTheme.typography.bodySmall,
                                color = TextSecondary,
                                fontSize = 10.sp
                            )
                        }
                    }

                    // High-Speed Native EditText (0ms typing speed seperti WA)
                    AndroidView(
                        factory = { ctx ->
                            EditText(ctx).apply {
                                hint = if (isBypassMode) "Scan Kartu / Input ID Bypass..." else "Standby masukan RFID / QR Code..."
                                setHintTextColor(android.graphics.Color.parseColor("#64748B"))
                                setTextColor(android.graphics.Color.parseColor("#0F172A"))
                                textSize = 14f
                                isSingleLine = true
                                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                                imeOptions = EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
                                setBackgroundResource(android.R.color.transparent)
                                setPadding(28, 20, 28, 20)
                                requestFocus()

                                setOnEditorActionListener { v, _, _ ->
                                    val input = v.text.toString().trim()
                                    if (input.isNotEmpty()) {
                                        v.setText("")
                                        scope.launch { processTap(input) }
                                        true
                                    } else false
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(SurfaceVariantDark, RoundedCornerShape(10.dp))
                            .border(1.dp, if (isBypassMode) Color(0xFFF59E0B) else Primary, RoundedCornerShape(10.dp))
                    )

                    // TOAST BANNER NOTIFIKASI DI BAWAH FIELD RFID (Slide Down Animation)
                    AnimatedVisibility(
                        visible = toastState != null,
                        enter = fadeIn() + slideInVertically(initialOffsetY = { -it }),
                        exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 4.dp)
                    ) {
                        toastState?.let { toast ->
                            val bgColor = when (toast.type) {
                                "SUCCESS" -> Color(0xFF059669)
                                "WARNING" -> Color(0xFFD97706)
                                else -> Color(0xFFDC2626)
                            }
                            val icon = when (toast.type) {
                                "SUCCESS" -> Icons.Default.CheckCircle
                                "WARNING" -> Icons.Default.Warning
                                else -> Icons.Default.Error
                            }
                            Card(
                                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                                shape = RoundedCornerShape(12.dp),
                                elevation = CardDefaults.cardElevation(2.dp),
                                border = BorderStroke(1.dp, Border),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Icon(icon, contentDescription = null, tint = bgColor, modifier = Modifier.size(24.dp))
                                    Text(
                                        toast.message,
                                        color = bgColor,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }
                        }
                    }
                }

                // 6. RIWAYAT TAP TERAKHIR MENUMPUK KE BAWAH (Stacking Scan Cards List)
                if (recentScans.isNotEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Icon(Icons.Default.History, contentDescription = null, tint = Primary, modifier = Modifier.size(18.dp))
                                Text(
                                    "RIWAYAT TAP TERAKHIR (${recentScans.size})",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimary
                                )
                            }
                            Text(
                                "Bersihkan",
                                fontSize = 11.sp,
                                color = Danger,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier
                                    .clickable { recentScans = emptyList() }
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }

                        recentScans.forEach { scan ->
                            val cardBg = when (scan.type) {
                                "BYPASS" -> Color(0xFFF59E0B).copy(alpha = 0.12f)
                                "WARNING" -> Color(0xFFF59E0B).copy(alpha = 0.12f)
                                "SUCCESS" -> StatusHadir.copy(alpha = 0.12f)
                                else -> Danger.copy(alpha = 0.12f)
                            }
                            val borderColor = when (scan.type) {
                                "BYPASS", "WARNING" -> Color(0xFFF59E0B)
                                "SUCCESS" -> StatusHadir
                                else -> Danger
                            }

                            Card(
                                modifier = Modifier
                                    .fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                                shape = RoundedCornerShape(12.dp),
                                elevation = CardDefaults.cardElevation(2.dp),
                                border = BorderStroke(1.dp, Border)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(borderColor.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = if (scan.type == "SUCCESS" || scan.type == "BYPASS") Icons.Default.CheckCircle else Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = borderColor,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                scan.name,
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = TextPrimary,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                "[ ${scan.statusBadge} ]",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = borderColor,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp
                                            )
                                        }
                                        if (!scan.kelas.isNullOrEmpty() && scan.kelas != "-") {
                                            Text(
                                                "Kelas: ${scan.kelas}",
                                                style = MaterialTheme.typography.bodySmall,
                                                color = Primary,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp
                                            )
                                        }
                                        Text(
                                            "${scan.identifier} • ${scan.timestamp}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = TextSecondary,
                                            fontSize = 10.sp
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Trigger haptic vibration pada perangkat */
private fun vibrateDevice(context: Context) {
    try {
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
    } catch (e: Exception) {}
}
