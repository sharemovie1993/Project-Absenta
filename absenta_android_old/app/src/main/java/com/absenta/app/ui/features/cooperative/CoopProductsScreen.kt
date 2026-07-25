package com.absenta.app.ui.features.cooperative

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.widget.Toast
import android.app.DatePickerDialog
import java.util.Calendar
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material3.TabRowDefaults.tabIndicatorOffset
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.CoopProduct
import com.absenta.app.data.api.CoopProductRequest
import com.absenta.app.data.api.CoopStockIn
import com.absenta.app.data.api.CoopStockInItem
import com.absenta.app.data.api.CoopStockInRequest
import com.absenta.app.data.api.CoopStockInItemRequest
import com.absenta.app.data.local.SessionManager
import com.absenta.app.ui.features.attendance.QrCodeAnalyzer
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import kotlinx.coroutines.launch
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

data class TempStockInItem(
    val product: CoopProduct,
    val quantity: Int,
    val costPrice: Double
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopProductsScreen(
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
            featureName = "Manajemen Produk",
            description = "Fitur manajemen inventaris toko koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Tabs State
    var selectedTab by remember { mutableStateOf(0) }
    val tabs = listOf("Katalog", "Barang Masuk", "Riwayat Masuk")

    // Database data
    var productsList by remember { mutableStateOf<List<CoopProduct>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }

    // Dialog state (Product)
    var showProductDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<CoopProduct?>(null) }
    var showScannerDialog by remember { mutableStateOf(false) }
    var scannerTargetField by remember { mutableStateOf("search") } // "search" | "code" | "stock_in"

    // Form fields state (Product)
    var productCode by remember { mutableStateOf("") }
    var productName by remember { mutableStateOf("") }
    var productCategory by remember { mutableStateOf("") }
    var productPrice by remember { mutableStateOf("") }
    var productCostPrice by remember { mutableStateOf("") }
    var productStock by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Form fields state (Stock-In)
    var stockInSupplier by remember { mutableStateOf("") }
    var stockInNotes by remember { mutableStateOf("") }
    var stockInPaymentMethod by remember { mutableStateOf("CASH") } // "CASH" | "CREDIT"
    var stockInItems by remember { mutableStateOf<List<TempStockInItem>>(emptyList()) }
    var isProcessingStockIn by remember { mutableStateOf(false) }
    var productSearchQueryStockIn by remember { mutableStateOf("") }
    var showProductSuggestions by remember { mutableStateOf(false) }

    // History data
    var stockInHistoryList by remember { mutableStateOf<List<CoopStockIn>>(emptyList()) }
    var isHistoryLoading by remember { mutableStateOf(false) }
    var historySupplierFilter by remember { mutableStateOf("") }
    var historyStartDate by remember { mutableStateOf("") }
    var historyEndDate by remember { mutableStateOf("") }

    val canManage = remember(capabilities, userRole) {
        capabilities.contains("cooperative.store.products.update") || 
        userRole?.uppercase() == "ADMIN" || 
        userRole?.uppercase() == "SUPERADMIN" || 
        userRole?.uppercase() == "SUPER_ADMIN"
    }

    val fetchProducts = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getProducts()
                if (response.isSuccessful && response.body() != null) {
                    productsList = response.body()!!
                } else {
                    Toast.makeText(context, "Gagal mengambil data produk koperasi.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    val fetchStockInHistory = {
        isHistoryLoading = true
        scope.launch {
            try {
                val response = coopService.getStockInHistory(
                    startDate = historyStartDate.ifEmpty { null },
                    endDate = historyEndDate.ifEmpty { null },
                    supplier = historySupplierFilter.ifEmpty { null }
                )
                if (response.isSuccessful && response.body() != null) {
                    stockInHistoryList = response.body()!!
                } else {
                    Toast.makeText(context, "Gagal mengambil riwayat barang masuk.", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isHistoryLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchProducts()
    }

    LaunchedEffect(selectedTab) {
        if (selectedTab == 2) {
            fetchStockInHistory()
        }
    }

    // Helper DatePickerDialog launcher
    fun showDatePickerDialog(currentDate: String, onDateSelected: (String) -> Unit) {
        val calendar = Calendar.getInstance()
        if (currentDate.isNotEmpty()) {
            val parts = currentDate.split("-")
            if (parts.size == 3) {
                try {
                    calendar.set(Calendar.YEAR, parts[0].toInt())
                    calendar.set(Calendar.MONTH, parts[1].toInt() - 1)
                    calendar.set(Calendar.DAY_OF_MONTH, parts[2].toInt())
                } catch (e: Exception) {
                    // ignore
                }
            }
        }
        val year = calendar.get(Calendar.YEAR)
        val month = calendar.get(Calendar.MONTH)
        val day = calendar.get(Calendar.DAY_OF_MONTH)

        DatePickerDialog(context, { _, y, m, d ->
            val dateStr = String.format("%04d-%02d-%02d", y, m + 1, d)
            onDateSelected(dateStr)
        }, year, month, day).show()
    }

    val handleDeleteProduct: (CoopProduct) -> Unit = { product ->
        scope.launch {
            try {
                val response = coopService.deleteProduct(product.id)
                if (response.isSuccessful) {
                    Toast.makeText(context, "Produk berhasil dihapus", Toast.LENGTH_SHORT).show()
                    fetchProducts()
                } else {
                    Toast.makeText(context, "Gagal menghapus produk.", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal menghapus produk: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    val handleSaveProduct = {
        if (productCode.isBlank() || productName.isBlank() || productPrice.isBlank() || productCostPrice.isBlank() || productStock.isBlank()) {
            Toast.makeText(context, "Semua field wajib diisi kecuali Kategori", Toast.LENGTH_SHORT).show()
        } else {
            val priceVal = productPrice.toDoubleOrNull() ?: 0.0
            val costPriceVal = productCostPrice.toDoubleOrNull() ?: 0.0
            val stockVal = productStock.toIntOrNull() ?: 0
            val request = CoopProductRequest(
                code = productCode.trim(),
                name = productName.trim(),
                price = priceVal,
                costPrice = costPriceVal,
                stock = stockVal,
                category = productCategory.trim().ifEmpty { null }
            )
            isSubmitting = true
            scope.launch {
                try {
                    val response = if (editingProduct != null) {
                        coopService.updateProduct(editingProduct!!.id, request)
                    } else {
                        coopService.createProduct(request)
                    }
                    if (response.isSuccessful) {
                        Toast.makeText(context, "Produk berhasil disimpan", Toast.LENGTH_SHORT).show()
                        showProductDialog = false
                        fetchProducts()
                    } else {
                        Toast.makeText(context, "Gagal menyimpan produk", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isSubmitting = false
                }
            }
        }
    }

    val handleProcessStockIn = {
        if (stockInItems.isEmpty()) {
            Toast.makeText(context, "Minimal satu produk harus dimasukkan", Toast.LENGTH_SHORT).show()
        } else {
            isProcessingStockIn = true
            val itemsPayload = stockInItems.map {
                CoopStockInItemRequest(
                    productId = it.product.id,
                    quantity = it.quantity,
                    costPrice = it.costPrice
                )
            }
            val request = CoopStockInRequest(
                supplier = stockInSupplier.trim().ifEmpty { null },
                notes = stockInNotes.trim().ifEmpty { null },
                paymentMethod = stockInPaymentMethod,
                items = itemsPayload
            )
            scope.launch {
                try {
                    val response = coopService.processStockIn(request)
                    if (response.isSuccessful && response.body() != null) {
                        Toast.makeText(context, "Barang masuk berhasil diproses!", Toast.LENGTH_LONG).show()
                        // Reset Form
                        stockInSupplier = ""
                        stockInNotes = ""
                        stockInPaymentMethod = "CASH"
                        stockInItems = emptyList()
                        fetchProducts()
                        selectedTab = 2 // Switch to History
                    } else {
                        Toast.makeText(context, "Gagal memproses barang masuk.", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isProcessingStockIn = false
                }
            }
        }
    }

    val filteredProducts = remember(productsList, searchQuery) {
        productsList.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
            it.code.contains(searchQuery, ignoreCase = true) ||
            (it.category?.contains(searchQuery, ignoreCase = true) ?: false)
        }
    }

    val filteredProductsStockIn = remember(productsList, productSearchQueryStockIn) {
        if (productSearchQueryStockIn.isBlank()) emptyList()
        else productsList.filter {
            it.name.contains(productSearchQueryStockIn, ignoreCase = true) ||
            it.code.contains(productSearchQueryStockIn, ignoreCase = true)
        }.take(5)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventori & Stock Koperasi", fontWeight = FontWeight.Bold) },
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
        },
        floatingActionButton = {
            if (canManage && selectedTab == 0) {
                FloatingActionButton(
                    onClick = {
                        editingProduct = null
                        productCode = ""
                        productName = ""
                        productCategory = ""
                        productPrice = ""
                        productCostPrice = ""
                        productStock = ""
                        showProductDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(imageVector = Icons.Default.Add, contentDescription = "Tambah Produk")
                }
            }
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
            Column(modifier = Modifier.fillMaxSize()) {
                // Segmented TabRow
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White,
                    indicator = { tabPositions ->
                        TabRowDefaults.Indicator(
                            modifier = Modifier.tabIndicatorOffset(tabPositions[selectedTab]),
                            color = Color.White
                        )
                    }
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = { 
                                Text(
                                    text = title, 
                                    fontWeight = FontWeight.Bold, 
                                    color = if (selectedTab == index) Color.White else Color.White.copy(alpha = 0.7f),
                                    fontSize = 13.sp
                                ) 
                            }
                        )
                    }
                }

                // Tab Content Switcher
                when (selectedTab) {
                    0 -> { // TAB 0: Product Catalog
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // Search Bar with Scanner
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Cari produk berdasarkan nama / kode...") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color(0xFF1E3C72),
                                    unfocusedContainerColor = Color.White,
                                    focusedContainerColor = Color.White
                                ),
                                leadingIcon = {
                                    Icon(imageVector = Icons.Default.Search, contentDescription = "Cari", tint = Color.Gray)
                                },
                                trailingIcon = {
                                    IconButton(onClick = {
                                        scannerTargetField = "search"
                                        showScannerDialog = true
                                    }) {
                                        Icon(imageVector = Icons.Default.Menu, contentDescription = "Scan Barcode", tint = Color(0xFF1E3C72))
                                    }
                                },
                                singleLine = true
                            )

                            Spacer(modifier = Modifier.height(16.dp))

                            if (isLoading) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            } else if (filteredProducts.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text(
                                        text = "Tidak ada data produk.",
                                        color = Color(0xFF64748B),
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    items(filteredProducts) { product ->
                                        Card(
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .padding(16.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    if (!product.category.isNullOrBlank()) {
                                                        Text(
                                                            text = product.category.uppercase(),
                                                            fontSize = 9.sp,
                                                            fontWeight = FontWeight.Black,
                                                            color = Color(0xFF3B82F6),
                                                            modifier = Modifier.padding(bottom = 2.dp)
                                                        )
                                                    }
                                                    Text(
                                                        text = product.name,
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 15.sp,
                                                        color = Color(0xFF1E293B)
                                                    )
                                                    Spacer(modifier = Modifier.height(2.dp))
                                                    Text(
                                                        text = "Kode: ${product.code}",
                                                        fontSize = 12.sp,
                                                        color = Color(0xFF64748B)
                                                    )
                                                    Spacer(modifier = Modifier.height(4.dp))
                                                    Text(
                                                        text = String.format("Harga Jual: Rp %,.0f", product.price?.toDoubleOrNull() ?: 0.0),
                                                        fontSize = 13.sp,
                                                        color = Color(0xFF1E3C72),
                                                        fontWeight = FontWeight.Black
                                                    )
                                                    if (!product.costPrice.isNullOrBlank()) {
                                                        Text(
                                                            text = String.format("Modal: Rp %,.0f", product.costPrice.toDoubleOrNull() ?: 0.0),
                                                            fontSize = 11.sp,
                                                            color = Color(0xFF64748B)
                                                        )
                                                    }
                                                }

                                                Column(
                                                    horizontalAlignment = Alignment.End,
                                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                                ) {
                                                    // Stock badge
                                                    val stockBg = if (product.stock <= 5) Color(0xFFFEE2E2) else Color(0xFFDCFCE7)
                                                    val stockText = if (product.stock <= 5) Color(0xFFEF4444) else Color(0xFF22C55E)
                                                    Box(
                                                        modifier = Modifier
                                                            .background(stockBg, RoundedCornerShape(8.dp))
                                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                                    ) {
                                                        Text(
                                                            text = "${product.stock} pcs",
                                                            color = stockText,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 11.sp
                                                        )
                                                    }

                                                    if (canManage) {
                                                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                            IconButton(
                                                                onClick = {
                                                                    editingProduct = product
                                                                    productCode = product.code
                                                                    productName = product.name
                                                                    productCategory = product.category ?: ""
                                                                    productPrice = product.price ?: ""
                                                                    productCostPrice = product.costPrice ?: ""
                                                                    productStock = product.stock.toString()
                                                                    showProductDialog = true
                                                                },
                                                                modifier = Modifier.size(32.dp)
                                                            ) {
                                                                Icon(imageVector = Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                                            }
                                                            IconButton(
                                                                onClick = { handleDeleteProduct(product) },
                                                                modifier = Modifier.size(32.dp)
                                                            ) {
                                                                Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
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
                    1 -> { // TAB 1: Stock-In Form
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            // Section 1: Product Selection
                            item {
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("Pilih Barang Masuk", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E3C72))
                                        Spacer(modifier = Modifier.height(8.dp))
                                        
                                        // Product Autocomplete Search field
                                        OutlinedTextField(
                                            value = productSearchQueryStockIn,
                                            onValueChange = {
                                                productSearchQueryStockIn = it
                                                showProductSuggestions = it.isNotEmpty()
                                            },
                                            placeholder = { Text("Ketik nama / scan barcode produk...") },
                                            modifier = Modifier.fillMaxWidth(),
                                            leadingIcon = { Icon(imageVector = Icons.Default.Search, contentDescription = null, tint = Color.Gray) },
                                            trailingIcon = {
                                                IconButton(onClick = {
                                                    scannerTargetField = "stock_in"
                                                    showScannerDialog = true
                                                }) {
                                                    Icon(imageVector = Icons.Default.Menu, contentDescription = "Scan Barcode", tint = Color(0xFF1E3C72))
                                                }
                                            },
                                            singleLine = true
                                        )

                                        // Product Suggestions Dropdown List
                                        if (showProductSuggestions && filteredProductsStockIn.isNotEmpty()) {
                                            Spacer(modifier = Modifier.height(8.dp))
                                            Card(
                                                shape = RoundedCornerShape(12.dp),
                                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                                modifier = Modifier.border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                            ) {
                                                Column(modifier = Modifier.fillMaxWidth()) {
                                                    filteredProductsStockIn.forEach { product ->
                                                        Row(
                                                            modifier = Modifier
                                                                .fillMaxWidth()
                                                                .clickable {
                                                                    // Add product to list if not already there
                                                                    if (!stockInItems.any { it.product.id == product.id }) {
                                                                        stockInItems = stockInItems + TempStockInItem(
                                                                            product = product,
                                                                            quantity = 1,
                                                                            costPrice = product.costPrice?.toDoubleOrNull() ?: 0.0
                                                                        )
                                                                    } else {
                                                                        Toast.makeText(context, "Produk sudah ditambahkan ke daftar", Toast.LENGTH_SHORT).show()
                                                                    }
                                                                    productSearchQueryStockIn = ""
                                                                    showProductSuggestions = false
                                                                }
                                                                .padding(horizontal = 16.dp, vertical = 12.dp),
                                                            verticalAlignment = Alignment.CenterVertically
                                                        ) {
                                                            Column(modifier = Modifier.weight(1f)) {
                                                                Text(product.name, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                                                Text("Kode: ${product.code}", color = Color.Gray, fontSize = 11.sp)
                                                            }
                                                            Text(
                                                                text = String.format("Modal: Rp %,.0f", product.costPrice?.toDoubleOrNull() ?: 0.0),
                                                                color = Color(0xFF1E3C72),
                                                                fontSize = 12.sp,
                                                                fontWeight = FontWeight.Bold
                                                            )
                                                        }
                                                        Divider(color = Color(0xFFE2E8F0))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Section 2: Items List
                            if (stockInItems.isNotEmpty()) {
                                item {
                                    Text("Daftar Barang Masuk (${stockInItems.size})", fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                                }

                                items(stockInItems) { item ->
                                    Card(
                                        shape = RoundedCornerShape(12.dp),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Column(modifier = Modifier.padding(12.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Text(item.product.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                                    Text("Kode: ${item.product.code}", fontSize = 11.sp, color = Color.Gray)
                                                }
                                                IconButton(
                                                    onClick = {
                                                        stockInItems = stockInItems.filter { it.product.id != item.product.id }
                                                    }
                                                ) {
                                                    Icon(imageVector = Icons.Default.Delete, contentDescription = "Hapus", tint = Color(0xFFEF4444))
                                                }
                                            }

                                            Spacer(modifier = Modifier.height(8.dp))

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                                            ) {
                                                // Quantity field
                                                OutlinedTextField(
                                                    value = if (item.quantity == 0) "" else item.quantity.toString(),
                                                    onValueChange = { qtyStr ->
                                                        val qty = qtyStr.toIntOrNull() ?: 0
                                                        stockInItems = stockInItems.map {
                                                            if (it.product.id == item.product.id) it.copy(quantity = qty)
                                                            else it
                                                        }
                                                    },
                                                    label = { Text("Jumlah (pcs)") },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    modifier = Modifier.weight(1f),
                                                    singleLine = true
                                                )

                                                // Cost Price field
                                                OutlinedTextField(
                                                    value = if (item.costPrice == 0.0) "" else String.format("%.0f", item.costPrice),
                                                    onValueChange = { priceStr ->
                                                        val price = priceStr.toDoubleOrNull() ?: 0.0
                                                        stockInItems = stockInItems.map {
                                                            if (it.product.id == item.product.id) it.copy(costPrice = price)
                                                            else it
                                                        }
                                                    },
                                                    label = { Text("Modal Beli (Rp)") },
                                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                                    modifier = Modifier.weight(1.5f),
                                                    singleLine = true
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            // Section 3: Summary & Vendor Metadata
                            item {
                                Card(
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text("Informasi Transaksi", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E3C72))

                                        OutlinedTextField(
                                            value = stockInSupplier,
                                            onValueChange = { stockInSupplier = it },
                                            label = { Text("Supplier / Vendor") },
                                            placeholder = { Text("Nama supplier penyedia barang...") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )

                                        OutlinedTextField(
                                            value = stockInNotes,
                                            onValueChange = { stockInNotes = it },
                                            label = { Text("Catatan Tambahan") },
                                            placeholder = { Text("Catatan nomor nota / info pengiriman...") },
                                            modifier = Modifier.fillMaxWidth()
                                        )

                                        // Payment Method Radio
                                        Text("Metode Pembayaran", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.spacedBy(24.dp)
                                        ) {
                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.clickable { stockInPaymentMethod = "CASH" }
                                            ) {
                                                RadioButton(
                                                    selected = stockInPaymentMethod == "CASH",
                                                    onClick = { stockInPaymentMethod = "CASH" },
                                                    colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF1E3C72))
                                                )
                                                Text("Tunai (CASH)", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                            }

                                            Row(
                                                verticalAlignment = Alignment.CenterVertically,
                                                modifier = Modifier.clickable { stockInPaymentMethod = "CREDIT" }
                                            ) {
                                                RadioButton(
                                                    selected = stockInPaymentMethod == "CREDIT",
                                                    onClick = { stockInPaymentMethod = "CREDIT" },
                                                    colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF1E3C72))
                                                )
                                                Text("Kredit (CREDIT)", fontSize = 14.sp, fontWeight = FontWeight.Medium)
                                            }
                                        }

                                        Divider(color = Color(0xFFE2E8F0), modifier = Modifier.padding(vertical = 4.dp))

                                        // Financial Total Summary
                                        val totalCost = stockInItems.sumOf { it.quantity * it.costPrice }
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text("Total Estimasi Biaya:", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF64748B))
                                            Text(
                                                text = String.format("Rp %,.0f", totalCost),
                                                fontWeight = FontWeight.Black,
                                                fontSize = 18.sp,
                                                color = Color(0xFF22C55E)
                                            )
                                        }

                                        Spacer(modifier = Modifier.height(4.dp))

                                        // Submit button
                                        Button(
                                            onClick = { handleProcessStockIn() },
                                            modifier = Modifier.fillMaxWidth(),
                                            shape = RoundedCornerShape(12.dp),
                                            enabled = !isProcessingStockIn,
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                        ) {
                                            if (isProcessingStockIn) {
                                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                                            } else {
                                                Text("Proses Barang Masuk", color = Color.White, fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    2 -> { // TAB 2: Stock-In History List
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp)
                        ) {
                            // Filter Card
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Filter Riwayat", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E3C72))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        // Start Date
                                        OutlinedTextField(
                                            value = historyStartDate,
                                            onValueChange = {},
                                            readOnly = true,
                                            label = { Text("Mulai") },
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable { showDatePickerDialog(historyStartDate) { historyStartDate = it } },
                                            enabled = false, // handled via click on parent wrapper, but compose hack is below:
                                            colors = OutlinedTextFieldDefaults.colors(
                                                disabledTextColor = Color.Black,
                                                disabledBorderColor = Color.Gray,
                                                disabledLabelColor = Color.DarkGray
                                            )
                                        )

                                        // End Date
                                        OutlinedTextField(
                                            value = historyEndDate,
                                            onValueChange = {},
                                            readOnly = true,
                                            label = { Text("Selesai") },
                                            modifier = Modifier
                                                .weight(1f)
                                                .clickable { showDatePickerDialog(historyEndDate) { historyEndDate = it } },
                                            enabled = false,
                                            colors = OutlinedTextFieldDefaults.colors(
                                                disabledTextColor = Color.Black,
                                                disabledBorderColor = Color.Gray,
                                                disabledLabelColor = Color.DarkGray
                                            )
                                        )
                                    }

                                    // Clicking intercept workaround for compose disabled field
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Button(
                                            onClick = { showDatePickerDialog(historyStartDate) { historyStartDate = it } },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2E8F0), contentColor = Color.Black)
                                        ) {
                                            Icon(imageVector = Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(historyStartDate.ifEmpty { "Pilih Tgl" }, fontSize = 11.sp)
                                        }

                                        Button(
                                            onClick = { showDatePickerDialog(historyEndDate) { historyEndDate = it } },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFE2E8F0), contentColor = Color.Black)
                                        ) {
                                            Icon(imageVector = Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text(historyEndDate.ifEmpty { "Pilih Tgl" }, fontSize = 11.sp)
                                        }
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = historySupplierFilter,
                                            onValueChange = { historySupplierFilter = it },
                                            placeholder = { Text("Supplier...") },
                                            modifier = Modifier.weight(1f),
                                            singleLine = true
                                        )

                                        Button(
                                            onClick = { fetchStockInHistory() },
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                        ) {
                                            Icon(imageVector = Icons.Default.Search, contentDescription = "Cari")
                                        }

                                        IconButton(onClick = {
                                            historyStartDate = ""
                                            historyEndDate = ""
                                            historySupplierFilter = ""
                                            fetchStockInHistory()
                                        }) {
                                            Icon(imageVector = Icons.Default.Refresh, contentDescription = "Reset", tint = Color.Gray)
                                        }
                                    }
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            if (isHistoryLoading) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                                }
                            } else if (stockInHistoryList.isEmpty()) {
                                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                    Text("Tidak ada riwayat barang masuk.", color = Color.Gray, fontWeight = FontWeight.Bold)
                                }
                            } else {
                                LazyColumn(
                                    verticalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    items(stockInHistoryList) { stockIn ->
                                        Card(
                                            shape = RoundedCornerShape(16.dp),
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                            modifier = Modifier.fillMaxWidth()
                                        ) {
                                            Column(modifier = Modifier.padding(16.dp)) {
                                                // Header Row
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = formatDateString(stockIn.date),
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 13.sp,
                                                        color = Color(0xFF1E3C72)
                                                    )
                                                    
                                                    // Payment Method Badge
                                                    val badgeBg = if (stockIn.paymentMethod == "CREDIT") Color(0xFFFEE2E2) else Color(0xFFE0F2FE)
                                                    val badgeText = if (stockIn.paymentMethod == "CREDIT") Color(0xFFEF4444) else Color(0xFF0284C7)
                                                    Box(
                                                        modifier = Modifier
                                                            .background(badgeBg, RoundedCornerShape(8.dp))
                                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                                    ) {
                                                        Text(
                                                            text = stockIn.paymentMethod,
                                                            color = badgeText,
                                                            fontWeight = FontWeight.Black,
                                                            fontSize = 10.sp
                                                        )
                                                    }
                                                }

                                                Spacer(modifier = Modifier.height(8.dp))
                                                Text(
                                                    text = "Supplier: ${stockIn.supplier ?: "Tidak Ada Supplier"}",
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 14.sp,
                                                    color = Color(0xFF1E293B)
                                                )
                                                
                                                if (!stockIn.notes.isNullOrBlank()) {
                                                    Text(
                                                        text = "Catatan: ${stockIn.notes}",
                                                        fontSize = 12.sp,
                                                        color = Color.Gray
                                                    )
                                                }

                                                Divider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(vertical = 8.dp))

                                                // List Items
                                                var totalTxCost = 0.0
                                                stockIn.items?.forEach { item ->
                                                    val costVal = item.costPrice.toDoubleOrNull() ?: 0.0
                                                    val lineCost = item.quantity * costVal
                                                    totalTxCost += lineCost
                                                    Row(
                                                        modifier = Modifier.fillMaxWidth(),
                                                        horizontalArrangement = Arrangement.SpaceBetween
                                                    ) {
                                                        Text(
                                                            text = "- ${item.Product?.name ?: "Barang Di-delete"} (x${item.quantity})",
                                                            fontSize = 12.sp,
                                                            color = Color(0xFF475569)
                                                        )
                                                        Text(
                                                            text = String.format("Rp %,.0f", lineCost),
                                                            fontSize = 12.sp,
                                                            fontWeight = FontWeight.Bold,
                                                            color = Color(0xFF475569)
                                                        )
                                                    }
                                                }

                                                Divider(color = Color(0xFFF1F5F9), modifier = Modifier.padding(vertical = 8.dp))

                                                // Footer
                                                Row(
                                                    modifier = Modifier.fillMaxWidth(),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Text(
                                                        text = "Total Nilai Barang:",
                                                        fontSize = 13.sp,
                                                        color = Color.Gray,
                                                        fontWeight = FontWeight.Medium
                                                    )
                                                    Text(
                                                        text = String.format("Rp %,.0f", totalTxCost),
                                                        fontWeight = FontWeight.Black,
                                                        fontSize = 15.sp,
                                                        color = Color(0xFF22C55E)
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
    }

    // Modal dialog form Tambah / Edit Produk
    if (showProductDialog) {
        AlertDialog(
            onDismissRequest = { showProductDialog = false },
            title = {
                Text(
                    text = if (editingProduct != null) "Edit Produk" else "Tambah Produk Baru",
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        OutlinedTextField(
                            value = productCode,
                            onValueChange = { productCode = it },
                            label = { Text("Kode Produk") },
                            modifier = Modifier.fillMaxWidth(),
                            trailingIcon = {
                                IconButton(onClick = {
                                    scannerTargetField = "code"
                                    showScannerDialog = true
                                }) {
                                    Icon(imageVector = Icons.Default.Menu, contentDescription = "Scan", tint = Color(0xFF1E3C72))
                                }
                            },
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = productCategory,
                            onValueChange = { productCategory = it },
                            label = { Text("Kategori") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = productName,
                            onValueChange = { productName = it },
                            label = { Text("Nama Produk") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = productPrice,
                            onValueChange = { productPrice = it },
                            label = { Text("Harga Jual (Rp)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = productCostPrice,
                            onValueChange = { productCostPrice = it },
                            label = { Text("Harga Modal (Rp)") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = productStock,
                            onValueChange = { productStock = it },
                            label = { Text("Stok Awal") },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { handleSaveProduct() },
                    enabled = !isSubmitting,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(18.dp))
                    } else {
                        Text("Simpan", color = Color.White)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showProductDialog = false }) {
                    Text("Batal", color = Color.Gray)
                }
            },
            shape = RoundedCornerShape(20.dp)
        )
    }

    // Modal Scanner Overlay
    if (showScannerDialog) {
        InlineScannerDialog(
            onDismiss = { showScannerDialog = false },
            onCodeScanned = { code ->
                vibrateFeedback(context)
                when (scannerTargetField) {
                    "code" -> {
                        productCode = code
                        showScannerDialog = false
                    }
                    "stock_in" -> {
                        // Look up product by code
                        val matchingProduct = productsList.find { it.code.trim().equals(code.trim(), ignoreCase = true) }
                        if (matchingProduct != null) {
                            if (!stockInItems.any { it.product.id == matchingProduct.id }) {
                                stockInItems = stockInItems + TempStockInItem(
                                    product = matchingProduct,
                                    quantity = 1,
                                    costPrice = matchingProduct.costPrice?.toDoubleOrNull() ?: 0.0
                                )
                                Toast.makeText(context, "Ditambahkan: ${matchingProduct.name}", Toast.LENGTH_SHORT).show()
                            } else {
                                Toast.makeText(context, "${matchingProduct.name} sudah ada di daftar. Jumlah dinaikkan.", Toast.LENGTH_SHORT).show()
                                stockInItems = stockInItems.map {
                                    if (it.product.id == matchingProduct.id) it.copy(quantity = it.quantity + 1)
                                    else it
                                }
                            }
                        } else {
                            Toast.makeText(context, "Produk dengan barcode $code tidak ditemukan.", Toast.LENGTH_LONG).show()
                        }
                        showScannerDialog = false
                    }
                    else -> {
                        searchQuery = code
                        showScannerDialog = false
                    }
                }
            }
        )
    }
}

fun formatDateString(isoString: String): String {
    return try {
        // e.g. "2026-06-12T06:17:08.020Z" -> "12 Jun 2026, 06:17"
        val parts = isoString.split("T")
        if (parts.size >= 2) {
            val dateParts = parts[0].split("-")
            val timeParts = parts[1].split(":")
            if (dateParts.size == 3 && timeParts.size >= 2) {
                val day = dateParts[2]
                val months = listOf("Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des")
                val monthIdx = dateParts[1].toIntOrNull()?.minus(1) ?: 0
                val month = if (monthIdx in 0..11) months[monthIdx] else dateParts[1]
                val year = dateParts[0]
                val hour = timeParts[0]
                val minute = timeParts[1]
                return "$day $month $year, $hour:$minute"
            }
        }
        isoString
    } catch (e: Exception) {
        isoString
    }
}

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun InlineScannerDialog(
    onDismiss: () -> Unit,
    onCodeScanned: (String) -> Unit
) {
    val context = LocalContext.current
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f))
        ) {
            if (cameraPermissionState.status.isGranted) {
                InlineCameraScannerView(onCodeScanned = onCodeScanned)
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        "Akses Kamera Dibutuhkan",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Mohon izinkan kamera untuk memindai barcode produk.",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { cameraPermissionState.launchPermissionRequest() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                    ) {
                        Text("Minta Izin")
                    }
                }
            }

            // Close button at top-end
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(24.dp)
                    .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(50))
            ) {
                Icon(imageVector = Icons.Default.Close, contentDescription = "Tutup", tint = Color.White)
            }

            // Target scan boundary layout
            Box(
                modifier = Modifier
                    .size(280.dp, 160.dp)
                    .align(Alignment.Center)
                    .border(3.dp, Color(0xFF3B82F6), RoundedCornerShape(16.dp))
            )

            Text(
                text = "Posisikan barcode produk di dalam bingkai",
                color = Color.White,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 64.dp)
                    .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
    }
}

@Composable
fun InlineCameraScannerView(
    onCodeScanned: (String) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    AndroidView(
        factory = { ctx ->
            val previewView = PreviewView(ctx)
            val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

            cameraProviderFuture.addListener({
                val cameraProvider = cameraProviderFuture.get()
                val preview = Preview.Builder().build().also {
                    it.setSurfaceProvider(previewView.surfaceProvider)
                }

                val imageAnalyzer = ImageAnalysis.Builder()
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .build()
                    .also { analyzer ->
                        analyzer.setAnalyzer(cameraExecutor, QrCodeAnalyzer { scannedCode ->
                            onCodeScanned(scannedCode)
                        })
                    }

                try {
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        imageAnalyzer
                    )
                } catch (exc: Exception) {
                    Log.e("CoopProductsScreen", "Camera binding failed", exc)
                }
            }, ContextCompat.getMainExecutor(ctx))

            previewView
        },
        modifier = Modifier.fillMaxSize()
    )
}

private fun vibrateFeedback(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        vibratorManager.defaultVibrator.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
        @Suppress("DEPRECATION")
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator.vibrate(100)
    }
}
