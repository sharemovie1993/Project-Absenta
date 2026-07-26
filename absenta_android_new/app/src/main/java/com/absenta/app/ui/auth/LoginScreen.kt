package com.absenta.app.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.AuthService
import com.absenta.app.data.local.SavedCredential
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.LoginRequest
import com.absenta.app.ui.navigation.ScreenRoutes
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Danger
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * LoginScreen — Layar autentikasi masuk dengan fitur Simpan Riwayat Login & Preset Cepat Akun.
 *
 * @param tokenManager Manager session untuk menyimpan token & riwayat login
 * @param onLoginSuccess Callback setelah login berhasil
 */
@Composable
fun LoginScreen(
    tokenManager: TokenManager,
    onLoginSuccess: (destination: String) -> Unit
) {
    val scope = rememberCoroutineScope()
    var identifier by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isParentMode by remember { mutableStateOf(false) }

    // Saved Login History
    var savedHistory by remember { mutableStateOf<List<SavedCredential>>(emptyList()) }

    // Dialog Pengaturan Server
    var showServerSettingsDialog by remember { mutableStateOf(false) }
    var serverUrlInput by remember { mutableStateOf("") }
    var currentServerUrl by remember { mutableStateOf("http://10.10.10.250:3004/") }

    LaunchedEffect(Unit) {
        currentServerUrl = tokenManager.getBaseUrl()
        serverUrlInput = currentServerUrl
        try {
            savedHistory = tokenManager.getSavedCredentials()
            if (savedHistory.isNotEmpty()) {
                identifier = savedHistory.first().identifier
                password = savedHistory.first().pass
            }
        } catch (e: Exception) {}
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        BackgroundDark,
                        PrimaryContainer
                    )
                )
            )
            .imePadding()
    ) {
        // Top Right Settings Icon
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 16.dp, end = 16.dp)
                .zIndex(10f),
            contentAlignment = Alignment.TopEnd
        ) {
            IconButton(
                onClick = {
                    serverUrlInput = currentServerUrl
                    showServerSettingsDialog = true
                }
            ) {
                Icon(
                    imageVector = Icons.Default.Settings,
                    contentDescription = "Pengaturan Server",
                    tint = Primary,
                    modifier = Modifier.size(32.dp)
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Logo & Brand
            Spacer(modifier = Modifier.height(16.dp))
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .background(
                        brush = Brush.radialGradient(
                            colors = listOf(Primary, PrimaryContainer)
                        ),
                        shape = RoundedCornerShape(20.dp)
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "A",
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Black,
                    color = Color.White
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Absenta",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimary
            )
            Text(
                text = "Sistem Manajemen Absensi Sekolah",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary,
                textAlign = TextAlign.Center
            )

            // Server Badge
            Spacer(modifier = Modifier.height(8.dp))
            Surface(
                onClick = {
                    serverUrlInput = currentServerUrl
                    showServerSettingsDialog = true
                },
                shape = RoundedCornerShape(20.dp),
                color = SurfaceVariantDark,
                modifier = Modifier.clip(RoundedCornerShape(20.dp))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(14.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Server: $currentServerUrl",
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Preset Quick Persona Selector (Testing Fast Preset) ───────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark.copy(alpha = 0.7f))
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        "⚡ Quick Preset Akun Testing:",
                        style = MaterialTheme.typography.labelSmall,
                        color = Primary,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        item {
                            QuickPersonaChip(label = "🛡️ Petugas Kelas", id = "2526100115", pass = "11223344") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "🚪 Petugas Gerbang", id = "suhermat@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "🏛️ Admin", id = "neple@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "💜 BPBK", id = "ajeng@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "📘 Kurikulum", id = "aher@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "📙 Kesiswaan", id = "oky@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "📗 Wali Kelas", id = "himal@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "👨‍🏫 Guru", id = "ai@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                        item {
                            QuickPersonaChip(label = "👑 Kepala Sekolah", id = "ajang@gmail.com", pass = "admin1234") { i, p ->
                                identifier = i; password = p; errorMessage = null
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Saved Login History (Riwayat Akun Yang Pernah Login) ───────────
            if (savedHistory.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark.copy(alpha = 0.5f))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.History, contentDescription = null, tint = Primary, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                "Riwayat Login Terakhir:",
                                style = MaterialTheme.typography.labelSmall,
                                color = TextSecondary,
                                fontWeight = FontWeight.SemiBold
                            )
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(savedHistory) { item ->
                                QuickPersonaChip(
                                    label = item.identifier.split("@").firstOrNull() ?: item.identifier,
                                    id = item.identifier,
                                    pass = item.pass
                                ) { i, p ->
                                    identifier = i
                                    password = p
                                    errorMessage = null
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // ── Login Form Card ───────────────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                elevation = CardDefaults.cardElevation(8.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = if (isParentMode) "Login Orang Tua" else "Masuk Aplikasi",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = if (isParentMode) "Login sebagai wali/orang tua siswa"
                        else "Masukkan NIS, NISN, atau email Anda",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(18.dp))

                    // Identifier Field
                    OutlinedTextField(
                        value = identifier,
                        onValueChange = { identifier = it; errorMessage = null },
                        label = { Text("NIS / NISN / Email") },
                        leadingIcon = {
                            Icon(Icons.Default.Person, contentDescription = null, tint = Primary)
                        },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            imeAction = ImeAction.Next,
                            keyboardType = KeyboardType.Email
                        ),
                        colors = outlinedTextFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    // Password Field
                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMessage = null },
                        label = { Text("Password") },
                        leadingIcon = {
                            Icon(Icons.Default.Lock, contentDescription = null, tint = Primary)
                        },
                        trailingIcon = {
                            IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                Icon(
                                    imageVector = if (passwordVisible) Icons.Default.VisibilityOff
                                    else Icons.Default.Visibility,
                                    contentDescription = null,
                                    tint = TextSecondary
                                )
                            }
                        },
                        visualTransformation = if (passwordVisible) VisualTransformation.None
                        else PasswordVisualTransformation(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                if (!isLoading) {
                                    performLogin(
                                        scope, tokenManager, identifier, password,
                                        isParentMode, { isLoading = it },
                                        { errorMessage = it }, onLoginSuccess
                                    )
                                }
                            }
                        ),
                        colors = outlinedTextFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    // Error Message
                    AnimatedVisibility(
                        visible = !errorMessage.isNullOrEmpty(),
                        enter = fadeIn(),
                        exit = fadeOut()
                    ) {
                        Text(
                            text = errorMessage ?: "",
                            color = Danger,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 8.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Login Button
                    Button(
                        onClick = {
                            performLogin(
                                scope, tokenManager, identifier, password,
                                isParentMode, { isLoading = it },
                                { errorMessage = it }, onLoginSuccess
                            )
                        },
                        enabled = !isLoading && identifier.isNotEmpty() && password.isNotEmpty(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(50.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Primary)
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Text(
                                text = if (isParentMode) "Masuk sebagai Orang Tua" else "Masuk",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Toggle Orang Tua Mode
            TextButton(
                onClick = {
                    isParentMode = !isParentMode
                    errorMessage = null
                }
            ) {
                Text(
                    text = if (isParentMode) "Kembali ke Login Staf/Siswa"
                    else "Login sebagai Orang Tua Siswa",
                    color = Primary.copy(alpha = 0.8f),
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }

    // Dialog Pengaturan Server Backend
    if (showServerSettingsDialog) {
        AlertDialog(
            onDismissRequest = { showServerSettingsDialog = false },
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = null,
                        tint = Primary,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Pengaturan Server Backend",
                        style = MaterialTheme.typography.titleMedium,
                        color = TextPrimary,
                        fontWeight = FontWeight.Bold
                    )
                }
            },
            text = {
                Column {
                    Text(
                        text = "Masukkan IP Address dan Port server absenta_backend:",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(12.dp))

                    OutlinedTextField(
                        value = serverUrlInput,
                        onValueChange = { serverUrlInput = it },
                        label = { Text("Base URL Server") },
                        singleLine = true,
                        colors = outlinedTextFieldColors(),
                        modifier = Modifier.fillMaxWidth()
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Preset Server:", style = MaterialTheme.typography.labelSmall, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        PresetChip(label = "Server 3004", url = "http://10.10.10.250:3004/") {
                            serverUrlInput = it
                        }
                        PresetChip(label = "Local (10.0.2.2)", url = "http://10.0.2.2:3000/") {
                            serverUrlInput = it
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val formattedUrl = if (serverUrlInput.endsWith("/")) serverUrlInput else "$serverUrlInput/"
                        scope.launch {
                            tokenManager.saveBaseUrl(formattedUrl)
                            currentServerUrl = formattedUrl
                            showServerSettingsDialog = false
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text("Simpan", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showServerSettingsDialog = false }) {
                    Text("Batal", color = TextSecondary)
                }
            },
            containerColor = SurfaceDark,
            shape = RoundedCornerShape(20.dp)
        )
    }
}

/** Preset Chip untuk isi cepat akun testing */
@Composable
private fun QuickPersonaChip(label: String, id: String, pass: String, onSelect: (String, String) -> Unit) {
    Button(
        onClick = { onSelect(id, pass) },
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(containerColor = SurfaceVariantDark),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(label, fontSize = 11.sp, color = TextPrimary, fontWeight = FontWeight.SemiBold)
    }
}

/** Preset Chip untuk ganti URL server */
@Composable
private fun PresetChip(label: String, url: String, onSelect: (String) -> Unit) {
    Button(
        onClick = { onSelect(url) },
        shape = RoundedCornerShape(8.dp),
        colors = ButtonDefaults.buttonColors(containerColor = SurfaceVariantDark),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Text(label, fontSize = 11.sp, color = TextPrimary)
    }
}

private fun resolveStartDestination(capabilities: List<String>, isParent: Boolean): String {
    if (isParent) return ScreenRoutes.PARENT_DASHBOARD
    return ScreenRoutes.DYNAMIC_MENU_DASHBOARD
}

private fun performLogin(
    scope: kotlinx.coroutines.CoroutineScope,
    tokenManager: TokenManager,
    identifier: String,
    password: String,
    isParentMode: Boolean,
    setLoading: (Boolean) -> Unit,
    setError: (String?) -> Unit,
    onSuccess: (String) -> Unit
) {
    if (identifier.isBlank() || password.isBlank()) {
        setError("Identifier dan password tidak boleh kosong")
        return
    }
    scope.launch {
        setLoading(true)
        setError(null)
        try {
            val retrofit = ApiClient.create(tokenManager)
            val authService = retrofit.create(AuthService::class.java)
            val request = LoginRequest(email = identifier, identifier = identifier, password = password)
            val response = if (isParentMode) {
                authService.loginParent(request)
            } else {
                authService.login(request)
            }

            if (response.isSuccessful && response.body()?.success == true && response.body()?.data != null) {
                val data = response.body()!!.data!!
                val user = data.user
                val caps = user.capabilities

                tokenManager.saveSession(
                    accessToken = data.accessToken,
                    refreshToken = data.refreshToken,
                    userId = user.id,
                    userName = user.name ?: user.username ?: identifier,
                    userRole = user.role?.name ?: "UNKNOWN",
                    capabilities = caps,
                    tenantId = user.tenantId,
                    photoUrl = user.photoUrl,
                    isParent = isParentMode
                )

                // Simpan histori login untuk kemudahan testing trial
                tokenManager.saveLoginCredential(
                    identifier = identifier,
                    pass = password,
                    label = user.name ?: identifier,
                    role = user.role?.name ?: "USER"
                )

                val destination = resolveStartDestination(caps, isParentMode)
                onSuccess(destination)
            } else {
                setError(response.body()?.message ?: "Login gagal, periksa kembali data Anda")
            }
        } catch (e: Exception) {
            val currentUrl = tokenManager.getBaseUrl()
            setError("Gagal terhubung ke $currentUrl. Tekan badge Server di atas untuk mengubah IP & Port Server.")
        } finally {
            setLoading(false)
        }
    }
}

@Composable
private fun outlinedTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedBorderColor = Primary,
    unfocusedBorderColor = Border,
    focusedLabelColor = Primary,
    unfocusedLabelColor = TextSecondary,
    cursorColor = Primary
)
