package com.absenta.app.ui.features.hubin

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.api.MitraIndustri
import com.absenta.app.data.api.MitraIndustriInput
import com.absenta.app.data.api.SiswaPkl
import com.absenta.app.data.local.SessionManager
import com.absenta.app.ui.components.PklStatCard
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun MitraIndustriScreen(
    onNavigateBack: () -> Unit,
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
    var isActuallyPembimbing by remember { mutableStateOf(false) }

    var mitraList by remember { mutableStateOf<List<MitraIndustri>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    var page by remember { mutableStateOf(1) }

    // Dialog state
    var showFormDialog by remember { mutableStateOf(false) }
    var editingMitra by remember { mutableStateOf<MitraIndustri?>(null) }
    var isPendingSubmit by remember { mutableStateOf(false) }

    // Form fields
    var formNama by remember { mutableStateOf("") }
    var formBidang by remember { mutableStateOf("") }
    var formAlamat by remember { mutableStateOf("") }
    var formKontak by remember { mutableStateOf("") }
    var formMouUrl by remember { mutableStateOf("") }
    var formLatitude by remember { mutableStateOf("") }
    var formLongitude by remember { mutableStateOf("") }
    var formRadius by remember { mutableStateOf("100") }

    // GPS Confirmation state
    var gpsConfirmationData by remember { mutableStateOf<GpsConfirmation?>(null) }

    // Read session & capabilities
    LaunchedEffect(Unit) {
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        positionCodes = sessionManager.positionCodesFlow.first()

        if (userRole.uppercase() == "GURU") {
            try {
                val academicService = ApiClient.getClient(context).create(AcademicService::class.java)
                val profileResp = academicService.getGuruMe()
                if (profileResp.isSuccessful && profileResp.body()?.success == true) {
                    activeGuruId = profileResp.body()?.data?.id
                }

                activeGuruId?.let { guruId ->
                    val hubinService = ApiClient.getClient(context).create(HubinService::class.java)
                    val penempatanResp = hubinService.getPenempatan(limit = 100)
                    if (penempatanResp.isSuccessful && penempatanResp.body()?.success == true) {
                        val placements = penempatanResp.body()?.data ?: emptyList()
                        isActuallyPembimbing = placements.any { it.pembimbing_id == guruId }
                    }
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    val isHubinAdmin = remember(userRole, userCapabilities, positionCodes) {
        val roleUpper = userRole.uppercase()
        roleUpper == "HUBIN" || roleUpper == "ADMIN" || roleUpper == "SUPERADMIN" ||
                positionCodes.contains("HUBIN") || userCapabilities.contains("hubin.partners.manage")
    }

    val isPembimbing = remember(userRole, userCapabilities, isActuallyPembimbing) {
        (userRole.uppercase() == "GURU" && isActuallyPembimbing) || userCapabilities.contains("hubin.guidance.manage")
    }

    val canEdit = isHubinAdmin || isPembimbing

    fun loadMitra() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getMitra(
                    search = searchQuery.ifBlank { null },
                    page = page,
                    limit = 100
                )
                if (resp.isSuccessful && resp.body()?.success == true) {
                    mitraList = resp.body()?.data ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal memuat mitra industri", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Koneksi internet bermasalah", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(searchQuery) {
        loadMitra()
    }

    @SuppressLint("MissingPermission")
    fun runGpsSync() {
        if (locationPermissionState.status.isGranted) {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                if (location != null) {
                    val lat = location.latitude
                    val lon = location.longitude

                    var distanceInfo = ""
                    var distanceVal = 0f

                    val exLat = formLatitude.toDoubleOrNull()
                    val exLon = formLongitude.toDoubleOrNull()
                    if (exLat != null && exLon != null) {
                        val results = FloatArray(1)
                        Location.distanceBetween(exLat, exLon, lat, lon, results)
                        distanceVal = results[0]
                        distanceInfo = if (distanceVal < 1) {
                            "Lokasi GPS identik (< 1 meter)."
                        } else if (distanceVal < 1000) {
                            "Lokasi berjarak sekitar ${distanceVal.toInt()} meter."
                        } else {
                            "Lokasi berjarak sekitar ${String.format(Locale.US, "%.2f", distanceVal / 1000)} km."
                        }
                    }

                    gpsConfirmationData = GpsConfirmation(
                        lat = lat,
                        lon = lon,
                        address = "Latitude: $lat, Longitude: $lon",
                        distanceInfo = distanceInfo.ifEmpty { null },
                        distanceValue = distanceVal
                    )
                } else {
                    Toast.makeText(context, "Gagal mendeteksi lokasi GPS", Toast.LENGTH_SHORT).show()
                }
            }
        } else {
            locationPermissionState.launchPermissionRequest()
        }
    }

    fun deleteMitra(id: String, name: String) {
        scope.launch {
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.deleteMitra(id)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    Toast.makeText(context, "Mitra $name berhasil dihapus", Toast.LENGTH_SHORT).show()
                    loadMitra()
                } else {
                    Toast.makeText(context, "Gagal menghapus mitra", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan koneksi", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Mitra Industri (PKL)", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
            if (isHubinAdmin) {
                FloatingActionButton(
                    onClick = {
                        editingMitra = null
                        formNama = ""
                        formBidang = ""
                        formAlamat = ""
                        formKontak = ""
                        formMouUrl = ""
                        formLatitude = ""
                        formLongitude = ""
                        formRadius = "100"
                        showFormDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah")
                }
            }
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
                PklStatCard("Total Mitra", mitraList.size.toString(), Color(0xFF3B82F6), modifier = Modifier.weight(1f))
                PklStatCard("MOU Aktif", mitraList.count { !it.mou_url.isNullOrEmpty() }.toString(), Color(0xFF10B981), modifier = Modifier.weight(1f))
                PklStatCard("Ter-Geofence", mitraList.count { it.latitude != null && it.longitude != null }.toString(), Color(0xFFF59E0B), modifier = Modifier.weight(1f))
            }

            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari mitra atau bidang...", fontSize = 13.sp) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .clip(RoundedCornerShape(12.dp)),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                ),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                trailingIcon = {
                    if (searchQuery.isNotEmpty()) {
                        IconButton(onClick = { searchQuery = "" }) {
                            Icon(Icons.Default.Clear, contentDescription = "Clear")
                        }
                    }
                },
                singleLine = true
            )

            Spacer(modifier = Modifier.height(12.dp))

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (mitraList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Tidak ada data mitra industri", color = Color(0xFF94A3B8))
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(mitraList) { mitra ->
                        MitraCard(
                            mitra = mitra,
                            isHubinAdmin = isHubinAdmin,
                            isPembimbing = isPembimbing,
                            onEdit = {
                                editingMitra = mitra
                                formNama = mitra.nama
                                formBidang = mitra.bidang ?: ""
                                formAlamat = mitra.alamat ?: ""
                                formKontak = mitra.kontak ?: ""
                                formMouUrl = mitra.mou_url ?: ""
                                formLatitude = mitra.latitude?.toString() ?: ""
                                formLongitude = mitra.longitude?.toString() ?: ""
                                formRadius = mitra.radius?.toString() ?: "100"
                                showFormDialog = true
                            },
                            onDelete = { deleteMitra(mitra.id, mitra.nama) }
                        )
                    }
                }
            }
        }
    }

    // Modal Form Dialog
    if (showFormDialog) {
        val isEditContactOnly = isPembimbing && !isHubinAdmin

        AlertDialog(
            onDismissRequest = { showFormDialog = false },
            title = {
                Text(
                    text = if (isEditContactOnly) "Pembaruan Kontak & Koordinat" else if (editingMitra != null) "Edit Mitra Industri" else "Tambah Mitra Industri",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp
                )
            },
            text = {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    if (isEditContactOnly) {
                        item {
                            Card(
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF3C7)),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(10.dp),
                                    verticalAlignment = Alignment.Top
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = null,
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        "Mode Terbatas (Pembimbing): Anda hanya dapat mengubah kontak, alamat, dan geofencing koordinat GPS.",
                                        fontSize = 11.sp,
                                        color = Color(0xFF92400E)
                                    )
                                }
                            }
                        }
                    }

                    item {
                        OutlinedTextField(
                            value = formNama,
                            onValueChange = { formNama = it },
                            label = { Text("Nama Perusahaan") },
                            enabled = !isEditContactOnly,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = formBidang,
                            onValueChange = { formBidang = it },
                            label = { Text("Bidang Usaha") },
                            enabled = !isEditContactOnly,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = formKontak,
                            onValueChange = { formKontak = it },
                            label = { Text("Nomor Kontak (WA)") },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone)
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = formAlamat,
                            onValueChange = { formAlamat = it },
                            label = { Text("Alamat Lengkap") },
                            modifier = Modifier.fillMaxWidth(),
                            minLines = 2
                        )
                    }

                    item {
                        OutlinedTextField(
                            value = formMouUrl,
                            onValueChange = { formMouUrl = it },
                            label = { Text("Tautan File MOU") },
                            enabled = !isEditContactOnly,
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true
                        )
                    }

                    item {
                        // Geofencing Block
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9)),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("GEOFENCING PRESENSI", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                                    Button(
                                        onClick = { runGpsSync() },
                                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                        shape = RoundedCornerShape(6.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                    ) {
                                        Icon(Icons.Default.LocationOn, contentDescription = null, modifier = Modifier.size(12.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("GPS Sinkron", fontSize = 10.sp)
                                    }
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    OutlinedTextField(
                                        value = formLatitude,
                                        onValueChange = { formLatitude = it },
                                        label = { Text("Latitude", fontSize = 10.sp) },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                    )
                                    OutlinedTextField(
                                        value = formLongitude,
                                        onValueChange = { formLongitude = it },
                                        label = { Text("Longitude", fontSize = 10.sp) },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                OutlinedTextField(
                                    value = formRadius,
                                    onValueChange = { formRadius = it },
                                    label = { Text("Radius Geofence (Meter)") },
                                    enabled = !isEditContactOnly,
                                    modifier = Modifier.fillMaxWidth(),
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (formNama.isBlank() && !isEditContactOnly) {
                            Toast.makeText(context, "Nama perusahaan wajib diisi", Toast.LENGTH_SHORT).show()
                            return@Button
                        }
                        if (formKontak.isBlank() || formAlamat.isBlank()) {
                            Toast.makeText(context, "Kontak dan Alamat wajib diisi", Toast.LENGTH_SHORT).show()
                            return@Button
                        }

                        isPendingSubmit = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val bodyInput = MitraIndustriInput(
                                    nama = formNama,
                                    bidang = formBidang.ifBlank { null },
                                    alamat = formAlamat.ifBlank { null },
                                    kontak = formKontak.ifBlank { null },
                                    mou_url = formMouUrl.ifBlank { null },
                                    latitude = formLatitude.toDoubleOrNull(),
                                    longitude = formLongitude.toDoubleOrNull(),
                                    radius = formRadius.toIntOrNull() ?: 100
                                )

                                val resp = if (editingMitra != null) {
                                    service.updateMitra(editingMitra!!.id, bodyInput)
                                } else {
                                    service.createMitra(bodyInput)
                                }

                                if (resp.isSuccessful && resp.body()?.success == true) {
                                    Toast.makeText(context, "Perubahan berhasil disimpan!", Toast.LENGTH_SHORT).show()
                                    showFormDialog = false
                                    loadMitra()
                                } else {
                                    Toast.makeText(context, resp.body()?.message ?: "Gagal menyimpan mitra", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isPendingSubmit = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !isPendingSubmit
                ) {
                    if (isPendingSubmit) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                    } else {
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

    // GPS Sync Overlay Dialog (Anti-Fraud & Verification)
    gpsConfirmationData?.let { gpsConf ->
        val GPS_UPDATE_TOLERANCE_KM = 10.0
        val isFar = gpsConf.distanceValue != null && (gpsConf.distanceValue / 1000.0) > GPS_UPDATE_TOLERANCE_KM
        val isEditContactOnly = isPembimbing && !isHubinAdmin

        AlertDialog(
            onDismissRequest = { gpsConfirmationData = null },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF3F51B5), modifier = Modifier.size(24.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Konfirmasi Koordinat GPS", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Satelit mendeteksi lokasi keberadaan Anda:",
                        fontSize = 12.sp,
                        color = Color.Gray
                    )
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFECEFF1)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text(
                            text = "Lat: ${gpsConf.lat}\nLng: ${gpsConf.lon}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(10.dp),
                            color = Color(0xFF37474F)
                        )
                    }

                    if (gpsConf.distanceInfo != null) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isFar) Color(0xFFFFEAEA) else Color(0xFFFFF8E1)
                            ),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    gpsConf.distanceInfo,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isFar) Color(0xFFC62828) else Color(0xFFF57F17)
                                )
                                if (isFar) {
                                    Text(
                                        text = if (isEditContactOnly) {
                                            "⚠️ Jarak terlalu jauh! Perubahan dibatasi maks $GPS_UPDATE_TOLERANCE_KM KM untuk Guru Pembimbing."
                                        } else {
                                            "⚠️ Peringatan: Jarak melebihi $GPS_UPDATE_TOLERANCE_KM KM. Admin Hubin dapat memaksa terapkan koordinat ini."
                                        },
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Red,
                                        modifier = Modifier.padding(top = 4.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        formLatitude = gpsConf.lat.toString()
                        formLongitude = gpsConf.lon.toString()
                        gpsConfirmationData = null
                        Toast.makeText(context, "Koordinat GPS berhasil dipasang", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFar) Color(0xFFD32F2F) else Color(0xFF1E3C72)
                    ),
                    enabled = !(isFar && isEditContactOnly)
                ) {
                    Text(if (isFar) "Paksa Terapkan" else "Terapkan Lokasi")
                }
            },
            dismissButton = {
                TextButton(onClick = { gpsConfirmationData = null }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun MitraCard(
    mitra: MitraIndustri,
    isHubinAdmin: Boolean,
    isPembimbing: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
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
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFE0F7FA)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = mitra.nama.take(2).uppercase(),
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF006064),
                            fontSize = 14.sp
                        )
                    }
                    Spacer(modifier = Modifier.width(10.dp))
                    Column {
                        Text(mitra.nama, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                        Text(mitra.bidang ?: "Tanpa Bidang", fontSize = 12.sp, color = Color(0xFF64748B))
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(mitra.alamat ?: "-", fontSize = 12.sp, color = Color(0xFF475569), maxLines = 1)
            }

            Spacer(modifier = Modifier.height(4.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Phone, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(mitra.kontak ?: "-", fontSize = 12.sp, color = Color(0xFF475569))
            }

            Spacer(modifier = Modifier.height(6.dp))

            // MOU info badge
            if (!mitra.mou_url.isNullOrEmpty()) {
                Box(
                    modifier = Modifier
                        .background(Color(0xFFD1FAE5), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(12.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("MOU AKTIF", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                    }
                }
            } else {
                Text("Belum Ada MOU", fontSize = 10.sp, color = Color.Gray, modifier = Modifier.padding(start = 2.dp))
            }

            // Gated Action Buttons
            if (isHubinAdmin || isPembimbing) {
                HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isHubinAdmin) {
                        TextButton(
                            onClick = onDelete,
                            colors = ButtonDefaults.textButtonColors(contentColor = Color.Red),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Hapus", fontSize = 12.sp)
                        }
                    }
                    Button(
                        onClick = onEdit,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF1F5F9), contentColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(6.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Icon(
                            imageVector = if (isHubinAdmin) Icons.Default.Edit else Icons.Default.Phone,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(if (isHubinAdmin) "Edit" else "Update Kontak", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

data class GpsConfirmation(
    val lat: Double,
    val lon: Double,
    val address: String,
    val distanceInfo: String?,
    val distanceValue: Float?
)
