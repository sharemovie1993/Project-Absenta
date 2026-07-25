package com.absenta.app.ui.features.profile

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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Badge
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.GuruProfile
import com.absenta.app.data.model.SiswaProfile
import com.absenta.app.data.model.UserProfile
import com.absenta.app.data.model.UserRole
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.StatusHadir
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.flow.firstOrNull

/**
 * MyProfileScreen — Layar profil pengguna untuk semua persona.
 *
 * Fitur Lengkap:
 * - Kartu Pelajar Digital / ID Card Digital Interaktif (QR Code/Barcode, NISN, Foto, Kelas)
 * - Metadata Sekolah (Nama Tenant, NPSN, Status Terverifikasi)
 * - Menu Aksi: Edit Profil & Upload Berkas
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MyProfileScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit,
    onNavigateToEdit: () -> Unit,
    onNavigateToUpload: () -> Unit
) {
    val scope = rememberCoroutineScope()
    var profile by remember { mutableStateOf<UserProfile?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var resolvedPhotoUrlState by remember { mutableStateOf<String?>(null) }
    var loadedSiswa by remember { mutableStateOf<SiswaProfile?>(null) }
    var loadedGuru by remember { mutableStateOf<GuruProfile?>(null) }

    suspend fun loadProfile() {
        isLoading = true
        val savedName = tokenManager.userNameFlow.firstOrNull() ?: "Pengguna"
        val savedRole = tokenManager.userRoleFlow.firstOrNull() ?: "USER"
        val savedPhoto = tokenManager.photoUrlFlow.firstOrNull()
        val token = tokenManager.accessTokenFlow.firstOrNull()

        val fallbackProfile = UserProfile(
            id = "me",
            fullName = savedName,
            email = savedName,
            role = UserRole(name = savedRole),
            photoUrl = savedPhoto
        )

        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(ProfileService::class.java)
            val response = service.getMyProfile()
            if (response.isSuccessful && response.body()?.data != null) {
                val pData = response.body()!!.data!!
                profile = pData
                val userId = pData.id
                val roleName = pData.role?.name?.uppercase() ?: "SISWA"

                var photoCandidate: String? = pData.resolvedPhotoUrl

                if (roleName.contains("SISWA")) {
                    val sRes = service.getSiswaList(userId = userId, limit = 1)
                    if (sRes.isSuccessful && !sRes.body()?.data.isNullOrEmpty()) {
                        loadedSiswa = sRes.body()!!.data!![0]
                        if (photoCandidate.isNullOrEmpty()) photoCandidate = loadedSiswa?.fotoUrl ?: loadedSiswa?.foto
                    }
                    val sId = pData.siswaId ?: loadedSiswa?.id
                    if (sId != null) {
                        try {
                            val docRes = service.getSiswaDocuments(sId)
                            val fotoDoc = docRes.body()?.data?.find { it.kategori?.uppercase() == "FOTO" }
                            if (fotoDoc != null) {
                                photoCandidate = "http://10.10.10.250:3004/api/academic/siswa/$sId/documents/${fotoDoc.id}/download"
                            }
                        } catch (e: Exception) { }
                    }
                } else if (roleName.contains("GURU")) {
                    val gRes = service.getGuruList(userId = userId, limit = 1)
                    if (gRes.isSuccessful && !gRes.body()?.data.isNullOrEmpty()) {
                        loadedGuru = gRes.body()!!.data!![0]
                        if (photoCandidate.isNullOrEmpty()) photoCandidate = loadedGuru?.fotoUrl ?: loadedGuru?.foto
                    }
                    val gId = loadedGuru?.id ?: pData.guru?.id
                    if (gId != null) {
                        try {
                            val docRes = service.getGuruDocuments(gId)
                            val fotoDoc = docRes.body()?.data?.find { it.kategori?.uppercase() == "FOTO" }
                            if (fotoDoc != null) {
                                photoCandidate = "http://10.10.10.250:3004/api/academic/guru/$gId/documents/${fotoDoc.id}/download"
                            }
                        } catch (e: Exception) { }
                    }
                }

                if (!photoCandidate.isNullOrEmpty()) {
                    var fullUrl = photoCandidate
                    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
                        fullUrl = "http://10.10.10.250:3004${if (fullUrl.startsWith("/")) "" else "/"}$fullUrl"
                    }
                    if (!token.isNullOrEmpty() && !fullUrl.contains("token=")) {
                        val sep = if (fullUrl.contains("?")) "&" else "?"
                        fullUrl = "$fullUrl${sep}token=${java.net.URLEncoder.encode(token, "UTF-8")}"
                    }
                    resolvedPhotoUrlState = fullUrl
                }
            } else {
                profile = fallbackProfile
            }
        } catch (e: Exception) {
            profile = fallbackProfile
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(Unit) { loadProfile() }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Profil Saya",
                onNavigateBack = onNavigateBack
            )
        },
        containerColor = BackgroundDark
    ) { paddingValues ->
        when {
            isLoading -> LoadingOverlay(modifier = Modifier.padding(paddingValues))
            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                val p = profile
                val siswa = loadedSiswa ?: p?.siswa
                val guru = loadedGuru ?: p?.guru

                // 1. Digital Student / Employee ID Card (Kartu Identitas Digital)
                item {
                    Text("Kartu Identitas Digital", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Card Header: School Seal & Name
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Default.School, contentDescription = null, tint = Primary, modifier = Modifier.size(24.dp))
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Column {
                                        Text(
                                            p?.tenantInfo?.name ?: "ABSENTA DIGITAL SCHOOL",
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = TextPrimary
                                        )
                                        Text("KARTU IDENTITAS DIGITAL SAGARA", fontSize = 9.sp, color = TextSecondary)
                                    }
                                }

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(Primary.copy(alpha = 0.2f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp)
                                ) {
                                    Text(
                                        p?.role?.name ?: "SISWA",
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Primary
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Profile Photo & Name Box
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(16.dp)
                            ) {
                                val fullPhotoUrl = resolvedPhotoUrlState ?: p?.resolvedPhotoUrl

                                if (!fullPhotoUrl.isNullOrEmpty()) {
                                    AsyncImage(
                                        model = fullPhotoUrl,
                                        contentDescription = "Foto Profil",
                                        modifier = Modifier
                                            .size(80.dp)
                                            .clip(CircleShape)
                                            .border(2.dp, Primary, CircleShape)
                                    )
                                } else {
                                    Box(
                                        modifier = Modifier
                                            .size(80.dp)
                                            .clip(CircleShape)
                                            .background(Primary.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(Icons.Default.Person, contentDescription = null, tint = Primary, modifier = Modifier.size(44.dp))
                                    }
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = p?.displayName ?: "Pengguna Absenta",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextPrimary
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = "Role: ${p?.role?.name ?: "SISWA"}",
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Primary
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    val idSub = p?.siswa?.nis ?: p?.guru?.nip ?: p?.id?.take(12) ?: "-"
                                    Text(
                                        text = "NIP/NIS: $idSub",
                                        fontSize = 11.sp,
                                        color = TextSecondary
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            // Interactive Barcode / QR Code simulation container for Gate Scanning
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(SurfaceVariantDark)
                                    .border(1.dp, Border, RoundedCornerShape(12.dp))
                                    .padding(12.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.Center
                                ) {
                                    Icon(Icons.Default.QrCode2, contentDescription = "QR Code Gerbang", tint = Primary, modifier = Modifier.size(32.dp))
                                    Spacer(modifier = Modifier.width(10.dp))
                                    Column {
                                        Text("KODE BARCODE GERBANG", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                        Text("Scan di Mesin Absensi Gerbang Sekolah", fontSize = 9.sp, color = TextSecondary)
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Menu Aksi Profil
                item {
                    Text("Pengaturan & Aksi", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column {
                            ActionRow(
                                icon = Icons.Default.Edit,
                                label = "Edit Informasi Profil",
                                onClick = onNavigateToEdit
                            )
                            ActionRow(
                                icon = Icons.Default.Upload,
                                label = "Upload Foto & Berkas Identitas",
                                onClick = onNavigateToUpload
                            )
                        }
                    }
                }

                // 3. Detail Biodata Diri & Kepegawaian / Akademik
                item {
                    Text("Biodata & Informasi Detail", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                        elevation = CardDefaults.cardElevation(2.dp),
                        border = BorderStroke(1.dp, Border)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            val siswa = p?.siswa
                            val guru = p?.guru

                            if (siswa != null) {
                                InfoItem("Nama Siswa", siswa.namaSiswa ?: p.displayName)
                                InfoItem("NIS", siswa.nis ?: "-")
                                InfoItem("NISN", siswa.nisn ?: "-")
                                InfoItem("Kelas", siswa.kelas?.namaKelas ?: "-")
                                InfoItem("Jurusan", siswa.jurusan?.nama ?: siswa.jurusan?.singkatan ?: "-")
                                val jkText = when (siswa.jenisKelamin?.uppercase()) {
                                    "L" -> "Laki-laki"
                                    "P" -> "Perempuan"
                                    else -> "-"
                                }
                                InfoItem("Jenis Kelamin", jkText)
                                InfoItem("Tanggal Lahir", siswa.tanggalLahir ?: "-")
                                InfoItem("Agama", siswa.agama ?: "-")
                                InfoItem("Nomor HP", siswa.noHp ?: p.phone ?: "-")
                                InfoItem("Alamat", siswa.alamat ?: p.address ?: "-")
                            } else if (guru != null) {
                                InfoItem("Nama Guru", guru.namaGuru ?: p.displayName)
                                InfoItem("NIP", guru.nip ?: "-")
                                InfoItem("Status Pegawai", guru.statusKepegawaian ?: "-")
                                InfoItem("Jenis PTK", guru.jenisPtk ?: "PENDIDIK")
                                InfoItem("Pendidikan Terakhir", guru.pendidikanTerakhir ?: "-")
                                val jkText = when (guru.jenisKelamin?.uppercase()) {
                                    "L" -> "Laki-laki"
                                    "P" -> "Perempuan"
                                    else -> "-"
                                }
                                InfoItem("Jenis Kelamin", jkText)
                                InfoItem("Agama", guru.agama ?: "-")
                                InfoItem("Nomor HP", guru.noHp ?: p.phone ?: "-")
                                InfoItem("Alamat", guru.alamat ?: p.address ?: "-")
                            } else {
                                InfoItem("Nama Lengkap", p?.fullName ?: p?.name ?: "-")
                                InfoItem("Email", p?.email ?: "-")
                                InfoItem("Username", p?.username ?: "-")
                                InfoItem("Nomor Telepon", p?.phone ?: "-")
                            }

                            Divider(modifier = Modifier.padding(vertical = 4.dp), color = Border)
                            InfoItem("Sekolah / Tenant", p?.tenantInfo?.name ?: "Absenta Digital School")
                            InfoItem("Tahun Pelajaran", "2026/2027 (Genap)")
                        }
                    }
                }
            }
        }
    }
}

/** Component item baris aksi */
@Composable
private fun ActionRow(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = Primary, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium, color = TextPrimary)
        }
        Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary, modifier = Modifier.size(20.dp))
    }
}

/** Component item baris info */
@Composable
private fun InfoItem(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = TextSecondary)
        Text(value, style = MaterialTheme.typography.bodySmall, color = TextPrimary, fontWeight = FontWeight.Medium)
    }
}

