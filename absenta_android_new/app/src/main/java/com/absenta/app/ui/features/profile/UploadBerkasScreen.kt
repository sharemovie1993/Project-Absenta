package com.absenta.app.ui.features.profile

import android.Manifest
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import java.io.FileOutputStream

/**
 * UploadBerkasScreen — Layar upload foto profil & berkas dokumen.
 *
 * Fitur:
 * - Pick gambar dari galeri (READ_MEDIA_IMAGES) ATAU ambil foto dari kamera
 * - Upload via Multipart ke backend [ProfileService.uploadPhoto] / [uploadDocument]
 * - Tampilan preview foto yang dipilih sebelum upload
 *
 * Menggunakan shared component [AbsentaTopBar].
 *
 * @param tokenManager Manager session
 * @param onNavigateBack Callback tombol kembali
 */
@OptIn(ExperimentalMaterial3Api::class, ExperimentalPermissionsApi::class)
@Composable
fun UploadBerkasScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    var selectedPhotoUri by remember { mutableStateOf<Uri?>(null) }
    var selectedDocUri by remember { mutableStateOf<Uri?>(null) }
    var isUploadingPhoto by remember { mutableStateOf(false) }
    var isUploadingDoc by remember { mutableStateOf(false) }

    // Launcher untuk pilih foto dari galeri
    val photoPickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> selectedPhotoUri = uri }

    // Launcher untuk pilih berkas dokumen dari galeri
    val docPickerLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> selectedDocUri = uri }

    Scaffold(
        topBar = {
            AbsentaTopBar(title = "Upload Berkas", onNavigateBack = onNavigateBack)
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = BackgroundDark
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Section: Foto Profil
            item {
                Text("Foto Profil", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    elevation = CardDefaults.cardElevation(2.dp),
                    border = BorderStroke(1.dp, Border)
                ) {
                    Column(modifier = Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        // Preview
                        if (selectedPhotoUri != null) {
                            AsyncImage(
                                model = selectedPhotoUri,
                                contentDescription = "Preview Foto",
                                modifier = Modifier.size(120.dp).clip(RoundedCornerShape(12.dp))
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(120.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceVariantDark)
                                    .border(2.dp, Border, RoundedCornerShape(12.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Image, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(40.dp))
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PickerButton(
                                icon = Icons.Default.Image,
                                label = "Galeri",
                                onClick = { photoPickerLauncher.launch("image/*") },
                                modifier = Modifier.weight(1f)
                            )
                            PickerButton(
                                icon = Icons.Default.CameraAlt,
                                label = "Kamera",
                                onClick = {
                                    if (cameraPermission.status.isGranted) {
                                        /* TODO: CameraX Photo Capture launcher */
                                    } else cameraPermission.launchPermissionRequest()
                                },
                                modifier = Modifier.weight(1f)
                            )
                        }
                        if (selectedPhotoUri != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = {
                                    scope.launch {
                                        isUploadingPhoto = true
                                        try {
                                            val file = uriToFile(context, selectedPhotoUri!!)
                                            val requestFile = file.asRequestBody("image/*".toMediaType())
                                            val photoPart = MultipartBody.Part.createFormData("photo", file.name, requestFile)
                                            val retrofit = ApiClient.create(tokenManager)
                                            val service = retrofit.create(ProfileService::class.java)
                                            val response = service.uploadPhoto(photoPart)
                                            if (response.isSuccessful) {
                                                snackbarHostState.showSnackbar("Foto profil berhasil diupload ✅")
                                                selectedPhotoUri = null
                                            } else {
                                                snackbarHostState.showSnackbar("Gagal upload foto")
                                            }
                                        } catch (e: Exception) {
                                            snackbarHostState.showSnackbar("Koneksi bermasalah")
                                        } finally {
                                            isUploadingPhoto = false
                                        }
                                    }
                                },
                                enabled = !isUploadingPhoto,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary)
                            ) {
                                Icon(Icons.Default.Upload, contentDescription = null)
                                Text(" Upload Foto", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // Section: Upload Berkas Dokumen
            item {
                Text("Berkas Dokumen", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    elevation = CardDefaults.cardElevation(2.dp),
                    border = BorderStroke(1.dp, Border)
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            "Upload berkas seperti KTP, Kartu Keluarga, atau dokumen lainnya.",
                            style = MaterialTheme.typography.bodySmall,
                            color = TextSecondary
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        PickerButton(
                            icon = Icons.Default.Description,
                            label = if (selectedDocUri != null) "Ganti Berkas" else "Pilih Berkas",
                            onClick = { docPickerLauncher.launch("*/*") },
                            modifier = Modifier.fillMaxWidth()
                        )
                        if (selectedDocUri != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text("Berkas dipilih ✓", style = MaterialTheme.typography.bodySmall, color = Primary)
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = {
                                    scope.launch {
                                        isUploadingDoc = true
                                        try {
                                            val file = uriToFile(context, selectedDocUri!!)
                                            val requestFile = file.asRequestBody("application/octet-stream".toMediaType())
                                            val filePart = MultipartBody.Part.createFormData("file", file.name, requestFile)
                                            val jenisPart = "DOKUMEN".toRequestBody("text/plain".toMediaType())
                                            val retrofit = ApiClient.create(tokenManager)
                                            val service = retrofit.create(ProfileService::class.java)
                                            val response = service.uploadDocument(jenisPart, filePart)
                                            if (response.isSuccessful) {
                                                snackbarHostState.showSnackbar("Berkas berhasil diupload ✅")
                                                selectedDocUri = null
                                            } else {
                                                snackbarHostState.showSnackbar("Gagal upload berkas")
                                            }
                                        } catch (e: Exception) {
                                            snackbarHostState.showSnackbar("Koneksi bermasalah")
                                        } finally {
                                            isUploadingDoc = false
                                        }
                                    }
                                },
                                enabled = !isUploadingDoc,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = Primary)
                            ) {
                                Icon(Icons.Default.Upload, contentDescription = null)
                                Text(" Upload Berkas", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Tombol picker dengan ikon */
@Composable
private fun PickerButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = SurfaceVariantDark),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Icon(icon, contentDescription = label, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.size(6.dp))
        Text(label, style = MaterialTheme.typography.labelMedium)
    }
}

/**
 * Mengkonversi URI ke File sementara di cache direktori.
 * Dibutuhkan untuk Multipart upload karena OkHttp membutuhkan File bukan Uri.
 *
 * @param context Context aplikasi
 * @param uri URI yang dipilih dari galeri/kamera
 * @return File di direktori cache
 */
private fun uriToFile(context: Context, uri: Uri): File {
    val inputStream = context.contentResolver.openInputStream(uri)!!
    val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"
    val extension = when {
        mimeType.contains("jpeg") || mimeType.contains("jpg") -> ".jpg"
        mimeType.contains("png") -> ".png"
        mimeType.contains("pdf") -> ".pdf"
        else -> ".bin"
    }
    val tempFile = File(context.cacheDir, "upload_${System.currentTimeMillis()}$extension")
    FileOutputStream(tempFile).use { outputStream ->
        inputStream.copyTo(outputStream)
    }
    return tempFile
}
