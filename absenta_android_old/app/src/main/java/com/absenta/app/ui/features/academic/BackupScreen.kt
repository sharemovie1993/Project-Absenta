package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BackupScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: BackupViewModel = viewModel()
) {
    val context = LocalContext.current
    val contentResolver = context.contentResolver

    val loadingExport by viewModel.loadingExport.collectAsState()
    val loadingImport by viewModel.loadingImport.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val previewStats by viewModel.previewStats.collectAsState()
    val parsedJsonData by viewModel.parsedJsonData.collectAsState()
    val canManage by viewModel.canManage.collectAsState()

    var showConfirmRestoreDialog by remember { mutableStateOf(false) }
    var jsonStringToSave by remember { mutableStateOf<String?>(null) }
    var backupFileName by remember { mutableStateOf("academic-backup.json") }

    // Android Native Document Saver
    val fileSaverLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("application/json")
    ) { uri ->
        uri?.let {
            try {
                contentResolver.openOutputStream(it)?.bufferedWriter()?.use { writer ->
                    writer.write(jsonStringToSave ?: "")
                }
                Toast.makeText(context, "File cadangan berhasil disimpan secara lokal!", Toast.LENGTH_LONG).show()
                jsonStringToSave = null
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal menyimpan file cadangan: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    // Android Native Document Picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let {
            try {
                val jsonString = contentResolver.openInputStream(it)?.bufferedReader()?.use { reader ->
                    reader.readText()
                }
                if (jsonString != null) {
                    val ok = viewModel.parseBackupJson(jsonString)
                    if (ok) {
                        Toast.makeText(context, "File cadangan dimuat. Silakan tinjau statistik data.", Toast.LENGTH_SHORT).show()
                    }
                } else {
                    Toast.makeText(context, "File kosong atau tidak dapat diuraikan", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal membaca file: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
            }
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(successMessage) {
        successMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.resetSuccessMessage()
        }
    }

    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))))
            ) {
                TopAppBar(
                    title = {
                        Column {
                            Text("Pusat Cadangan Data", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kelompok Setup • Backup & Restore",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )
            }
        }
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Panduan Keamanan
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF1E3C72))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Panduan Backup & Restore",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color(0xFF1E293B)
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "1. Lakukan backup rutin minimal satu bulan sekali.\n" +
                                   "2. Simpan file .json cadangan di tempat yang aman dan terenkripsi.\n" +
                                   "3. Proses pemulihan data akan melewati record yang sudah ada di sistem.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B),
                            lineHeight = 18.sp
                        )
                    }
                }
            }

            // Bagian Ekspor
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Share, contentDescription = null, tint = Color(0xFF3B82F6))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Export Pusat Data",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color(0xFF1E293B)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Ekspor data master, user, akademik, dan operasional sekolah ke dalam format file JSON tunggal. Unduh file ini untuk diarsipkan.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        Button(
                            onClick = {
                                viewModel.exportData { fileName, jsonString ->
                                    jsonStringToSave = jsonString
                                    backupFileName = fileName
                                    fileSaverLauncher.launch(fileName)
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                            enabled = !loadingExport && canManage
                        ) {
                            if (loadingExport) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Mengunduh Cadangan...")
                            } else {
                                Icon(Icons.Default.Download, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Ekspor Data Akademik")
                            }
                        }
                    }
                }
            }

            // Bagian Impor / Restore
            item {
                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Upload, contentDescription = null, tint = Color(0xFFF59E0B))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "Pemulihan Data (Restore)",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color(0xFF1E293B)
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            text = "Pilih file cadangan JSON yang telah diekspor sebelumnya untuk mengunggah dan memulihkan data akademik.",
                            fontSize = 12.sp,
                            color = Color(0xFF64748B)
                        )
                        Spacer(modifier = Modifier.height(16.dp))

                        if (previewStats == null) {
                            Button(
                                onClick = { filePickerLauncher.launch("application/json") },
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth(),
                                enabled = canManage
                            ) {
                                Icon(Icons.Default.Search, contentDescription = null)
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Pilih File Cadangan")
                            }
                        } else {
                            // Peninjauan Data Preview
                            Surface(
                                color = Color(0xFFF1F5F9),
                                shape = RoundedCornerShape(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Text(
                                        text = "Statistik File Cadangan:",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = Color(0xFF0F172A)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))

                                    // Item counts
                                    val stats = previewStats!!
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("• Sekolah: ${stats.sekolah} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Jurusan: ${stats.jurusan} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Tahun Ajaran: ${stats.tahunPelajaran} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Semester: ${stats.semester} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Jenis Kegiatan: ${stats.jenisKegiatan} data", fontSize = 12.sp, color = Color(0xFF475569))
                                        }
                                        Column {
                                            Text("• Guru: ${stats.guru} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Siswa: ${stats.siswa} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Kelas: ${stats.kelas} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Organisasi: ${stats.strukturOrganisasi} data", fontSize = 12.sp, color = Color(0xFF475569))
                                            Text("• Relasi Siswa: ${stats.siswaAkademik} data", fontSize = 12.sp, color = Color(0xFF475569))
                                        }
                                    }

                                    Divider(modifier = Modifier.padding(vertical = 8.dp), color = Color(0xFFCBD5E1))

                                    Text(
                                        text = "Total Records: ${stats.totalRecords} baris data",
                                        fontWeight = FontWeight.Black,
                                        fontSize = 13.sp,
                                        color = Color(0xFF1E3C72)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedButton(
                                    onClick = { viewModel.clearFilePreview() },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(8.dp),
                                    enabled = !loadingImport
                                ) {
                                    Text("Batal", color = Color(0xFF64748B))
                                }

                                Button(
                                    onClick = { showConfirmRestoreDialog = true },
                                    modifier = Modifier.weight(1f),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                    shape = RoundedCornerShape(8.dp),
                                    enabled = !loadingImport
                                ) {
                                    if (loadingImport) {
                                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                    } else {
                                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Pulihkan Data")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialog Konfirmasi Restore
    if (showConfirmRestoreDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmRestoreDialog = false },
            title = {
                Text(
                    text = "Mulai Pemulihan Data?",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                Text(
                    text = "Sistem akan memproses file cadangan dan menyisipkan data baru. Record yang duplikat akan dilewati secara otomatis. Tindakan ini tidak dapat dibatalkan.",
                    fontSize = 13.sp,
                    color = Color(0xFF1E293B)
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.executeRestore { msg ->
                            showConfirmRestoreDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    enabled = !loadingImport
                ) {
                    if (loadingImport) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                    } else {
                        Text("Mulai Sekarang")
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showConfirmRestoreDialog = false }) {
                    Text("Batalkan", color = Color(0xFF64748B))
                }
            }
        )
    }
}
