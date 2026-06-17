package com.absenta.app.ui.features.sarpras

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.*
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SarprasScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("INVENTARIS", "PINJAMAN", "MAINTENANCE")

    // Stats state
    var stats by remember { mutableStateOf(SarprasStats(0, 0, 0)) }

    // Lists state
    var assetsList by remember { mutableStateOf<List<SarprasAsset>>(emptyList()) }
    var loansList by remember { mutableStateOf<List<SarprasLoan>>(emptyList()) }
    var repairsList by remember { mutableStateOf<List<SarprasRepair>>(emptyList()) }

    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    fun loadStats() {
        scope.launch {
            try {
                val svc = ApiClient.getClient(context).create(SarprasService::class.java)
                val resp = svc.getStats()
                if (resp.isSuccessful && resp.body()?.success == true) {
                    stats = resp.body()!!.data
                } else {
                    stats = SarprasStats(0, 0, 0)
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "SarprasStats error", e)
                stats = SarprasStats(0, 0, 0)
            }
        }
    }

    fun loadAssets() {
        scope.launch {
            isLoading = true
            try {
                val svc = ApiClient.getClient(context).create(SarprasService::class.java)
                val resp = svc.getAssets(page = 1, limit = 100, search = searchQuery.ifEmpty { null })
                if (resp.isSuccessful && resp.body()?.success == true) {
                    assetsList = resp.body()?.data?.list ?: resp.body()?.list ?: emptyList()
                } else {
                    assetsList = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "SarprasAssets error", e)
                assetsList = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    fun loadLoans() {
        scope.launch {
            isLoading = true
            try {
                val svc = ApiClient.getClient(context).create(SarprasService::class.java)
                val resp = svc.getLoans(page = 1, limit = 100)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    loansList = resp.body()?.data?.list ?: resp.body()?.list ?: emptyList()
                } else {
                    loansList = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "SarprasLoans error", e)
                loansList = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    fun loadRepairs() {
        scope.launch {
            isLoading = true
            try {
                val svc = ApiClient.getClient(context).create(SarprasService::class.java)
                val resp = svc.getRepairs(page = 1, limit = 100)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    repairsList = resp.body()?.data?.list ?: resp.body()?.list ?: emptyList()
                } else {
                    repairsList = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "SarprasRepairs error", e)
                repairsList = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadStats()
    }

    LaunchedEffect(selectedTab, searchQuery) {
        when (selectedTab) {
            0 -> loadAssets()
            1 -> loadLoans()
            2 -> loadRepairs()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sarana & Prasarana", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Color(0xFFF8FAFC))) {
            // Stats Panel
            SarprasStatsRow(stats)

            // Tab Navigation
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                tabs.forEachIndexed { i, label ->
                    Tab(
                        selected = selectedTab == i,
                        onClick = { selectedTab = i; searchQuery = "" },
                        text = {
                            Text(label, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                                color = if (selectedTab == i) Color(0xFF1E3C72) else Color(0xFF94A3B8))
                        }
                    )
                }
            }

            // Search Bar for Inventaris
            if (selectedTab == 0) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    placeholder = { Text("Cari barang...", color = Color(0xFF94A3B8)) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search", tint = Color(0xFF64748B)) },
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    )
                )
            } else {
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                Box(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    when (selectedTab) {
                        0 -> InventarisList(assetsList)
                        1 -> LoansList(loansList)
                        2 -> RepairsList(repairsList)
                    }
                }
            }
        }
    }
}

@Composable
fun SarprasStatsRow(stats: SarprasStats) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF1E3C72))
            .padding(start = 16.dp, end = 16.dp, bottom = 16.dp, top = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        StatBox(title = "Total Aset", value = stats.totalAssets.toString(), Color(0xFF3B82F6), modifier = Modifier.weight(1f))
        StatBox(title = "Dipinjam", value = stats.totalLoaned.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
        StatBox(title = "Rusak", value = stats.totalBroken.toString(), Color(0xFFEF4444), modifier = Modifier.weight(1f))
    }
}

@Composable
fun StatBox(title: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.12f))
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(modifier = Modifier.size(6.dp).background(accentColor, CircleShape))
                Text(title, fontSize = 10.sp, color = Color.White.copy(alpha = 0.7f), fontWeight = FontWeight.Medium)
            }
        }
    }
}

@Composable
fun InventarisList(assets: List<SarprasAsset>) {
    if (assets.isEmpty()) {
        EmptyStateView("Belum ada aset inventaris terdaftar")
    } else {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(assets, key = { it.id }) { asset ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(42.dp)
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(Icons.Default.Build, contentDescription = null, tint = Color(0xFF475569), modifier = Modifier.size(20.dp))
                        }

                        Column(modifier = Modifier.weight(1f)) {
                            Text(asset.nama, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                            Text(asset.kode ?: "Tanpa Kode", fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.padding(top = 1.dp))
                            Row(
                                modifier = Modifier.padding(top = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Jml: ${asset.jumlah}", fontSize = 11.sp, color = Color(0xFF64748B), fontWeight = FontWeight.SemiBold)
                                Text("•", fontSize = 11.sp, color = Color(0xFFCBD5E1))
                                Text(asset.Location?.nama ?: "Lokasi -", fontSize = 11.sp, color = Color(0xFF94A3B8))
                            }
                        }

                        Column(horizontalAlignment = Alignment.End) {
                            AssetKondisiBadge(asset.kondisi)
                            if (asset.is_loanable) {
                                Box(
                                    modifier = Modifier
                                        .padding(top = 6.dp)
                                        .background(Color(0xFFE0F2FE), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text("Bisa Pinjam", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0369A1))
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun LoansList(loans: List<SarprasLoan>) {
    if (loans.isEmpty()) {
        EmptyStateView("Belum ada riwayat peminjaman aset")
    } else {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(loans, key = { it.id }) { loan ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFEEF2F6), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.AccountCircle, contentDescription = null, tint = Color(0xFF1E3C72), modifier = Modifier.size(22.dp))
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(loan.Asset?.nama ?: "Aset Tidak Diketahui", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                                Text("Peminjam: ${loan.Peminjam?.full_name ?: "Staf"}", fontSize = 12.sp, color = Color(0xFF64748B))
                            }

                            LoanStatusBadge(loan.status)
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Tgl Pinjam", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(formatDisplayDateOnly(loan.tanggal_pinjam), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF475569))
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("Tgl Pengembalian", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                val tglReal = loan.tanggal_kembali_real
                                val tglPlan = loan.tanggal_kembali_plan
                                val displayDate = when {
                                    !tglReal.isNullOrEmpty() -> formatDisplayDateOnly(tglReal)
                                    !tglPlan.isNullOrEmpty() -> formatDisplayDateOnly(tglPlan)
                                    else -> "-"
                                }
                                val displayColor = if (!tglReal.isNullOrEmpty()) Color(0xFF10B981) else Color(0xFF475569)
                                Text(displayDate, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = displayColor)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun RepairsList(repairs: List<SarprasRepair>) {
    if (repairs.isEmpty()) {
        EmptyStateView("Belum ada log maintenance / perbaikan")
    } else {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(repairs, key = { it.id }) { repair ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(14.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFFFFAF0), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Refresh, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(20.dp))
                            }

                            Column(modifier = Modifier.weight(1f)) {
                                Text(repair.Asset?.nama ?: "Aset", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                                Text("Teknisi: ${repair.teknisi ?: "Umum/Sekolah"}", fontSize = 12.sp, color = Color(0xFF64748B))
                            }

                            RepairStatusBadge(repair.status)
                        }

                        if (!repair.deskripsi.isNullOrEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 10.dp)
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(8.dp))
                                    .padding(10.dp)
                            ) {
                                Text(repair.deskripsi, fontSize = 12.sp, color = Color(0xFF475569))
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        HorizontalDivider(color = Color(0xFFF1F5F9))
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("Mulai Perbaikan", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(formatDisplayDateOnly(repair.tanggal_mulai), fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF475569))
                            }

                            Column(horizontalAlignment = Alignment.End) {
                                Text("Biaya", fontSize = 10.sp, color = Color(0xFF94A3B8))
                                Text(
                                    text = formatIndonesianRupiah(repair.biaya ?: 0.0),
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFFEF4444)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun EmptyStateView(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, fontSize = 13.sp, color = Color(0xFF94A3B8))
        }
    }
}

@Composable
fun AssetKondisiBadge(kondisi: String) {
    val (label, bg, fg) = when (kondisi.uppercase()) {
        "BAIK" -> Triple("Baik", Color(0xFFD1FAE5), Color(0xFF047857))
        "RUSAK" -> Triple("Rusak", Color(0xFFFEE2E2), Color(0xFFB91C1C))
        "PERBAIKAN" -> Triple("Perbaikan", Color(0xFFFEF3C7), Color(0xFFD97706))
        "HILANG" -> Triple("Hilang", Color(0xFFF1F5F9), Color(0xFF475569))
        else -> Triple(kondisi, Color(0xFFF1F5F9), Color(0xFF475569))
    }

    Box(
        modifier = Modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun LoanStatusBadge(status: String) {
    val (label, bg, fg) = when (status.uppercase()) {
        "PENDING" -> Triple("Menunggu", Color(0xFFFEF3C7), Color(0xFFD97706))
        "APPROVED" -> Triple("Disetujui", Color(0xFFE0F2FE), Color(0xFF0369A1))
        "ACTIVE" -> Triple("Dipinjam", Color(0xFFD1FAE5), Color(0xFF047857))
        "RETURNED" -> Triple("Kembali", Color(0xFFF1F5F9), Color(0xFF475569))
        "REJECTED" -> Triple("Ditolak", Color(0xFFFEE2E2), Color(0xFFB91C1C))
        "OVERDUE" -> Triple("Terlambat", Color(0xFFFFE4E6), Color(0xFFE11D48))
        else -> Triple(status, Color(0xFFF1F5F9), Color(0xFF475569))
    }

    Box(
        modifier = Modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun RepairStatusBadge(status: String) {
    val (label, bg, fg) = when (status.uppercase()) {
        "PROSES" -> Triple("Proses", Color(0xFFFEF3C7), Color(0xFFD97706))
        "SELESAI" -> Triple("Selesai", Color(0xFFD1FAE5), Color(0xFF047857))
        "BATAL" -> Triple("Batal", Color(0xFFFEE2E2), Color(0xFFB91C1C))
        else -> Triple(status, Color(0xFFF1F5F9), Color(0xFF475569))
    }

    Box(
        modifier = Modifier
            .background(bg, RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

fun formatDisplayDateOnly(dateStr: String): String = try {
    val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val d = sdf.parse(dateStr.take(10)) ?: Date()
    SimpleDateFormat("d MMM yyyy", Locale("id", "ID")).format(d)
} catch (e: Exception) { dateStr }

fun formatIndonesianRupiah(amount: Double): String {
    val format = NumberFormat.getCurrencyInstance(Locale("id", "ID"))
    format.maximumFractionDigits = 0
    return format.format(amount)
}
