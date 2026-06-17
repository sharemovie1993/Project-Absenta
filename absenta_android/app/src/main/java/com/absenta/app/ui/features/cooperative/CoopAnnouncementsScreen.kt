package com.absenta.app.ui.features.cooperative

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.CooperativeService
import com.absenta.app.data.api.CoopAnnouncement
import com.absenta.app.data.api.CoopAnnouncementRequest
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopAnnouncementsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToPlans: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val sessionManager = remember { SessionManager(context) }
    val coopService = remember { ApiClient.getClient(context).create(CooperativeService::class.java) }

    val enabledFeatures by sessionManager.enabledFeaturesFlow.collectAsState(initial = emptyList())
    val userRole by sessionManager.userRoleFlow.collectAsState(initial = "")
    val capabilities by sessionManager.capabilitiesFlow.collectAsState(initial = emptyList())

    // Premium Gate Check
    val isLocked = remember(enabledFeatures) {
        enabledFeatures.isNotEmpty() && !enabledFeatures.contains("KOPERASI")
    }

    if (isLocked) {
        CooperativePremiumGate(
            featureName = "Pengumuman Koperasi",
            description = "Fitur papan informasi pengumuman koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    // Role detection
    val isOperator = remember(userRole, capabilities) {
        val role = userRole?.uppercase() ?: ""
        role == "ADMIN" || role == "SUPERADMIN" || role == "SUPER_ADMIN" ||
                capabilities.contains("cooperative.members.manage") ||
                capabilities.contains("cooperative.savings.deposit")
    }

    // States
    var isLoading by remember { mutableStateOf(false) }
    var announcements by remember { mutableStateOf<List<CoopAnnouncement>>(emptyList()) }
    var showAddDialog by remember { mutableStateOf(false) }
    var selectedAnn by remember { mutableStateOf<CoopAnnouncement?>(null) }

    // Add form states
    var annTitle by remember { mutableStateOf("") }
    var annContent by remember { mutableStateOf("") }

    fun fetchAnnouncements() {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.getAnnouncements()
                if (res.isSuccessful && res.body()?.success == true) {
                    announcements = res.body()?.data ?: emptyList()
                } else {
                    Toast.makeText(context, "Gagal memuat pengumuman", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error koneksi: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun saveAnnouncement() {
        if (annTitle.isBlank() || annContent.isBlank()) {
            Toast.makeText(context, "Judul dan isi pengumuman wajib diisi", Toast.LENGTH_SHORT).show()
            return
        }

        isLoading = true
        scope.launch {
            try {
                val req = CoopAnnouncementRequest(title = annTitle, content = annContent)
                val res = coopService.createAnnouncement(req)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Pengumuman berhasil diterbitkan!", Toast.LENGTH_SHORT).show()
                    showAddDialog = false
                    annTitle = ""
                    annContent = ""
                    fetchAnnouncements()
                } else {
                    Toast.makeText(context, "Gagal menyimpan: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    fun deleteAnnouncement(id: String) {
        isLoading = true
        scope.launch {
            try {
                val res = coopService.deleteAnnouncement(id)
                if (res.isSuccessful && res.body()?.success == true) {
                    Toast.makeText(context, "Pengumuman berhasil dihapus", Toast.LENGTH_SHORT).show()
                    fetchAnnouncements()
                } else {
                    Toast.makeText(context, "Gagal menghapus: ${res.body()?.message ?: res.message()}", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchAnnouncements()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Pengumuman Koperasi", fontWeight = FontWeight.Bold, color = Color.White) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF1E3C72))
            )
        },
        floatingActionButton = {
            if (isOperator) {
                FloatingActionButton(
                    onClick = {
                        annTitle = ""
                        annContent = ""
                        showAddDialog = true
                    },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Tambah Pengumuman")
                }
            }
        }
    ) { paddingValues ->
        if (isLoading && announcements.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize().padding(paddingValues), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                if (announcements.isEmpty()) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 40.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("Belum ada pengumuman.", color = Color.Gray)
                        }
                    }
                } else {
                    items(announcements) { ann ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { selectedAnn = ann },
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFF1E3C72).copy(alpha = 0.1f), RoundedCornerShape(6.dp))
                                                .padding(6.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Notifications,
                                                contentDescription = null,
                                                tint = Color(0xFF1E3C72),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                        Text(
                                            text = ann.createdAt.substringBefore("T"),
                                            fontSize = 11.sp,
                                            color = Color.Gray,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }

                                    if (isOperator) {
                                        IconButton(
                                            onClick = { deleteAnnouncement(ann.id) },
                                            modifier = Modifier.size(24.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Delete,
                                                contentDescription = "Hapus",
                                                tint = Color(0xFFEF4444),
                                                modifier = Modifier.size(16.dp)
                                            )
                                        }
                                    }
                                }

                                Text(
                                    text = ann.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = Color(0xFF1E293B),
                                    modifier = Modifier.padding(top = 8.dp)
                                )

                                Text(
                                    text = ann.content,
                                    fontSize = 12.sp,
                                    color = Color(0xFF64748B),
                                    modifier = Modifier.padding(top = 4.dp),
                                    maxLines = 4
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Detail Dialog
    selectedAnn?.let { ann ->
        AlertDialog(
            onDismissRequest = { selectedAnn = null },
            title = { Text(ann.title, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(ann.content, fontSize = 13.sp, color = Color(0xFF334155))
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Diterbitkan: ${ann.createdAt.replace("T", " ").substringBefore(".")}", fontSize = 10.sp, color = Color.Gray)
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedAnn = null },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Tutup", color = Color.White)
                }
            }
        )
    }

    // Add Announcement Dialog
    if (showAddDialog) {
        AlertDialog(
            onDismissRequest = { showAddDialog = false },
            title = { Text("Terbitkan Pengumuman Baru", fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    OutlinedTextField(
                        value = annTitle,
                        onValueChange = { annTitle = it },
                        label = { Text("Judul Pengumuman") },
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = annContent,
                        onValueChange = { annContent = it },
                        label = { Text("Isi Pengumuman") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 4
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { saveAnnouncement() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                ) {
                    Text("Terbitkan", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddDialog = false }) {
                    Text("Batal")
                }
            }
        )
    }
}
