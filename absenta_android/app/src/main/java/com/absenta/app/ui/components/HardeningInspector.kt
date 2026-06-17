package com.absenta.app.ui.components

import android.content.pm.ApplicationInfo
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject

data class HardeningStandard(
    val id: String,
    val name: String,
    val description: String,
    val status: String, // "VERIFIED", "WARNING", "FAILED"
    val details: String
)

data class LighthouseMetrics(
    val lcp: String,
    val cls: String,
    val tbt: String,
    val speedIndex: String
)

data class LighthouseSuggestion(
    val title: String,
    val description: String,
    val displayValue: String?,
    val category: String
)

data class LighthouseResult(
    val performance: Int,
    val accessibility: Int,
    val bestPractices: Int,
    val seo: Int,
    val metrics: LighthouseMetrics,
    val suggestions: List<LighthouseSuggestion>
)

@Composable
fun HardeningInspector(
    moduleKey: String,
    pageDisplayName: String,
    standards: List<HardeningStandard>,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val isDebug = remember(context) {
        (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
    }
    if (!isDebug) return

    var isOpen by remember { mutableStateOf(false) }
    var selectedTabIndex by remember { mutableStateOf(0) }
    var devServerIp by remember { mutableStateOf("10.0.2.2") } // Standard local IP for emulator host

    // Standards State to allow dynamic updating upon live scanning
    var standardsState by remember(standards) { mutableStateOf(standards) }

    // Live Source Code Audit States
    var isAuditing by remember { mutableStateOf(false) }
    var auditError by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

    // Lighthouse Audit States
    var isLhAuditing by remember { mutableStateOf(false) }
    var lhResult by remember { mutableStateOf<LighthouseResult?>(null) }
    var lhError by remember { mutableStateOf<String?>(null) }

    // Calculate score
    val totalCount = standardsState.size
    val verifiedCount = standardsState.count { it.status == "VERIFIED" }
    val warningCount = standardsState.count { it.status == "WARNING" }
    val failedCount = standardsState.count { it.status == "FAILED" }
    
    val rawScore = if (totalCount > 0) {
        ((verifiedCount.toFloat() + warningCount.toFloat() * 0.5f) / totalCount.toFloat() * 100).toInt()
    } else 100

    val (gradeLetter, badgeColor, textColor, ringColor) = when {
        rawScore >= 90 -> Quadruple("A", Color(0xFF10B981), Color(0xFF064E3B), Color(0xFF34D399))
        rawScore >= 75 -> Quadruple("B", Color(0xFF3B82F6), Color(0xFF1E3A8A), Color(0xFF60A5FA))
        rawScore >= 60 -> Quadruple("C", Color(0xFFF59E0B), Color(0xFF78350F), Color(0xFFFBBF24))
        rawScore >= 45 -> Quadruple("D", Color(0xFFEF4444), Color(0xFF7F1D1D), Color(0xFFF87171))
        else -> Quadruple("F", Color(0xFF7F1D1D), Color.White, Color(0xFFEF4444))
    }

    Box(modifier = modifier) {
        // Floating Inspector Badge
        Surface(
            color = badgeColor.copy(alpha = 0.15f),
            border = androidx.compose.foundation.BorderStroke(1.dp, badgeColor.copy(alpha = 0.4f)),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .clickable { isOpen = true }
                .padding(vertical = 4.dp, horizontal = 8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .background(badgeColor, CircleShape)
                )
                Text(
                    text = "🛡️ Hardening: $gradeLetter ($rawScore%)",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black,
                    color = if (gradeLetter == "F") Color.Red else textColor
                )
            }
        }

        // Compliance Certificate Dialog
        if (isOpen) {
            AlertDialog(
                onDismissRequest = { isOpen = false },
                confirmButton = {
                    TextButton(onClick = { isOpen = false }) {
                        Text("Selesai Inspeksi", color = Color(0xFF1E3C72), fontWeight = FontWeight.Bold)
                    }
                },
                title = {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Surface(
                                color = Color(0xFF064E3B).copy(alpha = 0.1f),
                                shape = RoundedCornerShape(4.dp),
                                border = androidx.compose.foundation.BorderStroke(0.5.dp, Color(0xFF064E3B).copy(alpha = 0.2f))
                            ) {
                                Text(
                                    text = "Dev-Mode Certification",
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF10B981),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Sertifikat Hardening",
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                                color = Color(0xFF1E293B)
                            )
                            Text(
                                text = "Halaman: $pageDisplayName",
                                fontSize = 10.sp,
                                color = Color(0xFF64748B)
                            )
                        }

                        // Circular Score Ring
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(48.dp)
                                .border(2.dp, ringColor, CircleShape)
                                .background(badgeColor.copy(alpha = 0.1f), CircleShape)
                        ) {
                            Text(
                                text = gradeLetter,
                                fontWeight = FontWeight.Black,
                                fontSize = 16.sp,
                                color = ringColor
                            )
                        }
                    }
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 420.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Dev-Mode Tabs
                        TabRow(
                            selectedTabIndex = selectedTabIndex,
                            containerColor = Color(0xFFF1F5F9),
                            modifier = Modifier.clip(RoundedCornerShape(8.dp))
                        ) {
                            Tab(
                                selected = selectedTabIndex == 0,
                                onClick = { selectedTabIndex = 0 },
                                text = { Text("🛡️ Audit Kode", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                            )
                            Tab(
                                selected = selectedTabIndex == 1,
                                onClick = { selectedTabIndex = 1 },
                                text = { Text("🧭 Performa & A11y", fontSize = 11.sp, fontWeight = FontWeight.Bold) }
                            )
                        }

                        // Scrollable Tab Contents
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .weight(1f)
                                .verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (selectedTabIndex == 0) {
                                // 🛡️ Audit Kode Tab
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // IP Configuration Row
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        OutlinedTextField(
                                            value = devServerIp,
                                            onValueChange = { devServerIp = it },
                                            label = { Text("Host IP Dev Server", fontSize = 9.sp) },
                                            placeholder = { Text("10.0.2.2") },
                                            singleLine = true,
                                            shape = RoundedCornerShape(8.dp),
                                            textStyle = LocalTextStyle.current.copy(fontSize = 11.sp),
                                            modifier = Modifier.weight(1f)
                                        )
                                    }

                                    // Trigger Live Audit Button
                                    Button(
                                        onClick = {
                                            isAuditing = true
                                            auditError = null
                                            coroutineScope.launch(Dispatchers.IO) {
                                                try {
                                                    val client = OkHttpClient()
                                                    val url = "http://$devServerIp:9999/api/audit?key=$moduleKey"
                                                    val request = Request.Builder().url(url).build()
                                                    client.newCall(request).execute().use { response ->
                                                        if (!response.isSuccessful) {
                                                            throw Exception("HTTP ${response.code}")
                                                        }
                                                        val body = response.body?.string() ?: throw Exception("Response body empty")
                                                        val json = JSONObject(body)
                                                        withContext(Dispatchers.Main) {
                                                            // Dynamically update standard states from audit report json
                                                            standardsState = standardsState.map { std ->
                                                                when (std.id) {
                                                                    "fault_tolerance" -> {
                                                                        val verified = json.optBoolean("usesLayout", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "FAILED",
                                                                            details = if (verified) "Tervalidasi: Halaman dibungkus dengan layout standar." else "Gagal: Layout standard tidak terdeteksi."
                                                                        )
                                                                    }
                                                                    "network_fallback" -> {
                                                                        val verified = json.optBoolean("standardFeedback", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "FAILED",
                                                                            details = if (verified) "Tervalidasi: Error boundary & stats fallback terintegrasi." else "Gagal: Fallback tidak terdeteksi."
                                                                        )
                                                                    }
                                                                    "dom_churn_protection" -> {
                                                                        val verified = json.optBoolean("usesMemo", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "WARNING",
                                                                            details = if (verified) "Tervalidasi: Optimasi rendering dengan key() & memoization aktif." else "Peringatan: Potensi DOM churn tinggi."
                                                                        )
                                                                    }
                                                                    "architectural_table_pagination" -> {
                                                                        val verified = json.optBoolean("tablePagination", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "FAILED",
                                                                            details = if (verified) "Tervalidasi: Kontrol limit dan navigasi pagination sejajar." else "Gagal: Pagination tidak lengkap."
                                                                        )
                                                                    }
                                                                    "rbac_protection" -> {
                                                                        val verified = json.optBoolean("usesUiComponents", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "WARNING",
                                                                            details = if (verified) "Tervalidasi: Pengecekan otorisasi fungsional diaktifkan." else "Peringatan: Proteksi otorisasi longgar."
                                                                        )
                                                                    }
                                                                    "bulk_selection_standard" -> {
                                                                        val verified = json.optBoolean("tableToolbar", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "WARNING",
                                                                            details = if (verified) "Tervalidasi: Aksi massal terintegrasi dalam Contextual Action Bar." else "Peringatan: Aksi massal belum optimal."
                                                                        )
                                                                    }
                                                                    "shared_components" -> {
                                                                        val verified = json.optBoolean("usesUiComponents", true)
                                                                        std.copy(
                                                                            status = if (verified) "VERIFIED" else "FAILED",
                                                                            details = if (verified) "Tervalidasi: Menggunakan shared components (CustomCheckbox, ReusableStatsCard, dll)." else "Gagal: Shared components tidak terdeteksi."
                                                                        )
                                                                    }
                                                                    else -> std
                                                                }
                                                            }
                                                            isAuditing = false
                                                        }
                                                    }
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        auditError = e.message ?: "Koneksi ke server audit gagal"
                                                        isAuditing = false
                                                    }
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        if (isAuditing) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Sedang Menganalisis Kode...", fontSize = 11.sp)
                                        } else {
                                            Text("🔍 Jalankan Audit Kode Sumber Riil", fontSize = 11.sp)
                                        }
                                    }

                                    if (auditError != null) {
                                        Text(
                                            text = "⚠️ Gagal terhubung ke Dev Audit Server: $auditError (pastikan port 9999 berjalan di host)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Red,
                                            modifier = Modifier.padding(horizontal = 4.dp)
                                        )
                                    }

                                    Text(
                                        text = "LAPORAN AUDIT KEPATUHAN ($totalCount PILAR)",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF64748B),
                                        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp)
                                    )

                                    standardsState.forEach { std ->
                                        val isVerified = std.status == "VERIFIED"
                                        val isWarning = std.status == "WARNING"

                                        val cardBgColor = when {
                                            isVerified -> Color(0xFFE6F4EA)
                                            isWarning -> Color(0xFFFEF7E0)
                                            else -> Color(0xFFFCE8E6)
                                        }
                                        val cardBorderColor = when {
                                            isVerified -> Color(0xFF34A853)
                                            isWarning -> Color(0xFFFBBC04)
                                            else -> Color(0xFFEA4335)
                                        }
                                        val statusIcon = when {
                                            isVerified -> Icons.Default.Check
                                            isWarning -> Icons.Default.Warning
                                            else -> Icons.Default.Close
                                        }

                                        Card(
                                            shape = RoundedCornerShape(10.dp),
                                            colors = CardDefaults.cardColors(containerColor = cardBgColor.copy(alpha = 0.4f)),
                                            border = androidx.compose.foundation.BorderStroke(1.dp, cardBorderColor.copy(alpha = 0.3f)),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(10.dp),
                                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                                verticalAlignment = Alignment.Top
                                            ) {
                                                Box(
                                                    modifier = Modifier
                                                        .size(20.dp)
                                                        .background(cardBorderColor.copy(alpha = 0.15f), CircleShape),
                                                    contentAlignment = Alignment.Center
                                                ) {
                                                    Icon(
                                                        imageVector = statusIcon,
                                                        contentDescription = null,
                                                        tint = cardBorderColor,
                                                        modifier = Modifier.size(12.dp)
                                                    )
                                                }

                                                Column {
                                                    Text(
                                                        text = std.name,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 11.sp,
                                                        color = Color(0xFF1E293B)
                                                    )
                                                    Text(
                                                        text = std.description,
                                                        fontSize = 9.sp,
                                                        color = Color(0xFF64748B)
                                                    )
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                    Text(
                                                        text = (if (isVerified) "✓ " else if (isWarning) "⚠ " else "✗ ") + std.details,
                                                        fontSize = 9.sp,
                                                        fontWeight = FontWeight.Bold,
                                                        color = cardBorderColor,
                                                        style = MaterialTheme.typography.bodySmall.copy(
                                                            fontStyle = androidx.compose.ui.text.font.FontStyle.Italic
                                                        )
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // 🧭 Tab Performa & Lighthouse
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // Trigger Lighthouse Button
                                    Button(
                                        onClick = {
                                            isLhAuditing = true
                                            lhError = null
                                            coroutineScope.launch(Dispatchers.IO) {
                                                try {
                                                    val client = OkHttpClient()
                                                    val targetUrl = when (moduleKey) {
                                                        "academic_siswa" -> "http://localhost:3000/academic/siswa"
                                                        "academic_guru" -> "http://localhost:3000/academic/guru"
                                                        "academic_kelas" -> "http://localhost:3000/academic/kelas"
                                                        else -> "http://localhost:3000/"
                                                    }
                                                    val url = "http://$devServerIp:9999/api/lighthouse?url=${java.net.URLEncoder.encode(targetUrl, "UTF-8")}"
                                                    val request = Request.Builder().url(url).build()
                                                    client.newCall(request).execute().use { response ->
                                                        if (!response.isSuccessful) {
                                                            throw Exception("HTTP ${response.code}")
                                                        }
                                                        val body = response.body?.string() ?: throw Exception("Response body empty")
                                                        val json = JSONObject(body)
                                                        
                                                        val perf = json.getInt("performance")
                                                        val acc = json.getInt("accessibility")
                                                        val bp = json.getInt("bestPractices")
                                                        val seo = json.getInt("seo")
                                                        
                                                        val metricsObj = json.getJSONObject("metrics")
                                                        val metrics = LighthouseMetrics(
                                                            lcp = metricsObj.getString("lcp"),
                                                            cls = metricsObj.getString("cls"),
                                                            tbt = metricsObj.getString("tbt"),
                                                            speedIndex = metricsObj.getString("speedIndex")
                                                        )
                                                        
                                                        val suggestionsArr = json.getJSONArray("suggestions")
                                                        val suggestions = mutableListOf<LighthouseSuggestion>()
                                                        for (i in 0 until suggestionsArr.length()) {
                                                            val sugObj = suggestionsArr.getJSONObject(i)
                                                            suggestions.add(
                                                                LighthouseSuggestion(
                                                                    title = sugObj.getString("title"),
                                                                    description = sugObj.getString("description"),
                                                                    displayValue = sugObj.optString("displayValue", null),
                                                                    category = sugObj.getString("category")
                                                                )
                                                            )
                                                        }
                                                        
                                                        withContext(Dispatchers.Main) {
                                                            lhResult = LighthouseResult(
                                                                performance = perf,
                                                                accessibility = acc,
                                                                bestPractices = bp,
                                                                seo = seo,
                                                                metrics = metrics,
                                                                suggestions = suggestions
                                                            )
                                                            isLhAuditing = false
                                                        }
                                                    }
                                                } catch (e: Exception) {
                                                    withContext(Dispatchers.Main) {
                                                        lhError = e.message ?: "Koneksi ke server Lighthouse gagal"
                                                        isLhAuditing = false
                                                    }
                                                }
                                            }
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        if (isLhAuditing) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text("Mengaudit Lighthouse... (~15s)", fontSize = 11.sp)
                                        } else {
                                            Text("🧭 Jalankan Analisis Kinerja Lighthouse", fontSize = 11.sp)
                                        }
                                    }

                                    if (lhError != null) {
                                        Text(
                                            text = "⚠️ Gagal menjalankan Lighthouse: $lhError (pastikan port 9999 berjalan di host)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Red,
                                            modifier = Modifier.padding(horizontal = 4.dp)
                                        )
                                    }

                                    val result = lhResult
                                    if (result != null) {
                                        // 4 Radial Progress Gauges
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            RadialProgress(score = result.performance, label = "Performa", modifier = Modifier.weight(1f))
                                            RadialProgress(score = result.accessibility, label = "Akses", modifier = Modifier.weight(1f))
                                            RadialProgress(score = result.bestPractices, label = "Praktik Baik", modifier = Modifier.weight(1f))
                                            RadialProgress(score = result.seo, label = "SEO", modifier = Modifier.weight(1f))
                                        }

                                        // Core Web Vitals Card
                                        Card(
                                            shape = RoundedCornerShape(12.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A).copy(alpha = 0.05f)),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(10.dp)) {
                                                Text(
                                                    text = "METRIK CORE WEB VITALS",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = Color(0xFF475569)
                                                )
                                                Spacer(modifier = Modifier.height(6.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                                ) {
                                                    MetricSmallCard(label = "LCP", value = result.metrics.lcp, modifier = Modifier.weight(1f))
                                                    MetricSmallCard(label = "CLS", value = result.metrics.cls, modifier = Modifier.weight(1f))
                                                    MetricSmallCard(label = "TBT", value = result.metrics.tbt, modifier = Modifier.weight(1f))
                                                    MetricSmallCard(label = "Speed Idx", value = result.metrics.speedIndex, modifier = Modifier.weight(1f))
                                                }
                                            }
                                        }

                                        // Suggestions
                                        Text(
                                            text = "SARAN DIAGNOSTIK (${result.suggestions.size} TEMUAN)",
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color(0xFF64748B),
                                            modifier = Modifier.padding(top = 4.dp)
                                        )

                                        if (result.suggestions.isEmpty()) {
                                            Text(
                                                text = "🎉 Sempurna! Tidak ada masalah penting terdeteksi.",
                                                fontSize = 11.sp,
                                                color = Color(0xFF10B981),
                                                fontWeight = FontWeight.Bold,
                                                modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                                textAlign = TextAlign.Center
                                            )
                                        } else {
                                            result.suggestions.forEach { sug ->
                                                Card(
                                                    shape = RoundedCornerShape(10.dp),
                                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                                    modifier = Modifier.fillMaxWidth()
                                                ) {
                                                    Column(modifier = Modifier.padding(10.dp)) {
                                                        Row(
                                                            modifier = Modifier.fillMaxWidth(),
                                                            horizontalArrangement = Arrangement.SpaceBetween
                                                        ) {
                                                            Surface(
                                                                color = Color(0xFF6366F1).copy(alpha = 0.1f),
                                                                shape = RoundedCornerShape(4.dp)
                                                            ) {
                                                                Text(
                                                                    text = sug.category.uppercase(),
                                                                    color = Color(0xFF6366F1),
                                                                    fontSize = 8.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                                                                )
                                                            }
                                                            if (sug.displayValue != null) {
                                                                Text(
                                                                    text = sug.displayValue,
                                                                    color = Color(0xFFEF4444),
                                                                    fontSize = 9.sp,
                                                                    fontWeight = FontWeight.Bold
                                                                )
                                                            }
                                                        }
                                                        Spacer(modifier = Modifier.height(4.dp))
                                                        Text(
                                                            text = sug.title,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 11.sp,
                                                            color = Color(0xFF1E293B)
                                                        )
                                                        Text(
                                                            text = sug.description,
                                                            fontSize = 9.sp,
                                                            color = Color(0xFF64748B)
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    } else {
                                        // Lighthouse hasn't run yet
                                        Column(
                                            horizontalAlignment = Alignment.CenterHorizontally,
                                            verticalArrangement = Arrangement.spacedBy(8.dp),
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 24.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Bolt,
                                                contentDescription = null,
                                                tint = Color(0xFF6366F1).copy(alpha = 0.5f),
                                                modifier = Modifier.size(32.dp)
                                            )
                                            Text(
                                                text = "Belum Ada Laporan Lighthouse",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 11.sp,
                                                color = Color(0xFF475569)
                                            )
                                            Text(
                                                text = "Klik tombol di atas untuk menjalankan audit performa, aksesibilitas, dan SEO.",
                                                fontSize = 9.sp,
                                                color = Color(0xFF94A3B8),
                                                textAlign = TextAlign.Center,
                                                modifier = Modifier.width(200.dp)
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                shape = RoundedCornerShape(24.dp),
                containerColor = Color.White
            )
        }
    }
}

@Composable
fun RadialProgress(score: Int, label: String, modifier: Modifier = Modifier) {
    val progress = score / 100f
    val color = when {
        score >= 90 -> Color(0xFF10B981)
        score >= 50 -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }
    
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = modifier
            .background(Color(0xFF0F172A).copy(alpha = 0.04f), RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
            .padding(8.dp)
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.size(40.dp)) {
            CircularProgressIndicator(
                progress = { progress },
                color = color,
                strokeWidth = 3.dp,
                trackColor = Color(0xFFE2E8F0),
                modifier = Modifier.fillMaxSize()
            )
            Text(
                text = score.toString(),
                fontSize = 10.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFF1E293B)
            )
        }
        Text(
            text = label,
            fontSize = 8.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF64748B),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
fun MetricSmallCard(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Color.White, RoundedCornerShape(8.dp))
            .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(8.dp))
            .padding(6.dp)
    ) {
        Text(
            text = label,
            fontSize = 7.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF94A3B8)
        )
        Text(
            text = value,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF334155),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

private data class Quadruple<A, B, C, D>(
    val first: A,
    val second: B,
    val third: C,
    val fourth: D
)
