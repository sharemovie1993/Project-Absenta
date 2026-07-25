package com.absenta.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

/**
 * MainApplication — Application class utama Absenta.
 *
 * Dieksekusi satu kali saat aplikasi pertama kali diluncurkan.
 * Bertanggung jawab untuk inisialisasi:
 * - Firebase (sudah otomatis via `google-services.json`)
 * - NotificationChannel untuk FCM Push Notification (wajib Android 8+)
 */
class MainApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    /**
     * Membuat Notification Channel untuk FCM Push Notification.
     *
     * Di Android 8.0 (API 26) ke atas, setiap notifikasi harus melalui
     * channel yang telah terdaftar. Channel yang dibuat:
     * - [CHANNEL_DEFAULT]: Notifikasi umum (pengumuman, sesi)
     * - [CHANNEL_GATE]: Notifikasi tap gerbang anak (khusus orang tua)
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // Channel default untuk pengumuman & sesi kelas
            val defaultChannel = NotificationChannel(
                CHANNEL_DEFAULT,
                "Notifikasi Absenta",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Pengumuman sekolah dan notifikasi sesi kelas"
            }

            // Channel khusus tap gerbang (prioritas tinggi untuk orang tua)
            val gateChannel = NotificationChannel(
                CHANNEL_GATE,
                "Status Gerbang Anak",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifikasi real-time saat anak tap masuk/pulang gerbang"
                enableVibration(true)
                enableLights(true)
            }

            notificationManager.createNotificationChannels(
                listOf(defaultChannel, gateChannel)
            )
        }
    }

    companion object {
        /** ID channel notifikasi default */
        const val CHANNEL_DEFAULT = "absenta_default"
        /** ID channel notifikasi tap gerbang anak */
        const val CHANNEL_GATE = "absenta_gate"
    }
}
