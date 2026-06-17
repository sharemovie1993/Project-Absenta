import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { 
  Button, 
  Table, 
  Modal, 
  Loader, 
  EnhancedAlert,
  Input,
  StatusBadge,
  PaymentStatusBadge,
  SearchableSelect
} from '../../components/ui';
import { ModalFooter } from '../../components/ui/Modal';
import { SectionHeader } from '../../components/ui';
import { LogService } from '../../utils/LogService';
import SuperAdminPageLayout from '@/components/layout/SuperAdminPageLayout';
import { cn } from '@/lib/utils';
import StandardTable from '../../components/billing/StandardTable';
import { BILLING_PAGE_CONFIG } from '../../components/billing/billingLayoutConfig';
import { motion } from 'framer-motion';


import { 
  FileText, 
  DollarSign, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  RefreshCw,
  Filter,
  Download,
  Send,
  Calendar,
  TrendingUp,
  Users,
  Clock,
  MoreVertical,
  ChevronDown,
  Edit,
  CreditCard,
  Trash2,
  Eye,
  Receipt,
  Mail,
  Zap,
  Activity,
  X,
  Search
} from 'lucide-react';

import { 
  getAllBillings,
  getBillingStats,
  createBilling,
  updateBilling,
  markBillingAsPaid,
  markBillingAsOverdue,
  deleteBilling,
  generateMonthlyBilling,
  generateInvoiceFromBilling,
  formatCurrency,
  formatDate,
  getBillingById,
  triggerRecurringBilling
} from "../../api/billing.api";
import { formatErrorMessage } from "../../api/apiUtils";
import { getInvoiceByBillingId } from "../../api/invoice.api";
import { getPublicInvoiceLink } from "../../api/mySubscription.api";
import { formatCurrency as formatCurrencyUI, formatDateShort, getStatusBadgeClass, getStatusLabel } from '../../utils/layoutUtils';

import { getAllSubscriptions, getActiveSubscription } from "../../api/subscription.api";
import type { Billing, BillingStats, BillingQueryParams, Subscription } from "../../types/billing";
import { BillingStatus } from "../../types/billing";
import { BillingFormModal } from "./BillingFormModal";
import { openInvoicePublic } from '../../utils/invoiceLink';
import { useNavigate } from 'react-router-dom';


// Import Payment Gateway Components
import CreatePaymentForm from "../../components/payments/CreatePaymentForm";
import PaymentList from "../../components/payments/PaymentList";
import PaymentStatusView from "../../components/payments/PaymentStatusView";
import CancelPaymentButton from "../../components/payments/CancelPaymentButton";

// Import Payment Gateway API
import { 
  createPayment, 
  getPaymentsList, 
  getPaymentStatus, 
  cancelPayment,
  getSupportedGateways,
  formatPaymentMethodName 
} from "../../api/paymentGateway.api";

// Import Payment Gateway Types
import type { 
  PaymentRecord as PaymentGatewayRecord, 
  PaymentGateway, 
  PaymentMethod as PaymentGatewayMethod,
  PaymentStatus as PaymentGatewayStatus
} from "../../types/paymentGateway.d";

import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../hooks/useAuth";
import { isSystemSuperAdmin } from '../../utils/rbac';
import useConfirm from '../../hooks/useConfirm';
import { createApprovalRequest } from '../../api/approvals.api';
import type { ApprovalActionType } from '../../types/approvals';

export default function BillingsPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { user, tenantId, subscription, isLoading: isAuthLoading, can } = useAuth();
  
  // Check if user has permission to create billing (SUPERADMIN global)
  const isSuperAdmin = isSystemSuperAdmin(user?.role?.name, user?.tenant_id);
  const canManageBillings = useMemo(() => can('billing.invoices.generate'), [can]);
  const location = useLocation();

  const [billings, setBillings] = useState<Billing[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);

  // Stats List terstandar untuk SuperAdminPageLayout
  const statsList = useMemo(() => {
    return [
      {
        title: "Total Revenue Platform",
        value: stats ? formatCurrencyUI(stats.total_amount) : 'Rp 0',
        icon: <DollarSign className="h-4 w-4 text-white" />,
        gradient: "from-blue-500 to-indigo-600",
        subtitle: "Akumulasi tagihan terbit"
      },
      {
        title: "Total Lunas (Paid)",
        value: stats ? formatCurrencyUI(stats.paid_amount) : 'Rp 0',
        icon: <CheckCircle className="h-4 w-4 text-white" />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: `${stats?.paid_count || 0} invoice lunas`
      },
      {
        title: "Tagihan Unpaid",
        value: stats ? formatCurrencyUI(stats.unpaid_amount) : 'Rp 0',
        icon: <Clock className="h-4 w-4 text-white" />,
        gradient: "from-amber-500 to-orange-600",
        subtitle: `${stats?.unpaid_count || 0} invoice pending`
      },
      {
        title: "Jatuh Tempo (Overdue)",
        value: stats ? formatCurrencyUI(stats.overdue_amount) : 'Rp 0',
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
        gradient: (stats?.overdue_count ?? 0) > 0 ? "from-rose-500 to-pink-600" : "from-purple-500 to-fuchsia-600",
        subtitle: `${stats?.overdue_count || 0} invoice overdue`
      }
    ];
  }, [stats]);

  // Toolbar slot dengan tombol aksi krusial Superadmin
  const toolbarSlot = useMemo(() => (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        onClick={loadBillingData}
        size="sm"
        className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
      >
        <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin" : "")} />
        Refresh
      </Button>
      <Button
        variant="outline"
        onClick={() => handleExportData('csv')}
        disabled={isExporting}
        size="sm"
        className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all flex items-center gap-1.5"
      >
        <Download className="w-3.5 h-3.5" />
        {isExporting ? 'Exporting...' : 'Export CSV'}
      </Button>
      {isSuperAdmin && canManageBillings && (
        <>
          <Button
            variant="outline"
            onClick={() => setShowGenerateModal(true)}
            disabled={isGenerating}
            size="sm"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Generate Monthly
          </Button>
          <Button
            variant="outline"
            onClick={handleTriggerRecurring}
            disabled={isTriggering}
            size="sm"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-all flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            {isTriggering ? 'Triggering...' : 'Trigger Recurring'}
          </Button>
          <Button 
            onClick={() => setShowBillingFormModal(true)}
            size="sm"
            className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Tagihan Baru
          </Button>
        </>
      )}
    </div>
  ), [loading, isExporting, isGenerating, isTriggering, isSuperAdmin, canManageBillings]);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }
  

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [adminActiveSubscriptionId, setAdminActiveSubscriptionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tenantFilter, setTenantFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [success, setSuccess] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    subscription_id: '',
    amount: 0,
    billing_date: '',
    due_date: '',
    payment_method: '',
    payment_reference: '',
    invoice_number: '',
    description: ''
  });

  // Enhancement states
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateData, setGenerateData] = useState({
    subscription_id: '',
    month: parseInt((new Date().getMonth() + 1).toString()),
    year: new Date().getFullYear()
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showBillingFormModal, setShowBillingFormModal] = useState(false);

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalTargetId, setApprovalTargetId] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalActionType | null>(null);
  const [approvalReason, setApprovalReason] = useState('');

  // Invoice states
  const [selectedBillingForInvoice, setSelectedBillingForInvoice] = useState<Billing | null>(null);
  const [showSendInvoiceModal, setShowSendInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    email: '',
    subject: '',
    message: ''
  });



  // Sub-tab Navigation dihapus; gunakan submenu Sidebar Billing

  useEffect(() => {
    const params = new URLSearchParams(String(location.search || ''));
    const status = params.get('status');
    const tenantParam = params.get('tenant_id');

    if (status) {
      setStatusFilter(status.toUpperCase());
    }
    if (tenantParam !== null) {
      setTenantFilter(tenantParam);
    }
  }, [location.search]);

  // Komponen PaymentManagement dihapus; gunakan halaman terpisah untuk pembayaran






  // Load billing data
  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: BillingQueryParams = {
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter as BillingStatus : undefined,
        tenant_id: isSuperAdmin ? (tenantFilter || undefined) : (user?.tenant_id ?? tenantId ?? undefined)
      };

      if (isSuperAdmin) {
        const [billingsResponse, statsResponse] = await Promise.all([
          getAllBillings(params),
          getBillingStats()
        ]);

        if (billingsResponse.success) {
          setBillings(billingsResponse.data || []);
        } else {
          setError(formatErrorMessage(billingsResponse));
        }

        if (statsResponse.success) {
          setStats(statsResponse.data);
        }
      } else {
        const billingsResponse = await getAllBillings(params);
        if (billingsResponse.success) {
          const rawList = billingsResponse.data || [];
          const enriched = await Promise.all(rawList.map(async (b) => {
            let invoice_number = b?.invoice_number || (b?.Invoice?.invoice_number ?? '');
            let due_date = b?.due_date || (b?.Invoice?.due_date ?? '');
            let newStatus: BillingStatus = (b?.status as BillingStatus) || 'UNPAID';
            if (!invoice_number || !due_date || newStatus === 'UNPAID') {
              try {
                const invRes = await getInvoiceByBillingId(b.id);
                const inv = invRes?.data;
                if (inv) {
                  invoice_number = invoice_number || inv.invoice_number || '';
                  due_date = due_date || inv.due_date || '';
                  const invStatus = String(inv.status || '').toUpperCase();
                  if (invStatus === 'PAID') {
                    newStatus = 'PAID';
                  } else if (invStatus === 'CANCELLED') {
                    newStatus = 'CANCELLED' as BillingStatus;
                  } else {
                    const due = inv?.due_date ? new Date(inv.due_date) : null;
                    newStatus = (due && due.getTime() < Date.now()) ? 'OVERDUE' : 'UNPAID';
                  }
                } else {
                  const billRes = await getBillingById(b.id);
                  const invRel = billRes?.data?.Invoice;
                  if (invRel) {
                    invoice_number = invoice_number || invRel.invoice_number || '';
                    due_date = due_date || invRel.due_date || '';
                    const invStatus = String(invRel.status || '').toUpperCase();
                    if (invStatus === 'PAID') {
                      newStatus = 'PAID';
                    } else if (invStatus === 'CANCELLED') {
                      newStatus = 'CANCELLED' as BillingStatus;
                    } else {
                      const due = invRel?.due_date ? new Date(invRel.due_date) : null;
                      newStatus = (due && due.getTime() < Date.now()) ? 'OVERDUE' : 'UNPAID';
                    }
                  }
                }
              } catch {}
            }
            return { ...b, invoice_number, due_date, status: newStatus } as Billing;
          }));
          setBillings(enriched);
        } else {
          setError(formatErrorMessage(billingsResponse));
        }
        setStats(null);
      }
    } catch (err: unknown) {
      LogService.error('Error loading billing data:', err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Load subscriptions data
  const loadSubscriptions = async () => {
    try {
      const response = await getAllSubscriptions();
      if (response.success) {
        setSubscriptions(response.data?.subscriptions || []);
      } else {
        LogService.error('Failed to load subscriptions:', response.message);
      }
    } catch (err: unknown) {
      LogService.error('Error loading subscriptions:', err);
    }
  };

  // Compute Unique Tenants for Filter
  const uniqueTenants = useMemo(() => {
    const map = new Map();
    subscriptions.forEach(sub => {
      // Handle potential casing/property differences if any
      const t = sub.Tenant || (sub as any).tenant;
      if (t && t.id && !map.has(t.id)) {
        map.set(t.id, { id: t.id, name: t.name || t.domain || 'Unknown Tenant' });
      }
    });
    return Array.from(map.values());
  }, [subscriptions]);

  const paginatedBillings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return billings.slice(start, start + itemsPerPage);
  }, [billings, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, tenantFilter]);

  const handleCreateBilling = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await createBilling(formData);
      
      if (response.success) {
        setSuccess('Tagihan berhasil dibuat');
        setShowCreateModal(false);
        resetForm();
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal membuat tagihan');
      }
  } catch (err: unknown) {
      setError(formatErrorMessage(err));
  } finally {
      setLoading(false);
    }
  };

  const handleUpdateBilling = async () => {
    if (!selectedBilling) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await updateBilling(selectedBilling.id, formData);
      
      if (response.success) {
        setSuccess('Tagihan berhasil diperbarui');
        setShowEditModal(false);
        setSelectedBilling(null);
        resetForm();
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal memperbarui tagihan');
      }
  } catch (err: unknown) {
      setError(formatErrorMessage(err));
  } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (billingId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await markBillingAsPaid(billingId, {
        payment_method: 'MANUAL_TRANSFER',
        payment_reference: `MANUAL-${Date.now()}`
      });
      
      if (response.success) {
        setSuccess('Tagihan berhasil ditandai sebagai lunas');
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal menandai tagihan sebagai lunas');
      }
  } catch (err: unknown) {
      setError(formatErrorMessage(err));
  } finally {
      setLoading(false);
    }
  };

  const handleMarkAsOverdue = async (billingId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await markBillingAsOverdue(billingId);
      
      if (response.success) {
        setSuccess('Tagihan berhasil ditandai sebagai jatuh tempo');
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal menandai tagihan sebagai jatuh tempo');
      }
  } catch (err: unknown) {
      setError(formatErrorMessage(err));
  } finally {
      setLoading(false);
    }
  };

  const handleDeleteBilling = async (billingId: string) => {
    const ok = await confirm({
      title: 'Konfirmasi Hapus Tagihan',
      description: 'Apakah Anda yakin ingin menghapus tagihan ini? Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Hapus',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await deleteBilling(billingId);
      
      if (response.success) {
        setSuccess('Tagihan berhasil dihapus');
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal menghapus tagihan');
      }
  } catch (err: unknown) {
      setError(formatErrorMessage(err));
  } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      subscription_id: '',
      amount: 0,
      billing_date: '',
      due_date: '',
      payment_method: '',
      payment_reference: '',
      invoice_number: '',
      description: ''
    });
  };

  // Enhancement functions
  const handleGenerateMonthlyBilling = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const response = await generateMonthlyBilling(generateData);
      
      if (response.success) {
        setSuccess(`Berhasil generate ${response.data?.generated_count || 0} tagihan untuk bulan ${generateData.month}/${generateData.year}`);
        setShowGenerateModal(false);
        await loadBillingData();
      } else {
        setError(response.message || 'Gagal generate tagihan bulanan');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Gagal generate tagihan bulanan');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTriggerRecurring = async () => {
    try {
      setIsTriggering(true);
      setError(null);
      const res = await triggerRecurringBilling();
      if (res.success) {
        setSuccess(res.message || 'Scheduler recurring berhasil dijalankan');
        await loadBillingData();
      } else {
        setError(res.message || 'Gagal menjalankan scheduler recurring');
      }
    } catch (err: unknown) {
      setError(formatErrorMessage(err));
    } finally {
      setIsTriggering(false);
    }
  };



  const handleExportData = async (format: 'csv' | 'excel' = 'csv') => {
    try {
      setIsExporting(true);
      setError(null);
      
      // Filter data (Data already filtered by API based on current view)
      const filteredData = billings;
      
      if (filteredData.length === 0) {
        setError('Tidak ada data untuk diexport');
        return;
      }
      
      // Create CSV data dari data real
      const csvData = filteredData.map(billing => ({
        'Invoice Number': billing.invoice_number || 'N/A',
        'Tenant': billing.Subscription?.Tenant?.name || 'N/A',
        'Plan': billing.Subscription?.Plan?.name || 'N/A',
        'Amount': billing.amount,
        'Status': billing.status,
        'Billing Date': formatDate(billing.billing_date),
        'Due Date': billing.due_date ? formatDate(billing.due_date) : 'N/A',
        'Paid Date': billing.paid_at ? formatDate(billing.paid_at) : 'N/A',
        'Payment Method': (() => {
          const raw = (billing as unknown as { payment_method?: string }).payment_method ?? (billing.Subscription as unknown as { payment_method?: string })?.payment_method;
          return raw ? formatPaymentMethodName(String(raw)) : 'N/A';
        })(),
        'Payment Reference': billing.payment_reference || 'N/A'
      }));
      
      // Convert to CSV string
      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `billing-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess(`${filteredData.length} data billing berhasil diexport ke format ${format.toUpperCase()}`);
    } catch (err: unknown) {
      LogService.error('Export error:', err);
      setError('Gagal export data billing');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEdit = async (billing: Billing) => {
    setSelectedBilling(billing);
    const rawDue = (billing.Invoice?.due_date ?? billing.due_date ?? '') as string;
    const normalizedDue = rawDue ? (rawDue.includes('T') ? rawDue.split('T')[0] : rawDue) : '';
    const rawBillingDate = billing?.billing_date ? (billing.billing_date.includes('T') ? billing.billing_date.split('T')[0] : billing.billing_date) : '';
    setFormData({
      subscription_id: billing.subscription_id || billing.Subscription?.id || '',
      amount: billing.amount,
      billing_date: rawBillingDate,
      due_date: normalizedDue,
      payment_method: billing.payment_method || '',
      payment_reference: billing.payment_reference || '',
      invoice_number: billing.invoice_number || billing.Invoice?.invoice_number || '',
      description: billing.description || ''
    });
    if (isSuperAdmin && subscriptions.length === 0) {
      try {
        await loadSubscriptions();
      } catch {}
    }
    setShowEditModal(true);
  };

  const handleViewInvoice = async (billing: Billing) => {
    try {
      if (!isSuperAdmin) {
        window.location.href = '/billing?tab=invoice';
        return;
      }
      if (!billing?.id) return;
      const existing = await getInvoiceByBillingId(billing.id);
      if (existing && existing.success && existing.data?.id) {
        try {
          const link = await getPublicInvoiceLink(existing.data.id);
          const token = link?.data?.token;
          const url = link?.data?.url;
          if (token) {
            navigate(`/invoice/public/${token}`);
          } else {
            if (url) {
              window.open(url, '_blank');
            } else {
              window.open(`/invoice/public/${existing.data.id}`, '_blank');
            }
          }
        } catch {
          window.open(`/invoice/public/${existing.data.id}`, '_blank');
        }
      } else {
        const bill = await getBillingById(billing.id);
        const invId = (bill as any)?.data?.Invoice?.id;
        if (invId) {
          try {
            const link = await getPublicInvoiceLink(invId);
            const token = link?.data?.token;
            const url = link?.data?.url;
            if (token) {
              navigate(`/invoice/public/${token}`);
            } else {
              if (url) {
                window.open(url, '_blank');
              } else {
                window.open(`/invoice/public/${invId}`, '_blank');
              }
            }
          } catch {
            window.open(`/invoice/public/${invId}`, '_blank');
          }
        } else {
          setError('Invoice tidak ditemukan untuk billing ini');
        }
      }
    } catch (e) {
      try {
        const bill = await getBillingById(billing.id);
        const invId = (bill as any)?.data?.Invoice?.id;
        if (invId) {
          try {
            const link = await getPublicInvoiceLink(invId);
            const token = link?.data?.token;
            const url = link?.data?.url;
            if (token) {
              openInvoicePublic(token);
            } else {
              if (url) {
                window.open(url, '_blank');
              } else {
                window.open(`/invoice/public/${invId}`, '_blank');
              }
            }
          } catch {
            window.open(`/invoice/public/${invId}`, '_blank');
          }
          return;
        }
      } catch {}
      setError('Invoice tidak ditemukan untuk billing ini');
    }
  };

  const handleGenerateInvoice = async (billing: Billing) => {
    try {
      setLoading(true);
      
      // Check if invoice already exists for this billing
      try {
        const existing = await getInvoiceByBillingId(billing.id);
        if (existing && existing.success && existing.data) {
          setError(`Invoice sudah ada untuk billing ${billing.invoice_number}.`);
          try {
            const link = await getPublicInvoiceLink(existing.data.id);
            const token = link?.data?.token;
            const url = link?.data?.url;
            if (token) {
              navigate(`/invoice/public/${token}`);
            } else {
              if (url) {
                window.open(url, '_blank');
              } else {
                window.open(`/invoice/public/${existing.data.id}`, '_blank');
              }
            }
          } catch {
            window.open(`/invoice/public/${existing.data.id}`, '_blank');
          }
          return; // Skip generating
        }
      } catch (e) {
        // If not found, proceed to generate. Ignore error from lookup.
      }

      // Calculate due date (30 days from now)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      
      // Call API to generate invoice
      const result = await generateInvoiceFromBilling(billing.id, {
        // Backend expects date-only (YYYY-MM-DD), not full ISO datetime
        due_date: dueDate.toISOString().split('T')[0],
        notes: `Invoice generated from billing ${billing.invoice_number}`
      });
      
      if (result.success) {
        setSuccess(`Invoice berhasil digenerate untuk billing ${billing.invoice_number}`);
        await loadBillingData(); // Refresh data
      } else {
        // Handle duplicate invoice error message gracefully
        const msg = result.message || 'Gagal generate invoice';
        if (/already exists/i.test(msg)) {
          setError(`Invoice sudah ada untuk billing ${billing.invoice_number}.`);
        } else {
          setError(msg);
        }
      }
    } catch (err: unknown) {
      LogService.error('Generate invoice error:', err);
      const apiMsg = formatErrorMessage(err);
      if (/already exists/i.test(apiMsg)) {
        setError(`Invoice sudah ada untuk billing ${billing.invoice_number}.`);
      } else {
        setError(apiMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Approval helpers
  const openApprovalModal = (billingId: string, action: ApprovalActionType) => {
    setApprovalTargetId(billingId);
    setApprovalAction(action);
    setApprovalReason('');
    setShowApprovalModal(true);
  };

  const submitApprovalRequest = async () => {
    if (!approvalTargetId || !approvalAction) return;
    try {
      const tid = (typeof user === 'object' && user !== null && 'tenant' in user
        ? (user as { tenant?: { id?: string } }).tenant?.id
        : undefined) || tenantId || '';
      await createApprovalRequest({
        tenant_id: tid,
        target_type: 'BILLING',
        target_id: approvalTargetId,
        action_type: approvalAction,
        reason: approvalReason || undefined,
      });
      setSuccess('Permintaan persetujuan dikirim. Menunggu review SUPERADMIN.');
      setShowApprovalModal(false);
      setApprovalTargetId(null);
      setApprovalAction(null);
      setApprovalReason('');
    } catch (err: unknown) {
      setError(formatErrorMessage(err));
    }
  };



  useEffect(() => {
    loadBillingData();
    if (isSuperAdmin) {
      loadSubscriptions();
    } else {
      // Fallback: muat subscription aktif untuk ADMIN jika store tidak menyediakan
      (async () => {
        try {
          const res = await getActiveSubscription();
          const sub = (res?.data || null) as Subscription | null;
          setAdminActiveSubscriptionId(sub?.id || null);
        } catch (err) {
          LogService.warn('Active subscription not available for ADMIN', err as unknown);
          setAdminActiveSubscriptionId(null);
        }
      })();
    }
  }, [statusFilter, tenantFilter]);

  // ===== ADMIN Tenant Minimal UI =====
  // Jika bukan SUPERADMIN, tampilkan UI sederhana berfokus pada billing dari langganan aktif
  if (!isSuperAdmin) {
    const activeSubId = adminActiveSubscriptionId || (subscription as Subscription | null | undefined)?.id || subscriptions.find(s => s.status === 'ACTIVE')?.id || subscriptions.find(s => s.status === 'TRIAL')?.id || null;
    const filteredBillings = useMemo(() => {
      const scoped = activeSubId ? billings.filter(b => b.subscription_id === activeSubId) : billings;
      return scoped.filter(b => {
        const s = String(b.status || '').toUpperCase();
        return s === 'UNPAID' || s === 'OVERDUE';
      });
    }, [billings, activeSubId]);

    return (
      <SuperAdminPageLayout
        title="Tagihan Berlangganan"
        description="Kelola tagihan pembayaran bulanan aktif untuk sistem tenant Anda secara real-time."
        breadcrumbs={[
          { label: 'Billing Platform' },
          { label: 'Tagihan Tenant' }
        ]}
        isLoading={loading}
      >
        {error && <EnhancedAlert variant="destructive" title="Terjadi kesalahan" description={error} dismissible onDismiss={() => setError(null)} />}
        {success && <EnhancedAlert variant="success" title="Berhasil" description={success} dismissible onDismiss={() => setSuccess('')} />}

        <div className="p-6 border rounded-md bg-white shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">Tagihan Berlangganan</h3>
              <p className="text-sm text-gray-600">Menampilkan tagihan untuk langganan aktif tenant Anda.</p>
            </div>
          </div>

          {filteredBillings.length === 0 && (
            <div className="text-center py-10">
              <div className="text-gray-400 mb-2">
                <FileText className="w-10 h-10 mx-auto" />
              </div>
              <div className="text-sm text-gray-700">Tidak ada tagihan aktif saat ini.</div>
              <div className="mt-3 flex justify-center gap-2">
                <Button variant="secondary" onClick={() => window.location.href = '/billing?tab=invoice'}>
                  Lihat Invoice
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/billing?tab=riwayat'}>
                  Riwayat Pembayaran
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jumlah</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Tanggal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Jatuh Tempo</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBillings.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2 text-sm">{b.invoice_number || '-'}</td>
                    <td className="px-4 py-2 text-sm font-medium">{formatCurrencyUI(b.amount)}</td>
                    <td className="px-4 py-2 text-sm">
                      {(() => {
                        const lower = String(b.status || 'unpaid').toLowerCase();
                        const statusUi: 'paid' | 'unpaid' | 'overdue' | 'cancelled' = 
                          lower === 'paid' ? 'paid' : 
                          lower === 'overdue' ? 'overdue' : 
                          lower === 'cancelled' ? 'cancelled' : 
                          'unpaid';
                        return <PaymentStatusBadge status={statusUi} />;
                      })()}
                    </td>
                    <td className="px-4 py-2 text-sm">{formatDate(b.billing_date)}</td>
                    <td className="px-4 py-2 text-sm">{b.due_date ? formatDate(b.due_date) : '-'}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewInvoice(b)}>
                          Lihat Invoice
                        </Button>
                        {(() => {
                          const s = String(b.status || '').toUpperCase();
                          const canPay = s === 'UNPAID' || s === 'OVERDUE';
                          const isCancelled = s === 'CANCELLED';
                          
                          if (isCancelled) return (
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter">Tagihan Dibatalkan</span>
                          );

                          return canPay ? (
                            <Button size="sm" onClick={() => { 
                              const token = (b.Subscription as any)?.invoice_token || b.invoice_number;
                              if (token) window.open(`/invoice/public/${token}`, '_blank');
                              else window.location.href = '/billing?tab=billings';
                            }}>
                              Bayar Tagihan
                            </Button>
                          ) : isCancelled ? (
                            <span className="text-gray-400 font-medium italic px-2 py-1 bg-gray-50 border border-gray-200 rounded">Tagihan Dibatalkan</span>
                          ) : null;
                        })()}
                        {/* ADMIN tenant tidak boleh menandai lunas dari UI minimal */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SuperAdminPageLayout>
    );
  }

  // ActionDropdown Component
  const ActionDropdown = ({ billing }: { billing: Billing }) => {
    const dropdownId = `dropdown-${billing.id}`;
    const isOpen = openDropdown === dropdownId;
    const [dropUp, setDropUp] = useState(false);

    return (
      <div className="relative">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            if (isOpen) {
              setOpenDropdown(null);
              return;
            }
            try {
              const rect = (e?.currentTarget as HTMLElement)?.getBoundingClientRect();
              const spaceBelow = rect ? (window.innerHeight - rect.bottom) : 0;
              const spaceAbove = rect ? rect.top : 0;
              const estimatedMenuHeight = 240; // px
              const shouldDropUp = spaceBelow < estimatedMenuHeight && spaceAbove > estimatedMenuHeight;
              setDropUp(shouldDropUp);
            } catch {}
            setOpenDropdown(dropdownId);
          }}
          className="gap-1"
        >
          <MoreVertical className="w-4 h-4" />
          Aksi
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setOpenDropdown(null)}
            />
            
            {/* Dropdown Menu */}
            <div
              className={
                `absolute right-0 ${dropUp ? 'mb-2 bottom-full' : 'mt-2 top-full'} w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20`
              }
              style={{ maxHeight: '60vh', overflowY: 'auto' }}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    handleViewInvoice(billing);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Lihat Invoice
                </button>
                
                {isSuperAdmin && canManageBillings && !billing.invoice_number && (
                  <button
                    onClick={() => {
                      handleGenerateInvoice(billing);
                      setOpenDropdown(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Receipt className="w-4 h-4" />
                    Generate Invoice
                  </button>
                )}
                {!isSuperAdmin && !billing.invoice_number && (
                  <button
                    onClick={() => {
                      openApprovalModal(billing.id, 'BILLING_GENERATE_INVOICE');
                      setOpenDropdown(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Receipt className="w-4 h-4" />
                    Minta Persetujuan Generate
                  </button>
                )}
                
                {isSuperAdmin && canManageBillings && (
                <button
                  onClick={() => {
                    handleEdit(billing);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit Tagihan
                </button>
                )}
                {!isSuperAdmin && (
                  <button
                    onClick={() => {
                      openApprovalModal(billing.id, 'BILLING_EDIT');
                      setOpenDropdown(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Minta Persetujuan Edit
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setSelectedBillingForInvoice(billing);
                    setInvoiceData({
                      email: '',
                      subject: `Invoice #${billing.invoice_number}`,
                      message: `Dear ${billing.Subscription?.Tenant?.name || 'Customer'},\n\nPlease find attached your invoice for the amount of ${formatCurrency(billing.amount)}.\n\nThank you for your business.`
                    });
                    setShowSendInvoiceModal(true);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  Kirim Invoice
                </button>

                {billing.status === 'UNPAID' && String(billing.status).toUpperCase() !== 'CANCELLED' && (
                  <>
                    <button
                      onClick={() => {
                        handleMarkAsPaid(billing.id);
                        setOpenDropdown(null);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Tandai Lunas
                    </button>
                    
                    {isSuperAdmin && canManageBillings && (
                    <button
                      onClick={() => {
                        handleMarkAsOverdue(billing.id);
                        setOpenDropdown(null);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-orange-700 dark:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Clock className="w-4 h-4" />
                      Tandai Jatuh Tempo
                    </button>
                    )}
                    {!isSuperAdmin && (
                      <button
                        onClick={() => {
                          openApprovalModal(billing.id, 'BILLING_MARK_OVERDUE');
                          setOpenDropdown(null);
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-blue-700 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                        Minta Persetujuan Jatuh Tempo
                      </button>
                    )}
                  </>
                )}

                <div className="border-t border-gray-200 dark:border-gray-600 my-1" />
                
                {isSuperAdmin && canManageBillings && (
                <button
                  onClick={() => {
                    handleDeleteBilling(billing.id);
                    setOpenDropdown(null);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Tagihan
                </button>
                )}
                {!isSuperAdmin && (
                  <button
                    onClick={() => {
                      openApprovalModal(billing.id, 'BILLING_DELETE');
                      setOpenDropdown(null);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Minta Persetujuan Hapus
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Define table columns
  const columns = [
    {
      key: 'invoice_number',
      label: 'No. Invoice',
      render: (_value: unknown, billing: Billing) => (
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {(billing.Invoice?.invoice_number || billing.invoice_number) ?? billing?.id ?? 'N/A'}
        </span>
      )
    },
    {
      key: 'tenant',
      label: 'Tenant',
      render: (_value: unknown, billing: Billing) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {billing.Subscription?.Tenant?.name || 'N/A'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {billing.Subscription?.Tenant?.domain || billing.Subscription?.Tenant?.email || 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'charge_type',
      label: 'Jenis Charge',
      render: (_value: unknown, billing: Billing) => (
        <span className="text-gray-700 dark:text-gray-300">{billing.charge_type || 'RECURRING'}</span>
      )
    },
    {
      key: 'amount',
      label: 'Jumlah',
      render: (_value: unknown, billing: Billing) => (
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(billing.amount)}
        </span>
      )
    },
    {
      key: 'billing_date',
      label: 'Tanggal Invoice',
      render: (_value: unknown, billing: Billing) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatDate(billing.billing_date)}
        </span>
      )
    },
    {
      key: 'due_date',
      label: 'Jatuh Tempo',
      render: (_value: unknown, billing: Billing) => (
        (() => {
          const due = billing.Invoice?.due_date ?? billing.due_date ?? null;
          const label = due ? formatDate(due) : '-';
          return <span className="text-gray-700 dark:text-gray-300">{label}</span>;
        })()
      )
    },
    {
      key: 'payment_method',
      label: 'Metode Bayar',
      render: (_value: unknown, billing: Billing) => (
        (() => {
          const raw = (billing.Subscription as unknown as { payment_method?: string })?.payment_method || '';
          const label = raw ? formatPaymentMethodName(String(raw)) : '-';
          return <span className="text-gray-700 dark:text-gray-300">{label}</span>;
        })()
      )
    },
    {
      key: 'payment_reference',
      label: 'Ref Pembayaran',
      render: (_value: unknown, billing: Billing) => (
        <span className="text-gray-700 dark:text-gray-300">{billing.payment_reference || '-'}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (_value: unknown, billing: Billing) => {
        // PATCH: Display only based on API value (Source of Truth)
        // Backend now ensures Invoice.status is correct (including OVERDUE)
        const effectiveStatus = billing.Invoice?.status || billing.status || 'UNPAID';
        const module = billing.Invoice?.status ? 'invoice' : 'billing';
        const cls = getStatusBadgeClass(effectiveStatus, module);
        const label = getStatusLabel(effectiveStatus, module);
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>{label}</span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_value: unknown, billing: Billing) => (
        <ActionDropdown billing={billing} />
      )
    }
  ];

  if (loading) {
    return <Loader />;
  }

  const pageConfig = BILLING_PAGE_CONFIG.billing;

  return (
    <SuperAdminPageLayout
      title="Manajemen Invoice & Tagihan Platform"
      description="Kelola siklus penagihan tenant, terbitkan invoice manual, jalankan trigger recurring scheduler, dan lakukan verifikasi pembayaran bulanan multitenant secara real-time."
      breadcrumbs={[
        { label: 'Billing Platform' },
        { label: 'Invoice & Tagihan' }
      ]}
      stats={statsList}
      isLoading={loading && billings.length === 0}
      toolbar={toolbarSlot}
    >
      {error && (
        <EnhancedAlert
          variant="destructive"
          title="Error"
          description={error}
          dismissible
          onDismiss={() => setError(null)}
          className="mb-4"
        />
      )}
      {success && (
        <EnhancedAlert
          variant="success"
          title="Success"
          description={success}
          dismissible
          onDismiss={() => setSuccess('')}
          className="mb-4"
        />
      )}
      {/* Approval Request Modal */}
      <Modal isOpen={showApprovalModal} onClose={() => setShowApprovalModal(false)} title="Minta Persetujuan Aksi">
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Tambahkan alasan permintaan (opsional):</p>
          <Input
            type="text"
            value={approvalReason}
            onChange={(e) => setApprovalReason(e.target.value)}
            placeholder="Alasan permintaan"
          />
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowApprovalModal(false)}>Batal</Button>
          <Button className="ml-2" onClick={submitApprovalRequest}>Kirim Permintaan</Button>
        </ModalFooter>
      </Modal>
      
 
      {/* Information for non-SUPERADMIN users */}
      {!isSuperAdmin && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <FileText className="text-blue-600 mr-3" size={20} />
            <div>
              <h3 className="text-blue-800 font-medium">Informasi Akses</h3>
              <p className="text-blue-700 text-sm mt-1">
                Anda login sebagai <strong>{user?.role?.name || 'Unknown'}</strong>. 
                Untuk membuat tagihan baru atau generate tagihan bulanan, diperlukan akses SUPERADMIN.
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.div 
        className="space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <>
            {/* System Condition Narrative */}
            {stats && stats.overdue_count > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-medium">
                    {stats.overdue_count} invoice jatuh tempo membutuhkan perhatian superadmin segera!
                  </span>
                </div>
              </div>
            )}

        {/* Billing Table with Integrated Filters */}
        <StandardTable
          title="Daftar Tagihan"
          columns={columns}
          data={paginatedBillings}
          loading={loading}
          emptyMessage={pageConfig.emptyMessage}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusOptions={pageConfig.statusOptions}
          onRefresh={loadBillingData}
          refreshLoading={loading}
          additionalFilters={
            isSuperAdmin && canManageBillings && (
              <div className="relative w-48">
                <SearchableSelect
                  value={tenantFilter}
                  onValueChange={(val) => setTenantFilter(val)}
                  options={[
                    { value: "", label: "Semua Tenant" },
                    ...uniqueTenants.map(t => ({ value: t.id, label: t.name }))
                  ]}
                  placeholder="Semua Tenant"
                  searchPlaceholder="Cari tenant..."
                  triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>
            )
          }
        />
        
        {/* Pagination Controls */}
        {!loading && billings.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-1 pb-8">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {(currentPage - 1) * itemsPerPage + 1} sampai {Math.min(currentPage * itemsPerPage, billings.length)} dari {billings.length} data
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-24">
                <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">Baris:</span>
                <SearchableSelect
                  value={itemsPerPage.toString()}
                  onValueChange={(val) => {
                    setItemsPerPage(Number(val));
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "10", label: "10" },
                    { value: "25", label: "25" },
                    { value: "50", label: "50" },
                    { value: "100", label: "100" }
                  ]}
                  placeholder="10"
                  triggerClassName="w-full h-8 text-sm bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[100px] text-center">
                  Halaman {currentPage} dari {Math.ceil(billings.length / itemsPerPage)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(billings.length / itemsPerPage), p + 1))}
                  disabled={currentPage >= Math.ceil(billings.length / itemsPerPage)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          </div>
        )}
          </>
      </motion.div>

      {/* Create Billing Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Buat Tagihan Baru"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subscription
            </label>
            <SearchableSelect
              value={formData.subscription_id}
              onValueChange={(val) => setFormData(prev => ({ ...prev, subscription_id: val }))}
              options={[
                { value: "", label: "Pilih Subscription" },
                ...subscriptions.map((subscription) => ({
                  value: subscription.id,
                  label: `${
                    subscription.Tenant?.name ||
                    subscription.Tenant?.domain ||
                    subscription.Tenant?.email ||
                    (subscription as any).tenant?.name ||
                    (subscription as any).tenant?.email ||
                    (subscription as any).tenant_name ||
                    'Unknown Tenant'
                  } - ${
                    subscription.plan?.name ||
                    (subscription as any).Plan?.name ||
                    (subscription as any).plan_name ||
                    'Unknown Plan'
                  } (${subscription.status})`
                }))
              ]}
              placeholder="Pilih Subscription"
              searchPlaceholder="Cari subscription..."
              triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jumlah
            </label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="Masukkan jumlah tagihan"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tanggal Jatuh Tempo
            </label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metode Pembayaran
            </label>
            <SearchableSelect
              value={formData.payment_method}
              onValueChange={(val) => setFormData(prev => ({ ...prev, payment_method: val }))}
              options={[
                { value: "", label: "Pilih Metode Pembayaran" },
                { value: "BANK_TRANSFER", label: "Transfer Bank" },
                { value: "CREDIT_CARD", label: "Kartu Kredit" },
                { value: "DEBIT_CARD", label: "Kartu Debit" },
                { value: "E_WALLET", label: "E-Wallet" },
                { value: "CASH", label: "Tunai" }
              ]}
              placeholder="Pilih Metode Pembayaran"
              searchPlaceholder="Cari metode pembayaran..."
              triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Referensi Pembayaran
            </label>
            <Input
              type="text"
              value={formData.payment_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
              placeholder="Masukkan referensi pembayaran (opsional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nomor Invoice
            </label>
            <Input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="Masukkan nomor invoice (opsional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Masukkan deskripsi tagihan (opsional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateBilling}
            disabled={loading || !formData.subscription_id || !formData.amount || !formData.due_date}
          >
            {loading ? 'Menyimpan...' : 'Buat Tagihan'}
          </Button>
        </div>
      </Modal>

      {/* Edit Billing Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedBilling(null);
          resetForm();
        }}
        title="Edit Tagihan"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subscription
            </label>
            <SearchableSelect
              value={formData.subscription_id}
              onValueChange={(val) => setFormData(prev => ({ ...prev, subscription_id: val }))}
              options={[
                { value: "", label: "Pilih Subscription" },
                ...subscriptions.map((subscription) => ({
                  value: subscription.id,
                  label: `${
                    subscription.Tenant?.name ||
                    subscription.Tenant?.domain ||
                    subscription.Tenant?.email ||
                    (subscription as any).tenant?.name ||
                    (subscription as any).tenant?.email ||
                    (subscription as any).tenant_name ||
                    'Unknown Tenant'
                  } - ${
                    subscription.plan?.name ||
                    (subscription as any).Plan?.name ||
                    (subscription as any).plan_name ||
                    'Unknown Plan'
                  } (${subscription.status})`
                }))
              ]}
              placeholder="Pilih Subscription"
              searchPlaceholder="Cari subscription..."
              triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Jumlah
            </label>
            <Input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              placeholder="Masukkan jumlah tagihan"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tanggal Jatuh Tempo
            </label>
            <Input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metode Pembayaran
            </label>
            <SearchableSelect
              value={formData.payment_method}
              onValueChange={(val) => setFormData(prev => ({ ...prev, payment_method: val }))}
              options={[
                { value: "", label: "Pilih Metode Pembayaran" },
                { value: "BANK_TRANSFER", label: "Transfer Bank" },
                { value: "CREDIT_CARD", label: "Kartu Kredit" },
                { value: "DEBIT_CARD", label: "Kartu Debit" },
                { value: "E_WALLET", label: "E-Wallet" },
                { value: "CASH", label: "Tunai" }
              ]}
              placeholder="Pilih Metode Pembayaran"
              searchPlaceholder="Cari metode pembayaran..."
              triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Referensi Pembayaran
            </label>
            <Input
              type="text"
              value={formData.payment_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_reference: e.target.value }))}
              placeholder="Masukkan referensi pembayaran (opsional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nomor Invoice
            </label>
            <Input
              type="text"
              value={formData.invoice_number}
              onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
              placeholder="Masukkan nomor invoice (opsional)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deskripsi
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Masukkan deskripsi tagihan (opsional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
            />
          </div>

        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowEditModal(false);
              setSelectedBilling(null);
              resetForm();
            }}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateBilling}
            disabled={loading || !formData.subscription_id || !formData.amount || !formData.due_date}
          >
            {loading ? 'Menyimpan...' : 'Update Tagihan'}
          </Button>
        </div>
      </Modal>

      {/* Generate Monthly Billing Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Tagihan Bulanan"
        size="md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bulan
              </label>
              <SearchableSelect
                value={generateData.month.toString()}
                onValueChange={(val) => setGenerateData(prev => ({ ...prev, month: parseInt(val) }))}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: (i + 1).toString(),
                  label: new Date(0, i).toLocaleString('id-ID', { month: 'long' })
                }))}
                placeholder="Pilih Bulan"
                searchPlaceholder="Cari bulan..."
                triggerClassName="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tahun
              </label>
              <Input
                type="number"
                value={generateData.year}
                onChange={(e) => setGenerateData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                placeholder="Tahun"
                min={2020}
                max={2030}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subscription ID
            </label>
            <Input
              type="text"
              placeholder="Masukkan ID subscription"
              value={generateData.subscription_id}
              onChange={(e) => setGenerateData(prev => ({ 
                ...prev, 
                subscription_id: e.target.value
              }))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              ID subscription yang akan di-generate billing-nya
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowGenerateModal(false)}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerateMonthlyBilling}
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Tagihan'}
          </Button>
        </div>
      </Modal>

      {/* New Billing Form Modal */}
      <BillingFormModal
        isOpen={showBillingFormModal}
        onClose={() => setShowBillingFormModal(false)}
        onSuccess={() => {
          loadBillingData();
          setSuccess('Tagihan berhasil dibuat');
        }}
      />
    </SuperAdminPageLayout>
  );
}
