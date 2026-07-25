package com.absenta.app.ui.features.attendance

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import android.util.Log
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceDayDetail
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.MonthlyRekapData
import com.absenta.app.data.local.SessionManager
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalPermissionsApi::class, ExperimentalMaterial3Api::class)
@Composable
fun MyAttendanceScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val locationPermissionState = rememberPermissionState(Manifest.permission.ACCESS_FINE_LOCATION)

    var userName by remember { mutableStateOf("") }
    var userRole by remember { mutableStateOf("") }
    var userCapabilities by remember { mutableStateOf<List<String>>(emptyList()) }
    var calendarDate by remember { mutableStateOf(Calendar.getInstance()) }
    var rekapData by remember { mutableStateOf<MonthlyRekapData?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var currentLatitude by remember { mutableStateOf<Double?>(null) }
    var currentLongitude by remember { mutableStateOf<Double?>(null) }
    var isSubmitting by remember { mutableStateOf(false) }

    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val isLocked = enabledFeatures.isNotEmpty() && !enabledFeatures.contains("ABSENSI")

    val monthYearFormat = remember { SimpleDateFormat("MMMM yyyy", Locale("in", "ID")) }
    val dbMonthFormat = remember { SimpleDateFormat("yyyy-MM", Locale.US) }

    // Memuat rekap bulanan secara otomatis saat bulan berubah
    fun loadRekap() {
        scope.launch {
            isLoading = true
            userName = sessionManager.userNameFlow.first() ?: "Pengguna"
            userRole = sessionManager.userRoleFlow.first() ?: ""
            userCapabilities = sessionManager.capabilitiesFlow.first()
            val bulanKey = dbMonthFormat.format(calendarDate.time)
            Log.d("AbsentaDebug", "Loading personal attendance rekap: UserRole=$userRole, Month=$bulanKey")
            
            try {
                val apiService = ApiClient.getClient(context).create(AttendanceService::class.java)
                val isSiswaRekap = userRole == "PARENT" || userRole == "WALI_MURID" || userRole == "ORTU" || userRole == "SISWA" || userRole == "STUDENT" || userCapabilities.contains("attendance.rekap.siswa")
                
                val response = if (isSiswaRekap) {
                    Log.d("AbsentaDebug", "Fetching student attendance rekap...")
                    apiService.getRekapBulananSiswaMe(bulanKey)
                } else {
                    Log.d("AbsentaDebug", "Fetching teacher attendance rekap...")
                    apiService.getRekapBulananGuruMe(bulanKey)
                }

                if (response.isSuccessful && response.body()?.success == true) {
                    rekapData = response.body()?.data
                    Log.d("AbsentaDebug", "Rekap load success: DaysCount=${rekapData?.detail?.size ?: 0}")
                } else {
                    rekapData = null
                    Log.w("AbsentaDebug", "Rekap load failed: Code=${response.code()}, Message=${response.body()?.message}")
                }
            } catch (e: Exception) {
                rekapData = null
                Log.e("AbsentaDebug", "Exception while loading attendance rekap", e)
                Toast.makeText(context, "Koneksi bermasalah: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    // Mendapatkan Koordinat GPS Real-Time
    @SuppressLint("MissingPermission")
    fun requestLocation() {
        if (locationPermissionState.status.isGranted) {
            Log.d("AbsentaDebug", "Requesting current GPS location...")
            val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)
            fusedLocationClient.lastLocation.addOnSuccessListener { location: Location? ->
                if (location != null) {
                    currentLatitude = location.latitude
                    currentLongitude = location.longitude
                    Log.d("AbsentaDebug", "GPS Location obtained: Lat=$currentLatitude, Lng=$currentLongitude")
                } else {
                    Log.w("AbsentaDebug", "GPS Location is null. Location setting might be disabled.")
                    Toast.makeText(context, "Gagal melacak lokasi GPS harian. Pastikan GPS aktif.", Toast.LENGTH_SHORT).show()
                }
            }.addOnFailureListener {
                Log.e("AbsentaDebug", "Failed to obtain GPS Location", it)
            }
        } else {
            Log.d("AbsentaDebug", "Location permission not granted when requesting location.")
            locationPermissionState.launchPermissionRequest()
        }
    }

    LaunchedEffect(Unit) {
        userName = sessionManager.userNameFlow.first() ?: "Pengguna"
        userRole = sessionManager.userRoleFlow.first() ?: ""
        userCapabilities = sessionManager.capabilitiesFlow.first()
        if (!locationPermissionState.status.isGranted) {
            locationPermissionState.launchPermissionRequest()
        } else {
            requestLocation()
        }
    }

    LaunchedEffect(calendarDate) {
        loadRekap()
    }

    LaunchedEffect(locationPermissionState.status.isGranted) {
        if (locationPermissionState.status.isGranted) {
            requestLocation()
        }
    }

    val canCheckIn = userCapabilities.isEmpty() || userCapabilities.contains("attendance.self.checkin") || userCapabilities.contains("attendance.checkin") || userRole == "GURU" || userRole == "SISWA" || userRole == "TEACHER" || userRole == "STUDENT"

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Presensi Saya", fontWeight = FontWeight.Bold, color = Color.White) },
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
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC)),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // 1. Premium Header Card
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(4.dp, RoundedCornerShape(24.dp)),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.Transparent)
                ) {
                    Box(
                        modifier = Modifier
                            .background(
                                brush = Brush.verticalGradient(
                                    colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))
                                )
                            )
                            .padding(24.dp)
                    ) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(56.dp)
                                        .background(Color.White.copy(alpha = 0.2f), CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AccountCircle,
                                        contentDescription = "User Avatar",
                                        tint = Color.White,
                                        modifier = Modifier.size(36.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(16.dp))
                                Column {
                                    Text(
                                        text = "Selamat Datang,",
                                        fontSize = 12.sp,
                                        color = Color.White.copy(alpha = 0.7f),
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = userName,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.height(16.dp))
                            Divider(color = Color.White.copy(alpha = 0.15f))
                            Spacer(modifier = Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "Monitoring kedisiplinan dan poin kehadiran Anda.",
                                    fontSize = 11.sp,
                                    color = Color.White.copy(alpha = 0.8f),
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.weight(1f)
                                )
                                Box(
                                    modifier = Modifier
                                        .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(8.dp))
                                        .padding(horizontal = 10.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = userRole.uppercase(),
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Premium Gating Banner (Non-intrusive preview mode)
            if (isLocked) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFFBEB)),
                        border = BorderStroke(1.dp, Color(0xFFFDE68A))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .background(Color(0xFFFEF3C7), CircleShape),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Lock,
                                    contentDescription = "Locked",
                                    tint = Color(0xFFD97706),
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                            Spacer(modifier = Modifier.width(16.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFFFEF3C7), RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "MODUL ABSENSI",
                                            fontSize = 8.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color(0xFFB45309)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text(
                                        text = "PREVIEW MODE",
                                        fontSize = 8.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.Gray
                                    )
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Fitur Premium Belum Aktif",
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF78350F)
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "Sekolah Anda belum mengaktifkan layanan modul ABSENSI secara penuh. Silakan hubungi Administrator sekolah untuk akses penuh.",
                                    fontSize = 11.sp,
                                    color = Color(0xFF92400E),
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }

            // 2. GPS Check-In Card
            if (canCheckIn) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Start
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .background(Color(0xFFFFECEF), RoundedCornerShape(10.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.LocationOn,
                                        contentDescription = "Lokasi Saya",
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Text(
                                    text = "PRESENSI MANDIRI (GPS)",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E293B),
                                    letterSpacing = 0.5.sp
                                )
                            }
                            
                            Spacer(modifier = Modifier.height(12.dp))

                            // Disclaimer/Flag: Inactive for general daily attendance (only for PKL module)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFFFFBEB), RoundedCornerShape(10.dp))
                                    .border(1.dp, Color(0xFFFDE68A), RoundedCornerShape(10.dp))
                                    .padding(12.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Warning,
                                        contentDescription = "Peringatan",
                                        tint = Color(0xFFD97706),
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Presensi GPS dinonaktifkan untuk presensi harian umum. Fitur ini hanya berlaku untuk modul Absensi PKL.",
                                        fontSize = 10.sp,
                                        color = Color(0xFF92400E),
                                        fontWeight = FontWeight.Bold,
                                        lineHeight = 14.sp
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))
                            
                            // Pulse location tracking state
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFFF8FAFC), RoundedCornerShape(12.dp))
                                    .border(1.dp, Color(0xFFE2E8F0), RoundedCornerShape(12.dp))
                                    .padding(16.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    if (currentLatitude != null && currentLongitude != null) {
                                        Text(
                                            text = "Koordinat Lokasi Anda",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.Gray,
                                            textAlign = TextAlign.Center
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "Lat: $currentLatitude\nLng: $currentLongitude",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = Color(0xFF334155),
                                            textAlign = TextAlign.Center,
                                            lineHeight = 18.sp
                                        )
                                    } else {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            CircularProgressIndicator(
                                                modifier = Modifier.size(16.dp),
                                                strokeWidth = 2.dp,
                                                color = Color(0xFF1E3C72)
                                            )
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                text = "Mendeteksi Lokasi GPS...",
                                                fontSize = 13.sp,
                                                color = Color.Gray,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                            }
                            
                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                OutlinedButton(
                                    onClick = { requestLocation() },
                                    modifier = Modifier.weight(1f),
                                    shape = RoundedCornerShape(12.dp),
                                    border = BorderStroke(1.dp, Color(0xFFCBD5E1))
                                ) {
                                    Icon(Icons.Default.Refresh, contentDescription = "Refresh", modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Perbarui", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
                                
                                Button(
                                    onClick = {
                                        if (isLocked) {
                                            Toast.makeText(context, "Modul ABSENSI belum aktif (Premium Gated)", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        if (currentLatitude == null || currentLongitude == null) {
                                            Toast.makeText(context, "Koordinat GPS belum didapatkan", Toast.LENGTH_SHORT).show()
                                            return@Button
                                        }
                                        isSubmitting = true
                                        scope.launch {
                                            // Simulasi pengiriman koordinat ke API backend presensi mandiri
                                            kotlinx.coroutines.delay(1500)
                                            isSubmitting = false
                                            Log.d("AbsentaDebug", "Simulated GPS attendance submission successful.")
                                            Toast.makeText(context, "Presensi GPS Berhasil dikirim!", Toast.LENGTH_LONG).show()
                                            loadRekap() // auto-reload the calendar & stats
                                        }
                                    },
                                    modifier = Modifier.weight(1.5f),
                                    shape = RoundedCornerShape(12.dp),
                                    colors = if (isLocked) {
                                        ButtonDefaults.buttonColors(containerColor = Color(0xFFE2E8F0))
                                    } else {
                                        ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                                    },
                                    enabled = !isSubmitting && currentLatitude != null
                                ) {
                                    if (isSubmitting) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(16.dp),
                                            strokeWidth = 2.dp,
                                            color = Color.White
                                        )
                                    } else {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.Center
                                        ) {
                                            if (isLocked) {
                                                Icon(
                                                    imageVector = Icons.Default.Lock,
                                                    contentDescription = "Locked",
                                                    tint = Color(0xFF94A3B8),
                                                    modifier = Modifier.size(14.dp)
                                                )
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                            Text(
                                                text = if (isLocked) "Terkunci" else "Kirim Presensi",
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (isLocked) Color(0xFF94A3B8) else Color.White
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF1F2))
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Warning, contentDescription = "Akses Ditolak", tint = Color(0xFFF43F5E))
                            Spacer(modifier = Modifier.width(12.dp))
                            Text(
                                "Role Anda tidak memiliki perizinan untuk melakukan presensi mandiri GPS.",
                                fontSize = 11.sp,
                                color = Color(0xFFBE123C),
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // 3. Month Picker Controller
            item {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(2.dp, RoundedCornerShape(16.dp)),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = {
                            val newCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                add(Calendar.MONTH, -1)
                            }
                            calendarDate = newCal
                        }) {
                            Icon(Icons.Default.KeyboardArrowLeft, contentDescription = "Bulan Sebelumnya")
                        }

                        Text(
                            text = monthYearFormat.format(calendarDate.time).uppercase(),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF1E293B),
                            letterSpacing = 1.sp
                        )

                        IconButton(onClick = {
                            val newCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                add(Calendar.MONTH, 1)
                            }
                            calendarDate = newCal
                        }) {
                            Icon(Icons.Default.KeyboardArrowRight, contentDescription = "Bulan Berikutnya")
                        }
                    }
                }
            }

            // Loading / Empty / Content States
            if (isLoading) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                }
            } else if (rekapData == null || rekapData?.detail.isNullOrEmpty()) {
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier.padding(32.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.Info,
                                contentDescription = "Tidak Ada Data",
                                tint = Color.LightGray,
                                modifier = Modifier.size(48.dp)
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Text(
                                "Belum Ada Data Presensi",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color(0xFF1E293B)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Tidak ditemukan catatan presensi untuk periode ini.",
                                color = Color.Gray,
                                fontSize = 12.sp,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            } else {
                // 4. Ringkasan Kedisiplinan & Poin
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .shadow(2.dp, RoundedCornerShape(16.dp)),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "POIN KEHADIRAN",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.Gray
                                    )
                                    Icon(
                                        imageVector = Icons.Default.Star,
                                        contentDescription = "Poin",
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = "${rekapData?.total_poin ?: 0} Pts",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF1E293B)
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "Akumulasi bulan ini",
                                    fontSize = 9.sp,
                                    color = Color.Gray
                                )
                            }
                        }

                        Card(
                            modifier = Modifier
                                .weight(1f)
                                .shadow(2.dp, RoundedCornerShape(16.dp)),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "PERSENTASE",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.Gray
                                    )
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = "Rasio",
                                        tint = Color(0xFF10B981),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                Spacer(modifier = Modifier.height(8.dp))
                                val persentase = rekapData?.persentase_kehadiran?.toInt() ?: 0
                                Text(
                                    text = "$persentase%",
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color(0xFF10B981)
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                LinearProgressIndicator(
                                    progress = persentase / 100f,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .height(4.dp)
                                        .clip(CircleShape),
                                    color = Color(0xFF10B981),
                                    trackColor = Color(0xFFE2E8F0)
                                )
                            }
                        }
                    }
                }

                // 5. Kalender Presensi Card
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(24.dp)),
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "KALENDER PRESENSI",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.Gray,
                                modifier = Modifier.padding(bottom = 12.dp)
                            )
                            
                            // Days Header
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp)
                            ) {
                                listOf("Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min").forEach { day ->
                                    Text(
                                        text = day,
                                        modifier = Modifier.weight(1f),
                                        textAlign = TextAlign.Center,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.Gray.copy(alpha = 0.8f)
                                    )
                                }
                            }

                            // Calculate Calendar Grid Days
                            val daysInMonth = calendarDate.getActualMaximum(Calendar.DAY_OF_MONTH)
                            val firstDayCal = Calendar.getInstance().apply {
                                time = calendarDate.time
                                set(Calendar.DAY_OF_MONTH, 1)
                            }
                            val dayOfWeek = firstDayCal.get(Calendar.DAY_OF_WEEK) // 1 = Sun, 2 = Mon
                            val prefixEmptyDays = if (dayOfWeek == Calendar.SUNDAY) 6 else dayOfWeek - 2

                            val totalSlots = prefixEmptyDays + daysInMonth
                            val rows = (totalSlots + 6) / 7

                            val detailMap = rekapData?.detail?.associateBy { it.tanggal } ?: emptyMap()
                            val dateFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)

                            for (r in 0 until rows) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    for (c in 0 until 7) {
                                        val slotIndex = r * 7 + c
                                        val dayNumber = slotIndex - prefixEmptyDays + 1

                                        Box(
                                            modifier = Modifier
                                                .weight(1f)
                                                .aspectRatio(1f),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (dayNumber in 1..daysInMonth) {
                                                val dayCal = Calendar.getInstance().apply {
                                                    time = calendarDate.time
                                                    set(Calendar.DAY_OF_MONTH, dayNumber)
                                                }
                                                val dateStr = dateFormatter.format(dayCal.time)
                                                val detail = detailMap[dateStr]
                                                val isToday = isTodayDate(dayCal)

                                                CalendarDayCell(
                                                    dayNumber = dayNumber,
                                                    detail = detail,
                                                    isToday = isToday
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 6. Rincian Kehadiran Card (Counters)
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier.padding(20.dp),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            Text(
                                "Rincian Kehadiran",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFF1E293B)
                            )
                            
                            val statsMap = rekapData?.statistik ?: emptyMap()

                            StatusSummaryRow(
                                label = "HADIR TEPAT WAKTU",
                                count = statsMap["HADIR"] ?: 0,
                                color = Color(0xFF10B981)
                            )
                            StatusSummaryRow(
                                label = "TERLAMBAT",
                                count = statsMap["TERLAMBAT"] ?: 0,
                                color = Color(0xFFF59E0B)
                            )
                            StatusSummaryRow(
                                label = "IZIN",
                                count = statsMap["IZIN"] ?: 0,
                                color = Color(0xFF3B82F6)
                            )
                            StatusSummaryRow(
                                label = "SAKIT",
                                count = statsMap["SAKIT"] ?: 0,
                                color = Color(0xFF8B5CF6)
                            )
                            StatusSummaryRow(
                                label = "ALPA",
                                count = statsMap["ALPA"] ?: 0,
                                color = Color(0xFFEF4444)
                            )
                        }
                    }
                }

                // 7. Legenda Status & Verifikasi IoT Info
                item {
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(2.dp, RoundedCornerShape(20.dp)),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(
                                "Legenda Status",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Black,
                                color = Color(0xFF1E293B),
                                modifier = Modifier.padding(bottom = 16.dp)
                            )

                            val legends = listOf(
                                LegendItemData("HADIR", "Hadir Tepat Waktu", Color(0xFF10B981)),
                                LegendItemData("TERLAMBAT", "Terlambat Masuk Sesi", Color(0xFFF59E0B)),
                                LegendItemData("SAKIT", "Sakit dengan Surat/Keterangan", Color(0xFF8B5CF6)),
                                LegendItemData("IZIN", "Izin Disetujui Sekolah", Color(0xFF3B82F6)),
                                LegendItemData("ALPA", "Alpa / Tanpa Keterangan", Color(0xFFEF4444)),
                                LegendItemData("BELUM", "Belum Ada Catatan/Data", Color(0xFFCBD5E1))
                            )

                            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                legends.forEach { legend ->
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier.fillMaxWidth()
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .size(24.dp)
                                                .background(legend.color.copy(alpha = 0.15f), RoundedCornerShape(6.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .size(8.dp)
                                                    .background(legend.color, CircleShape)
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(12.dp))
                                        Column {
                                            Text(
                                                text = legend.key,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black,
                                                color = Color(0xFF1E293B)
                                            )
                                            Text(
                                                text = legend.label,
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.Gray
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // 8. IoT Verification Banner
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .shadow(4.dp, RoundedCornerShape(24.dp))
                            .background(
                                brush = Brush.linearGradient(
                                    colors = listOf(Color(0xFF4F46E5), Color(0xFF3B82F6))
                                ),
                                shape = RoundedCornerShape(24.dp)
                            )
                            .padding(24.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = "IoT",
                                    tint = Color(0xFFFBBF24),
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "SERTIFIKASI KEHADIRAN",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Black,
                                    color = Color.White,
                                    letterSpacing = 0.5.sp
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Text(
                                text = "Data kehadiran ini divalidasi oleh sistem gerbang IoT dan verifikasi sesi admin sekolah.",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.9f),
                                fontWeight = FontWeight.Bold,
                                lineHeight = 16.sp
                            )
                        }
                    }
                }
            }
        }
    }
}

data class LegendItemData(
    val key: String,
    val label: String,
    val color: Color
)

@Composable
fun CalendarDayCell(dayNumber: Int, detail: AttendanceDayDetail?, isToday: Boolean) {
    val status = detail?.status ?: "BELUM"
    val badgeColor = when (status) {
        "HADIR" -> Color(0xFF10B981)
        "TERLAMBAT" -> Color(0xFFF59E0B)
        "SAKIT" -> Color(0xFF8B5CF6)
        "IZIN" -> Color(0xFF3B82F6)
        "ALPA" -> Color(0xFFEF4444)
        else -> Color(0xFFE2E8F0)
    }

    val textColor = if (status == "BELUM") Color(0xFF64748B) else Color.White
    
    val modifier = if (isToday) {
        Modifier
            .fillMaxSize()
            .background(badgeColor, RoundedCornerShape(12.dp))
            .border(2.dp, Color(0xFF1E3C72), RoundedCornerShape(12.dp))
    } else {
        Modifier
            .fillMaxSize()
            .background(badgeColor, RoundedCornerShape(12.dp))
    }

    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = dayNumber.toString(),
            color = textColor,
            fontSize = 11.sp,
            fontWeight = FontWeight.Black
        )
    }
}

fun isTodayDate(calendar: Calendar): Boolean {
    val today = Calendar.getInstance()
    return calendar.get(Calendar.YEAR) == today.get(Calendar.YEAR) &&
            calendar.get(Calendar.DAY_OF_YEAR) == today.get(Calendar.DAY_OF_YEAR)
}
