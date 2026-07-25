package com.absenta.app.ui.features.cooperative

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.CoopShuConfig
import com.absenta.app.data.api.CoopShuPeriod
import com.absenta.app.data.api.CoopShuAllocation
import com.absenta.app.data.api.CoopShuHistoryItem
import com.absenta.app.data.api.CoopShuPeriodCreateRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopSHUScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val coopService = remember { ApiClient.getClient(context).create(CooperativeService::class.java) }

    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val capabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())

    // Premium Gate Check
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Sisa Hasil Usaha (SHU)",
            description = "Fitur Sisa Hasil Usaha (SHU) koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Role Capabilities
    val isCoopStaff = remember(capabilities, userRole) {
        capabilities.contains("cooperative.reports.view.financial") ||
        capabilities.contains("cooperative.savings.deposit") ||
        userRole?.uppercase() == "ADMIN" ||
        userRole?.uppercase() == "SUPERADMIN" ||
        userRole?.uppercase() == "SUPER_ADMIN"
    }

    val canCalculate = remember(capabilities) { capabilities.contains("cooperative.savings.deposit") }
    val canApprove = remember(capabilities) { capabilities.contains("cooperative.loans.approve") }
    val canDistribute = remember(capabilities) { capabilities.contains("cooperative.savings.deposit") }

    // Screen navigation sub-views
    var selectedPeriod by remember { mutableStateOf<CoopShuPeriod?>(null) }
    var selectedPeriodAllocations by remember { mutableStateOf<List<CoopShuAllocation>>(emptyList()) }
    var searchAllocationQuery by remember { mutableStateOf("") }
    var isLoadingDetail by remember { mutableStateOf(false) }

    // TAB State for Staff (0: Periods, 1: Config Rules)
    var activeTab by remember { mutableIntStateOf(0) }

    // Master lists state
    var periodsList by remember { mutableStateOf<List<CoopShuPeriod>>(emptyList()) }
    var isLoadingPeriods by remember { mutableStateOf(false) }

    // Config Rules State
    var porsiJasaModal by remember { mutableStateOf("30") }
    var porsiJasaTransaksi by remember { mutableStateOf("30") }
    var porsiCadangan by remember { mutableStateOf("20") }
    var porsiPengurus by remember { mutableStateOf("5") }
    var porsiSosial by remember { mutableStateOf("5") }
    var porsiPembangunan by remember { mutableStateOf("10") }
    var isSavingConfig by remember { mutableStateOf(false) }

    // Member View State
    var memberStatus by remember { mutableStateOf("loading") } // "loading" | "member" | "non-member"
    var personalHistoryList by remember { mutableStateOf<List<CoopShuHistoryItem>>(emptyList()) }
    var isLoadingHistory by remember { mutableStateOf(false) }

    // Period creation modal state
    var showCreatePeriodDialog by remember { mutableStateOf(false) }
    var newPeriodYear by remember { mutableStateOf(Calendar.getInstance().get(Calendar.YEAR).toString()) }
    var newPeriodStartDate by remember { mutableStateOf("") }
    var newPeriodEndDate by remember { mutableStateOf("") }
    var newPeriodRevenue by remember { mutableStateOf("") }
    var newPeriodExpense by remember { mutableStateOf("") }
    var isLoadingLabaRugi by remember { mutableStateOf(false) }
    var isCreatingPeriod by remember { mutableStateOf(false) }

    // Check membership
    LaunchedEffect(userRole) {
        if (isCoopStaff) {
            memberStatus = "member"
            return@LaunchedEffect
        }
        try {
            val response = coopService.getMemberMe()
            if (response.isSuccessful && response.body()?.data != null && response.body()?.data?.status == "ACTIVE") {
                memberStatus = "member"
            } else {
                memberStatus = "non-member"
            }
        } catch (e: Exception) {
            memberStatus = "non-member"
        }
    }

    val fetchPeriods = {
        isLoadingPeriods = true
        scope.launch {
            try {
                val response = coopService.getShuPeriods()
                if (response.isSuccessful && response.body()?.success == true) {
                    periodsList = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal mengambil daftar periode: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoadingPeriods = false
            }
        }
    }

    val fetchConfig = {
        scope.launch {
            try {
                val response = coopService.getShuConfig()
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    val data = response.body()!!.data!!
                    porsiJasaModal = String.format(Locale.US, "%.0f", data.porsiJasaModal)
                    porsiJasaTransaksi = String.format(Locale.US, "%.0f", data.porsiJasaTransaksi)
                    porsiCadangan = String.format(Locale.US, "%.0f", data.porsiCadangan)
                    porsiPengurus = String.format(Locale.US, "%.0f", data.porsiPengurus)
                    porsiSosial = String.format(Locale.US, "%.0f", data.porsiSosial)
                    porsiPembangunan = String.format(Locale.US, "%.0f", data.porsiPembangunan)
                }
            } catch (e: Exception) {
                // Ignore config fetch error
            }
        }
    }

    val fetchMyHistory = {
        isLoadingHistory = true
        scope.launch {
            try {
                val response = coopService.getShuMyHistory()
                if (response.isSuccessful && response.body()?.success == true) {
                    personalHistoryList = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                // Ignore history fetch error
            } finally {
                isLoadingHistory = false
            }
        }
    }

    // Initialize data
    LaunchedEffect(isCoopStaff, memberStatus) {
        if (isCoopStaff) {
            fetchPeriods()
            fetchConfig()
        } else if (memberStatus == "member") {
            fetchMyHistory()
        }
    }

    val fetchPeriodDetail = { periodId: String ->
        isLoadingDetail = true
        scope.launch {
            try {
                val response = coopService.getShuPeriodDetail(periodId)
                if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                    selectedPeriod = response.body()!!.data!!.period
                    selectedPeriodAllocations = response.body()!!.data!!.allocations ?: emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat detail alokasi SHU: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    val handleSyncFinancials = { periodId: String ->
        isLoadingDetail = true
        scope.launch {
            try {
                val response = coopService.syncShuFinancials(periodId)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Sinkronisasi laba-rugi berhasil", Toast.LENGTH_SHORT).show()
                    fetchPeriodDetail(periodId)
                    fetchPeriods()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal melakukan sinkronisasi.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    val handleCalculateShu = { periodId: String ->
        isLoadingDetail = true
        scope.launch {
            try {
                val response = coopService.calculateShu(periodId)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Kalkulasi SHU selesai!", Toast.LENGTH_SHORT).show()
                    fetchPeriodDetail(periodId)
                    fetchPeriods()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal kalkulasi SHU.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    val handleApproveShu = { periodId: String ->
        isLoadingDetail = true
        scope.launch {
            try {
                val response = coopService.approveShu(periodId)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "SHU disetujui oleh Ketua!", Toast.LENGTH_SHORT).show()
                    fetchPeriodDetail(periodId)
                    fetchPeriods()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal menyetujui SHU.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    val handleDistributeShu = { periodId: String ->
        isLoadingDetail = true
        scope.launch {
            try {
                val response = coopService.distributeShu(periodId)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "SHU berhasil didistribusikan ke tabungan anggota!", Toast.LENGTH_SHORT).show()
                    fetchPeriodDetail(periodId)
                    fetchPeriods()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal mendistribusikan SHU.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    val handleDeletePeriod = { periodId: String, year: Int ->
        scope.launch {
            try {
                val response = coopService.deleteShuPeriod(periodId)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Tahun buku $year berhasil dihapus", Toast.LENGTH_SHORT).show()
                    fetchPeriods()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal menghapus tahun buku.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val handleSaveConfig = {
        val valJasaModal = porsiJasaModal.toDoubleOrNull() ?: 0.0
        val valJasaTransaksi = porsiJasaTransaksi.toDoubleOrNull() ?: 0.0
        val valCadangan = porsiCadangan.toDoubleOrNull() ?: 0.0
        val valPengurus = porsiPengurus.toDoubleOrNull() ?: 0.0
        val valSosial = porsiSosial.toDoubleOrNull() ?: 0.0
        val valPembangunan = porsiPembangunan.toDoubleOrNull() ?: 0.0
        val total = valJasaModal + valJasaTransaksi + valCadangan + valPengurus + valSosial + valPembangunan

        if (total != 100.0) {
            Toast.makeText(context, "Total persentase alokasi harus tepat 100%. Saat ini: $total%", Toast.LENGTH_SHORT).show()
        } else {
            isSavingConfig = true
            scope.launch {
                try {
                    val request = CoopShuConfig(valJasaModal, valJasaTransaksi, valCadangan, valPengurus, valSosial, valPembangunan)
                    val response = coopService.updateShuConfig(request)
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(context, "Konfigurasi aturan SHU berhasil disimpan!", Toast.LENGTH_SHORT).show()
                        fetchConfig()
                    } else {
                        Toast.makeText(context, response.body()?.message ?: "Gagal menyimpan konfigurasi", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                } finally {
                    isSavingConfig = false
                }
            }
        }
    }

    val handleFetchLabaRugi = {
        if (newPeriodStartDate.isBlank() || newPeriodEndDate.isBlank()) {
            Toast.makeText(context, "Silakan pilih Tanggal Mulai & Tanggal Selesai", Toast.LENGTH_SHORT).show()
        } else {
            isLoadingLabaRugi = true
            scope.launch {
                try {
                    // Convert local dates to ISO strings for API
                    val sdfIn = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val sdfOut = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                    
                    val startISO = sdfOut.format(sdfIn.parse(newPeriodStartDate)!!)
                    // End Date with 23:59:59 time offset
                    val calEnd = Calendar.getInstance().apply {
                        time = sdfIn.parse(newPeriodEndDate)!!
                        set(Calendar.HOUR_OF_DAY, 23)
                        set(Calendar.MINUTE, 59)
                        set(Calendar.SECOND, 59)
                    }
                    val endISO = sdfOut.format(calEnd.time)

                    val response = coopService.getLabaRugiData(startISO, endISO)
                    if (response.isSuccessful && response.body()?.success == true && response.body()?.data?.summary != null) {
                        val summary = response.body()!!.data!!.summary!!
                        newPeriodRevenue = String.format(Locale.US, "%.0f", summary.totalRevenue)
                        newPeriodExpense = String.format(Locale.US, "%.0f", summary.totalExpense)
                        Toast.makeText(context, "Data Laba-Rugi berhasil ditarik!", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(context, "Laporan keuangan belum terisi pada periode ini.", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Gagal menarik data Laba-Rugi: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isLoadingLabaRugi = false
                }
            }
        }
    }

    val handleCreatePeriod = {
        val yearVal = newPeriodYear.toIntOrNull()
        val revVal = newPeriodRevenue.toDoubleOrNull()
        val expVal = newPeriodExpense.toDoubleOrNull()

        if (yearVal == null || newPeriodStartDate.isBlank() || newPeriodEndDate.isBlank() || revVal == null || expVal == null) {
            Toast.makeText(context, "Semua field harus terisi dengan benar", Toast.LENGTH_SHORT).show()
        } else {
            isCreatingPeriod = true
            scope.launch {
                try {
                    val sdfIn = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                    val sdfOut = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())

                    val request = CoopShuPeriodCreateRequest(
                        year = yearVal,
                        startDate = sdfOut.format(sdfIn.parse(newPeriodStartDate)!!),
                        endDate = sdfOut.format(sdfIn.parse(newPeriodEndDate)!!),
                        totalRevenue = revVal,
                        totalExpense = expVal
                    )
                    val response = coopService.createShuPeriod(request)
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(context, "Periode SHU berhasil dibuat!", Toast.LENGTH_SHORT).show()
                        showCreatePeriodDialog = false
                        fetchPeriods()
                    } else {
                        Toast.makeText(context, response.body()?.message ?: "Gagal membuat periode.", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isCreatingPeriod = false
                }
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { 
                    Text(
                        text = if (selectedPeriod != null) "SHU Tahun Buku ${selectedPeriod!!.year}" else "Manajemen SHU Koperasi", 
                        fontWeight = FontWeight.Bold
                    ) 
                },
                navigationIcon = {
                    IconButton(
                        onClick = {
                            if (selectedPeriod != null) {
                                selectedPeriod = null
                                selectedPeriodAllocations = emptyList()
                            } else {
                                onNavigateBack()
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Kembali",
                            tint = Color.White
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFF8FAFC),
                            Color(0xFFF1F5F9)
                        )
                    )
                )
        ) {
            // Case 1: Member Screen personal history
            if (!isCoopStaff) {
                if (memberStatus == "loading") {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (memberStatus == "non-member") {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .background(Color(0xFFFEE2E2), RoundedCornerShape(16.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(imageVector = Icons.Default.Warning, contentDescription = "Peringatan", tint = Color(0xFFEF4444), modifier = Modifier.size(36.dp))
                        }
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Bukan Anggota Koperasi", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Laporan pembagian SHU personal hanya tersedia bagi anggota aktif koperasi. Hubungi Bendahara Koperasi sekolah untuk melakukan pendaftaran.",
                            color = Color(0xFF64748B),
                            fontSize = 13.sp,
                            lineHeight = 18.sp
                        )
                    }
                } else {
                    // Member View (History)
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Summary Card
                        item {
                            val totalShu = personalHistoryList.sumOf { it.totalShu.toDoubleOrNull() ?: 0.0 }
                            Card(
                                shape = RoundedCornerShape(20.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(20.dp)) {
                                    Text("TOTAL SHU DITERIMA", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color(0xFF64748B))
                                    Text(
                                        text = String.format("Rp %,.0f", totalShu),
                                        fontSize = 24.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFF10B981)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        text = "Status Keanggotaan: AKTIF & BERHAK",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF3B82F6)
                                    )
                                }
                            }
                        }

                        item {
                            Text("RIWAYAT PEMBAGIAN SHU", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                        }

                        if (isLoadingHistory) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            }
                        } else if (personalHistoryList.isEmpty()) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().height(150.dp), contentAlignment = Alignment.Center) {
                                    Text("Belum ada data penerimaan SHU.", fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                            }
                        } else {
                            items(personalHistoryList) { item ->
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text(
                                                text = "Tahun Buku: ${item.Period.year}",
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 14.sp,
                                                color = Color(0xFF1E293B)
                                            )
                                            Box(
                                                modifier = Modifier
                                                    .background(
                                                        if (item.status == "DISTRIBUTED") Color(0xFFDCFCE7) else Color(0xFFFEF3C7),
                                                        RoundedCornerShape(6.dp)
                                                    )
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = if (item.status == "DISTRIBUTED") "DIDISTRIBUSIKAN" else "PROSES",
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = if (item.status == "DISTRIBUTED") Color(0xFF10B981) else Color(0xFFD97706)
                                                )
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Divider(color = Color(0xFFF1F5F9))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(modifier = Modifier.fillMaxWidth()) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Jasa Modal", fontSize = 10.sp, color = Color.Gray)
                                                Text(String.format("Rp %,.0f", item.jasaModal.toDoubleOrNull() ?: 0.0), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text("Jasa Transaksi", fontSize = 10.sp, color = Color.Gray)
                                                Text(String.format("Rp %,.0f", item.jasaTransaksi.toDoubleOrNull() ?: 0.0), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text("Total Diterima", fontSize = 10.sp, color = Color.Gray)
                                        Text(
                                            text = String.format("Rp %,.0f", item.totalShu.toDoubleOrNull() ?: 0.0),
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFF1E3C72)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            } 
            // Case 2: Selected Period details view (expanded)
            else if (selectedPeriod != null) {
                val period = selectedPeriod!!
                Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                    // Summary cards row
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("STATUS LAPORAN", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                    Text(period.status, fontWeight = FontWeight.Black, fontSize = 16.sp, color = Color(0xFF3B82F6))
                                }
                                Button(
                                    onClick = { handleSyncFinancials(period.id) },
                                    enabled = !isLoadingDetail && (period.status == "DRAFT" || period.status == "CALCULATED"),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                                ) {
                                    Icon(imageVector = Icons.Default.Refresh, contentDescription = "Sync", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Sinkronisasi", fontSize = 11.sp, color = Color.White)
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Pendapatan", fontSize = 10.sp, color = Color.Gray)
                                    Text(String.format("Rp %,.0f", period.totalRevenue.toDoubleOrNull() ?: 0.0), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("Beban/Biaya", fontSize = 10.sp, color = Color.Gray)
                                    Text(String.format("Rp %,.0f", period.totalExpense.toDoubleOrNull() ?: 0.0), fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("SHU Bersih", fontSize = 10.sp, color = Color.Gray)
                                    Text(String.format("Rp %,.0f", period.totalShu.toDoubleOrNull() ?: 0.0), fontSize = 13.sp, fontWeight = FontWeight.ExtraBold, color = Color(0xFF10B981))
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Step action buttons
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        if (period.status == "DRAFT" || period.status == "CALCULATED") {
                            Button(
                                onClick = { handleCalculateShu(period.id) },
                                enabled = canCalculate && !isLoadingDetail,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF8B5CF6)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Hitung Alokasi", fontSize = 11.sp, color = Color.White)
                            }
                        }

                        if (period.status == "CALCULATED") {
                            Button(
                                onClick = { handleApproveShu(period.id) },
                                enabled = canApprove && !isLoadingDetail,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Setujui (Ketua)", fontSize = 11.sp, color = Color.White)
                            }
                        }

                        if (period.status == "APPROVED") {
                            Button(
                                onClick = { handleDistributeShu(period.id) },
                                enabled = canDistribute && !isLoadingDetail,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Distribusikan", fontSize = 11.sp, color = Color.White)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Search Member Allocation
                    OutlinedTextField(
                        value = searchAllocationQuery,
                        onValueChange = { searchAllocationQuery = it },
                        placeholder = { Text("Cari alokasi anggota / no. anggota...") },
                        modifier = Modifier.fillMaxWidth(),
                        leadingIcon = { Icon(imageVector = Icons.Default.Search, contentDescription = "Cari") },
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF1E3C72),
                            unfocusedContainerColor = Color.White,
                            focusedContainerColor = Color.White
                        ),
                        singleLine = true
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Allocations list
                    if (isLoadingDetail) {
                        Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF1E3C72))
                        }
                    } else {
                        val filteredAllocations = selectedPeriodAllocations.filter {
                            it.Member.name.contains(searchAllocationQuery, ignoreCase = true) ||
                            it.Member.memberNo.contains(searchAllocationQuery, ignoreCase = true)
                        }

                        if (filteredAllocations.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                                Text("Belum ada alokasi anggota. Silakan hitung alokasi.", fontSize = 12.sp, color = Color.Gray)
                            }
                        } else {
                            LazyColumn(
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                items(filteredAllocations) { alloc ->
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Column {
                                                    Text(alloc.Member.name, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                    Text(alloc.Member.memberNo, fontSize = 10.sp, color = Color.Gray)
                                                }
                                                Text(
                                                    text = String.format("Total SHU: Rp %,.0f", alloc.totalShu.toDoubleOrNull() ?: 0.0),
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 13.sp,
                                                    color = Color(0xFF1E3C72)
                                                )
                                            }
                                            Spacer(modifier = Modifier.height(6.dp))
                                            Row(modifier = Modifier.fillMaxWidth()) {
                                                Text("Jasa Modal: Rp " + String.format(Locale.getDefault(), "%,.0f", alloc.jasaModal.toDoubleOrNull() ?: 0.0) + "  |  ", fontSize = 10.sp, color = Color.Gray)
                                                Text("Jasa Transaksi: Rp " + String.format(Locale.getDefault(), "%,.0f", alloc.jasaTransaksi.toDoubleOrNull() ?: 0.0), fontSize = 10.sp, color = Color.Gray)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } 
            // Case 3: Staff Management Main view
            else {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tab Row
                    TabRow(
                        selectedTabIndex = activeTab,
                        containerColor = Color.White,
                        contentColor = Color(0xFF1E3C72)
                    ) {
                        Tab(
                            selected = activeTab == 0,
                            onClick = { activeTab = 0 },
                            text = { Text("Periode & Tahun Buku", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                        )
                        Tab(
                            selected = activeTab == 1,
                            onClick = { activeTab = 1 },
                            text = { Text("Aturan SHU", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (activeTab == 0) {
                        // TAB: Periods
                        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("DAFTAR TAHUN BUKU SHU", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                Button(
                                    onClick = {
                                        newPeriodYear = Calendar.getInstance().get(Calendar.YEAR).toString()
                                        newPeriodStartDate = ""
                                        newPeriodEndDate = ""
                                        newPeriodRevenue = ""
                                        newPeriodExpense = ""
                                        showCreatePeriodDialog = true
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                ) {
                                    Icon(imageVector = Icons.Default.Add, contentDescription = "Tambah", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Buat Baru", fontSize = 11.sp, color = Color.White)
                                }
                            }

                            Spacer(modifier = Modifier.height(12.dp))

                            if (isLoadingPeriods) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            } else if (periodsList.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("Belum ada periode pembukuan SHU.", fontSize = 12.sp, color = Color.Gray)
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    items(periodsList) { p ->
                                        Card(
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(16.dp)) {
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text("Tahun Buku: ${p.year}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                                    Box(
                                                        modifier = Modifier
                                                            .background(Color(0xFFE2E8F0), RoundedCornerShape(6.dp))
                                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(p.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E3C72))
                                                    }
                                                }
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                    text = "Periode: ${p.startDate.substring(0,10)} s.d ${p.endDate.substring(0,10)}",
                                                    fontSize = 11.sp,
                                                    color = Color.Gray
                                                )
                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                    text = String.format("Total SHU Bersih: Rp %,.0f", p.totalShu.toDoubleOrNull() ?: 0.0),
                                                    fontWeight = FontWeight.Black,
                                                    fontSize = 14.sp,
                                                    color = Color(0xFF10B981)
                                                )
                                                Spacer(modifier = Modifier.height(12.dp))
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.End,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    if (p.status == "DRAFT" || p.status == "CALCULATED") {
                                                        IconButton(onClick = { handleDeletePeriod(p.id, p.year) }) {
                                                            Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444))
                                                        }
                                                    }
                                                    Button(
                                                        onClick = { fetchPeriodDetail(p.id) },
                                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                                    ) {
                                                        Text("Kelola SHU", fontSize = 11.sp, color = Color.White)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // TAB: Config Rules
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                LazyColumn(
                                    modifier = Modifier.padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    item {
                                        Text("Porsi Jasa Modal (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiJasaModal,
                                            onValueChange = { porsiJasaModal = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        Text("Porsi Jasa Transaksi (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiJasaTransaksi,
                                            onValueChange = { porsiJasaTransaksi = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        Text("Porsi Dana Cadangan (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiCadangan,
                                            onValueChange = { porsiCadangan = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        Text("Porsi Dana Pengurus (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiPengurus,
                                            onValueChange = { porsiPengurus = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        Text("Porsi Dana Sosial (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiSosial,
                                            onValueChange = { porsiSosial = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        Text("Porsi Dana Pembangunan (%)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        OutlinedTextField(
                                            value = porsiPembangunan,
                                            onValueChange = { porsiPembangunan = it },
                                            modifier = Modifier.fillMaxWidth(),
                                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                            singleLine = true
                                        )
                                    }

                                    item {
                                        val total = (porsiJasaModal.toDoubleOrNull() ?: 0.0) +
                                                (porsiJasaTransaksi.toDoubleOrNull() ?: 0.0) +
                                                (porsiCadangan.toDoubleOrNull() ?: 0.0) +
                                                (porsiPengurus.toDoubleOrNull() ?: 0.0) +
                                                (porsiSosial.toDoubleOrNull() ?: 0.0) +
                                                (porsiPembangunan.toDoubleOrNull() ?: 0.0)

                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(
                                                    if (total == 100.0) Color(0xFFDCFCE7) else Color(0xFFFEE2E2),
                                                    RoundedCornerShape(8.dp)
                                                )
                                                .padding(12.dp)
                                        ) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                Text("Total Persentase:", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                                Text(
                                                    text = "$total% " + (if (total == 100.0) "(Valid)" else "(Harus 100%)"),
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Black,
                                                    color = if (total == 100.0) Color(0xFF10B981) else Color(0xFFEF4444)
                                                )
                                            }
                                        }
                                    }

                                    item {
                                        Button(
                                            onClick = { handleSaveConfig() },
                                            enabled = !isSavingConfig,
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            if (isSavingConfig) {
                                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                                            } else {
                                                Text("Simpan Konfigurasi Aturan SHU", color = Color.White)
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
    }

    // Modal dialog Buat Periode SHU Baru
    if (showCreatePeriodDialog) {
        val datePickerLauncher = { onDateSelected: (String) -> Unit ->
            val calendar = Calendar.getInstance()
            DatePickerDialog(
                context,
                { _, y, m, d ->
                    val dateStr = String.format(Locale.US, "%d-%02d-%02d", y, m + 1, d)
                    onDateSelected(dateStr)
                },
                calendar.get(Calendar.YEAR),
                calendar.get(Calendar.MONTH),
                calendar.get(Calendar.DAY_OF_MONTH)
            ).show()
        }

        AlertDialog(
            onDismissRequest = { showCreatePeriodDialog = false },
            title = { Text("Buat Periode SHU Baru", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        OutlinedTextField(
                            value = newPeriodYear,
                            onValueChange = { newPeriodYear = it },
                            label = { Text("Tahun Buku") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = newPeriodStartDate,
                            onValueChange = { },
                            label = { Text("Tanggal Mulai") },
                            modifier = Modifier.fillMaxWidth().clickable { datePickerLauncher { newPeriodStartDate = it } },
                            enabled = false,
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = Color.Black,
                                disabledBorderColor = Color.Gray,
                                disabledLabelColor = Color.Gray
                            )
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = newPeriodEndDate,
                            onValueChange = { },
                            label = { Text("Tanggal Selesai") },
                            modifier = Modifier.fillMaxWidth().clickable { datePickerLauncher { newPeriodEndDate = it } },
                            enabled = false,
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = Color.Black,
                                disabledBorderColor = Color.Gray,
                                disabledLabelColor = Color.Gray
                            )
                        )
                    }

                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text("Tarik Data Keuangan", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                            IconButton(onClick = { handleFetchLabaRugi() }, enabled = !isLoadingLabaRugi) {
                                if (isLoadingLabaRugi) {
                                    CircularProgressIndicator(modifier = Modifier.size(18.dp))
                                } else {
                                    Icon(imageVector = Icons.Default.Refresh, contentDescription = "Tarik Data")
                                }
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = newPeriodRevenue,
                            onValueChange = { newPeriodRevenue = it },
                            label = { Text("Total Pendapatan (Rp)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = newPeriodExpense,
                            onValueChange = { newPeriodExpense = it },
                            label = { Text("Total Biaya/Beban (Rp)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        val rev = newPeriodRevenue.toDoubleOrNull() ?: 0.0
                        val exp = newPeriodExpense.toDoubleOrNull() ?: 0.0
                        val shu = rev - exp
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Estimasi SHU Bersih:", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text(
                                    text = String.format("Rp %,.0f", shu),
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E3C72)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { handleCreatePeriod() },
                    enabled = !isCreatingPeriod,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    if (isCreatingPeriod) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text("Buat Periode", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showCreatePeriodDialog = false }) {
                    Text("Batal", color = Color.Gray)
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }
}
