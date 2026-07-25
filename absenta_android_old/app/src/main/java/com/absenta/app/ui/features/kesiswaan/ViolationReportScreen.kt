package com.absenta.app.ui.features.kesiswaan

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
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
import com.absenta.app.data.api.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.util.Log

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ViolationReportScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var violationList by remember { mutableStateOf<List<Pelanggaran>>(emptyList()) }
    var jenisPelanggaranList by remember { mutableStateOf<List<JenisPelanggaran>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(true) }

    // Dialog state
    var showFormDialog by remember { mutableStateOf(false) }
    var selectedViolation by remember { mutableStateOf<Pelanggaran?>(null) }

    // Form fields
    var selectedStudent by remember { mutableStateOf<SiswaData?>(null) }
    var studentSearchQuery by remember { mutableStateOf("") }
    var searchedStudents by remember { mutableStateOf<List<SiswaData>>(emptyList()) }
    var isSearchingStudents by remember { mutableStateOf(false) }

    var selectedJenisPelanggaran by remember { mutableStateOf<JenisPelanggaran?>(null) }
    var isJenisPelanggaranDropdownOpen by remember { mutableStateOf(false) }
    
    var pointInput by remember { mutableStateOf("0") }
    var noteInput by remember { mutableStateOf("") }
    var dateInput by remember { mutableStateOf(java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US).format(java.util.Date())) }
    var statusInput by remember { mutableStateOf("BARU") }
    
    var isSubmitting by remember { mutableStateOf(false) }

    fun loadViolations() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "Loading violations list...")
            try {
                val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                val response = service.getPelanggaran(limit = 100, search = searchQuery.ifEmpty { null }, elevatedContext = "true")
                if (response.isSuccessful) {
                    val body = response.body()
                    violationList = body?.data?.list ?: body?.list ?: emptyList()
                    Log.d("AbsentaDebug", "Violations loaded success: Count=${violationList.size}")
                } else {
                    Log.w("AbsentaDebug", "Failed to load violations: Code=${response.code()}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Exception loading violations", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun loadJenisPelanggaran() {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                val response = service.getJenisPelanggaran()
                if (response.isSuccessful) {
                    val body = response.body()
                    jenisPelanggaranList = body?.data?.list ?: body?.list ?: emptyList()
                    Log.d("AbsentaDebug", "Loaded jenis pelanggaran: Count=${jenisPelanggaranList.size}")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error loading jenis pelanggaran", e)
            }
        }
    }

    fun searchStudents(query: String) {
        scope.launch {
            isSearchingStudents = true
            try {
                val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                val response = service.getStudents(search = query, limit = 5, searchFields = "id,nis,nama_siswa", elevatedContext = "true", context = "elevated")
                if (response.isSuccessful) {
                    searchedStudents = response.body()?.data?.list ?: response.body()?.list ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error searching students", e)
            } finally {
                isSearchingStudents = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadViolations()
        loadJenisPelanggaran()
    }

    LaunchedEffect(searchQuery) {
        // debounce search
        delay(500)
        loadViolations()
    }

    LaunchedEffect(studentSearchQuery) {
        if (studentSearchQuery.length >= 2) {
            delay(300)
            searchStudents(studentSearchQuery)
        } else {
            searchedStudents = emptyList()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Catatan Pelanggaran Siswa", fontWeight = FontWeight.Bold) },
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
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    selectedViolation = null
                    selectedStudent = null
                    selectedJenisPelanggaran = null
                    pointInput = "0"
                    noteInput = ""
                    statusInput = "BARU"
                    showFormDialog = true
                },
                containerColor = Color(0xFF1E3C72),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Tambah Catatan")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari siswa atau kategori pelanggaran...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                )
            )

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (violationList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Info, contentDescription = "Empty", tint = Color.Gray, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Belum ada catatan pelanggaran", color = Color.Gray)
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 80.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(violationList) { violation ->
                        ViolationCard(
                            violation = violation,
                            onEditClick = {
                                selectedViolation = violation
                                selectedStudent = violation.Siswa
                                selectedJenisPelanggaran = jenisPelanggaranList.find { it.nama_pelanggaran == violation.jenis_pelanggaran }
                                pointInput = violation.poin.toString()
                                noteInput = violation.keterangan ?: ""
                                dateInput = violation.tanggal.take(10)
                                statusInput = violation.status
                                showFormDialog = true
                            },
                            onDeleteClick = {
                                scope.launch {
                                    Log.d("AbsentaDebug", "Deleting violation: id=${violation.id}")
                                    try {
                                        val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                                        val response = service.deletePelanggaran(violation.id)
                                        if (response.isSuccessful && response.body()?.success == true) {
                                            Toast.makeText(context, "Catatan berhasil dihapus", Toast.LENGTH_SHORT).show()
                                            loadViolations()
                                        } else {
                                            Toast.makeText(context, "Gagal menghapus catatan", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        Log.e("AbsentaDebug", "Exception deleting violation", e)
                                        Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Add / Edit Dialog
    if (showFormDialog) {
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = { Text(if (selectedViolation == null) "Tambah Catatan Pelanggaran" else "Edit Catatan Pelanggaran", fontWeight = FontWeight.Bold) },
            text = {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item {
                        Text("Masukkan detail pelanggaran dan poin siswa.", fontSize = 12.sp, color = Color.Gray)
                    }

                    // Student Picker
                    item {
                        Text("Siswa", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        if (selectedStudent == null) {
                            OutlinedTextField(
                                value = studentSearchQuery,
                                onValueChange = { studentSearchQuery = it },
                                placeholder = { Text("Ketik nama / NIS siswa...") },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(10.dp)
                            )
                            
                            if (isSearchingStudents) {
                                LinearProgressIndicator(modifier = Modifier.fillMaxWidth().padding(top = 4.dp))
                            }
                            
                            AnimatedVisibility(visible = searchedStudents.isNotEmpty()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                                ) {
                                    Column {
                                        searchedStudents.forEach { student ->
                                            Row(
                                                modifier = Modifier
                                                    .fillMaxWidth()
                                                    .clickable {
                                                        selectedStudent = student
                                                        studentSearchQuery = ""
                                                        searchedStudents = emptyList()
                                                    }
                                                    .padding(12.dp),
                                                verticalAlignment = Alignment.CenterVertically
                                            ) {
                                                Column {
                                                    Text(student.nama_siswa, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                                    Text("Kelas: ${student.Kelas?.nama_kelas ?: "-"} | NIS: ${student.nis ?: "-"}", fontSize = 11.sp, color = Color.Gray)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFEFF6FF)),
                                shape = RoundedCornerShape(10.dp)
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(selectedStudent!!.nama_siswa, fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color(0xFF1E3C72))
                                        Text("NIS: ${selectedStudent!!.nis ?: "-"} • Kelas: ${selectedStudent!!.Kelas?.nama_kelas ?: "-"}", fontSize = 11.sp, color = Color.Gray)
                                    }
                                    if (selectedViolation == null) {
                                        IconButton(onClick = { selectedStudent = null }) {
                                            Icon(Icons.Default.Close, contentDescription = "Clear Student", tint = Color.Red)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Category Selector
                    item {
                        Text("Kategori Perilaku", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = selectedJenisPelanggaran?.nama_pelanggaran ?: "Pilih Kategori...",
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.fillMaxWidth().clickable { isJenisPelanggaranDropdownOpen = true },
                                shape = RoundedCornerShape(10.dp),
                                trailingIcon = { Icon(Icons.Default.ArrowDropDown, contentDescription = "Dropdown") }
                            )
                            DropdownMenu(
                                expanded = isJenisPelanggaranDropdownOpen,
                                onDismissRequest = { isJenisPelanggaranDropdownOpen = false }
                            ) {
                                jenisPelanggaranList.forEach { jp ->
                                    DropdownMenuItem(
                                        text = { Text("[${jp.kategori}] ${jp.nama_pelanggaran} (${jp.poin} Pts)") },
                                        onClick = {
                                            selectedJenisPelanggaran = jp
                                            pointInput = jp.poin.toString()
                                            isJenisPelanggaranDropdownOpen = false
                                        }
                                    )
                                }
                            }
                        }
                    }

                    // Points & Date
                    item {
                        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            OutlinedTextField(
                                value = pointInput,
                                onValueChange = { pointInput = it },
                                label = { Text("Bobot Poin") },
                                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            )
                            OutlinedTextField(
                                value = dateInput,
                                onValueChange = { dateInput = it },
                                label = { Text("Tanggal") },
                                modifier = Modifier.weight(1f),
                                shape = RoundedCornerShape(10.dp)
                            )
                        }
                    }

                    // Keterangan
                    item {
                        OutlinedTextField(
                            value = noteInput,
                            onValueChange = { noteInput = it },
                            label = { Text("Keterangan/Catatan Kejadian") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            maxLines = 3
                        )
                    }

                    // Status Pendampingan (Hanya muncul saat Edit)
                    if (selectedViolation != null) {
                        item {
                            Text("Tahapan Pendampingan", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf("BARU", "PROSES", "SELESAI").forEach { st ->
                                    val isSelected = statusInput == st
                                    val btnBgColor = if (isSelected) Color(0xFF1E3C72) else Color.White
                                    val btnTextColor = if (isSelected) Color.White else Color.Gray
                                    OutlinedButton(
                                        onClick = { statusInput = st },
                                        colors = ButtonDefaults.outlinedButtonColors(containerColor = btnBgColor, contentColor = btnTextColor),
                                        shape = RoundedCornerShape(8.dp),
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Text(st, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                if (isSubmitting) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72), modifier = Modifier.size(24.dp))
                } else {
                    Button(
                        onClick = {
                            if (selectedStudent == null) {
                                Toast.makeText(context, "Pilih siswa terlebih dahulu", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            if (selectedJenisPelanggaran == null) {
                                Toast.makeText(context, "Pilih kategori pelanggaran", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            val points = pointInput.toIntOrNull() ?: 0
                            
                            scope.launch {
                                isSubmitting = true
                                Log.d("AbsentaDebug", "Submitting violation: StudentId=${selectedStudent!!.id}, points=$points")
                                try {
                                    val service = ApiClient.getClient(context).create(KesiswaanService::class.java)
                                    val request = PelanggaranRequest(
                                        siswa_id = selectedStudent!!.id,
                                        jenis_pelanggaran = selectedJenisPelanggaran!!.nama_pelanggaran,
                                        poin = points,
                                        keterangan = noteInput,
                                        tanggal = dateInput,
                                        status = statusInput
                                    )
                                    
                                    val response = if (selectedViolation == null) {
                                        service.createPelanggaran(request)
                                    } else {
                                        service.updatePelanggaran(selectedViolation!!.id, request)
                                    }

                                    if (response.isSuccessful && response.body()?.success == true) {
                                        Toast.makeText(context, "Catatan berhasil disimpan", Toast.LENGTH_SHORT).show()
                                        showFormDialog = false
                                        loadViolations()
                                    } else {
                                        val errorMsg = response.body()?.message ?: "Gagal menyimpan catatan."
                                        Toast.makeText(context, errorMsg, Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Log.e("AbsentaDebug", "Exception submitting violation", e)
                                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                    ) {
                        Text("Simpan")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showFormDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun ViolationCard(
    violation: Pelanggaran,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    val statusColor = when (violation.status) {
        "SELESAI" -> Color(0xFF10B981)
        "PROSES" -> Color(0xFFF59E0B)
        else -> Color(0xFFEF4444)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
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
                Column {
                    Text(
                        text = violation.Siswa?.nama_siswa ?: "Siswa Tidak Dikenal",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF1E293B)
                    )
                    Text(
                        text = "Kelas: ${violation.Siswa?.Kelas?.nama_kelas ?: "-"} | NIS: ${violation.Siswa?.nis ?: "-"}",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }

                Box(
                    modifier = Modifier
                        .background(statusColor.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = when (violation.status) {
                            "SELESAI" -> "SELESAI"
                            "PROSES" -> "PROSES"
                            else -> "MENUNGGU"
                        },
                        color = statusColor,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(12.dp))

            Text(violation.jenis_pelanggaran, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF334155))
            
            if (!violation.keterangan.isNullOrEmpty()) {
                Text(
                    text = violation.keterangan,
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.DateRange, contentDescription = "Date", tint = Color.Gray, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(violation.tanggal.take(10), fontSize = 11.sp, color = Color.Gray)
                    
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = "+${violation.poin} Poin",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = if (violation.poin >= 50) Color.Red else Color(0xFFF59E0B)
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onEditClick, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = Color(0xFF1E3C72), modifier = Modifier.size(18.dp))
                    }
                    IconButton(onClick = onDeleteClick, modifier = Modifier.size(32.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color.Red, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}
