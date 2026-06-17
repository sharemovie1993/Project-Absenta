package com.absenta.app.ui.features.cooperative

import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CoopMember
import com.absenta.app.data.api.CoopSaving
import com.absenta.app.data.api.CoopSavingDetail
import com.absenta.app.data.api.CoopSettingsData
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.CoopTransaction
import com.absenta.app.data.api.SavingsTransactionRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SavingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val capabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())

    // Premium Gate Check
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Simpanan Koperasi",
            description = "Fitur pengelolaan simpanan wajib, pokok, dan sukarela memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Determine if user is operator/pengurus (admin or has cooperative management capability)
    val isOperator = remember(userRole, capabilities) {
        userRole == "admin" || userRole == "superadmin" ||
                capabilities.any { it.contains("KOPERASI", ignoreCase = true) || it.contains("COOPERATIVE", ignoreCase = true) }
    }

    var savingsList by remember { mutableStateOf<List<CoopSaving>>(emptyList()) }
    var selectedSavingDetail by remember { mutableStateOf<CoopSavingDetail?>(null) }
    var selectedSavingId by remember { mutableStateOf<String?>(null) }
    var isLoadingSavings by remember { mutableStateOf(true) }
    var isLoadingDetail by remember { mutableStateOf(false) }

    // Membership check state
    var isMember by remember { mutableStateOf<Boolean?>(null) }
    var isCheckingMembership by remember { mutableStateOf(true) }
    var loggedInMember by remember { mutableStateOf<CoopMember?>(null) }
    var coopSettings by remember { mutableStateOf<CoopSettingsData?>(null) }

    fun currentDateString(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(Calendar.getInstance().time)
    }

    fun newDateMinus30Days(): String {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -30)
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        return sdf.format(cal.time)
    }

    var showExportDialog by remember { mutableStateOf(false) }
    var exportStartDate by remember { mutableStateOf(newDateMinus30Days()) }
    var exportEndDate by remember { mutableStateOf(currentDateString()) }

    fun getAutoMemo(categoryCode: String?, txType: String): String {
        val code = categoryCode?.uppercase() ?: ""
        val typeStr = if (txType == "DEPOSIT") "Setoran" else "Penarikan"
        return when {
            code.contains("POKOK") -> "$typeStr Simpanan Pokok"
            code.contains("WAJIB") -> "$typeStr Simpanan Wajib"
            code.contains("SUKARELA") -> "$typeStr Simpanan Sukarela"
            else -> "$typeStr Simpanan ${categoryCode ?: ""}"
        }
    }

    fun showDatePicker(initialDate: String, onDateSelected: (String) -> Unit) {
        val calendar = Calendar.getInstance()
        val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        try {
            sdf.parse(initialDate)?.let { calendar.time = it }
        } catch (e: Exception) {}
        
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DAY_OF_MONTH)
        
        android.app.DatePickerDialog(context, { _, selectedYear, selectedMonth, selectedDay ->
            val selectedCalendar = Calendar.getInstance().apply {
                set(Calendar.YEAR, selectedYear)
                set(Calendar.MONTH, selectedMonth)
                set(Calendar.DAY_OF_MONTH, selectedDay)
            }
            onDateSelected(sdf.format(selectedCalendar.time))
        }, year, month, day).show()
    }

    fun exportTransactions(startDate: String, endDate: String) {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getSavingsTransactions(startDate, endDate)
                if (response.isSuccessful && response.body() != null) {
                    val txs = response.body()!!
                    if (txs.isEmpty()) {
                        Toast.makeText(context, "Tidak ada transaksi pada periode ini", Toast.LENGTH_SHORT).show()
                        return@launch
                    }
                    
                    val csvBuilder = StringBuilder()
                    csvBuilder.append("ID,Tanggal,Referensi,Tipe,Nominal,Keterangan\n")
                    txs.forEach { tx ->
                        val amount = tx.amount ?: "0"
                        val desc = tx.description ?: ""
                        csvBuilder.append("${tx.id},${tx.created_at},${tx.reference_no ?: ""},${tx.type},$amount,\"$desc\"\n")
                    }
                    
                    val cacheDir = context.cacheDir
                    val csvFile = File(cacheDir, "Rekap_Mutasi_${startDate}_to_${endDate}.csv")
                    val outputStream = FileOutputStream(csvFile)
                    outputStream.write(csvBuilder.toString().toByteArray())
                    outputStream.flush()
                    outputStream.close()
                    
                    val authority = "com.absenta.app.fileprovider"
                    val fileUri = FileProvider.getUriForFile(context, authority, csvFile)
                    
                    val shareIntent = Intent(Intent.ACTION_SEND).apply {
                        type = "text/csv"
                        putExtra(Intent.EXTRA_STREAM, fileUri)
                        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                    }
                    context.startActivity(Intent.createChooser(shareIntent, "Bagikan Rekap Mutasi"))
                } else {
                    Toast.makeText(context, "Gagal mengambil data rekap", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Export error", e)
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    fun loadCoopSettings() {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getSettings()
                if (response.isSuccessful && response.body()?.success == true) {
                    coopSettings = response.body()?.data
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Load settings error", e)
            }
        }
    }

    // Mode Pengurus (Operator) states
    var isOperatorMode by remember { mutableStateOf(false) }
    var showTransactionDialog by remember { mutableStateOf(false) }
    var membersList by remember { mutableStateOf<List<CoopMember>>(emptyList()) }
    var selectedMember by remember { mutableStateOf<CoopMember?>(null) }
    var allSavings by remember { mutableStateOf<List<CoopSaving>>(emptyList()) }
    var txAmountInput by remember { mutableStateOf("") }
    var txType by remember { mutableStateOf("DEPOSIT") }
    var txDescription by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    fun checkMembership() {
        scope.launch {
            isCheckingMembership = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getMemberMe()
                if (response.isSuccessful && response.body()?.success == true) {
                    isMember = response.body()?.data != null && response.body()?.data?.status == "ACTIVE"
                    loggedInMember = response.body()?.data
                } else {
                    isMember = false
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Membership check error", e)
                // If API not available, allow access (graceful degradation)
                isMember = true
            } finally {
                isCheckingMembership = false
            }
        }
    }

    fun loadSavings(personal: Boolean = true) {
        scope.launch {
            isLoadingSavings = true
            Log.d("AbsentaDebug", "loadSavings triggered in SavingsScreen. personal=$personal")
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getSavings(personal = if (personal) true else null)
                if (response.isSuccessful && response.body() != null) {
                    val data = response.body()!!
                    if (personal) {
                        savingsList = data
                        Log.d("AbsentaDebug", "loadSavings success: Count=${savingsList.size}")
                        val firstSaving = savingsList.firstOrNull()
                        if (firstSaving != null) {
                            selectedSavingId = firstSaving.id
                        }
                    } else {
                        allSavings = data
                        Log.d("AbsentaDebug", "loadAllSavings success: Count=${allSavings.size}")
                    }
                } else {
                    Log.w("AbsentaDebug", "loadSavings failed: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadSavings error", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoadingSavings = false
            }
        }
    }

    fun loadSavingDetail(id: String) {
        scope.launch {
            isLoadingDetail = true
            Log.d("AbsentaDebug", "loadSavingDetail triggered for id=$id")
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getSavingDetail(id)
                if (response.isSuccessful && response.body() != null) {
                    selectedSavingDetail = response.body()!!
                    Log.d("AbsentaDebug", "loadSavingDetail success: TxCount=${selectedSavingDetail?.transactions?.size ?: 0}")
                } else {
                    Log.w("AbsentaDebug", "loadSavingDetail failed: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadSavingDetail error for id=$id", e)
                Toast.makeText(context, "Gagal memuat detail transaksi", Toast.LENGTH_SHORT).show()
            } finally {
                isLoadingDetail = false
            }
        }
    }

    fun loadMembers() {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getMembers()
                if (response.isSuccessful && response.body() != null) {
                    membersList = response.body()!!
                    Log.d("AbsentaDebug", "loadMembers success: Count=${membersList.size}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadMembers error", e)
            }
        }
    }

    LaunchedEffect(Unit) {
        checkMembership()
        loadSavings()
        loadCoopSettings()
        if (isOperator) {
            loadMembers()
        }
    }

    LaunchedEffect(selectedSavingId) {
        selectedSavingId?.let { loadSavingDetail(it) }
    }

    // Show loading state while checking membership
    if (isCheckingMembership) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Tabungan Koperasi", fontWeight = FontWeight.Bold) },
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
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        }
        return
    }

    // Non-member info
    if (isMember == false && !isOperator) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Tabungan Koperasi", fontWeight = FontWeight.Bold) },
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
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = null,
                            tint = Color(0xFFF59E0B),
                            modifier = Modifier.size(56.dp)
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Bukan Anggota Koperasi",
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Anda belum terdaftar sebagai anggota koperasi aktif. Hubungi pengurus koperasi sekolah untuk mendaftar.",
                            fontSize = 13.sp,
                            color = Color.Gray,
                            textAlign = TextAlign.Center,
                            lineHeight = 18.sp
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        OutlinedButton(
                            onClick = onNavigateBack,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Text("Kembali", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        return
    }

    // Main Savings Screen
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isOperatorMode) "Mode Pengurus — Simpanan" else "Tabungan Koperasi Saya",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                actions = {
                    if (isOperatorMode) {
                        IconButton(onClick = { showExportDialog = true }) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = "Ekspor Mutasi",
                                tint = Color.White
                            )
                        }
                    }
                    if (isOperator) {
                        IconButton(onClick = {
                            isOperatorMode = !isOperatorMode
                            if (isOperatorMode) {
                                loadSavings(personal = false)
                                loadMembers()
                            } else {
                                loadSavings(personal = true)
                            }
                        }) {
                            Icon(
                                if (isOperatorMode) Icons.Default.Person else Icons.Default.Settings,
                                contentDescription = if (isOperatorMode) "Mode Personal" else "Mode Pengurus",
                                tint = Color.White
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = if (isOperatorMode) Color(0xFF7C3AED) else Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            if (isOperatorMode) {
                FloatingActionButton(
                    onClick = { showTransactionDialog = true },
                    containerColor = Color(0xFF7C3AED),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Transaksi Cepat")
                }
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Operator Mode Banner
            if (isOperatorMode) {
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF7C3AED).copy(alpha = 0.1f))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Mode Pengurus aktif. Anda dapat melihat semua simpanan anggota dan melakukan transaksi cepat.",
                                fontSize = 11.sp,
                                color = Color(0xFF7C3AED),
                                lineHeight = 15.sp
                            )
                        }
                    }
                }
            }

            if (isLoadingSavings) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else {
                val displayList = if (isOperatorMode) allSavings else savingsList

                if (displayList.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(
                                modifier = Modifier.padding(32.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Icon(Icons.Default.Info, contentDescription = "Empty", tint = Color.Gray, modifier = Modifier.size(48.dp))
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("Belum Ada Tabungan", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                Text(
                                    if (isOperatorMode) "Belum ada data simpanan anggota koperasi."
                                    else "Anda belum memiliki rekening simpanan koperasi terdaftar.",
                                    color = Color.Gray, fontSize = 12.sp, textAlign = TextAlign.Center
                                )
                            }
                        }
                    }
                } else {
                    if (!isOperatorMode) {
                        // 1. Horizontal Savings Accounts Selector (Personal mode)
                        item {
                            Text("Pilih Jenis Simpanan", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                savingsList.forEach { saving ->
                                    val isSelected = selectedSavingId == saving.id
                                    Card(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { selectedSavingId = saving.id },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (isSelected) Color(0xFF1E3C72) else Color.White
                                        )
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Text(
                                                text = saving.Category?.name ?: "Simpanan",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isSelected) Color.White.copy(alpha = 0.8f) else Color.Gray
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                text = String.format("Rp %,.0f", saving.balance?.toDoubleOrNull() ?: 0.0),
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Black,
                                                color = if (isSelected) Color.White else Color(0xFF1E293B)
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // 2. Transaction History (Personal mode)
                        item {
                            Text("Riwayat Mutasi Tabungan", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        }

                        if (isLoadingDetail) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            }
                        } else {
                            val txs = selectedSavingDetail?.transactions ?: emptyList()
                            if (txs.isEmpty()) {
                                item {
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White)
                                    ) {
                                        Text(
                                            text = "Belum ada riwayat mutasi transaksi.",
                                            fontSize = 12.sp,
                                            color = Color.Gray,
                                            modifier = Modifier.padding(24.dp).fillMaxWidth(),
                                            textAlign = TextAlign.Center
                                        )
                                    }
                                }
                            } else {
                                items(txs) { tx ->
                                    val savingName = selectedSavingId?.let { id ->
                                        savingsList.find { it.id == id }?.Category?.name
                                    } ?: "Simpanan"
                                    TransactionRowItem(
                                        tx = tx,
                                        onPrintClick = {
                                            ThermalSlipGenerator.generateAndShare(
                                                context = context,
                                                savingName = savingName,
                                                memberNo = loggedInMember?.memberNo ?: "",
                                                memberName = loggedInMember?.name ?: "",
                                                tx = tx,
                                                coopName = coopSettings?.cooperative_name ?: "KOPERASI SEKOLAH",
                                                coopLegalNo = coopSettings?.cooperative_legal_no ?: "",
                                                coopAddress = coopSettings?.cooperative_address ?: "",
                                                coopPhone = coopSettings?.cooperative_phone ?: ""
                                            )
                                        }
                                    )
                                }
                            }
                        }
                    } else {
                        // Operator Mode: Show all savings grouped
                        item {
                            Text("Semua Simpanan Anggota (${allSavings.size})", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        }

                        items(allSavings) { saving ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedSavingId = saving.id
                                        loadSavingDetail(saving.id)
                                    },
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = if (selectedSavingId == saving.id) Color(0xFFEDE9FE) else Color.White
                                ),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            saving.Category?.name ?: "Simpanan",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF1E293B)
                                        )
                                        Text(
                                            "ID Anggota: ${saving.member_id}",
                                            fontSize = 10.sp,
                                            color = Color.Gray
                                        )
                                    }
                                    Text(
                                        String.format("Rp %,.0f", saving.balance?.toDoubleOrNull() ?: 0.0),
                                        fontWeight = FontWeight.Black,
                                        fontSize = 14.sp,
                                        color = Color(0xFF7C3AED)
                                    )
                                }
                            }
                        }

                        // Detail of selected saving in operator mode
                        if (selectedSavingId != null) {
                            item {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text("Detail Mutasi Simpanan Terpilih", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                            }

                            if (isLoadingDetail) {
                                item {
                                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                        CircularProgressIndicator(color = Color(0xFF7C3AED))
                                    }
                                }
                            } else {
                                val txs = selectedSavingDetail?.transactions ?: emptyList()
                                if (txs.isEmpty()) {
                                    item {
                                        Card(
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White)
                                        ) {
                                            Text(
                                                text = "Belum ada riwayat mutasi.",
                                                fontSize = 12.sp,
                                                color = Color.Gray,
                                                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                                                textAlign = TextAlign.Center
                                            )
                                        }
                                    }
                                } else {
                                    items(txs) { tx ->
                                        val savingName = selectedSavingId?.let { id ->
                                            allSavings.find { it.id == id }?.Category?.name
                                        } ?: "Simpanan"
                                        val memberId = selectedSavingDetail?.member_id
                                        val member = membersList.find { it.id == memberId }
                                        TransactionRowItem(
                                            tx = tx,
                                            onPrintClick = {
                                                ThermalSlipGenerator.generateAndShare(
                                                    context = context,
                                                    savingName = savingName,
                                                    memberNo = member?.memberNo ?: "",
                                                    memberName = member?.name ?: "",
                                                    tx = tx,
                                                    coopName = coopSettings?.cooperative_name ?: "KOPERASI SEKOLAH",
                                                    coopLegalNo = coopSettings?.cooperative_legal_no ?: "",
                                                    coopAddress = coopSettings?.cooperative_address ?: "",
                                                    coopPhone = coopSettings?.cooperative_phone ?: ""
                                                )
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Bottom spacer for FAB
            item {
                Spacer(modifier = Modifier.height(64.dp))
            }
        }
    }
    // Quick Transaction Dialog (Operator Mode)
    if (showTransactionDialog) {
        var memberSearchQuery by remember { mutableStateOf("") }
        var savingDropdownExpanded by remember { mutableStateOf(false) }
        var memberDropdownExpanded by remember { mutableStateOf(false) }
        var selectedSavingForTx by remember { mutableStateOf<CoopSaving?>(null) }

        val filteredMembers = remember(membersList, memberSearchQuery) {
            if (memberSearchQuery.isBlank()) membersList.take(20)
            else membersList.filter {
                it.name.contains(memberSearchQuery, ignoreCase = true) ||
                        it.memberNo.contains(memberSearchQuery, ignoreCase = true)
            }.take(20)
        }

        // Load savings for selected member
        val memberSavings = remember(selectedMember, allSavings) {
            if (selectedMember != null) {
                allSavings.filter { it.member_id == selectedMember!!.id }
            } else emptyList()
        }

        LaunchedEffect(selectedMember, memberSavings) {
            selectedSavingForTx = memberSavings.firstOrNull()
        }

        LaunchedEffect(selectedSavingForTx, txType) {
            if (selectedSavingForTx != null) {
                txDescription = getAutoMemo(selectedSavingForTx?.Category?.name, txType)
            }
        }

        AlertDialog(
            onDismissRequest = {
                showTransactionDialog = false
                selectedMember = null
                selectedSavingForTx = null
                txAmountInput = ""
                txDescription = ""
            },
            title = {
                Text("Transaksi Simpanan Cepat", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF7C3AED))
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Pilih anggota dan lakukan setoran/penarikan simpanan.", fontSize = 11.sp, color = Color.Gray)

                    // Member Picker
                    OutlinedTextField(
                        value = memberSearchQuery,
                        onValueChange = {
                            memberSearchQuery = it
                            memberDropdownExpanded = true
                        },
                        label = { Text("Cari Anggota") },
                        placeholder = { Text("Ketik nama atau no. anggota") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        trailingIcon = {
                            IconButton(onClick = { memberDropdownExpanded = !memberDropdownExpanded }) {
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                            }
                        }
                    )

                    if (selectedMember != null) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(8.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFF7C3AED).copy(alpha = 0.08f))
                        ) {
                            Row(modifier = Modifier.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Column {
                                    Text(selectedMember!!.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF1E293B))
                                    Text("No: ${selectedMember!!.memberNo}", fontSize = 10.sp, color = Color.Gray)
                                }
                            }
                        }
                    }

                    DropdownMenu(
                        expanded = memberDropdownExpanded && filteredMembers.isNotEmpty(),
                        onDismissRequest = { memberDropdownExpanded = false }
                    ) {
                        filteredMembers.forEach { member ->
                            DropdownMenuItem(
                                text = {
                                    Column {
                                        Text(member.name, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                        Text("No: ${member.memberNo} | ${member.type}", fontSize = 10.sp, color = Color.Gray)
                                    }
                                },
                                onClick = {
                                    selectedMember = member
                                    memberSearchQuery = member.name
                                    memberDropdownExpanded = false
                                }
                            )
                        }
                    }

                    // Saving account picker
                    if (memberSavings.isNotEmpty()) {
                        ExposedDropdownMenuBox(
                            expanded = savingDropdownExpanded,
                            onExpandedChange = { savingDropdownExpanded = !savingDropdownExpanded }
                        ) {
                            OutlinedTextField(
                                value = selectedSavingForTx?.Category?.name ?: "Pilih Simpanan",
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Rekening Simpanan") },
                                modifier = Modifier.fillMaxWidth().menuAnchor(),
                                shape = RoundedCornerShape(10.dp),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = savingDropdownExpanded) }
                            )
                            ExposedDropdownMenu(
                                expanded = savingDropdownExpanded,
                                onDismissRequest = { savingDropdownExpanded = false }
                            ) {
                                memberSavings.forEach { saving ->
                                    DropdownMenuItem(
                                        text = {
                                            Text("${saving.Category?.name ?: "Simpanan"} — Rp ${String.format("%,.0f", saving.balance?.toDoubleOrNull() ?: 0.0)}")
                                        },
                                        onClick = {
                                            selectedSavingForTx = saving
                                            savingDropdownExpanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Transaction Type
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = txType == "DEPOSIT",
                            onClick = { txType = "DEPOSIT" },
                            label = { Text("Setoran", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFF10B981).copy(alpha = 0.15f),
                                selectedLabelColor = Color(0xFF10B981)
                            ),
                            modifier = Modifier.weight(1f)
                        )
                        FilterChip(
                            selected = txType == "WITHDRAWAL",
                            onClick = { txType = "WITHDRAWAL" },
                            label = { Text("Penarikan", fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = Color(0xFFEF4444).copy(alpha = 0.15f),
                                selectedLabelColor = Color(0xFFEF4444)
                            ),
                            modifier = Modifier.weight(1f)
                        )
                    }

                    OutlinedTextField(
                        value = txAmountInput,
                        onValueChange = { txAmountInput = it },
                        label = { Text("Nominal (Rp)") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )

                    val amountDouble = txAmountInput.toDoubleOrNull()
                    if (amountDouble != null && amountDouble > 0) {
                        Text(
                            text = TerbilangHelper.toIndonesianWords(amountDouble),
                            fontSize = 10.sp,
                            color = Color(0xFF10B981),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(start = 4.dp, top = 2.dp)
                        )
                    }

                    OutlinedTextField(
                        value = txDescription,
                        onValueChange = { txDescription = it },
                        label = { Text("Keterangan (opsional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            },
            confirmButton = {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color(0xFF7C3AED), modifier = Modifier.size(24.dp))
                } else {
                    Button(
                        onClick = {
                            val amount = txAmountInput.toDoubleOrNull()
                            val savingId = selectedSavingForTx?.id

                            if (amount == null || amount <= 0) {
                                Toast.makeText(context, "Masukkan nominal yang valid", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            if (savingId == null) {
                                Toast.makeText(context, "Pilih anggota dengan rekening simpanan", Toast.LENGTH_SHORT).show()
                                return@Button
                            }

                            scope.launch {
                                isSubmitting = true
                                try {
                                    val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                                    val response = service.postSavingsTransaction(
                                        SavingsTransactionRequest(
                                            savingId = savingId,
                                            amount = amount,
                                            type = txType,
                                            description = txDescription.ifBlank { null }
                                        )
                                    )
                                    if (response.isSuccessful && response.body()?.success == true) {
                                        Toast.makeText(context, "Transaksi berhasil diproses!", Toast.LENGTH_LONG).show()
                                        showTransactionDialog = false
                                        selectedMember = null
                                        selectedSavingForTx = null
                                        txAmountInput = ""
                                        txDescription = ""
                                        loadSavings(personal = false)
                                    } else {
                                        val msg = response.body()?.message ?: "Transaksi gagal"
                                        Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Log.e("AbsentaDebug", "Savings transaction error", e)
                                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
                    ) {
                        Text(if (txType == "DEPOSIT") "Proses Setoran" else "Proses Penarikan", fontWeight = FontWeight.Bold)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = {
                    showTransactionDialog = false
                    selectedMember = null
                    selectedSavingForTx = null
                    txAmountInput = ""
                    txDescription = ""
                }) {
                    Text("Batal")
                }
            }
        )
    }

    if (showExportDialog) {
        AlertDialog(
            onDismissRequest = { showExportDialog = false },
            title = {
                Text("Ekspor Rekap Mutasi", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E3C72))
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Pilih rentang tanggal untuk ekspor laporan mutasi kas koperasi.", fontSize = 11.sp, color = Color.Gray)
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = exportStartDate,
                            onValueChange = { exportStartDate = it },
                            label = { Text("Mulai", fontSize = 11.sp) },
                            readOnly = true,
                            modifier = Modifier.weight(1f),
                            enabled = false,
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = Color.Black,
                                disabledBorderColor = Color.Gray,
                                disabledLabelColor = Color.Gray
                            )
                        )
                        OutlinedTextField(
                            value = exportEndDate,
                            onValueChange = { exportEndDate = it },
                            label = { Text("Selesai", fontSize = 11.sp) },
                            readOnly = true,
                            modifier = Modifier.weight(1f),
                            enabled = false,
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = Color.Black,
                                disabledBorderColor = Color.Gray,
                                disabledLabelColor = Color.Gray
                            )
                        )
                    }
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { showDatePicker(exportStartDate) { exportStartDate = it } },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                        ) {
                            Text("Pilih Mulai", fontSize = 10.sp)
                        }
                        Button(
                            onClick = { showDatePicker(exportEndDate) { exportEndDate = it } },
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(8.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                        ) {
                            Text("Pilih Selesai", fontSize = 10.sp)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showExportDialog = false
                        exportTransactions(exportStartDate, exportEndDate)
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Ekspor CSV", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showExportDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun TransactionRowItem(
    tx: CoopTransaction,
    onPrintClick: (() -> Unit)? = null
) {
    val isDeposit = tx.type == "DEPOSIT"
    val icon = if (isDeposit) Icons.Default.KeyboardArrowDown else Icons.Default.KeyboardArrowUp
    val tintColor = if (isDeposit) Color(0xFF10B981) else Color(0xFFEF4444)
    val amountPrefix = if (isDeposit) "+" else "-"

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(tintColor.copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = "Type", tint = tintColor)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column {
                    Text(
                        text = if (isDeposit) "Setoran Simpanan" else "Penarikan Tabungan",
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = tx.reference_no ?: "Ref No. Kosong",
                        fontSize = 10.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(top = 1.dp)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = String.format("%s Rp %,.0f", amountPrefix, tx.amount?.toDoubleOrNull() ?: 0.0),
                        fontWeight = FontWeight.Black,
                        fontSize = 14.sp,
                        color = tintColor
                    )
                    if (onPrintClick != null) {
                        Spacer(modifier = Modifier.width(6.dp))
                        IconButton(
                            onClick = onPrintClick,
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                Icons.Default.Share,
                                contentDescription = "Cetak",
                                tint = Color.Gray,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
                Text(
                    text = tx.created_at.take(10), // Tampilkan format tanggal saja
                    fontSize = 9.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }
        }
    }
}
