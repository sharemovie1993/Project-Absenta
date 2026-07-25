package com.absenta.app

import android.app.Application

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Inisialisasi library global jika ada (seperti Firebase, Crashlytics, dll.)
    }
}
