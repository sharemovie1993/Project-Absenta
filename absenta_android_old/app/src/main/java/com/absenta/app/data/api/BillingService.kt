package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface BillingService {
    @GET("me/subscription")
    suspend fun getSubscriptionStatus(): Response<SubscriptionStatusResponse>

    @GET("billing/plans")
    suspend fun getPlans(): Response<PlansListResponse>

    @POST("billing/checkout")
    suspend fun checkout(@Body request: CheckoutBillingRequest): Response<BillingGenericResponse>

    @GET("billing/invoices")
    suspend fun getInvoices(
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<InvoiceListResponse>
}

data class SubscriptionStatusResponse(
    val success: Boolean,
    val data: SubscriptionStatus?
)

data class SubscriptionStatus(
    val id: String?,
    val tenant_id: String?,
    val plan_id: String?,
    val status: String?,
    val end_date: String?,
    val features: List<String>?,
    val Plan: PlanInfo?
) {
    val is_active: Boolean
        get() = status == "ACTIVE"

    val plan_name: String
        get() = Plan?.name ?: "Unknown Plan"

    val expires_at: String?
        get() = end_date

    val days_remaining: Int
        get() {
            return try {
                if (end_date == null) return 0
                val parsed = java.time.format.DateTimeFormatter.ISO_DATE_TIME.parse(end_date)
                val instant = java.time.Instant.from(parsed)
                val now = java.time.Instant.now()
                val diffSecs = instant.epochSecond - now.epochSecond
                val days = (diffSecs / (24 * 3600)).toInt()
                if (days < 0) 0 else days
            } catch (e: Exception) {
                30
            }
        }
}

data class PlanInfo(
    val id: String?,
    val name: String?
)

data class PlansListResponse(
    val success: Boolean,
    val data: PlansDataHolder?
)

data class PlansDataHolder(
    val list: List<BillingPlan>
)

data class BillingPlan(
    val id: String,
    val name: String,
    val price: String,
    val period: String,
    val max_students: Int,
    val max_teachers: Int,
    val features: List<String>
)

data class CheckoutBillingRequest(
    val plan_id: String,
    val payment_method: String = "TRIPAY"
)

data class BillingGenericResponse(
    val success: Boolean,
    val message: String,
    val data: CheckoutResult?
)

data class CheckoutResult(
    val invoice_id: String?,
    val payment_url: String?,
    val amount: String?
)

data class InvoiceListResponse(
    val success: Boolean,
    val data: InvoiceDataHolder?
)

data class InvoiceDataHolder(
    val list: List<Invoice>
)

data class Invoice(
    val id: String,
    val invoice_number: String,
    val plan_name: String,
    val amount: String,
    val status: String,
    val payment_method: String,
    val created_at: String,
    val paid_at: String?
)
