import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  UserCheck,
  Plus,
  Sparkles,
  AlertCircle,
  Edit3,
  Trash2,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  getJadwalKegiatan,
  createJadwalKegiatan,
  updateJadwalKegiatan,
  deleteJadwalKegiatan,
  type JadwalKegiatanItem,
} from '@/api/attendance/jadwalKegiatan.api';
import { getPembinaKegiatanEskul, type PembinaKegiatanEskulItem } from '@/api/attendance/pembinaKegiatanEskul.api';
import { jenisKegiatanMasterApi } from '@/api/academic/jenisKegiatanMaster.api';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { useAuthStore } from '@/store/authStore';
import { useConfirm } from '@/hooks/useConfirm';
import JadwalKegiatanFormModal, { type JadwalKegiatanFormData } from '@/components/attendance/kegiatan/JadwalKegiatanFormModal';
import { Button, Loader } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const parseArray = (field: unknown): string[] => {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(String) || [];
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field);
      if (Array.isArray(parsed)) return parsed.map(String) || [];
    } catch {}
    return field.split(',').map((s: string) => s.trim()).filter(Boolean) || [];
  }
  return [];
};

function calculateDuration(start?: string | null, end?: string | null): string {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  if (hours > 0 && minutes > 0) return `${hours}j ${minutes}m`;
  if (hours > 0) return `${hours} jam`;
  if (minutes > 0) return `${minutes} mnt`;
  return '';
}

export const EkskulJadwalTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { confirm } = useConfirm();
  const academicFilter = useAcademicFilter({ enableTp: true, enableSemester: true });
  const activeTpId = academicFilter.values.tahunPelajaranId || academicFilter.activeTpYear?.id || '';
  const activeTpName = academicFilter.activeTpYear?.tahun || 'Tahun Ajaran Aktif';

  const [activeSubView, setActiveSubView] = useState<'jadwal' | 'pembina'>('jadwal');
  const [showPembiasaanRef, setShowPembiasaanRef] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalKegiatanItem | null>(null);
  const [editingItems, setEditingItems] = useState<JadwalKegiatanItem[]>([]);
  const [presetNama, setPresetNama] = useState<string | undefined>(undefined);

  // Queries
  const { data: jadwalRes, isLoading: loadingJadwal } = useQuery({
    queryKey: ['ekskul-jadwal-kegiatan'],
    queryFn: () => getJadwalKegiatan({ aktif: true }),
  });

  const { data: pembinaRes, isLoading: loadingPembina } = useQuery({
    queryKey: ['ekskul-pembina-kegiatan'],
    queryFn: () => getPembinaKegiatanEskul('ALL'),
  });

  const { data: eskulListRes } = useQuery({
    queryKey: ['jenis-kegiatan-master-all'],
    queryFn: jenisKegiatanMasterApi.getAll,
  });

  const { rawList: classes = [] } = useKelasOptions();

  const jadwalList: JadwalKegiatanItem[] = jadwalRes?.data || [];
  const pembinaList: PembinaKegiatanEskulItem[] = pembinaRes?.data || [];
  const eskulList = eskulListRes?.data || [];

  // Separate Pembiasaan (Kesiswaan Agenda) vs Eskul
  const pembiasaanList = useMemo(() => {
    return jadwalList.filter(
      (j) =>
        j.jenis_kegiatan === 'PEMBIASAAN' ||
        (j.nama &&
          (j.nama.toLowerCase().includes('ketarunaan') ||
            j.nama.toLowerCase().includes('upacara') ||
            j.nama.toLowerCase().includes('apel') ||
            j.nama.toLowerCase().includes('duha')))
    );
  }, [jadwalList]);

  const eskulJadwalList = useMemo(() => {
    return jadwalList.filter((j) => !pembiasaanList.some((p) => p.id === j.id));
  }, [jadwalList, pembiasaanList]);

  // Authorization: Is Master Admin/Kesiswaan or Specific Pembina?
  const isMasterAdmin = useMemo(() => {
    if (!user) return false;
    const roleName = String(user.role?.name || '').toLowerCase();
    const positions = (user.position_codes || []).map(p => String(p).toUpperCase());
    const caps = user.capabilities || [];
    return (
      roleName === 'admin' ||
      roleName === 'superadmin' ||
      positions.includes('KESISWAAN') ||
      caps.includes('kesiswaan.schedules.create') ||
      caps.includes('kesiswaan.schedules.update')
    );
  }, [user]);

  // User's assigned eskul names
  const myAssignedEskulNames = useMemo(() => {
    if (!user) return new Set<string>();
    const userGuruId = user.guru_profile?.id || user.id;
    const userName = (user.full_name || user.name || '').toLowerCase().trim();

    const matches = pembinaList.filter(
      (p) =>
        (p.guru_id && p.guru_id === userGuruId) ||
        (p.nama_guru && p.nama_guru.toLowerCase().trim() === userName)
    );

    return new Set(matches.map((p) => (p.eskul_nama || '').toLowerCase().trim()).filter(Boolean));
  }, [user, pembinaList]);

  const canManageEskul = useCallback(
    (item: { nama?: string; jenis_kegiatan?: string }) => {
      if (isMasterAdmin) return true;
      const targetName = (item.nama || '').toLowerCase().trim();
      return myAssignedEskulNames.has(targetName);
    },
    [isMasterAdmin, myAssignedEskulNames]
  );

  // Invalidate queries
  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ekskul-jadwal-kegiatan'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan-list'] });
    queryClient.invalidateQueries({ queryKey: ['jadwal-kegiatan'] });
  }, [queryClient]);

  // Handlers for modal
  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setEditingItems([]);
    setPresetNama(undefined);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((item: JadwalKegiatanItem) => {
    const allRelated = jadwalList.filter(
      (j) =>
        j.id === item.id ||
        (j.nama && item.nama && j.nama.toLowerCase().trim() === item.nama.toLowerCase().trim())
    );
    setEditingItem(item);
    setEditingItems(allRelated.length > 0 ? allRelated : [item]);
    setPresetNama(item.nama);
    setIsModalOpen(true);
  }, [jadwalList]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
    setEditingItems([]);
    setPresetNama(undefined);
  }, []);

  const handleFormSubmit = useCallback(
    async (payloads: JadwalKegiatanFormData[]) => {
      if (!payloads || payloads.length === 0) return;
      const existingItemsToUpdate = [...editingItems];

      try {
        for (let i = 0; i < payloads.length; i++) {
          const payload = payloads[i];
          if (i < existingItemsToUpdate.length) {
            await updateJadwalKegiatan(existingItemsToUpdate[i].id, {
              ...payload,
              hari: (payload.hari || []).map((h) => h.toUpperCase()),
              tahun_pelajaran_id: activeTpId,
            });
          } else {
            await createJadwalKegiatan({
              ...payload,
              hari: (payload.hari || []).map((h) => h.toUpperCase()),
              tahun_pelajaran_id: activeTpId,
            });
          }
        }

        if (existingItemsToUpdate.length > payloads.length) {
          for (let i = payloads.length; i < existingItemsToUpdate.length; i++) {
            await deleteJadwalKegiatan(existingItemsToUpdate[i].id);
          }
        }

        invalidateAll();
        toast.success(
          payloads.length > 1
            ? `Matrix jadwal eskul (${payloads.length} slot) berhasil disimpan!`
            : 'Jadwal ekstrakurikuler berhasil disimpan!'
        );
        handleCloseModal();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan jadwal eskul.';
        toast.error(msg);
      }
    },
    [editingItems, activeTpId, invalidateAll, handleCloseModal]
  );

  const handleDeleteItem = useCallback(
    async (item: JadwalKegiatanItem) => {
      const ok = await confirm({
        title: 'Hapus Jadwal Ekstrakurikuler?',
        description: `Apakah Anda yakin ingin menghapus jadwal latihan "${item.nama}"?`,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        style: 'danger',
      });
      if (ok) {
        try {
          await deleteJadwalKegiatan(item.id);
          invalidateAll();
          toast.success(`Jadwal "${item.nama}" berhasil dihapus.`);
        } catch {
          toast.error('Gagal menghapus jadwal eskul.');
        }
      }
    },
    [confirm, invalidateAll]
  );

  return (
    <div className="space-y-4">
      {/* View Switcher Header & Action Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSubView('jadwal')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeSubView === 'jadwal'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Jadwal Latihan Mingguan
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView('pembina')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
              activeSubView === 'pembina'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            Daftar Guru Pembina &amp; Pelatih
          </button>
        </div>

        <div className="flex items-center gap-2.5 justify-between sm:justify-end">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {activeSubView === 'jadwal'
              ? `${eskulJadwalList.length} Jadwal Eskul`
              : `${pembinaList.length} Guru Pembina`}
          </div>

          {activeSubView === 'jadwal' && (isMasterAdmin || myAssignedEskulNames.size > 0) && (
            <Button
              variant="toolbarPrimary"
              size="toolbar"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-xs text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus size={13} />
              <span>Atur Jadwal Eskul</span>
            </Button>
          )}
        </div>
      </div>

      {/* Subview 1: Jadwal Latihan */}
      {activeSubView === 'jadwal' && (
        <div className="space-y-4">
          {/* Reference Banner: Agenda Kesiswaan (Acuan Waktu Bebas Eskul) */}
          {pembiasaanList.length > 0 && (
            <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 overflow-hidden shadow-2xs">
              <div
                onClick={() => setShowPembiasaanRef((prev) => !prev)}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-100/40 dark:hover:bg-amber-950/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 dark:text-amber-100 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Acuan Jam Kegiatan Kesiswaan (Prioritas Sekolah)</span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-200">
                        {pembiasaanList.length} Kegiatan Wajib
                      </span>
                    </h4>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      Jadwal eskul <strong>tidak boleh bertabrakan</strong> dengan kegiatan ini. Bentrok antar-eskul diperbolehkan.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <span className="hidden sm:inline">{showPembiasaanRef ? 'Tutup Acuan' : 'Lihat Acuan'}</span>
                  {showPembiasaanRef ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </div>

              {showPembiasaanRef && (
                <div className="p-3.5 pt-0 border-t border-amber-200/60 dark:border-amber-900/40">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-3">
                    {pembiasaanList.map((p) => {
                      const days = parseArray(p.hari).join(', ');
                      return (
                        <div
                          key={p.id}
                          className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-amber-200/70 dark:border-amber-900/40 shadow-2xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">
                              {p.nama}
                            </span>
                            <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-1.5 py-0.2 rounded-md">
                              Wajib
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                            <span>{days || 'Semua Hari'}</span>
                            <span className="font-mono font-bold text-amber-900 dark:text-amber-200">
                              {p.waktu_mulai} – {p.waktu_selesai || 'Selesai'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Eskul Schedule Cards Grid */}
          {loadingJadwal ? (
            <div className="py-16 flex justify-center items-center">
              <Loader />
            </div>
          ) : eskulJadwalList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {eskulJadwalList.map((item) => {
                const isManagedByMe = canManageEskul(item);
                const assignedPembinas = pembinaList.filter(
                  (p) => (p.eskul_nama || '').toLowerCase().trim() === (item.nama || '').toLowerCase().trim()
                );
                const dur = calculateDuration(item.waktu_mulai, item.waktu_selesai);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs space-y-3 relative group',
                      isManagedByMe
                        ? 'border-indigo-200/90 dark:border-indigo-900/60 hover:shadow-md hover:border-indigo-400'
                        : 'border-slate-200/80 dark:border-slate-800'
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                        {item.jenis_kegiatan || 'Ekstrakurikuler'}
                      </span>

                      {isManagedByMe ? (
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Eskul Binaan Anda
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <Lock size={10} /> Terkunci
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white leading-snug">
                        {item.nama}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {assignedPembinas.length > 0
                          ? `Pembina: ${assignedPembinas.map((p) => p.nama_guru).join(', ')}`
                          : 'Belum ada guru pembina tertaut'}
                      </p>
                    </div>

                    {/* Time & Day Info */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                        <span className="flex items-center gap-1.5 font-bold">
                          <Calendar size={13} className="text-indigo-500" />
                          <span>{parseArray(item.hari).join(', ') || 'Mingguan'}</span>
                        </span>
                        {dur && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {dur}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1.5 font-mono font-extrabold text-slate-800 dark:text-slate-200">
                          <Clock size={13} className="text-indigo-500" />
                          <span>
                            {item.waktu_mulai} – {item.waktu_selesai || 'Selesai'}
                          </span>
                        </span>

                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.target_semua_kelas ? 'Seluruh Kelas' : `${parseArray(item.target_kelas_ids).length} Rombel`}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {isManagedByMe && (
                      <div className="pt-1 flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>Edit Jadwal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                          title="Hapus jadwal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
              <Calendar className="mx-auto text-slate-300 dark:text-slate-700" size={38} />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Jadwal Latihan Eskul</h4>
                <p className="text-xs text-slate-400">
                  Guru Pembina dan Kesiswaan dapat mengatur jadwal mingguan kegiatan ekstrakurikuler di sini.
                </p>
              </div>
              {(isMasterAdmin || myAssignedEskulNames.size > 0) && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="rounded-xl font-bold bg-indigo-600 text-white"
                >
                  <Plus size={13} className="mr-1" /> Buat Jadwal Eskul
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Subview 2: Pembina & Pelatih */}
      {activeSubView === 'pembina' && (
        <div className="space-y-3">
          {loadingPembina ? (
            <div className="py-16 flex justify-center items-center">
              <Loader />
            </div>
          ) : pembinaList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {pembinaList.map((pembina) => {
                const isMe =
                  (user?.guru_profile?.id && pembina.guru_id === user.guru_profile.id) ||
                  (user?.full_name && pembina.nama_guru?.toLowerCase() === user.full_name?.toLowerCase());

                return (
                  <div
                    key={pembina.id}
                    className={cn(
                      'p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all shadow-xs space-y-2',
                      isMe
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20'
                        : 'border-slate-200/80 dark:border-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0',
                          isMe
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400'
                        )}
                      >
                        <UserCheck size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {pembina.nama_guru}
                          </h4>
                          {isMe && (
                            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Anda
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          NIP: {pembina.nip || '–'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Kegiatan Eskul:</span>
                      <span className="font-extrabold text-indigo-600 dark:text-indigo-400 truncate max-w-[150px]">
                        {pembina.eskul_nama || 'Ekstrakurikuler'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
              <UserCheck className="mx-auto text-slate-300 dark:text-slate-700" size={36} />
              <p className="text-xs font-bold text-slate-400">Belum ada pemetaan guru pembina yang terdaftar.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Form Jadwal Eskul */}
      {isModalOpen && (
        <JadwalKegiatanFormModal
          editingItem={editingItem}
          editingItems={editingItems}
          masterKegiatans={eskulList}
          classes={classes}
          activeTahunPelajaranId={activeTpId}
          activeTahunPelajaranName={activeTpName}
          presetNama={presetNama}
          conflictReferenceKegiatan={pembiasaanList}
          onClose={handleCloseModal}
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
};
