import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Plus,
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AuditedTargetItem,
  getAllMgmpSharedMap,
  getMgmpSharedTeacherIds,
} from './cbtMgmpHelper';
import { CbtAuditedTargetCard } from './CbtAuditedTargetCard';
import toast from 'react-hot-toast';

interface CbtBankSoalReadinessPanelProps {
  bankList: CbtBankSoal[];
  activeTpId?: string;
  activeSemId?: string;
  onProceedToNextPhase?: () => void;
  onRefreshBankList?: () => void;
}

export type BankReadinessStatusFilter = 'ALL' | 'NEED_ACTION' | 'READY';

export const CbtBankSoalReadinessPanel: React.FC<CbtBankSoalReadinessPanelProps> = ({
  bankList,
  activeTpId,
  onProceedToNextPhase,
  onRefreshBankList,
}) => {
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const { tingkatList } = useJenjang();

  const [statusFilter, setStatusFilter] = useState<BankReadinessStatusFilter>('ALL');
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

  // ── 1. Fetch SK Penugasan Guru-Mapel Kurikulum Tahun Pelajaran Aktif (Patokan Resmi) ──
  const { data: guruMapelRes } = useQuery({
    queryKey: ['guru-mapel-readiness', activeTpId],
    queryFn: () => listGuruMapel({ tahun_pelajaran_id: activeTpId }),
  });
  const rawGuruMapel = guruMapelRes?.data || [];

  // ── 2. Rekonsiliasi Otomatis: Kurikulum SK Assignments vs CBT Bank Soal + MGMP Sharing ──
  const auditedTargetList: AuditedTargetItem[] = useMemo(() => {
    const mgmpSharedMap = getAllMgmpSharedMap(tenantId);

    // Map bank soal berdasarkan guru + mapel + tingkat
    const directBankMap = new Map<string, CbtBankSoal>();
    // Map master bank soal per mapel + tingkat (untuk fallback MGMP sharing)
    const masterBanksByMapelTingkat = new Map<string, CbtBankSoal>();

    bankList.forEach((b) => {
      const tNum = resolveBankTingkatNumber(b) || 10;
      const gId = b.guru_id;
      const mId = b.mapel_id;
      const count = b.jumlah_soal || b._count?.Soal || 0;

      if (gId && mId) {
        directBankMap.set(`${gId}_${mId}_${tNum}`, b);
      }

      // Simpan kandidat master bank (prioritas yang punya soal terbanyak dan is_shared)
      const mtKey = `${mId}_${tNum}`;
      const existingMaster = masterBanksByMapelTingkat.get(mtKey);
      const isShared = Boolean(b.is_shared || b.status === 'PUBLISHED');
      if (
        !existingMaster ||
        (isShared && !(existingMaster.is_shared || existingMaster.status === 'PUBLISHED')) ||
        count > (existingMaster.jumlah_soal || existingMaster._count?.Soal || 0)
      ) {
        masterBanksByMapelTingkat.set(mtKey, b);
      }
    });

    const items: AuditedTargetItem[] = [];
    const processedKeys = new Set<string>();

    // 2a. Iterasi setiap SK Penugasan Guru di Kurikulum
    if (rawGuruMapel.length > 0) {
      rawGuruMapel.forEach((gm: any) => {
        const gId = gm.guru_id;
        const mId = gm.mapel_id;
        if (!gId || !mId) return;

        const rawTingkat = gm.Kelas?.tingkat || gm.Mapel?.tingkat || 10;
        const tNum =
          Number(rawTingkat) ||
          (rawTingkat === 'XI' ? 11 : rawTingkat === 'XII' ? 12 : 10);
        const itemKey = `${gId}_${mId}_${tNum}`;

        if (processedKeys.has(itemKey)) return;
        processedKeys.add(itemKey);

        const guruName = gm.Guru?.nama_guru || 'Guru Pengampu';
        const mapelName = gm.Mapel?.nama_mapel || 'Mata Pelajaran';
        const directBank = directBankMap.get(itemKey);

        if (directBank) {
          // Guru ini membuat bank soal langsung
          const count = directBank.jumlah_soal || directBank._count?.Soal || 0;
          const isShared = Boolean(directBank.is_shared || directBank.status === 'PUBLISHED');
          const sharedIds = mgmpSharedMap[directBank.id] || [];

          items.push({
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
            coveredCoTeachers: sharedIds,
          });
        } else {
          // Guru belum membuat bank soal langsung. Cek apakah ter-cover Master MGMP!
          const mtKey = `${mId}_${tNum}`;
          const masterBank = masterBanksByMapelTingkat.get(mtKey);
          const masterSharedIds = masterBank ? mgmpSharedMap[masterBank.id] || [] : [];
          const isCoveredBySharedMaster =
            masterBank &&
            (Boolean(masterBank.is_shared || masterBank.status === 'PUBLISHED') ||
              masterSharedIds.includes(gId));

          if (isCoveredBySharedMaster && masterBank) {
            const mCount = masterBank.jumlah_soal || masterBank._count?.Soal || 0;
            items.push({
              id: `mgmp_covered_${gId}_${masterBank.id}`,
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
            // Belum buat sama sekali & belum ter-cover
            items.push({
              id: `uncreated_${itemKey}`,
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

    // 2b. Sertakan bank soal CBT yang mungkin tidak tercatat dalam SK
    bankList.forEach((b) => {
      const tNum = resolveBankTingkatNumber(b) || 10;
      const gId = b.guru_id || '';
      const mId = b.mapel_id || '';
      const itemKey = `${gId}_${mId}_${tNum}`;

      if (!processedKeys.has(itemKey)) {
        processedKeys.add(itemKey);
        const count = b.jumlah_soal || b._count?.Soal || 0;
        const isShared = Boolean(b.is_shared || b.status === 'PUBLISHED');
        items.push({
          id: b.id,
          guru_id: gId,
          nama_guru: b.Guru?.nama_guru || 'Guru Pengampu',
          mapel_id: mId,
          nama_mapel: b.Mapel?.nama_mapel || 'Mata Pelajaran',
          tingkat: tNum,
          assignedTeachers: [{ id: gId, nama_guru: b.Guru?.nama_guru || 'Guru Pengampu' }],
          bankSoal: b,
          soalCount: count,
          status: count > 0 ? 'READY' : 'DRAFT_EMPTY',
          isShared,
          creatorName: b.Guru?.nama_guru || 'Guru Pengampu',
          isCoveredByMaster: false,
        });
      }
    });

    return items;
  }, [rawGuruMapel, bankList, tenantId]);

  // ── 3. Statistik Audit Kesiapan ──
  const totalTargets = auditedTargetList.length;
  const readyTargets = auditedTargetList.filter((t) => t.status === 'READY').length;
  const uncreatedCount = auditedTargetList.filter((t) => t.status === 'UNCREATED').length;
  const draftEmptyCount = auditedTargetList.filter((t) => t.status === 'DRAFT_EMPTY').length;
  const needActionCount = uncreatedCount + draftEmptyCount;

  // ── 4. Filter List ──
  const filteredList = useMemo(() => {
    return auditedTargetList.filter((t) => {
      if (statusFilter === 'READY' && t.status !== 'READY') return false;
      if (statusFilter === 'NEED_ACTION' && t.status === 'READY') return false;
      if (filterTingkat !== 'ALL' && t.tingkat !== filterTingkat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const mapelMatch = t.nama_mapel.toLowerCase().includes(q);
        const guruMatch = t.nama_guru.toLowerCase().includes(q);
        if (!mapelMatch && !guruMatch) return false;
      }
      return true;
    });
  }, [auditedTargetList, statusFilter, filterTingkat, searchQuery]);

  // ── 5. Action Handlers ──
  const handleNudgeWhatsApp = (target: AuditedTargetItem) => {
    const rawHp = target.assignedTeachers[0]?.no_hp;
    const cleanHp = rawHp ? rawHp.replace(/[^0-9]/g, '').replace(/^0/, '62') : '';
    const teacherName = target.nama_guru;
    const mapelName = target.nama_mapel;
    const tingkatStr = `Tingkat ${formatTingkatRomawi(target.tingkat)} (Kelas ${target.tingkat})`;

    const msg =
      target.status === 'UNCREATED'
        ? `Halo Bapak/Ibu ${teacherName}, mohon konfirmasi pembuatan naskah Asesmen Ujian CBT untuk mata pelajaran ${mapelName} ${tingkatStr} yang belum terdaftar di sistem. Mohon dapat segera menginput naskah atau mengklaim bank master MGMP. Terima kasih.`
        : `Halo Bapak/Ibu ${teacherName}, bank soal untuk mata pelajaran ${mapelName} ${tingkatStr} saat ini masih berisi 0 butir soal. Mohon kesediaannya melengkapi butir soal agar jadwal ujian dapat segera diterbitkan panitia. Terima kasih.`;

    const waUrl = cleanHp
      ? `https://wa.me/${cleanHp}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
    toast.success(`Membuka WhatsApp untuk ${teacherName}`);
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
      {/* ── 1. Hero Summary Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>Fase 1: Audit Kesiapan Materi & Bank Soal Ujian</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Rekonsiliasi otomatis SK Mengajar Kurikulum vs Naskah CBT. Pantau guru yang belum membuat atau yang ter-cover MGMP.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-violet-200 bg-violet-50 text-violet-700">
            <span>{totalTargets} Target Mapel-Guru</span>
          </Badge>
          <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-300 bg-emerald-50 text-emerald-800">
            <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
            <span>{readyTargets} Siap Ujian</span>
          </Badge>
          {needActionCount > 0 ? (
            <Badge variant="outline" className="px-2.5 py-1 font-bold border-rose-300 bg-rose-50 text-rose-800">
              <AlertCircle size={13} className="mr-1 text-rose-600" />
              <span>{needActionCount} Perlu Tindakan ({uncreatedCount} Belum Buat)</span>
            </Badge>
          ) : (
            <Badge variant="outline" className="px-2.5 py-1 font-bold border-emerald-300 bg-emerald-50 text-emerald-800">
              <span>✓ 100% Target Lengkap</span>
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
              Semua ({totalTargets})
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
              <span>Perlu Tindakan ({needActionCount})</span>
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
              <span>Sudah Siap ({readyTargets})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-56">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mapel atau guru..."
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
              <span>Lanjut ke Fase 2: Ploting Ruang</span>
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── 3. Grid Kartu Audit Kesiapan Mapel Kurikulum ── */}
      {filteredList.length === 0 ? (
        <div className="p-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400">
          Tidak ada mapel atau guru yang cocok dengan filter yang dipilih.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredList.map((target) => (
            <CbtAuditedTargetCard
              key={target.id}
              target={target}
              onPeriksaButir={(bank) => {
                setSelectedBankForDetail(bank);
                setIsDetailModalOpen(true);
              }}
              onEditBank={(bank) => {
                setSelectedBankToEdit(bank);
                setIsFormModalOpen(true);
              }}
              onInputSoal={(bank) => {
                setSelectedBankForDetail(bank);
                setIsDetailModalOpen(true);
              }}
              onCreateForTarget={handleCreateForTarget}
              onNudgeWhatsApp={handleNudgeWhatsApp}
            />
          ))}
        </div>
      )}

      {/* ── 4. Modals ── */}
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
