package com.absenta.app.ui.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.ui.components.AbsentaTopBar
import com.absenta.app.ui.components.LoadingOverlay
import com.absenta.app.ui.theme.BackgroundDark
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.OnPrimary
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.PrimaryContainer
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.launch

/**
 * EditProfileScreen — Layar edit data profil pengguna.
 *
 * Fitur Lengkap:
 * - Auto-prefill data diri pengguna (Nama, Email, HP, Alamat, Tempat/Tanggal Lahir, Agama)
 * - Form Perubahan Kata Sandi / Security
 * - Menggunakan shared component [AbsentaTopBar].
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditProfileScreen(
    tokenManager: TokenManager,
    onNavigateBack: () -> Unit
) {
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    var isLoading by remember { mutableStateOf(true) }
    var isSaving by remember { mutableStateOf(false) }

    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var tempatLahir by remember { mutableStateOf("") }
    var tanggalLahir by remember { mutableStateOf("") }
    var agama by remember { mutableStateOf("") }

    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }

    val textFieldColors = OutlinedTextFieldDefaults.colors(
        focusedTextColor = TextPrimary,
        unfocusedTextColor = TextPrimary,
        focusedContainerColor = SurfaceDark,
        unfocusedContainerColor = SurfaceDark,
        focusedBorderColor = Primary,
        unfocusedBorderColor = Border,
        focusedLabelColor = Primary,
        unfocusedLabelColor = TextSecondary,
        cursorColor = Primary
    )

    var userEntityId by remember { mutableStateOf<String?>(null) }
    var userRoleName by remember { mutableStateOf("SISWA") }

    LaunchedEffect(Unit) {
        isLoading = true
        try {
            val retrofit = ApiClient.create(tokenManager)
            val service = retrofit.create(ProfileService::class.java)
            val response = service.getMyProfile()
            if (response.isSuccessful && response.body()?.data != null) {
                val p = response.body()!!.data!!
                val userId = p.id
                userRoleName = p.role?.name?.uppercase() ?: "SISWA"

                name = p.displayName
                email = p.email ?: ""

                if (userRoleName.contains("SISWA")) {
                    val sRes = service.getSiswaList(userId = userId, limit = 1)
                    if (sRes.isSuccessful && !sRes.body()?.data.isNullOrEmpty()) {
                        val s = sRes.body()!!.data!![0]
                        userEntityId = s.id
                        name = s.namaSiswa ?: name
                        phone = s.noHp ?: p.phone ?: ""
                        address = s.alamat ?: p.address ?: ""
                        tempatLahir = s.tempatLahir ?: ""
                        tanggalLahir = s.tanggalLahir ?: ""
                        agama = s.agama ?: ""
                    } else if (p.siswa != null) {
                        val s = p.siswa!!
                        userEntityId = s.id
                        phone = s.noHp ?: p.phone ?: ""
                        address = s.alamat ?: p.address ?: ""
                        tempatLahir = s.tempatLahir ?: ""
                        tanggalLahir = s.tanggalLahir ?: ""
                        agama = s.agama ?: ""
                    }
                } else if (userRoleName.contains("GURU")) {
                    val gRes = service.getGuruList(userId = userId, limit = 1)
                    if (gRes.isSuccessful && !gRes.body()?.data.isNullOrEmpty()) {
                        val g = gRes.body()!!.data!![0]
                        userEntityId = g.id
                        name = g.namaGuru ?: name
                        phone = g.noHp ?: p.phone ?: ""
                        address = g.alamat ?: p.address ?: ""
                        tempatLahir = g.tempatLahir ?: ""
                        tanggalLahir = g.tanggalLahir ?: ""
                        agama = g.agama ?: ""
                    } else if (p.guru != null) {
                        val g = p.guru!!
                        userEntityId = g.id
                        phone = g.noHp ?: p.phone ?: ""
                        address = g.alamat ?: p.address ?: ""
                        tempatLahir = g.tempatLahir ?: ""
                        tanggalLahir = g.tanggalLahir ?: ""
                        agama = g.agama ?: ""
                    }
                }
            }
        } catch (e: Exception) {
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            AbsentaTopBar(
                title = "Edit Profil Saya",
                onNavigateBack = onNavigateBack
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        containerColor = BackgroundDark
    ) { paddingValues ->
        when {
            isLoading -> LoadingOverlay(modifier = Modifier.padding(paddingValues))
            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text("Informasi Data Diri", style = MaterialTheme.typography.labelMedium, color = TextSecondary)
                Spacer(modifier = Modifier.height(2.dp))

                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Nama Lengkap") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Alamat Email") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text("Nomor HP / WhatsApp") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = tempatLahir,
                        onValueChange = { tempatLahir = it },
                        label = { Text("Tempat Lahir") },
                        singleLine = true,
                        colors = textFieldColors,
                        modifier = Modifier.weight(1f)
                    )

                    OutlinedTextField(
                        value = tanggalLahir,
                        onValueChange = { tanggalLahir = it },
                        label = { Text("Tgl Lahir (YYYY-MM-DD)") },
                        singleLine = true,
                        colors = textFieldColors,
                        modifier = Modifier.weight(1f)
                    )
                }

                OutlinedTextField(
                    value = agama,
                    onValueChange = { agama = it },
                    label = { Text("Agama") },
                    singleLine = true,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = address,
                    onValueChange = { address = it },
                    label = { Text("Alamat Rumah Lengkap") },
                    minLines = 3,
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Divider(modifier = Modifier.padding(vertical = 6.dp), color = Border)

                Text("Keamanan & Kata Sandi (Opsional)", style = MaterialTheme.typography.labelMedium, color = TextSecondary)

                OutlinedTextField(
                    value = newPassword,
                    onValueChange = { newPassword = it },
                    label = { Text("Kata Sandi Baru") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                OutlinedTextField(
                    value = confirmPassword,
                    onValueChange = { confirmPassword = it },
                    label = { Text("Konfirmasi Kata Sandi Baru") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    colors = textFieldColors,
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Button(
                    onClick = {
                        if (newPassword.isNotBlank() && newPassword != confirmPassword) {
                            scope.launch { snackbarHostState.showSnackbar("❌ Konfirmasi kata sandi tidak cocok") }
                            return@Button
                        }

                        scope.launch {
                            isSaving = true
                            try {
                                val userBody = mutableMapOf<String, String>()
                                if (name.isNotBlank()) userBody["name"] = name
                                if (phone.isNotBlank()) userBody["phone"] = phone
                                if (address.isNotBlank()) userBody["address"] = address
                                if (email.isNotBlank()) userBody["email"] = email
                                if (newPassword.isNotBlank()) userBody["password"] = newPassword

                                val retrofit = ApiClient.create(tokenManager)
                                val service = retrofit.create(ProfileService::class.java)
                                service.updateProfile(userBody)

                                val detailBody = mutableMapOf<String, String>()
                                if (name.isNotBlank()) {
                                    if (userRoleName.contains("SISWA")) detailBody["nama_siswa"] = name
                                    else detailBody["nama_guru"] = name
                                }
                                if (phone.isNotBlank()) detailBody["no_hp"] = phone
                                if (address.isNotBlank()) detailBody["alamat"] = address
                                if (tempatLahir.isNotBlank()) detailBody["tempat_lahir"] = tempatLahir
                                if (tanggalLahir.isNotBlank()) detailBody["tanggal_lahir"] = tanggalLahir
                                if (agama.isNotBlank()) detailBody["agama"] = agama

                                if (!userEntityId.isNullOrEmpty()) {
                                    if (userRoleName.contains("SISWA")) {
                                        service.updateSiswa(userEntityId!!, detailBody)
                                    } else if (userRoleName.contains("GURU")) {
                                        service.updateGuru(userEntityId!!, detailBody)
                                    }
                                }

                                snackbarHostState.showSnackbar("Profil berhasil diperbarui ✅")
                                onNavigateBack()
                            } catch (e: Exception) {
                                snackbarHostState.showSnackbar("Koneksi bermasalah")
                            } finally {
                                isSaving = false
                            }
                        }
                    },
                    enabled = !isSaving,
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary)
                ) {
                    Text(if (isSaving) "Menyimpan..." else "Simpan Perubahan", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

