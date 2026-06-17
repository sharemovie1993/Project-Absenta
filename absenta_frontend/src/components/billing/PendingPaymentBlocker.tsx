import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui';
import { CreditCard, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { getSubscriptionsByTenant, getMySubscription } from '@/api/subscription.api';
import { formatCurrency } from '@/lib/billingUtils';
export const PendingPaymentBlocker = () => {
    const { isAuthenticated, user } = useAuthStore();
    const [pendingSubs, setPendingSubs] = useState<any[]>([]);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Jangan blokir jika di halaman service-center (biar bisa bayar)
    // Atau di halaman publik/auth
    const isExcludedPage = 
        location.pathname === '/service-center' || 
        location.pathname.startsWith('/invoice/') ||
        location.pathname === '/login' || 
        location.pathname === '/register-tenant' ||
        location.pathname.startsWith('/payment/public');

    useEffect(() => {
        const userRole = user?.role?.name?.toUpperCase();
        
        const handleUpdate = () => {
            if (isAuthenticated && (userRole === 'ADMIN' || userRole === 'SUPERADMIN')) {
                checkPendingSubscription();
            }
        };

        window.addEventListener('subscription-updated', handleUpdate);

        // Cek hanya untuk ADMIN
        if (isAuthenticated && (userRole === 'ADMIN' || userRole === 'SUPERADMIN') && !isExcludedPage) {
            checkPendingSubscription();
        } else {
            setPendingSubs([]);
            setInvoiceId(null);
        }

        return () => {
            window.removeEventListener('subscription-updated', handleUpdate);
        };
    }, [isAuthenticated, user, location.pathname, isExcludedPage]);

    const checkPendingSubscription = async () => {
        setLoading(true);
        try {
            const res = await getMySubscription();
            
            if (res.success && res.data) {
                const invId = (res.data as any).upgrade_invoice_id;
                setInvoiceId(invId || null);

                const subs = (res.data as any).subscriptions || [];
                
                // Ambil SEMUA yang pending
                const pending = subs.filter((s: any) => {
                    const status = s.status?.toUpperCase();
                    return status === 'UPGRADE_PENDING' || status === 'PENDING_PAYMENT';
                });
                
                setPendingSubs(pending);
            }
        } catch (error: any) {
            console.error('Failed to check pending subscription:', error);
        } finally {
            setLoading(false);
        }
    };
    
    if (pendingSubs.length === 0) return null;

    const isMultiple = pendingSubs.length > 1;
    const firstSub = pendingSubs[0];
    const totalPrice = pendingSubs.reduce((acc, curr) => acc + (curr.price_snapshot || curr.Plan?.price_monthly || 0), 0);

    const handlePay = () => {
        // Find the specific invoice for the first pending sub if we don't have it globally
        let effectiveInvoiceId = invoiceId;
        
        if (!effectiveInvoiceId && pendingSubs.length === 1) {
            const sub = pendingSubs[0];
            // Try different possible paths for invoice ID
            effectiveInvoiceId = 
                sub.upgrade_invoice_id || 
                sub.invoices?.[0]?.id || 
                sub.billings?.[0]?.Invoice?.id ||
                sub.billings?.[0]?.id; // Last resort, navigate to billing ID which might redirect
        }
        
        console.log('[PaymentBlocker] handlePay', { isMultiple, invoiceId, effectiveInvoiceId, pendingCount: pendingSubs.length });

        if (!isMultiple && effectiveInvoiceId) {
            navigate(`/invoice/${effectiveInvoiceId}`);
        } else {
            navigate('/service-center?tab=billing');
        }
    };

    const handleCatalog = () => {
        navigate('/service-center?tab=catalog');
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-50 via-white to-amber-50 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/20 shadow-sm mb-6"
        >
            {/* Decorative background sparkles */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-amber-500" />
            </div>

            <div className="px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0 shadow-inner">
                        <Lock className="w-7 h-7 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                                {isMultiple ? `${pendingSubs.length} Pesanan` : 'Menunggu Aktivasi'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                • Payment Required
                            </span>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">
                            {isMultiple 
                                ? `Ada ${pendingSubs.length} Layanan yang Belum Diaktifkan` 
                                : `Pesanan ${firstSub.plan_name || firstSub.Plan?.name} Belum Dibayar`
                            }
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                            {isMultiple 
                                ? `Total tagihan Anda adalah `
                                : `Selesaikan pembayaran sebesar `
                            }
                            <span className="font-bold text-amber-600">{formatCurrency(totalPrice)}</span> 
                            {isMultiple 
                                ? ` untuk mengaktifkan seluruh modul yang Anda pesan.`
                                : ` untuk membuka kunci fitur ini.`
                            } Anda tetap bisa menjelajahi dashboard atau <span className="font-bold text-slate-900 dark:text-white underline cursor-pointer" onClick={handleCatalog}>mengganti paket</span>.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        variant="ghost"
                        onClick={handleCatalog}
                        className="flex-1 md:flex-none text-slate-500 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 h-12 px-6 rounded-xl"
                    >
                        Ganti Paket
                    </Button>
                    <Button 
                        onClick={handlePay}
                        className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-700 text-white rounded-xl px-8 font-bold shadow-lg shadow-amber-600/20 border-none h-12"
                    >
                        {isMultiple ? (
                            <>Lihat / Bayar <ArrowRight className="ml-2 w-4 h-4" /></>
                        ) : (
                            <>
                                <CreditCard className="w-4 h-4 mr-2" />
                                Bayar Sekarang <ArrowRight className="ml-2 w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
