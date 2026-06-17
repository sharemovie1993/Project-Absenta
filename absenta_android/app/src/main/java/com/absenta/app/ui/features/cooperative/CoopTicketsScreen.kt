package com.absenta.app.ui.features.cooperative

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.absenta.app.data.api.*
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CoopTicketsScreen(
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
            featureName = "Layanan Bantuan (Tiket)",
            description = "Fitur layanan tiket bantuan keluhan koperasi memerlukan paket langganan Koperasi Premium.",
            onNavigateBack = onNavigateBack,
            onNavigateToPlans = onNavigateToPlans
        )
        return
    }

    val isStaff = remember(userRole, capabilities) {
        userRole?.uppercase() != "SISWA" && 
        userRole?.uppercase() != "STUDENT" && 
        userRole?.uppercase() != "PARENT" && 
        userRole?.uppercase() != "WALI_MURID" && 
        userRole?.uppercase() != "ORTU" &&
        userRole?.isNotEmpty() == true
    }

    var ticketsList by remember { mutableStateOf<List<CoopTicket>>(emptyList()) }
    var isLoading by remember { mutableStateOf(false) }

    // Dialog state for new ticket
    var showCreateDialog by remember { mutableStateOf(false) }
    var newSubject by remember { mutableStateOf("") }
    var newPriority by remember { mutableStateOf("MEDIUM") }
    var newMessageBody by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    // Ticket detail overlay
    var selectedTicketId by remember { mutableStateOf<String?>(null) }
    var ticketDetail by remember { mutableStateOf<CoopTicketDetail?>(null) }
    var isDetailLoading by remember { mutableStateOf(false) }
    var replyText by remember { mutableStateOf("") }
    var isReplying by remember { mutableStateOf(false) }

    val fetchTickets = {
        isLoading = true
        scope.launch {
            try {
                val response = coopService.getTickets()
                if (response.isSuccessful && response.body()?.success == true) {
                    ticketsList = response.body()?.data ?: emptyList()
                } else {
                    ticketsList = emptyList()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal mengambil data tiket: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isLoading = false
            }
        }
    }

    val fetchTicketDetail: (String) -> Unit = { id ->
        isDetailLoading = true
        scope.launch {
            try {
                val response = coopService.getTicketDetail(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    ticketDetail = response.body()?.data
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Gagal memuat detail tiket: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            } finally {
                isDetailLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        fetchTickets()
    }

    val handleCreateTicket = {
        if (newSubject.isBlank() || newMessageBody.isBlank()) {
            Toast.makeText(context, "Subjek dan pesan wajib diisi", Toast.LENGTH_SHORT).show()
        } else {
            isSubmitting = true
            scope.launch {
                try {
                    val request = CoopTicketCreateRequest(
                        subject = newSubject.trim(),
                        priority = newPriority,
                        message = newMessageBody.trim()
                    )
                    val response = coopService.createTicket(request)
                    if (response.isSuccessful && response.body()?.success == true) {
                        Toast.makeText(context, "Tiket berhasil dikirim", Toast.LENGTH_SHORT).show()
                        showCreateDialog = false
                        newSubject = ""
                        newPriority = "MEDIUM"
                        newMessageBody = ""
                        fetchTickets()
                    } else {
                        Toast.makeText(context, response.body()?.message ?: "Gagal mengirim tiket.", Toast.LENGTH_LONG).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
                } finally {
                    isSubmitting = false
                }
            }
        }
    }

    val handleSendReply: (String) -> Unit = { ticketId ->
        if (replyText.trim().isNotBlank()) {
            isReplying = true
            scope.launch {
                try {
                    val request = CoopTicketReplyRequest(
                        content = replyText.trim(),
                        isStaff = isStaff
                    )
                    val response = coopService.replyTicket(ticketId, request)
                    if (response.isSuccessful && response.body()?.success == true) {
                        replyText = ""
                        fetchTicketDetail(ticketId)
                        fetchTickets() // refresh message count/status in main screen
                    } else {
                        Toast.makeText(context, response.body()?.message ?: "Gagal mengirim balasan.", Toast.LENGTH_SHORT).show()
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
                } finally {
                    isReplying = false
                }
            }
        }
    }

    val handleStatusChange: (String, String) -> Unit = { ticketId, newStatus ->
        scope.launch {
            try {
                val response = coopService.updateTicketStatus(ticketId, CoopTicketStatusRequest(status = newStatus))
                if (response.isSuccessful && response.body()?.success == true) {
                    Toast.makeText(context, "Status tiket diperbarui", Toast.LENGTH_SHORT).show()
                    fetchTicketDetail(ticketId)
                    fetchTickets()
                } else {
                    Toast.makeText(context, response.body()?.message ?: "Gagal memperbarui status", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(context, "Error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Tiket Layanan Bantuan", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Kembali",
                            tint = Color.White
                        )
                    }
                },
                actions = {
                    IconButton(onClick = { fetchTickets() }) {
                        Icon(imageVector = Icons.Default.Refresh, contentDescription = "Segarkan", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        },
        floatingActionButton = {
            if (selectedTicketId == null) {
                ExtendedFloatingActionButton(
                    onClick = { showCreateDialog = true },
                    containerColor = Color(0xFF1E3C72),
                    contentColor = Color.White,
                    icon = { Icon(Icons.Default.Add, "Tambah") },
                    text = { Text("Buat Tiket") }
                )
            }
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color(0xFFF8FAFC), Color(0xFFF1F5F9))
                    )
                )
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                Text(
                    text = "Daftar Pengaduan & Bantuan",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = Color(0xFF1E293B),
                    modifier = Modifier.padding(bottom = 12.dp)
                )

                if (isLoading) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Color(0xFF1E3C72))
                    }
                } else if (ticketsList.isEmpty()) {
                    Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Email, contentDescription = "Kosong", tint = Color.LightGray, modifier = Modifier.size(64.dp))
                            Spacer(modifier = Modifier.height(12.dp))
                            Text("Belum ada tiket bantuan.", fontSize = 13.sp, color = Color.Gray)
                        }
                    }
                } else {
                    LazyColumn(
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        items(ticketsList) { ticket ->
                            val statusBg = when (ticket.status.uppercase()) {
                                "OPEN" -> Color(0xFFDCFCE7)
                                "IN_PROGRESS" -> Color(0xFFDBEAFE)
                                else -> Color(0xFFF1F5F9)
                            }
                            val statusText = when (ticket.status.uppercase()) {
                                "OPEN" -> Color(0xFF166534)
                                "IN_PROGRESS" -> Color(0xFF1E40AF)
                                else -> Color(0xFF475569)
                            }
                            val priorityColor = when (ticket.priority.uppercase()) {
                                "HIGH" -> Color(0xFFEF4444)
                                "MEDIUM" -> Color(0xFFF59E0B)
                                else -> Color(0xFF10B981)
                            }

                            Card(
                                shape = RoundedCornerShape(12.dp),
                                colors = CardDefaults.cardColors(containerColor = Color.White),
                                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        selectedTicketId = ticket.id
                                        fetchTicketDetail(ticket.id)
                                    }
                            ) {
                                Column(
                                    modifier = Modifier.padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = ticket.subject,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = Color(0xFF0F172A),
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(statusBg)
                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(
                                                text = ticket.status,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Black,
                                                color = statusText
                                            )
                                        }
                                    }

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = "Pengirim: " + (ticket.member?.name ?: "Unknown"),
                                                fontSize = 12.sp,
                                                color = Color.Gray
                                            )
                                            val displayDate = try {
                                                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                                val formatter = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
                                                formatter.format(parser.parse(ticket.createdAt)!!)
                                            } catch (e: Exception) {
                                                ticket.createdAt.substring(0, 10)
                                            }
                                            Text(
                                                text = "Dibuat: $displayDate",
                                                fontSize = 10.sp,
                                                color = Color.LightGray
                                            )
                                        }
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(6.dp))
                                                    .background(priorityColor.copy(alpha = 0.15f))
                                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                                            ) {
                                                Text(
                                                    text = ticket.priority,
                                                    fontSize = 9.sp,
                                                    fontWeight = FontWeight.Bold,
                                                    color = priorityColor
                                                )
                                            }
                                            if (ticket._count != null && ticket._count.messages > 0) {
                                                Badge(containerColor = Color(0xFF1E3C72)) {
                                                    Text("${ticket._count.messages}", color = Color.White, fontSize = 9.sp, modifier = Modifier.padding(2.dp))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Chat Detail Overlay
            AnimatedVisibility(
                visible = selectedTicketId != null,
                enter = fadeIn(),
                exit = fadeOut(),
                modifier = Modifier.fillMaxSize()
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.White)
                ) {
                    val detail = ticketDetail
                    if (isDetailLoading && detail == null) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = Color(0xFF1E3C72))
                        }
                    } else if (detail != null) {
                        val messagesList = detail.messages ?: emptyList()
                        val listState = rememberLazyListState()

                        // Auto-scroll to bottom when messages count changes
                        LaunchedEffect(messagesList.size) {
                            if (messagesList.isNotEmpty()) {
                                listState.animateScrollToItem(messagesList.size - 1)
                            }
                        }

                        Column(modifier = Modifier.fillMaxSize()) {
                            // Header chat
                            Card(
                                shape = RoundedCornerShape(0.dp),
                                colors = CardDefaults.cardColors(containerColor = Color(0xFFF1F5F9)),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .statusBarsPadding()
                                        .padding(horizontal = 8.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    IconButton(onClick = {
                                        selectedTicketId = null
                                        ticketDetail = null
                                    }) {
                                        Icon(imageVector = Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Kembali", tint = Color(0xFF1E3C72))
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(detail.subject, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF0F172A), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text("Oleh: ${detail.member?.name ?: "Unknown"}", fontSize = 12.sp, color = Color.Gray)
                                    }
                                    
                                    // Status Switcher
                                    if (isStaff) {
                                        var showStatusMenu by remember { mutableStateOf(false) }
                                        Box {
                                            Button(
                                                onClick = { showStatusMenu = true },
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                                                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                                modifier = Modifier.height(30.dp)
                                            ) {
                                                Text(detail.status, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White)
                                            }
                                            DropdownMenu(
                                                expanded = showStatusMenu,
                                                onDismissRequest = { showStatusMenu = false }
                                            ) {
                                                DropdownMenuItem(
                                                    text = { Text("OPEN") },
                                                    onClick = {
                                                        showStatusMenu = false
                                                        handleStatusChange(detail.id, "OPEN")
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("IN_PROGRESS") },
                                                    onClick = {
                                                        showStatusMenu = false
                                                        handleStatusChange(detail.id, "IN_PROGRESS")
                                                    }
                                                )
                                                DropdownMenuItem(
                                                    text = { Text("CLOSED") },
                                                    onClick = {
                                                        showStatusMenu = false
                                                        handleStatusChange(detail.id, "CLOSED")
                                                    }
                                                )
                                            }
                                        }
                                    } else {
                                        // Member static badge
                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color(0xFF1E3C72).copy(alpha = 0.1f))
                                                .padding(horizontal = 8.dp, vertical = 4.dp)
                                        ) {
                                            Text(detail.status, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E3C72))
                                        }
                                    }
                                }
                            }

                            // Conversation Area
                            LazyColumn(
                                state = listState,
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth()
                                    .background(Color(0xFFF8FAFC))
                                    .padding(horizontal = 16.dp, vertical = 12.dp),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                items(messagesList) { msg ->
                                    // isStaff true means the reply was made by operator. If current user is member, staff reply is shown on left.
                                    // Let's match typical chat: sender is right, recipient is left.
                                    // Sender is: (if isStaff == true and current user isStaff == true) OR (if isStaff == false and current user isStaff == false)
                                    val isMe = (msg.isStaff && isStaff) || (!msg.isStaff && !isStaff)
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start
                                    ) {
                                        Column(
                                            modifier = Modifier.widthIn(max = 280.dp),
                                            horizontalAlignment = if (isMe) Alignment.End else Alignment.Start
                                        ) {
                                            Box(
                                                modifier = Modifier
                                                    .clip(
                                                        RoundedCornerShape(
                                                            topStart = 14.dp,
                                                            topEnd = 14.dp,
                                                            bottomStart = if (isMe) 14.dp else 2.dp,
                                                            bottomEnd = if (isMe) 2.dp else 14.dp
                                                        )
                                                    )
                                                    .background(if (isMe) Color(0xFF2563EB) else Color.White)
                                                    .padding(horizontal = 14.dp, vertical = 10.dp)
                                            ) {
                                                Text(
                                                    text = msg.content,
                                                    fontSize = 13.sp,
                                                    color = if (isMe) Color.White else Color(0xFF334155),
                                                    modifier = Modifier.align(Alignment.CenterStart)
                                                )
                                            }
                                            val displayTime = try {
                                                val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
                                                val formatter = SimpleDateFormat("HH:mm", Locale.getDefault())
                                                formatter.format(parser.parse(msg.createdAt)!!)
                                            } catch (e: Exception) {
                                                ""
                                            }
                                            Text(
                                                text = (if (msg.isStaff) "Petugas • " else "Anggota • ") + displayTime,
                                                fontSize = 9.sp,
                                                color = Color.LightGray,
                                                modifier = Modifier.padding(top = 2.dp)
                                            )
                                        }
                                    }
                                }
                            }

                            // Bottom Input Bar
                            Surface(
                                tonalElevation = 3.dp,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                val isClosed = detail.status.uppercase() == "CLOSED"
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .navigationBarsPadding()
                                        .padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    OutlinedTextField(
                                        value = replyText,
                                        onValueChange = { replyText = it },
                                        placeholder = { Text(if (isClosed) "Tiket ditutup" else "Tulis balasan...") },
                                        modifier = Modifier.weight(1f),
                                        singleLine = true,
                                        enabled = !isClosed,
                                        shape = RoundedCornerShape(20.dp),
                                        colors = OutlinedTextFieldDefaults.colors(
                                            unfocusedContainerColor = Color.White,
                                            focusedContainerColor = Color.White
                                        )
                                    )
                                    IconButton(
                                        onClick = { handleSendReply(detail.id) },
                                        enabled = !isClosed && replyText.trim().isNotBlank() && !isReplying,
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(if (isClosed || replyText.trim().isBlank()) Color.LightGray else Color(0xFF1E3C72))
                                    ) {
                                        if (isReplying) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                                        } else {
                                            Icon(imageVector = Icons.AutoMirrored.Filled.Send, contentDescription = "Kirim", tint = Color.White, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Dialog Create Ticket
    if (showCreateDialog) {
        Dialog(
            onDismissRequest = { showCreateDialog = false },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                modifier = Modifier
                    .fillMaxWidth(0.92f)
                    .padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = "Buat Tiket Bantuan Baru",
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = Color(0xFF1E3C72)
                    )

                    OutlinedTextField(
                        value = newSubject,
                        onValueChange = { newSubject = it },
                        label = { Text("Subjek / Judul Masalah") },
                        placeholder = { Text("Contoh: Error saat checkout POS") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true
                    )

                    // Priority Dropdown
                    var showPriorityMenu by remember { mutableStateOf(false) }
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedTextField(
                            value = when (newPriority) {
                                "LOW" -> "Low - Tidak Mendesak"
                                "HIGH" -> "High - Sangat Mendesak"
                                else -> "Medium - Biasa"
                            },
                            onValueChange = {},
                            label = { Text("Prioritas") },
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { showPriorityMenu = true },
                            enabled = false,
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = Color.Black,
                                disabledBorderColor = Color.Gray,
                                disabledLabelColor = Color.Gray
                            )
                        )
                        DropdownMenu(
                            expanded = showPriorityMenu,
                            onDismissRequest = { showPriorityMenu = false },
                            modifier = Modifier.fillMaxWidth(0.85f)
                        ) {
                            DropdownMenuItem(
                                text = { Text("Low - Tidak Mendesak") },
                                onClick = {
                                    newPriority = "LOW"
                                    showPriorityMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("Medium - Biasa") },
                                onClick = {
                                    newPriority = "MEDIUM"
                                    showPriorityMenu = false
                                }
                            )
                            DropdownMenuItem(
                                text = { Text("High - Sangat Mendesak") },
                                onClick = {
                                    newPriority = "HIGH"
                                    showPriorityMenu = false
                                }
                            )
                        }
                    }

                    OutlinedTextField(
                        value = newMessageBody,
                        onValueChange = { newMessageBody = it },
                        label = { Text("Detail Masalah") },
                        placeholder = { Text("Jelaskan keluhan Anda secara rinci...") },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(120.dp),
                        maxLines = 5
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TextButton(onClick = { showCreateDialog = false }) {
                            Text("Batal", color = Color.Gray)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Button(
                            onClick = { handleCreateTicket() },
                            enabled = !isSubmitting,
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72))
                        ) {
                            if (isSubmitting) {
                                CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp))
                            } else {
                                Text("Kirim Tiket", color = Color.White)
                            }
                        }
                    }
                }
            }
        }
    }
}
