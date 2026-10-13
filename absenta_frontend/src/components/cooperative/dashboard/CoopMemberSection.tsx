import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wallet, 
  Award, 
  UserCheck, 
  Bell, 
  Printer, 
  Check, 
  Copy, 
  Clock, 
  ShoppingBag,
  ExternalLink 
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { SectionCard, Table, Button } from '@/components/ui';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { NonMemberBanner } from '@/components/cooperative/shared/NonMemberBanner';
import { formatDate } from '@/utils/date.utils';
import type { Sale, SaleItem } from '@/components/cooperative/types';
import type { CoopMemberSectionProps } from './types';

const StrukBadge: React.FC<{ id: string }> = ({ id: receiptId }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(receiptId);
    setCopied(true);
    toast.success('ID Struk disalin!');
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center gap-1 shadow-sm font-semibold cursor-pointer"
      title="Salin ID Struk"
    >
      <span>#{receiptId.slice(0, 8)}</span>
      {copied ? <Check size={11} className="text-emerald-500 animate-bounce" /> : <Copy size={11} className="opacity-40" />}
    </button>
  );
};

export const CoopMemberSection: React.FC<CoopMemberSectionProps> = React.memo(({
  memberStatus,
  memberInfo,
  user,
  mySavingsSum,
  myShuSum,
  announcements,
  salesHistory,
  salesLoading,
  printReceipt,
}) => {
  const [salesPage, setSalesPage] = useState(1);
  const salesPageLimit = 10;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Banner Status Keanggotaan Koperasi ─────────────────────────────── */}
      {memberStatus === 'non-member' && (
        <NonMemberBanner />
      )}

      {memberStatus === 'member' && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/40 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm font-medium shadow-sm">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>
              Anda terdaftar sebagai <strong>Anggota Aktif</strong> Koperasi Sekolah. Semua hak dan layanan keanggotaan aktif.
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-bold uppercase tracking-wider bg-emerald-600 text-white px-2.5 py-0.5 rounded-full">
            No. Anggota: {memberInfo?.memberNo || '—'}
          </span>
        </div>
      )}

      {/* ── SECTION 1: Ringkasan Saldo Simpanan, SHU & Identitas Anggota ─────────────────────────────── */}
      {memberStatus === 'member' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AnalyticsCard 
              title="Total Simpanan Saya" 
              value={`Rp ${mySavingsSum.toLocaleString('id-ID')}`} 
              icon={<Wallet size={24} />} 
              gradient="from-emerald-500 to-emerald-700 text-white border-emerald-400/30" 
              subtitle="Saldo tabungan aktif Anda"
            />

            <AnalyticsCard 
              title="SHU Diterima Saya" 
              value={`Rp ${myShuSum.toLocaleString('id-ID')}`} 
              icon={<Award size={24} />} 
              gradient="from-indigo-500 to-indigo-700 text-white border-indigo-400/30" 
              subtitle="Total SHU yang sudah cair"
            />

            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center gap-2">
              <h3 className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                Pintasan Layanan
              </h3>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link 
                  to="/cooperative/savings" 
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1"
                >
                  <span>Mutasi Tabungan</span>
                  <ExternalLink size={12} />
                </Link>
                <Link 
                  to="/cooperative/shu" 
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1"
                >
                  <span>Detail SHU Saya</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  {memberInfo?.User?.full_name || memberInfo?.name || user?.full_name || 'Anggota Koperasi'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No. Anggota: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{memberInfo?.memberNo || '—'}</span> &bull; Status: <span className="text-emerald-500 font-bold">AKTIF</span>
                </p>
              </div>
            </div>

            <div className="hidden sm:block text-right">
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Keanggotaan Absenta</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Terverifikasi</span>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 2: Pengumuman Koperasi Sekolah ─────────────────────────────── */}
      <div className="space-y-4">
        <SectionCard title="Pengumuman Koperasi Sekolah" fullWidth noPadding>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
            {announcements.length === 0 ? (
              <p className="col-span-3 text-gray-500 text-center py-8">Tidak ada pengumuman baru saat ini.</p>
            ) : (
              announcements?.slice(0, 3)?.map((ann, idx) => (
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
                    Diterbitkan: {formatDate(ann.created_at || (ann as { createdAt?: string }).createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>

      {/* Divider */}
      <hr className="border-slate-200 dark:border-slate-800" />

      {/* ── SECTION 3: Riwayat Transaksi Belanja Kasir Toko & Benefit ─────────────────────────────── */}
      {memberStatus === 'member' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SectionCard title="Riwayat Belanja Saya" fullWidth noPadding>
              <div className="p-6">
                <Table
                  data={(salesHistory ?? []).slice((salesPage - 1) * salesPageLimit, salesPage * salesPageLimit)}
                  loading={salesLoading}
                  emptyMessage="Anda belum memiliki riwayat transaksi belanja."
                  pagination={{
                    currentPage: salesPage,
                    totalPages: Math.max(1, Math.ceil((salesHistory ?? []).length / salesPageLimit)),
                    totalItems: (salesHistory ?? []).length,
                    itemsPerPage: salesPageLimit,
                    onPageChange: (p) => setSalesPage(p),
                    onLimitChange: () => {}
                  }}
                  columns={[
                    {
                      label: 'Tanggal & Jam',
                      key: 'date',
                      sortable: true,
                      render: (date: string, row: Sale) => {
                        const raw = date || (row as { created_at?: string })?.created_at;
                        if (!raw) return '-';
                        try {
                          return (
                            <div className="flex items-center gap-1 text-xs">
                              <Clock size={12} className="text-slate-400" />
                              <span>{format(new Date(raw), 'dd/MM/yyyy HH:mm', { locale: id })}</span>
                            </div>
                          );
                        } catch {
                          return '-';
                        }
                      },
                    },
                    {
                      label: 'ID Struk',
                      key: 'id',
                      render: (id: string) => <StrukBadge id={id} />,
                    },
                    {
                      label: 'Metode Pembayaran',
                      key: 'paymentMethod',
                      render: (m: string) => (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                          {m || 'CASH'}
                        </span>
                      ),
                    },
                    {
                      label: 'Items',
                      key: 'items',
                      render: (items: SaleItem[]) => `${(items ?? []).length} Item`,
                    },
                    {
                      label: 'Diskon',
                      key: 'discount',
                      render: (val: number) => val > 0 ? `Rp ${val.toLocaleString('id-ID')}` : '-',
                    },
                    {
                      label: 'Total Belanja',
                      key: 'total',
                      sortable: true,
                      render: (val: number, row: Sale) => {
                        const totalVal = val ?? (row as { total_amount?: number })?.total_amount ?? 0;
                        return (
                          <span className="font-bold text-blue-600 dark:text-blue-400">
                            Rp {Number(totalVal).toLocaleString('id-ID')}
                          </span>
                        );
                      },
                    },
                    {
                      label: 'Aksi',
                      key: 'action',
                      render: (_: unknown, record: Sale) => (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] gap-1 px-2.5 rounded-lg border-slate-200 dark:border-slate-700"
                          onClick={() => printReceipt(record)}
                          title="Cetak struk belanja"
                        >
                          <Printer size={13} />
                          Cetak
                        </Button>
                      ),
                    }
                  ]}
                />
              </div>
            </SectionCard>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <ShoppingBag size={18} />
                <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                  Bunga & Benefit Keanggotaan
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-medium">
                Dapatkan pembagian SHU (Sisa Hasil Usaha) tahunan berdasarkan keaktifan belanja di koperasi sekolah dan jumlah simpanan wajib/sukarela Anda.
              </p>
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-indigo-700 dark:text-indigo-300 leading-snug">
                💡 <strong>Tips:</strong> Simpan struk belanja Anda atau gunakan pembayaran non-tunai RFID untuk pencatatan otomatis di sistem pembagian dividen SHU.
              </div>
            </div>
            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider pt-4 border-t border-slate-100 dark:border-slate-800">
              Keanggotaan Koperasi Absenta
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

CoopMemberSection.displayName = 'CoopMemberSection';
