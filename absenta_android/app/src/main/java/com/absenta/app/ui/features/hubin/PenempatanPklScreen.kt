package com.absenta.app.ui.features.hubin

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.location.Location
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.GuruDetail
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.api.KunjunganInput
import com.absenta.app.data.api.KunjunganRecord
import com.absenta.app.data.api.MitraIndustri
import com.absenta.app.data.api.NilaiInput
import com.absenta.app.data.api.PenempatanInput
import com.absenta.app.data.api.ReviewJurnalRequest
import com.absenta.app.data.api.SiswaDetail
import com.absenta.app.data.api.SiswaPkl
import com.absenta.app.data.api.UpdateNilaiRequest
import com.absenta.app.data.local.SessionManager
import com.absenta.app.ui.components.PklStatCard
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.net.URLEncoder
import java.util.Locale
import androidx.compose.ui.text.style.TextAlign

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun PenempatanPklScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val locationPermissionState = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    var userRole by remember { mutableStateOf("") }
    var userCapabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var positionCodes by remember { mutableStateOf<List<String>>(emptyList()) }
    var activeGuruId by remember { mutableStateOf<String?>(null) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("HUBIN")
    }

    var penempatanList by remember { mutableStateOf<List<SiswaPkl>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    
    // Dialogs state
    var showPlottingDialog by remember { mutableStateOf(false) }
    var showNilaiDialog by remember { mutableStateOf(false) }
    var showKunjunganDialog by remember { mutableStateOf(false) }
    var showReviewJurnalDialog by remember { mutableStateOf(false) }

    // Selected items
    var selectedPkl by remember { mutableStateOf<SiswaPkl?>(null) }

    // Plotting inputs
    var dropdownSiswa by remember { mutableStateOf<List<SiswaDetail>>(emptyList()) }
    var dropdownMitra by remember { mutableStateOf<List<MitraIndustri>>(emptyList()) }
    var dropdownGuru by remember { mutableStateOf<List<GuruDetail>>(emptyList()) }

    var selectedSiswaId by remember { mutableStateOf("") }
    var selectedMitraId by remember { mutableStateOf("") }
    var selectedGuruId by remember { mutableStateOf("") }
    var plottingTanggalMulai by remember { mutableStateOf("") }
    var plottingTanggalSelesai by remember { mutableStateOf("") }
    var isPlottingSubmitPending by remember { mutableStateOf(false) }

    // Nilai inputs
    var softSkills by remember { mutableStateOf("0") }
    var technicalSkills by remember { mutableStateOf("0") }
    var discipline by remember { mutableStateOf("0") }
    var nilaiCatatan by remember { mutableStateOf("") }
    var isNilaiSubmitPending by remember { mutableStateOf(false) }

    // Kunjungan inputs
    var kunjunganCatatan by remember { mutableStateOf("") }
    var kunjunganLat by remember { mutableStateOf("") }
    var kunjunganLng by remember { mutableStateOf("") }
    var isKunjunganSubmitPending by remember { mutableStateOf(false) }

    // Review Jurnal inputs
    var reviewJurnalStatus by remember { mutableStateOf("DISETUJUI") }
    var reviewJurnalCatatan by remember { mutableStateOf("") }
    var isReviewJurnalSubmitPending by remember { mutableStateOf(false) }

    // Read session
    LaunchedEffect(Unit) {
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        positionCodes = sessionManager.positionCodesFlow.first()

        // Fetch active guru id to filter "Bimbingan Saya"
        try {
            val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
            val profileResp = academicService.getGuruMe()
            if (profileResp.isSuccessful && profileResp.body()?.success == true) {
                activeGuruId = profileResp.body()?.data?.id
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    val canManage = remember(userRole, userCapabilities, positionCodes) {
        val roleUpper = userRole.uppercase()
        roleUpper == "ADMIN" || roleUpper == "SUPERADMIN" ||
                positionCodes.contains("HUBIN") || userCapabilities.contains("hubin.partners.manage")
    }

    val isGuru = remember(userRole) {
        userRole.uppercase() == "GURU"
    }

    // Tab Filter: ALL vs MY_GUIDANCE
    var activeTab by remember { mutableStateOf(if (canManage) "ALL" else "MY_GUIDANCE") }

    fun loadPenempatan() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getPenempatan(
                    search = searchQuery.ifBlank { null },
                    limit = 100
                )
                if (resp.isSuccessful && resp.body()?.success == true) {
                    penempatanList = resp.body()?.data ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal memuat penempatan PKL", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadPenempatan()
    }

    // Load dropdown options for Plotting
    fun loadDropdownOptions() {
        scope.launch {
            try {
                val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
                val hubinService = ApiClient.getClient(context).create(HubinService::class.java)

                val siswaResp = academicService.getSiswa(limit = 250, status = "AKTIF")
                if (siswaResp.isSuccessful) {
                    dropdownSiswa = siswaResp.body()?.data ?: emptyList()
                }

                val mitraResp = hubinService.getMitra(limit = 250)
                if (mitraResp.isSuccessful) {
                    dropdownMitra = mitraResp.body()?.data ?: emptyList()
                }

                val guruResp = academicService.getGuru(limit = 250)
                if (guruResp.isSuccessful) {
                    dropdownGuru = guruResp.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    LaunchedEffect(showPlottingDialog) {
        if (showPlottingDialog) {
            loadDropdownOptions()
        }
    }

    @SuppressLint("MissingPermission")
    fun runKunjunganGps() {
        if (locationPermissionState.status.isGranted) {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                if (location != null) {
                    kunjunganLat = location.latitude.toString()
                    kunjunganLng = location.longitude.toString()
                    Toast.makeText(context, "Koordinat GPS berhasil disinkronkan", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(context, "Gagal mendeteksi lokasi GPS", Toast.LENGTH_SHORT).show()
                }
            }
        } else {
            locationPermissionState.launchPermissionRequest()
        }
    }

    val isActuallyPembimbing = remember(penempatanList, activeGuruId) {
        activeGuruId != null && penempatanList.any { it.pembimbing_id == activeGuruId }
    }

    val showTabs = canManage && isActuallyPembimbing

    val filteredList = remember(penempatanList, activeTab, activeGuruId, canManage) {
        if (activeTab == "MY_GUIDANCE") {
            if (activeGuruId != null) {
                penempatanList.filter { it.pembimbing_id == activeGuruId }
            } else {
                emptyList()
            }
        } else {
            if (canManage) {
                penempatanList
            } else {
                emptyList()
            }
        }
    }

    fun deletePenempatan(id: String, siswaName: String) {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.deletePenempatan(id)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    Toast.makeText(context, "Plotting PKL $siswaName berhasil dihapus", Toast.LENGTH_SHORT).show()
                    loadPenempatan()
                } else {
                    Toast.makeText(context, "Gagal membatalkan plotting", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
            }
        }
    }

    if (isLocked) {
        HubinPremiumGate(
            featureName = "Penempatan PKL Siswa",
            description = "Optimalkan proses penempatan kerja lapangan. Plotting siswa ke mitra industri secara cerdas, tunjuk guru pembimbing, dan kelola periode PKL dalam satu manajemen terpusat.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
    } else {
        Scaffold(
            topBar = {
            TopAppBar(
                title = { Text("Penempatan PKL", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
            // Stats Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                PklStatCard("Penempatan", penempatanList.size.toString(), Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                PklStatCard("Aktif PKL", penempatanList.count { it.status == "AKTIF" }.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
                PklStatCard("Mitra Terlibat", penempatanList.map { it.mitra_id }.distinct().size.toString(), Color(0xFFF59E0B), modifier = Modifier.weight(1f))
            }

            // Tabs (Bimbingan Saya vs Semua Penempatan)
            if (showTabs) {
                TabRow(
                    selectedTabIndex = if (activeTab == "ALL") 0 else 1,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Tab(
                        selected = activeTab == "ALL",
                        onClick = { activeTab = "ALL" },
                        text = { Text("Semua Penempatan", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = activeTab == "MY_GUIDANCE",
                        onClick = { activeTab = "MY_GUIDANCE" },
                        text = { Text("Bimbingan Saya", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                }
            }

            // Search Bar & Toolbar Primary Add
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Cari siswa atau mitra...", fontSize = 13.sp) },
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(12.dp)),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    ),
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                    singleLine = true
                )

                if (canManage) {
                    Button(
                        onClick = {
                            selectedSiswaId = ""
                            selectedMitraId = ""
                            selectedGuruId = ""
                            plottingTanggalMulai = ""
                            plottingTanggalSelesai = ""
                            showPlottingDialog = true
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Plotting", fontSize = 12.sp)
                    }
                }
            }

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Belum ada data penempatan PKL", color = Color(0xFF94A3B8))
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(filteredList) { pkl ->
                        PenempatanCard(
                            pkl = pkl,
                            isHubinAdmin = canManage,
                            isPembimbing = isGuru && pkl.pembimbing_id == activeGuruId,
                            onNilai = {
                                selectedPkl = pkl
                                softSkills = pkl.nilai_json?.soft_skills?.toInt()?.toString() ?: "0"
                                technicalSkills = pkl.nilai_json?.technical_skills?.toInt()?.toString() ?: "0"
                                discipline = pkl.nilai_json?.discipline?.toInt()?.toString() ?: "0"
                                nilaiCatatan = pkl.nilai_json?.catatan ?: ""
                                showNilaiDialog = true
                            },
                            onKunjungan = {
                                selectedPkl = pkl
                                kunjunganCatatan = ""
                                kunjunganLat = ""
                                kunjunganLng = ""
                                showKunjunganDialog = true
                            },
                            onReviewJurnal = {
                                selectedPkl = pkl
                                reviewJurnalStatus = pkl.jurnal_json?.status ?: "DISETUJUI"
                                reviewJurnalCatatan = pkl.jurnal_json?.catatan_revisi ?: ""
                                showReviewJurnalDialog = true
                            },
                            onDelete = { deletePenempatan(pkl.id, pkl.Siswa?.nama_siswa ?: "Siswa") }
                        )
                    }
                }
            }
        }
    }

    // 1. Plotting Baru Dialog
    if (showPlottingDialog) {
        AlertDialog(
            onDismissRequest = { showPlottingDialog = false },
            title = { Text("Plotting Baru Siswa PKL", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    item {
                        Text("Pilih Siswa *", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        DropdownSpinner(
                            options = dropdownSiswa.map { DropdownItem(it.id, "${it.nama_siswa} (${it.nis})") },
                            selectedId = selectedSiswaId,
                            onSelected = { selectedSiswaId = it },
                            placeholder = "Pilih Siswa"
                        )
                    }

                    item {
                        Text("Pilih Mitra Industri *", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        DropdownSpinner(
                            options = dropdownMitra.map { DropdownItem(it.id, it.nama) },
                            selectedId = selectedMitraId,
                            onSelected = { selectedMitraId = it },
                            placeholder = "Pilih Mitra"
                        )
                    }

                    item {
                        Text("Pilih Guru Pembimbing", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        DropdownSpinner(
                            options = dropdownGuru.map { DropdownItem(it.id, it.nama_guru) },
                            selectedId = selectedGuruId,
                            onSelected = { selectedGuruId = it },
                            placeholder = "Pilih Pembimbing"
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = plottingTanggalMulai,
                            onValueChange = { plottingTanggalMulai = it },
                            label = { Text("Tanggal Mulai (YYYY-MM-DD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = plottingTanggalSelesai,
                            onValueChange = { plottingTanggalSelesai = it },
                            label = { Text("Tanggal Selesai (YYYY-MM-DD)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (selectedSiswaId.isBlank() || selectedMitraId.isBlank() || plottingTanggalMulai.isBlank()) {
                            Toast.makeText(context, "Mohon lengkapi data wajib (*)", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        isPlottingSubmitPending = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val resp = service.createPenempatan(
                                    PenempatanInput(
                                        siswa_id = selectedSiswaId,
                                        mitra_id = selectedMitraId,
                                        pembimbing_id = selectedGuruId.ifBlank { null },
                                        tanggal_mulai = plottingTanggalMulai,
                                        tanggal_selesai = plottingTanggalSelesai.ifBlank { null }
                                    )
                                )
                                if (resp.isSuccessful && resp.body()?.success == true) {
                                    Toast.makeText(context, "Penempatan PKL berhasil disimpan!", Toast.LENGTH_SHORT).show()
                                    showPlottingDialog = false
                                    loadPenempatan()
                                } else {
                                    Toast.makeText(context, resp.body()?.message ?: "Gagal membuat penempatan", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isPlottingSubmitPending = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !isPlottingSubmitPending
                ) {
                    Text("Plotting")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPlottingDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    // 2. Nilai Dialog
    if (showNilaiDialog && selectedPkl != null) {
        AlertDialog(
            onDismissRequest = { showNilaiDialog = false },
            title = { Text("Input Penilaian Siswa", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    OutlinedTextField(
                        value = softSkills,
                        onValueChange = { softSkills = it },
                        label = { Text("Soft Skills (0 - 100)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = technicalSkills,
                        onValueChange = { technicalSkills = it },
                        label = { Text("Technical Skills (0 - 100)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = discipline,
                        onValueChange = { discipline = it },
                        label = { Text("Discipline (0 - 100)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true
                    )
                    OutlinedTextField(
                        value = nilaiCatatan,
                        onValueChange = { nilaiCatatan = it },
                        label = { Text("Catatan Hasil PKL") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val s = softSkills.toDoubleOrNull() ?: 0.0
                        val t = technicalSkills.toDoubleOrNull() ?: 0.0
                        val d = discipline.toDoubleOrNull() ?: 0.0
                        val avg = Math.round((s + t + d) / 3.0).toDouble()

                        isNilaiSubmitPending = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val resp = service.updatePenilaian(
                                    selectedPkl!!.id,
                                    UpdateNilaiRequest(
                                        nilai = NilaiInput(
                                            soft_skills = s,
                                            technical_skills = t,
                                            discipline = d,
                                            catatan = nilaiCatatan,
                                            nilai_akhir = avg
                                        )
                                    )
                                )
                                if (resp.isSuccessful && resp.body()?.success == true) {
                                    Toast.makeText(context, "Nilai berhasil disimpan!", Toast.LENGTH_SHORT).show()
                                    showNilaiDialog = false
                                    loadPenempatan()
                                } else {
                                    Toast.makeText(context, "Gagal mengupdate penilaian", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isNilaiSubmitPending = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !isNilaiSubmitPending
                ) {
                    Text("Simpan Nilai")
                }
            },
            dismissButton = {
                TextButton(onClick = { showNilaiDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    // 3. Kunjungan Dialog (Visitation Logs)
    if (showKunjunganDialog && selectedPkl != null) {
        val kunjunganList = selectedPkl!!.kunjungan_json ?: emptyList()

        AlertDialog(
            onDismissRequest = { showKunjunganDialog = false },
            title = { Text("Log & Lapor Kunjungan", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text("Riwayat Kunjungan Guru:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    
                    if (kunjunganList.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Belum ada kunjungan terdaftar", fontSize = 12.sp, color = Color.Gray)
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 120.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(kunjunganList) { item ->
                                Card(
                                    colors = CardDefaults.cardColors(containerColor = Color.White),
                                    elevation = CardDefaults.cardElevation(1.dp)
                                ) {
                                    Column(modifier = Modifier.padding(8.dp)) {
                                        Text(item.tanggal, fontSize = 11.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                        Text(item.catatan, fontSize = 12.sp, color = Color(0xFF334155))
                                    }
                                }
                            }
                        }
                    }

                    HorizontalDivider(color = Color(0xFFE2E8F0))

                    Text("Input Kunjungan Baru:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    
                    OutlinedTextField(
                        value = kunjunganCatatan,
                        onValueChange = { kunjunganCatatan = it },
                        label = { Text("Catatan Hasil Kunjungan *") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Button(
                            onClick = { runKunjunganGps() },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569)),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("GPS Sync", fontSize = 12.sp)
                        }

                        if (kunjunganLat.isNotEmpty()) {
                            Text(
                                "GPS OK (${kunjunganLat.take(6)}, ${kunjunganLng.take(6)})",
                                fontSize = 10.sp,
                                color = Color(0xFF10B981),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (kunjunganCatatan.isBlank()) {
                            Toast.makeText(context, "Catatan kunjungan wajib diisi", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        isKunjunganSubmitPending = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val resp = service.addKunjungan(
                                    selectedPkl!!.id,
                                    KunjunganInput(
                                        catatan = kunjunganCatatan,
                                        latitude = kunjunganLat.toDoubleOrNull(),
                                        longitude = kunjunganLng.toDoubleOrNull()
                                    )
                                )
                                if (resp.isSuccessful && resp.body()?.success == true) {
                                    Toast.makeText(context, "Kunjungan berhasil dilaporkan!", Toast.LENGTH_SHORT).show()
                                    showKunjunganDialog = false
                                    loadPenempatan()
                                } else {
                                    Toast.makeText(context, "Gagal melapor kunjungan", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isKunjunganSubmitPending = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                    enabled = !isKunjunganSubmitPending
                ) {
                    Text("Lapor")
                }
            },
            dismissButton = {
                TextButton(onClick = { showKunjunganDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }

    // 4. Review Jurnal Dialog
    if (showReviewJurnalDialog && selectedPkl != null) {
        val docUrl = selectedPkl!!.jurnal_json?.file_url ?: ""

        AlertDialog(
            onDismissRequest = { showReviewJurnalDialog = false },
            title = { Text("Tinjau Jurnal Akhir Portofolio", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
                    Text("Tautan Dokumen Jurnal:", fontSize = 11.sp, color = Color.Gray)
                    
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                if (docUrl.isNotEmpty()) {
                                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(docUrl))
                                    context.startActivity(intent)
                                }
                            }
                            .background(Color(0xFFE0F2FE), RoundedCornerShape(8.dp))
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF0284C7))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("BUKA BERKAS PDF JURNAL", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF0369A1))
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text("Keputusan Verifikasi *", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    
                    Row(horizontalArrangement = Arrangement.spacedBy(20.dp), modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = reviewJurnalStatus == "DISETUJUI",
                                onClick = { reviewJurnalStatus = "DISETUJUI" }
                            )
                            Text("Setujui Jurnal", fontSize = 12.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = reviewJurnalStatus == "REVISI",
                                onClick = { reviewJurnalStatus = "REVISI" }
                            )
                            Text("Butuh Revisi", fontSize = 12.sp)
                        }
                    }

                    OutlinedTextField(
                        value = reviewJurnalCatatan,
                        onValueChange = { reviewJurnalCatatan = it },
                        label = { Text("Catatan Revisi / Umpan Balik") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 2
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isReviewJurnalSubmitPending = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val resp = service.reviewJurnalPortofolio(
                                    selectedPkl!!.id,
                                    ReviewJurnalRequest(
                                        status = reviewJurnalStatus,
                                        catatan = reviewJurnalCatatan
                                    )
                                )
                                if (resp.isSuccessful && resp.body()?.success == true) {
                                    Toast.makeText(context, "Review Jurnal berhasil disimpan!", Toast.LENGTH_SHORT).show()
                                    showReviewJurnalDialog = false
                                    loadPenempatan()
                                } else {
                                    Toast.makeText(context, "Gagal mengupdate review jurnal", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isReviewJurnalSubmitPending = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !isReviewJurnalSubmitPending
                ) {
                    Text("Simpan Review")
                }
            },
            dismissButton = {
                TextButton(onClick = { showReviewJurnalDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
    }
}

@Composable
fun PenempatanCard(
    pkl: SiswaPkl,
    isHubinAdmin: Boolean,
    isPembimbing: Boolean,
    onNilai: () -> Unit,
    onKunjungan: () -> Unit,
    onReviewJurnal: () -> Unit,
    onDelete: () -> Unit
) {
    val context = LocalContext.current
    val statusColor = when (pkl.status) {
        "AKTIF" -> Color(0xFF10B981)
        "SELESAI" -> Color(0xFF6366F1)
        else -> Color(0xFFF59E0B)
    }
    val statusBg = when (pkl.status) {
        "AKTIF" -> Color(0xFFD1FAE5)
        "SELESAI" -> Color(0xFFEDE9FE)
        else -> Color(0xFFFEF3C7)
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
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
                    Text(pkl.Siswa?.nama_siswa ?: "Siswa PKL", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                    Text("NIS: ${pkl.Siswa?.nis ?: "-"} • ${pkl.Siswa?.Kelas?.nama_kelas ?: "XII - PKL"}", fontSize = 12.sp, color = Color(0xFF64748B))
                }
                Box(
                    modifier = Modifier
                        .background(statusBg, RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(pkl.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = statusColor)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Home, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(pkl.Mitra?.nama ?: "Mitra Industri", fontSize = 12.sp, color = Color(0xFF475569), fontWeight = FontWeight.SemiBold)
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.AccountCircle, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Pmb: ${pkl.Pembimbing?.nama_guru ?: "Belum ditunjuk"}", fontSize = 11.sp, color = Color(0xFF64748B))
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.DateRange, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("${pkl.tanggal_mulai} s/d ${pkl.tanggal_selesai ?: "Selesai"}", fontSize = 11.sp, color = Color(0xFF64748B))
            }

            // Progress Monitoring Visit Bar
            val visitCount = pkl.kunjungan_json?.size ?: 0
            val targetVisits = 3
            val percentage = Math.min(100f, (visitCount.toFloat() / targetVisits.toFloat()) * 100f)
            
            Spacer(modifier = Modifier.height(10.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Progres Visit: $visitCount/$targetVisits", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                Text("${percentage.toInt()}%", fontSize = 10.sp, color = if (percentage == 100f) Color(0xFF10B981) else Color(0xFFF59E0B), fontWeight = FontWeight.Bold)
            }
            Spacer(modifier = Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { percentage / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = if (percentage == 100f) Color(0xFF10B981) else Color(0xFFF59E0B),
                trackColor = Color(0xFFE2E8F0)
            )

            // WhatsApp Direct buttons
            Spacer(modifier = Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                val siswaPhone = pkl.Siswa?.no_hp
                val hrdPhone = pkl.Mitra?.kontak

                if (!siswaPhone.isNullOrBlank()) {
                    OutlinedButton(
                        onClick = {
                            val clean = siswaPhone.replace(Regex("\\D"), "").let {
                                if (it.startsWith("0")) "62" + it.substring(1) else it
                            }
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$clean?text=${URLEncoder.encode("Halo saya guru pembimbing PKL Anda.", "UTF-8")}"))
                            context.startActivity(intent)
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.MailOutline, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Hub. Siswa", fontSize = 11.sp)
                    }
                }
                if (!hrdPhone.isNullOrBlank()) {
                    OutlinedButton(
                        onClick = {
                            val clean = hrdPhone.replace(Regex("\\D"), "").let {
                                if (it.startsWith("0")) "62" + it.substring(1) else it
                            }
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$clean?text=${URLEncoder.encode("Halo saya guru pembimbing PKL dari sekolah.", "UTF-8")}"))
                            context.startActivity(intent)
                        },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Phone, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Hub. Mitra", fontSize = 11.sp)
                    }
                }
            }

            // Action Buttons
            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    // Nilai
                    TextButton(onClick = onNilai, modifier = Modifier.height(32.dp), contentPadding = PaddingValues(horizontal = 6.dp)) {
                        Icon(Icons.Default.Star, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Nilai", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Kunjungan
                    TextButton(onClick = onKunjungan, modifier = Modifier.height(32.dp), contentPadding = PaddingValues(horizontal = 6.dp)) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Kunjungan", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Cetak (Bagikan Surat Tugas)
                    TextButton(
                        onClick = { shareSuratTugas(context, pkl) },
                        modifier = Modifier.height(32.dp),
                        contentPadding = PaddingValues(horizontal = 6.dp)
                    ) {
                        Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Cetak", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Review Jurnal
                    if (!pkl.jurnal_json?.file_url.isNullOrEmpty()) {
                        val isPendingReview = pkl.jurnal_json?.status == "MENUNGGU_REVIEW"

                        Button(
                            onClick = onReviewJurnal,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isPendingReview) Color(0xFF6366F1) else Color(0xFF10B981)
                            ),
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp),
                            modifier = Modifier.height(28.dp)
                        ) {
                            Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(12.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Jurnal", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }

                if (isHubinAdmin) {
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Default.Delete, contentDescription = "Batal Plotting", tint = Color.Red)
                    }
                }
            }
        }
    }
}

data class DropdownItem(val id: String, val label: String)

@Composable
fun DropdownSpinner(
    options: List<DropdownItem>,
    selectedId: String,
    onSelected: (String) -> Unit,
    placeholder: String
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedOption = options.find { it.id == selectedId }?.label ?: placeholder

    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedTextField(
            value = selectedOption,
            onValueChange = {},
            readOnly = true,
            trailingIcon = {
                IconButton(onClick = { expanded = !expanded }) {
                    Icon(
                        imageVector = if (expanded) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                        contentDescription = null
                    )
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .clickable { expanded = !expanded }
        )

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier.fillMaxWidth()
        ) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option.label) },
                    onClick = {
                        onSelected(option.id)
                        expanded = false
                    }
                )
            }
        }
    }
}

fun shareSuratTugas(context: Context, pkl: SiswaPkl) {
    val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR)
    val docNo = "ST/HUBIN/$currentYear/${pkl.id.take(5).uppercase(Locale.US)}"
    val range = "${pkl.tanggal_mulai} s/d ${pkl.tanggal_selesai ?: "Selesai"}"
    val text = """
        *SURAT TUGAS PRAKTEK KERJA LAPANGAN (PKL)*
        Nomor: ST/HUBIN/$currentYear/KOL/${pkl.id.take(5).uppercase(Locale.US)}
        
        Yang bertanda tangan di bawah ini, Kepala Hubungan Industri (HUBIN) memberikan tugas resmi kepada siswa yang tercantum di bawah ini untuk melaksanakan program Praktek Kerja Lapangan (PKL) pada Industri/Dunia Usaha dan Dunia Kerja (IDUKA) Mitra:
        
        Nama Siswa: ${pkl.Siswa?.nama_siswa?.uppercase(Locale.US)}
        NIS / Kelas: ${pkl.Siswa?.nis} / ${pkl.Siswa?.Kelas?.nama_kelas ?: "XII"}
        Perusahaan Mitra (IDUKA): ${pkl.Mitra?.nama?.uppercase(Locale.US)}
        Alamat Penempatan: ${pkl.Mitra?.alamat ?: "-"}
        Guru Pembimbing: ${pkl.Pembimbing?.nama_guru?.uppercase(Locale.US) ?: "BELUM DITUNJUK"}
        Masa Penempatan PKL: $range
        
        Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab, dedikasi, serta mematuhi seluruh tata tertib dan protokol kerja yang berlaku di Industri Mitra.
    """.trimIndent()

    try {
        val sendIntent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, text)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Cetak / Bagikan Surat Tugas")
        context.startActivity(shareIntent)
    } catch (e: Exception) {
        Toast.makeText(context, "Gagal membagikan surat tugas", Toast.LENGTH_SHORT).show()
    }
}
