import React, { useEffect, useState } from 'react';
import { Users, Wallet, TrendingUp, AlertCircle, Bell, UserX, UserCheck, Award, ShoppingCart, Eye, Printer, Check, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../lib/axiosInstance';
import { SectionCard, Table, Button, Modal } from '../../components/ui';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { printCoopReceipt, fetchCoopSettings } from '../../utils/cooperative/coopDocUtils';
import { NonMemberBanner } from '../../components/cooperative/shared/NonMemberBanner';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; subtext?: string }> = ({ title, value, icon, color, subtext }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    'bg-indigo-600': { 
      bg: 'from-indigo-500/10 via-indigo-600/5', 
      border: 'border-indigo-100/40 dark:border-indigo-900/20', 
      text: 'text-indigo-600 dark:text-indigo-400',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40'
    },
    'bg-emerald-600': { 
      bg: 'from-emerald-500/10 via-emerald-600/5', 
      border: 'border-emerald-100/40 dark:border-emerald-900/20', 
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40'
    },
    'bg-amber-600': { 
      bg: 'from-amber-500/10 via-amber-600/5', 
      border: 'border-amber-100/40 dark:border-amber-900/20', 
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40'
    },
    'bg-rose-600': { 
      bg: 'from-rose-500/10 via-rose-600/5', 
      border: 'border-rose-100/40 dark:border-rose-900/20', 
      text: 'text-rose-600 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40'
    },
  };

  const style = colorMap[color] || colorMap['bg-indigo-600'];

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.bg} to-transparent border ${style.border} p-5 flex items-center justify-between shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group`}>
      <div className="space-y-1">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</h3>
        <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-100">{value}</p>
        {subtext && <p className="text-[10px] text-slate-400">{subtext}</p>}
      </div>
      <div className={`p-3.5 ${style.iconBg} ${style.text} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-inner`}>
        {icon}
      </div>
    </div>
  );
};

const StrukBadge: React.FC<{ id: string }> = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success('ID Struk disalin!');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-650 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-sm font-semibold"
    >
      <span>#{id.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-500 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
};

const Dashboard: React.FC = () => {
  const { user, subscription, isSuperAdmin } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalSavings: 0,
    totalLoans: 0,
    dueInstallments: 0
  });
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberStatus, setMemberStatus] = useState<'loading' | 'member' | 'non-member'>('loading');
  const [mySavingsSum, setMySavingsSum] = useState<number>(0);
  const [myShuSum, setMyShuSum] = useState<number>(0);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [memberInfo, setMemberInfo] = useState<any>(null);
  const [coopSettings, setCoopSettings] = useState<any>(null);

  // Identifikasi role pengguna
  const roleName: string = (user as any)?.roleName || (user as any)?.Role?.name || (user as any)?.role?.name || '';
  const isGuruOrSiswa = (roleName === 'GURU' || roleName === 'SISWA') && !isSuperAdmin();

  // Gating Logic
  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('KOPERASI');

  // Dummy data for chart - in production, fetch this from API
  const chartData = [
    { name: 'Jan', simpanan: 4000000, pinjaman: 2400000 },
    { name: 'Feb', simpanan: 3000000, pinjaman: 1398000 },
    { name: 'Mar', simpanan: 2000000, pinjaman: 9800000 },
    { name: 'Apr', simpanan: 2780000, pinjaman: 3908000 },
    { name: 'May', simpanan: 1890000, pinjaman: 4800000 },
    { name: 'Jun', simpanan: 2390000, pinjaman: 3800000 },
  ];

  const fetchData = async () => {
    // SECURITY: Do not fetch data if the module is locked for CORE_PLATFORM
    if (isLocked) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const statsRes = await api.get('/cooperative/dashboard/stats');
      const raw = statsRes.data.data || {};
      setStats({
        totalMembers: Number(raw.totalMembers) || 0,
        totalSavings: Number(raw.totalSavings) || 0,
        totalLoans: Number(raw.totalLoans) || 0,
        dueInstallments: Number(raw.dueInstallments) || 0,
      });
      
      try {
        const annRes = await api.get('/cooperative/announcements');
        const annList = annRes.data.data;
        setAnnouncements(Array.isArray(annList) ? annList : []);
      } catch {
        // Announcements API may not exist yet — silently ignore
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subscription === undefined) return;
    fetchData();
  }, [subscription, isLocked]);

  const fetchSalesHistory = async () => {
    try {
      setSalesLoading(true);
      const res = await api.get('/cooperative/toko/history');
      setSalesHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch sales history:', err);
      toast.error('Gagal memuat riwayat belanja');
    } finally {
      setSalesLoading(false);
    }
  };

  const loadCoopSettings = async () => {
    const data = await fetchCoopSettings();
    setCoopSettings(data);
  };

  const printReceipt = (sale: any) => {
    if (!sale || !coopSettings) return;
    const rawName = memberInfo?.User?.full_name || user?.full_name || 'Tamu';
    const rawMemberNo = memberInfo?.memberNo || '';
    printCoopReceipt(sale, coopSettings, rawName, rawMemberNo, 'Mandiri');
  };

  // Cek status keanggotaan koperasi untuk GURU/SISWA
  useEffect(() => {
    if (!isGuruOrSiswa) {
      // Operator/pengurus koperasi tidak perlu dicek — langsung anggap ok
      setMemberStatus('member');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/cooperative/members/me');
        if (!cancelled) {
          const data = res?.data?.data;
          setMemberInfo(data);
          setMemberStatus(data && data.status === 'ACTIVE' ? 'member' : 'non-member');
        }
      } catch {
        if (!cancelled) {
          setMemberStatus('non-member');
          setMemberInfo(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isGuruOrSiswa]);

  useEffect(() => {
    if (memberStatus === 'member') {
      const fetchPersonalData = async () => {
        try {
          const savingsRes = await api.get('/cooperative/savings');
          const totalMySavings = (savingsRes.data || []).reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
          setMySavingsSum(totalMySavings);
        } catch (err) {
          console.error('Failed to fetch personal savings:', err);
        }
        
        try {
          const shuRes = await api.get('/cooperative/shu/my-history');
          if (shuRes.data?.success) {
            const totalMyShu = (shuRes.data.data || []).reduce((sum: number, h: any) => sum + Number(h.totalShu || 0), 0);
            setMyShuSum(totalMyShu);
          }
        } catch (err) {
          console.error('Failed to fetch personal SHU:', err);
        }
      };
      fetchPersonalData();
      fetchSalesHistory();
      loadCoopSettings();
    }
  }, [memberStatus]);

  if (loading) {
      return <div className="flex justify-center items-center h-64 text-gray-500">Loading Dashboard...</div>;
  }

  return (
    <PremiumFeatureGate 
      moduleName="KOPERASI" 
      featureName="Dashboard Koperasi"
    >
      <AcademicPageLayout
        title="Dashboard Koperasi"
        description="Ringkasan aktivitas dan performa koperasi hari ini"
        hardeningModuleKey="coop_dashboard"
        breadcrumbs={[
          { label: 'Koperasi', path: '/cooperative' },
          { label: 'Dashboard', path: '/cooperative/dashboard' },
        ]}
        instruction={{
          title: 'Panduan Dashboard Koperasi',
          description: 'Pantau statistik anggota, simpanan, pinjaman, dan aktivitas belanja dalam satu layar.',
          items: [
            { text: 'Lihat ringkasan total anggota dan sirkulasi dana pada kartu statistik.' },
            { text: 'Pantau grafik simpanan vs pinjaman untuk melihat tren keuangan.' },
            { text: 'Gunakan fitur pengumuman untuk menyebarkan informasi kepada anggota.' },
            { text: 'Riwayat belanja Anda tersedia di bagian bawah jika Anda adalah anggota aktif.' },
          ],
        }}
      >
        <div className="space-y-8">

        {/* ── Banner Status Keanggotaan Koperasi ─────────────────────────────── */}
        {isGuruOrSiswa && memberStatus === 'non-member' && (
          <NonMemberBanner />
        )}

        {isGuruOrSiswa && memberStatus === 'member' && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium shadow-sm">
            <UserCheck className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>Anda terdaftar sebagai <strong>Anggota Aktif</strong> Koperasi Sekolah. Akses penuh telah diaktifkan.</span>
          </div>
        )}

        {isGuruOrSiswa && memberStatus === 'member' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Total Simpanan Saya" 
              value={`Rp ${mySavingsSum.toLocaleString('id-ID')}`} 
              icon={<Wallet size={24} />} 
              color="bg-emerald-600" 
              subtext="Saldo tabungan aktif Anda"
            />

            <StatCard 
              title="SHU Diterima Saya" 
              value={`Rp ${myShuSum.toLocaleString('id-ID')}`} 
              icon={<Award size={24} />} 
              color="bg-indigo-600" 
              subtext="Total SHU yang sudah cair"
            />

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-2">
              <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Pintasan Layanan</h3>
              <div className="flex gap-2">
                <a href="/cooperative/savings" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 px-3 py-1.5 rounded-lg transition-colors">
                  Mutasi Tabungan &rarr;
                </a>
                <a href="/cooperative/shu" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg transition-colors">
                  Detail SHU Saya &rarr;
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title="Total Anggota" 
              value={stats.totalMembers.toString()} 
              icon={<Users size={24} />} 
              color="bg-indigo-600" 
              subtext="Anggota terdaftar"
            />
            <StatCard 
              title="Total Simpanan" 
              value={`Rp ${parseFloat(stats.totalSavings.toString()).toLocaleString('id-ID')}`} 
              icon={<Wallet size={24} />} 
              color="bg-emerald-600" 
              subtext="Dana terkumpul"
            />
            <StatCard 
              title="Pinjaman Aktif" 
              value={`Rp ${parseFloat(stats.totalLoans.toString()).toLocaleString('id-ID')}`} 
              icon={<TrendingUp size={24} />} 
              color="bg-amber-600" 
              subtext="Sirkulasi dana"
            />
            <StatCard 
              title="Jatuh Tempo" 
              value={stats.dueInstallments.toString()} 
              icon={<AlertCircle size={24} />} 
              color="bg-rose-600" 
              subtext="Tagihan bulan ini"
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {!isGuruOrSiswa ? (
            <>
              <div className="lg:col-span-2">
                <SectionCard title="Pertumbuhan Aset (6 Bulan Terakhir)" fullWidth noPadding>
                  <div className="h-80 p-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                        <Tooltip 
                          formatter={(value: any) => `Rp ${Number(value).toLocaleString('id-ID')}`} 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar dataKey="simpanan" name="Simpanan" fill="#10B981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pinjaman" name="Pinjaman" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              </div>

              <div className="lg:col-span-1">
                <SectionCard title="Pengumuman Terbaru" fullWidth noPadding>
                  <div className="space-y-4 p-6">
                    {announcements.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">Tidak ada pengumuman.</p>
                    ) : (
                      announcements.slice(0, 3).map((ann, idx) => (
                        <div key={idx} className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-blue-500">
                          <div className="flex items-start">
                            <Bell className="text-blue-500 mt-1 mr-3 flex-shrink-0" size={16} />
                            <div>
                              <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{ann.title}</h4>
                              <p className="text-gray-650 dark:text-gray-400 text-xs mt-1 line-clamp-2">{ann.content}</p>
                              <p className="text-gray-400 text-[10px] mt-2 text-right">
                                {new Date(ann.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          ) : (
            <div className="lg:col-span-3 space-y-6">
              <SectionCard title="Pengumuman Koperasi Sekolah" fullWidth noPadding>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
                  {announcements.length === 0 ? (
                    <p className="col-span-3 text-gray-500 text-center py-8">Tidak ada pengumuman baru saat ini.</p>
                  ) : (
                    announcements.slice(0, 3).map((ann, idx) => (
                      <div key={idx} className="bg-blue-50/50 dark:bg-blue-950/10 p-5 rounded-2xl border border-blue-100/50 dark:border-blue-900/20 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="p-1.5 bg-blue-500 text-white rounded-lg">
                              <Bell size={12} />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">PENGUMUMAN</span>
                          </div>
                          <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-tight line-clamp-1">{ann.title}</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-2 line-clamp-4 leading-relaxed">{ann.content}</p>
                        </div>
                        <p className="text-slate-400 text-[9px] mt-4 font-bold">
                          Diterbitkan: {new Date(ann.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </SectionCard>

              {memberStatus === 'member' && (
                <SectionCard title="Riwayat Belanja Saya" fullWidth noPadding>
                  <div className="p-6">
                    <Table
                      data={salesHistory}
                      keyField="id"
                      isLoading={salesLoading}
                      emptyMessage="Anda belum memiliki riwayat transaksi belanja."
                      columns={[
                        {
                          header: 'Tanggal',
                          accessor: (row: any) => new Date(row.date).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }),
                        },
                        {
                          header: 'ID Struk',
                          accessor: (row: any) => <StrukBadge id={row.id} />,
                        },
                        {
                          header: 'Metode Pembayaran',
                          accessor: (row: any) => (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              row.paymentMethod === 'SAVING' 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
                            }`}>
                              {row.paymentMethod === 'SAVING' ? 'Tabungan' : 'Tunai'}
                            </span>
                          ),
                        },
                        {
                          header: 'Diskon',
                          accessor: (row: any) => row.discount > 0 ? (
                            <span className="text-red-650 dark:text-red-400 font-bold">
                              -Rp {Number(row.discount).toLocaleString('id-ID')}
                            </span>
                          ) : '-',
                        },
                        {
                          header: 'Total Belanja',
                          accessor: (row: any) => (
                            <span className="font-extrabold text-slate-800 dark:text-slate-100">
                              Rp {Number(row.total).toLocaleString('id-ID')}
                            </span>
                          ),
                        },
                        {
                          header: 'Aksi',
                          accessor: (row: any) => (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="hover:scale-105 active:scale-95 transition-all py-1 px-2.5 text-xs"
                                onClick={() => {
                                  setSelectedSale(row);
                                  setShowReceiptModal(true);
                                }}
                              >
                                Detail
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transition-all py-1 px-2.5 text-xs shadow-sm hover:shadow-blue-500/10"
                                icon={<Printer size={13} />}
                                onClick={() => printReceipt(row)}
                              >
                                Cetak
                              </Button>
                            </div>
                          ),
                        }
                      ]}
                    />
                  </div>
                </SectionCard>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Struk Belanja Modal ─────────────────────────────── */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          setSelectedSale(null);
        }}
        title="Detail Struk Belanja"
        size="md"
      >
        {selectedSale && (
          <div className="space-y-6">
            {/* Visual receipt layout */}
            <div className="bg-[#FCFBF7] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-lg max-w-sm mx-auto font-mono text-sm text-slate-800 dark:text-slate-200">
              <div className="text-center space-y-1">
                <h4 className="font-extrabold text-base text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {coopSettings?.cooperative_name || 'KOPERASI SEKOLAH'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {coopSettings?.cooperative_address || 'Kantin & Minimarket'}
                </p>
                {coopSettings?.cooperative_phone && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Telp: {coopSettings.cooperative_phone}
                  </p>
                )}
                <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                  {new Date(selectedSale.date).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

              <div className="space-y-1 text-xs font-semibold">
                <div className="flex justify-between">
                  <span className="text-slate-400">No Struk:</span>
                  <span className="text-slate-950 dark:text-slate-50 font-bold">#{selectedSale.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Pembeli:</span>
                  <span className="text-slate-900 dark:text-slate-100">
                    {memberInfo?.User?.full_name || user?.full_name || 'Tamu'}{' '}
                    {memberInfo?.memberNo ? `(${memberInfo.memberNo})` : ''}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

              {/* Items List */}
              <div className="space-y-3">
                {selectedSale.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <div className="flex-1 pr-4">
                      <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {item.product?.name || 'Produk'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className="font-extrabold text-slate-950 dark:text-slate-50 shrink-0">
                      Rp {(Number(item.price) * item.quantity).toLocaleString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

              {/* Summary */}
              <div className="space-y-1.5 text-xs font-semibold">
                {selectedSale.discount > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400 font-bold">
                    <span>DISKON VOUCHER ({selectedSale.voucherCode})</span>
                    <span>-Rp {Number(selectedSale.discount).toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-950 dark:text-slate-50 text-sm pt-1">
                  <span>TOTAL</span>
                  <span>Rp {Number(selectedSale.total).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1">
                  <span>Metode Bayar:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {selectedSale.paymentMethod === 'SAVING' ? 'Tabungan' : 'Tunai'}
                  </span>
                </div>
                {selectedSale.paymentMethod === 'CASH' && (
                  <>
                    <div className="flex justify-between text-slate-400">
                      <span>Tunai Diterima:</span>
                      <span className="text-slate-700 dark:text-slate-300">Rp {Number(selectedSale.cashAmount || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Kembalian:</span>
                      <span className="text-slate-700 dark:text-slate-300">Rp {Number(selectedSale.changeAmount || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Points Earned Banner */}
              {selectedSale.total >= 10000 && (
                <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-xs px-3 py-2 rounded-xl flex items-center justify-between border border-emerald-100 dark:border-emerald-900/30">
                  <span className="flex items-center gap-1 font-bold">
                    <Award size={14} className="animate-pulse text-emerald-500" /> Poin Diperoleh:
                  </span>
                  <span className="font-extrabold">+{Math.floor(selectedSale.total / 10000)} Poin</span>
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 dark:border-slate-800 my-4" />

              <div className="text-center text-[10px] text-slate-400 font-bold space-y-0.5 tracking-wide uppercase">
                <p>Terima Kasih</p>
                <p>Selamat Belanja Kembali</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              <Button
                variant="outline"
                className="hover:scale-105 active:scale-95 transition-all text-xs"
                onClick={() => {
                  setShowReceiptModal(false);
                  setSelectedSale(null);
                }}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 transition-all text-xs shadow-sm"
                icon={<Printer size={16} />}
                onClick={() => printReceipt(selectedSale)}
              >
                Cetak Struk
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

export default Dashboard;


