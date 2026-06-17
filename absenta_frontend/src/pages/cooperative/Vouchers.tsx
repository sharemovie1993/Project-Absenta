import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../lib/axiosInstance';
import { Button } from '../../components/cooperative/ui/Button';
import { Input } from '../../components/cooperative/ui/Input';
import { Table } from '../../components/cooperative/ui/Table';
import { Card } from '../../components/cooperative/ui/Card';
import { Plus, Trash, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import useConfirm from '../../hooks/useConfirm';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { printCoopReceipt, fetchCoopSettings, type CoopSettingsData } from '../../utils/cooperative/coopDocUtils';

export interface Voucher {
  id: string;
  code: string;
  description: string;
  discount: string;
  validUntil: string | null;
}

export interface PointTransaction {
  id: string;
  createdAt: string;
  description: string;
  type: string;
  amount: number;
}

export interface SaleItem {
  id: string;
  price: string | number;
  quantity: number;
  product?: {
    name: string;
    code: string;
  };
}

export interface SaleRecord {
  id: string;
  date: string;
  paymentMethod: string;
  discount: number;
  total: number;
  cashAmount?: number;
  changeAmount?: number;
  voucherCode?: string;
  items?: SaleItem[];
}

export interface MemberInfo {
  id: string;
  memberNo: string;
  status: string;
  User?: {
    full_name: string;
  };
}

const VoucherMemberView = lazy(() =>
  import('../../components/cooperative/vouchers/VoucherMemberView').then(module => ({ default: module.VoucherMemberView }))
);

const ReceiptModal = lazy(() =>
  import('../../components/cooperative/vouchers/ReceiptModal').then(module => ({ default: module.ReceiptModal }))
);

const Vouchers: React.FC = () => {
  const { user, subscription } = useAuthStore();
  const confirm = useConfirm();
  const location = useLocation();
  const isManageRoute = location.pathname.endsWith('/manage');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount: '',
    validUntil: ''
  });

  // Member points & tier states
  const [mySavingsSum, setMySavingsSum] = useState<number>(0);
  const [myPoints, setMyPoints] = useState<number>(0);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [pointsLoading, setPointsLoading] = useState<boolean>(true);
  const [redeemLoading, setRedeemLoading] = useState<boolean>(false);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [memberInfo, setMemberInfo] = useState<MemberInfo | null>(null);
  const [coopSettings, setCoopSettings] = useState<CoopSettingsData | null>(null);

  // Admin Table Pagination and Sorting states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortKey, setSortKey] = useState<string>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Gating Logic
  const features = (subscription as { features?: string[]; Plan?: { features_json?: string[] }; plan?: { features_json?: string[] } })?.features || 
                   subscription?.Plan?.features_json || 
                   subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  const hasManageAccess = useMemo(() => {
    return user?.capabilities?.includes('cooperative.vouchers.manage') || false;
  }, [user]);

  const hasViewListAccess = useMemo(() => {
    return user?.capabilities?.includes('cooperative.vouchers.view.list') || 
           user?.capabilities?.includes('cooperative.vouchers.manage') || false;
  }, [user]);

  const adminInstruction = {
    title: "Panduan Manajemen Voucher",
    description: "Kelola kode voucher belanja dan potongan harga bagi pelanggan koperasi.",
    items: [
      { text: "Tentukan kode voucher unik (kapital) dan tentukan nominal potongan dalam Rupiah." },
      { text: "Atur tanggal kedaluwarsa jika promo hanya berlaku pada periode tertentu." }
    ]
  };

  const auditInstruction = {
    title: "Panduan Audit & Daftar Voucher",
    description: "Tinjau dan audit seluruh kode voucher belanja serta potongan harga aktif di koperasi.",
    items: [
      { text: "Daftar di bawah memuat semua voucher belanja yang diterbitkan oleh pengurus." },
      { text: "Voucher hasil penukaran poin loyalitas anggota juga terdaftar secara transparan di sini." }
    ]
  };

  const memberInstruction = {
    title: "Panduan Benefit & Poin",
    description: "Kumpulkan poin belanja dan klaim diskon belanja menarik.",
    items: [
      { text: "Setiap belanja atau setoran simpanan kelipatan Rp 10.000 menghasilkan 1 poin." },
      { text: "Tukarkan poin Anda dengan voucher belanja yang tersedia di bawah." }
    ]
  };

  const fetchVouchers = useCallback(async () => {
    if (isLocked) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get('/cooperative/vouchers');
      setVouchers(res.data.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengambil data voucher');
    } finally {
      setLoading(false);
    }
  }, [isLocked]);

  const fetchMemberData = useCallback(async () => {
    try {
      const savingsRes = await api.get('/cooperative/savings');
      const savingsList = savingsRes.data || [];
      const totalMySavings = savingsList.reduce((sum: number, s: { amount?: string | number }) => sum + Number(s.amount || 0), 0);
      setMySavingsSum(totalMySavings);
    } catch (err) {
      console.error('Failed to fetch personal savings:', err);
    }
  }, []);

  const fetchPointsData = useCallback(async () => {
    if (isLocked) return;
    try {
      setPointsLoading(true);
      const res = await api.get('/cooperative/points/my-history');
      if (res.data && res.data.success) {
        setMyPoints(res.data.balance || 0);
        setPointHistory(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch points data:', err);
    } finally {
      setPointsLoading(false);
    }
  }, [isLocked]);

  const handleRedeemPoints = useCallback(async (pointsToRedeem: number) => {
    if (isLocked) return;
    setRedeemLoading(true);
    try {
      const res = await api.post('/cooperative/points/redeem', { points: pointsToRedeem });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Penukaran poin berhasil!');
        fetchPointsData();
        fetchVouchers();
      }
    } catch (err: unknown) {
      console.error('Failed to redeem points:', err);
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || 'Gagal menukarkan poin.');
    } finally {
      setRedeemLoading(false);
    }
  }, [isLocked, fetchPointsData, fetchVouchers]);

  const fetchSalesHistory = useCallback(async () => {
    try {
      setSalesLoading(true);
      const res = await api.get('/cooperative/toko/history');
      setSalesHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
    } finally {
      setSalesLoading(false);
    }
  }, []);

  const loadCoopSettings = useCallback(async () => {
    const data = await fetchCoopSettings();
    setCoopSettings(data);
  }, []);

  const fetchMemberInfo = useCallback(async () => {
    try {
      const res = await api.get('/cooperative/members/me');
      if (res.data?.success) {
        setMemberInfo(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch member info:', err);
    }
  }, []);

  const printReceipt = useCallback((sale: SaleRecord) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || user?.full_name || 'Tamu';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  }, [coopSettings, memberInfo, user]);

  useEffect(() => {
    if (subscription === undefined) return;
    fetchVouchers();
    if (!isManageRoute || !hasViewListAccess) {
      fetchMemberData();
      fetchPointsData();
      fetchSalesHistory();
      loadCoopSettings();
      fetchMemberInfo();
    }
  }, [subscription, isLocked, isManageRoute, hasViewListAccess, fetchVouchers, fetchMemberData, fetchPointsData, fetchSalesHistory, loadCoopSettings, fetchMemberInfo]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (isLocked) return;
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/cooperative/vouchers', { ...formData, code: formData.code.toUpperCase() });
      toast.success('Voucher berhasil dibuat');
      setFormData({ code: '', description: '', discount: '', validUntil: '' });
      fetchVouchers();
    } catch (error) {
      toast.error('Gagal membuat voucher');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = useCallback(async (id: string) => {
    if (isLocked) return;
    const isConfirmed = await confirm({
      title: 'Hapus Voucher',
      description: 'Apakah Anda yakin ingin menghapus voucher ini? Tindakan ini tidak dapat dibatalkan.',
      style: 'danger'
    });
    if (!isConfirmed) return;
    try {
      await api.delete(`/cooperative/vouchers/${id}`);
      toast.success('Voucher dihapus');
      fetchVouchers();
    } catch (error) {
      toast.error('Gagal menghapus voucher');
    }
  }, [isLocked, confirm, fetchVouchers]);

  // Admin Vouchers List sorting
  const handleSort = useCallback((key: string) => {
    setSortDirection(prev => {
      if (sortKey === key) {
        return prev === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    });
    setSortKey(key);
  }, [sortKey]);

  const sortedVouchers = useMemo(() => {
    const sorted = [...vouchers];
    sorted.sort((a, b) => {
      let valA: string | number = a[sortKey as keyof Voucher] ?? '';
      let valB: string | number = b[sortKey as keyof Voucher] ?? '';
      if (sortKey === 'discount') {
        valA = Number(a.discount);
        valB = Number(b.discount);
      }
      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [vouchers, sortKey, sortDirection]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(sortedVouchers.length / limit));
  }, [sortedVouchers, limit]);

  const paginatedVouchers = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return sortedVouchers.slice(startIndex, startIndex + limit);
  }, [sortedVouchers, page, limit]);

  const columns = useMemo(() => {
    const baseCols = [
      { header: 'Kode', accessor: 'code' as keyof Voucher, className: 'font-mono font-bold text-blue-600', sortable: true, sortKey: 'code' },
      { header: 'Diskon', accessor: (row: Voucher) => `Rp ${Number(row.discount).toLocaleString('id-ID')}`, sortable: true, sortKey: 'discount' },
      { header: 'Keterangan', accessor: 'description' as keyof Voucher, sortable: true, sortKey: 'description' },
      { header: 'Berlaku Sampai', accessor: (row: Voucher) => row.validUntil ? new Date(row.validUntil).toLocaleDateString('id-ID') : '-', sortable: true, sortKey: 'validUntil' },
    ];
    if (hasManageAccess) {
      baseCols.push({
        header: 'Aksi',
        accessor: (row: Voucher) => (
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.id)} icon={<Trash size={14} />} />
        )
      } as any);
    }
    return baseCols;
  }, [hasManageAccess, handleDelete]);

  return (
    <PremiumFeatureGate 
      isLocked={isLocked} 
      moduleName="KOPERASI" 
      featureName="Manajemen Voucher & Promo"
    >
      <AcademicPageLayout
        title={isManageRoute 
          ? (hasManageAccess ? "Manajemen Voucher & Promo" : "Audit & Daftar Voucher") 
          : "Poin & Benefit Anggota"}
        description={isManageRoute 
          ? (hasManageAccess ? "Kelola kode voucher dan promo koperasi" : "Daftar dan audit seluruh kode voucher promo aktif koperasi") 
          : "Kumpulkan poin dari simpanan Anda dan nikmati promo voucher menarik"}
        hardeningModuleKey="coop_vouchers"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Voucher & Benefit', path: isManageRoute ? '/cooperative/vouchers/manage' : '/cooperative/vouchers' }
        ]}
        instruction={isManageRoute 
          ? (hasManageAccess ? adminInstruction : auditInstruction) 
          : memberInstruction}
      >
        {isManageRoute && hasViewListAccess ? (
          /* ======================================================================= */
          /* ── TAMPILAN PENGURUS/OPERASI (MANAJEMEN & AUDIT VOUCHER) ─────────────── */
          /* ======================================================================= */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Form - Hanya untuk manage access */}
              {hasManageAccess && (
                <div className="md:col-span-1">
                  <Card title="Buat Voucher Baru">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <Input
                        label="Kode Voucher"
                        name="code"
                        value={formData.code}
                        onChange={handleInputChange}
                        required
                        placeholder="CONTOH: PROMO10"
                        className="uppercase"
                      />
                      <Input
                        label="Nominal Diskon (Rp)"
                        name="discount"
                        type="number"
                        value={formData.discount}
                        onChange={handleInputChange}
                        required
                        placeholder="10000"
                      />
                      <Input
                        label="Keterangan"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Deskripsi promo..."
                      />
                      <Input
                        label="Berlaku Sampai (Opsional)"
                        name="validUntil"
                        type="date"
                        value={formData.validUntil}
                        onChange={handleInputChange}
                      />
                      <Button 
                        type="submit" 
                        className="w-full"
                        isLoading={submitLoading}
                        icon={<Plus size={18} />}
                      >
                        Simpan Voucher
                      </Button>
                    </form>
                  </Card>
                </div>
              )}

              {/* List */}
              <div className={hasManageAccess ? "md:col-span-2" : "md:col-span-3"}>
                <Table 
                  data={paginatedVouchers} 
                  columns={columns} 
                  keyField="id" 
                  isLoading={loading}
                  emptyMessage="Belum ada voucher aktif."
                  sortKey={sortKey}
                  sortDirection={sortDirection}
                  onSort={handleSort}
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  limit={limit}
                  onLimitChange={setLimit}
                  toolbarLeft={
                    <div className="flex items-center gap-2">
                      <Tag className="text-blue-500 w-5 h-5" />
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Daftar Voucher Koperasi</h3>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================================= */
          /* ── TAMPILAN ANGGOTA (POIN & BENEFIT) ─────────────────────────────────── */
          /* ======================================================================= */
          <Suspense fallback={
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-4 border-indigo-650/20 border-t-indigo-650 rounded-full animate-spin"></div>
            </div>
          }>
            <VoucherMemberView
              user={user}
              vouchers={vouchers}
              loading={loading}
              mySavingsSum={mySavingsSum}
              myPoints={myPoints}
              pointHistory={pointHistory}
              pointsLoading={pointsLoading}
              redeemLoading={redeemLoading}
              salesHistory={salesHistory}
              salesLoading={salesLoading}
              memberInfo={memberInfo}
              handleRedeemPoints={handleRedeemPoints}
              printReceipt={printReceipt}
              setSelectedSale={setSelectedSale}
              setShowReceiptModal={setShowReceiptModal}
            />
          </Suspense>
        )}
      </AcademicPageLayout>

      {/* ── Detail Struk Belanja Modal ─────────────────────────────── */}
      <Suspense fallback={null}>
        <ReceiptModal
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            setSelectedSale(null);
          }}
          selectedSale={selectedSale}
          coopSettings={coopSettings}
          memberInfo={memberInfo}
          user={user}
          printReceipt={printReceipt}
        />
      </Suspense>
    </PremiumFeatureGate>
  );
};

export default Vouchers;
