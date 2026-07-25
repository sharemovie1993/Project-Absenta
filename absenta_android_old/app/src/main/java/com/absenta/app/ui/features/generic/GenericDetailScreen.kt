package com.absenta.app.ui.features.generic

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.util.Log
import com.absenta.app.data.api.ApiClient
import com.absenta.app.ui.components.HardeningInspector
import com.absenta.app.ui.components.HardeningStandard
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GenericDetailScreen(
    title: String,
    onNavigateBack: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var searchQuery by remember { mutableStateOf("") }
    var itemsList by remember { mutableStateOf<List<GenericItem>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    // Bottom Sheet State
    var selectedItem by remember { mutableStateOf<GenericItem?>(null) }
    var showBottomSheet by remember { mutableStateOf(false) }

    fun loadData() {
        scope.launch {
            isLoading = true
            Log.d("AbsentaDebug", "GenericDetailScreen loading live data for $title...")
            try {
                val service = ApiClient.getClient(context).create(com.absenta.app.data.api.AcademicService::class.java)
                
                val resultList: List<com.absenta.app.ui.features.generic.GenericItem>? = when (title) {

                    else -> null
                }

                if (resultList != null) {
                    itemsList = resultList
                    Log.d("AbsentaDebug", "Live data loaded success: ${resultList.size} items")
                } else {
                    Log.w("AbsentaDebug", "Live API returned empty or failed.")
                    itemsList = emptyList()
                }
            } catch (e: Exception) {
                Log.e("AbsentaDebug", "Error fetching live academic data", e)
                itemsList = emptyList()
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(title) {
        loadData()
    }

    // Debounce search query
    LaunchedEffect(searchQuery) {
        if (searchQuery.isNotEmpty()) {
            delay(500)
        }
        loadData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = title,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF0F172A)
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Kembali",
                            tint = Color(0xFF1E3C72)
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color.White
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { /* Add action */ },
                containerColor = Color(0xFF1E3C72),
                contentColor = Color.White,
                shape = CircleShape
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = "Tambah")
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(Color(0xFFF8FAFC))
        ) {
            // Search Bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Cari data...", color = Color(0xFF94A3B8)) },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Search,
                        contentDescription = "Search",
                        tint = Color(0xFF64748B)
                    )
                },
                shape = RoundedCornerShape(12.dp),
                singleLine = true
            )

            // Mini Analytic Cards Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val totalCount = itemsList.size
                val activeCount = itemsList.count { it.isActive }
                val inactiveCount = totalCount - activeCount
                
                MiniAnalyticCard(
                    number = totalCount.toString(),
                    label = "Total $title",
                    containerColor = Color(0xFFEFF6FF),
                    contentColor = Color(0xFF1E3C72)
                )
                MiniAnalyticCard(
                    number = activeCount.toString(),
                    label = "Aktif",
                    containerColor = Color(0xFFECFDF5),
                    contentColor = Color(0xFF047857)
                )
                MiniAnalyticCard(
                    number = inactiveCount.toString(),
                    label = "Nonaktif",
                    containerColor = Color(0xFFFEF2F2),
                    contentColor = Color(0xFFB91C1C)
                )
            }



            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = Color(0xFF1E3C72))
                }
            } else if (itemsList.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Tidak ada data yang ditemukan",
                        fontSize = 14.sp,
                        color = Color(0xFF64748B)
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(itemsList) { item ->
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedItem = item
                                    showBottomSheet = true
                                },
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Status Indicator / Tag
                                Box(
                                    modifier = Modifier
                                        .size(10.dp)
                                        .background(
                                            color = if (item.isActive) Color(0xFF10B981) else Color(0xFFEF4444),
                                            shape = CircleShape
                                        )
                                )
                                
                                Spacer(modifier = Modifier.width(16.dp))
                                
                                Column(
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        text = item.title,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = Color(0xFF0F172A)
                                    )
                                    Text(
                                        text = item.subtitle,
                                        fontSize = 13.sp,
                                        color = Color(0xFF64748B),
                                        modifier = Modifier.padding(top = 2.dp)
                                    )
                                }
                                
                                // Tag Label
                                Text(
                                    text = item.tag,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = if (item.isActive) Color(0xFF047857) else Color(0xFFB91C1C),
                                    modifier = Modifier
                                        .background(
                                            color = if (item.isActive) Color(0xFFD1FAE5) else Color(0xFFFEE2E2),
                                            shape = RoundedCornerShape(6.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Modal Bottom Sheet Detail Data
    if (showBottomSheet && selectedItem != null) {
        ModalBottomSheet(
            onDismissRequest = {
                showBottomSheet = false
                selectedItem = null
            },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = Color.White,
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 24.dp, vertical = 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Drawer
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .background(
                                color = if (selectedItem!!.isActive) Color(0xFF10B981) else Color(0xFFEF4444),
                                shape = CircleShape
                            )
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = "Detail Data $title",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF1E3C72)
                    )
                }

                HorizontalDivider(color = Color(0xFFE2E8F0))

                // Detail Item Fields
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    DetailRowItem(label = "Nama / Judul", value = selectedItem!!.title)
                    
                    if (selectedItem!!.extraDetails.isNotEmpty()) {
                        selectedItem!!.extraDetails.forEach { (label, value) ->
                            DetailRowItem(label = label, value = value)
                        }
                    } else {
                        DetailRowItem(label = "Keterangan", value = selectedItem!!.subtitle)
                        DetailRowItem(label = "Status", value = selectedItem!!.tag)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Action Button Tutup
                Button(
                    onClick = {
                        showBottomSheet = false
                        selectedItem = null
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1E3C72)),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Text("Tutup", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun DetailRowItem(label: String, value: String) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label.uppercase(),
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF94A3B8),
            letterSpacing = 1.sp
        )
        Text(
            text = value,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFF1E293B),
            modifier = Modifier.padding(top = 2.dp)
        )
    }
}

@Composable
fun RowScope.MiniAnalyticCard(
    number: String,
    label: String,
    containerColor: Color,
    contentColor: Color
) {
    Card(
        modifier = Modifier.weight(1f),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = containerColor),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp, horizontal = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = number,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = contentColor
            )
            Text(
                text = label,
                fontSize = 10.sp,
                fontWeight = FontWeight.Medium,
                color = contentColor.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 2.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center
            )
        }
    }
}

data class GenericItem(
    val id: String,
    val title: String,
    val subtitle: String,
    val tag: String,
    val isActive: Boolean,
    val extraDetails: Map<String, String> = emptyMap()
)


