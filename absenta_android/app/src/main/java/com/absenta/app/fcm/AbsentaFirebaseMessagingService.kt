package com.absenta.app.fcm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import com.absenta.app.MainActivity
import com.absenta.app.R
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.ProfileService
import com.absenta.app.data.api.ParentService
import com.absenta.app.data.api.ParentFcmTokenRequest
import com.absenta.app.data.api.DeviceInfoRequest
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class AbsentaFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val CHANNEL_ID = "absenta_notifications"
        private const val CHANNEL_NAME = "Absenta Notifications"
        private const val TAG = "AbsentaDebug"

        /**
         * Daftarkan FCM token ke backend Absenta.
         * Dipanggil saat app pertama kali login atau token diperbarui.
         */
        fun registerFcmToken(context: Context) {
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (!task.isSuccessful) {
                    Log.w(TAG, "FCM token fetch failed", task.exception)
                    return@addOnCompleteListener
                }
                val token = task.result
                Log.d(TAG, "FCM Token obtained: ${token.take(20)}...")

                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val sessionManager = com.absenta.app.data.local.SessionManager(context)
                        val role = sessionManager.userRoleFlow.first()
                        val jwtToken = sessionManager.jwtTokenFlow.first()
                        if (jwtToken.isNullOrEmpty()) {
                            Log.d(TAG, "User not logged in, skipping FCM registration")
                            return@launch
                        }

                        if (role == "PARENT" || role == "WALI_MURID" || role == "ORTU") {
                            val parentService = ApiClient.getClient(context).create(ParentService::class.java)
                            val parentMeResponse = parentService.getParentDashboard()
                            if (parentMeResponse.isSuccessful && parentMeResponse.body()?.success == true) {
                                val parentId = parentMeResponse.body()?.data?.orang_tua?.id
                                if (parentId != null) {
                                    val model = android.os.Build.MODEL
                                    val osVersion = android.os.Build.VERSION.RELEASE
                                    val deviceReq = DeviceInfoRequest(model = model, osVersion = osVersion)
                                    val regResponse = parentService.registerParentFcmToken(
                                        ParentFcmTokenRequest(
                                            orangTuaId = parentId,
                                            fcmToken = token,
                                            platform = "android",
                                            deviceInfo = deviceReq
                                        )
                                    )
                                    if (regResponse.isSuccessful && regResponse.body()?.success == true) {
                                        Log.d(TAG, "Parent FCM token registered to backend successfully")
                                    } else {
                                        Log.w(TAG, "Failed to register Parent FCM token: ${regResponse.message()}")
                                    }
                                } else {
                                    Log.w(TAG, "Parent ID is null in getParentDashboard response")
                                }
                            } else {
                                Log.w(TAG, "Failed to fetch Parent Profile for FCM: ${parentMeResponse.code()}")
                            }
                        } else {
                            Log.d(TAG, "User role is $role, FCM registration skipped (Parent only)")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to register FCM token to backend", e)
                    }
                }
            }
        }
    }

    /**
     * Dipanggil saat token FCM diperbarui oleh Google.
     * Kirim token baru ke backend Absenta.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM New token generated: ${token.take(20)}...")
        registerFcmToken(applicationContext)
    }

    /**
     * Dipanggil saat ada pesan FCM masuk (foreground maupun background data message).
     */
    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "FCM Message received from: ${remoteMessage.from}")
        Log.d(TAG, "FCM Message data: ${remoteMessage.data}")

        val title = remoteMessage.notification?.title
            ?: remoteMessage.data["title"]
            ?: "Absenta"
        val body = remoteMessage.notification?.body
            ?: remoteMessage.data["body"]
            ?: "Ada notifikasi baru untuk Anda."
        val type = remoteMessage.data["type"] ?: "general"

        Log.d(TAG, "FCM Notification: title=$title, type=$type")

        showNotification(title, body, type)
    }

    /**
     * Tampilkan notifikasi sistem Android dari pesan FCM.
     */
    private fun showNotification(title: String, body: String, type: String) {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Buat channel jika belum ada (Android 8.0+)
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Notifikasi dari aplikasi Absenta"
            enableVibration(true)
        }
        notificationManager.createNotificationChannel(channel)

        // Intent untuk buka app saat notifikasi di-tap
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("notification_type", type)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        // Gunakan icon launcher app
        val iconResId = android.R.drawable.ic_menu_info_details

        val notifId = System.currentTimeMillis().toInt()
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(iconResId)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(notifId, notification)
        Log.d(TAG, "FCM Notification displayed: id=$notifId")
    }
}
