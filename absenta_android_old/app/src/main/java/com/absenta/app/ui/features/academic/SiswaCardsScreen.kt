package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.StudentCardConfig
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SiswaCardsScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: SiswaCardsViewModel = viewModel()
) {
    val context = LocalContext.current

    val configState by viewModel.config.collectAsState()
    val previewStudent by viewModel.previewStudent.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val saveSuccess by viewModel.saveSuccess.collectAsState()
    val canManage by viewModel.canManage.collectAsState()

    // Temp configuration state for editing
    var tempConfig by remember { mutableStateOf<StudentCardConfig?>(null) }

    // Hex Color parsing helper
    fun parseColor(hex: String?, defaultColor: Color): Color {
        if (hex.isNullOrEmpty()) return defaultColor
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (e: Exception) {
            defaultColor
        }
    }

    LaunchedEffect(configState) {
        configState?.let {
            tempConfig = it
        }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
        }
    }

    LaunchedEffect(saveSuccess) {
        if (saveSuccess) {
            Toast.makeText(context, "Konfigurasi kartu berhasil disimpan!", Toast.LENGTH_SHORT).show()
            viewModel.resetSaveSuccess()
        }
    }

    Scaffold(
        topBar = {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(colors = listOf(Color(0xFF1E3C72), Color(0xFF2A5298))))
            ) {
                TopAppBar(
                    title = {
                        Column {
                            Text("Kartu Pelajar Digital", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kelompok Setup • Desain & Cetak Kartu",
                                fontSize = 11.sp,
                                color = Color.White.copy(alpha = 0.7f)
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                        }
                    },
                    actions = {
                        if (canManage && tempConfig != null) {
                            IconButton(onClick = { viewModel.saveConfig(tempConfig!!) }) {
                                Icon(Icons.Default.Save, contentDescription = "Simpan", tint = Color.White)
                            }
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White,
                        actionIconContentColor = Color.White
                    )
                )
            }
        }
    ) { paddingValues ->
        if (isLoading && tempConfig == null) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else if (tempConfig != null) {
            val conf = tempConfig!!

            val primaryColorParsed = parseColor(conf.primary_color, Color(0xFF1E3C72))
            val secondaryColorParsed = parseColor(conf.secondary_color, Color(0xFF2A5298))

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC))
                    .verticalScroll(rememberScrollState())
            ) {
                // Section 1: CARD VISUAL PREVIEW
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF0F172A))
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    if (conf.template == "vertical") {
                        // PORTRAIT PREVIEW (Aspect ratio 54 : 86, scaled to match screen width)
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            modifier = Modifier
                                .width(200.dp)
                                .height(320.dp)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Brush.verticalGradient(colors = listOf(primaryColorParsed, secondaryColorParsed)))
                                    .padding(8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                // Header
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = conf.header_text ?: "",
                                        fontSize = 7.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White.copy(alpha = 0.8f),
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = conf.school_name ?: "SMA NEGERI ABSENTA",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        textAlign = TextAlign.Center
                                    )
                                    Text(
                                        text = conf.school_address ?: "",
                                        fontSize = 6.sp,
                                        color = Color.White.copy(alpha = 0.7f),
                                        textAlign = TextAlign.Center
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        text = conf.card_title,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = Color(0xFFF59E0B),
                                        textAlign = TextAlign.Center
                                    )
                                }

                                // Photo Placeholder
                                if (conf.show_photo) {
                                    Box(
                                        modifier = Modifier
                                            .size(90.dp, 110.dp)
                                            .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                                            .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(6.dp)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Person,
                                            contentDescription = null,
                                            tint = Color.White,
                                            modifier = Modifier.size(36.dp)
                                        )
                                    }
                                }

                                // Student Info
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(
                                        text = previewStudent?.nama_siswa ?: "NAMA SISWA PREVIEW",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Black,
                                        color = Color.White,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "NIS: ${previewStudent?.nis ?: "00000"}",
                                        fontSize = 8.sp,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                    Text(
                                        text = "Kelas: ${previewStudent?.Kelas?.nama_kelas ?: "KELAS"}",
                                        fontSize = 8.sp,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                }

                                // QR Code
                                if (conf.show_qrcode) {
                                    Box(
                                        modifier = Modifier
                                            .size(48.dp)
                                            .background(Color.White, RoundedCornerShape(4.dp))
                                            .padding(4.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.QrCode,
                                            contentDescription = null,
                                            tint = Color.Black,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // LANDSCAPE PREVIEW (Aspect ratio 86 : 54, scaled)
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                            modifier = Modifier
                                .width(320.dp)
                                .height(200.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Brush.linearGradient(colors = listOf(primaryColorParsed, secondaryColorParsed)))
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Left Side: Header, Title, Details
                                Column(
                                    modifier = Modifier.weight(1.5f),
                                    verticalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(
                                            text = conf.school_name ?: "SMA NEGERI ABSENTA",
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White
                                        )
                                        Text(
                                            text = conf.school_address ?: "",
                                            fontSize = 7.sp,
                                            color = Color.White.copy(alpha = 0.7f)
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = conf.card_title,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.ExtraBold,
                                            color = Color(0xFFF59E0B)
                                        )
                                    }

                                    Spacer(modifier = Modifier.height(16.dp))

                                    Column {
                                        Text(
                                            text = previewStudent?.nama_siswa ?: "NAMA SISWA PREVIEW",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White
                                        )
                                        Text(
                                            text = "NIS: ${previewStudent?.nis ?: "00000"}",
                                            fontSize = 9.sp,
                                            color = Color.White.copy(alpha = 0.9f)
                                        )
                                        Text(
                                            text = "Kelas: ${previewStudent?.Kelas?.nama_kelas ?: "KELAS"}",
                                            fontSize = 9.sp,
                                            color = Color.White.copy(alpha = 0.9f)
                                        )
                                    }
                                }

                                // Right Side: Photo and QR code
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (conf.show_photo) {
                                        Box(
                                            modifier = Modifier
                                                .size(70.dp, 90.dp)
                                                .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                                                .border(1.dp, Color.White.copy(alpha = 0.5f), RoundedCornerShape(6.dp)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Person,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(28.dp)
                                            )
                                        }
                                    }

                                    if (conf.show_qrcode) {
                                        Box(
                                            modifier = Modifier
                                                .size(40.dp)
                                                .background(Color.White, RoundedCornerShape(4.dp))
                                                .padding(2.dp),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.QrCode,
                                                contentDescription = null,
                                                tint = Color.Black,
                                                modifier = Modifier.fillMaxSize()
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Section 2: CONFIGURATION SLIDERS & OPTIONS
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Pengaturan Layout & Template",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = Color(0xFF0F172A)
                    )

                    // Template Select
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Surface(
                            color = if (conf.template == "vertical") Color(0xFF1E3C72) else Color.White,
                            contentColor = if (conf.template == "vertical") Color.White else Color(0xFF475569),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .clickable { tempConfig = conf.copy(template = "vertical") }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("Portrait (Tegak)", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                        Surface(
                            color = if (conf.template == "horizontal") Color(0xFF1E3C72) else Color.White,
                            contentColor = if (conf.template == "horizontal") Color.White else Color(0xFF475569),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp)
                                .clickable { tempConfig = conf.copy(template = "horizontal") }
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text("Landscape (Mendatar)", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }

                    // Card Title Input
                    OutlinedTextField(
                        value = conf.card_title,
                        onValueChange = { tempConfig = conf.copy(card_title = it) },
                        label = { Text("Judul Kartu") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // School Name Input
                    OutlinedTextField(
                        value = conf.school_name ?: "",
                        onValueChange = { tempConfig = conf.copy(school_name = it) },
                        label = { Text("Nama Sekolah") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // School Address Input
                    OutlinedTextField(
                        value = conf.school_address ?: "",
                        onValueChange = { tempConfig = conf.copy(school_address = it) },
                        label = { Text("Alamat Sekolah") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Header Text Input
                    OutlinedTextField(
                        value = conf.header_text ?: "",
                        onValueChange = { tempConfig = conf.copy(header_text = it) },
                        label = { Text("Kop Header Atas") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Subheader Text Input
                    OutlinedTextField(
                        value = conf.subheader_text ?: "",
                        onValueChange = { tempConfig = conf.copy(subheader_text = it) },
                        label = { Text("Kop Sub-Header") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                        shape = RoundedCornerShape(12.dp)
                    )

                    // Colors input
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = conf.primary_color,
                            onValueChange = { tempConfig = conf.copy(primary_color = it) },
                            label = { Text("Warna Utama Hex") },
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                            shape = RoundedCornerShape(12.dp)
                        )
                        OutlinedTextField(
                            value = conf.secondary_color,
                            onValueChange = { tempConfig = conf.copy(secondary_color = it) },
                            label = { Text("Warna Kedua Hex") },
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF1E3C72)),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    // Switches
                    Card(
                        shape = RoundedCornerShape(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Tampilkan Foto Siswa", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF475569))
                                Switch(
                                    checked = conf.show_photo,
                                    onCheckedChange = { tempConfig = conf.copy(show_photo = it) },
                                    colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1E3C72))
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text("Tampilkan QR Code", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF475569))
                                Switch(
                                    checked = conf.show_qrcode,
                                    onCheckedChange = { tempConfig = conf.copy(show_qrcode = it) },
                                    colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFF1E3C72))
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
