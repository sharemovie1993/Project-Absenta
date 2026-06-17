package com.absenta.app.ui.features.cooperative

import android.widget.Toast
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
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Settings
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
import com.absenta.app.data.api.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopSettingsScreen(
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val coopService = remember { ApiClient.getClient(context).create(CooperativeService::class.java) }

    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Profil Koperasi", "Kategori Simpanan")

    var isLoading by remember { mutableStateOf(false) }

    // Tab 1 state
    var coopName by remember { mutableStateOf("") }
    var legalNo by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var website by remember { mutableStateOf("") }
    var logoUrl by remember { mutableStateOf("") }
    var interestRate by remember { mutableStateOf("1.5") }
    var bendaharaSign by remember { mutableStateOf("") }
    var ketuaSign by remember { mutableStateOf("") }
    var kepsekSign by remember { mutableStateOf("") }

    // Tab 2 state
    var categories by remember { mutableStateOf<List<CoopSavingCategoryAll>>(emptyList()) }
    var showCategoryDialog by remember { mutableStateOf(false) }
    var editingCategory by remember { mutableStateOf<CoopSavingCategoryAll?>(null) }

    // Category form state
    var catCode by remember { mutableStateOf("") }
    var catName by remember { mutableStateOf("") }
    var catDesc by remember { mutableStateOf("") }
    var catIsMandatory by remember { mutableStateOf(false) }
    var catIsWithdrawable by remember { mutableStateOf(true) }
    var catIsIncludedInShu by remember { mutableStateOf(false) }
    var catDefaultAmount by remember { mutableStateOf("") }
    var catAccountCode by remember { mutableStateOf("2010") }
    var catColor by remember { mutableStateOf("#6B7280") }
    var catWithdrawRule by remember { mutableStateOf("ANYTIME") }

    fun fetchSettings() {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.getSettings()
                if (res.isSuccessful && res.body()?.success == true) {
                    val data = res.body()?.data
                    if (data != null) {
                        coopName = data.cooperative_name
                        legalNo = data.cooperative_legal_no
                        address = data.cooperative_address
                        phone = data.cooperative_phone
                        email = data.cooperative_email
                        website = data.cooperative_website
                        logoUrl = data.cooperative_logo_url
                        interestRate = data.cooperative_default_interest_rate
                        bendaharaSign = data.signatures.bendahara
                        ketuaSign = data.signatures.ketua
                        kepsekSign = data.signatures.kepsek
                    }
                } else {
                    Toast.makeText(context, "Gagal mengambil pengaturan: ${res.message()}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error koneksi: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun fetchCategories() {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.getSavingCategoriesAll()
                if (res.isSuccessful && res.body()?.success == true) {
                    categories = res.body()?.data ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal mengambil kategori simpanan: ${res.message()}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error koneksi: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun saveSettings() {
        isLoading = true
        scope.launch {
            try {
                val req = CoopSettingsUpdateRequest(
                    cooperative_name = coopName,
                    cooperative_legal_no = legalNo,
                    cooperative_address = address,
                    cooperative_phone = phone,
                    cooperative_email = email,
                    cooperative_website = website,
                    cooperative_logo_url = logoUrl,
                    cooperative_default_interest_rate = interestRate
                )
                val res = coopService.updateSettings(req)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Pengaturan koperasi berhasil disimpan!", Toast.LENGTH_SHORT).show()
                    fetchSettings()
                } else {
                    Toast.makeText(context, "Gagal menyimpan: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun saveCategory() {
        if (catCode.isBlank() || catName.isBlank()) {
            Toast.makeText(context, "Kode dan Nama kategori tidak boleh kosong", Toast.LENGTH_SHORT).show()
            return
        }
        val defaultAmt = catDefaultAmount.toDoubleOrNull()
        val req = CoopSavingCategoryRequest(
            code = catCode,
            name = catName,
            description = if (catDesc.isBlank()) null else catDesc,
            isMandatory = catIsMandatory,
            isWithdrawable = catWithdrawRule != "RESIGN_ONLY",
            withdrawRule = catWithdrawRule,
            isIncludedInShu = catIsIncludedInShu,
            defaultAmount = defaultAmt,
            accountCode = catAccountCode,
            color = catColor
        )

        isLoading = true
        scope.launch {
            try {
                val res = if (editingCategory == null) {
                    coopService.createSavingCategory(req)
                } else {
                    coopService.updateSavingCategory(editingCategory!!.id, req)
                }

                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Kategori simpanan berhasil disimpan!", Toast.LENGTH_SHORT).show()
                    showCategoryDialog = false
                    fetchCategories()
                } else {
                    Toast.makeText(context, "Gagal menyimpan kategori: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun toggleCategory(cat: CoopSavingCategoryAll) {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.toggleSavingCategory(cat.id)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Status kategori berhasil diubah!", Toast.LENGTH_SHORT).show()
                    fetchCategories()
                } else {
                    Toast.makeText(context, "Gagal mengubah status: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun deleteCategory(cat: CoopSavingCategoryAll) {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.deleteSavingCategory(cat.id)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Kategori simpanan berhasil dihapus!", Toast.LENGTH_SHORT).show()
                    fetchCategories()
                } else {
                    Toast.makeText(context, "Gagal menghapus: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(selectedTab) {
        if (selectedTab == 0) {
            fetchSettings()
        } else {
            fetchCategories()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengaturan Koperasi", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3C72))
            )
        },
        floatingActionButton = {
            if (selectedTab == 1) {
                FloatingActionButton(
                    onClick = {
                        editingCategory = null
                        catCode = ""
                        catName = ""
                        catDesc = ""
                        catIsMandatory = false
                        catIsWithdrawable = true
                        catIsIncludedInShu = false
                        catDefaultAmount = ""
                        catAccountCode = "2010"
                        catColor = "#6B7280"
                        catWithdrawRule = "ANYTIME"
                        showCategoryDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Kategori")
                }
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72)
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp) }
                    )
                }
            }

            if (isLoading && categories.isEmpty() && coopName.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                when (selectedTab) {
                    0 -> {
                        // Profil Koperasi
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            item {
                                Text(
                                    "Identitas Koperasi",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E3C72)
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = coopName,
                                    onValueChange = { coopName = it },
                                    label = { Text("Nama Koperasi") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = legalNo,
                                    onValueChange = { legalNo = it },
                                    label = { Text("Nomor Badan Hukum") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = address,
                                    onValueChange = { address = it },
                                    label = { Text("Alamat") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = phone,
                                    onValueChange = { phone = it },
                                    label = { Text("Nomor Telepon") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    label = { Text("Email") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email)
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = website,
                                    onValueChange = { website = it },
                                    label = { Text("Website") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = logoUrl,
                                    onValueChange = { logoUrl = it },
                                    label = { Text("URL Logo Koperasi") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = interestRate,
                                    onValueChange = { interestRate = it },
                                    label = { Text("Bunga Pinjaman Default (%)") },
                                    modifier = Modifier.fillMaxWidth(),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                                )
                            }

                            // Signatures section
                            item {
                                Spacer(modifier = Modifier.height(16.dp))
                                Text(
                                    "Pejabat Penandatangan (Dinamis)",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF1E3C72)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Dibaca otomatis berdasarkan struktur organisasi aktif sekolah.",
                                    fontSize = 11.sp,
                                    color = Color.Gray
                                )
                            }
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color(0xFFF8FAFC)),
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Ketua Koperasi:", fontSize = 12.sp, color = Color.Gray)
                                            Text(ketuaSign.ifBlank { "Belum ditunjuk" }, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Bendahara Koperasi:", fontSize = 12.sp, color = Color.Gray)
                                            Text(bendaharaSign.ifBlank { "Belum ditunjuk" }, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Pembina (Kepala Sekolah):", fontSize = 12.sp, color = Color.Gray)
                                            Text(kepsekSign.ifBlank { "Belum ditunjuk" }, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }

                            item {
                                Button(
                                    onClick = { saveSettings() },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 16.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                    shape = RoundedCornerShape(12.dp),
                                    enabled = !isLoading
                                ) {
                                    if (isLoading) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp))
                                    } else {
                                        Text("Simpan Pengaturan Profil", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                    1 -> {
                        // Kategori Simpanan List
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (categories.isEmpty()) {
                                item {
                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 40.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text("Belum ada kategori simpanan.", color = Color.Gray)
                                    }
                                }
                            } else {
                                items(categories) { cat ->
                                    Card(
                                        modifier = Modifier.fillMaxWidth(),
                                        colors = CardDefaults.cardColors(containerColor = Color.White),
                                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Column(modifier = Modifier.padding(16.dp)) {
                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column(modifier = Modifier.weight(1f)) {
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                        Text(
                                                            cat.name,
                                                            fontWeight = FontWeight.Bold,
                                                            fontSize = 14.sp,
                                                            color = Color(0xFF1E293B)
                                                        )
                                                        Box(
                                                            modifier = Modifier
                                                                .background(
                                                                    color = Color(android.graphics.Color.parseColor(cat.color ?: "#6B7280")).copy(alpha = 0.1f),
                                                                    shape = RoundedCornerShape(4.dp)
                                                                )
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text(
                                                                cat.code,
                                                                fontSize = 9.sp,
                                                                fontWeight = FontWeight.Bold,
                                                                color = Color(android.graphics.Color.parseColor(cat.color ?: "#6B7280"))
                                                            )
                                                        }
                                                    }
                                                    if (!cat.description.isNullOrBlank()) {
                                                        Text(
                                                            cat.description,
                                                            fontSize = 11.sp,
                                                            color = Color.Gray,
                                                            modifier = Modifier.padding(top = 2.dp)
                                                        )
                                                    }
                                                }
                                                // Active toggle switch
                                                Switch(
                                                    checked = cat.isActive,
                                                    onCheckedChange = { toggleCategory(cat) },
                                                    colors = SwitchDefaults.colors(
                                                        checkedThumbColor = Color.White,
                                                        checkedTrackColor = Color(0xFF10B981)
                                                    )
                                                )
                                            }

                                            Spacer(modifier = Modifier.height(10.dp))
                                            HorizontalDivider(color = Color(0xFFF1F5F9))
                                            Spacer(modifier = Modifier.height(10.dp))

                                            Row(
                                                modifier = Modifier.fillMaxWidth(),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                // Badges row
                                                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                    if (cat.isMandatory) {
                                                        Box(
                                                            modifier = Modifier
                                                                .background(Color(0xFFFEE2E2), RoundedCornerShape(4.dp))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text("Wajib Setor", fontSize = 9.sp, color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                                                        }
                                                    }
                                                    val withdrawLabel = when (cat.withdrawRule) {
                                                        "ANYTIME" -> "Bisa Ditarik"
                                                        "RESIGN_ONLY" -> "Keluar Anggota"
                                                        "YEAR_END" -> "Akhir Tahun Buku"
                                                        "HOLIDAY" -> "Jelang Hari Raya"
                                                        else -> if (cat.isWithdrawable) "Bisa Ditarik" else "Keluar Anggota"
                                                    }
                                                    val withdrawBg = if (cat.withdrawRule == "RESIGN_ONLY" || !cat.isWithdrawable) Color(0xFFF1F5F9) else Color(0xFFD1FAE5)
                                                    val withdrawColor = if (cat.withdrawRule == "RESIGN_ONLY" || !cat.isWithdrawable) Color(0xFF64748B) else Color(0xFF10B981)
                                                    Box(
                                                        modifier = Modifier
                                                            .background(withdrawBg, RoundedCornerShape(4.dp))
                                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                                    ) {
                                                        Text(withdrawLabel, fontSize = 9.sp, color = withdrawColor, fontWeight = FontWeight.Bold)
                                                    }
                                                    if (cat.isIncludedInShu) {
                                                        Box(
                                                            modifier = Modifier
                                                                .background(Color(0xFFFEF3C7), RoundedCornerShape(4.dp))
                                                                .padding(horizontal = 6.dp, vertical = 2.dp)
                                                        ) {
                                                            Text("Masuk SHU", fontSize = 9.sp, color = Color(0xFFD97706), fontWeight = FontWeight.Bold)
                                                        }
                                                    }
                                                }

                                                // Edit / Delete buttons
                                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                    IconButton(
                                                        onClick = {
                                                            editingCategory = cat
                                                            catCode = cat.code
                                                            catName = cat.name
                                                            catDesc = cat.description ?: ""
                                                            catIsMandatory = cat.isMandatory
                                                            catIsWithdrawable = cat.isWithdrawable
                                                            catIsIncludedInShu = cat.isIncludedInShu
                                                            catDefaultAmount = cat.defaultAmount?.toString() ?: ""
                                                            catAccountCode = cat.accountCode ?: "2010"
                                                            catColor = cat.color ?: "#6B7280"
                                                            catWithdrawRule = cat.withdrawRule ?: "ANYTIME"
                                                            showCategoryDialog = true
                                                        },
                                                        modifier = Modifier.size(28.dp)
                                                    ) {
                                                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF1E3C72), modifier = Modifier.size(16.dp))
                                                    }
                                                    IconButton(
                                                        onClick = { deleteCategory(cat) },
                                                        modifier = Modifier.size(28.dp),
                                                        enabled = (cat._count?.Savings ?: 0) == 0
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Delete,
                                                            contentDescription = "Hapus",
                                                            tint = if ((cat._count?.Savings ?: 0) == 0) Color(0xFFEF4444) else Color.LightGray,
                                                            modifier = Modifier.size(16.dp)
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
    }

    // Dialog Tambah/Edit Kategori Simpanan
    if (showCategoryDialog) {
        AlertDialog(
            onDismissRequest = { showCategoryDialog = false },
            title = {
                Text(
                    text = if (editingCategory == null) "Tambah Jenis Simpanan" else "Edit Jenis Simpanan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    item {
                        OutlinedTextField(
                            value = catCode,
                            onValueChange = { catCode = it },
                            label = { Text("Kode Kategori (Contoh: POKOK, SHR)") },
                            modifier = Modifier.fillMaxWidth(),
                            enabled = editingCategory == null // Kode tidak bisa diubah setelah dibuat
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = catName,
                            onValueChange = { catName = it },
                            label = { Text("Nama Jenis Simpanan") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = catDesc,
                            onValueChange = { catDesc = it },
                            label = { Text("Deskripsi") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = catDefaultAmount,
                            onValueChange = { catDefaultAmount = it },
                            label = { Text("Nominal Default (Opsional)") },
                            modifier = Modifier.fillMaxWidth(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                        )
                    }
                    item {
                        OutlinedTextField(
                            value = catAccountCode,
                            onValueChange = { catAccountCode = it },
                            label = { Text("Kode Akun Akuntansi") },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }

                    // Switches
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Wajib Setor?", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("Apakah tabungan wajib disetor berkala", fontSize = 10.sp, color = Color.Gray)
                            }
                            Checkbox(
                                checked = catIsMandatory,
                                onCheckedChange = { catIsMandatory = it }
                            )
                        }
                    }
                    // Color Selection Row
                    item {
                        Text("Pilih Warna Kategori", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                        ) {
                            val presetColors = listOf("#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#6B7280")
                            presetColors.forEach { hex ->
                                val color = Color(android.graphics.Color.parseColor(hex))
                                val isSelected = catColor == hex
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(color, RoundedCornerShape(18.dp))
                                        .border(
                                            width = if (isSelected) 3.dp else 0.dp,
                                            color = if (isSelected) Color.Black else Color.Transparent,
                                            shape = RoundedCornerShape(18.dp)
                                        )
                                        .clickable { catColor = hex }
                                )
                            }
                        }
                    }

                    // Withdraw Rule Dropdown
                    item {
                        var expanded by remember { mutableStateOf(false) }
                        val rules = listOf(
                            "ANYTIME" to "Bisa ditarik kapan saja",
                            "RESIGN_ONLY" to "Hanya saat keluar anggota",
                            "YEAR_END" to "Hanya di akhir tahun buku",
                            "HOLIDAY" to "Hanya menjelang hari raya"
                        )
                        val currentSelectedLabel = rules.find { it.first == catWithdrawRule }?.second ?: "Bisa ditarik kapan saja"

                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = !expanded },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            OutlinedTextField(
                                value = currentSelectedLabel,
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Aturan Penarikan Dana") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                modifier = Modifier.menuAnchor().fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            )
                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false }
                            ) {
                                rules.forEach { (value, label) ->
                                    DropdownMenuItem(
                                        text = { Text(label) },
                                        onClick = {
                                            catWithdrawRule = value
                                            expanded = false
                                        }
                                    )
                                }
                            }
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Dapat Pembagian SHU?", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Text("Perhitungan Jasa Modal dari saldo ini", fontSize = 10.sp, color = Color.Gray)
                            }
                            Checkbox(
                                checked = catIsIncludedInShu,
                                onCheckedChange = { catIsIncludedInShu = it }
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { saveCategory() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Simpan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCategoryDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}
