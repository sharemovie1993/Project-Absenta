# Fase 3.1: Konfigurasi Fondasi Gradle & AndroidManifest

## ⚙️ Dependensi Utama Proyek (`app/build.gradle.kts`)

- **Min SDK**: 26 (Android 8.0) | **Target SDK**: 35 (Android 15)
- **Compose BOM**: `2024.02.00` (Material 3 Native)
- **CameraX**: `1.3.1` (Core, Camera2, Lifecycle, View)
- **ML Kit**: `17.3.0` (`barcode-scanning` untuk QR Scanner)
- **Networking**: `Retrofit 2.9.0` + `OkHttp 4.12.0` + Gson Converter
- **Storage**: `DataStore Preferences 1.0.0`
- **Firebase**: `firebase-bom:33.1.0` + `firebase-messaging-ktx`
- **Image Loading**: `Coil Compose 2.6.0`
- **Permissions**: `Accompanist Permissions 0.34.0`

### 💡 Solusi Android 15 (16 KB Page Alignment)
```kotlin
packaging {
    jniLibs {
        useLegacyPackaging = false
    }
}
```

---

## 📜 AndroidManifest & Permissions

Izin yang dideklarasikan di `AndroidManifest.xml`:
- `android.permission.CAMERA`: Untuk scanner gerbang & foto profil
- `android.permission.INTERNET`: Komunikasi API backend
- `android.permission.VIBRATE`: Getaran haptic saat scan QR sukses
- `android.permission.NFC`: Sensor RFID bawaan HP
- `android.permission.POST_NOTIFICATIONS`: Push notification Android 13+
- `android.permission.READ_MEDIA_IMAGES`: Galeri picker
