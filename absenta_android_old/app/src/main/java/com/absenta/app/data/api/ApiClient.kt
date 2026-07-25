package com.absenta.app.data.api

import android.content.Context
import com.absenta.app.data.local.SessionManager
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val DEFAULT_FALLBACK_URL = "http://10.0.2.2:3001/api/"

    private var retrofit: Retrofit? = null
    private var activeBaseUrl: String? = null

    fun getClient(context: Context): Retrofit {
        val sessionManager = SessionManager(context)
        
        // Membaca alamat base URL yang tersimpan secara sinkron
        val savedUrl = runBlocking { sessionManager.baseUrlFlow.first() }
        val finalUrl = if (!savedUrl.isNullOrEmpty()) {
            var url = savedUrl.trim()
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                url = "http://$url"
            }
            if (url.endsWith("/")) url else "$url/"
        } else {
            DEFAULT_FALLBACK_URL
        }

        // Rebuild Retrofit jika instansi belum ada atau URL diubah secara dinamis oleh user
        if (retrofit == null || activeBaseUrl != finalUrl) {
            activeBaseUrl = finalUrl

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val okHttpClient = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .addInterceptor(loggingInterceptor)
                .addInterceptor { chain ->
                    val originalRequest = chain.request()
                    val requestBuilder = originalRequest.newBuilder()

                    val token = runBlocking { sessionManager.jwtTokenFlow.first() }
                    val tenantSub = runBlocking { sessionManager.tenantSubFlow.first() }

                    if (!token.isNullOrEmpty()) {
                        requestBuilder.addHeader("Authorization", "Bearer $token")
                    }

                    if (!tenantSub.isNullOrEmpty()) {
                        requestBuilder.addHeader("X-Tenant-Sub", tenantSub)
                    }

                    chain.proceed(requestBuilder.build())
                }
                .build()

            retrofit = Retrofit.Builder()
                .baseUrl(finalUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        
        return retrofit!!
    }
}
