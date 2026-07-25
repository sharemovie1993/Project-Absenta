package com.absenta.app.data.api

import com.absenta.app.data.local.TokenManager
import com.absenta.app.data.model.RefreshTokenRequest
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * ApiClient — singleton factory untuk seluruh Retrofit service di aplikasi Absenta.
 *
 * Fitur:
 * - Auto-inject Bearer token & x-tenant-id pada setiap request via [AuthInterceptor]
 * - Auto-refresh token saat response 401 (Unauthorized) via [TokenAuthenticator]
 * - Dynamic base URL dari [TokenManager] (bisa dikonfigurasi per-sekolah)
 * - Logging request/response di debug mode
 * - Timeout: Connect 30s, Read 30s, Write 30s
 */
object ApiClient {

    /**
     * Membuat instance Retrofit yang sudah dikonfigurasi dengan OkHttp client.
     *
     * @param tokenManager Manager session untuk membaca token & base URL
     * @return Retrofit instance yang siap digunakan
     */
    fun create(tokenManager: TokenManager): Retrofit {
        val baseUrl = runBlocking { tokenManager.getBaseUrl() }
        val okHttpClient = buildOkHttpClient(tokenManager)

        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    /**
     * Membangun OkHttpClient dengan interceptor auth dan authenticator refresh token.
     *
     * @param tokenManager Manager session
     */
    private fun buildOkHttpClient(tokenManager: TokenManager): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(loggingInterceptor)
            .authenticator(TokenAuthenticator(tokenManager))
            .build()
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * AuthInterceptor — menambahkan Bearer token & x-tenant-id header pada setiap HTTP request.
 *
 * @param tokenManager Manager session
 */
private class AuthInterceptor(private val tokenManager: TokenManager) : okhttp3.Interceptor {
    override fun intercept(chain: okhttp3.Interceptor.Chain): Response {
        val token = runBlocking { tokenManager.getAccessToken() }
        val tenantId = runBlocking { tokenManager.getTenantId() }

        val requestBuilder = chain.request().newBuilder()

        if (!token.isNullOrEmpty()) {
            requestBuilder.addHeader("Authorization", "Bearer $token")
        }
        if (!tenantId.isNullOrEmpty()) {
            requestBuilder.addHeader("x-tenant-id", tenantId)
            requestBuilder.addHeader("X-Tenant-ID", tenantId)
        }

        val response = chain.proceed(requestBuilder.build())
        if (response.code == 401 && !chain.request().url.encodedPath.contains("auth/login")) {
            runBlocking {
                tokenManager.clearSession()
            }
        }
        return response
    }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * TokenAuthenticator — otomatis refresh access token saat response 401.
 *
 * @param tokenManager Manager session
 */
private class TokenAuthenticator(private val tokenManager: TokenManager) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.request.header("Authorization") == null) return null

        val refreshToken = runBlocking { tokenManager.getRefreshToken() }
        if (refreshToken.isNullOrEmpty()) return null

        return runBlocking {
            try {
                val baseUrl = tokenManager.getBaseUrl()
                val simpleRetrofit = Retrofit.Builder()
                    .baseUrl(baseUrl)
                    .client(OkHttpClient.Builder().build())
                    .addConverterFactory(GsonConverterFactory.create())
                    .build()

                val authService = simpleRetrofit.create(AuthService::class.java)
                val refreshResponse = authService.refreshToken(RefreshTokenRequest(refreshToken))

                if (refreshResponse.isSuccessful && refreshResponse.body()?.success == true) {
                    val body = refreshResponse.body()!!
                    val newAccessToken = body.accessToken ?: return@runBlocking null
                    val newRefreshToken = body.refreshToken

                    tokenManager.updateTokens(newAccessToken, newRefreshToken)

                    val builder = response.request.newBuilder()
                        .removeHeader("Authorization")
                        .addHeader("Authorization", "Bearer $newAccessToken")

                    val tenantId = tokenManager.getTenantId()
                    if (!tenantId.isNullOrEmpty()) {
                        builder.removeHeader("x-tenant-id")
                        builder.addHeader("x-tenant-id", tenantId)
                    }

                    builder.build()
                } else {
                    tokenManager.clearSession()
                    null
                }
            } catch (e: Exception) {
                null
            }
        }
    }
}
