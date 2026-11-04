import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowRight,
  Plus,
  Copy,
  Users,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { CbtBankSoal } from '@/types/cbt.types';
import { useJenjang } from '@/hooks/useJenjang';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import { cn } from '@/lib/utils';
import { CbtBankSoalFormModal } from '../bank-soal/CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from '../bank-soal/CbtBankSoalDetailModal';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  AuditedTargetItem,
  getAllMgmpSharedMap,
} from './cbtMgmpHelper';
import { CbtReadinessStatsBar } from './CbtReadinessStatsBar';
import { CbtReadinessTeacherTable } from './CbtReadinessTeacherTable';
import toast from 'react-hot-toast';

interface CbtBankSoalReadinessPanelProps {
  bankList: CbtBankSoal[];
  activeTpId?: string;
  activeSemId?: string;
  onProceedToNextPhase?: () => void;
  onRefreshBankList?: () => void;
}

export type ViewTabMode = 'BELUM' | 'SUDAH' | 'PAKET_MAPEL';

export interface MapelPaketTeoriItem {
  id: string;
  mapel_id: string;
  nama_mapel: string;
  tingkat: number;
  assignedTeachers: Array<{ id: string; nama_guru: string }>;
  isReady: boolean;
  bankSoal?: CbtBankSoal;
  masterAuthor?: string;
  soalCount: number;
}

export const CbtBankSoalReadinessPanel: React.FC<CbtBankSoalReadinessPanelProps> = ({
  bankList,
  activeTpId,
  onProceedToNextPhase,
  onRefreshBankList,
}) => {
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const { tingkatList } = useJenjang();

  const [activeTab, setActiveTab] = useState<ViewTabMode>('BELUM');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBankToEdit, setSelectedBankToEdit] = useState<CbtBankSoal | null>(null);
  const [defaultMapelForCreate, setDefaultMapelForCreate] = useState<string | undefined>(undefined);
  const [defaultGuruForCreate, setDefaultGuruForCreate] = useState<string | undefined>(undefined);
  const [defaultTingkatForCreate, setDefaultTingkatForCreate] = useState<'X' | 'XI' | 'XII' | undefined>(undefined);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankForDetail, setSelectedBankForDetail] = useState<CbtBankSoal | null>(null);

  // ── 1. Fetch SK Penugasan Guru-Mapel Kurikulum Tahun Pelajaran Aktif ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', activeTpId],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: activeTpId }),
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  // ── 2. Rekonsiliasi Otomatis & Pemodelan Data Teori vs Realisasi ──
  const { auditedTeachers, mapelPaketTeoriList, stats } = useMemo(() => {
    const mgmpSharedMap = getAllMgmpSharedMap(tenantId);

    // Map bank soal langsung per guru + mapel + tingkat
    const directBankMap = new Map<string, CbtBankSoal>();
    // Map master bank soal per mapel + tingkat (untuk shared coverage)
    const masterBanksByMapelTingkat = new Map<string, CbtBankSoal>();

    bankList.forEach((b) => {
      const tNum = resolveBankTingkatNumber(b) || 10;
      const gId = b.guru_id;
      const mId = b.mapel_id;
      const count = b.jumlah_soal || b._count?.Soal || 0;

      if (gId && mId) {
        directBankMap.set(`${gId}_${mId}_${tNum}`, b);
      }

      const mtKey = `${mId}_${tNum}`;
      const existing = masterBanksByMapelTingkat.get(mtKey);
      const isShared = Boolean(b.is_shared || b.status === 'PUBLISHED');

      if (
        !existing ||
        (isShared && !(existing.is_shared || existing.status === 'PUBLISHED')) ||
        count > (existing.jumlah_soal || existing._count?.Soal || 0)
      ) {
        masterBanksByMapelTingkat.set(mtKey, b);
      }
    });

    const teacherItems: AuditedTargetItem[] = [];
    const mapelPaketMap = new Map<string, MapelPaketTeoriItem>();
    const processedTeacherKeys = new Set<string>();

    if (rawGuruMapel.length > 0) {
      rawGuruMapel.forEach((gm: any) => {
        const gId = gm.guru_id;
        const mId = gm.mapel_id;
        if (!gId || !mId) return;

        const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
        // Abaikan BP/BK karena bukan mapel ujian CBT tertulis
        const lowerName = mapelName.toLowerCase();
        if (
          lowerName.includes('bimbingan') ||
          lowerName.includes('konseling') ||
          lowerName.includes('bp/bk') ||
          lowerName.includes('bk')
        ) {
          return;
        }

        const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat || 10;
        const tNum = Number(rawTingkat) || (rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10);
        const guruName = gm.Guru?.nama_guru || 'Guru Pengampu';

        // 2a. Model Teori Paket Mapel (Mata Pelajaran x Tingkat)
        const mtKey = `${mId}_${tNum}`;
        if (!mapelPaketMap.has(mtKey)) {
          const masterBank = masterBanksByMapelTingkat.get(mtKey);
          const hasReadyMaster = Boolean(masterBank && (masterBank.jumlah_soal || masterBank._count?.Soal || 0) > 0);
          mapelPaketMap.set(mtKey, {
            id: mtKey,
            mapel_id: mId,
            nama_mapel: mapelName,
            tingkat: tNum,
            assignedTeachers: [],
            isReady: hasReadyMaster,
            bankSoal: masterBank,
            masterAuthor: masterBank?.Guru?.nama_guru,
            soalCount: masterBank ? masterBank.jumlah_soal || masterBank._count?.Soal || 0 : 0,
          });
        }
        const paket = mapelPaketMap.get(mtKey)!;
        if (!paket.assignedTeachers.some((t) => t.id === gId)) {
          paket.assignedTeachers.push({ id: gId, nama_guru: guruName });
        }

        // 2b. Model Audit Guru Pengampu
        const teacherKey = `${gId}_${mId}_${tNum}`;
        if (processedTeacherKeys.has(teacherKey)) return;
        processedTeacherKeys.add(teacherKey);

        const directBank = directBankMap.get(teacherKey);
        if (directBank) {
          const count = directBank.jumlah_soal || directBank._count?.Soal || 0;
          const isShared = Boolean(directBank.is_shared || directBank.status === 'PUBLISHED');
          teacherItems.push({
            id: directBank.id,
            guru_id: gId,
            nama_guru: guruName,
            mapel_id: mId,
            nama_mapel: mapelName,
            tingkat: tNum,
            assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: gm.Guru?.no_hp }],
            bankSoal: directBank,
            soalCount: count,
            status: count > 0 ? 'READY' : 'DRAFT_EMPTY',
            isShared,
            creatorName: guruName,
            isCoveredByMaster: false,
          });
        } else {
          // Cek apakah guru ini ter-cover bank shared MGMP
          const masterBank = masterBanksByMapelTingkat.get(mtKey);
          const masterSharedIds = masterBank ? mgmpSharedMap[masterBank.id] || [] : [];
          const isCovered =
            masterBank &&
            (Boolean(masterBank.is_shared || masterBank.status === 'PUBLISHED') ||
              masterSharedIds.includes(gId));

          if (isCovered && masterBank) {
            const mCount = masterBank.jumlah_soal || masterBank._count?.Soal || 0;
            teacherItems.push({
              id: `mgmp_${gId}_${masterBank.id}`,
              guru_id: gId,
              nama_guru: guruName,
              mapel_id: mId,
              nama_mapel: mapelName,
              tingkat: tNum,
              assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: gm.Guru?.no_hp }],
              bankSoal: masterBank,
              soalCount: mCount,
              status: mCount > 0 ? 'READY' : 'DRAFT_EMPTY',
              isShared: true,
              creatorName: guruName,
              isCoveredByMaster: true,
              masterAuthorName: masterBank.Guru?.nama_guru || 'Koordinator MGMP',
            });
          } else {
            teacherItems.push({
              id: `uncreated_${teacherKey}`,
              guru_id: gId,
              nama_guru: guruName,
              mapel_id: mId,
              nama_mapel: mapelName,
              tingkat: tNum,
              assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: gm.Guru?.no_hp }],
              bankSoal: undefined,
              soalCount: 0,
              status: 'UNCREATED',
              isShared: false,
              creatorName: guruName,
              isCoveredByMaster: false,
            });
          }
        }
      });
    }

    const mapelPaketList = Array.from(mapelPaketMap.values());
    const totalTeoriPaket = mapelPaketList.length;
    const paketSudahSiap = mapelPaketList.filter((p) => p.isReady).length;
    const paketBelumSiap = totalTeoriPaket - paketSudahSiap;

    const totalGuruPenugasan = teacherItems.length;
    const guruSudahSiap = teacherItems.filter((t) => t.status === 'READY').length;
    const guruBelumSiap = totalGuruPenugasan - guruSudahSiap;

    return {
      auditedTeachers: teacherItems,
      mapelPaketTeoriList: mapelPaketList,
      stats: {
        totalTeoriPaket,
        paketSudahSiap,
        paketBelumSiap,
        totalGuruPenugasan,
        guruSudahSiap,
        guruBelumSiap,
      },
    };
  }, [rawGuruMapel, bankList, tenantId]);

  // ── 3. Filter List Guru ──
  const guruBelumList = useMemo(() => {
    return auditedTeachers.filter((t) => {
      if (t.status === 'READY') return false;
      if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
      }
      return true;
    });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const guruSudahList = useMemo(() => {
    return auditedTeachers.filter((t) => {
      if (t.status !== 'READY') return false;
      if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
      }
      return true;
    });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const mapelPaketFilteredList = useMemo(() => {
    return mapelPaketTeoriList.filter((p) => {
      if (filterTingkat !== 'ALL' && p.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.nama_mapel.toLowerCase().includes(q);
      }
      return true;
    });
  }, [mapelPaketTeoriList, filterTingkat, searchQuery]);

  // ── 4. Handlers ──
  const handleNudgeWhatsApp = (target: AuditedTargetItem) => {
    const rawHp = target.assignedTeachers[0]?.no_hp;
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = target.nama_guru;
    const mapelName = target.nama_mapel;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(target.tingkat)} (Kelas ${target.tingkat})`;

    const msg =
      target.status === 'UNCREATED'
        ? `Halo Bapak/Ibu ${teacherName}, mengingatkan persiapan Asesmen Ujian CBT untuk mata pelajaran ${mapelName} ${tingkatStr} yang belum terdaftar di sistem. Mohon dapat segera menginput naskah soal atau mengklaim bank master MGMP. Terima kasih.`
        : `Halo Bapak/Ibu ${teacherName}, bank soal untuk mata pelajaran ${mapelName} ${tingkatStr} saat ini masih kosong (0 soal). Mohon kesediaannya melengkapi butir soal. Terima kasih.`;

    const waUrl = cleanHp ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    toast.success(`Membuka WhatsApp untuk ${teacherName}`);
  };

  const handleCopyUncreatedTeachers = () => {
    if (guruBelumList.length === 0) {
      toast.info('Semua guru sudah menyerahkan bank soal');
      return;
    }
    const lines = [
      '📢 *PENGINGAT KESIAPAN BANK SOAL CBT SEKOLAH*',
      `Daftar guru yang belum menyelesaikan bank soal (${guruBelumList.length} penugasan):`,
      '',
      ...guruBelumList.map((t, idx) => `${idx + 1}. *${t.nama_guru}* - ${t.nama_mapel} (Tingkat ${formatTingkatRomawi(t.tingkat)})`),
      '',
      'Mohon untuk segera menginput bank soal atau menghubungi rekan MGMP. Terima kasih.',
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    toast.success('Daftar guru yang belum berhasil disalin ke clipboard!');
  };

  const handleCreateForTarget = (target: AuditedTargetItem) => {
    setSelectedBankToEdit(null);
    setDefaultMapelForCreate(target.mapel_id);
    setDefaultGuruForCreate(target.guru_id);
    const romanTingkat = target.tingkat === 11 ? 'XI' : target.tingkat === 12 ? 'XII' : 'X';
    setDefaultTingkatForCreate(romanTingkat);
    setIsFormModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* ── 1. Hero Barometer Teori vs Realisasi (Ringkas & Nol Noise) ── */}
      <CbtReadinessStatsBar
        totalTeoriPaket={stats.totalTeoriPaket}
        paketSudahSiap={stats.paketSudahSiap}
        paketBelumSiap={stats.paketBelumSiap}
        totalGuruPenugasan={stats.totalGuruPenugasan}
        guruSudahSiap={stats.guruSudahSiap}
        guruBelumSiap={stats.guruBelumSiap}
      />

      {/* ── 2. Kontrol Navigasi Utama: Tab 3 Jawaban Panitia + Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* 3 Tab Jawaban Panitia */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('BELUM')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'BELUM'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            )}
          >
            <AlertCircle size={13} />
            <span>1. Guru Belum Buat ({stats.guruBelumSiap})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SUDAH')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'SUDAH'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            )}
          >
            <CheckCircle2 size={13} />
            <span>2. Guru Sudah Siap ({stats.guruSudahSiap})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAKET_MAPEL')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'PAKET_MAPEL'
                ? 'bg-violet-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            )}
          >
            <BookOpen size={13} />
            <span>3. Teori Paket Mapel ({stats.totalTeoriPaket})</span>
          </button>
        </div>

        {/* Action Header: Tambah Bank & Lanjut ke Fase 2 */}
        <div className="flex items-center gap-2 shrink-0">
          {activeTab === 'BELUM' && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyUncreatedTeachers}
              className="text-xs h-9 px-3 font-bold border-rose-300 text-rose-700 bg-white hover:bg-rose-50 cursor-pointer"
              title="Salin daftar guru yang belum ke WhatsApp"
            >
              <Copy size={13} className="mr-1" />
              <span>Salin Daftar Belum</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedBankToEdit(null);
              setDefaultMapelForCreate(undefined);
              setDefaultGuruForCreate(undefined);
              setDefaultTingkatForCreate(undefined);
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
              <span>Lanjut ke Fase 2</span>
              <ArrowRight size={14} className="ml-1" />
            </Button>
          )}
        </div>
      </div>

      {/* ── 3. Toolbar Pencarian & Filter Tingkat ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama guru atau mata pelajaran..."
            aria-label="Cari bank soal atau guru"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTingkat('ALL')}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
              filterTingkat === 'ALL'
                ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
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
                'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer whitespace-nowrap',
                filterTingkat === t
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
              )}
            >
              Tingkat {formatTingkatRomawi(t)}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Konten Tabel Ramping Bebas Noise ── */}
      {activeTab === 'BELUM' && (
        <CbtReadinessTeacherTable
          items={guruBelumList}
          mode="BELUM"
          onNudgeWhatsApp={handleNudgeWhatsApp}
          onCreateForTarget={handleCreateForTarget}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
          onEditBank={(bank) => {
            setSelectedBankToEdit(bank);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {activeTab === 'SUDAH' && (
        <CbtReadinessTeacherTable
          items={guruSudahList}
          mode="SUDAH"
          onNudgeWhatsApp={handleNudgeWhatsApp}
          onCreateForTarget={handleCreateForTarget}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
          onEditBank={(bank) => {
            setSelectedBankToEdit(bank);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {activeTab === 'PAKET_MAPEL' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-slate-500 font-bold">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3">Mata Pelajaran Ujian</th>
                <th className="py-2.5 px-3 w-28 text-center">Tingkat</th>
                <th className="py-2.5 px-3">Guru Pengampu Terdaftar</th>
                <th className="py-2.5 px-3 w-40 text-center">Status Paket Ujian</th>
                <th className="py-2.5 px-3 w-32 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {mapelPaketFilteredList.map((paket, idx) => (
                <tr key={paket.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 text-center text-slate-400 font-medium">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100">
                    {paket.nama_mapel}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      Tingkat {formatTingkatRomawi(paket.tingkat)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                    {paket.assignedTeachers.map((t) => t.nama_guru).join(', ') || '-'}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {paket.isReady ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 size={12} />
                        <span>Tersedia ({paket.soalCount} Soal)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={12} />
                        <span>Belum Ada Paket</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {paket.bankSoal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankForDetail(paket.bankSoal!);
                          setIsDetailModalOpen(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-bold cursor-pointer"
                      >
                        Periksa
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBankToEdit(null);
                          setDefaultMapelForCreate(paket.mapel_id);
                          const romanTingkat = paket.tingkat === 11 ? 'XI' : paket.tingkat === 12 ? 'XII' : 'X';
                          setDefaultTingkatForCreate(romanTingkat);
                          setIsFormModalOpen(true);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                      >
                        + Buatkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 5. Modals ── */}
      {isFormModalOpen && (
        <CbtBankSoalFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setDefaultMapelForCreate(undefined);
            setDefaultGuruForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
          }}
          bankSoalToEdit={selectedBankToEdit}
          defaultMapelId={defaultMapelForCreate}
          defaultGuruId={defaultGuruForCreate}
          defaultTingkat={defaultTingkatForCreate}
          onSuccess={() => {
            setIsFormModalOpen(false);
            setDefaultMapelForCreate(undefined);
            setDefaultGuruForCreate(undefined);
            setDefaultTingkatForCreate(undefined);
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}

      {isDetailModalOpen && selectedBankForDetail && (
        <CbtBankSoalDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedBankForDetail(null);
          }}
          bankSoal={selectedBankForDetail}
          onBankSoalUpdated={() => {
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}
    </div>
  );
};
