package com.absenta.app.ui.features.cooperative

import android.app.DatePickerDialog
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
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
import com.absenta.app.data.api.CoopVoucher
import com.absenta.app.data.api.CoopVoucherCreateRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopVouchersScreen(
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
            featureName = "Manajemen Voucher & Promo",
            description = "Fitur voucher dan promo diskon koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    var vouchersList by remember { mutableStateOf<List<CoopVoucher>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    // Form fields
    var voucherCode by remember { mutableStateOf("") }
    var discountAmount by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var validUntilDate by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    val canManage = remember(capabilities, userRole) {
        capabilities.contains("cooperative.members.manage") || 
        userRole?.uppercase() == "ADMIN" || 
        userRole?.uppercase() == "SUPERADMIN" || 
        userRole?.uppercase() == "SUPER_ADMIN"
    }

    val fetchVouchers = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getVouchers()
                if (response.isSuccessful && response.body()?.success == true) {
                    vouchersList = response.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal mengambil voucher: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchVouchers()
    }

    val handleCreateVoucher = {
        val discountVal = discountAmount.toDoubleOrNull()
        if (voucherCode.isBlank() || discountVal == null) {
            Toast.makeText(context, "Kode voucher dan nominal diskon wajib diisi", Toast.LENGTH_SHORT).show()
        } else {
            isSubmitting = true
            scope.launch {
                try {
                    val formattedDate = if (validUntilDate.isNotBlank()) {
                        val sdfIn = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
                        val sdfOut = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                        sdfOut.format(sdfIn.parse(validUntilDate)!!)
                    } else {
                        null
                    }

                    val request = CoopVoucherCreateRequest(
                        code = voucherCode.trim().uppercase(),
                        description = description.trim(),
                        discount = discountVal,
                        validUntil = formattedDate
                    )
                    val response = coopService.createVoucher(request)
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(context, "Voucher berhasil dibuat", Toast.LENGTH_SHORT).show()
                        voucherCode = ""
                        discountAmount = ""
                        description = ""
                        validUntilDate = ""
                        fetchVouchers()
                    } else {
                        Toast.makeText(context, response.body()?.message ?: "Gagal membuat voucher.", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isSubmitting = false
                }
            }
        }
    }

    val handleDeleteVoucher: (String) -> Unit = { id ->
        scope.launch {
            try {
                val response = coopService.deleteVoucher(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Voucher berhasil dihapus", Toast.LENGTH_SHORT).show()
                    fetchVouchers()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal menghapus voucher", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    val datePickerLauncher = {
        val calendar = Calendar.getInstance()
        DatePickerDialog(
            context,
            { _, y, m, d ->
                validUntilDate = String.format(Locale.US, "%d-%02d-%02d", y, m + 1, d)
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH)
        ).show()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Manajemen Voucher & Promo", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
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
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                if (canManage) {
                    // Voucher creation form card
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Text("BUAT VOUCHER BARU", fontWeight = FontWeight.Black, fontSize = 12.sp, color = Color(0xFF1E3C72))

                            OutlinedTextField(
                                value = voucherCode,
                                onValueChange = { voucherCode = it },
                                label = { Text("Kode Voucher (Kapital)") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = discountAmount,
                                onValueChange = { discountAmount = it },
                                label = { Text("Nominal Diskon (Rp)") },
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = description,
                                onValueChange = { description = it },
                                label = { Text("Keterangan Promo") },
                                modifier = Modifier.fillMaxWidth(),
                                singleLine = true
                            )

                            OutlinedTextField(
                                value = validUntilDate,
                                onValueChange = {},
                                label = { Text("Berlaku Sampai (Opsional)") },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { datePickerLauncher() },
                                enabled = false,
                                colors = OutlinedTextFieldDefaults.colors(
                                    disabledTextColor = Color.Black,
                                    disabledBorderColor = Color.Gray,
                                    disabledLabelColor = Color.Gray
                                )
                            )

                            Button(
                                onClick = { handleCreateVoucher() },
                                enabled = !isSubmitting,
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                if (isSubmitting) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                                } else {
                                    Icon(imageVector = Icons.Default.Add, contentDescription = "Tambah")
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text("Simpan Voucher", color = Color.White)
                                }
                            }
                        }
                    }
                }

                Text("DAFTAR VOUCHER AKTIF", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (vouchersList.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        Text("Belum ada voucher aktif.", fontSize = 12.sp, color = Color.Gray)
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(vouchersList) { voucher ->
                            Card(
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = voucher.code,
                                            fontWeight = FontWeight.Black,
                                            fontSize = 15.sp,
                                            color = Color(0xFF3B82F6)
                                        )
                                        Text(
                                            text = String.format("Potongan: Rp %,.0f", voucher.discount.toDoubleOrNull() ?: 0.0),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF1E3C72)
                                        )
                                        if (voucher.description.isNotBlank()) {
                                            Text(
                                                text = voucher.description,
                                                fontSize = 12.sp,
                                                color = Color.Gray
                                            )
                                        }
                                        if (!voucher.validUntil.isNullOrBlank()) {
                                            Text(
                                                text = "Berlaku s.d: " + voucher.validUntil.substring(0, 10),
                                                fontSize = 10.sp,
                                                color = Color(0xFFEF4444),
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                    if (canManage) {
                                        IconButton(onClick = { handleDeleteVoucher(voucher.id) }) {
                                            Icon(
                                                imageVector = Icons.Default.Delete,
                                                contentDescription = "Hapus",
                                                tint = Color(0xFFEF4444)
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
}
