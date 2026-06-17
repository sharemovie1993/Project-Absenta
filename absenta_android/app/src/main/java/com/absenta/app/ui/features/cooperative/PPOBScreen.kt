package com.absenta.app.ui.features.cooperative

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.PpobProduct
import com.absenta.app.data.api.PpobTransactionRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PPOBScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())

    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Layanan PPOB Koperasi",
            description = "Fitur pembelian pulsa, token listrik PLN, dan tagihan lainnya memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    var products by remember { mutableStateOf<List<PpobProduct>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var selectedType by remember { mutableStateOf("PULSA") }
    var customerNo by remember { mutableStateOf("") }
    var selectedProduct by remember { mutableStateOf<PpobProduct?>(null) }
    var isProcessing by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }

    fun loadProducts() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getPpobProducts()
                if (response.isSuccessful && response.body() != null) {
                    products = response.body()!!.data ?: emptyList()
                    Log.d("AbsentaDebug", "PPOB products loaded: ${products.size}")
                } else {
                    Log.w("AbsentaDebug", "PPOB products failed: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "PPOB products error", e)
                Toast.makeText(context, "Gagal memuat produk PPOB", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadProducts()
    }

    val filteredProducts = remember(products, selectedType) {
        if (selectedType == "ALL") products else products.filter { it.type == selectedType }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("PPOB & Pembayaran", fontWeight = FontWeight.Bold) },
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
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Category Buttons
            item {
                Text(
                    "Pilih Kategori Layanan",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 4.dp)
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    PpobCategoryButton(
                        label = "Pulsa & Data",
                        icon = Icons.Default.Phone,
                        isSelected = selectedType == "PULSA",
                        color = Color(0xFF3B82F6),
                        onClick = { selectedType = "PULSA"; selectedProduct = null },
                        modifier = Modifier.weight(1f)
                    )
                    PpobCategoryButton(
                        label = "Token Listrik",
                        icon = Icons.Default.Star,
                        isSelected = selectedType == "PLN",
                        color = Color(0xFFF59E0B),
                        onClick = { selectedType = "PLN"; selectedProduct = null },
                        modifier = Modifier.weight(1f)
                    )
                    PpobCategoryButton(
                        label = "Lainnya",
                        icon = Icons.Default.ShoppingCart,
                        isSelected = selectedType == "OTHER",
                        color = Color(0xFF8B5CF6),
                        onClick = { selectedType = "OTHER"; selectedProduct = null },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Product Grid
            item {
                Text(
                    "Pilih Produk (${selectedType})",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 4.dp)
                )

                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (filteredProducts.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color.Gray, modifier = Modifier.size(40.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Tidak ada produk tersedia untuk kategori ini.", fontSize = 12.sp, color = Color.Gray)
                        }
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        filteredProducts.chunked(2).forEach { rowProducts ->
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                rowProducts.forEach { product ->
                                    val isSelected = selectedProduct?.id == product.id
                                    Card(
                                        modifier = Modifier
                                            .weight(1f)
                                            .clickable { selectedProduct = product },
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(
                                            containerColor = if (isSelected) Color(0xFFEFF6FF) else Color.White
                                        ),
                                        border = if (isSelected)
                                            androidx.compose.foundation.BorderStroke(2.dp, Color(0xFF3B82F6))
                                        else
                                            androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Text(
                                                product.name,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color(0xFF1E293B),
                                                maxLines = 2
                                            )
                                            Spacer(modifier = Modifier.height(4.dp))
                                            Text(
                                                String.format("Rp %,.0f", product.price),
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Black,
                                                color = Color(0xFF3B82F6)
                                            )
                                            Spacer(modifier = Modifier.height(2.dp))
                                            Text(
                                                product.provider,
                                                fontSize = 10.sp,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                }
                                // Padding cell if odd count
                                if (rowProducts.size == 1) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                }
            }

            // Transaction Form
            item {
                Text(
                    "Detail Transaksi",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 4.dp)
                )

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    if (selectedProduct == null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.Default.ShoppingCart,
                                contentDescription = null,
                                tint = Color(0xFFCBD5E1),
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Silakan pilih produk terlebih dahulu", fontSize = 13.sp, color = Color.Gray)
                        }
                    } else {
                        Column(modifier = Modifier.padding(16.dp)) {
                            // Selected product summary
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                    .padding(14.dp)
                            ) {
                                Column {
                                    Text("Produk Dipilih", fontSize = 10.sp, color = Color.Gray)
                                    Text(selectedProduct!!.name, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                    Text(selectedProduct!!.provider, fontSize = 11.sp, color = Color.Gray)
                                    Spacer(modifier = Modifier.height(8.dp))
                                    HorizontalDivider(color = Color(0xFFE2E8F0))
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text("Harga", fontSize = 12.sp, color = Color.Gray)
                                        Text(
                                            String.format("Rp %,.0f", selectedProduct!!.price),
                                            fontWeight = FontWeight.Black,
                                            fontSize = 18.sp,
                                            color = Color(0xFF3B82F6)
                                        )
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            OutlinedTextField(
                                value = customerNo,
                                onValueChange = { customerNo = it },
                                label = { Text("Nomor Tujuan / ID Pelanggan") },
                                placeholder = {
                                    Text(
                                        if (selectedType == "PLN") "Contoh: 140233..."
                                        else "Contoh: 081234..."
                                    )
                                },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF1E3C72),
                                    unfocusedBorderColor = Color(0xFFE2E8F0)
                                )
                            )

                            Spacer(modifier = Modifier.height(20.dp))

                            if (isProcessing) {
                                Box(
                                    modifier = Modifier.fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            } else {
                                Button(
                                    onClick = { showConfirmDialog = true },
                                    enabled = customerNo.isNotBlank(),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(48.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                                ) {
                                    Text("Bayar Sekarang", fontWeight = FontWeight.Bold, color = Color.White)
                                }
                            }
                        }
                    }
                }
            }

            // Bottom spacer
            item {
                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    // Confirmation Dialog
    if (showConfirmDialog && selectedProduct != null) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Konfirmasi Pembelian", fontWeight = FontWeight.Bold) },
            text = {
                Column {
                    Text("Produk: ${selectedProduct!!.name}", fontSize = 13.sp)
                    Text("Nomor Tujuan: $customerNo", fontSize = 13.sp)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Total: Rp ${String.format("%,.0f", selectedProduct!!.price)}",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = Color(0xFF1E3C72)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Saldo simpanan sukarela Anda akan dipotong untuk transaksi ini.",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showConfirmDialog = false
                        scope.launch {
                            isProcessing = true
                            try {
                                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                                val response = service.postPpobTransaction(
                                    PpobTransactionRequest(
                                        productId = selectedProduct!!.id,
                                        customerNo = customerNo,
                                        amount = selectedProduct!!.price
                                    )
                                )
                                if (response.isSuccessful && response.body()?.success == true) {
                                    Toast.makeText(context, "Pembelian berhasil! Saldo anggota telah dipotong.", Toast.LENGTH_LONG).show()
                                    selectedProduct = null
                                    customerNo = ""
                                } else {
                                    val msg = response.body()?.message ?: "Pembelian gagal"
                                    Toast.makeText(context, msg, Toast.LENGTH_LONG).show()
                                }
                            } catch (e: Exception) {
                                Log.e("AbsentaDebug", "PPOB purchase error", e)
                                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                            } finally {
                                isProcessing = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                ) {
                    Text("Konfirmasi Bayar", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun PpobCategoryButton(
    label: String,
    icon: ImageVector,
    isSelected: Boolean,
    color: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable { onClick() },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (isSelected) color.copy(alpha = 0.1f) else Color.White
        ),
        border = if (isSelected)
            androidx.compose.foundation.BorderStroke(2.dp, color)
        else
            androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE2E8F0))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(
                icon,
                contentDescription = label,
                tint = if (isSelected) color else Color.Gray,
                modifier = Modifier.size(28.dp)
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = if (isSelected) color else Color.Gray,
                textAlign = TextAlign.Center
            )
        }
    }
}
