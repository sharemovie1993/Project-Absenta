import React, { useState, useMemo, useCallback } from 'react';
import { SectionCard } from '../../components/ui/SectionCard';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { formatDate } from '@/utils/date.utils';
import React, { useState, useMemo, useCallback } from 'react';
import { useCapabilities } from '../../hooks/useCapabilities';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { JadwalNavPill } from '@/components/kurikulum/JadwalNavPill';
import { useJadwalKontrakKbm } from '../../hooks/kurikulum/useJadwalKontrakKbm';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { JadwalKontrakKbmItem } from '../../api/kurikulum/jadwal-kontrak-kbm.api';
import {
  BookOpen, Users, School, FileText, Trash2, Search, RefreshCw,
  ChevronDown, CheckCircle2, AlertCircle, Clock, Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const ATURAN_BLOK_LABEL: Record<string, string> = {
  TUNGGAL: '1 JP',
  DOBEL: '2 JP',
  TIGA: '3 JP',
  EMPAT: '4 JP',
  BLOK_PENUH: 'Blok Penuh',
};

const ATURAN_BLOK_COLOR: Record<string, string> = {
  TUNGGAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  DOBEL: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  TIGA: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  EMPAT: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300',
  BLOK_PENUH: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
};

const JadwalKontrakKbmPage: React.FC = () => {
  const { can, isKurikulum, isAdmin, isAuthenticated } = useCapabilities();
  const authLoading = !isAuthenticated;

  // === Filter states ===
  const [selectedTahunId, setSelectedTahunId] = useState('');
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedKelasId, setSelectedKelasId] = useState('');
  const [selectedGuruId, setSelectedGuruId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const canView = useMemo(() => isAdmin || isKurikulum || can('academic.teaching.view'), [isAdmin, isKurikulum, can]);
  const canManage = useMemo(() => isAdmin || isKurikulum || can('academic.teaching.manage'), [isAdmin, isKurikulum, can]);

  // === Hooks untuk dropdown filter ===
  const { options: tahunOptions } = useTahunPelajaranOptions();
  const { options: semesterOptions } = useSemesterOptions({ tahunPelajaranId: selectedTahunId });

  // === Main data hook ===
  const {
    groupedByKelas,
    summary,
    total,
    isLoading,
    isFetching,
    refetch,
    deleteKontrak,
    isDeleting,
    kelasOptionsFromData,
    guruOptionsFromData,
  } = useJadwalKontrakKbm({
    enabled: canView,
    tahun_pelajaran_id: selectedTahunId || undefined,
    semester_id: selectedSemesterId || undefined,
    kelas_id: selectedKelasId || undefined,
    guru_id: selectedGuruId || undefined,
    search: searchQuery || undefined,
  });

  // === Delete handlers ===
  const handleDelete = useCallback((id: string) => setDeleteConfirmId(id), []);
  const confirmDelete = useCallback(() => {
    if (!deleteConfirmId) return;
    deleteKontrak(deleteConfirmId, {
      onSuccess: () => setDeleteConfirmId(null),
    });
  }, [deleteConfirmId, deleteKontrak]);

  if (!canView) return (
    <AcademicPageLayout
      hardeningModuleKey="kurikulum_jadwal_kontrak"
      instruction={{
        title: "Panduan Kontrak Jadwal KBM",
        description: "Manajemen alokasi kontrak jam mengajar guru dan jadwal KBM terpadu.",
        items: [
          { text: "Pilih guru atau kelas untuk memverifikasi kontrak mengajar mingguan." },
          { text: "Pastikan total beban JP guru tidak melampaui batas standar kurikulum." }
        ]
      }}
      title="Kontrak KBM"
      subtitle="Anda tidak memiliki akses ke halaman ini."
    >
      <div className="flex items-center justify-center h-40 gap-3">
        <AlertCircle className="text-rose-500 w-8 h-8" />
        <span className="text-slate-500">Akses Ditolak</span>
      </div>
    </AcademicPageLayout>
  );

  return (
    <AcademicPageLayout
      hardeningModuleKey="kurikulum_jadwal_kontrak" 
      title="Jadwal Kontrak KBM"
      description="Daftar kontrak pelajaran hasil impor atau konfigurasi manual per kelas, guru, dan mata pelajaran"
    >
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 max-w-full border-none shadow-none bg-transparent p-0">
      {/* === SUMMARY STATS === */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: 'Total Kontrak',
            value: summary?.total_kontrak ?? '-',
            icon: <FileText className="w-5 h-5" />,
            gradient: 'from-indigo-500 to-purple-600',
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
          },
          {
            label: 'Kelas Terlibat',
            value: summary?.total_kelas_terlibat ?? '-',
            icon: <School className="w-5 h-5" />,
            gradient: 'from-emerald-500 to-teal-600',
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          },
          {
            label: 'Guru Terlibat',
            value: summary?.total_guru_terlibat ?? '-',
            icon: <Users className="w-5 h-5" />,
            gradient: 'from-amber-500 to-orange-600',
            bg: 'bg-amber-50 dark:bg-amber-950/40',
          },
        ]?.map((s) => (
          <div
            key={s.label}
            className={cn(
              'rounded-2xl p-4 flex items-center gap-4 border border-slate-200 dark:border-slate-800',
              s.bg
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white shadow-sm',
                s.gradient
              )}
            >
              {s.icon}
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">{s.value}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* === FILTER BAR === */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input aria-label="Input kontrak KBM" 
            id="search-kontrak-kbm"
            type="text"
            placeholder="Cari guru, mapel, atau kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tahun Pelajaran */}
        <div className="w-full sm:w-48">
          <SearchableSelect
            id="tp_select"
            aria-label="Pilih Tahun Pelajaran"
            options={[{ value: '', label: 'Semua Tahun' }, ...tahunOptions]}
            value={selectedTahunId}
            onValueChange={(val) => {
              setSelectedTahunId(val);
              setSelectedSemesterId('');
            }}
            placeholder="Pilih Tahun..."
          />
        </div>

        {/* Semester */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="sem_select"
            aria-label="Pilih Semester"
            options={[{ value: '', label: 'Semua Semester' }, ...semesterOptions]}
            value={selectedSemesterId}
            onValueChange={setSelectedSemesterId}
            placeholder="Pilih Semester..."
          />
        </div>

        {/* Filter Kelas */}
        <div className="w-full sm:w-44">
          <SearchableSelect
            id="kelas_select"
            aria-label="Pilih Kelas"
            options={[{ value: '', label: 'Semua Kelas' }, ...kelasOptionsFromData]}
            value={selectedKelasId}
            onValueChange={setSelectedKelasId}
            placeholder="Pilih Kelas..."
          />
        </div>

        {/* Filter Guru */}
        <div className="w-full sm:w-48">
          <SearchableSelect
            id="guru_select"
            aria-label="Pilih Guru"
            options={[{ value: '', label: 'Semua Guru' }, ...guruOptionsFromData]}
            value={selectedGuruId}
            onValueChange={setSelectedGuruId}
            placeholder="Pilih Guru..."
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors disabled:opacity-50"
          title="Muat Ulang"
        >
          <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
        </button>

        <div className="ml-auto text-xs text-slate-500 dark:text-slate-400 font-medium">
          {total} kontrak
        </div>
      </div>

      {/* === MAIN TABLE — GROUPED BY KELAS === */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat data kontrak KBM...</span>
        </div>
      ) : groupedByKelas.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Layers className="w-10 h-10" />
          <div className="text-sm font-medium">Tidak ada data kontrak KBM</div>
          <div className="text-xs">Coba ubah filter atau lakukan impor XML aSc terlebih dahulu</div>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByKelas?.map(([kelasId, { nama: kelasNama, items }]) => (
            <KelasKontrakGroup
              key={kelasId}
              kelasNama={kelasNama}
              items={items}
              canManage={canManage}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* === DELETE CONFIRM DIALOG === */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-800 p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">Hapus Kontrak KBM?</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Tindakan ini tidak dapat dibatalkan.</div>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    
      </SectionCard>
</AcademicPageLayout>
  );
};

// === Sub-component: Grup Kelas ===
interface KelasKontrakGroupProps {
  kelasNama: string;
  items: JadwalKontrakKbmItem[];
  canManage: boolean;
  onDelete: (id: string) => void;
}

const KelasKontrakGroup: React.FC<KelasKontrakGroupProps> = React.memo(({
  kelasNama, items, canManage, onDelete,
}) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Kelas Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-b border-slate-200 dark:border-slate-800">
        <School className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="font-bold text-indigo-900 dark:text-indigo-200 text-sm uppercase tracking-wide">
          {kelasNama}
        </span>
        <span className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-full">
          {items.length} kontrak
        </span>
      </div>

      {/* Content */}
      {isMobile ? (
        <div className="p-3 space-y-3">
          {items?.map((item) => (
            <div
              key={item.id}
              className="p-3.5 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-slate-100 truncate">
                      {item.Mapel?.nama_mapel || <span className="text-rose-400 italic">Mapel tidak diset</span>}
                    </h5>
                    {item.Mapel?.kode_mapel && (
                      <span className="text-[10px] text-slate-400">{item.Mapel.kode_mapel}</span>
                    )}
                  </div>
                </div>
                {item.is_pembiasaan ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 shrink-0">
                    Pembiasaan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                    <CheckCircle2 className="w-2.5 h-2.5" /> KBM
                  </span>
                )}
              </div>

              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium shrink-0">Guru:</span>
                  {item.Guru ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                        {item.Guru.nama_guru.charAt(0)}
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {item.Guru.nama_guru}
                      </span>
                    </div>
                  ) : (
                    <span className="text-amber-500 italic text-[10px] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Belum diset
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Total JP</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{item.total_jp} JP</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Durasi / Kartu</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{item.durasi_jp} JP ({item.jumlah_kartu}x)</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block font-medium mb-0.5">Aturan Blok</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
                      ATURAN_BLOK_COLOR[item.aturan_blok] || 'bg-slate-100 text-slate-600'
                    )}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {ATURAN_BLOK_LABEL[item.aturan_blok] || item.aturan_blok}
                  </span>
                </div>
              </div>

              {canManage && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onDelete(item.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                <th className="py-2.5 px-4 text-left">Mata Pelajaran</th>
                <th className="py-2.5 px-4 text-left">Guru Pengampu</th>
                <th className="py-2.5 px-4 text-center">Total JP</th>
                <th className="py-2.5 px-4 text-center">Durasi / Kartu</th>
                <th className="py-2.5 px-4 text-center">Blok</th>
                <th className="py-2.5 px-4 text-center">Jml Kartu</th>
                <th className="py-2.5 px-4 text-center">Tipe</th>
                {canManage && <th className="py-2.5 px-4 text-center w-12">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {items?.map((item) => (
                <KontrakRow
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

// === Sub-component: Baris Kontrak ===
interface KontrakRowProps {
  item: JadwalKontrakKbmItem;
  canManage: boolean;
  onDelete: (id: string) => void;
}

const KontrakRow: React.FC<KontrakRowProps> = React.memo(({ item, canManage, onDelete }) => (
  <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors group">
    {/* Mapel */}
    <td className="py-2.5 px-4">
      <div className="flex items-center gap-2">
        <BookOpen className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">
            {item.Mapel?.nama_mapel || (
              <span className="text-rose-400 italic">Mapel tidak diset</span>
            )}
          </div>
          {item.Mapel?.kode_mapel && (
            <div className="text-[10px] text-slate-400">{item.Mapel.kode_mapel}</div>
          )}
        </div>
      </div>
    </td>

    {/* Guru */}
    <td className="py-2.5 px-4">
      {item.Guru ? (
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shrink-0">
            {item.Guru.nama_guru.charAt(0)}
          </div>
          <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
            {item.Guru.nama_guru}
          </span>
        </div>
      ) : (
        <span className="text-amber-500 italic text-[11px] flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Belum diset
        </span>
      )}
    </td>

    {/* Total JP */}
    <td className="py-2.5 px-4 text-center">
      <span className="font-bold text-slate-800 dark:text-slate-100">{item.total_jp}</span>
      <span className="text-slate-400 ml-0.5">JP</span>
    </td>

    {/* Durasi per Kartu */}
    <td className="py-2.5 px-4 text-center">
      <span className="font-medium text-slate-600 dark:text-slate-300">{item.durasi_jp} JP</span>
    </td>

    {/* Aturan Blok */}
    <td className="py-2.5 px-4 text-center">
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
          ATURAN_BLOK_COLOR[item.aturan_blok] || 'bg-slate-100 text-slate-600'
        )}
      >
        <Clock className="w-2.5 h-2.5" />
        {ATURAN_BLOK_LABEL[item.aturan_blok] || item.aturan_blok}
      </span>
    </td>

    {/* Jumlah Kartu */}
    <td className="py-2.5 px-4 text-center">
      <span className="font-semibold text-slate-700 dark:text-slate-200">{item.jumlah_kartu}x</span>
    </td>

    {/* Tipe */}
    <td className="py-2.5 px-4 text-center">
      {item.is_pembiasaan ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Pembiasaan
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-2.5 h-2.5" /> KBM
        </span>
      )}
    </td>

    {/* Aksi */}
    {canManage && (
      <td className="py-2.5 px-4 text-center">
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
          title="Hapus Kontrak KBM"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    )}
  </tr>
));

export default JadwalKontrakKbmPage;
