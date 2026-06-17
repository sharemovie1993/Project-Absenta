package com.absenta.app.ui.features.attendance

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.widget.Toast
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AttendanceService
import com.absenta.app.data.api.TapRequest
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.common.InputImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ScannerScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    Scaffold(
        topBar = {
            @OptIn(ExperimentalMaterial3Api::class)
            TopAppBar(
                title = { Text("Scanner Presensi Gerbang", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFF0F172A))
        ) {
            if (cameraPermissionState.status.isGranted) {
                CameraScannerContent(context = context)
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text(
                        "Izin Kamera Dibutuhkan",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Aplikasi membutuhkan akses kamera untuk memindai kartu pelajar siswa.",
                        color = Color.Gray,
                        fontSize = 14.sp
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(
                        onClick = { cameraPermissionState.launchPermissionRequest() },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                    ) {
                        Text("Berikan Izin")
                    }
                }
            }
        }
    }
}

@Composable
fun CameraScannerContent(context: Context) {
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    
    var arahTap by remember { mutableStateOf("GERBANG_DATANG") } // GERBANG_DATANG atau GERBANG_PULANG
    var isScanningEnabled by remember { mutableStateOf(true) }
    var scanResultText by remember { mutableStateOf<String?>(null) }
    var scanStatus by remember { mutableStateOf<Boolean?>(null) } // true for success, false for failure

    val cameraExecutor: ExecutorService = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose {
            cameraExecutor.shutdown()
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Camera Preview
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()
                    val preview = Preview.Builder().build().also {
                        it.setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val imageAnalyzer = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { analyzer ->
                            analyzer.setAnalyzer(cameraExecutor, QrCodeAnalyzer { qrCode ->
                                if (isScanningEnabled) {
                                    isScanningEnabled = false
                                    vibratePhone(ctx)
                                    scope.launch {
                                        processScannedQr(
                                            ctx,
                                            qrCode,
                                            arahTap,
                                            onResult = { success, msg ->
                                                scanResultText = msg
                                                scanStatus = success
                                            },
                                            onFinished = {
                                                // Cooldown 3 detik sebelum siap menscan lagi
                                                scope.launch {
                                                    kotlinx.coroutines.delay(3000)
                                                    isScanningEnabled = true
                                                    scanResultText = null
                                                    scanStatus = null
                                                }
                                            }
                                        )
                                    }
                                }
                            })
                        }

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalyzer
                        )
                    } catch (exc: Exception) {
                        Log.e("ScannerScreen", "Camera binding failed", exc)
                    }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        // Overlay & Scanner Frame
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp)
        ) {
            // Scanner target border box
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .align(Alignment.Center)
                    .border(3.dp, if (isScanningEnabled) Color(0xFF3B82F6) else Color(0xFF10B981), RoundedCornerShape(24.dp))
            )

            // Selector Arah Absen (Datang / Pulang) di bagian atas
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
                    .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(12.dp))
                    .padding(6.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { arahTap = "GERBANG_DATANG" },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (arahTap == "GERBANG_DATANG") Color(0xFF1E3C72) else Color.Transparent
                    ),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Masuk", color = Color.White)
                }

                Button(
                    onClick = { arahTap = "GERBANG_PULANG" },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (arahTap == "GERBANG_PULANG") Color(0xFF1E3C72) else Color.Transparent
                    ),
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Pulang", color = Color.White)
                }
            }

            // Status Card di bagian bawah
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                if (scanResultText != null) {
                    val cardBgColor = if (scanStatus == true) Color(0xFF065F46) else Color(0xFF991B1B)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = cardBgColor)
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = if (scanStatus == true) "BERHASIL" else "GAGAL",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = scanResultText!!,
                                fontSize = 14.sp,
                                color = Color.White.copy(alpha = 0.9f),
                                modifier = Modifier.align(Alignment.CenterHorizontally)
                            )
                        }
                    }
                } else {
                    Box(
                        modifier = Modifier
                            .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Text(
                            text = "Arahkan kamera ke QR/Barcode Kartu Siswa",
                            color = Color.White,
                            fontSize = 12.sp
                        )
                    }
                }
            }
        }
    }
}

private fun vibratePhone(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
        vibratorManager.defaultVibrator.vibrate(VibrationEffect.createOneShot(150, VibrationEffect.DEFAULT_AMPLITUDE))
    } else {
        @Suppress("DEPRECATION")
        val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        vibrator.vibrate(150)
    }
}

private suspend fun processScannedQr(
    context: Context,
    qrValue: String,
    arah: String,
    onResult: (Boolean, String) -> Unit,
    onFinished: () -> Unit
) {
    Log.d("AbsentaDebug", "processScannedQr called: qrValue=$qrValue, arah=$arah")
    withContext(Dispatchers.IO) {
        try {
            val apiService = ApiClient.getClient(context).create(AttendanceService::class.java)
            val response = apiService.submitTap(TapRequest(siswa_id = qrValue, arah = arah))
            
            withContext(Dispatchers.Main) {
                if (response.isSuccessful && response.body()?.success == true) {
                    val tapData = response.body()?.data
                    val name = tapData?.siswa?.full_name ?: "Siswa"
                    val status = tapData?.status ?: "HADIR"
                    Log.d("AbsentaDebug", "Submit tap success: name=$name, status=$status")
                    onResult(true, "Tap Sukses! $name - $status")
                } else {
                    val errorMsg = response.body()?.message ?: "Gagal memproses tap presensi."
                    Log.w("AbsentaDebug", "Submit tap failed: Code=${response.code()}, message=$errorMsg")
                    onResult(false, errorMsg)
                }
                onFinished()
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                Log.e("AbsentaDebug", "Exception in processScannedQr: qrValue=$qrValue", e)
                onResult(false, "Koneksi Bermasalah: ${e.localizedMessage}")
                onFinished()
            }
        }
    }
}

class QrCodeAnalyzer(private val onQrCodeScanned: (String) -> Unit) : ImageAnalysis.Analyzer {
    private val scanner = BarcodeScanning.getClient()

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    barcodes.firstOrNull()?.rawValue?.let { qrValue ->
                        onQrCodeScanned(qrValue)
                    }
                }
                .addOnFailureListener {
                    Log.e("QrCodeAnalyzer", "Barcode scanning failed", it)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }
}
