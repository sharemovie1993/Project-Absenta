package com.absenta.app.ui.features.cooperative

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
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
import com.absenta.app.data.api.CoopLoan
import com.absenta.app.data.api.CoopLoanDetail
import com.absenta.app.data.api.CoopSettingsData
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.LoanInstallment
import com.absenta.app.data.api.LoanRequest
import com.absenta.app.data.api.PayInstallmentRequest
import com.absenta.app.data.api.UpdateLoanStatusRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoansScreen(
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
            featureName = "Pinjaman Koperasi",
            description = "Fitur pengajuan dan pengelolaan pinjaman koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    val isOperator = remember(userRole, capabilities) {
        userRole == "admin" || userRole == "superadmin" ||
                capabilities.any { it.contains("KOPERASI", ignoreCase = true) || it.contains("COOPERATIVE", ignoreCase = true) }
    }

    var loansList by remember { mutableStateOf<List<CoopLoan>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var showApplyDialog by remember { mutableStateOf(false) }
    var isOperatorMode by remember { mutableStateOf(false) }

    // Loan Detail Dialog states
    var selectedLoanDetail by remember { mutableStateOf<CoopLoanDetail?>(null) }
    var showDetailDialog by remember { mutableStateOf(false) }
    var isLoadingDetail by remember { mutableStateOf(false) }

    // Membership check
    var isMember by remember { mutableStateOf<Boolean?>(null) }
    var isCheckingMembership by remember { mutableStateOf(true) }

    var loanAmountInput by remember { mutableStateOf("") }
    var loanTenureInput by remember { mutableStateOf("12") }
    var isSubmittingLoan by remember { mutableStateOf(false) }

    // Approve/Reject states
    var showApproveConfirmDialog by remember { mutableStateOf(false) }
    var showRejectConfirmDialog by remember { mutableStateOf(false) }
    var loanToApprove by remember { mutableStateOf<CoopLoan?>(null) }
    var loanToReject by remember { mutableStateOf<CoopLoan?>(null) }
    var interestRateInput by remember { mutableStateOf("1.5") }
    var isUpdatingStatus by remember { mutableStateOf(false) }

    // Repay states
    var showRepayConfirmDialog by remember { mutableStateOf(false) }
    var installmentToPay by remember { mutableStateOf<LoanInstallment?>(null) }
    var isPayingInstallment by remember { mutableStateOf(false) }

    var coopSettings by remember { mutableStateOf<CoopSettingsData?>(null) }

    val canRepay = remember(isOperatorMode, userRole, capabilities) {
        isOperatorMode && (userRole == "admin" || userRole == "superadmin" || capabilities.contains("cooperative.loans.repay"))
    }

    fun loadLoans() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "loadLoans triggered. operatorMode=$isOperatorMode")
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = if (isOperatorMode) service.getLoans() else service.getMyLoans()
                if (response.isSuccessful && response.body() != null) {
                    loansList = response.body()!!
                    Log.d("AbsentaDebug", "loadLoans success: Count=${loansList.size}")
                } else {
                    Log.w("AbsentaDebug", "loadLoans failed: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadLoans error", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun loadLoanDetail(id: String) {
        scope.launch {
            isLoadingDetail = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getLoanDetail(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    selectedLoanDetail = response.body()?.data
                    showDetailDialog = true
                    Log.d("AbsentaDebug", "Loan detail loaded: installments=${selectedLoanDetail?.installments?.size ?: 0}")
                } else {
                    Log.w("AbsentaDebug", "Loan detail failed: Code=${response.code()}")
                    Toast.makeText(context, "Gagal memuat detail pinjaman", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Loan detail error", e)
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoadingDetail = false
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
                    coopSettings?.cooperative_default_interest_rate?.let {
                        interestRateInput = it
                    }
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Load settings error", e)
            }
        }
    }

    fun updateLoanStatus(id: String, status: String, interestRate: Double?) {
        scope.launch {
            isUpdatingStatus = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.updateLoanStatus(id, UpdateLoanStatusRequest(status, interestRate))
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Status pinjaman berhasil diperbarui!", Toast.LENGTH_SHORT).show()
                    loadLoans()
                } else {
                    val msg = response.body()?.message ?: "Gagal memperbarui status pinjaman"
                    Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Update status error", e)
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isUpdatingStatus = false
            }
        }
    }

    fun payInstallment(installmentId: String) {
        scope.launch {
            isPayingInstallment = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.payLoanInstallment(PayInstallmentRequest(installmentId))
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Angsuran berhasil dibayar!", Toast.LENGTH_SHORT).show()
                    selectedLoanDetail?.id?.let { loadLoanDetail(it) }
                } else {
                    val msg = response.body()?.message ?: "Pembayaran gagal"
                    Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Pay installment error", e)
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isPayingInstallment = false
            }
        }
    }

    fun checkMembership() {
        scope.launch {
            isCheckingMembership = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getMemberMe()
                if (response.isSuccessful && response.body()?.success == true) {
                    isMember = response.body()?.data != null && response.body()?.data?.status == "ACTIVE"
                } else {
                    isMember = false
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Membership check error", e)
                isMember = true
            } finally {
                isCheckingMembership = false
            }
        }
    }

    LaunchedEffect(Unit) {
        checkMembership()
        loadLoans()
    }

    LaunchedEffect(isOperatorMode) {
        if (isOperatorMode) {
            loadCoopSettings()
        }
    }

    // Membership loading state
    if (isCheckingMembership) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Pinjaman Koperasi", fontWeight = FontWeight.Bold) },
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
                modifier = Modifier.fillMaxSize().padding(paddingValues),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        }
        return
    }

    // Non-member screen
    if (isMember == false && !isOperator) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("Pinjaman Koperasi", fontWeight = FontWeight.Bold) },
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
                modifier = Modifier.fillMaxSize().padding(paddingValues).background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center
            ) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(32.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(56.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Bukan Anggota Koperasi", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Anda belum terdaftar sebagai anggota koperasi aktif. Hubungi pengurus koperasi sekolah untuk mendaftar.",
                            fontSize = 13.sp, color = Color.Gray, textAlign = TextAlign.Center, lineHeight = 18.sp
                        )
                        Spacer(modifier = Modifier.height(24.dp))
                        OutlinedButton(onClick = onNavigateBack, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                            Text("Kembali", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        return
    }

    // Check loan restrictions for apply button
    val hasActiveLoan = remember(loansList) { loansList.any { it.status == "APPROVED" } }
    val hasPendingLoan = remember(loansList) { loansList.any { it.status == "PENDING" } }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        if (isOperatorMode) "Mode Pengurus — Pinjaman" else "Pinjaman Koperasi",
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
                    if (isOperator) {
                        IconButton(onClick = {
                            isOperatorMode = !isOperatorMode
                            loadLoans()
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
            if (!isOperatorMode) {
                FloatingActionButton(
                    onClick = {
                        if (hasActiveLoan) {
                            Toast.makeText(context, "Anda masih memiliki pinjaman aktif yang belum lunas.", Toast.LENGTH_LONG).show()
                        } else if (hasPendingLoan) {
                            Toast.makeText(context, "Anda masih memiliki pengajuan pinjaman yang menunggu persetujuan.", Toast.LENGTH_LONG).show()
                        } else {
                            showApplyDialog = true
                        }
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Ajukan Pinjaman")
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
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = Color(0xFF7C3AED), modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                "Mode Pengurus aktif. Anda dapat melihat semua pinjaman anggota dan menyetujui pengajuan.",
                                fontSize = 11.sp, color = Color(0xFF7C3AED), lineHeight = 15.sp
                            )
                        }
                    }
                }
            }

            // Loan Restriction Alerts (student mode only)
            if (!isOperatorMode) {
                if (hasActiveLoan) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7))
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Anda memiliki pinjaman aktif. Lunasi terlebih dahulu sebelum mengajukan pinjaman baru.",
                                    fontSize = 11.sp, color = Color(0xFF92400E), lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
                if (hasPendingLoan) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFE0E7FF))
                        ) {
                            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF3B82F6), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "Pengajuan pinjaman Anda sedang diproses. Harap menunggu persetujuan dari pengurus.",
                                    fontSize = 11.sp, color = Color(0xFF1E40AF), lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }

            if (isLoading) {
                item {
                    Box(modifier = Modifier.fillMaxWidth().padding(48.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else if (loansList.isEmpty()) {
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
                            Text("Belum Ada Pinjaman", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                            Text(
                                if (isOperatorMode) "Belum ada data pengajuan pinjaman anggota."
                                else "Anda belum memiliki riwayat pengajuan pinjaman koperasi.",
                                color = Color.Gray, fontSize = 12.sp, textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                item {
                    Text(
                        if (isOperatorMode) "Semua Pinjaman Anggota (${loansList.size})"
                        else "Riwayat Pengajuan Pinjaman Anda",
                        fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray
                    )
                }

                items(loansList) { loan ->
                    LoanRowItem(
                        loan = loan,
                        isOperatorMode = isOperatorMode,
                        isLoadingDetail = isLoadingDetail,
                        onDetailClick = { loadLoanDetail(loan.id) },
                        onApproveClick = {
                            loanToApprove = loan
                            interestRateInput = coopSettings?.cooperative_default_interest_rate ?: "1.5"
                            showApproveConfirmDialog = true
                        },
                        onRejectClick = {
                            loanToReject = loan
                            showRejectConfirmDialog = true
                        }
                    )
                }
            }

            // Bottom spacer
            item { Spacer(modifier = Modifier.height(64.dp)) }
        }
    }

    // Dialog Ajukan Pinjaman Baru
    if (showApplyDialog) {
        AlertDialog(
            onDismissRequest = { showApplyDialog = false },
            title = { Text("Form Pengajuan Pinjaman", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Text("Tentukan jumlah dana dan tenor pembayaran pinjaman koperasi Anda.", fontSize = 12.sp, color = Color.Gray)

                    OutlinedTextField(
                        value = loanAmountInput,
                        onValueChange = { loanAmountInput = it },
                        label = { Text("Jumlah Pinjaman (Rp)") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )

                    OutlinedTextField(
                        value = loanTenureInput,
                        onValueChange = { loanTenureInput = it },
                        label = { Text("Tenor (Bulan)") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )

                    // Preview calculation
                    val amount = loanAmountInput.toDoubleOrNull() ?: 0.0
                    val tenure = loanTenureInput.toIntOrNull() ?: 0
                    if (amount > 0 && tenure > 0) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text("Estimasi Angsuran", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    String.format("Rp %,.0f / bulan", amount / tenure),
                                    fontWeight = FontWeight.Black,
                                    fontSize = 16.sp,
                                    color = Color(0xFF1E3C72)
                                )
                                Text(
                                    "*Belum termasuk bunga. Bunga akan dihitung oleh pengurus.",
                                    fontSize = 9.sp,
                                    color = Color.Gray
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (isSubmittingLoan) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72), modifier = Modifier.size(24.dp))
                } else {
                    Button(
                        onClick = {
                            val amount = loanAmountInput.toDoubleOrNull()
                            val tenure = loanTenureInput.toIntOrNull()
                            if (amount == null || amount <= 0 || tenure == null || tenure <= 0) {
                                Toast.makeText(context, "Mohon masukkan nominal dan tenor yang valid", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            scope.launch {
                                isSubmittingLoan = true
                                try {
                                    val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                                    val response = service.applyLoan(LoanRequest(amount, tenure))
                                    if (response.isSuccessful && response.body()?.success == true) {
                                        Toast.makeText(context, "Pengajuan Berhasil dikirim!", Toast.LENGTH_SHORT).show()
                                        showApplyDialog = false
                                        loanAmountInput = ""
                                        loadLoans()
                                    } else {
                                        val errorMsg = response.body()?.message ?: "Gagal mengajukan pinjaman."
                                        Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Log.e("AbsentaDebug", "Loan request exception", e)
                                    Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmittingLoan = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                    ) {
                        Text("Ajukan")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showApplyDialog = false }) { Text("Batal") }
            }
        )
    }

    // Loan Detail + Installment Schedule Dialog
    if (showDetailDialog && selectedLoanDetail != null) {
        val detail = selectedLoanDetail!!
        val installments = detail.installments ?: emptyList()
        val paidCount = installments.count { it.status == "PAID" }
        val totalCount = installments.size
        val progress = if (totalCount > 0) paidCount.toFloat() / totalCount else 0f
        val remainingAmount = installments.filter { it.status == "UNPAID" }.sumOf { it.amount?.toDoubleOrNull() ?: 0.0 }

        AlertDialog(
            onDismissRequest = { showDetailDialog = false; selectedLoanDetail = null },
            title = {
                Column {
                    Text("Detail Pinjaman", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    Spacer(modifier = Modifier.height(8.dp))

                    // Summary metrics
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF0F9FF))
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("Pokok Pinjaman", fontSize = 9.sp, color = Color.Gray)
                                Text(
                                    String.format("Rp %,.0f", detail.amount?.toDoubleOrNull() ?: 0.0),
                                    fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFF1E3C72)
                                )
                            }
                        }
                        Card(
                            modifier = Modifier.weight(1f),
                            shape = RoundedCornerShape(10.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7))
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text("Sisa Tagihan", fontSize = 9.sp, color = Color.Gray)
                                Text(
                                    String.format("Rp %,.0f", remainingAmount),
                                    fontWeight = FontWeight.Black, fontSize = 13.sp, color = Color(0xFFF59E0B)
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Progress bar
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        LinearProgressIndicator(
                            progress = { progress },
                            modifier = Modifier.weight(1f).height(8.dp),
                            color = Color(0xFF10B981),
                            trackColor = Color(0xFFE2E8F0)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "$paidCount/$totalCount",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF10B981)
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Tenor: ${detail.tenure_months} bulan", fontSize = 10.sp, color = Color.Gray)
                        Text("Bunga: ${detail.interest_rate ?: "0"}%", fontSize = 10.sp, color = Color.Gray)
                    }
                }
            },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.heightIn(max = 400.dp)
                ) {
                    item {
                        Text("Jadwal Angsuran", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.Gray)
                        Spacer(modifier = Modifier.height(4.dp))
                    }

                    if (installments.isEmpty()) {
                        item {
                            Text("Belum ada jadwal angsuran.", fontSize = 12.sp, color = Color.Gray, textAlign = TextAlign.Center)
                        }
                    } else {
                        itemsIndexed(installments) { index, installment ->
                            InstallmentRowItem(
                                index = index + 1,
                                installment = installment,
                                showRepayButton = canRepay && installment.status == "UNPAID",
                                onRepayClick = {
                                    installmentToPay = installment
                                    showRepayConfirmDialog = true
                                }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { showDetailDialog = false; selectedLoanDetail = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Tutup", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {}
        )
    }

    // Dialog Setujui Pinjaman
    if (showApproveConfirmDialog && loanToApprove != null) {
        AlertDialog(
            onDismissRequest = { showApproveConfirmDialog = false; loanToApprove = null },
            title = { Text("Setujui Pinjaman", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Apakah Anda yakin ingin menyetujui pinjaman sebesar Rp ${String.format("%,.0f", loanToApprove!!.amount?.toDoubleOrNull() ?: 0.0)}?", fontSize = 13.sp)
                    OutlinedTextField(
                        value = interestRateInput,
                        onValueChange = { interestRateInput = it },
                        label = { Text("Tingkat Bunga Bulanan (%)") },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp)
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val rate = interestRateInput.toDoubleOrNull()
                        if (rate == null || rate < 0) {
                            Toast.makeText(context, "Masukkan tingkat bunga yang valid", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        updateLoanStatus(loanToApprove!!.id, "APPROVED", rate)
                        showApproveConfirmDialog = false
                        loanToApprove = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Setujui")
                }
            },
            dismissButton = {
                TextButton(onClick = { showApproveConfirmDialog = false; loanToApprove = null }) { Text("Batal") }
            }
        )
    }

    // Dialog Tolak Pinjaman
    if (showRejectConfirmDialog && loanToReject != null) {
        AlertDialog(
            onDismissRequest = { showRejectConfirmDialog = false; loanToReject = null },
            title = { Text("Tolak Pinjaman", fontWeight = FontWeight.Bold) },
            text = {
                Text("Apakah Anda yakin ingin menolak pengajuan pinjaman sebesar Rp ${String.format("%,.0f", loanToReject!!.amount?.toDoubleOrNull() ?: 0.0)}?", fontSize = 13.sp)
            },
            confirmButton = {
                Button(
                    onClick = {
                        updateLoanStatus(loanToReject!!.id, "REJECTED", null)
                        showRejectConfirmDialog = false
                        loanToReject = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Tolak")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRejectConfirmDialog = false; loanToReject = null }) { Text("Batal") }
            }
        )
    }

    // Dialog Konfirmasi Terima Bayar Cicilan
    if (showRepayConfirmDialog && installmentToPay != null) {
        AlertDialog(
            onDismissRequest = { showRepayConfirmDialog = false; installmentToPay = null },
            title = { Text("Konfirmasi Pembayaran", fontWeight = FontWeight.Bold) },
            text = {
                Text("Apakah Anda yakin ingin menerima pembayaran angsuran sebesar Rp ${String.format("%,.0f", installmentToPay!!.amount?.toDoubleOrNull() ?: 0.0)} secara tunai?", fontSize = 13.sp)
            },
            confirmButton = {
                Button(
                    onClick = {
                        payInstallment(installmentToPay!!.id)
                        showRepayConfirmDialog = false
                        installmentToPay = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED))
                ) {
                    Text("Konfirmasi")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRepayConfirmDialog = false; installmentToPay = null }) { Text("Batal") }
            }
        )
    }
}

@Composable
fun LoanRowItem(
    loan: CoopLoan,
    isOperatorMode: Boolean = false,
    isLoadingDetail: Boolean = false,
    onDetailClick: () -> Unit = {},
    onApproveClick: () -> Unit = {},
    onRejectClick: () -> Unit = {}
) {
    val statusColor = when (loan.status) {
        "APPROVED" -> Color(0xFF10B981)
        "REJECTED" -> Color(0xFFEF4444)
        "PAID" -> Color(0xFF3B82F6)
        else -> Color(0xFFF59E0B) // PENDING
    }

    val statusLabel = when (loan.status) {
        "APPROVED" -> "Disetujui"
        "REJECTED" -> "Ditolak"
        "PAID" -> "Lunas"
        "PENDING" -> "Menunggu"
        else -> loan.status
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = String.format("Rp %,.0f", loan.amount?.toDoubleOrNull() ?: 0.0),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF1E293B)
                )

                Box(
                    modifier = Modifier
                        .background(statusColor.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = statusLabel,
                        color = statusColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Cicilan per Bulan", fontSize = 10.sp, color = Color.Gray)
                    Text(
                        text = String.format("Rp %,.0f", loan.monthly_installment?.toDoubleOrNull() ?: 0.0),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF334155),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text("Tenor / Bunga", fontSize = 10.sp, color = Color.Gray)
                    Text(
                        text = "${loan.tenure_months} Bulan / ${loan.interest_rate ?: "0"}%",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF334155),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
            }

            // Detail button
            if (loan.status == "APPROVED" || loan.status == "PAID") {
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = onDetailClick,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    enabled = !isLoadingDetail
                ) {
                    if (isLoadingDetail) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = Color(0xFF1E3C72))
                        Spacer(modifier = Modifier.width(8.dp))
                    }
                    Icon(Icons.Default.List, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Lihat Jadwal Angsuran", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            } else if (isOperatorMode && loan.status == "PENDING") {
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Button(
                        onClick = onApproveClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Setujui", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                    Button(
                        onClick = onRejectClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Tolak", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun InstallmentRowItem(
    index: Int,
    installment: LoanInstallment,
    showRepayButton: Boolean = false,
    onRepayClick: () -> Unit = {}
) {
    val isPaid = installment.status == "PAID"
    val statusColor = if (isPaid) Color(0xFF10B981) else Color(0xFFEF4444)

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(10.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isPaid) Color(0xFFF0FDF4) else Color.White
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = if (isPaid) 0.dp else 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            // Index circle
            Box(
                modifier = Modifier
                    .size(28.dp)
                    .background(
                        if (isPaid) Color(0xFF10B981) else Color(0xFFE2E8F0),
                        RoundedCornerShape(14.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isPaid) {
                    Icon(Icons.Default.Check, contentDescription = "Lunas", tint = Color.White, modifier = Modifier.size(16.dp))
                } else {
                    Text(index.toString(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF64748B))
                }
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    "Angsuran ke-$index",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = Color(0xFF1E293B)
                )
                Text(
                    "Jatuh tempo: ${installment.dueDate.take(10)}",
                    fontSize = 10.sp,
                    color = Color.Gray
                )
                if (isPaid && !installment.paidDate.isNullOrBlank()) {
                    Text(
                        "Dibayar: ${installment.paidDate.take(10)}",
                        fontSize = 9.sp,
                        color = Color(0xFF10B981)
                    )
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    String.format("Rp %,.0f", installment.amount?.toDoubleOrNull() ?: 0.0),
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(4.dp))
                if (showRepayButton && !isPaid) {
                    Button(
                        onClick = onRepayClick,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.height(26.dp)
                    ) {
                        Text("Terima Bayar", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(statusColor.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            if (isPaid) "Lunas" else "Belum Lunas",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = statusColor
                        )
                    }
                }
            }
        }
    }
}
