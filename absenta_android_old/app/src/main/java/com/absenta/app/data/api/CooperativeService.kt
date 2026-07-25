package com.absenta.app.data.api

import retrofit2.Response
import retrofit2.http.*

interface CooperativeService {
    // Toko POS
    @GET("cooperative/toko")
    suspend fun getProducts(): Response<List<CoopProduct>>

    @POST("cooperative/toko/checkout")
    suspend fun checkout(@Body request: CheckoutRequest): Response<GenericCoopResponse>

    // Savings
    @GET("cooperative/savings")
    suspend fun getSavings(@Query("personal") personal: Boolean? = null): Response<List<CoopSaving>>

    @GET("cooperative/savings/{id}")
    suspend fun getSavingDetail(@Path("id") id: String): Response<CoopSavingDetail>

    @GET("cooperative/savings/transactions")
    suspend fun getSavingsTransactions(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<List<CoopTransaction>>

    // Loans
    @GET("cooperative/loans")
    suspend fun getLoans(): Response<List<CoopLoan>>

    @GET("cooperative/loans/me")
    suspend fun getMyLoans(): Response<List<CoopLoan>>

    @POST("cooperative/loans")
    suspend fun applyLoan(@Body request: LoanRequest): Response<GenericCoopResponse>

    // Member Checks & Listings
    @GET("cooperative/members/me")
    suspend fun getMemberMe(): Response<CoopMemberMeResponse>

    @GET("cooperative/members")
    suspend fun getMembers(): Response<List<CoopMember>>

    // Quick Savings Transaction (Operator)
    @POST("cooperative/savings/transaction")
    suspend fun postSavingsTransaction(@Body request: SavingsTransactionRequest): Response<GenericCoopResponse>

    // PPOB
    @GET("cooperative/ppob")
    suspend fun getPpobProducts(): Response<PpobProductsResponse>

    @POST("cooperative/ppob/transaction")
    suspend fun postPpobTransaction(@Body request: PpobTransactionRequest): Response<GenericCoopResponse>

    // Detailed Loan with installments
    @GET("cooperative/loans/{id}")
    suspend fun getLoanDetail(@Path("id") id: String): Response<CoopLoanDetailResponse>

    @PUT("cooperative/loans/{id}/status")
    suspend fun updateLoanStatus(
        @Path("id") id: String,
        @Body request: UpdateLoanStatusRequest
    ): Response<GenericCoopResponse>

    @POST("cooperative/loans/pay-installment")
    suspend fun payLoanInstallment(
        @Body request: PayInstallmentRequest
    ): Response<GenericCoopResponse>

    // Settings & Categories
    @GET("cooperative/settings")
    suspend fun getSettings(): Response<CoopSettingsResponse>

    @PUT("cooperative/settings")
    suspend fun updateSettings(@Body request: CoopSettingsUpdateRequest): Response<GenericCoopResponse>

    @GET("cooperative/saving-categories/all")
    suspend fun getSavingCategoriesAll(): Response<CoopSavingCategoryAllResponse>

    @POST("cooperative/saving-categories")
    suspend fun createSavingCategory(@Body request: CoopSavingCategoryRequest): Response<GenericCoopResponse>

    @PUT("cooperative/saving-categories/{id}")
    suspend fun updateSavingCategory(@Path("id") id: String, @Body request: CoopSavingCategoryRequest): Response<GenericCoopResponse>

    @PATCH("cooperative/saving-categories/{id}/toggle")
    suspend fun toggleSavingCategory(@Path("id") id: String): Response<GenericCoopResponse>

    @DELETE("cooperative/saving-categories/{id}")
    suspend fun deleteSavingCategory(@Path("id") id: String): Response<GenericCoopResponse>

    // Dashboard Stats
    @GET("cooperative/dashboard/stats")
    suspend fun getDashboardStats(): Response<CoopDashboardStatsResponse>

    // Announcements
    @GET("cooperative/announcements")
    suspend fun getAnnouncements(): Response<CoopAnnouncementResponse>

    @POST("cooperative/announcements")
    suspend fun createAnnouncement(@Body request: CoopAnnouncementRequest): Response<GenericCoopResponse>

    @DELETE("cooperative/announcements/{id}")
    suspend fun deleteAnnouncement(@Path("id") id: String): Response<GenericCoopResponse>

    // Members Complete CRUD
    @GET("cooperative/members/{id}")
    suspend fun getMemberDetail(@Path("id") id: String): Response<CoopMemberDetailResponse>

    @GET("cooperative/members/next-number")
    suspend fun getNextMemberNumber(): Response<CoopNextNumberResponse>

    @POST("cooperative/members")
    suspend fun createMember(@Body request: CoopMemberCreateRequest): Response<GenericCoopResponse>

    @PUT("cooperative/members/{id}")
    suspend fun updateMember(@Path("id") id: String, @Body request: CoopMemberCreateRequest): Response<GenericCoopResponse>

    @POST("cooperative/members/{id}/terminate")
    suspend fun terminateMember(@Path("id") id: String): Response<GenericCoopResponse>

    // Toko POS Edit & Delete
    @POST("cooperative/toko")
    suspend fun createProduct(@Body request: CoopProductRequest): Response<GenericCoopResponse>

    @PUT("cooperative/toko/{id}")
    suspend fun updateProduct(@Path("id") id: String, @Body request: CoopProductRequest): Response<GenericCoopResponse>

    @DELETE("cooperative/toko/{id}")
    suspend fun deleteProduct(@Path("id") id: String): Response<GenericCoopResponse>

    // SHU Endpoints
    @GET("cooperative/shu/periods")
    suspend fun getShuPeriods(): Response<CoopShuPeriodResponse>

    @GET("cooperative/shu/config")
    suspend fun getShuConfig(): Response<CoopShuConfigResponse>

    @PUT("cooperative/shu/config")
    suspend fun updateShuConfig(@Body request: CoopShuConfig): Response<GenericCoopResponse>

    @GET("cooperative/shu/my-history")
    suspend fun getShuMyHistory(): Response<CoopShuHistoryResponse>

    @GET("cooperative/shu/periods/{id}")
    suspend fun getShuPeriodDetail(@Path("id") id: String): Response<CoopShuPeriodDetailResponse>

    @POST("cooperative/shu/periods")
    suspend fun createShuPeriod(@Body request: CoopShuPeriodCreateRequest): Response<GenericCoopResponse>

    @POST("cooperative/shu/periods/{id}/calculate")
    suspend fun calculateShu(@Path("id") id: String): Response<GenericCoopResponse>

    @POST("cooperative/shu/periods/{id}/sync")
    suspend fun syncShuFinancials(@Path("id") id: String): Response<GenericCoopResponse>

    @POST("cooperative/shu/periods/{id}/approve")
    suspend fun approveShu(@Path("id") id: String): Response<GenericCoopResponse>

    @POST("cooperative/shu/periods/{id}/distribute")
    suspend fun distributeShu(@Path("id") id: String): Response<GenericCoopResponse>

    @DELETE("cooperative/shu/periods/{id}")
    suspend fun deleteShuPeriod(@Path("id") id: String): Response<GenericCoopResponse>

    @GET("cooperative/reports/laba-rugi")
    suspend fun getLabaRugiData(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): Response<LabaRugiSummaryResponse>

    // Voucher Endpoints
    @GET("cooperative/vouchers")
    suspend fun getVouchers(): Response<CoopVoucherListResponse>

    @POST("cooperative/vouchers")
    suspend fun createVoucher(@Body request: CoopVoucherCreateRequest): Response<GenericCoopResponse>

    @DELETE("cooperative/vouchers/{id}")
    suspend fun deleteVoucher(@Path("id") id: String): Response<GenericCoopResponse>

    // Ticket Endpoints
    @GET("cooperative/tickets")
    suspend fun getTickets(): Response<CoopTicketListResponse>

    @POST("cooperative/tickets")
    suspend fun createTicket(@Body request: CoopTicketCreateRequest): Response<GenericCoopResponse>

    @GET("cooperative/tickets/{id}")
    suspend fun getTicketDetail(@Path("id") id: String): Response<CoopTicketDetailResponse>

    @POST("cooperative/tickets/{id}/reply")
    suspend fun replyTicket(@Path("id") id: String, @Body request: CoopTicketReplyRequest): Response<GenericCoopResponse>

    @PATCH("cooperative/tickets/{id}/status")
    suspend fun updateTicketStatus(@Path("id") id: String, @Body request: CoopTicketStatusRequest): Response<GenericCoopResponse>

    // Laporan Keuangan / Akuntansi Endpoints
    @GET("cooperative/reports/journals")
    suspend fun getJournals(): Response<List<CoopJournalEntry>>

    @GET("cooperative/reports/balance-sheet")
    suspend fun getBalanceSheet(): Response<List<BalanceSheetItem>>

    @GET("cooperative/reports/payroll-deductions")
    suspend fun getPayrollDeductions(
        @Query("month") month: Int,
        @Query("year") year: Int
    ): Response<PayrollDeductionsResponse>

    @POST("cooperative/reports/payroll-deductions/post")
    suspend fun postPayrollDeductions(@Body request: PayrollPostCancelRequest): Response<GenericCoopResponse>

    @POST("cooperative/reports/payroll-deductions/cancel")
    suspend fun cancelPayrollDeductions(@Body request: PayrollPostCancelRequest): Response<GenericCoopResponse>

    // Toko POS Stock-In
    @POST("cooperative/toko/stock-in")
    suspend fun processStockIn(@Body request: CoopStockInRequest): Response<CoopStockIn>

    @GET("cooperative/toko/stock-in")
    suspend fun getStockInHistory(
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("supplier") supplier: String? = null
    ): Response<List<CoopStockIn>>

    @GET("cooperative/toko/stock-in/{id}")
    suspend fun getStockInDetail(@Path("id") id: String): Response<CoopStockIn>
}

data class CoopProduct(
    val id: String,
    val code: String,
    val name: String,
    val price: String?,
    val costPrice: String? = null,
    val stock: Int,
    val category: String? = null
)

data class CoopProductRequest(
    val code: String,
    val name: String,
    val price: Double,
    val costPrice: Double,
    val stock: Int,
    val category: String?
)

data class CoopShuConfig(
    val porsiJasaModal: Double,
    val porsiJasaTransaksi: Double,
    val porsiCadangan: Double,
    val porsiPengurus: Double,
    val porsiSosial: Double,
    val porsiPembangunan: Double
)

data class CoopShuConfigResponse(
    val success: Boolean,
    val data: CoopShuConfig?
)

data class CoopShuPeriod(
    val id: String,
    val year: Int,
    val startDate: String,
    val endDate: String,
    val totalRevenue: String,
    val totalExpense: String,
    val totalShu: String,
    val status: String,
    val approvedBy: String? = null,
    val approvedAt: String? = null,
    val notes: String? = null
)

data class CoopShuPeriodResponse(
    val success: Boolean,
    val data: List<CoopShuPeriod>?
)

data class CoopShuPeriodDetailResponse(
    val success: Boolean,
    val data: CoopShuPeriodDetail?
)

data class CoopShuPeriodDetail(
    val period: CoopShuPeriod,
    val allocations: List<CoopShuAllocation>?
)

data class CoopShuAllocation(
    val id: String,
    val memberId: String,
    val totalSimpananModal: String,
    val totalTransaksi: String,
    val jasaModal: String,
    val jasaTransaksi: String,
    val totalShu: String,
    val status: String,
    val Member: CoopShuMember
)

data class CoopShuMember(
    val name: String,
    val memberNo: String
)

data class CoopShuHistoryResponse(
    val success: Boolean,
    val data: List<CoopShuHistoryItem>?
)

data class CoopShuHistoryItem(
    val id: String,
    val totalSimpananModal: String,
    val totalTransaksi: String,
    val jasaModal: String,
    val jasaTransaksi: String,
    val totalShu: String,
    val status: String,
    val Period: CoopShuPeriod
)

data class CoopShuPeriodCreateRequest(
    val year: Int,
    val startDate: String,
    val endDate: String,
    val totalRevenue: Double,
    val totalExpense: Double
)

data class LabaRugiSummaryResponse(
    val success: Boolean,
    val data: LabaRugiData?
)

data class LabaRugiData(
    val summary: LabaRugiSummary?
)

data class LabaRugiSummary(
    val totalRevenue: Double,
    val totalExpense: Double
)

data class CheckoutRequest(
    val items: List<CartItemRequest>,
    val memberId: String? = null // POS checkout can be done on behalf of a scanned member
)

data class CartItemRequest(
    val productId: String,
    val quantity: Int
)

data class GenericCoopResponse(
    val success: Boolean,
    val message: String
)

data class CoopSaving(
    val id: String,
    val member_id: String,
    val category_id: String,
    val balance: String?,
    val created_at: String,
    val Category: SavingCategory?
)

data class SavingCategory(
    val id: String,
    val name: String
)

data class CoopSavingDetail(
    val id: String,
    val member_id: String,
    val balance: String?,
    val transactions: List<CoopTransaction>?
)

data class CoopTransaction(
    val id: String,
    val amount: String?,
    val type: String, // "DEPOSIT" or "WITHDRAWAL"
    val reference_no: String?,
    val created_at: String,
    val description: String? = null
)

data class CoopLoan(
    val id: String,
    val amount: String?,
    val interest_rate: String?,
    val tenure_months: Int,
    val monthly_installment: String?,
    val status: String, // "PENDING", "APPROVED", "REJECTED"
    val created_at: String
)

data class LoanRequest(
    val amount: Double,
    val tenure_months: Int,
    val note: String? = null
)

data class UpdateLoanStatusRequest(
    val status: String,
    val interestRate: Double? = null
)

data class PayInstallmentRequest(
    val installmentId: String
)

// NEW Data Models
data class CoopMemberMeResponse(
    val success: Boolean,
    val data: CoopMember?
)

data class CoopMember(
    val id: String,
    val memberNo: String,
    val type: String, // "STUDENT", "TEACHER", "GENERAL"
    val status: String, // "ACTIVE", "INACTIVE"
    val name: String,
    val address: String?,
    val phone: String?,
    val email: String?
)

data class SavingsTransactionRequest(
    val savingId: String,
    val amount: Double,
    val type: String, // "DEPOSIT" or "WITHDRAWAL"
    val description: String? = null
)

data class PpobProduct(
    val id: String,
    val code: String,
    val name: String,
    val provider: String,
    val type: String, // "PULSA", "PLN", "DATA", "OTHER"
    val price: Double
)

data class PpobProductsResponse(
    val success: Boolean,
    val data: List<PpobProduct>?
)

data class PpobTransactionRequest(
    val productId: String,
    val customerNo: String,
    val amount: Double
)

data class CoopLoanDetailResponse(
    val success: Boolean,
    val data: CoopLoanDetail?
)

data class CoopLoanDetail(
    val id: String,
    val amount: String?,
    val interest_rate: String?,
    val tenure_months: Int,
    val monthly_installment: String?,
    val status: String,
    val created_at: String,
    val installments: List<LoanInstallment>?
)

data class LoanInstallment(
    val id: String,
    val amount: String?,
    val dueDate: String,
    val paidDate: String?,
    val status: String // "PAID", "UNPAID"
)

data class CoopSettingsResponse(
    val success: Boolean,
    val data: CoopSettingsData?
)

data class CoopSettingsData(
    val cooperative_name: String,
    val cooperative_legal_no: String,
    val cooperative_address: String,
    val cooperative_phone: String,
    val cooperative_email: String,
    val cooperative_website: String,
    val cooperative_logo_url: String,
    val cooperative_default_interest_rate: String,
    val signatures: CoopSignatures
)

data class CoopSignatures(
    val bendahara: String,
    val ketua: String,
    val kepsek: String
)

data class CoopSettingsUpdateRequest(
    val cooperative_name: String,
    val cooperative_legal_no: String,
    val cooperative_address: String,
    val cooperative_phone: String,
    val cooperative_email: String,
    val cooperative_website: String,
    val cooperative_logo_url: String,
    val cooperative_default_interest_rate: String
)

data class CoopSavingCategoryAllResponse(
    val success: Boolean,
    val data: List<CoopSavingCategoryAll>?
)

data class CoopSavingCategoryAll(
    val id: String,
    val code: String,
    val name: String,
    val description: String?,
    val color: String?,
    val order: Int?,
    val isMandatory: Boolean,
    val isWithdrawable: Boolean,
    val withdrawRule: String?,
    val defaultAmount: Double?,
    val isIncludedInShu: Boolean,
    val accountCode: String?,
    val isActive: Boolean,
    val _count: CoopSavingCategoryCount?
)

data class CoopSavingCategoryCount(
    val Savings: Int
)

data class CoopSavingCategoryRequest(
    val code: String,
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val order: Int? = null,
    val isMandatory: Boolean = false,
    val isWithdrawable: Boolean = true,
    val withdrawRule: String = "ANYTIME",
    val defaultAmount: Double? = null,
    val isIncludedInShu: Boolean = false,
    val accountCode: String = "2010"
)

// NEW Phase 2.1 Models
data class CoopDashboardStatsResponse(
    val success: Boolean,
    val data: CoopDashboardStats?
)

data class CoopDashboardStats(
    val totalMembers: Int,
    val totalSavings: Double,
    val totalLoans: Double,
    val dueInstallments: Int
)

data class CoopAnnouncementResponse(
    val success: Boolean,
    val data: List<CoopAnnouncement>?
)

data class CoopAnnouncement(
    val id: String,
    val title: String,
    val content: String,
    val createdAt: String
)

data class CoopAnnouncementRequest(
    val title: String,
    val content: String
)

data class CoopMemberDetailResponse(
    val success: Boolean,
    val data: CoopMemberDetail?
)

data class CoopMemberDetail(
    val id: String,
    val memberNo: String,
    val type: String, // "STUDENT" | "TEACHER" | "GENERAL"
    val status: String, // "ACTIVE" | "INACTIVE"
    val name: String,
    val address: String?,
    val phone: String?,
    val email: String?,
    val savings_balance: Double?,
    val created_at: String
)

data class CoopNextNumberResponse(
    val success: Boolean,
    val data: String?
)

data class CoopMemberCreateRequest(
    val memberNo: String,
    val type: String, // "STUDENT" | "TEACHER" | "GENERAL"
    val siswaId: String?,
    val guruId: String?,
    val userId: String?,
    val isExternal: Boolean,
    val name: String?,
    val address: String?,
    val phone: String?,
    val email: String?,
    val status: String = "ACTIVE"
)

// Voucher Models
data class CoopVoucher(
    val id: String,
    val code: String,
    val description: String,
    val discount: String,
    val validUntil: String?
)

data class CoopVoucherListResponse(
    val success: Boolean,
    val data: List<CoopVoucher>?
)

data class CoopVoucherCreateRequest(
    val code: String,
    val description: String,
    val discount: Double,
    val validUntil: String?
)

// Ticket Models
data class CoopTicket(
    val id: String,
    val subject: String,
    val status: String,
    val priority: String,
    val member: CoopTicketMember? = null,
    val createdAt: String,
    val updatedAt: String,
    val _count: CoopTicketCount? = null
)

data class CoopTicketMember(
    val name: String
)

data class CoopTicketCount(
    val messages: Int
)

data class CoopTicketListResponse(
    val success: Boolean,
    val data: List<CoopTicket>?
)

data class CoopTicketDetailResponse(
    val success: Boolean,
    val data: CoopTicketDetail?
)

data class CoopTicketDetail(
    val id: String,
    val subject: String,
    val status: String,
    val priority: String,
    val member: CoopTicketMember?,
    val messages: List<CoopTicketMessage>?,
    val createdAt: String
)

data class CoopTicketMessage(
    val id: String,
    val content: String,
    val isStaff: Boolean,
    val createdAt: String
)

data class CoopTicketCreateRequest(
    val subject: String,
    val priority: String,
    val message: String
)

data class CoopTicketReplyRequest(
    val content: String,
    val isStaff: Boolean = true
)

data class CoopTicketStatusRequest(
    val status: String
)

// Data models for Accounting
data class CoopJournalEntry(
    val id: String,
    val date: String,
    val description: String,
    val reference: String,
    val items: List<CoopJournalEntryItem>
)

data class CoopJournalEntryItem(
    val id: String,
    val type: String, // "DEBIT" or "CREDIT"
    val amount: String,
    val account: CoopJournalEntryAccount
)

data class CoopJournalEntryAccount(
    val code: String,
    val name: String
)

data class BalanceSheetItem(
    val code: String,
    val name: String,
    val type: String,
    val balance: Double
)

data class PayrollDeductionsResponse(
    val success: Boolean,
    val data: List<PayrollItem>?,
    val savingCategories: List<PayrollSavingCategory>?,
    val hasLoans: Boolean,
    val isPosted: Boolean
)

data class PayrollSavingCategory(
    val code: String,
    val name: String
)

data class PayrollItem(
    val no: Int,
    val memberNo: String,
    val name: String,
    val savings: Map<String, Double>,
    val loan: PayrollLoanItem
)

data class PayrollLoanItem(
    val installmentNo: Int?,
    val pokok: Double,
    val jasa: Double
)

data class PayrollPostCancelRequest(
    val month: Int,
    val year: Int
)

// Toko POS Stock-In Data Models
data class CoopStockIn(
    val id: String,
    val tenantId: String,
    val date: String,
    val supplier: String?,
    val notes: String?,
    val paymentMethod: String,
    val operatorId: String?,
    val items: List<CoopStockInItem>? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

data class CoopStockInItem(
    val id: String,
    val stockInId: String,
    val productId: String,
    val quantity: Int,
    val costPrice: String,
    val Product: CoopProduct? = null
)

data class CoopStockInRequest(
    val supplier: String?,
    val notes: String?,
    val paymentMethod: String, // "CASH" | "CREDIT"
    val items: List<CoopStockInItemRequest>
)

data class CoopStockInItemRequest(
    val productId: String,
    val quantity: Int,
    val costPrice: Double
)

