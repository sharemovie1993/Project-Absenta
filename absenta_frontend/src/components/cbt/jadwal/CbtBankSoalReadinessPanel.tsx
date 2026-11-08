import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  Plus,
  Copy,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CbtBankSoal } from '@/types/cbt.types';
import type { GuruMapel } from '@/types/academic';
import { cbtQueryKeys } from '@/api/cbt.api';
import { useJenjang } from '@/hooks/useJenjang';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { resolveBankTingkatNumber } from './cbtJadwalHelper';
import { cn } from '@/lib/utils';
import { CbtBankSoalFormModal } from '../bank-soal/CbtBankSoalFormModal';
import { CbtBankSoalDetailModal } from '../bank-soal/CbtBankSoalDetailModal';
import { listGuruMapel } from '@/api/kurikulum/guru-mapel.api';
import { useGuruOptions } from '@/hooks/useGuruOptions';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui';
import {
  AuditedTargetItem,
  MapelPaketTeoriItem,
  getAllMgmpSharedMap,
  getNudgeHistory,
  recordNudge,
} from './cbtMgmpHelper';
import { CbtReadinessStatsBar } from './CbtReadinessStatsBar';
import { CbtReadinessTeacherTable } from './CbtReadinessTeacherTable';
import { CbtReadinessPaketTable } from './CbtReadinessPaketTable';
import toast from 'react-hot-toast';

interface CbtBankSoalReadinessPanelProps {
  bankList: CbtBankSoal[];
  activeTpId?: string;
  activeSemId?: string;
  onProceedToNextPhase?: () => void;
  onRefreshBankList?: () => void;
}

export type ViewTabMode = 'BELUM' | 'SUDAH' | 'PAKET_MAPEL';

export const CbtBankSoalReadinessPanel: React.FC<CbtBankSoalReadinessPanelProps> = ({
  bankList,
  activeTpId,
  onProceedToNextPhase,
  onRefreshBankList,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const { tingkatList } = useJenjang();

  const [activeTab, setActiveTab] = useState<ViewTabMode>('BELUM');
  const [filterTingkat, setFilterTingkat] = useState<number | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [nudgeTick, setNudgeTick] = useState<number>(Date.now());

  // Listen event update colek WA
  useEffect(() => {
    const handleUpdate = () => setNudgeTick(Date.now());
    window.addEventListener('cbt-nudge-updated', handleUpdate);
    return () => window.removeEventListener('cbt-nudge-updated', handleUpdate);
  }, []);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedBankToEdit, setSelectedBankToEdit] = useState<CbtBankSoal | null>(null);
  const [defaultMapelForCreate, setDefaultMapelForCreate] = useState<string | undefined>(undefined);
  const [defaultGuruForCreate, setDefaultGuruForCreate] = useState<string | undefined>(undefined);
  const [defaultTingkatForCreate, setDefaultTingkatForCreate] = useState<'X' | 'XI' | 'XII' | undefined>(undefined);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedBankForDetail, setSelectedBankForDetail] = useState<CbtBankSoal | null>(null);

  // ── 1. Fetch SK Penugasan & Data Guru (Termasuk No HP Terdaftar) ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', activeTpId],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: activeTpId }),
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  const { rawList: allGurus = [] } = useGuruOptions({ jenisPtk: 'ALL' });
  const guruPhoneMap = useMemo(() => {
    const map = new Map<string, string>();
    allGurus.forEach((g) => {
      if (g.id && g.no_hp) {
        map.set(g.id, g.no_hp);
      }
    });
    return map;
  }, [allGurus]);

  // ── 2. Rekonsiliasi Otomatis & Pemodelan Data Teori vs Realisasi ──
  const { auditedTeachers, mapelPaketTeoriList, stats } = useMemo(() => {
    const mgmpSharedMap = getAllMgmpSharedMap(tenantId);
    const nudgeHistory = getNudgeHistory(tenantId);

    const directBankMap = new Map<string, CbtBankSoal>();
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
      rawGuruMapel.forEach((gm: GuruMapel) => {
        const gId = gm.guru_id;
        const mId = gm.mapel_id;
        if (!gId || !mId) return;

        const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
        const lowerName = mapelName.toLowerCase();
        if (
          lowerName.includes('bimbingan') ||
          lowerName.includes('konseling') ||
          lowerName.includes('bp/bk') ||
          lowerName.includes('bk')
        ) {
          return;
        }

        const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat;
        let tNum = Number(rawTingkat);
        if (!tNum && gm.Kelas?.nama_kelas) {
          const match = gm.Kelas.nama_kelas.match(/\b(X|XI|XII|10|11|12)\b/i);
          if (match) {
            const roman = match[1].toUpperCase();
            tNum = roman === 'XI' || roman === '11' ? 11 : roman === 'XII' || roman === '12' ? 12 : 10;
          }
        }
        if (!tNum) {
          tNum = rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10;
        }
        const guruName = gm.Guru?.nama_guru || 'Guru Pengampu';
        const phone = gm.Guru?.no_hp || guruPhoneMap.get(gId) || '';

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
        const nudgeMeta = nudgeHistory[teacherKey] || (directBank ? nudgeHistory[directBank.id] : undefined);

        if (directBank) {
          const count = directBank.jumlah_soal || directBank._count?.Soal || 0;
          const isShared = Boolean(directBank.is_shared || directBank.status === 'PUBLISHED');
          teacherItems.push({
            id: directBank.id,
            guru_id: gId,
            nama_guru: guruName,
            no_hp: phone,
            mapel_id: mId,
            nama_mapel: mapelName,
            tingkat: tNum,
            assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: phone }],
            bankSoal: directBank,
            soalCount: count,
            status: count > 0 ? 'READY' : 'DRAFT_EMPTY',
            isShared,
            creatorName: guruName,
            isCoveredByMaster: false,
            nudgeMeta,
          });
        } else {
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
              no_hp: phone,
              mapel_id: mId,
              nama_mapel: mapelName,
              tingkat: tNum,
              assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: phone }],
              bankSoal: masterBank,
              soalCount: mCount,
              status: mCount > 0 ? 'READY' : 'DRAFT_EMPTY',
              isShared: true,
              creatorName: guruName,
              isCoveredByMaster: true,
              masterAuthorName: masterBank.Guru?.nama_guru || 'Koordinator MGMP',
              nudgeMeta,
            });
          } else {
            teacherItems.push({
              id: teacherKey,
              guru_id: gId,
              nama_guru: guruName,
              no_hp: phone,
              mapel_id: mId,
              nama_mapel: mapelName,
              tingkat: tNum,
              assignedTeachers: [{ id: gId, nama_guru: guruName, no_hp: phone }],
              bankSoal: undefined,
              soalCount: 0,
              status: 'UNCREATED',
              isShared: false,
              creatorName: guruName,
              isCoveredByMaster: false,
              nudgeMeta,
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
  }, [rawGuruMapel, bankList, tenantId, guruPhoneMap, nudgeTick]);

  // ── 3. Filter & Default Sorting: Tingkat (10 -> 11 -> 12) -> Nama Mapel (A-Z) -> Nama Guru (A-Z) ──
  const guruBelumList = useMemo(() => {
    return auditedTeachers
      .filter((t) => {
        if (t.status === 'READY') return false;
        if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        const cmpMapel = a.nama_mapel.localeCompare(b.nama_mapel, 'id');
        if (cmpMapel !== 0) return cmpMapel;
        return a.nama_guru.localeCompare(b.nama_guru, 'id');
      });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const guruSudahList = useMemo(() => {
    return auditedTeachers
      .filter((t) => {
        if (t.status !== 'READY') return false;
        if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return t.nama_guru.toLowerCase().includes(q) || t.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        const cmpMapel = a.nama_mapel.localeCompare(b.nama_mapel, 'id');
        if (cmpMapel !== 0) return cmpMapel;
        return a.nama_guru.localeCompare(b.nama_guru, 'id');
      });
  }, [auditedTeachers, filterTingkat, searchQuery]);

  const mapelPaketFilteredList = useMemo(() => {
    return mapelPaketTeoriList
      .filter((p) => {
        if (filterTingkat !== 'ALL' && p.tingkat !== filterTingkat) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return p.nama_mapel.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.tingkat !== b.tingkat) return a.tingkat - b.tingkat;
        return a.nama_mapel.localeCompare(b.nama_mapel, 'id');
      });
  }, [mapelPaketTeoriList, filterTingkat, searchQuery]);

  // Statistik Dinamis Menyesuaikan Filter Tingkat
  const activeStats = useMemo(() => {
    const targetMapelList =
      filterTingkat === 'ALL'
        ? mapelPaketTeoriList
        : mapelPaketTeoriList.filter((p) => p.tingkat === filterTingkat);

    const targetTeacherList =
      filterTingkat === 'ALL'
        ? auditedTeachers
        : auditedTeachers.filter((t) => t.tingkat === filterTingkat);

    const totalTeoriPaket = targetMapelList.length;
    const paketSudahSiap = targetMapelList.filter((p) => p.isReady).length;
    const paketBelumSiap = totalTeoriPaket - paketSudahSiap;

    const totalGuruPenugasan = targetTeacherList.length;
    const guruSudahSiap = targetTeacherList.filter((t) => t.status === 'READY').length;
    const guruBelumSiap = totalGuruPenugasan - guruSudahSiap;

    return {
      totalTeoriPaket,
      paketSudahSiap,
      paketBelumSiap,
      totalGuruPenugasan,
      guruSudahSiap,
      guruBelumSiap,
    };
  }, [mapelPaketTeoriList, auditedTeachers, filterTingkat]);

  // ── 4. Handlers ──
  const handleNudgeWhatsApp = (target: AuditedTargetItem) => {
    const rawHp = target.no_hp || guruPhoneMap.get(target.guru_id) || target.assignedTeachers[0]?.no_hp;
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = target.nama_guru;
    const mapelName = target.nama_mapel;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(target.tingkat)} (Kelas ${target.tingkat})`;
    const senderName = user?.full_name || (user as any)?.nama || 'Panitia CBT';

    const msg =
      target.status === 'UNCREATED'
        ? `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan persiapan Asesmen Ujian CBT untuk mata pelajaran ${mapelName} ${tingkatStr} yang saat ini belum terdaftar di sistem.\nMohon kesediaannya segera menginput butir soal atau mengklaim paket master MGMP sebelum batas waktu yang ditentukan.\n\nTerima kasih.\n— Panitia CBT (${senderName})`
        : `Halo Bapak/Ibu ${teacherName},\n\nMengingatkan bahwa bank soal untuk mata pelajaran ${mapelName} ${tingkatStr} saat ini masih kosong (0 butir soal).\nMohon kesediaannya melengkapi butir soal agar jadwal ujian dapat segera diterbitkan.\n\nTerima kasih.\n— Panitia CBT (${senderName})`;

    if (!cleanHp) {
      toast.error(`Nomor WhatsApp untuk ${teacherName} belum terdaftar di profil guru. Membuka link umum WhatsApp...`);
    } else {
      toast.success(`Membuka WhatsApp untuk ${teacherName} (${cleanHp})`);
    }

    const waUrl = cleanHp ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // Catat status telah di-WA (persisten & real-time)
    recordNudge(target.id, senderName, tenantId);
    setNudgeTick(Date.now());
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
      ...guruBelumList.map((t, idx) => {
        const phone = t.no_hp || guruPhoneMap.get(t.guru_id) || '';
        const phoneStr = phone ? ` (${phone})` : '';
        return `${idx + 1}. *${t.nama_guru}*${phoneStr} - ${t.nama_mapel} (Tingkat ${formatTingkatRomawi(t.tingkat)})`;
      }),
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
      {/* ── 1. Hero Barometer Teori vs Realisasi (Adaptif Filter Tingkat) ── */}
      <CbtReadinessStatsBar
        totalTeoriPaket={activeStats.totalTeoriPaket}
        paketSudahSiap={activeStats.paketSudahSiap}
        paketBelumSiap={activeStats.paketBelumSiap}
        totalGuruPenugasan={activeStats.totalGuruPenugasan}
        guruSudahSiap={activeStats.guruSudahSiap}
        guruBelumSiap={activeStats.guruBelumSiap}
        scopeLabel={filterTingkat === 'ALL' ? undefined : `Tingkat ${formatTingkatRomawi(filterTingkat)}`}
      />

      {/* ── 2. Kontrol Navigasi Utama: Tab 3 Jawaban Panitia + Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            <span>1. Guru Belum Buat ({activeStats.guruBelumSiap})</span>
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
            <span>2. Guru Sudah Siap ({activeStats.guruSudahSiap})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PAKET_MAPEL')}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap',
              activeTab === 'PAKET_MAPEL'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            )}
          >
            <BookOpen size={13} />
            <span>3. Teori Paket Mapel ({activeStats.totalTeoriPaket})</span>
          </button>
        </div>

        {/* Action Header */}
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
            className="text-xs h-9 px-3 font-bold border-indigo-300 text-indigo-700 bg-white hover:bg-indigo-50 cursor-pointer"
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
              className="text-xs h-9 px-4 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer"
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
        <CbtReadinessPaketTable
          items={mapelPaketFilteredList}
          onPeriksaButir={(bank) => {
            setSelectedBankForDetail(bank);
            setIsDetailModalOpen(true);
          }}
          onCreateForMapel={(paket) => {
            setSelectedBankToEdit(null);
            setDefaultMapelForCreate(paket.mapel_id);
            const romanTingkat = paket.tingkat === 11 ? 'XI' : paket.tingkat === 12 ? 'XII' : 'X';
            setDefaultTingkatForCreate(romanTingkat);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {/* ── 5. Modals (Zero-Manual-Reload via Query Cache Invalidation) ── */}
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
            // Invalidate server state caches
            queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal'] });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal-readiness'] });
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
            queryClient.invalidateQueries({ queryKey: cbtQueryKeys.all, exact: false });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal'] });
            queryClient.invalidateQueries({ queryKey: ['cbt-bank-soal-readiness'] });
            if (onRefreshBankList) onRefreshBankList();
          }}
        />
      )}
    </div>
  );
};
