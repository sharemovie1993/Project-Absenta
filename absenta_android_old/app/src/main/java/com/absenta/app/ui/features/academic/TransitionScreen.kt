package com.absenta.app.ui.features.academic

import android.widget.Toast
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.absenta.app.data.api.*
import com.absenta.app.ui.components.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransitionScreen(
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
    viewModel: TransitionViewModel = viewModel()
) {
    val context = LocalContext.current

    val step by viewModel.step.collectAsState()
    val tahunPelajaranList by viewModel.tahunPelajaranList.collectAsState()
    val kelasList by viewModel.kelasList.collectAsState()

    val selectedTahunLamaId by viewModel.selectedTahunLamaId.collectAsState()
    val selectedTahunBaruId by viewModel.selectedTahunBaruId.collectAsState()
    val classMappings by viewModel.classMappings.collectAsState()

    val previewData by viewModel.previewData.collectAsState()
    val overrides by viewModel.overrides.collectAsState()

    // Loaders
    val loadingYears by viewModel.loadingYears.collectAsState()
    val loadingPreview by viewModel.loadingPreview.collectAsState()
    val loadingExecute by viewModel.loadingExecute.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()

    val tpOptions = remember(tahunPelajaranList) {
        tahunPelajaranList.map { DropdownOption(it.tahun, it.id) }
    }

    val kelasDropdownOptions = remember(kelasList) {
        kelasList.map { DropdownOption(it.nama_kelas, it.id) }
    }

    LaunchedEffect(errorMessage) {
        errorMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            viewModel.clearErrorMessage()
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
                            Text("Transisi Akademik Wizard", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                            Text(
                                text = "Kenaikan Kelas & Kelulusan Massal",
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
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.Transparent,
                        titleContentColor = Color.White,
                        navigationIconContentColor = Color.White
                    )
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Stepper Indicator (Premium SaaS Style)
            StepperProgressIndicator(currentStep = step)

            if (loadingYears) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else {
                when (step) {
                    1 -> {
                        Step1Preparation(
                            tpOptions = tpOptions,
                            selectedTahunLamaId = selectedTahunLamaId,
                            selectedTahunBaruId = selectedTahunBaruId,
                            onTahunLamaChange = { viewModel.selectedTahunLamaId.value = it },
                            onTahunBaruChange = { viewModel.selectedTahunBaruId.value = it },
                            onNext = {
                                if (selectedTahunLamaId.isEmpty() || selectedTahunBaruId.isEmpty()) {
                                    Toast.makeText(context, "Tahun Pelajaran wajib dipilih", Toast.LENGTH_SHORT).show()
                                } else if (selectedTahunLamaId == selectedTahunBaruId) {
                                    Toast.makeText(context, "Tahun sumber dan target tidak boleh sama", Toast.LENGTH_SHORT).show()
                                } else {
                                    viewModel.setStep(2)
                                }
                            }
                        )
                    }
                    2 -> {
                        Step2Mapping(
                            kelasList = kelasList,
                            classMappings = classMappings,
                            kelasDropdownOptions = kelasDropdownOptions,
                            onMappingChange = { from, to -> viewModel.updateClassMapping(from, to) },
                            onBack = { viewModel.setStep(1) },
                            onNext = {
                                viewModel.loadPreview {
                                    viewModel.setStep(3)
                                }
                            },
                            loadingPreview = loadingPreview
                        )
                    }
                    3 -> {
                        Step3Review(
                            previewData = previewData,
                            overrides = overrides,
                            onOverrideChange = { siswaId, status -> viewModel.updateStudentOverride(siswaId, status) },
                            onBack = { viewModel.setStep(2) },
                            onNext = { viewModel.setStep(4) }
                        )
                    }
                    4 -> {
                        Step4Confirmation(
                            onBack = { viewModel.setStep(3) },
                            onExecute = {
                                viewModel.executeTransition {
                                    viewModel.setStep(5)
                                }
                            },
                            loadingExecute = loadingExecute
                        )
                    }
                    5 -> {
                        Step5Success(onFinish = onNavigateBack)
                    }
                }
            }
        }
    }
}

@Composable
fun StepperProgressIndicator(currentStep: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        val steps = listOf("Persiapan", "Pemetaan", "Peninjauan", "Konfirmasi")
        steps.forEachIndexed { index, name ->
            val stepNum = index + 1
            val isActive = currentStep == stepNum
            val isDone = currentStep > stepNum

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.weight(1f)
            ) {
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            color = when {
                                isDone -> Color(0xFF10B981)
                                isActive -> Color(0xFF1E3C72)
                                else -> Color(0xFFE2E8F0)
                            },
                            shape = CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    if (isDone) {
                        Icon(Icons.Default.Check, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    } else {
                        Text(
                            text = stepNum.toString(),
                            color = if (isActive) Color.White else Color(0xFF64748B),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = name,
                    fontSize = 10.sp,
                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                    color = if (isActive) Color(0xFF1E3C72) else Color(0xFF64748B),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

@Composable
fun Step1Preparation(
    tpOptions: List<DropdownOption>,
    selectedTahunLamaId: String,
    selectedTahunBaruId: String,
    onTahunLamaChange: (String) -> Unit,
    onTahunBaruChange: (String) -> Unit,
    onNext: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Langkah 1: Tentukan Tahun Sumber & Target",
                    fontWeight = FontWeight.Bold,
                    fontSize = 15.sp,
                    color = Color(0xFF0F172A)
                )

                Text(
                    text = "Pilih Tahun Pelajaran yang saat ini berjalan sebagai sumber data, dan pilih Tahun Pelajaran baru sebagai target tujuan pemindahan data siswa.",
                    fontSize = 12.sp,
                    color = Color(0xFF64748B)
                )

                FilterDropdown(
                    selectedValue = selectedTahunLamaId,
                    options = tpOptions,
                    onValueChange = onTahunLamaChange,
                    placeholder = "Tahun Pelajaran Lama (Sumber)",
                    modifier = Modifier.fillMaxWidth()
                )

                FilterDropdown(
                    selectedValue = selectedTahunBaruId,
                    options = tpOptions,
                    onValueChange = onTahunBaruChange,
                    placeholder = "Tahun Pelajaran Baru (Target)",
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }

        Button(
            onClick = onNext,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Selanjutnya", color = Color.White)
        }
    }
}

@Composable
fun Step2Mapping(
    kelasList: List<KelasDetail>,
    classMappings: Map<String, String>,
    kelasDropdownOptions: List<DropdownOption>,
    onMappingChange: (String, String) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit,
    loadingPreview: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Langkah 2: Petakan Rute Kenaikan Kelas",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(bottom = 8.dp)
        )

        Text(
            text = "Untuk setiap kelas aktif, tentukan kelas target yang sesuai di tahun pelajaran baru. Contoh: kelas X-A diarahkan ke XI-A.",
            fontSize = 12.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(bottom = 16.dp)
        )

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(kelasList, key = { it.id }) { kelas ->
                val selectedTargetId = classMappings[kelas.id] ?: ""

                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Dari Kelas: ${kelas.nama_kelas}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF1E293B)
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        FilterDropdown(
                            selectedValue = selectedTargetId,
                            options = listOf(DropdownOption("Lulus / Pindah", "")) + kelasDropdownOptions,
                            onValueChange = { onMappingChange(kelas.id, it) },
                            placeholder = "Tentukan Kelas Target",
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Kembali", color = Color(0xFF64748B))
            }
            Button(
                onClick = onNext,
                enabled = !loadingPreview,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                if (loadingPreview) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Buat Preview", color = Color.White)
                }
            }
        }
    }
}

@Composable
fun Step3Review(
    previewData: TransitionPreviewData?,
    overrides: Map<String, String>,
    onOverrideChange: (String, String) -> Unit,
    onBack: () -> Unit,
    onNext: () -> Unit
) {
    val items = previewData?.items ?: emptyList()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text(
            text = "Langkah 3: Tinjau Status Kelulusan & Kenaikan",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            color = Color(0xFF0F172A),
            modifier = Modifier.padding(bottom = 4.dp)
        )

        Text(
            text = "Silakan periksa daftar kenaikan kelas siswa di bawah ini. Anda dapat mengubah status siswa yang tinggal kelas atau tidak lulus secara manual.",
            fontSize = 12.sp,
            color = Color(0xFF64748B),
            modifier = Modifier.padding(bottom = 12.dp)
        )

        // Summary Card
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9)),
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Text(
                    text = "Ringkasan Preview Kenaikan:",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = Color(0xFF1E293B)
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Total Siswa Terdeteksi: ${previewData?.total ?: 0} anak",
                    fontSize = 12.sp,
                    color = Color(0xFF475569)
                )
            }
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            items(items, key = { it.siswaId }) { siswa ->
                val currentStatus = overrides[siswa.siswaId] ?: siswa.status

                Card(
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = siswa.namaSiswa,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp,
                            color = Color(0xFF0F172A)
                        )
                        Text(
                            text = "Dari Kelas: ${siswa.fromKelas} -> Target: ${siswa.toKelas ?: "Lulus/Pindah"}",
                            fontSize = 11.sp,
                            color = Color(0xFF64748B)
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        // Custom Segmented Control or Dropdown for status override
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf("NAIK", "TINGGAL", "LULUS").forEach { statusOption ->
                                val isSelected = currentStatus == statusOption
                                Surface(
                                    color = if (isSelected) Color(0xFF1E3C72) else Color(0xFFF1F5F9),
                                    contentColor = if (isSelected) Color.White else Color(0xFF475569),
                                    shape = RoundedCornerShape(8.dp),
                                    border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { onOverrideChange(siswa.siswaId, statusOption) }
                                ) {
                                    Text(
                                        text = statusOption,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.padding(vertical = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Kembali", color = Color(0xFF64748B))
            }
            Button(
                onClick = onNext,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Konfirmasi", color = Color.White)
            }
        }
    }
}

@Composable
fun Step4Confirmation(
    onBack: () -> Unit,
    onExecute: () -> Unit,
    loadingExecute: Boolean
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Warning,
                    contentDescription = "Peringatan",
                    tint = Color(0xFFEF4444),
                    modifier = Modifier.size(56.dp)
                )

                Text(
                    text = "Peringatan Transisi Final",
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                    color = Color(0xFF0F172A),
                    textAlign = TextAlign.Center
                )

                Text(
                    text = "Proses pemindahan data siswa ini bersifat permanen dan tidak dapat dibatalkan (Irreversible). Seluruh data penugasan kelas dan riwayat semester siswa akan dipindahkan secara massal ke tahun pelajaran target.",
                    fontSize = 13.sp,
                    color = Color(0xFF475569),
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            OutlinedButton(
                onClick = onBack,
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Kembali", color = Color(0xFF64748B))
            }
            Button(
                onClick = onExecute,
                enabled = !loadingExecute,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                if (loadingExecute) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Eksekusi Kenaikan", color = Color.White)
                }
            }
        }
    }
}

@Composable
fun Step5Success(
    onFinish: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Spacer(modifier = Modifier.height(1.dp))

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .background(Color(0xFFD1FAE5), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Check,
                    contentDescription = "Selesai",
                    tint = Color(0xFF10B981),
                    modifier = Modifier.size(48.dp)
                )
            }

            Text(
                text = "Transisi Akademik Berhasil!",
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = Color(0xFF0F172A)
            )

            Text(
                text = "Seluruh siswa berhasil dinaikkan kelas dan dipetakan ke tahun pelajaran baru. Data penugasan baru telah aktif.",
                fontSize = 13.sp,
                color = Color(0xFF475569),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 24.dp)
            )
        }

        Button(
            onClick = onFinish,
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
            shape = RoundedCornerShape(8.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Selesai & Keluar", color = Color.White)
        }
    }
}
