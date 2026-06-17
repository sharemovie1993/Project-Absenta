package com.absenta.app.ui.dashboard.dialogs

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.SidebarNode

fun getIconForName(name: String?): ImageVector {
    return when (name?.trim()?.lowercase()) {
        "database" -> Icons.Default.Home
        "users" -> Icons.Default.Person
        "clipboardcheck", "checkcircle" -> Icons.Default.CheckCircle
        "alerttriangle", "warning" -> Icons.Default.Warning
        "calendar", "daterange" -> Icons.Default.DateRange
        "filetext", "list", "history" -> Icons.Default.List
        "user" -> Icons.Default.Person
        "calendarcheck" -> Icons.Default.DateRange
        "handshake" -> Icons.Default.Share
        "store", "shop", "shoppingbag", "shoppingcart" -> Icons.Default.ShoppingCart
        "userplus" -> Icons.Default.Person
        "briefcase" -> Icons.Default.List
        "activity" -> Icons.Default.Info
        "layoutdashboard" -> Icons.Default.Home
        "wallet" -> Icons.Default.ShoppingCart
        "handholdingheart" -> Icons.Default.Star
        "award" -> Icons.Default.Star
        "sparkles" -> Icons.Default.Star
        "shieldcheck" -> Icons.Default.CheckCircle
        "pluscircle" -> Icons.Default.Home
        "bell" -> Icons.Default.Notifications
        "filepiechart" -> Icons.Default.Info
        "settings" -> Icons.Default.Settings
        "locationon" -> Icons.Default.LocationOn
        else -> Icons.Default.Info
    }
}

@Composable
fun BottomSheetRowItem(
    title: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(horizontal = 24.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .background(Color(0xFFF1F5F9), RoundedCornerShape(8.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                tint = Color(0xFF64748B),
                modifier = Modifier.size(20.dp)
            )
        }
        
        Spacer(modifier = Modifier.width(16.dp))
        
        Text(
            text = title,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            color = Color(0xFF334155),
            modifier = Modifier.weight(1f)
        )
        
        Icon(
            imageVector = Icons.Default.KeyboardArrowRight,
            contentDescription = "Selanjutnya",
            tint = Color(0xFFCBD5E1),
            modifier = Modifier.size(18.dp)
        )
    }
    HorizontalDivider(
        modifier = Modifier.padding(horizontal = 24.dp),
        color = Color(0xFFF1F5F9)
    )
}

@Composable
fun RenderDynamicBottomSheet(
    rootNode: SidebarNode,
    onDismiss: () -> Unit,
    onNavigateToItem: (SidebarNode) -> Unit
) {
    val groups = rootNode.children ?: emptyList()
    val hasMultipleGroups = groups.size > 1
    val useSingleList = !hasMultipleGroups || groups.all { it.children.isNullOrEmpty() }

    if (useSingleList) {
        val allItems = groups.flatMap { g ->
            if (g.children.isNullOrEmpty()) listOf(g) else g.children!!
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
        ) {
            Text(
                text = rootNode.name,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF1E3C72),
                modifier = Modifier.padding(vertical = 12.dp, horizontal = 8.dp)
            )
            
            allItems.forEach { item ->
                val icon = getIconForName(item.icon)
                BottomSheetRowItem(
                    title = item.name,
                    icon = icon,
                    onClick = {
                        onDismiss()
                        onNavigateToItem(item)
                    }
                )
            }
            if (allItems.isEmpty()) {
                Text(
                    text = "Menu tidak tersedia",
                    fontSize = 12.sp,
                    color = Color.Gray,
                    modifier = Modifier.padding(16.dp)
                )
            }
        }
    } else {
        val directItems = groups.filter { it.children.isNullOrEmpty() }
        val filteredGroups = groups.filter { !it.children.isNullOrEmpty() }
        var selectedSubTab by remember(rootNode.id) { mutableStateOf(0) }
        val activeSubTab = selectedSubTab.coerceIn(0, filteredGroups.size - 1)
        val selectedGroup = filteredGroups.getOrNull(activeSubTab)
        val items = selectedGroup?.children ?: emptyList()

        Column(modifier = Modifier.fillMaxWidth()) {
            // Render direct items first (like Dashboard)
            directItems.forEach { item ->
                val icon = getIconForName(item.icon)
                BottomSheetRowItem(
                    title = item.name,
                    icon = icon,
                    onClick = {
                        onDismiss()
                        onNavigateToItem(item)
                    }
                )
            }

            if (directItems.isNotEmpty() && filteredGroups.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider(
                    modifier = Modifier.padding(horizontal = 24.dp),
                    color = Color(0xFFF1F5F9)
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (filteredGroups.isNotEmpty()) {
                TabRow(
                    selectedTabIndex = activeSubTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72)
                ) {
                    filteredGroups.forEachIndexed { index, subGroup ->
                        Tab(
                            selected = activeSubTab == index,
                            onClick = { selectedSubTab = index },
                            text = {
                                Text(
                                    text = subGroup.name,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeSubTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                items.forEach { item ->
                    val icon = getIconForName(item.icon)
                    BottomSheetRowItem(
                        title = item.name,
                        icon = icon,
                        onClick = {
                            onDismiss()
                            onNavigateToItem(item)
                        }
                    )
                }
                if (items.isEmpty()) {
                    Text(
                        text = "Menu tidak tersedia",
                        fontSize = 12.sp,
                        color = Color.Gray,
                        modifier = Modifier.padding(16.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun RenderStaticBottomSheet(
    activeSheetType: String,
    userRole: String,
    positionCodes: List<String>,
    capabilities: List<String>,
    selectedAkademikSubTab: Int,
    onAkademikSubTabChange: (Int) -> Unit,
    selectedAbsensiSubTab: Int,
    onAbsensiSubTabChange: (Int) -> Unit,
    selectedHubinSubTab: Int,
    onHubinSubTabChange: (Int) -> Unit,
    selectedKoperasiSubTab: Int,
    onKoperasiSubTabChange: (Int) -> Unit,
    onDismiss: () -> Unit,
    gatedNavigateToScanner: () -> Unit,
    gatedNavigateToMyAttendance: () -> Unit,
    gatedNavigateToAttendanceRekap: () -> Unit,
    gatedNavigateToSarpras: () -> Unit,
    gatedNavigateToPklVerification: () -> Unit,
    gatedNavigateToPklAbsensi: () -> Unit,
    gatedNavigateToCoopPOS: () -> Unit,
    gatedNavigateToCoopSavings: () -> Unit,
    gatedNavigateToCoopLoans: () -> Unit,
    gatedNavigateToCoopPPOB: () -> Unit,
    gatedNavigateToCoopSettings: () -> Unit,
    gatedNavigateToCoopDashboard: () -> Unit,
    gatedNavigateToCoopMembers: () -> Unit,
    gatedNavigateToCoopAnnouncements: () -> Unit,
    gatedNavigateToCoopProducts: () -> Unit,
    gatedNavigateToCoopSHU: () -> Unit,
    gatedNavigateToCoopVouchers: () -> Unit,
    gatedNavigateToCoopTickets: () -> Unit,
    gatedNavigateToCoopAccounting: () -> Unit,
    gatedNavigateToGenericDetail: (String) -> Unit,
    onShowHistory: () -> Unit,
    onNavigateToViolations: () -> Unit,
    onNavigateToCounseling: () -> Unit,
    onNavigateToPiket: () -> Unit,
    onNavigateToAcademicSiswa: () -> Unit,
    onNavigateToAcademicTahunPelajaran: () -> Unit,
    onNavigateToAcademicGuru: () -> Unit,
    onNavigateToAcademicKelas: () -> Unit,
    onNavigateToAcademicMapel: () -> Unit,
    onNavigateToAcademicSemester: () -> Unit,
    onNavigateToAcademicJurusan: () -> Unit,
    onNavigateToAcademicRegistrasiSiswa: () -> Unit,
    onNavigateToAcademicWaliKelas: () -> Unit,
    onNavigateToAcademicGuruMapel: () -> Unit,
    onNavigateToAcademicJenisKegiatan: () -> Unit,
    onNavigateToAcademicTransition: () -> Unit,
    onNavigateToAcademicSiswaCards: () -> Unit,
    onNavigateToAcademicMutation: () -> Unit,
    onNavigateToAcademicStrukturOrganisasi: () -> Unit,
    onNavigateToAcademicBackup: () -> Unit
) {
    val can = { capability: String -> capabilities.contains(capability) }
    val isStaff = userRole != "SISWA" && userRole != "STUDENT" && userRole != "PARENT" && userRole != "WALI_MURID" && userRole != "ORTU" && userRole.isNotEmpty()
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(bottom = 24.dp)
    ) {
        when (activeSheetType) {
            "AKADEMIK" -> {
                val subTabs = if (isStaff) {
                    listOf("KELOMPOK MASTER", "KELOMPOK SETUP", "KESISWAAN")
                } else {
                    listOf("AKADEMIK SAYA")
                }
                val activeSubTab = selectedAkademikSubTab.coerceIn(0, subTabs.size - 1)

                TabRow(
                    selectedTabIndex = activeSubTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72)
                ) {
                    subTabs.forEachIndexed { index, title ->
                        Tab(
                            selected = activeSubTab == index,
                            onClick = { onAkademikSubTabChange(index) },
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeSubTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val rawOptions = if (isStaff) {
                    when (activeSubTab) {
                        0 -> listOf(
                            Pair("Tahun Pelajaran", Icons.Default.DateRange),
                            Pair("Semester", Icons.Default.DateRange),
                            Pair("Jurusan", Icons.Default.Home),
                            Pair("Kelas", Icons.Default.Person),
                            Pair("Mata Pelajaran", Icons.Default.Info),
                            Pair("Guru", Icons.Default.Person),
                            Pair("Siswa", Icons.Default.Face)
                        )
                        1 -> listOf(
                            Pair("Jadwal Pelajaran", Icons.Default.DateRange),
                            Pair("Alokasi Kelas", Icons.Default.Person),
                            Pair("Kurikulum", Icons.Default.Info),
                            Pair("Registrasi Siswa", Icons.Default.Face),
                            Pair("Wali Kelas", Icons.Default.Person),
                            Pair("Guru Mapel", Icons.Default.Star),
                            Pair("Jenis Kegiatan", Icons.Default.List),
                            Pair("Kenaikan Kelas", Icons.Default.ArrowForward),
                            Pair("Kartu Siswa", Icons.Default.AccountBox),
                            Pair("Mutasi Siswa", Icons.Default.Warning),
                            Pair("Struktur Organisasi", Icons.Default.Share),
                            Pair("Backup & Restore", Icons.Default.Refresh)
                        )
                        else -> listOf(
                            Pair("Catatan Pelanggaran", Icons.Default.Warning),
                            Pair("Konseling BK", Icons.Default.Info),
                            Pair("Piket Harian", Icons.Default.CheckCircle)
                        )
                    }
                } else {
                    listOf(
                        Pair("Jadwal Pelajaran", Icons.Default.DateRange)
                    )
                }

                val options = rawOptions.filter { (optionTitle, _) ->
                    when (optionTitle) {
                        "Piket Harian" -> {
                            can("dashboard.view.piket") || can("attendance.piket.view") || positionCodes.contains("GERBANG") || positionCodes.contains("KESISWAAN") || userRole == "ADMIN" || userRole == "SUPERADMIN" || userRole == "SUPER_ADMIN"
                        }
                        else -> true
                    }
                }

                options.forEach { (optionTitle, icon) ->
                    BottomSheetRowItem(
                        title = optionTitle,
                        icon = icon,
                        onClick = {
                            onDismiss()
                            when (optionTitle) {
                                "Catatan Pelanggaran" -> onNavigateToViolations()
                                "Konseling BK" -> onNavigateToCounseling()
                                "Piket Harian" -> onNavigateToPiket()
                                "Siswa" -> onNavigateToAcademicSiswa()
                                "Tahun Pelajaran" -> onNavigateToAcademicTahunPelajaran()
                                "Guru" -> onNavigateToAcademicGuru()
                                "Kelas" -> onNavigateToAcademicKelas()
                                "Mata Pelajaran" -> onNavigateToAcademicMapel()
                                "Semester" -> onNavigateToAcademicSemester()
                                "Jurusan" -> onNavigateToAcademicJurusan()
                                "Registrasi Siswa" -> onNavigateToAcademicRegistrasiSiswa()
                                "Wali Kelas" -> onNavigateToAcademicWaliKelas()
                                "Guru Mapel" -> onNavigateToAcademicGuruMapel()
                                "Jenis Kegiatan" -> onNavigateToAcademicJenisKegiatan()
                                "Kenaikan Kelas" -> onNavigateToAcademicTransition()
                                "Kartu Siswa" -> onNavigateToAcademicSiswaCards()
                                "Mutasi Siswa" -> onNavigateToAcademicMutation()
                                "Struktur Organisasi" -> onNavigateToAcademicStrukturOrganisasi()
                                "Backup & Restore" -> onNavigateToAcademicBackup()
                                else -> gatedNavigateToGenericDetail(optionTitle)
                            }
                        }
                    )
                }
            }
            "ABSENSI" -> {
                val subTabs = if (isStaff) {
                    listOf("ABSENSI GURU", "ABSENSI SISWA")
                } else {
                    listOf("ABSENSI SAYA")
                }
                val activeSubTab = selectedAbsensiSubTab.coerceIn(0, subTabs.size - 1)

                TabRow(
                    selectedTabIndex = activeSubTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72)
                ) {
                    subTabs.forEachIndexed { index, title ->
                        Tab(
                            selected = activeSubTab == index,
                            onClick = { onAbsensiSubTabChange(index) },
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeSubTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val rawOptions = if (isStaff) {
                    when (activeSubTab) {
                        0 -> listOf(
                            Pair("Presensi Mandiri (GPS)", Icons.Default.Home),
                            Pair("Riwayat Presensi", Icons.Default.DateRange)
                        )
                        else -> listOf(
                            Pair("Scan Presensi (Kamera)", Icons.Default.Home),
                            Pair("Rekap Absensi Siswa", Icons.Default.DateRange)
                        )
                    }
                } else {
                    if (userRole == "STUDENT" || userRole == "SISWA") {
                        listOf(
                            Pair("Presensi Mandiri (GPS)", Icons.Default.Home),
                            Pair("Riwayat Presensi", Icons.Default.DateRange)
                        )
                    } else { // PARENT
                        listOf(
                            Pair("Riwayat Presensi", Icons.Default.DateRange)
                        )
                    }
                }

                val options = rawOptions.filter { (optionTitle, _) ->
                    when (optionTitle) {
                        "Scan Presensi (Kamera)" -> {
                            can("attendance.scan") || positionCodes.contains("GERBANG") || positionCodes.contains("PETUGAS_KELAS") || userRole == "ADMIN" || userRole == "SUPERADMIN" || userRole == "SUPER_ADMIN"
                        }
                        else -> true
                    }
                }

                options.forEach { (optionTitle, icon) ->
                    BottomSheetRowItem(
                        title = optionTitle,
                        icon = icon,
                        onClick = {
                            onDismiss()
                            when (optionTitle) {
                                "Presensi Mandiri (GPS)" -> gatedNavigateToMyAttendance()
                                "Riwayat Presensi" -> onShowHistory()
                                "Scan Presensi (Kamera)" -> gatedNavigateToScanner()
                                "Rekap Absensi Siswa" -> gatedNavigateToAttendanceRekap()
                                else -> gatedNavigateToGenericDetail(optionTitle)
                            }
                        }
                    )
                }
            }
            "KOPERASI" -> {
                val isKoperasiStaff = positionCodes.contains("BENDAHARA_KOPERASI") ||
                        positionCodes.contains("KETUA_KOPERASI") ||
                        positionCodes.contains("SEKRETARIS_KOPERASI") ||
                        positionCodes.contains("MANAJER_TOKO_KOPERASI") ||
                        can("cooperative.members.manage") ||
                        userRole == "ADMIN" || userRole == "SUPERADMIN" || userRole == "SUPER_ADMIN"
                
                val subTabs = if (isKoperasiStaff) {
                    listOf("DASHBOARD", "KELOMPOK ANGGOTA", "KELOMPOK PENGURUS")
                } else {
                    listOf("KELOMPOK ANGGOTA")
                }
                val activeSubTab = selectedKoperasiSubTab.coerceIn(0, subTabs.size - 1)

                TabRow(
                    selectedTabIndex = activeSubTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72)
                ) {
                    subTabs.forEachIndexed { index, title ->
                        Tab(
                            selected = activeSubTab == index,
                            onClick = { onKoperasiSubTabChange(index) },
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeSubTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val rawOptions = when (subTabs[activeSubTab]) {
                    "DASHBOARD" -> listOf(
                        Pair("Dashboard Koperasi", Icons.Default.Info)
                    )
                    "KELOMPOK ANGGOTA" -> listOf(
                        Pair("Tabungan Saya", Icons.Default.Star),
                        Pair("Pinjaman Saya", Icons.Default.Info),
                        Pair("Katalog Belanja", Icons.Default.ShoppingCart),
                        Pair("PPOB & Pembayaran", Icons.Default.Phone),
                        Pair("SHU Saya", Icons.Default.Star),
                        Pair("Tiket Bantuan", Icons.Default.Email),
                        Pair("Poin & Benefit", Icons.Default.Star)
                    )
                    else -> listOf(
                        Pair("Manajemen Anggota", Icons.Default.Person),
                        Pair("Input Simpanan", Icons.Default.Check),
                        Pair("Persetujuan Pinjaman", Icons.Default.CheckCircle),
                        Pair("Pengaturan Koperasi", Icons.Default.Settings),
                        Pair("Pengumuman Koperasi", Icons.Default.Warning),
                        Pair("Manajemen Produk", Icons.Default.ShoppingCart),
                        Pair("Manajemen Voucher", Icons.Default.Star),
                        Pair("Tiket Bantuan", Icons.Default.Email),
                        Pair("Laporan Keuangan", Icons.Default.Info),
                        Pair("Manajemen SHU", Icons.Default.Star)
                    )
                }

                rawOptions.forEach { (optionTitle, icon) ->
                    BottomSheetRowItem(
                        title = optionTitle,
                        icon = icon,
                        onClick = {
                            onDismiss()
                            when (optionTitle) {
                                "Dashboard Koperasi" -> gatedNavigateToCoopDashboard()
                                "Katalog Belanja" -> gatedNavigateToCoopPOS()
                                "Tabungan Saya" -> gatedNavigateToCoopSavings()
                                "Pinjaman Saya" -> gatedNavigateToCoopLoans()
                                "PPOB & Pembayaran" -> gatedNavigateToCoopPPOB()
                                "Input Simpanan" -> gatedNavigateToCoopSavings()
                                "Persetujuan Pinjaman" -> gatedNavigateToCoopLoans()
                                "Pengaturan Koperasi" -> gatedNavigateToCoopSettings()
                                "Manajemen Anggota" -> gatedNavigateToCoopMembers()
                                "Pengumuman Koperasi" -> gatedNavigateToCoopAnnouncements()
                                "Manajemen Produk" -> gatedNavigateToCoopProducts()
                                "SHU Saya" -> gatedNavigateToCoopSHU()
                                "Manajemen SHU" -> gatedNavigateToCoopSHU()
                                "Manajemen Voucher" -> gatedNavigateToCoopVouchers()
                                "Tiket Bantuan" -> gatedNavigateToCoopTickets()
                                "Laporan Keuangan" -> gatedNavigateToCoopAccounting()
                                else -> gatedNavigateToGenericDetail(optionTitle)
                            }
                        }
                    )
                }
            }
            "HUBIN" -> {
                val subTabs = if (isStaff) {
                    listOf("MITRA INDUSTRI", "PRAKERIN", "KURIKULUM", "BILLING")
                } else {
                    listOf("MITRA INDUSTRI", "PRAKERIN")
                }
                val activeSubTab = selectedHubinSubTab.coerceIn(0, subTabs.size - 1)

                TabRow(
                    selectedTabIndex = activeSubTab,
                    containerColor = Color.White,
                    contentColor = Color(0xFF1E3C72)
                ) {
                    subTabs.forEachIndexed { index, title ->
                        Tab(
                            selected = activeSubTab == index,
                            onClick = { onHubinSubTabChange(index) },
                            text = {
                                Text(
                                    text = title,
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (activeSubTab == index) Color(0xFF1E3C72) else Color(0xFF94A3B8)
                                )
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                val rawOptions = when (activeSubTab) {
                    0 -> {
                        if (isStaff) {
                            listOf(
                                Pair("Daftar Perusahaan", Icons.Default.Home),
                                Pair("MoU Kerjasama", Icons.Default.Info)
                            )
                        } else {
                            listOf(
                                Pair("Daftar Perusahaan", Icons.Default.Home)
                            )
                        }
                    }
                    1 -> {
                        if (isStaff) {
                            listOf(
                                Pair("Verifikasi Jurnal PKL", Icons.Default.Check),
                                Pair("Absensi PKL (GPS)", Icons.Default.LocationOn),
                                Pair("Plotting PKL", Icons.Default.Home),
                                Pair("Jurnal Kegiatan", Icons.Default.DateRange),
                                Pair("Nilai Prakerin", Icons.Default.Info)
                            )
                        } else {
                            if (userRole == "STUDENT" || userRole == "SISWA") {
                                listOf(
                                    Pair("Absensi PKL (GPS)", Icons.Default.LocationOn),
                                    Pair("Jurnal Kegiatan", Icons.Default.DateRange),
                                    Pair("Nilai Prakerin", Icons.Default.Info)
                               )
                            } else { // PARENT
                                listOf(
                                    Pair("Jurnal Kegiatan", Icons.Default.DateRange),
                                    Pair("Nilai Prakerin", Icons.Default.Info)
                                )
                            }
                        }
                    }
                    2 -> listOf(
                        Pair("Jadwal Mengajar", Icons.Default.DateRange),
                        Pair("Jurnal Mengajar", Icons.Default.Edit)
                    )
                    else -> listOf(
                        Pair("Paket Langganan", Icons.Default.Star),
                        Pair("Riwayat Tagihan", Icons.Default.Info)
                    )
                }

                rawOptions.forEach { (optionTitle, icon) ->
                    BottomSheetRowItem(
                        title = optionTitle,
                        icon = icon,
                        onClick = {
                            onDismiss()
                            when (optionTitle) {
                                "Verifikasi Jurnal PKL" -> gatedNavigateToPklVerification()
                                "Absensi PKL (GPS)" -> gatedNavigateToPklAbsensi()
                                "Jadwal Mengajar" -> gatedNavigateToScanner() // Or corresponding navigation
                                "Jurnal Mengajar" -> gatedNavigateToScanner() // Or corresponding navigation
                                "Paket Langganan" -> gatedNavigateToScanner() // Or corresponding navigation
                                "Riwayat Tagihan" -> gatedNavigateToScanner() // Or corresponding navigation
                                else -> gatedNavigateToGenericDetail(optionTitle)
                            }
                        }
                    )
                }
            }
        }
    }
}
