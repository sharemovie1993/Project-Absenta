package com.absenta.app.ui.features.cooperative

import android.graphics.Bitmap
import android.graphics.Color as AndroidColor
import android.widget.Toast
import androidx.compose.foundation.Image
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopMembersScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val coopService = remember { ApiClient.getClient(context).create(CooperativeService::class.java) }
    val academicService = remember { ApiClient.getClient(context).create(AcademicService::class.java) }

    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val capabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())

    // Premium Gate Check
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Manajemen Anggota Koperasi",
            description = "Fitur cetak kartu virtual, pendaftaran anggota, dan penonaktifan keanggotaan memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Role detection
    val isOperator = remember(userRole, capabilities) {
        val role = userRole?.uppercase() ?: ""
        role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN" ||
                capabilities.contains("cooperative.members.manage") ||
                capabilities.contains("cooperative.savings.deposit")
    }

    // States
    var isLoading by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Daftar Anggota", "Registrasi Anggota")

    // Personal member view states
    var myMemberInfo by remember { mutableStateOf<CoopMember?>(null) }
    var myMemberStatus by remember { mutableStateOf("loading") } // "loading", "member", "non-member"

    // Operator states
    var membersList by remember { mutableStateOf<List<CoopMember>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var selectedMemberForCard by remember { mutableStateOf<CoopMember?>(null) }
    var terminatingMember by remember { mutableStateOf<CoopMember?>(null) }

    // Registration states
    var regMemberNo by remember { mutableStateOf("") }
    var regType by remember { mutableStateOf("STUDENT") } // "STUDENT" | "TEACHER" | "GENERAL"
    var isExternal by remember { mutableStateOf(false) }
    var regSiswaId by remember { mutableStateOf<String?>(null) }
    var regSiswaName by remember { mutableStateOf("") }
    var regGuruId by remember { mutableStateOf<String?>(null) }
    var regGuruName by remember { mutableStateOf("") }
    var regUserId by remember { mutableStateOf<String?>(null) }
    var regName by remember { mutableStateOf("") }
    var regAddress by remember { mutableStateOf("") }
    var regPhone by remember { mutableStateOf("") }
    var regEmail by remember { mutableStateOf("") }

    // Dialog pickers
    var showSiswaPicker by remember { mutableStateOf(false) }
    var showGuruPicker by remember { mutableStateOf(false) }

    val filteredMembers = remember(membersList, searchQuery) {
        if (searchQuery.isBlank()) {
            membersList
        } else {
            membersList.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                        it.memberNo.contains(searchQuery, ignoreCase = true) ||
                        (it.phone ?: "").contains(searchQuery, ignoreCase = true)
            }
        }
    }

    fun loadPersonalMember() {
        myMemberStatus = "loading"
        scope.launch {
            try {
                val res = coopService.getMemberMe()
                if (res.isSuccessful && res.body()?.success == true) {
                    val data = res.body()?.data
                    if (data != null && data.status == "ACTIVE") {
                        myMemberInfo = data
                        myMemberStatus = "member"
                    } else {
                        myMemberStatus = "non-member"
                    }
                } else {
                    myMemberStatus = "non-member"
                }
            } catch (e: Exception) {
                myMemberStatus = "non-member"
            }
        }
    }

    fun fetchMembers() {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.getMembers()
                if (res.isSuccessful) {
                    membersList = res.body() ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal mengambil daftar anggota", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error koneksi: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun fetchNextNumber() {
        scope.launch {
            try {
                val res = coopService.getNextMemberNumber()
                if (res.isSuccessful && res.body()?.success == true) {
                    regMemberNo = res.body()?.data ?: ""
                }
            } catch (e: Exception) {
                // Ignore, let user write manually
            }
        }
    }

    fun registerMember() {
        if (regMemberNo.isBlank()) {
            Toast.makeText(context, "Nomor Anggota wajib diisi", Toast.LENGTH_SHORT).show()
            return
        }
        if (isExternal && regName.isBlank()) {
            Toast.makeText(context, "Nama Anggota eksternal wajib diisi", Toast.LENGTH_SHORT).show()
            return
        }
        if (!isExternal && regSiswaId == null && regGuruId == null) {
            Toast.makeText(context, "Silakan pilih Siswa atau Guru terlebih dahulu", Toast.LENGTH_SHORT).show()
            return
        }

        isLoading = true
        scope.launch {
            try {
                val req = CoopMemberCreateRequest(
                    memberNo = regMemberNo,
                    type = if (isExternal) "GENERAL" else regType,
                    siswaId = if (isExternal) null else regSiswaId,
                    guruId = if (isExternal) null else regGuruId,
                    userId = if (isExternal) null else regUserId,
                    isExternal = isExternal,
                    name = if (isExternal) regName else null,
                    address = regAddress.ifBlank { null },
                    phone = regPhone.ifBlank { null },
                    email = regEmail.ifBlank { null }
                )
                val res = coopService.createMember(req)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(
                        context,
                        if (isExternal) "Anggota eksternal berhasil ditambahkan!" else "Anggota berhasil didaftarkan!",
                        Toast.LENGTH_SHORT
                    ).show()
                    
                    // Reset form
                    regName = ""
                    regSiswaId = null
                    regSiswaName = ""
                    regGuruId = null
                    regGuruName = ""
                    regUserId = null
                    regAddress = ""
                    regPhone = ""
                    regEmail = ""
                    
                    fetchNextNumber()
                    fetchMembers()
                    selectedTab = 0
                } else {
                    Toast.makeText(context, "Gagal mendaftar: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun terminateMemberConfirm() {
        val member = terminatingMember ?: return
        isLoading = true
        scope.launch {
            try {
                val res = coopService.terminateMember(member.id)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Keanggotaan berhasil diterminasi!", Toast.LENGTH_SHORT).show()
                    terminatingMember = null
                    fetchMembers()
                } else {
                    Toast.makeText(context, "Gagal terminasi: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(isOperator, selectedTab) {
        if (!isOperator) {
            loadPersonalMember()
        } else {
            if (selectedTab == 0) {
                fetchMembers()
            } else {
                fetchNextNumber()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(if (isOperator) "Manajemen Anggota" else "Kartu Koperasi Saya", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3C72))
            )
        }
    ) { paddingValues ->
        if (!isOperator) {
            // Personal View: Show own virtual card
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentAlignment = Alignment.Center
            ) {
                when (myMemberStatus) {
                    "loading" -> CircularProgressIndicator(color = Color(0xFF1E3C72))
                    "non-member" -> {
                        Column(
                            modifier = Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(64.dp))
                            Text(
                                "Anda Belum Terdaftar",
                                fontWeight = FontWeight.Bold,
                                fontSize = 18.sp,
                                color = Color(0xFF1E293B)
                            )
                            Text(
                                "Silakan hubungi Bendahara atau Pengurus Koperasi sekolah untuk melakukan pendaftaran anggota koperasi.",
                                textAlign = TextAlign.Center,
                                color = Color.Gray,
                                fontSize = 13.sp
                            )
                        }
                    }
                    "member" -> {
                        myMemberInfo?.let {
                            VirtualMemberCard(member = it)
                        }
                    }
                }
            }
        } else {
            // Operator View: Tabs
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

                if (isLoading && membersList.isEmpty() && selectedTab == 0) {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else {
                    when (selectedTab) {
                        0 -> {
                            // Tab 1: Member List
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color(0xFFF8FAFC))
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                OutlinedTextField(
                                    value = searchQuery,
                                    onValueChange = { searchQuery = it },
                                    placeholder = { Text("Cari Anggota (Nama / Nomor)...") },
                                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedContainerColor = Color.White, unfocusedContainerColor = Color.White)
                                )

                                LazyColumn(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    if (filteredMembers.isEmpty()) {
                                        item {
                                            Box(modifier = Modifier.fillMaxWidth().padding(top = 42.dp), contentAlignment = Alignment.Center) {
                                                Text("Tidak ditemukan data anggota.", color = Color.Gray)
                                            }
                                        }
                                    } else {
                                        items(filteredMembers) { member ->
                                            Card(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable { selectedMemberForCard = member },
                                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                                shape = RoundedCornerShape(16.dp)
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(16.dp),
                                                    horizontalArrangement = Arrangement.SpaceBetween,
                                                    verticalAlignment = Alignment.CenterVertically
                                                ) {
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Row(
                                                            verticalAlignment = Alignment.CenterVertically,
                                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                                        ) {
                                                            Text(
                                                                text = member.name,
                                                                fontWeight = FontWeight.Bold,
                                                                fontSize = 14.sp,
                                                                color = Color(0xFF1E293B)
                                                            )
                                                            
                                                            Box(
                                                                modifier = Modifier
                                                                    .background(
                                                                        color = when (member.type) {
                                                                            "STUDENT" -> Color(0xFF3B82F6).copy(alpha = 0.1f)
                                                                            "TEACHER" -> Color(0xFF10B981).copy(alpha = 0.1f)
                                                                            else -> Color(0xFF64748B).copy(alpha = 0.1f)
                                                                        },
                                                                        shape = RoundedCornerShape(4.dp)
                                                                    )
                                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                                            ) {
                                                                Text(
                                                                    text = when (member.type) {
                                                                        "STUDENT" -> "Siswa"
                                                                        "TEACHER" -> "Guru"
                                                                        else -> "Umum"
                                                                    },
                                                                    fontSize = 9.sp,
                                                                    fontWeight = FontWeight.Bold,
                                                                    color = when (member.type) {
                                                                        "STUDENT" -> Color(0xFF3B82F6)
                                                                        "TEACHER" -> Color(0xFF10B981)
                                                                        else -> Color(0xFF64748B)
                                                                    }
                                                                )
                                                            }
                                                        }

                                                        Text(
                                                            text = "No. Anggota: ${member.memberNo}",
                                                            fontSize = 11.sp,
                                                            color = Color.Gray,
                                                            modifier = Modifier.padding(top = 2.dp)
                                                        )
                                                        if (!member.phone.isNullOrBlank()) {
                                                            Text(
                                                                text = "Telp: ${member.phone}",
                                                                fontSize = 11.sp,
                                                                color = Color.Gray
                                                            )
                                                        }
                                                    }

                                                    IconButton(
                                                        onClick = { terminatingMember = member },
                                                        modifier = Modifier.size(32.dp)
                                                    ) {
                                                        Icon(
                                                            Icons.Default.Delete,
                                                            contentDescription = "Terminasi",
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
                        1 -> {
                            // Tab 2: Registrasi Anggota
                            LazyColumn(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color(0xFFF8FAFC))
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                item {
                                    Text("Pilih Tipe Pendaftaran", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                }

                                item {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                isExternal = false
                                                regType = "STUDENT"
                                                regSiswaId = null
                                                regSiswaName = ""
                                                regGuruId = null
                                                regGuruName = ""
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = if (!isExternal && regType == "STUDENT") Color(0xFF1E3C72) else Color(0xFFECEFF1)),
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Siswa", color = if (!isExternal && regType == "STUDENT") Color.White else Color.Black, fontSize = 12.sp)
                                        }

                                        Button(
                                            onClick = {
                                                isExternal = false
                                                regType = "TEACHER"
                                                regSiswaId = null
                                                regSiswaName = ""
                                                regGuruId = null
                                                regGuruName = ""
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = if (!isExternal && regType == "TEACHER") Color(0xFF1E3C72) else Color(0xFFECEFF1)),
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Guru / Staf", color = if (!isExternal && regType == "TEACHER") Color.White else Color.Black, fontSize = 12.sp)
                                        }

                                        Button(
                                            onClick = {
                                                isExternal = true
                                                regType = "GENERAL"
                                                regSiswaId = null
                                                regSiswaName = ""
                                                regGuruId = null
                                                regGuruName = ""
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = if (isExternal) Color(0xFF1E3C72) else Color(0xFFECEFF1)),
                                            modifier = Modifier.weight(1f),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Text("Eksternal", color = if (isExternal) Color.White else Color.Black, fontSize = 12.sp)
                                        }
                                    }
                                }

                                item {
                                    OutlinedTextField(
                                        value = regMemberNo,
                                        onValueChange = { regMemberNo = it },
                                        label = { Text("Nomor Anggota") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                if (!isExternal) {
                                    item {
                                        Card(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    if (regType == "STUDENT") showSiswaPicker = true else showGuruPicker = true
                                                },
                                            colors = CardDefaults.cardColors(containerColor = Color.White),
                                            border = CardDefaults.outlinedCardBorder()
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(16.dp),
                                                horizontalArrangement = Arrangement.SpaceBetween,
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column {
                                                    Text(
                                                        text = if (regType == "STUDENT") "Pilih Siswa Sekolah" else "Pilih Guru/Staf Sekolah",
                                                        fontSize = 11.sp,
                                                        color = Color.Gray
                                                    )
                                                    Text(
                                                        text = if (regType == "STUDENT") {
                                                            regSiswaName.ifBlank { "Belum dipilih" }
                                                        } else {
                                                            regGuruName.ifBlank { "Belum dipilih" }
                                                        },
                                                        fontWeight = FontWeight.Bold,
                                                        fontSize = 14.sp
                                                    )
                                                }
                                                Icon(Icons.Default.ArrowDropDown, contentDescription = null)
                                            }
                                        }
                                    }
                                } else {
                                    item {
                                        OutlinedTextField(
                                            value = regName,
                                            onValueChange = { regName = it },
                                            label = { Text("Nama Lengkap") },
                                            modifier = Modifier.fillMaxWidth()
                                        )
                                    }
                                }

                                item {
                                    OutlinedTextField(
                                        value = regAddress,
                                        onValueChange = { regAddress = it },
                                        label = { Text("Alamat (Opsional)") },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                item {
                                    OutlinedTextField(
                                        value = regPhone,
                                        onValueChange = { regPhone = it },
                                        label = { Text("Nomor Telepon (Opsional)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                item {
                                    OutlinedTextField(
                                        value = regEmail,
                                        onValueChange = { regEmail = it },
                                        label = { Text("Email (Opsional)") },
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                item {
                                    Button(
                                        onClick = { registerMember() },
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 16.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                        shape = RoundedCornerShape(12.dp)
                                    ) {
                                        Text("Daftarkan Anggota Baru", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // dialog confirm terminate
    terminatingMember?.let { member ->
        AlertDialog(
            onDismissRequest = { terminatingMember = null },
            icon = { Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(36.dp)) },
            title = { Text("Terminasi Keanggotaan?", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Text(
                    "Apakah Anda yakin ingin menonaktifkan keanggotaan ${member.name} (${member.memberNo})? Aksi ini akan menghentikan partisipasi anggota dan membutuhkan pencairan sisa simpanan/pinjaman.",
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = { terminateMemberConfirm() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                    Text("Terminasi", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { terminatingMember = null }) {
                    Text("Batal")
                }
            }
        )
    }

    // Member virtual card dialog (Operator View)
    selectedMemberForCard?.let { member ->
        Dialog(onDismissRequest = { selectedMemberForCard = null }) {
            Box(
                modifier = Modifier
                    .wrapContentSize()
                    .background(Color.Transparent)
            ) {
                VirtualMemberCard(member = member)
            }
        }
    }

    // Student picker dialog
    if (showSiswaPicker) {
        SearchPickerClassDialog(
            title = "Pilih Siswa",
            onDismiss = { showSiswaPicker = false },
            onSearch = { query ->
                try {
                    val res = academicService.getSiswa(search = query, limit = 50)
                    if (res.isSuccessful) {
                        res.body()?.data?.map { Pair(it.id, it.nama_siswa) } ?: emptyList()
                    } else emptyList()
                } catch (e: Exception) {
                    emptyList()
                }
            },
            onSelect = { id, name ->
                regSiswaId = id
                regSiswaName = name
                // Retrieve user info from backend or use studentId directly
                scope.launch {
                    try {
                        val res = academicService.getSiswa(userId = id) // or check if id gives details
                        // Try to fetch email or detail info if needed
                    } catch (e: Exception) {}
                }
                showSiswaPicker = false
            }
        )
    }

    // Teacher picker dialog
    if (showGuruPicker) {
        SearchPickerClassDialog(
            title = "Pilih Guru / Staf",
            onDismiss = { showGuruPicker = false },
            onSearch = { query ->
                try {
                    val res = academicService.getGuru(search = query, limit = 50)
                    if (res.isSuccessful) {
                        res.body()?.data?.map { Pair(it.id, it.nama_guru) } ?: emptyList()
                    } else emptyList()
                } catch (e: Exception) {
                    emptyList()
                }
            },
            onSelect = { id, name ->
                regGuruId = id
                regGuruName = name
                showGuruPicker = false
            }
        )
    }
}

@Composable
fun VirtualMemberCard(member: CoopMember) {
    val qrBitmap = remember(member.memberNo) {
        generateQrCodeBitmap(member.memberNo, 260)
    }

    Card(
        modifier = Modifier
            .width(320.dp)
            .height(480.dp),
        shape = RoundedCornerShape(24.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFF0F2027), Color(0xFF203A43), Color(0xFF2C5364))
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Header
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = "ABSENTA KOPERASI",
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 18.sp,
                        letterSpacing = 1.5.sp
                    )
                    Text(
                        text = "KARTU ANGGOTA VIRTUAL",
                        color = Color(0xFFE2B93B),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.sp
                    )
                }

                // QR Container
                Card(
                    modifier = Modifier
                        .size(180.dp)
                        .background(Color.White, RoundedCornerShape(16.dp)),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Box(modifier = Modifier.fillMaxSize().padding(12.dp), contentAlignment = Alignment.Center) {
                        if (qrBitmap != null) {
                            Image(
                                bitmap = qrBitmap.asImageBitmap(),
                                contentDescription = "QR Code Anggota",
                                modifier = Modifier.fillMaxSize()
                            )
                        } else {
                            CircularProgressIndicator(color = Color(0xFF1E3C72))
                        }
                    }
                }

                // Profile Info
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = member.name.uppercase(),
                        fontWeight = FontWeight.Bold,
                        color = Color.White,
                        fontSize = 15.sp,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = "NO: ${member.memberNo}",
                        color = Color.White.copy(alpha = 0.8f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium
                    )

                    Box(
                        modifier = Modifier
                            .padding(top = 8.dp)
                            .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 12.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = when (member.type) {
                                "STUDENT" -> "SISWA"
                                "TEACHER" -> "GURU / STAF"
                                else -> "UMUM (EKSTERNAL)"
                            },
                            color = Color(0xFFE2B93B),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Card Footer
                Text(
                    text = "Gunakan QR Code di atas untuk transaksi Point of Sale (POS) dan pembayaran cepat koperasi.",
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 9.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 12.sp
                )
            }
        }
    }
}

@Composable
fun SearchPickerClassDialog(
    title: String,
    onDismiss: () -> Unit,
    onSearch: suspend (String) -> List<Pair<String, String>>,
    onSelect: (String, String) -> Unit
) {
    var query by remember { mutableStateOf("") }
    var results by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var searching by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(query) {
        searching = true
        scope.launch {
            results = onSearch(query)
            searching = false
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Ketik nama untuk mencari...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    modifier = Modifier.fillMaxWidth()
                )

                if (searching) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        items(results) { item ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { onSelect(item.first, item.second) },
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9))
                            ) {
                                Text(
                                    text = item.second,
                                    modifier = Modifier.padding(12.dp),
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 13.sp
                                )
                            }
                        }
                        if (results.isEmpty()) {
                            item {
                                Box(modifier = Modifier.fillMaxWidth().padding(top = 24.dp), contentAlignment = Alignment.Center) {
                                    Text("Hasil pencarian kosong.", color = Color.Gray, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Batal")
            }
        }
    )
}

// QR generation function using ZXing
fun generateQrCodeBitmap(content: String, size: Int): Bitmap? {
    return try {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
        val width = bitMatrix.width
        val height = bitMatrix.height
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        for (x in 0 until width) {
            for (y in 0 until height) {
                bitmap.setPixel(x, y, if (bitMatrix.get(x, y)) AndroidColor.BLACK else AndroidColor.WHITE)
            }
        }
        bitmap
    } catch (e: Exception) {
        null
    }
}
