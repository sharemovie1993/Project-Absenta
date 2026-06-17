package com.absenta.app.ui.features.hubin

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.util.Log
import android.widget.Toast
import androidx.compose.foundation.background
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.AcademicService
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.HubinService
import com.absenta.app.data.api.PklAbsensiRecord
import com.absenta.app.data.api.PklCheckRequest
import com.absenta.app.data.api.PklLogbookRequest
import com.absenta.app.data.api.SiswaPkl
import com.absenta.app.data.api.SubmitJurnalRequest
import com.absenta.app.data.api.HubinSettingsDataInput
import com.absenta.app.data.local.SessionManager
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun PklAbsensiScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    var userRole by remember { mutableStateOf("") }
    var isCheckingRole by remember { mutableStateOf(true) }
    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("HUBIN")
    }

    LaunchedEffect(Unit) {
        userRole = sessionManager.userRoleFlow.first() ?: ""
        isCheckingRole = false
    }

    if (isCheckingRole) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF1E3C72))
        }
    } else if (isLocked) {
        HubinPremiumGate(
            featureName = "Presensi & Jurnal PKL",
            description = "Optimalkan kehadiran dan pelaporan kegiatan magang Anda secara presisi dengan geofencing lokasi presensi, pencatatan jurnal logbook harian terstruktur, dan penyerahan portofolio jurnal akhir.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
    } else if (userRole.uppercase() == "SISWA") {
        StudentAbsensiContent(onNavigateBack, onNavigateToPlans, modifier)
    } else {
        TeacherAbsensiContent(onNavigateBack, onNavigateToPlans, modifier)
    }
}

// ======================== STUDENT VIEW ========================

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun StudentAbsensiContent(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val locationPermissionState = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    var pklDetail by remember { mutableStateOf<SiswaPkl?>(null) }
    var absensiHistory by remember { mutableStateOf<List<PklAbsensiRecord>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var currentLatitude by remember { mutableStateOf<Double?>(null) }
    var currentLongitude by remember { mutableStateOf<Double?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }

    var showLogbookDialog by remember { mutableStateOf(false) }
    var newKegiatanText by remember { mutableStateOf("") }
    var selectedAbsensiIdForLogbook by remember { mutableStateOf<String?>(null) }
    var capturedPhotoUrl by remember { mutableStateOf<String?>(null) }
    var distanceToMitra by remember { mutableStateOf<Float?>(null) }
    var isMockLocation by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableStateOf(0) }
    val activitiesList = remember { mutableStateListOf<KegiatanItem>() }
    val today = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }
    val todayRecord = remember(absensiHistory) {
        absensiHistory.find { it.tanggal.startsWith(today) }
    }

    LaunchedEffect(showLogbookDialog) {
        if (showLogbookDialog) {
            activitiesList.clear()
            val raw = newKegiatanText
            if (raw.startsWith("[")) {
                try {
                    val arr = JSONArray(raw)
                    for (i in 0 until arr.length()) {
                        val obj = arr.getJSONObject(i)
                        activitiesList.add(KegiatanItem(
                            time = obj.optString("time", "08:00"),
                            text = obj.optString("text", "")
                        ))
                    }
                } catch (e: Exception) {
                    activitiesList.add(KegiatanItem("08:00", raw))
                }
            } else if (raw.isNotEmpty()) {
                activitiesList.add(KegiatanItem("08:00", raw))
            }
        }
    }

    fun calculateDistance(lat1: Double?, lon1: Double?, lat2: Double?, lon2: Double?) {
        if (lat1 != null && lon1 != null && lat2 != null && lon2 != null) {
            val results = FloatArray(1)
            Location.distanceBetween(lat1, lon1, lat2, lon2, results)
            distanceToMitra = results[0]
        }
    }

    @SuppressLint("MissingPermission")
    fun requestLocation() {
        if (locationPermissionState.status.isGranted) {
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                if (location != null) {
                    val isMocked = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                        location.isMock
                    } else {
                        @Suppress("DEPRECATION")
                        location.isFromMockProvider
                    }

                    if (isMocked) {
                        isMockLocation = true
                        Toast.makeText(context, "Terdeteksi penggunaan Lokasi Palsu (Fake GPS)!", Toast.LENGTH_LONG).show()
                    } else {
                        isMockLocation = false
                        currentLatitude = location.latitude
                        currentLongitude = location.longitude
                        pklDetail?.Mitra?.let {
                            calculateDistance(currentLatitude, currentLongitude, it.latitude, it.longitude)
                        }
                    }
                }
            }
        } else {
            locationPermissionState.launchPermissionRequest()
        }
    }

    fun loadPklData() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val penempatanResp = service.getMyPenempatan()
                if (penempatanResp.isSuccessful && penempatanResp.body()?.success == true) {
                    pklDetail = penempatanResp.body()?.data
                    pklDetail?.let { detail ->
                        val historyResp = service.getPklAbsensi(detail.id)
                        if (historyResp.isSuccessful) {
                            absensiHistory = historyResp.body()?.data ?: emptyList()
                        }
                    }
                } else {
                    Toast.makeText(context, "Gagal memuat data PKL", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan koneksi internet", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
                requestLocation()
            }
        }
    }

    LaunchedEffect(Unit) {
        loadPklData()
        if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        }
    }

    LaunchedEffect(locationPermissionState.status.isGranted) {
        if (locationPermissionState.status.isGranted) {
            requestLocation()
        }
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Presensi PKL Siswa", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("Presensi", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("Riwayat", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("Portofolio", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                    )
                }
            }
        }
    ) { paddingValues ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else {
            when (selectedTab) {
                0 -> {
                    LazyColumn(
                        modifier = modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                            .background(Color(0xFFF8FAFC)),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Info Mitra Card
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(modifier = Modifier.padding(18.dp)) {
                                    Text(
                                        text = "Informasi Mitra PKL",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color(0xFF1E3C72)
                                    )
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text(
                                        text = pklDetail?.Mitra?.nama ?: "Belum Ditempatkan",
                                        fontSize = 18.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF0F172A)
                                    )
                                    Text(
                                        text = pklDetail?.Mitra?.alamat ?: "-",
                                        fontSize = 12.sp,
                                        color = Color(0xFF64748B),
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFE2E8F0))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("Pembimbing", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                            Text(pklDetail?.Pembimbing?.nama_guru ?: "-", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF334155))
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Radius Geofence", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                            Text("${pklDetail?.Mitra?.radius?.toInt() ?: 100} meter", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF334155))
                                        }
                                    }
                                }
                            }
                        }

                        // GPS & Location Status
                        item {
                            val radius = pklDetail?.Mitra?.radius ?: 100.0
                            val isWithinRadius = distanceToMitra != null && distanceToMitra!! <= radius
                            val locationColor = if (isWithinRadius) Color(0xFF10B981) else Color(0xFFEF4444)

                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = null,
                                        tint = locationColor,
                                        modifier = Modifier.size(40.dp)
                                    )
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text(
                                        text = "LOKASI GPS ANDA",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.Gray,
                                        letterSpacing = 1.sp
                                    )
                                    if (currentLatitude != null && currentLongitude != null) {
                                        Text(
                                            text = "Lat: $currentLatitude, Lng: $currentLongitude",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF475569)
                                        )
                                        Spacer(modifier = Modifier.height(6.dp))
                                        if (distanceToMitra != null) {
                                            Text(
                                                text = "Jarak ke Mitra: ${distanceToMitra!!.toInt()} meter",
                                                fontSize = 14.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = locationColor
                                            )
                                            Text(
                                                text = if (isWithinRadius) "Lokasi Valid (Di dalam Radius)" else "Lokasi Invalid (Di luar Radius)",
                                                fontSize = 12.sp,
                                                color = locationColor,
                                                fontWeight = FontWeight.Medium,
                                                modifier = Modifier.padding(top = 2.dp)
                                            )
                                        }
                                    } else {
                                        Text(
                                            text = "Mencari Lokasi GPS...",
                                            fontSize = 13.sp,
                                            color = Color.Gray
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(12.dp))
                                    OutlinedButton(
                                        onClick = { requestLocation() },
                                        shape = RoundedCornerShape(8.dp)
                                    ) {
                                        Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text("Segarkan GPS", fontSize = 12.sp)
                                    }
                                }
                            }
                        }

                        // Foto Penunjang
                        item {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(
                                    modifier = Modifier.padding(18.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = "FOTO PRESENSI SELFIE",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Gray,
                                        modifier = Modifier.align(Alignment.Start)
                                    )
                                    Spacer(modifier = Modifier.height(12.dp))

                                    Box(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .height(120.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(Color(0xFFF1F5F9)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (capturedPhotoUrl != null) {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981), modifier = Modifier.size(36.dp))
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text("Selfie Terlampir", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF10B981))
                                            }
                                        } else {
                                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                                Icon(Icons.Default.CameraAlt, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(36.dp))
                                                Spacer(modifier = Modifier.height(4.dp))
                                                Text("Ambil Foto selfie di tempat PKL", fontSize = 12.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Button(
                                            onClick = {
                                                capturedPhotoUrl = "https://picsum.photos/400/300?random=" + System.currentTimeMillis()
                                                Toast.makeText(context, "Selfie berhasil diambil!", Toast.LENGTH_SHORT).show()
                                            },
                                            modifier = Modifier.weight(1f),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF475569)),
                                            shape = RoundedCornerShape(8.dp)
                                        ) {
                                            Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("Buka Kamera", fontSize = 12.sp)
                                        }
                                        if (capturedPhotoUrl != null) {
                                            OutlinedButton(
                                                onClick = { capturedPhotoUrl = null },
                                                shape = RoundedCornerShape(8.dp)
                                            ) {
                                                Text("Reset", fontSize = 12.sp, color = Color.Red)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        // Check-in & Check-out Actions
                        item {
                            val radius = pklDetail?.Mitra?.radius ?: 100.0
                            val isWithinRadius = distanceToMitra != null && distanceToMitra!! <= radius

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Button(
                                    onClick = {
                                        if (currentLatitude == null || currentLongitude == null) {
                                            Toast.makeText(context, "Lokasi GPS belum terdeteksi!", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        if (isMockLocation) {
                                            Toast.makeText(context, "Terdeteksi Fake GPS! Harap matikan mock location.", Toast.LENGTH_LONG).show()
                                            return@Button
                                        }
                                        if (!isWithinRadius) {
                                            Toast.makeText(context, "Gagal: Anda di luar radius geofencing!", Toast.LENGTH_LONG).show()
                                            return@Button
                                        }
                                        if (capturedPhotoUrl == null) {
                                            Toast.makeText(context, "Selfie wajib dilampirkan!", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }

                                        isSubmitting = true
                                        scope.launch {
                                            try {
                                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                                val res = service.checkIn(
                                                    PklCheckRequest(
                                                        siswaPklId = pklDetail!!.id,
                                                        latitude = currentLatitude!!,
                                                        longitude = currentLongitude!!,
                                                        image_url = capturedPhotoUrl
                                                    )
                                                )
                                                if (res.isSuccessful && res.body()?.success == true) {
                                                    Toast.makeText(context, "Check-in Berhasil!", Toast.LENGTH_SHORT).show()
                                                    loadPklData()
                                                } else {
                                                    Toast.makeText(context, res.body()?.message ?: "Gagal check-in", Toast.LENGTH_LONG).show()
                                                }
                                            } catch (e: Exception) {
                                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                                            } finally {
                                                isSubmitting = false
                                            }
                                        }
                                    },
                                    enabled = todayRecord?.jam_masuk == null && !isSubmitting,
                                    modifier = Modifier.weight(1f).height(50.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981))
                                ) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        if (todayRecord?.jam_masuk != null) "Telah Masuk" else "Check-In",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                }

                                Button(
                                    onClick = {
                                        if (currentLatitude == null || currentLongitude == null) {
                                            Toast.makeText(context, "Lokasi GPS belum terdeteksi!", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        if (isMockLocation) {
                                            Toast.makeText(context, "Terdeteksi Fake GPS! Harap matikan mock location.", Toast.LENGTH_LONG).show()
                                            return@Button
                                        }
                                        if (!isWithinRadius) {
                                            Toast.makeText(context, "Gagal: Anda di luar radius geofencing!", Toast.LENGTH_LONG).show()
                                            return@Button
                                        }

                                        isSubmitting = true
                                        scope.launch {
                                            try {
                                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                                val res = service.checkOut(
                                                    PklCheckRequest(
                                                        siswaPklId = pklDetail!!.id,
                                                        latitude = currentLatitude!!,
                                                        longitude = currentLongitude!!,
                                                        image_url = capturedPhotoUrl
                                                    )
                                                )
                                                if (res.isSuccessful && res.body()?.success == true) {
                                                    Toast.makeText(context, "Check-out Berhasil!", Toast.LENGTH_SHORT).show()
                                                    loadPklData()
                                                } else {
                                                    Toast.makeText(context, res.body()?.message ?: "Gagal check-out", Toast.LENGTH_LONG).show()
                                                }
                                            } catch (e: Exception) {
                                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                                            } finally {
                                                isSubmitting = false
                                            }
                                        }
                                    },
                                    enabled = todayRecord?.jam_masuk != null && todayRecord.jam_pulang == null && !isSubmitting,
                                    modifier = Modifier.weight(1f).height(50.dp),
                                    shape = RoundedCornerShape(10.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
                                ) {
                                    Icon(Icons.Default.ExitToApp, contentDescription = null)
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        if (todayRecord?.jam_pulang != null) "Telah Pulang" else "Check-Out",
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                }
                            }
                        }

                        // Jurnal Kegiatan Hari Ini
                        item {
                            Text(
                                text = "Jurnal Kegiatan Hari Ini",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B),
                                modifier = Modifier.padding(top = 8.dp)
                            )
                        }

                        if (todayRecord == null) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                        Text("Belum melakukan Check-In hari ini.", color = Color.Gray, fontSize = 13.sp)
                                    }
                                }
                            }
                        } else {
                            item {
                                PklTimelineItem(
                                    record = todayRecord,
                                    onEditLogbook = {
                                        selectedAbsensiIdForLogbook = todayRecord.id
                                        newKegiatanText = todayRecord.kegiatan ?: ""
                                        showLogbookDialog = true
                                    }
                                )
                            }
                        }
                    }
                }
                1 -> { // Riwayat Tab
                    LazyColumn(
                        modifier = modifier
                            .fillMaxSize()
                            .padding(paddingValues)
                            .background(Color(0xFFF8FAFC)),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            Text(
                                text = "Riwayat Kehadiran & Jurnal PKL",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B)
                            )
                        }

                        if (absensiHistory.isEmpty()) {
                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                                        Text("Belum ada riwayat absensi PKL.", color = Color.Gray, fontSize = 13.sp)
                                    }
                                }
                            }
                        } else {
                            items(absensiHistory) { record ->
                                PklTimelineItem(
                                    record = record,
                                    onEditLogbook = {
                                        selectedAbsensiIdForLogbook = record.id
                                        newKegiatanText = record.kegiatan ?: ""
                                        showLogbookDialog = true
                                    }
                                )
                            }
                        }
                    }
                }
                2 -> { // Portofolio Tab
                    PortofolioTabContent(
                        pklDetail = pklDetail,
                        onReload = { loadPklData() },
                        modifier = Modifier.padding(paddingValues)
                    )
                }
            }
        }
    }

    // Add Logbook Dialog
    if (showLogbookDialog && pklDetail != null) {
        AlertDialog(
            onDismissRequest = { showLogbookDialog = false },
            title = { Text("Jurnal Kegiatan Siswa", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Daftar Kegiatan Jurnal:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Spacer(modifier = Modifier.height(4.dp))
                    if (activitiesList.isEmpty()) {
                        Text("(Belum ada kegiatan)", fontSize = 11.sp, color = Color.Gray)
                    } else {
                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 130.dp)
                        ) {
                            activitiesList.forEachIndexed { index, item ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .background(Color(0xFFF1F5F9), RoundedCornerShape(6.dp))
                                        .padding(horizontal = 8.dp, vertical = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("[${item.time}] ${item.text}", fontSize = 12.sp, modifier = Modifier.weight(1f))
                                    IconButton(
                                        onClick = { activitiesList.removeAt(index) },
                                        modifier = Modifier.size(20.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Hapus", tint = Color.Red, modifier = Modifier.size(14.dp))
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Tambah Kegiatan Baru:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    Spacer(modifier = Modifier.height(6.dp))

                    var addTime by remember { mutableStateOf(SimpleDateFormat("HH:mm", Locale.US).format(Date())) }
                    var addText by remember { mutableStateOf("") }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = addTime,
                            onValueChange = { addTime = it },
                            label = { Text("Jam") },
                            modifier = Modifier.width(80.dp),
                            singleLine = true
                        )
                        OutlinedTextField(
                            value = addText,
                            onValueChange = { addText = it },
                            label = { Text("Kegiatan") },
                            modifier = Modifier.weight(1f),
                            singleLine = true
                        )
                        IconButton(
                            onClick = {
                                if (addText.isNotBlank()) {
                                    activitiesList.add(KegiatanItem(addTime, addText.trim()))
                                    addText = ""
                                    addTime = SimpleDateFormat("HH:mm", Locale.US).format(Date())
                                }
                            }
                        ) {
                            Icon(Icons.Default.AddCircle, contentDescription = "Tambah", tint = Color(0xFF1E3C72))
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            try {
                                val arr = JSONArray()
                                activitiesList.forEach { item ->
                                    arr.put(JSONObject().apply {
                                        put("time", item.time)
                                        put("text", item.text)
                                    })
                                }
                                val jsonStr = arr.toString()

                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val response = service.updateLogbook(
                                    pklDetail!!.id,
                                    PklLogbookRequest(
                                        kegiatan = jsonStr,
                                        absensiId = selectedAbsensiIdForLogbook
                                    )
                                )
                                if (response.isSuccessful && response.body()?.success == true) {
                                    Toast.makeText(context, "Jurnal kegiatan berhasil diperbarui!", Toast.LENGTH_SHORT).show()
                                    showLogbookDialog = false
                                    loadPklData()
                                } else {
                                    Toast.makeText(context, "Gagal memperbarui jurnal", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan koneksi", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogbookDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

// ======================== TEACHER VIEW ========================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeacherAbsensiContent(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }

    var penempatanList by remember { mutableStateOf<List<SiswaPkl>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var searchQuery by remember { mutableStateOf("") }
    val todayDateStr = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date()) }

    // Quick add logbook text states
    val quickAddTexts = remember { mutableStateMapOf<String, String>() }

    // Edit Logbook dialog state
    var showLogbookDialog by remember { mutableStateOf(false) }
    var editingAbsensiRecord by remember { mutableStateOf<PklAbsensiRecord?>(null) }
    var editingSiswaPklId by remember { mutableStateOf("") }
    var editJurnalText by remember { mutableStateOf("") }
    var isEditSubmitPending by remember { mutableStateOf(false) }

    var userRole by remember { mutableStateOf("") }
    var userCapabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var positionCodes by remember { mutableStateOf<List<String>>(emptyList()) }
    var activeGuruId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        positionCodes = sessionManager.positionCodesFlow.first()

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

    val isGlobalHubin = remember(userRole, userCapabilities, positionCodes) {
        userRole.uppercase() == "ADMIN" || userRole.uppercase() == "SUPERADMIN" ||
                positionCodes.contains("HUBIN") || userCapabilities.contains("hubin.partners.manage")
    }

    var selectedTeacherTab by remember { mutableStateOf(0) }

    fun loadAttendanceData() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getPenempatan(limit = 100)
                if (resp.isSuccessful && resp.body()?.success == true) {
                    penempatanList = resp.body()?.data ?: emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadAttendanceData()
    }

    val filteredList = remember(penempatanList, searchQuery, isGlobalHubin, activeGuruId) {
        val baseList = if (isGlobalHubin) {
            penempatanList
        } else {
            if (activeGuruId != null) {
                penempatanList.filter { it.pembimbing_id == activeGuruId }
            } else {
                emptyList()
            }
        }
        baseList.filter {
            it.Siswa?.nama_siswa?.contains(searchQuery, ignoreCase = true) == true ||
                    it.Mitra?.nama?.contains(searchQuery, ignoreCase = true) == true
        }
    }

    Scaffold(
        topBar = {
            Column {
                TopAppBar(
                    title = { Text("Monitoring Kehadiran PKL", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
                if (isGlobalHubin) {
                    TabRow(
                        selectedTabIndex = selectedTeacherTab,
                        containerColor = Color.White,
                        contentColor = Color(0xFF1E3C72),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Tab(
                            selected = selectedTeacherTab == 0,
                            onClick = { selectedTeacherTab = 0 },
                            text = { Text("Monitoring", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        )
                        Tab(
                            selected = selectedTeacherTab == 1,
                            onClick = { selectedTeacherTab = 1 },
                            text = { Text("Pengaturan", fontSize = 12.sp, fontWeight = FontWeight.Bold) }
                        )
                    }
                }
            }
        }
    ) { padding ->
        if (selectedTeacherTab == 0) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF8FAFC))
            ) {
            // Search field
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                placeholder = { Text("Cari siswa atau mitra...", fontSize = 13.sp) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clip(RoundedCornerShape(12.dp)),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                ),
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(20.dp)) },
                singleLine = true
            )

            if (isLoading) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (filteredList.isEmpty()) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("Belum ada data penempatan PKL", color = Color.Gray)
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f)
                ) {
                    items(filteredList) { pkl ->
                        val todayAbsen = pkl.AbsensiPkl?.find { it.tanggal.startsWith(todayDateStr) }

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
                                    Column {
                                        Text(pkl.Siswa?.nama_siswa ?: "Siswa", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A))
                                        Text("Kelas: ${pkl.Siswa?.Kelas?.nama_kelas ?: "N/A"} • ${pkl.Mitra?.nama ?: "N/A"}", fontSize = 12.sp, color = Color(0xFF64748B))
                                    }

                                    val status = todayAbsen?.status ?: "BELUM ABSEN"
                                    val statusColor = if (status == "HADIR") Color(0xFF10B981) else Color(0xFFEF4444)
                                    Box(
                                        modifier = Modifier
                                            .background(if (status == "HADIR") Color(0xFFD1FAE5) else Color(0xFFFFEAEA), RoundedCornerShape(6.dp))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = statusColor)
                                    }
                                }

                                if (todayAbsen != null) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Column {
                                            Text("Jam Masuk", fontSize = 10.sp, color = Color.Gray)
                                            Text(todayAbsen.jam_masuk ?: "-", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                                        }
                                        Column {
                                            Text("Jam Pulang", fontSize = 10.sp, color = Color.Gray)
                                            Text(todayAbsen.jam_pulang ?: "-", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF334155))
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Verifikasi", fontSize = 10.sp, color = Color.Gray)
                                            Text(
                                                text = if (todayAbsen.is_verified) "DISETUJUI" else "MENUNGGU",
                                                fontSize = 11.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (todayAbsen.is_verified) Color(0xFF10B981) else Color(0xFFF59E0B)
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(8.dp))
                                    Text("Kegiatan Hari Ini:", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                                    
                                    val activityPreview = remember(todayAbsen.kegiatan) {
                                        val keg = todayAbsen.kegiatan ?: ""
                                        if (keg.startsWith("[")) {
                                            try {
                                                val arr = JSONArray(keg)
                                                val list = mutableListOf<String>()
                                                for (i in 0 until arr.length()) {
                                                    val obj = arr.getJSONObject(i)
                                                    list.add("[${obj.getString("time")}] ${obj.getString("text")}")
                                                }
                                                list.joinToString("\n")
                                            } catch (e: Exception) {
                                                keg
                                            }
                                        } else {
                                            keg.ifEmpty { "(Belum diisi)" }
                                        }
                                    }
                                    Text(activityPreview, fontSize = 12.sp, color = Color(0xFF475569))

                                    // Quick Add Activity field
                                    Spacer(modifier = Modifier.height(10.dp))
                                    val quickText = quickAddTexts[pkl.id] ?: ""
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = quickText,
                                            onValueChange = { quickAddTexts[pkl.id] = it },
                                            placeholder = { Text("Tambahkan kegiatan cepat...", fontSize = 11.sp) },
                                            modifier = Modifier.weight(1f),
                                            singleLine = true
                                        )
                                        Button(
                                            onClick = {
                                                if (quickText.isBlank()) return@Button
                                                scope.launch {
                                                    try {
                                                        // Parse existing JSON array if any
                                                        val listActs = mutableListOf<JSONObject>()
                                                        val existing = todayAbsen.kegiatan ?: ""
                                                        if (existing.startsWith("[")) {
                                                            val arr = JSONArray(existing)
                                                            for (i in 0 until arr.length()) {
                                                                listActs.add(arr.getJSONObject(i))
                                                            }
                                                        } else if (existing.isNotEmpty()) {
                                                            listActs.add(JSONObject().apply {
                                                                put("time", todayAbsen.jam_masuk ?: "08:00")
                                                                put("text", existing)
                                                            })
                                                        }

                                                        // Add new activity
                                                        val timeStr = SimpleDateFormat("HH:mm", Locale.US).format(Date())
                                                        listActs.add(JSONObject().apply {
                                                            put("time", timeStr)
                                                            put("text", quickText.trim())
                                                        })

                                                        val service = ApiClient.getClient(context).create(HubinService::class.java)
                                                        val jsonStr = JSONArray(listActs).toString()
                                                        val response = service.updateLogbook(
                                                            pkl.id,
                                                            PklLogbookRequest(
                                                                kegiatan = jsonStr,
                                                                absensiId = todayAbsen.id
                                                            )
                                                        )
                                                        if (response.isSuccessful && response.body()?.success == true) {
                                                            Toast.makeText(context, "Logbook berhasil diupdate!", Toast.LENGTH_SHORT).show()
                                                            quickAddTexts[pkl.id] = ""
                                                            loadAttendanceData()
                                                        }
                                                    } catch (e: Exception) {
                                                        e.printStackTrace()
                                                    }
                                                }
                                            },
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(14.dp))
                                        }
                                    }

                                    // Verification & Edit Actions
                                    HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.End,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        if (!todayAbsen.is_verified) {
                                            Button(
                                                onClick = {
                                                    scope.launch {
                                                        try {
                                                            val service = ApiClient.getClient(context).create(HubinService::class.java)
                                                            val resp = service.verifyAbsensi(todayAbsen.id)
                                                            if (resp.isSuccessful && resp.body()?.success == true) {
                                                                Toast.makeText(context, "Absensi berhasil diverifikasi!", Toast.LENGTH_SHORT).show()
                                                                loadAttendanceData()
                                                            }
                                                        } catch (e: Exception) {
                                                            e.printStackTrace()
                                                        }
                                                    }
                                                },
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                                                modifier = Modifier.padding(end = 8.dp)
                                            ) {
                                                Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Verifikasi", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                            }
                                        }

                                        OutlinedButton(
                                            onClick = {
                                                editingAbsensiRecord = todayAbsen
                                                editingSiswaPklId = pkl.id
                                                editJurnalText = todayAbsen.kegiatan ?: ""
                                                showLogbookDialog = true
                                            }
                                        ) {
                                            Icon(Icons.Default.Edit, contentDescription = null, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Edit Jurnal", fontSize = 11.sp)
                                        }
                                    }
                                } else {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    Text("Belum ada laporan absen masuk hari ini.", fontSize = 12.sp, color = Color.Gray)
                                }
                            }
                        }
                    }
                }
            }
        }
        } else {
            HubinSettingsTabContent(
                modifier = Modifier.padding(padding)
            )
        }
    }

    // Edit Logbook dialog for Teachers
    if (showLogbookDialog && editingAbsensiRecord != null) {
        AlertDialog(
            onDismissRequest = { showLogbookDialog = false },
            title = { Text("Edit Jurnal Kegiatan Siswa", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Format data jurnal disimpan sebagai teks biasa atau rangkaian kegiatan JSON. Masukkan jurnal detail:", fontSize = 11.sp, color = Color.Gray)
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = editJurnalText,
                        onValueChange = { editJurnalText = it },
                        modifier = Modifier.fillMaxWidth().height(150.dp),
                        placeholder = { Text("Deskripsi pekerjaan siswa...") }
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isEditSubmitPending = true
                        scope.launch {
                            try {
                                val service = ApiClient.getClient(context).create(HubinService::class.java)
                                val response = service.updateLogbook(
                                    editingSiswaPklId,
                                    PklLogbookRequest(
                                        kegiatan = editJurnalText,
                                        absensiId = editingAbsensiRecord!!.id
                                    )
                                )
                                if (response.isSuccessful && response.body()?.success == true) {
                                    Toast.makeText(context, "Jurnal siswa berhasil diperbarui!", Toast.LENGTH_SHORT).show()
                                    showLogbookDialog = false
                                    loadAttendanceData()
                                } else {
                                    Toast.makeText(context, "Gagal mengupdate jurnal", Toast.LENGTH_SHORT).show()
                                }
                            } catch (e: Exception) {
                                Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                            } finally {
                                isEditSubmitPending = false
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    enabled = !isEditSubmitPending
                ) {
                    Text("Simpan")
                }
            },
            dismissButton = {
                TextButton(onClick = { showLogbookDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}

@Composable
fun PklTimelineItem(
    record: PklAbsensiRecord,
    onEditLogbook: () -> Unit,
    modifier: Modifier = Modifier
) {
    val status = record.status ?: "BELUM ABSEN"
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                val dateFormatted = try {
                    val inputFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                    val outputFormat = SimpleDateFormat("EEEE, d MMMM yyyy", Locale("id", "ID"))
                    val parsedDate = inputFormat.parse(record.tanggal.substringBefore("T"))
                    outputFormat.format(parsedDate ?: Date())
                } catch (e: Exception) {
                    record.tanggal
                }

                Text(
                    text = dateFormatted,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF1E293B)
                )

                val statusColor = if (status == "HADIR") Color(0xFF10B981) else Color(0xFFEF4444)
                Box(
                    modifier = Modifier
                        .background(if (status == "HADIR") Color(0xFFD1FAE5) else Color(0xFFFFEAEA), RoundedCornerShape(6.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = statusColor)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text("Jam Masuk", fontSize = 10.sp, color = Color.Gray)
                    Text(record.jam_masuk ?: "-", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                }
                Column {
                    Text("Jam Pulang", fontSize = 10.sp, color = Color.Gray)
                    Text(record.jam_pulang ?: "-", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF475569))
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("Verifikasi", fontSize = 10.sp, color = Color.Gray)
                    Text(
                        text = if (record.is_verified) "DISETUJUI" else "MENUNGGU",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (record.is_verified) Color(0xFF10B981) else Color(0xFFF59E0B)
                    )
                }
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp), color = Color(0xFFF1F5F9))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("Laporan Jurnal Kegiatan:", fontSize = 10.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                    
                    val activityPreview = remember(record.kegiatan) {
                        val keg = record.kegiatan ?: ""
                        if (keg.startsWith("[")) {
                            try {
                                val arr = JSONArray(keg)
                                val list = mutableListOf<String>()
                                for (i in 0 until arr.length()) {
                                    val obj = arr.getJSONObject(i)
                                    list.add("[${obj.getString("time")}] ${obj.getString("text")}")
                                }
                                list.joinToString("\n")
                            } catch (e: Exception) {
                                keg
                            }
                        } else {
                            keg.ifEmpty { "(Belum diisi)" }
                        }
                    }
                    Text(
                        text = activityPreview,
                        fontSize = 12.sp,
                        color = Color(0xFF334155),
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                if (!record.is_verified && status == "HADIR") {
                    IconButton(
                        onClick = onEditLogbook,
                        modifier = Modifier.size(24.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Edit,
                            contentDescription = "Edit Jurnal",
                            tint = Color(0xFF1E3C72),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            }
        }
    }
}

// Structured logbook model
data class KegiatanItem(val time: String, val text: String)

@Composable
fun PortofolioTabContent(
    pklDetail: SiswaPkl?,
    onReload: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var fileUrlInput by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    val jurnal = pklDetail?.jurnal_json
    val hasSubmitted = jurnal != null && jurnal.file_url.isNotEmpty()

    LaunchedEffect(jurnal) {
        if (jurnal != null) {
            fileUrlInput = jurnal.file_url
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFFF8FAFC))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text(
                    text = "JURNAL & PORTOFOLIO AKHIR PKL",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF1E3C72)
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Unggah tautan Google Drive berisi file PDF Jurnal Kegiatan PKL Anda yang sudah lengkap ditandatangani perusahaan untuk diperiksa pembimbing.",
                    fontSize = 13.sp,
                    color = Color(0xFF64748B),
                    lineHeight = 18.sp
                )
            }
        }

        if (hasSubmitted) {
            val statusColor = when (jurnal?.status) {
                "DISETUJUI" -> Color(0xFF10B981)
                "REVISI" -> Color(0xFFEF4444)
                else -> Color(0xFFF59E0B)
            }
            val statusBg = when (jurnal?.status) {
                "DISETUJUI" -> Color(0xFFD1FAE5)
                "REVISI" -> Color(0xFFFFEAEA)
                else -> Color(0xFFFEF3C7)
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Status Verifikasi:", fontSize = 12.sp, color = Color.Gray, fontWeight = FontWeight.Bold)
                        Box(
                            modifier = Modifier
                                .background(statusBg, RoundedCornerShape(6.dp))
                                .padding(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = jurnal?.status ?: "MENUNGGU_REVIEW",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = statusColor
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Tautan File Terkumpul:", fontSize = 11.sp, color = Color.Gray)
                    Text(
                        text = jurnal?.file_url ?: "",
                        fontSize = 13.sp,
                        color = Color(0xFF1E3C72),
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                    )

                    if (!jurnal?.catatan_revisi.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFFFFECEC), RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Column {
                                Text("Catatan Revisi Pembimbing:", fontSize = 11.sp, color = Color(0xFF991B1B), fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(jurnal?.catatan_revisi ?: "", fontSize = 12.sp, color = Color(0xFF7F1D1D))
                            }
                        }
                    }
                }
            }
        }

        // Form Submission
        if (!hasSubmitted || jurnal?.status == "REVISI") {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = if (jurnal?.status == "REVISI") "Unggah Ulang Jurnal (Revisi)" else "Kumpulkan Jurnal",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E293B)
                    )

                    OutlinedTextField(
                        value = fileUrlInput,
                        onValueChange = { fileUrlInput = it },
                        placeholder = { Text("https://drive.google.com/...") },
                        label = { Text("Tautan Google Drive Jurnal PDF") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    Button(
                        onClick = {
                            if (fileUrlInput.isBlank() || !fileUrlInput.startsWith("http")) {
                                Toast.makeText(context, "Masukkan tautan URL Google Drive yang valid", Toast.LENGTH_SHORT).show()
                                return@Button
                            }
                            isSubmitting = true
                            scope.launch {
                                try {
                                    val service = ApiClient.getClient(context).create(HubinService::class.java)
                                    val resp = service.submitJurnalPortofolio(
                                        pklDetail!!.id,
                                        SubmitJurnalRequest(file_url = fileUrlInput)
                                    )
                                    if (resp.isSuccessful && resp.body()?.success == true) {
                                        Toast.makeText(context, "Jurnal portofolio berhasil dikumpulkan!", Toast.LENGTH_SHORT).show()
                                        onReload()
                                    } else {
                                        Toast.makeText(context, resp.body()?.message ?: "Gagal mengirim jurnal", Toast.LENGTH_LONG).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSubmitting = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF10B981)),
                        enabled = !isSubmitting
                    ) {
                        Text("Kirim Portofolio", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun HubinSettingsTabContent(
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var folderUrl by remember { mutableStateOf("") }
    var driveMode by remember { mutableStateOf("simulated") }
    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }

    fun loadSettings() {
        scope.launch {
            isLoading = true
            try {
                val service = ApiClient.getClient(context).create(HubinService::class.java)
                val resp = service.getSettings()
                if (resp.isSuccessful && resp.body()?.success == true) {
                    val data = resp.body()?.data
                    folderUrl = data?.folderUrl ?: ""
                    driveMode = data?.driveMode ?: "simulated"
                }
            } catch (e: Exception) {
                e.printStackTrace()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        loadSettings()
    }

    if (isLoading) {
        Box(modifier = modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = Color(0xFF1E3C72))
        }
    } else {
        Column(
            modifier = modifier
                .fillMaxSize()
                .background(Color(0xFFF8FAFC))
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Pengaturan Google Drive PKL",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E3C72)
                    )

                    OutlinedTextField(
                        value = folderUrl,
                        onValueChange = { folderUrl = it },
                        label = { Text("Tautan Folder Google Drive Utama") },
                        placeholder = { Text("https://drive.google.com/...") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(8.dp))
                    Text("Metode Penyimpanan Dokumen:", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.Gray)
                    
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = driveMode == "simulated",
                                onClick = { driveMode = "simulated" }
                            )
                            Text("Simulasi", fontSize = 13.sp)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            RadioButton(
                                selected = driveMode == "drive",
                                onClick = { driveMode = "drive" }
                            )
                            Text("Google Drive API", fontSize = 13.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Button(
                        onClick = {
                            isSaving = true
                            scope.launch {
                                try {
                                    val service = ApiClient.getClient(context).create(HubinService::class.java)
                                    val resp = service.updateSettings(
                                        HubinSettingsDataInput(folderUrl = folderUrl, driveMode = driveMode)
                                    )
                                    if (resp.isSuccessful && resp.body()?.success == true) {
                                        Toast.makeText(context, "Pengaturan Google Drive berhasil disimpan!", Toast.LENGTH_SHORT).show()
                                    } else {
                                        Toast.makeText(context, "Gagal menyimpan pengaturan", Toast.LENGTH_SHORT).show()
                                    }
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Kesalahan jaringan", Toast.LENGTH_SHORT).show()
                                } finally {
                                    isSaving = false
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                        enabled = !isSaving
                    ) {
                        Text("Simpan Pengaturan", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
