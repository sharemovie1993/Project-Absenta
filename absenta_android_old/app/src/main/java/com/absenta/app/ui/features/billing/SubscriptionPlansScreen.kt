package com.absenta.app.ui.features.billing

import android.util.Log
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.absenta.app.data.api.ApiClient
import com.absenta.app.data.api.BillingPlan
import com.absenta.app.data.api.BillingService
import com.absenta.app.data.api.CheckoutBillingRequest
import com.absenta.app.data.api.SubscriptionStatus
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubscriptionPlansScreen(onNavigateBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var subStatus by remember { mutableStateOf<SubscriptionStatus?>(null) }
    var plans by remember { mutableStateOf<List<BillingPlan>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    var isCheckingOut by remember { mutableStateOf(false) }
    var checkoutMessage by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        Log.d("AbsentaDebug", "SubscriptionPlansScreen loaded")
        isLoading = true
        try {
            val service = ApiClient.getClient(context).create(BillingService::class.java)
            val statusResp = service.getSubscriptionStatus()
            val plansResp = service.getPlans()
            if (statusResp.isSuccessful) subStatus = statusResp.body()?.data
            if (plansResp.isSuccessful) plans = plansResp.body()?.data?.list ?: emptyList()
            Log.d("AbsentaDebug", "SubscriptionPlansScreen success: plans=${plans.size}, active=${subStatus?.is_active}")
        } catch (e: Exception) {
            Log.e("AbsentaDebug", "SubscriptionPlansScreen error", e)
        } finally {
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Paket Langganan Sekolah", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Kembali", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1E3C72),
                    titleContentColor = Color.White
                )
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color(0xFF1E3C72))
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .background(Color(0xFFF8FAFC)),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                // Active Subscription Status Card
                subStatus?.let { status ->
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (status.is_active) Color(0xFF1E3C72) else Color(0xFF7F1D1D)
                            ),
                            elevation = CardDefaults.cardElevation(3.dp)
                        ) {
                            Column(modifier = Modifier.padding(20.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(
                                            if (status.is_active) "Langganan Aktif" else "Langganan Tidak Aktif",
                                            fontSize = 12.sp,
                                            color = Color.White.copy(alpha = 0.8f)
                                        )
                                        Text(
                                            status.plan_name,
                                            fontSize = 22.sp,
                                            fontWeight = FontWeight.Black,
                                            color = Color.White,
                                            modifier = Modifier.padding(top = 2.dp)
                                        )
                                    }
                                    Box(
                                        modifier = Modifier
                                            .background(Color.White.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                                            .padding(horizontal = 12.dp, vertical = 8.dp)
                                    ) {
                                        Text(
                                            "${status.days_remaining} Hari",
                                            fontWeight = FontWeight.Black,
                                            color = Color.White,
                                            fontSize = 14.sp
                                        )
                                    }
                                }
                                if (status.is_active && !status.expires_at.isNullOrEmpty()) {
                                    Text(
                                        "Aktif hingga: ${status.expires_at}",
                                        fontSize = 12.sp,
                                        color = Color.White.copy(alpha = 0.7f),
                                        modifier = Modifier.padding(top = 8.dp)
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    Text("Pilih Paket Langganan", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E293B))
                }

                if (checkoutMessage != null) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = Color(0xFFD1FAE5)),
                            shape = RoundedCornerShape(10.dp)
                        ) {
                            Text(
                                checkoutMessage!!,
                                modifier = Modifier.padding(14.dp),
                                fontSize = 13.sp,
                                color = Color(0xFF065F46),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                items(plans) { plan ->
                    BillingPlanCard(
                        plan = plan,
                        isCurrentPlan = plan.name == subStatus?.plan_name,
                        isCheckingOut = isCheckingOut,
                        onCheckout = {
                            scope.launch {
                                isCheckingOut = true
                                Log.d("AbsentaDebug", "Initiating checkout for plan: ${plan.name}")
                                try {
                                    val service = ApiClient.getClient(context).create(BillingService::class.java)
                                    val resp = service.checkout(CheckoutBillingRequest(plan_id = plan.id))
                                    if (resp.isSuccessful && resp.body()?.success == true) {
                                        checkoutMessage = "Checkout berhasil! Invoice: ${resp.body()?.data?.invoice_id ?: "-"}"
                                        Log.d("AbsentaDebug", "Checkout success: ${resp.body()?.data?.invoice_id}")
                                    } else {
                                        checkoutMessage = "Gagal melakukan checkout: " + (resp.body()?.message ?: resp.message())
                                        Log.w("AbsentaDebug", "Checkout response: ${resp.code()}")
                                    }
                                } catch (e: Exception) {
                                    checkoutMessage = "Kesalahan koneksi saat checkout."
                                    Log.e("AbsentaDebug", "Checkout error", e)
                                } finally {
                                    isCheckingOut = false
                                }
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun BillingPlanCard(
    plan: BillingPlan,
    isCurrentPlan: Boolean,
    isCheckingOut: Boolean,
    onCheckout: () -> Unit
) {
    val isPopular = plan.name.contains("Pro", ignoreCase = true) || plan.name.contains("Premium", ignoreCase = true)
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = if (isCurrentPlan) Color(0xFFEFF6FF) else Color.White),
        elevation = CardDefaults.cardElevation(if (isCurrentPlan) 3.dp else 1.dp),
        border = if (isCurrentPlan) CardDefaults.outlinedCardBorder() else null
    ) {
        Column(modifier = Modifier.padding(18.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(plan.name, fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color(0xFF0F172A))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    if (isPopular) {
                        Text(
                            "POPULER",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF7C3AED),
                            modifier = Modifier.background(Color(0xFFEDE9FE), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                    if (isCurrentPlan) {
                        Text(
                            "AKTIF",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            color = Color(0xFF065F46),
                            modifier = Modifier.background(Color(0xFFD1FAE5), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            Row(
                verticalAlignment = Alignment.Bottom,
                modifier = Modifier.padding(top = 8.dp)
            ) {
                Text(
                    "Rp ${String.format("%,.0f", plan.price.toDoubleOrNull() ?: 0.0)}",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    color = Color(0xFF1E3C72)
                )
                Text(" / ${plan.period}", fontSize = 13.sp, color = Color(0xFF64748B), modifier = Modifier.padding(bottom = 2.dp))
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                Text("👥 ${plan.max_students} Siswa", fontSize = 12.sp, color = Color(0xFF475569))
                Text("🧑‍🏫 ${plan.max_teachers} Guru", fontSize = 12.sp, color = Color(0xFF475569))
            }

            Spacer(modifier = Modifier.height(10.dp))

            plan.features.take(4).forEach { feature ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(vertical = 2.dp)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(15.dp), tint = Color(0xFF10B981))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(feature, fontSize = 12.sp, color = Color(0xFF334155))
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            Button(
                onClick = onCheckout,
                enabled = !isCheckingOut && !isCurrentPlan,
                modifier = Modifier.fillMaxWidth().height(44.dp),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isCurrentPlan) Color(0xFF94A3B8) else Color(0xFF1E3C72)
                )
            ) {
                if (isCheckingOut) CircularProgressIndicator(modifier = Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                else Text(
                    if (isCurrentPlan) "Paket Aktif Saat Ini" else "Pilih Paket Ini",
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
