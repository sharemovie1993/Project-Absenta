package com.absenta.app.ui.features.cooperative

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopAccountingScreen(
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
            featureName = "Laporan Keuangan & Akuntansi",
            description = "Fitur laporan keuangan, jurnal umum, neraca saldo, dan rekap potongan gaji koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    val isOperator = remember(capabilities, userRole) {
        capabilities.contains("cooperative.savings.deposit") || 
        userRole?.uppercase() == "ADMIN" || 
        userRole?.uppercase() == "SUPERADMIN" || 
        userRole?.uppercase() == "SUPER_ADMIN"
    }

    var activeTab by remember { mutableStateOf("journal") }

    // Data states
    var journalsList by remember { mutableStateOf<List<CoopJournalEntry>>(emptyList()) }
    var balanceSheetList by remember { mutableStateOf<List<BalanceSheetItem>>(emptyList()) }
    var payrollResponse by remember { mutableStateOf<PayrollDeductionsResponse?>(null) }
    var isLoading by remember { mutableStateOf(false) }

    // Payroll filter states
    val calendar = Calendar.getInstance()
    var selectedMonth by remember { mutableStateOf(calendar.get(Calendar.MONTH) + 1) }
    var selectedYear by remember { mutableStateOf(calendar.get(Calendar.YEAR)) }
    var isPostingLoading by remember { mutableStateOf(false) }

    // Dynamic visible columns for payroll
    var visibleColumns by remember { mutableStateOf<Map<String, Boolean>>(emptyMap()) }
    var showLoansColumn by remember { mutableStateOf(true) }

    val indonesianMonths = listOf(
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    )

    val fetchJournals = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getJournals()
                if (response.isSuccessful) {
                    journalsList = response.body() ?: emptyList()
                } else {
                    journalsList = emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat jurnal: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    val fetchBalanceSheet = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getBalanceSheet()
                if (response.isSuccessful) {
                    balanceSheetList = response.body() ?: emptyList()
                } else {
                    balanceSheetList = emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat neraca saldo: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    val fetchPayrollDeductions = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getPayrollDeductions(selectedMonth, selectedYear)
                if (response.isSuccessful) {
                    val body = response.body()
                    payrollResponse = body
                    // Initialize checkboxes if empty
                    val defaultCols = mutableMapOf<String, Boolean>()
                    body?.savingCategories?.forEach { cat ->
                        defaultCols[cat.code] = visibleColumns[cat.code] ?: true
                    }
                    visibleColumns = defaultCols
                } else {
                    payrollResponse = null
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat rekap potongan: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(activeTab, selectedMonth, selectedYear) {
        when (activeTab) {
            "journal" -> fetchJournals()
            "balance" -> fetchBalanceSheet()
            "payroll" -> fetchPayrollDeductions()
        }
    }

    val handlePostPayroll = {
        isPostingLoading = true
        scope.launch {
            try {
                val response = coopService.postPayrollDeductions(PayrollPostCancelRequest(selectedMonth, selectedYear))
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Potongan gaji berhasil diposting!", Toast.LENGTH_SHORT).show()
                    fetchPayrollDeductions()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal posting potongan.", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isPostingLoading = false
            }
        }
    }

    val handleCancelPayroll = {
        isPostingLoading = true
        scope.launch {
            try {
                val response = coopService.cancelPayrollDeductions(PayrollPostCancelRequest(selectedMonth, selectedYear))
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Posting potongan berhasil dibatalkan!", Toast.LENGTH_SHORT).show()
                    fetchPayrollDeductions()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal membatalkan posting.", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            } finally {
                isPostingLoading = false
            }
        }
    }

    // Helper to calculate total for a payroll item row
    val calculateItemTotal: (PayrollItem) -> Double = { item ->
        var sum = 0.0
        val cats = payrollResponse?.savingCategories ?: emptyList()
        cats.forEach { cat ->
            if (visibleColumns[cat.code] == true) {
                sum += item.savings[cat.code] ?: 0.0
            }
        }
        if (payrollResponse?.hasLoans == true && showLoansColumn) {
            sum += item.loan.pokok + item.loan.jasa
        }
        sum
    }

    // Premium Excel CSV Export UX
    val handleExportCSV = {
        val response = payrollResponse
        if (response != null && !response.data.isNullOrEmpty()) {
            try {
                val monthName = indonesianMonths[selectedMonth - 1]
                val csvFile = File(context.cacheDir, "Rekap_Potongan_Gaji_${monthName}_$selectedYear.csv")
                csvFile.printWriter().use { out ->
                    // Build headers
                    val headerRow1 = mutableListOf("NO", "NAMA ANGGOTA")
                    val headerRow2 = mutableListOf("", "")

                    val activeCats = response.savingCategories?.filter { visibleColumns[it.code] == true } ?: emptyList()
                    activeCats.forEach { cat ->
                        headerRow1.add("SIMPANAN")
                        headerRow2.add(cat.name.replace("Simpanan", "").trim().uppercase())
                    }

                    if (response.hasLoans && showLoansColumn) {
                        headerRow1.add("PINJAMAN KOPERASI")
                        headerRow1.add("PINJAMAN KOPERASI")
                        headerRow1.add("PINJAMAN KOPERASI")
                        headerRow2.add("KE-")
                        headerRow2.add("POKOK")
                        headerRow2.add("JASA")
                    }
                    headerRow1.add("JUMLAH TOTAL")
                    headerRow2.add("")

                    out.println(headerRow1.joinToString(","))
                    out.println(headerRow2.joinToString(","))

                    // Write rows
                    response.data.forEachIndexed { index, item ->
                        val row = mutableListOf((index + 1).toString(), item.name.uppercase())
                        activeCats.forEach { cat ->
                            row.add((item.savings[cat.code] ?: 0.0).toLong().toString())
                        }
                        if (response.hasLoans && showLoansColumn) {
                            row.add(item.loan.installmentNo?.toString() ?: "-")
                            row.add(item.loan.pokok.toLong().toString())
                            row.add(item.loan.jasa.toLong().toString())
                        }
                        row.add(calculateItemTotal(item).toLong().toString())
                        out.println(row.joinToString(","))
                    }

                    // Write totals
                    val totalRow = mutableListOf("TOTAL", "")
                    var grandTotal = 0.0
                    activeCats.forEach { cat ->
                        val catSum = response.data.sumOf { it.savings[cat.code] ?: 0.0 }
                        totalRow.add(catSum.toLong().toString())
                        grandTotal += catSum
                    }
                    if (response.hasLoans && showLoansColumn) {
                        val totalPokok = response.data.sumOf { it.loan.pokok }
                        val totalJasa = response.data.sumOf { it.loan.jasa }
                        totalRow.add("-")
                        totalRow.add(totalPokok.toLong().toString())
                        totalRow.add(totalJasa.toLong().toString())
                        grandTotal += totalPokok + totalJasa
                    }
                    totalRow.add(grandTotal.toLong().toString())
                    out.println(totalRow.joinToString(","))
                }

                // Share CSV via FileProvider
                val fileUri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", csvFile)
                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_STREAM, fileUri)
                    putExtra(Intent.EXTRA_SUBJECT, "Rekap Potongan Gaji Koperasi $monthName $selectedYear")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                context.startActivity(Intent.createChooser(intent, "Ekspor Laporan"))
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal mengekspor: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        } else {
            Toast.makeText(context, "Data rekap tidak tersedia untuk diekspor", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Laporan Keuangan & Akuntansi", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Kembali",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        when (activeTab) {
                            "journal" -> fetchJournals()
                            "balance" -> fetchBalanceSheet()
                            "payroll" -> fetchPayrollDeductions()
                        }
                    }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Segarkan", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFF8FAFC), Color(0xFFF1F5F9))
                    )
                )
        ) {
            // Tab Header Row
            TabRow(
                selectedTabIndex = when (activeTab) {
                    "journal" -> 0
                    "balance" -> 1
                    else -> 2
                },
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                Tab(
                    selected = activeTab == "journal",
                    onClick = { activeTab = "journal" },
                    text = { Text("Jurnal Umum", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = activeTab == "balance",
                    onClick = { activeTab = "balance" },
                    text = { Text("Neraca Saldo", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                )
                Tab(
                    selected = activeTab == "payroll",
                    onClick = { activeTab = "payroll" },
                    text = { Text("Rekap Potongan Gaji", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                when (activeTab) {
                    "journal" -> {
                        if (journalsList.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                                Text("Belum ada jurnal entri untuk periode ini.", fontSize = 13.sp, color = Color.Gray)
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f)
                                    .padding(horizontal = 16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                items(journalsList) { journal ->
                                    Card(
                                        shape = RoundedCornerShape(16.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(14.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween
                                            ) {
                                                val formattedDate = try {
                                                    val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                                    val formatter = SimpleDateFormat("dd MMM yyyy", Locale.getDefault())
                                                    formatter.format(parser.parse(journal.date)!!)
                                                } catch (e: Exception) {
                                                    journal.date.substring(0, 10)
                                                }
                                                Text(formattedDate, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF3B82F6))
                                                Text("Ref: " + journal.reference, fontFamily = FontFamily.Monospace, fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.Gray)
                                            }
                                            Text(journal.description, fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF0F172A), modifier = Modifier.padding(vertical = 4.dp))
                                            
                                            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = Color(0xFFF1F5F9))

                                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                                journal.items.forEach { item ->
                                                    val isCredit = item.type.uppercase() == "CREDIT"
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        verticalAlignment = Alignment.CenterVertically
                                                    ) {
                                                        Text(
                                                            text = "${item.account.code} - ${item.account.name}",
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Medium,
                                                            color = if (isCredit) Color(0xFF2563EB) else Color(0xFF475569),
                                                            modifier = Modifier
                                                                .weight(1f)
                                                                .padding(start = if (isCredit) 16.dp else 0.dp)
                                                        )
                                                        val amountVal = item.amount.toDoubleOrNull() ?: 0.0
                                                        val displayAmount = String.format("Rp %,.0f", amountVal)
                                                        Text(
                                                            text = if (isCredit) "" else displayAmount,
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = Color(0xFF0F172A),
                                                            modifier = Modifier.width(90.dp),
                                                            textAlign = TextAlign.End
                                                        )
                                                        Text(
                                                            text = if (isCredit) displayAmount else "",
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = Color(0xFF0F172A),
                                                            modifier = Modifier.width(90.dp),
                                                            textAlign = TextAlign.End
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
                    "balance" -> {
                        if (balanceSheetList.isEmpty()) {
                            Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                                Text("Data neraca saldo tidak ditemukan.", fontSize = 13.sp, color = Color.Gray)
                            }
                        } else {
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f)
                                    .padding(horizontal = 16.dp, vertical = 4.dp)
                            ) {
                                LazyColumn(
                                    modifier = Modifier.fillMaxSize()
                                ) {
                                    item {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .background(Color(0xFFF1F5F9))
                                                .padding(horizontal = 14.dp, vertical = 10.dp)
                                        ) {
                                            Text("Kode", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFF475569), modifier = Modifier.width(70.dp))
                                            Text("Nama Akun", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFF475569), modifier = Modifier.weight(1f))
                                            Text("Saldo", fontWeight = FontWeight.Black, fontSize = 11.sp, color = Color(0xFF475569), modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        }
                                    }
                                    items(balanceSheetList) { item ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(horizontal = 14.dp, vertical = 12.dp)
                                        ) {
                                            Text(item.code, fontFamily = FontFamily.Monospace, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.width(70.dp))
                                            Text(item.name, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF0F172A), modifier = Modifier.weight(1f))
                                            val displayBal = String.format("Rp %,.0f", item.balance)
                                            Text(displayBal, fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E3C72), modifier = Modifier.width(100.dp), textAlign = TextAlign.End)
                                        }
                                        HorizontalDivider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(horizontal = 14.dp))
                                    }
                                }
                            }
                        }
                    }
                    "payroll" -> {
                        val response = payrollResponse
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .weight(1f)
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            // Filter Card
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Row(
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            var showMonthMenu by remember { mutableStateOf(false) }
                                            Box {
                                                Button(
                                                    onClick = { showMonthMenu = true },
                                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9)),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                    modifier = Modifier.height(34.dp)
                                                ) {
                                                    Text(indonesianMonths[selectedMonth - 1], fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E3C72))
                                                }
                                                DropdownMenu(expanded = showMonthMenu, onDismissRequest = { showMonthMenu = false }) {
                                                    indonesianMonths.forEachIndexed { idx, m ->
                                                        DropdownMenuItem(text = { Text(m) }, onClick = {
                                                            selectedMonth = idx + 1
                                                            showMonthMenu = false
                                                        })
                                                    }
                                                }
                                            }

                                            var showYearMenu by remember { mutableStateOf(false) }
                                            Box {
                                                Button(
                                                    onClick = { showYearMenu = true },
                                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9)),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                                    modifier = Modifier.height(34.dp)
                                                ) {
                                                    Text(selectedYear.toString(), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E3C72))
                                                }
                                                DropdownMenu(expanded = showYearMenu, onDismissRequest = { showYearMenu = false }) {
                                                    listOf(2025, 2026, 2027, 2028).forEach { y ->
                                                        DropdownMenuItem(text = { Text(y.toString()) }, onClick = {
                                                            selectedYear = y
                                                            showYearMenu = false
                                                        })
                                                    }
                                                }
                                            }
                                        }

                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            IconButton(
                                                onClick = { handleExportCSV() },
                                                modifier = Modifier
                                                    .size(34.dp)
                                                    .clip(RoundedCornerShape(8.dp))
                                                    .background(Color(0xFF2563EB))
                                            ) {
                                                Icon(imageVector = Icons.Default.Share, contentDescription = "Ekspor", tint = Color.White, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }

                                    // Action Buttons & Status for Operator
                                    if (response != null) {
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                val statusBg = if (response.isPosted) Color(0xFFD1FAE5) else Color(0xFFF1F5F9)
                                                val statusText = if (response.isPosted) Color(0xFF065F46) else Color(0xFF64748B)
                                                Box(
                                                    modifier = Modifier
                                                        .clip(RoundedCornerShape(8.dp))
                                                        .background(statusBg)
                                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                                ) {
                                                    Text(
                                                        text = if (response.isPosted) "POSTED" else "DRAFT",
                                                        fontSize = 10.sp,
                                                        fontWeight = FontWeight.Black,
                                                        color = statusText
                                                    )
                                                }
                                            }

                                            if (isOperator) {
                                                Button(
                                                    onClick = { if (response.isPosted) handleCancelPayroll() else handlePostPayroll() },
                                                    colors = ButtonDefaults.buttonColors(
                                                        containerColor = if (response.isPosted) Color(0xFFEF4444) else Color(0xFF10B981)
                                                    ),
                                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                                    modifier = Modifier.height(30.dp),
                                                    enabled = !isPostingLoading && (!response.data.isNullOrEmpty() || response.isPosted)
                                                ) {
                                                    if (isPostingLoading) {
                                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(14.dp))
                                                    } else {
                                                        Text(
                                                            text = if (response.isPosted) "Batalkan Posting" else "Posting Gaji",
                                                            fontSize = 11.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color.White
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Dynamic column selector checkboxes
                            if (response?.savingCategories != null && response.savingCategories.isNotEmpty()) {
                                Card(
                                    shape = RoundedCornerShape(12.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Filter Potongan Simpanan:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                        Row(
                                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            response.savingCategories.forEach { cat ->
                                                val isChecked = visibleColumns[cat.code] ?: true
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.clickable {
                                                        visibleColumns = visibleColumns.toMutableMap().apply { put(cat.code, !isChecked) }
                                                    }
                                                ) {
                                                    Checkbox(
                                                        checked = isChecked,
                                                        onCheckedChange = { visibleColumns = visibleColumns.toMutableMap().apply { put(cat.code, it) } },
                                                        modifier = Modifier.size(32.dp)
                                                    )
                                                    Text(cat.name.replace("Simpanan", "").trim(), fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                                }
                                            }
                                            if (response.hasLoans) {
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.clickable { showLoansColumn = !showLoansColumn }
                                                ) {
                                                    Checkbox(
                                                        checked = showLoansColumn,
                                                        onCheckedChange = { showLoansColumn = it },
                                                        modifier = Modifier.size(32.dp)
                                                    )
                                                    Text("Pinjaman Koperasi", fontSize = 11.sp, fontWeight = FontWeight.Medium)
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Data table (Horizontal scrollable Grid)
                            if (response == null || response.data.isNullOrEmpty()) {
                                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                                    Text("Belum ada rekap potongan gaji untuk periode ini.", fontSize = 12.sp, color = Color.Gray)
                                }
                            } else {
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .weight(1f)
                                ) {
                                    val activeCategories = response.savingCategories?.filter { visibleColumns[it.code] == true } ?: emptyList()
                                    val showSavings = activeCategories.isNotEmpty()
                                    val showLoans = response.hasLoans && showLoansColumn

                                    Box(modifier = Modifier.fillMaxSize().horizontalScroll(rememberScrollState())) {
                                        Column {
                                            // 1. Group Headers
                                            Row(
                                                modifier = Modifier
                                                    .background(Color(0xFFE2E8F0))
                                                    .border(0.5.dp, Color(0xFFCBD5E1))
                                            ) {
                                                Text("NO", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.width(40.dp).padding(vertical = 8.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                Text("NAMA ANGGOTA", fontWeight = FontWeight.Black, fontSize = 10.sp, modifier = Modifier.width(180.dp).padding(start = 8.dp, top = 8.dp, bottom = 8.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                
                                                if (showSavings) {
                                                    val widthVal = 90.dp * activeCategories.size
                                                    Text("SIMPANAN", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.width(widthVal).padding(vertical = 8.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                }
                                                if (showLoans) {
                                                    Text("PINJAMAN KOPERASI", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.width(220.dp).padding(vertical = 8.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                }
                                                Text("JUMLAH TOTAL", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Right, modifier = Modifier.width(110.dp).padding(end = 8.dp, top = 8.dp, bottom = 8.dp))
                                            }

                                            // 2. Detail Columns Headers
                                            Row(
                                                modifier = Modifier
                                                    .background(Color(0xFFF1F5F9))
                                                    .border(0.5.dp, Color(0xFFCBD5E1))
                                            ) {
                                                Spacer(modifier = Modifier.width(220.dp))
                                                activeCategories.forEach { cat ->
                                                    Text(
                                                        text = cat.name.replace("Simpanan", "").trim().toUpperCase(),
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 9.sp,
                                                        textAlign = TextAlign.Center,
                                                        modifier = Modifier.width(90.dp).padding(vertical = 6.dp).border(0.5.dp, Color(0xFFCBD5E1))
                                                    )
                                                }
                                                if (showLoans) {
                                                    Text("KE-", fontWeight = FontWeight.Black, fontSize = 9.sp, textAlign = TextAlign.Center, modifier = Modifier.width(40.dp).padding(vertical = 6.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                    Text("POKOK", fontWeight = FontWeight.Black, fontSize = 9.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 4.dp, top = 6.dp, bottom = 6.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                    Text("JASA", fontWeight = FontWeight.Black, fontSize = 9.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 4.dp, top = 6.dp, bottom = 6.dp).border(0.5.dp, Color(0xFFCBD5E1)))
                                                }
                                                Spacer(modifier = Modifier.width(110.dp))
                                            }

                                            // 3. Body
                                            LazyColumn(modifier = Modifier.weight(1f)) {
                                                items(response.data) { item ->
                                                    Row(modifier = Modifier.border(0.2.dp, Color(0xFFF1F5F9))) {
                                                        Text(item.no.toString(), fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.width(40.dp).padding(vertical = 8.dp))
                                                        Text(item.name.uppercase(), fontSize = 11.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(180.dp).padding(start = 8.dp, top = 8.dp, bottom = 8.dp))
                                                        
                                                        activeCategories.forEach { cat ->
                                                            val sVal = item.savings[cat.code] ?: 0.0
                                                            val sText = if (sVal > 0) String.format("Rp %,.0f", sVal) else "-"
                                                            Text(sText, fontSize = 11.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                        }

                                                        if (showLoans) {
                                                            Text(item.loan.installmentNo?.toString() ?: "-", fontSize = 11.sp, textAlign = TextAlign.Center, modifier = Modifier.width(40.dp).padding(vertical = 8.dp))
                                                            val pText = if (item.loan.pokok > 0) String.format("Rp %,.0f", item.loan.pokok) else "-"
                                                            Text(pText, fontSize = 11.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                            val jText = if (item.loan.jasa > 0) String.format("Rp %,.0f", item.loan.jasa) else "-"
                                                            Text(jText, fontSize = 11.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                        }

                                                        val totalText = String.format("Rp %,.0f", calculateItemTotal(item))
                                                        Text(totalText, fontSize = 11.sp, fontWeight = FontWeight.Black, color = Color(0xFF1E3C72), textAlign = TextAlign.Right, modifier = Modifier.width(110.dp).padding(end = 8.dp, top = 8.dp, bottom = 8.dp))
                                                    }
                                                    HorizontalDivider(color = Color(0xFFF1F5F9))
                                                }
                                            }

                                            // 4. Cumulative totals row
                                            Row(
                                                modifier = Modifier
                                                    .background(Color(0xFFF8FAFC))
                                                    .border(0.5.dp, Color(0xFFCBD5E1))
                                            ) {
                                                Text("TOTAL", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.width(220.dp).padding(vertical = 8.dp))
                                                
                                                var grandTotal = 0.0

                                                activeCategories.forEach { cat ->
                                                    val catSum = response.data.sumOf { it.savings[cat.code] ?: 0.0 }
                                                    val sumText = String.format("Rp %,.0f", catSum)
                                                    Text(sumText, fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                    grandTotal += catSum
                                                }

                                                if (showLoans) {
                                                    Text("-", fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.width(40.dp).padding(vertical = 8.dp))
                                                    val totalPokok = response.data.sumOf { it.loan.pokok }
                                                    val totalJasa = response.data.sumOf { it.loan.jasa }
                                                    val pokokText = String.format("Rp %,.0f", totalPokok)
                                                    val jasaText = String.format("Rp %,.0f", totalJasa)
                                                    Text(pokokText, fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                    Text(jasaText, fontWeight = FontWeight.Black, fontSize = 10.sp, textAlign = TextAlign.Right, modifier = Modifier.width(90.dp).padding(end = 6.dp, top = 8.dp, bottom = 8.dp))
                                                    grandTotal += totalPokok + totalJasa
                                                }

                                                val totalAllText = String.format("Rp %,.0f", grandTotal)
                                                Text(totalAllText, fontWeight = FontWeight.Black, fontSize = 10.sp, color = Color(0xFF2563EB), textAlign = TextAlign.Right, modifier = Modifier.width(110.dp).padding(end = 8.dp, top = 8.dp, bottom = 8.dp))
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
}
