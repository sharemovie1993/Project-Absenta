package com.absenta.app.ui.features.billing

import android.util.Log
import androidx.compose.foundation.background
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.BillingService
import com.absenta.app.data.api.Invoice

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TenantInvoiceScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    var invoices by remember { mutableStateOf<List<Invoice>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedFilter by remember { mutableStateOf(0) }
    val filters = listOf("SEMUA", "LUNAS", "MENUNGGU", "GAGAL")

    LaunchedEffect(Unit) {
        Log.d("AbsentaDebug", "TenantInvoiceScreen loaded")
        isLoading = true
        try {
            val service = ApiClient.getClient(context).create(BillingService::class.java)
            val resp = service.getInvoices(limit = 30)
            if (resp.isSuccessful) {
                invoices = resp.body()?.data?.list ?: emptyList()
                Log.d("AbsentaDebug", "TenantInvoiceScreen success: ${invoices.size}")
            } else {
                invoices = emptyList()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "TenantInvoiceScreen error", e)
            invoices = emptyList()
        } finally {
            isLoading = false
        }
    }

    val filteredInvoices = when (selectedFilter) {
        1 -> invoices.filter { it.status.uppercase() == "PAID" || it.status.uppercase() == "LUNAS" }
        2 -> invoices.filter { it.status.uppercase() == "PENDING" || it.status.uppercase() == "MENUNGGU" }
        3 -> invoices.filter { it.status.uppercase() == "FAILED" || it.status.uppercase() == "GAGAL" }
        else -> invoices
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Riwayat Tagihan Sekolah", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF8FAFC))
        ) {
            // Summary Stats
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                InvoiceSummaryCard("Total Tagihan", invoices.size.toString(), Color(0xFF3B82F6), Modifier.weight(1f))
                InvoiceSummaryCard(
                    "Lunas",
                    invoices.count { it.status.uppercase() in listOf("PAID", "LUNAS") }.toString(),
                    Color(0xFF10B981), Modifier.weight(1f)
                )
                InvoiceSummaryCard(
                    "Pending",
                    invoices.count { it.status.uppercase() in listOf("PENDING", "MENUNGGU") }.toString(),
                    Color(0xFFF59E0B), Modifier.weight(1f)
                )
            }

            // Filter Tabs
            TabRow(
                selectedTabIndex = selectedFilter,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                filters.forEachIndexed { index, label ->
                    Tab(
                        selected = selectedFilter == index,
                        onClick = { selectedFilter = index },
                        text = {
                            Text(
                                label,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedFilter == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredInvoices) { invoice ->
                        InvoiceCard(invoice)
                    }

                    // Tripay Simulator Banner
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF7ED)),
                            elevation = CardDefaults.cardElevation(1.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFD97706), modifier = Modifier.size(20.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text("Simulator Pembayaran Tripay", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF92400E))
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "Mode development aktif. Gunakan fitur ini untuk mensimulasikan konfirmasi pembayaran Tripay tanpa transaksi nyata.",
                                    fontSize = 12.sp,
                                    color = Color(0xFF78350F)
                                )
                                Spacer(modifier = Modifier.height(10.dp))
                                OutlinedButton(
                                    onClick = { Log.d("AbsentaDebug", "Tripay simulator triggered") },
                                    shape = RoundedCornerShape(8.dp),
                                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFD97706))
                                ) {
                                    Text("Jalankan Simulator Tripay", fontSize = 12.sp, fontWeight = FontWeight.Bold)
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
fun InvoiceSummaryCard(label: String, value: String, color: Color, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, fontSize = 20.sp, fontWeight = FontWeight.Black, color = color)
            Text(label, fontSize = 10.sp, color = Color(0xFF64748B), fontWeight = FontWeight.Medium)
        }
    }
}

@Composable
fun InvoiceCard(invoice: Invoice) {
    val statusColor = when (invoice.status.uppercase()) {
        "PAID", "LUNAS" -> Color(0xFF10B981)
        "PENDING", "MENUNGGU" -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }
    val statusBg = when (invoice.status.uppercase()) {
        "PAID", "LUNAS" -> Color(0xFFD1FAE5)
        "PENDING", "MENUNGGU" -> Color(0xFFFEF3C7)
        else -> Color(0xFFFEE2E2)
    }
    val statusText = when (invoice.status.uppercase()) {
        "PAID" -> "LUNAS"
        "PENDING" -> "MENUNGGU"
        "FAILED" -> "GAGAL"
        else -> invoice.status.uppercase()
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(invoice.invoice_number, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF0F172A))
                    Text(invoice.plan_name, fontSize = 13.sp, color = Color(0xFF1E3C72), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 2.dp))
                }
                Text(
                    statusText,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Black,
                    color = statusColor,
                    modifier = Modifier.background(statusBg, RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 4.dp)
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Total Tagihan", fontSize = 11.sp, color = Color(0xFF64748B))
                    Text(
                        "Rp ${String.format("%,.0f", invoice.amount.toDoubleOrNull() ?: 0.0)}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF0F172A)
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Metode Bayar", fontSize = 11.sp, color = Color(0xFF64748B))
                    Text(invoice.payment_method, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Dibuat: ${invoice.created_at}${if (!invoice.paid_at.isNullOrEmpty()) " • Dibayar: ${invoice.paid_at}" else ""}",
                fontSize = 11.sp,
                color = Color(0xFF94A3B8)
            )
        }
    }
}


