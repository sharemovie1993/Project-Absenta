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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import android.util.Log
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PiketScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var permitsList by remember { mutableStateOf<List<IzinKeluarSiswa>>(emptyList()) }
    var selectedTab by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }

    // Dialog state
    var showFormDialog by remember { mutableStateOf(false) }

    // Form fields
    var selectedStudent by remember { mutableStateOf<SiswaData?>(null) }
    var studentSearchQuery by remember { mutableStateOf("") }
    var searchedStudents by remember { mutableStateOf<List<SiswaData>>(emptyList()) }
    var isSearchingStudents by remember { mutableStateOf(false) }
    var alasanInput by remember { mutableStateOf("") }
    var selectedTipeIzin by remember { mutableStateOf("IZIN_KELUAR") }
    var isTipeIzinDropdownOpen by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }

    val tabs = listOf("DI LUAR (AKTIF)", "SUDAH KEMBALI", "SEMUA")

    fun loadPermits() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "Loading daily permits...")
            try {
                val service = ApiClient.getClient(context).create(PiketService::class.java)
                val response = service.getDailyPermits()
                if (response.isSuccessful && response.body()?.success == true) {
                    permitsList = response.body()?.data ?: emptyList()
                    Log.d("AbsentaDebug", "Permits loaded success: Count=${permitsList.size}")
                } else {
                    permitsList = emptyList()
                    Log.w("AbsentaDebug", "Failed to load permits")
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Exception loading permits", e)
                permitsList = emptyList()
            } finally {
                isLoading = false
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
                    val body = response.body()
                    searchedStudents = body?.data?.list ?: body?.list ?: emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error searching students", e)
            } finally {
                isSearchingStudents = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadPermits()
    }

    LaunchedEffect(studentSearchQuery) {
        if (studentSearchQuery.length >= 2) {
            delay(300)
            searchStudents(studentSearchQuery)
        } else {
            searchedStudents = emptyList()
        }
    }

    val filteredPermits = when (selectedTab) {
        0 -> permitsList.filter { it.status == "DISETUJUI" }
        1 -> permitsList.filter { it.status == "KEMBALI" }
        else -> permitsList
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Piket & Izin Keluar Siswa", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
                    selectedStudent = null
                    alasanInput = ""
                    selectedTipeIzin = "IZIN_KELUAR"
                    showFormDialog = true
                },
                containerColor = Color(0xFF1E3C72),
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = "Buat Surat Izin")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Tab Row
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = Color.White,
                contentColor = Color(0xFF1E3C72),
                modifier = Modifier.fillMaxWidth()
            ) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = {
                            Text(
                                title,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                            )
                        }
                    )
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredPermits.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.Info, contentDescription = "Empty", tint = Color(0xFF94A3B8), modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Tidak ada surat izin aktif", color = Color(0xFF94A3B8), fontSize = 14.sp)
                    }
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(filteredPermits) { permit ->
                        PermitCard(
                            permit = permit,
                            onMarkReturned = {
                                scope.launch {
                                    try {
                                        val service = ApiClient.getClient(context).create(PiketService::class.java)
                                        val response = service.markReturned(permit.id)
                                        if (response.isSuccessful && response.body()?.success == true) {
                                            Toast.makeText(context, "Siswa telah kembali ke sekolah", Toast.LENGTH_SHORT).show()
                                            loadPermits()
                                        } else {
                                            Toast.makeText(context, "Gagal mengonfirmasi kepulangan", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Koneksi gagal", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            onDelete = {
                                scope.launch {
                                    try {
                                        val service = ApiClient.getClient(context).create(PiketService::class.java)
                                        val response = service.deletePermit(permit.id)
                                        if (response.isSuccessful && response.body()?.success == true) {
                                            Toast.makeText(context, "Surat izin dibatalkan", Toast.LENGTH_SHORT).show()
                                            loadPermits()
                                        } else {
                                            Toast.makeText(context, "Gagal membatalkan surat izin", Toast.LENGTH_SHORT).show()
                                        }
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Koneksi gagal", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Add Permit Dialog
    if (showFormDialog) {
        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = { Text("Buat Izin Keluar Siswa", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    item {
                        Text("Siswa", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        if (selectedStudent == null) {
                            OutlinedTextField(
                                value = studentSearchQuery,
                                onValueChange = { studentSearchQuery = it },
                                placeholder = { Text("Cari nama / NIS siswa...") },
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
                                    elevation = CardDefaults.cardElevation(2.dp)
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
                                                    .padding(12.dp)
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
                                    IconButton(onClick = { selectedStudent = null }) {
                                        Icon(Icons.Default.Close, contentDescription = "Clear", tint = Color.Red)
                                    }
                                }
                            }
                        }
                    }

                    // Tipe Izin
                    item {
                        Text("Jenis Izin", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                        Box(modifier = Modifier.fillMaxWidth()) {
                            OutlinedTextField(
                                value = if (selectedTipeIzin == "IZIN_KELUAR") "Izin Keluar Sementara" else "Pulang Awal",
                                onValueChange = {},
                                readOnly = true,
                                modifier = Modifier.fillMaxWidth().clickable { isTipeIzinDropdownOpen = true },
                                shape = RoundedCornerShape(10.dp),
                                trailingIcon = { Icon(Icons.Default.ArrowDropDown, contentDescription = null) }
                            )
                            DropdownMenu(
                                expanded = isTipeIzinDropdownOpen,
                                onDismissRequest = { isTipeIzinDropdownOpen = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Izin Keluar Sementara") },
                                    onClick = {
                                        selectedTipeIzin = "IZIN_KELUAR"
                                        isTipeIzinDropdownOpen = false
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text("Pulang Awal") },
                                    onClick = {
                                        selectedTipeIzin = "PULANG_AWAL"
                                        isTipeIzinDropdownOpen = false
                                    }
                                )
                            }
                        }
                    }

                    // Alasan
                    item {
                        OutlinedTextField(
                            value = alasanInput,
                            onValueChange = { alasanInput = it },
                            label = { Text("Alasan Keluar") },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(10.dp),
                            maxLines = 3
                        )
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
                            if (alasanInput.isBlank()) {
                                Toast.makeText(context, "Tulis alasan izin", Toast.LENGTH_SHORT).show()
                                return@Button
                            }

                            isSubmitting = true
                            scope.launch {
                                try {
                                    val service = ApiClient.getClient(context).create(PiketService::class.java)
                                    val currentISO = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).format(Date())
                                    val response = service.createPermit(
                                        CreatePermitRequest(
                                            siswa_akademik_id = selectedStudent!!.id,
                                            guru_piket_id = null,
                                            alasan = alasanInput,
                                            tipe_izin = selectedTipeIzin,
                                            jam_keluar = currentISO
                                        )
                                    )
                                    if (response.isSuccessful && response.body()?.success == true) {
                                        Toast.makeText(context, "Surat izin berhasil dibuat!", Toast.LENGTH_SHORT).show()
                                        showFormDialog = false
                                        loadPermits()
                                    } else {
                                        Toast.makeText(context, "Gagal membuat surat izin", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Koneksi gagal", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                    ) {
                        Text("Terbitkan")
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
fun PermitCard(
    permit: IzinKeluarSiswa,
    onMarkReturned: () -> Unit,
    onDelete: () -> Unit
) {
    val statusColor = when (permit.status) {
        "KEMBALI" -> Color(0xFF10B981)
        else -> Color(0xFFF59E0B)
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
                Column {
                    Text(
                        text = permit.SiswaAkademik?.siswa?.nama_siswa ?: "Siswa",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )
                    Text(
                        text = "Kelas: ${permit.SiswaAkademik?.kelas?.nama_kelas ?: "-"} | NIS: ${permit.SiswaAkademik?.siswa?.nis ?: "-"}",
                        fontSize = 12.sp,
                        color = Color(0xFF64748B),
                        modifier = Modifier.padding(top = 2.dp)
                    )
                }
                Box(
                    modifier = Modifier
                        .background(statusColor.copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = permit.status,
                        color = statusColor,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider()
            Spacer(modifier = Modifier.height(10.dp))
            Text("Alasan Izin:", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
            Text(permit.alasan, fontSize = 13.sp, color = Color(0xFF334155))
            
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    val outTime = formatISOToTime(permit.jam_keluar)
                    val returnedTime = permit.jam_kembali?.let { formatISOToTime(it) } ?: "-"
                    Text(
                        text = "Keluar: $outTime • Kembali: $returnedTime",
                        fontSize = 11.sp,
                        color = Color.Gray
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (permit.status == "DISETUJUI") {
                        Button(
                            onClick = onMarkReturned,
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                            modifier = Modifier.height(32.dp)
                        ) {
                            Text("Siswa Kembali", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                            Icon(Icons.Default.Delete, contentDescription = "Cancel", tint = Color.Red)
                        }
                    }
                }
            }
        }
    }
}

private fun formatISOToTime(isoStr: String): String {
    return try {
        val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
        val date = parser.parse(isoStr.take(19)) ?: return isoStr
        SimpleDateFormat("HH:mm", Locale.US).format(date)
    } catch (e: Exception) {
        isoStr.take(5)
    }
}
