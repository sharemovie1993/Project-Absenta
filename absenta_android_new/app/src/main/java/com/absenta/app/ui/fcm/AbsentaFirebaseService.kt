package com.absenta.app.ui.fcm

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.absenta.app.MainActivity
import com.absenta.app.MainApplication
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * AbsentaFirebaseService — Handler FCM Push Notification untuk aplikasi Absenta.
 *
 * Bertanggung jawab untuk:
 * 1. Menerima FCM message dari backend saat aplikasi di foreground
 * 2. Menampilkan notifikasi sistem di tray HP
 * 3. Mengatur Deep Link: notifikasi yang diklik membuka layar yang relevan
 *
 * Tipe notifikasi yang didukung:
 * - [TYPE_GATE_ALERT]: Tap gerbang anak (channel [MainApplication.CHANNEL_GATE]) → ParentDashboard
 * - [TYPE_SESSION_OPEN]: Sesi kelas dibuka → SesiKelasManager
 * - [TYPE_ANNOUNCEMENT]: Pengumuman sekolah → DynamicMenuDashboard
 *
 * Format data payload dari backend:
 * ```json
 * {
 *   "type": "GATE_ALERT",
 *   "title": "Anak Anda Tiba di Sekolah",
 *   "body": "Andi tiba pukul 07.05",
 *   "route": "absenta://app/parent_dashboard"
 * }
 * ```
 */
class AbsentaFirebaseService : FirebaseMessagingService() {

    companion object {
        /** Tipe notifikasi tap gerbang anak */
        const val TYPE_GATE_ALERT = "GATE_ALERT"
        /** Tipe notifikasi sesi kelas dibuka */
        const val TYPE_SESSION_OPEN = "SESSION_OPEN"
        /** Tipe notifikasi pengumuman sekolah */
        const val TYPE_ANNOUNCEMENT = "ANNOUNCEMENT"
    }

    /**
     * Dipanggil saat FCM token perangkat berubah.
     * Token baru perlu dikirimkan ke backend agar notifikasi tetap bisa diterima.
     *
     * @param token FCM registration token yang baru
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Kirim token ke backend via API
        // TokenManager(applicationContext).saveFcmToken(token) — perlu dijalankan dalam coroutine
    }

    /**
     * Dipanggil saat pesan FCM diterima di foreground.
     *
     * @param message [RemoteMessage] dari Firebase yang berisi data payload
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val data = message.data
        val notification = message.notification

        val title = data["title"] ?: notification?.title ?: "Absenta"
        val body = data["body"] ?: notification?.body ?: ""
        val type = data["type"] ?: TYPE_ANNOUNCEMENT
        val route = data["route"]

        showNotification(
            title = title,
            body = body,
            type = type,
            deepLinkRoute = route
        )
    }

    /**
     * Menampilkan notifikasi sistem di tray HP dengan Deep Link.
     *
     * @param title Judul notifikasi
     * @param body Isi teks notifikasi
     * @param type Tipe notifikasi untuk menentukan channel dan ikon
     * @param deepLinkRoute URI deep link yang akan dibuka saat notifikasi diklik
     */
    private fun showNotification(
        title: String,
        body: String,
        type: String,
        deepLinkRoute: String?
    ) {
        // Pilih notification channel berdasarkan tipe
        val channelId = if (type == TYPE_GATE_ALERT) {
            MainApplication.CHANNEL_GATE
        } else {
            MainApplication.CHANNEL_DEFAULT
        }

        // Buat PendingIntent untuk Deep Link saat notifikasi diklik
        val pendingIntent = if (!deepLinkRoute.isNullOrEmpty()) {
            val deepLinkIntent = Intent(Intent.ACTION_VIEW, Uri.parse(deepLinkRoute)).apply {
                setPackage(packageName)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            PendingIntent.getActivity(
                this, 0, deepLinkIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            val defaultIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            PendingIntent.getActivity(
                this, 0, defaultIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        // Ikon notifikasi (gunakan ikon launcher sebagai fallback)
        val smallIcon = android.R.drawable.ic_popup_reminder

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(smallIcon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(
                if (type == TYPE_GATE_ALERT) NotificationCompat.PRIORITY_HIGH
                else NotificationCompat.PRIORITY_DEFAULT
            )
            .setContentIntent(pendingIntent)
            .build()

        val notificationManager = NotificationManagerCompat.from(this)
        val notificationId = System.currentTimeMillis().toInt()

        try {
            notificationManager.notify(notificationId, notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS permission belum diberikan (Android 13+)
        }
    }
}
