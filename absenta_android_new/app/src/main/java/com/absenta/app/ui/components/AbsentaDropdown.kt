package com.absenta.app.ui.components

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.absenta.app.ui.theme.Border
import com.absenta.app.ui.theme.Primary
import com.absenta.app.ui.theme.TextPrimary
import com.absenta.app.ui.theme.TextSecondary

/** Item generic untuk Dropdown Picker */
data class DropdownOption(
    val id: String,
    val label: String,
    val subtitle: String? = null
)

/**
 * AbsentaDropdown — Komponen Searchable Dropdown Picker Universal Material 3 Dark-First.
 *
 * Menerima list [DropdownOption] (ID, Label, Subtitle) dan menyediakan
 * pencarian real-time sehingga pengguna tidak pernah perlu mengetik ID manual.
 *
 * Menggunakan Overlay Box dengan matchParentSize() agar setiap klik di mana saja
 * pada komponen dijamin membuka DropdownMenu secara instan.
 *
 * @param label Label judul field
 * @param selectedLabel Label item yang saat ini dipilih
 * @param options List opsi pilihan
 * @param onOptionSelected Callback saat opsi dipilih `(DropdownOption)`
 * @param modifier Modifier layout
 * @param enabled Flag enable/disable
 */
@Composable
fun AbsentaDropdown(
    label: String,
    selectedLabel: String,
    options: List<DropdownOption>,
    onOptionSelected: (DropdownOption) -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true
) {
    var expanded by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }

    val filteredOptions = remember(options, searchQuery) {
        if (searchQuery.isBlank()) options
        else options.filter {
            it.label.contains(searchQuery, ignoreCase = true) ||
                    (it.subtitle != null && it.subtitle.contains(searchQuery, ignoreCase = true))
        }
    }

    Box(modifier = modifier) {
        OutlinedTextField(
            value = selectedLabel.ifBlank { "Pilih $label" },
            onValueChange = {},
            readOnly = true,
            enabled = enabled,
            label = { Text(label) },
            trailingIcon = {
                IconButton(onClick = { if (enabled) expanded = !expanded }) {
                    Icon(
                        Icons.Default.ArrowDropDown,
                        contentDescription = "Expand",
                        tint = Primary
                    )
                }
            },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = TextPrimary,
                unfocusedTextColor = TextPrimary,
                disabledTextColor = TextSecondary,
                focusedBorderColor = Primary,
                unfocusedBorderColor = Border,
                focusedLabelColor = Primary,
                unfocusedLabelColor = TextSecondary
            ),
            modifier = Modifier.fillMaxWidth()
        )

        // Overlay transparan penuh untuk menangkap setiap tap gesture di seluruh area field
        Box(
            modifier = Modifier
                .matchParentSize()
                .clickable(enabled = enabled) {
                    expanded = !expanded
                }
        )

        DropdownMenu(
            expanded = expanded,
            onDismissRequest = {
                expanded = false
                searchQuery = ""
            },
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .heightIn(max = 320.dp)
        ) {
            // Field Pencarian jika opsi > 3
            if (options.size > 3) {
                Column(modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Cari $label...", color = TextSecondary) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Primary) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedBorderColor = Primary,
                            unfocusedBorderColor = Border
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            if (filteredOptions.isEmpty()) {
                DropdownMenuItem(
                    text = { Text("Tidak ada data $label (Total: ${options.size})", color = TextSecondary) },
                    onClick = { expanded = false }
                )
            } else {
                filteredOptions.forEach { option ->
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(option.label, color = TextPrimary)
                                if (!option.subtitle.isNullOrEmpty()) {
                                    Text(option.subtitle, color = TextSecondary)
                                }
                            }
                        },
                        onClick = {
                            onOptionSelected(option)
                            expanded = false
                            searchQuery = ""
                        }
                    )
                }
            }
        }
    }
}
