package com.absenta.app.ui.features.profile

import android.util.Log
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ChangePasswordRequest
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.api.UpdateProfileRequest
import com.absenta.app.data.api.UserProfile
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onNavigateBack: () -> Unit,
    onLogout: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }

    var profile by remember { mutableStateOf<UserProfile?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    var showEditDialog by remember { mutableStateOf(false) }
    var showPasswordDialog by remember { mutableStateOf(false) }
    var showLogoutDialog by remember { mutableStateOf(false) }
    var snackMessage by remember { mutableStateOf<String?>(null) }
    val snackbarHostState = remember { SnackbarHostState() }

    LaunchedEffect(Unit) {
        Log.d("AbsentaDebug", "ProfileScreen loaded")
        isLoading = true
        try {
            val service = ApiClient.getClient(context).create(ProfileService::class.java)
            val resp = service.getProfile()
            if (resp.isSuccessful) {
                profile = resp.body()?.data
                Log.d("AbsentaDebug", "Profile loaded: name=${profile?.name}, role=${profile?.role}")
            } else {
                Log.w("AbsentaDebug", "Profile API error: ${resp.code()}")
                android.widget.Toast.makeText(context, "Gagal memuat profil: " + resp.message(), android.widget.Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "ProfileScreen error", e)
            android.widget.Toast.makeText(context, "Kesalahan koneksi internet", android.widget.Toast.LENGTH_SHORT).show()
        } finally {
            isLoading = false
        }
    }

    LaunchedEffect(snackMessage) {
        snackMessage?.let {
            snackbarHostState.showSnackbar(it)
            snackMessage = null
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            TopAppBar(
                title = { Text("Profil & Akun", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
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
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF8FAFC))
                    .verticalScroll(rememberScrollState())
            ) {
                // Header Card dengan avatar + info utama
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF1E3C72), Color(0xFF2A5298))
                            )
                        )
                        .padding(24.dp)
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
                        // Avatar Circle
                        Box(
                            modifier = Modifier
                                .size(88.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = profile?.name?.take(2)?.uppercase() ?: "?",
                                fontSize = 32.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White
                            )
                        }

                        Spacer(modifier = Modifier.height(14.dp))

                        Text(
                            profile?.name ?: "Nama Pengguna",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )

                        Spacer(modifier = Modifier.height(4.dp))

                        // Role badge
                        val roleLabel = when (profile?.role?.lowercase()) {
                            "superadmin" -> "Super Admin"
                            "admin" -> "Administrator"
                            "guru" -> "Guru / Pengajar"
                            "tu" -> "Tata Usaha"
                            "ortu" -> "Orang Tua"
                            "siswa" -> "Siswa"
                            else -> profile?.role ?: "-"
                        }
                        Text(
                            roleLabel,
                            fontSize = 13.sp,
                            color = Color.White.copy(alpha = 0.85f),
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .background(Color.White.copy(alpha = 0.15f), RoundedCornerShape(20.dp))
                                .padding(horizontal = 14.dp, vertical = 5.dp)
                        )

                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            profile?.school_name ?: "Nama Sekolah",
                            fontSize = 12.sp,
                            color = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Info Section
                ProfileSection(title = "Informasi Akun") {
                    ProfileInfoRow(Icons.Default.Person, "Nama Lengkap", profile?.name ?: "-")
                    ProfileInfoRow(Icons.Default.Email, "Email", profile?.email ?: "-")
                    ProfileInfoRow(Icons.Default.Phone, "Nomor Telepon", profile?.phone ?: "Belum diisi")
                    ProfileInfoRow(Icons.Default.Info, "NIP / ID", profile?.nip ?: "Belum diisi")
                    ProfileInfoRow(Icons.Default.AccountBox, "Jabatan", profile?.jabatan ?: "Belum diisi")
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Aktivitas Terakhir
                ProfileSection(title = "Aktivitas") {
                    ProfileInfoRow(Icons.Default.CheckCircle, "Status Akun", if (profile?.is_active == true) "Aktif ✓" else "Tidak Aktif")
                    ProfileInfoRow(Icons.Default.AccessTime, "Login Terakhir", profile?.last_login ?: "-")
                    ProfileInfoRow(Icons.Default.DateRange, "Bergabung Sejak", profile?.created_at?.take(10) ?: "-")
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Aksi Section
                ProfileSection(title = "Pengaturan Akun") {
                    ProfileActionRow(
                        icon = Icons.Default.Edit,
                        label = "Edit Profil",
                        color = Color(0xFF3B82F6),
                        onClick = { showEditDialog = true }
                    )
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    ProfileActionRow(
                        icon = Icons.Default.Lock,
                        label = "Ganti Password",
                        color = Color(0xFF8B5CF6),
                        onClick = { showPasswordDialog = true }
                    )
                    HorizontalDivider(color = Color(0xFFF1F5F9))
                    ProfileActionRow(
                        icon = Icons.Default.Notifications,
                        label = "Preferensi Notifikasi",
                        color = Color(0xFFF59E0B),
                        onClick = { snackMessage = "Preferensi notifikasi akan segera tersedia." }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Logout Button
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(1.dp)
                ) {
                    ProfileActionRow(
                        icon = Icons.Default.ExitToApp,
                        label = "Keluar dari Aplikasi",
                        color = Color(0xFFEF4444),
                        onClick = { showLogoutDialog = true }
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }

    // Edit Profile Dialog
    if (showEditDialog) {
        EditProfileDialog(
            profile = profile,
            onDismiss = { showEditDialog = false },
            onSave = { name, phone, jabatan ->
                scope.launch {
                    Log.d("AbsentaDebug", "Updating profile: name=$name, phone=$phone, jabatan=$jabatan")
                    try {
                        val service = ApiClient.getClient(context).create(ProfileService::class.java)
                        val resp = service.updateProfile(UpdateProfileRequest(name, phone, jabatan))
                        if (resp.isSuccessful && resp.body()?.success == true) {
                            profile = profile?.copy(name = name, phone = phone, jabatan = jabatan)
                            Log.d("AbsentaDebug", "Profile updated successfully")
                            snackMessage = "Profil berhasil diperbarui ✓"
                        } else {
                            snackMessage = "Gagal memperbarui profil: " + (resp.body()?.message ?: resp.message())
                        }
                    } catch (e: Exception) {
                        Log.e("AbsentaDebug", "Profile update error", e)
                        snackMessage = "Kesalahan koneksi saat memperbarui profil"
                    }
                    showEditDialog = false
                }
            }
        )
    }

    // Change Password Dialog
    if (showPasswordDialog) {
        ChangePasswordDialog(
            onDismiss = { showPasswordDialog = false },
            onSave = { current, newPass, confirm ->
                scope.launch {
                    Log.d("AbsentaDebug", "Changing password")
                    try {
                        val service = ApiClient.getClient(context).create(ProfileService::class.java)
                        val resp = service.changePassword(ChangePasswordRequest(current, newPass, confirm))
                        if (resp.isSuccessful && resp.body()?.success == true) {
                            Log.d("AbsentaDebug", "Password changed successfully")
                            snackMessage = "Password berhasil diubah ✓"
                        } else {
                            snackMessage = "Gagal mengubah password: " + (resp.body()?.message ?: resp.message())
                        }
                    } catch (e: Exception) {
                        Log.e("AbsentaDebug", "Change password error", e)
                        snackMessage = "Kesalahan koneksi saat mengubah password"
                    }
                    showPasswordDialog = false
                }
            }
        )
    }

    // Logout Confirmation
    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            icon = { Icon(Icons.Default.ExitToApp, contentDescription = null, tint = Color(0xFFEF4444)) },
            title = { Text("Konfirmasi Keluar", fontWeight = FontWeight.Bold) },
            text = { Text("Apakah Anda yakin ingin keluar dari aplikasi?") },
            confirmButton = {
                Button(
                    onClick = {
                        scope.launch {
                            Log.d("AbsentaDebug", "User logging out from ProfileScreen")
                            sessionManager.clearSession()
                            showLogoutDialog = false
                            onLogout()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) { Text("Ya, Keluar") }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Batal") }
            }
        )
    }
}

@Composable
fun ProfileSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
        Text(
            title,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(bottom = 6.dp, start = 4.dp)
        )
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(1.dp)
        ) {
            Column(content = content)
        }
    }
}

@Composable
fun ProfileInfoRow(icon: ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Icon(icon, contentDescription = null, tint = Color(0xFF94A3B8), modifier = Modifier.size(18.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(label, fontSize = 11.sp, color = Color(0xFF94A3B8), fontWeight = FontWeight.Medium)
            Text(value, fontSize = 14.sp, color = Color(0xFF1E293B), fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 1.dp))
        }
    }
}

@Composable
fun ProfileActionRow(icon: ImageVector, label: String, color: Color, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(color.copy(alpha = 0.12f), RoundedCornerShape(9.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(18.dp))
        }
        Text(label, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
        Icon(Icons.Default.ArrowForward, contentDescription = null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(16.dp))
    }
}

@Composable
fun EditProfileDialog(
    profile: UserProfile?,
    onDismiss: () -> Unit,
    onSave: (String, String?, String?) -> Unit
) {
    var name by remember { mutableStateOf(profile?.name ?: "") }
    var phone by remember { mutableStateOf(profile?.phone ?: "") }
    var jabatan by remember { mutableStateOf(profile?.jabatan ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Edit Profil", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Lengkap") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) }
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor Telepon") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) }
                )
                OutlinedTextField(
                    value = jabatan,
                    onValueChange = { jabatan = it },
                    label = { Text("Jabatan") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    leadingIcon = { Icon(Icons.Default.AccountBox, contentDescription = null) }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(name, phone.ifEmpty { null }, jabatan.ifEmpty { null }) },
                enabled = name.isNotEmpty(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
            ) { Text("Simpan") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}

@Composable
fun ChangePasswordDialog(
    onDismiss: () -> Unit,
    onSave: (String, String, String) -> Unit
) {
    var current by remember { mutableStateOf("") }
    var newPass by remember { mutableStateOf("") }
    var confirm by remember { mutableStateOf("") }
    var showCurrent by remember { mutableStateOf(false) }
    var showNew by remember { mutableStateOf(false) }
    val isValid = current.isNotEmpty() && newPass.length >= 8 && newPass == confirm

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Ganti Password", fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = current,
                    onValueChange = { current = it },
                    label = { Text("Password Saat Ini") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    visualTransformation = if (showCurrent) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        TextButton(onClick = { showCurrent = !showCurrent }) {
                            Text(if (showCurrent) "Sembunyikan" else "Lihat", fontSize = 11.sp)
                        }
                    }
                )
                OutlinedTextField(
                    value = newPass,
                    onValueChange = { newPass = it },
                    label = { Text("Password Baru (min. 8 karakter)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    visualTransformation = if (showNew) VisualTransformation.None else PasswordVisualTransformation(),
                    trailingIcon = {
                        TextButton(onClick = { showNew = !showNew }) {
                            Text(if (showNew) "Sembunyikan" else "Lihat", fontSize = 11.sp)
                        }
                    },
                    isError = newPass.isNotEmpty() && newPass.length < 8
                )
                OutlinedTextField(
                    value = confirm,
                    onValueChange = { confirm = it },
                    label = { Text("Konfirmasi Password Baru") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                    visualTransformation = PasswordVisualTransformation(),
                    isError = confirm.isNotEmpty() && confirm != newPass
                )
                if (confirm.isNotEmpty() && confirm != newPass) {
                    Text("Password tidak cocok", color = Color(0xFFEF4444), fontSize = 12.sp)
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(current, newPass, confirm) },
                enabled = isValid,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
            ) { Text("Ganti Password") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Batal") } }
    )
}


