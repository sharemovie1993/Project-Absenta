package com.absenta.app.ui.features.cooperative

import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CartItemRequest
import com.absenta.app.data.api.CheckoutRequest
import com.absenta.app.data.api.CoopMember
import com.absenta.app.data.api.CoopProduct
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch

data class CartItem(
    val product: CoopProduct,
    var quantity: Int
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun POSScreen(
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
            featureName = "POS Kasir Koperasi",
            description = "Fitur Point of Sale kasir koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Operator can assign checkout to a member
    val isOperator = remember(userRole, capabilities) {
        userRole == "admin" || userRole == "superadmin" ||
                capabilities.any { it.contains("KOPERASI", ignoreCase = true) || it.contains("COOPERATIVE", ignoreCase = true) }
    }

    var productList by remember { mutableStateOf<List<CoopProduct>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    val cart = remember { mutableStateListOf<CartItem>() }
    var isLoading by remember { mutableStateOf(true) }
    var isProcessingCheckout by remember { mutableStateOf(false) }

    // Member picker for operator checkout
    var membersList by remember { mutableStateOf<List<CoopMember>>(emptyList()) }
    var selectedMember by remember { mutableStateOf<CoopMember?>(null) }
    var memberSearchQuery by remember { mutableStateOf("") }
    var showMemberPicker by remember { mutableStateOf(false) }

    var showScannerDialog by remember { mutableStateOf(false) }

    fun vibrateFeedback(context: android.content.Context) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(android.content.Context.VIBRATOR_MANAGER_SERVICE) as android.os.VibratorManager
                vibratorManager.defaultVibrator.vibrate(android.os.VibrationEffect.createOneShot(100, android.os.VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(android.content.Context.VIBRATOR_SERVICE) as android.os.Vibrator
                vibrator.vibrate(100)
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "Vibration failed", e)
        }
    }

    fun addProductByBarcode(code: String) {
        val product = productList.find { it.code.equals(code, ignoreCase = true) }
        if (product != null) {
            val existing = cart.find { it.product.id == product.id }
            if (existing != null) {
                if (existing.quantity < product.stock) {
                    existing.quantity++
                    val idx = cart.indexOf(existing)
                    cart[idx] = existing.copy()
                    Toast.makeText(context, "${product.name} ditambah (x${existing.quantity})", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Stok tidak mencukupi", Toast.LENGTH_SHORT).show()
                }
            } else {
                if (product.stock > 0) {
                    cart.add(CartItem(product, 1))
                    Toast.makeText(context, "${product.name} masuk keranjang", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Stok habis", Toast.LENGTH_SHORT).show()
                }
            }
        } else {
            Toast.makeText(context, "Produk dengan barcode '$code' tidak ditemukan", Toast.LENGTH_LONG).show()
        }
    }

    fun loadProducts() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "loadProducts triggered in POSScreen.")
            try {
                val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                val response = service.getProducts()
                if (response.isSuccessful && response.body() != null) {
                    productList = response.body()!!
                    Log.d("AbsentaDebug", "loadProducts success: Count=${productList.size}")
                } else {
                    Log.w("AbsentaDebug", "loadProducts failed: Code=${response.code()}")
                    Toast.makeText(context, "Gagal memuat produk", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadProducts error", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
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
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "loadMembers error", e)
            }
        }
    }

    LaunchedEffect(Unit) {
        loadProducts()
        if (isOperator) loadMembers()
    }

    val filteredProducts = remember(productList, searchQuery) {
        productList.filter {
            it.name.contains(searchQuery, ignoreCase = true) || it.code.contains(searchQuery, ignoreCase = true)
        }
    }

    val totalAmount = remember(cart) {
        cart.sumOf { (it.product.price?.toDoubleOrNull() ?: 0.0) * it.quantity }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("POS Kasir Koperasi", fontWeight = FontWeight.Bold) },
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
        Row(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Left Side: Product List & Search
            Column(
                modifier = Modifier
                    .weight(1.5f)
                    .fillMaxHeight()
                    .padding(16.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari produk atau barcode...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                    trailingIcon = {
                        IconButton(onClick = { showScannerDialog = true }) {
                            Icon(Icons.Default.Menu, contentDescription = "Scan Barcode", tint = Color(0xFF1E3C72))
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(16.dp))

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (filteredProducts.isEmpty()) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("Produk tidak ditemukan", color = Color.Gray)
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(filteredProducts) { product ->
                            ProductRowItem(
                                product = product,
                                onAddToCart = {
                                    val existing = cart.find { it.product.id == product.id }
                                    if (existing != null) {
                                        if (existing.quantity < product.stock) {
                                            existing.quantity++
                                            // Force list update
                                            val idx = cart.indexOf(existing)
                                            cart[idx] = existing.copy()
                                        } else {
                                            Toast.makeText(context, "Stok tidak mencukupi", Toast.LENGTH_SHORT).show()
                                        }
                                    } else {
                                        if (product.stock > 0) {
                                            cart.add(CartItem(product, 1))
                                        } else {
                                            Toast.makeText(context, "Stok habis", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }

            // Right Side: Shopping Cart Summary
            Card(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(top = 16.dp, bottom = 16.dp, end = 16.dp),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    Text(
                        text = "KERANJANG BELANJA",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Cart Items list
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(cart) { item ->
                            CartRowItem(
                                item = item,
                                onIncrease = {
                                    if (item.quantity < item.product.stock) {
                                        item.quantity++
                                        val idx = cart.indexOf(item)
                                        cart[idx] = item.copy()
                                    } else {
                                        Toast.makeText(context, "Stok tidak mencukupi", Toast.LENGTH_SHORT).show()
                                    }
                                },
                                onDecrease = {
                                    if (item.quantity > 1) {
                                        item.quantity--
                                        val idx = cart.indexOf(item)
                                        cart[idx] = item.copy()
                                    } else {
                                        cart.remove(item)
                                    }
                                }
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(16.dp))

                    // Member Picker (Operator only)
                    if (isOperator) {
                        Text("CHECKOUT UNTUK ANGGOTA", fontSize = 10.sp, fontWeight = FontWeight.Black, color = Color.Gray)
                        Spacer(modifier = Modifier.height(6.dp))
                        if (selectedMember != null) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFF1E3C72).copy(alpha = 0.08f))
                            ) {
                                Row(
                                    modifier = Modifier.padding(8.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF1E3C72), modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(selectedMember!!.name, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF1E293B))
                                        Text("No: ${selectedMember!!.memberNo}", fontSize = 9.sp, color = Color.Gray)
                                    }
                                    IconButton(onClick = { selectedMember = null }, modifier = Modifier.size(20.dp)) {
                                        Icon(Icons.Default.Close, contentDescription = "Hapus", modifier = Modifier.size(14.dp), tint = Color.Gray)
                                    }
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = memberSearchQuery,
                                onValueChange = {
                                    memberSearchQuery = it
                                    showMemberPicker = true
                                },
                                placeholder = { Text("Cari anggota...", fontSize = 11.sp) },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                textStyle = androidx.compose.ui.text.TextStyle(fontSize = 11.sp)
                            )
                            DropdownMenu(
                                expanded = showMemberPicker && memberSearchQuery.isNotBlank(),
                                onDismissRequest = { showMemberPicker = false }
                            ) {
                                val filtered = membersList.filter {
                                    it.name.contains(memberSearchQuery, ignoreCase = true) ||
                                            it.memberNo.contains(memberSearchQuery, ignoreCase = true)
                                }.take(10)
                                if (filtered.isEmpty()) {
                                    DropdownMenuItem(
                                        text = { Text("Tidak ditemukan", fontSize = 11.sp, color = Color.Gray) },
                                        onClick = {}
                                    )
                                } else {
                                    filtered.forEach { member ->
                                        DropdownMenuItem(
                                            text = {
                                                Text("${member.name} (${member.memberNo})", fontSize = 11.sp)
                                            },
                                            onClick = {
                                                selectedMember = member
                                                memberSearchQuery = ""
                                                showMemberPicker = false
                                            }
                                        )
                                    }
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider()
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    // Price Total
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Total Tagihan", fontWeight = FontWeight.Bold, color = Color.Gray, fontSize = 12.sp)
                        Text(
                            text = String.format("Rp %,.0f", totalAmount),
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                            color = Color(0xFF1E3C72)
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))

                    if (isProcessingCheckout) {
                        Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF1E3C72))
                        }
                    } else {
                        Button(
                            onClick = {
                                if (cart.isEmpty()) {
                                    Log.w("AbsentaDebug", "Checkout aborted: Cart is empty.")
                                    Toast.makeText(context, "Keranjang belanja kosong", Toast.LENGTH_SHORT).show()
                                    return@Button
                                }
                                Log.d("AbsentaDebug", "Triggering checkout with cart items: ${cart.map { "${it.product.name} (x${it.quantity})" }}")
                                scope.launch {
                                    isProcessingCheckout = true
                                    try {
                                        val service = ApiClient.getClient(context).create(CooperativeService::class.java)
                                        val itemsPayload = cart.map { CartItemRequest(it.product.id, it.quantity) }
                                        val response = service.checkout(CheckoutRequest(itemsPayload, memberId = selectedMember?.id))
                                        if (response.isSuccessful && response.body()?.success == true) {
                                            Log.d("AbsentaDebug", "Checkout successful: ${response.body()?.message}")
                                            Toast.makeText(context, "Transaksi Berhasil!", Toast.LENGTH_LONG).show()
                                            cart.clear()
                                            selectedMember = null
                                            loadProducts()
                                        } else {
                                            val errorMsg = response.body()?.message ?: "Transaksi gagal."
                                            Log.w("AbsentaDebug", "Checkout failed: Code=${response.code()}, Message=$errorMsg")
                                            Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("AbsentaDebug", "Checkout exception occurred", e)
                                        Toast.makeText(context, "Error checkout: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                    } finally {
                                        isProcessingCheckout = false
                                    }
                                }
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                        ) {
                            Text("Bayar Sekarang", fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }
        }
        
        if (showScannerDialog) {
            InlineScannerDialog(
                onDismiss = { showScannerDialog = false },
                onCodeScanned = { code ->
                    vibrateFeedback(context)
                    addProductByBarcode(code)
                    showScannerDialog = false
                }
            )
        }
    }
}

@Composable
fun ProductRowItem(product: CoopProduct, onAddToCart: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onAddToCart() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column {
                Text(product.name, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E293B))
                Text(
                    text = String.format("Rp %,.0f", product.price?.toDoubleOrNull() ?: 0.0),
                    fontSize = 13.sp,
                    color = Color(0xFF1E3C72),
                    fontWeight = FontWeight.Black,
                    modifier = Modifier.padding(top = 2.dp)
                )
                Text(
                    text = "Stok: ${product.stock} pcs",
                    fontSize = 11.sp,
                    color = if (product.stock > 0) Color.Gray else Color.Red,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(top = 2.dp)
                )
            }

            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(Color(0xFF1E3C72).copy(alpha = 0.1f), RoundedCornerShape(8.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(Icons.Default.Add, contentDescription = "Add", tint = Color(0xFF1E3C72))
            }
        }
    }
}

@Composable
fun CartRowItem(item: CartItem, onIncrease: () -> Unit, onDecrease: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(item.product.name, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
            Text(
                text = String.format("Rp %,.0f", (item.product.price?.toDoubleOrNull() ?: 0.0) * item.quantity),
                fontSize = 11.sp,
                color = Color.Gray
            )
        }

        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            IconButton(
                onClick = onDecrease,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(Icons.Default.Delete, contentDescription = "Decrease", modifier = Modifier.size(16.dp))
            }

            Text(
                text = item.quantity.toString(),
                fontSize = 12.sp,
                fontWeight = FontWeight.Black,
                modifier = Modifier.width(20.dp),
                textAlign = TextAlign.Center
            )

            IconButton(
                onClick = onIncrease,
                modifier = Modifier.size(24.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Increase", modifier = Modifier.size(16.dp))
            }
        }
    }
}
