package com.absenta.app.ui.components

import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Popup
import androidx.compose.ui.window.PopupProperties
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ReferenceService
import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.UniversalSearchItem
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.SurfaceDark
import com.absenta.app.ui.theme.SurfaceVariantDark
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary
import kotlinx.coroutines.delay

/**
 * SmartStudentPicker — High-Speed Universal Live Search & Hardware RFID Reader Input.
 *
 * Mengadopsi 1:1 input AndroidView(EditText) native seperti Modul Gerbang (CameraScannerScreen):
 * - High-speed 0ms input latency untuk hardware USB RFID / Barcode Scanner.
 * - Auto-clear & Instant Submit via setOnEditorActionListener.
 * - Live Search dropdown debounced 300ms untuk pencarian manual nama/NIS.
 *
 * @param value String nilai input saat ini
 * @param onValueChange Callback perubahan teks
 * @param onSelectStudent Callback saat item dari dropdown dipilih
 * @param onSubmitScan Callback submit presensi `(inputCode)`
 * @param tokenManager Manager session untuk request API
 * @param modifier Modifier layout
 * @param placeholder Teks placeholder
 * @param isLoading Flag status loading
 */
@Composable
fun SmartStudentPicker(
    value: String,
    onValueChange: (String) -> Unit,
    onSelectStudent: (UniversalSearchItem) -> Unit,
    onSubmitScan: (String) -> Unit,
    tokenManager: TokenManager,
    modifier: Modifier = Modifier,
    placeholder: String = "Scan RFID/QR atau ketik Nama/NIS/NIP...",
    isLoading: Boolean = false
) {
    var searchResults by remember { mutableStateOf<List<UniversalSearchItem>>(emptyList()) }
    var isSearching by remember { mutableStateOf(false) }
    var showDropdown by remember { mutableStateOf(false) }

    // Live Debounce 300ms Effect untuk pencarian manual nama/NIS
    LaunchedEffect(value) {
        if (value.trim().length >= 2) {
            delay(300)
            isSearching = true
            try {
                val retrofit = ApiClient.create(tokenManager)
                val service = retrofit.create(ReferenceService::class.java)
                val response = service.universalSearch(query = value.trim(), limit = 10)
                if (response.isSuccessful && !response.body()?.data.isNullOrEmpty()) {
                    searchResults = response.body()!!.data!!
                    showDropdown = true
                } else {
                    searchResults = emptyList()
                    showDropdown = false
                }
            } catch (e: Exception) {
                searchResults = emptyList()
                showDropdown = false
            } finally {
                isSearching = false
            }
        } else {
            searchResults = emptyList()
            showDropdown = false
        }
    }

    Box(modifier = modifier.fillMaxWidth()) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // High-Speed Native EditText (0ms typing speed persis Modul Gerbang)
                AndroidView(
                    factory = { ctx ->
                        EditText(ctx).apply {
                            hint = placeholder
                            setHintTextColor(android.graphics.Color.parseColor("#64748B"))
                            setTextColor(android.graphics.Color.parseColor("#0F172A"))
                            textSize = 14f
                            isSingleLine = true
                            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS
                            imeOptions = EditorInfo.IME_ACTION_DONE or EditorInfo.IME_FLAG_NO_EXTRACT_UI
                            setBackgroundResource(android.R.color.transparent)
                            setPadding(28, 20, 28, 20)
                            requestFocus()

                            setOnEditorActionListener { v, _, _ ->
                                val input = v.text.toString().trim()
                                if (input.isNotEmpty() && !isLoading) {
                                    v.setText("")
                                    showDropdown = false
                                    onSubmitScan(input)
                                    true
                                } else false
                            }
                        }
                    },
                    modifier = Modifier
                        .weight(1f)
                        .background(SurfaceVariantDark, RoundedCornerShape(12.dp))
                        .border(1.dp, Border, RoundedCornerShape(12.dp))
                )

                // Tombol Submit / Submit Manual
                Button(
                    onClick = {
                        showDropdown = false
                        if (value.isNotBlank() && !isLoading) {
                            val codeToSubmit = value.trim()
                            onValueChange("")
                            onSubmitScan(codeToSubmit)
                        }
                    },
                    enabled = !isLoading && value.isNotBlank(),
                    colors = ButtonDefaults.buttonColors(containerColor = Primary),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.height(48.dp)
                ) {
                    Text(if (isLoading) "Proses..." else "Submit", fontWeight = FontWeight.Bold)
                }
            }
        }

        // Live Search Results Dropdown Popup
        if (showDropdown && searchResults.isNotEmpty()) {
            Popup(
                alignment = Alignment.TopStart,
                offset = IntOffset(0, 140),
                onDismissRequest = { showDropdown = false },
                properties = PopupProperties(focusable = false)
            ) {
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 4.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = SurfaceDark),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
                ) {
                    LazyColumn(
                        modifier = Modifier
                            .fillMaxWidth()
                            .heightIn(max = 240.dp)
                    ) {
                        items(searchResults) { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        showDropdown = false
                                        onSelectStudent(item)
                                    }
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .clip(CircleShape)
                                        .background(Primary.copy(alpha = 0.15f)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        Icons.Default.Person,
                                        contentDescription = null,
                                        tint = Primary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        item.name ?: "Tanpa Nama",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = TextPrimary,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        "${item.type ?: "SISWA"} • ${item.identifier ?: "-"}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = TextSecondary,
                                        fontSize = 11.sp
                                    )
                                }

                                if (!item.kelas.isNullOrEmpty()) {
                                    Text(
                                        item.kelas!!,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Primary,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 10.sp,
                                        modifier = Modifier
                                            .background(Primary.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                            .padding(horizontal = 8.dp, vertical = 3.dp)
                                    )
                                }
                            }
                            Divider(color = Border.copy(alpha = 0.5f))
                        }
                    }
                }
            }
        }
    }
}
