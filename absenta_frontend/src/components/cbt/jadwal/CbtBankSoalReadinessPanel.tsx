import React, { useState, useMemo } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import {
  BookOpen,
  Search,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  Layers,
  User,
  ExternalLink,
  MessageSquare,
  Eye,
  Edit3,
  Copy,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CbtBankSoal } from '@/types/cbt.types';
import { useJenjang } from '@/hooks/useJenjang';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import { cn } from '@/lib/utils';
import { CbtBankSoalFormModal } from '../bank-soal/CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from '../bank-soal/CbtBankSoalDetailModal';
import toast from 'react-hot-toast';

interface CbtBankSoalReadinessPanelProps {
  bankList: CbtBankSoal[];
  onProceedToNextPhase?: () => void;
  onRefreshBankList?: () => void;
}

export type BankReadinessStatusFilter = 'ALL' | 'NEED_ACTION' | 'READY';

export const CbtBankSoalReadinessPanel: React.FC<CbtBankSoalReadinessPanelProps> = ({
  bankList,
  onProceedToNextPhase,
  onRefreshBankList,
}) => {
  const { jenjang } = useJenjang();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<BankReadinessStatusFilter>('ALL');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBankToEdit, setSelectedBankToEdit] = useState<CbtBankSoal | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankForDetail, setSelectedBankForDetail] = useState<CbtBankSoal | null>(null);

  // Group banks by tingkat
  const groupedBanks = useMemo(() => {
    const map = new Map<number, CbtBankSoal[]>();
    bankList.forEach((b) => {
      const num = resolveBankTingkatNumber(b) || 10;
      if (!map.has(num)) map.set(num, []);
      map.get(num)!.push(b);
    });
    return map;
  }, [bankList]);

  const tingkatList = useMemo(() => {
    return Array.from(groupedBanks.keys()).sort((a, b) => a - b);
  }, [groupedBanks]);

  // Readiness Metrics
  const totalBanks = bankList.length;
  const readyBanks = useMemo(
    () => bankList.filter((b) => (b.jumlah_soal || b._count?.Soal || 0) > 0).length,
    [bankList]
  );
  const emptyBanks = totalBanks - readyBanks;

  // Filtered list
  const filteredBanks = useMemo(() => {
    return bankList.filter((b) => {
      const num = resolveBankTingkatNumber(b) || 10;
      if (filterTingkat !== 'ALL' && num !== filterTingkat) return false;

      const soalCount = b.jumlah_soal || b._count?.Soal || 0;
      if (statusFilter === 'NEED_ACTION' && soalCount > 0) return false;
      if (statusFilter === 'READY' && soalCount === 0) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchJudul = b.judul.toLowerCase().includes(q);
        const matchMapel = (b.Mapel?.nama_mapel || b.MataPelajaran?.nama_mapel || '').toLowerCase().includes(q);
        const matchGuru = (b.Guru?.nama_guru || '').toLowerCase().includes(q);
        return matchJudul || matchMapel || matchGuru;
      }
      return true;
    });
  }, [bankList, filterTingkat, statusFilter, searchQuery]);

  // Tindakan: Kirim Pengingat WhatsApp ke Guru
  const handleNudgeWhatsApp = (bank: CbtBankSoal) => {
    const guruName = bank.Guru?.nama_guru || 'Bapak/Ibu Guru';
    const mapelName = bank.Mapel?.nama_mapel || bank.judul;
    const tingkatNum = resolveBankTingkatNumber(bank) || 10;
    const pesan = `Halo Yth. ${guruName}, kami dari Panitia Ujian/CBT mengingatkan bahwa naskah butir soal untuk mata pelajaran "${mapelName}" (Tingkat ${tingkatNum}) saat ini belum lengkap/masih kosong di sistem. Mohon segera melengkapi butir soal dan kunci jawaban agar jadwal ujian serentak dapat segera diterbitkan. Terima kasih. 🙏`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(pesan);
      toast.success(`Format pesan pengingat untuk ${guruName} disalin ke clipboard! Membuka WhatsApp...`);
    }

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(pesan)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <Card className="p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs space-y-4">
      {/* ── 1. Header & Quick Summary Strip ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
              <BookOpen size={18} />
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
              Fase 1: Audit Kesiapan Materi &amp; Bank Soal Ujian
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pantau pemenuhan butir soal per mata pelajaran, beri pengingat ke guru yang belum tuntas, dan periksa kunci jawaban sebelum jadwal massal diterbitkan.
          </p>
        </div>

        {/* Readiness Summary Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-violet-200 bg-violet-50 text-violet-700">
            <BookOpen size={13} className="mr-1" />
            <span>{totalBanks} Bank Soal Terdaftar</span>
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={13} className="mr-1" />
            <span>{readyBanks} Siap Ujian</span>
          </Badge>
          {emptyBanks > 0 ? (
            <Badge variant="outline" className="px-2.5 py-1 font-bold border-rose-300 bg-rose-50 text-rose-700 animate-pulse">
              <AlertCircle size={13} className="mr-1" />
              <span>{emptyBanks} Perlu Tindakan (0 Soal)</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-300 bg-emerald-50 text-emerald-800">
              <span>✓ 100% Soal Lengkap</span>
            </Badge>
          )}
        </div>
      </div>

      {/* ── 2. Filter Bar Berorientasi Masalah & Pencarian ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Quick Status Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer',
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              )}
            >
              Semua ({totalBanks})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEED_ACTION')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1',
                statusFilter === 'NEED_ACTION'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              )}
            >
              <AlertCircle size={12} />
              <span>Perlu Tindakan ({emptyBanks})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('READY')}
              className={cn(
                'px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1',
                statusFilter === 'READY'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              )}
            >
              <CheckCircle2 size={12} />
              <span>Sudah Siap ({readyBanks})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mapel, judul, guru..."
              aria-label="Cari bank soal"
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Filter Tingkat Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setFilterTingkat('ALL')}
              className={cn(
                'px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
                filterTingkat === 'ALL'
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
              )}
            >
              Semua Tingkat
            </button>
            {tingkatList.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterTingkat(t)}
                className={cn(
                  'px-2 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
                  filterTingkat === t
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
                )}
              >
                Tingkat {formatTingkatRomawi(t)}
              </button>
            ))}
          </div>
        </div>

        {/* Action Header: Tambah Bank & Lanjut ke Fase 2 */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedBankToEdit(null);
              setIsFormModalOpen(true);
            }}
            className="text-xs h-9 px-3 font-bold border-violet-300 text-violet-700 bg-white hover:bg-violet-50 cursor-pointer"
          >
            <Plus size={14} className="mr-1" />
            <span>+ Buat Bank Soal</span>
          </Button>

          {onProceedToNextPhase && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onProceedToNextPhase}
              className="text-xs h-9 px-4 font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-2xs cursor-pointer"
            >
              <span>Lanjut ke Fase 2: Ploting Ruang</span>
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── 3. Grid Kartu Audit Kesiapan Bank Soal ── */}
      {filteredBanks.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
          Tidak ada bank soal yang cocok dengan filter yang dipilih.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBanks.map((bank) => {
            const soalCount = bank.jumlah_soal || bank._count?.Soal || 0;
            const isReady = soalCount > 0;
            const mapelName = bank.Mapel?.nama_mapel || bank.MataPelajaran?.nama_mapel || bank.judul;
            const guruName = bank.Guru?.nama_guru || 'Guru Belum Ditentukan';
            const tingkatNum = resolveBankTingkatNumber(bank) || 10;

            return (
              <div
                key={bank.id}
                className={cn(
                  'p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 relative',
                  isReady
                    ? 'border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-violet-300 shadow-2xs'
                    : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-2xs'
                )}
              >
                <div className="space-y-2">
                  {/* Top Bar: Tingkat & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-[10px] font-black text-violet-600 uppercase tracking-wider">
                        Tingkat {formatTingkatRomawi(tingkatNum)} (Kelas {tingkatNum})
                      </div>
                      <h5 className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate" title={mapelName}>
                        {mapelName}
                      </h5>
                    </div>

                    <span
                      className={cn(
                        'text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0',
                        isReady
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                      )}
                    >
                      {isReady ? `✓ Siap (${soalCount} Soal)` : '⚠️ Belum Ada Soal'}
                    </span>
                  </div>

                  {/* Metadata: Guru Pengampu & Durasi */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">Pengampu: <span className="font-semibold text-slate-700 dark:text-slate-300">{guruName}</span></span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>Durasi: {bank.alokasi_menit || 90} Menit</span>
                      </span>
                      <span>Kode: <span className="font-mono">{bank.kode_bank || '-'}</span></span>
                    </div>
                  </div>
                </div>

                {/* ── Action Buttons per Role Panitia ── */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {!isReady ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleNudgeWhatsApp(bank)}
                        className="flex-1 py-1 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Kirim pesan pengingat deadline ke WhatsApp Guru"
                      >
                        <MessageSquare size={13} />
                        <span>Colek Guru (WA)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankForDetail(bank);
                          setIsDetailModalOpen(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                        title="Input naskah butir soal darurat atas nama guru"
                      >
                        <Plus size={13} />
                        <span>Input Soal</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankForDetail(bank);
                          setIsDetailModalOpen(true);
                        }}
                        className="flex-1 py-1 px-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        title="Periksa dan audit butir soal & kunci jawaban"
                      >
                        <Eye size={13} />
                        <span>Periksa Butir ({soalCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankToEdit(bank);
                          setIsFormModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="Edit pengaturan bank soal"
                      >
                        <Edit3 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail & Pemeriksa Butir Soal */}
      {isDetailModalOpen && (
        <CbtBankSoalDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedBankForDetail(null);
            if (onRefreshBankList) onRefreshBankList();
          }}
          bankSoal={selectedBankForDetail}
        />
      )}

      {/* Modal Form Tambah/Edit Bank Soal */}
      {isFormModalOpen && (
        <CbtBankSoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          bankSoalToEdit={selectedBankToEdit}
          onSuccess={() => {
            setIsFormModalOpen(false);
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}
    </Card>
  );
};

export default CbtBankSoalReadinessPanel;
