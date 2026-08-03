import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Label, Input, Modal, Loader } from '../../ui';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { 
  getJadwalKBM, 
  createJadwalKBM, 
  deleteJadwalKBM, 
  type JadwalKBM 
} from '../../../api/attendance/jadwalKBM.api';
import { getJadwalKegiatan, type JadwalKegiatanItem } from '../../../api/attendance/jadwalKegiatan.api';
import { formatErrorMessage } from '../../../api/apiUtils';
import { LogService } from '../../../utils/LogService';
import { Plus, Trash2, Calendar, Clock, BookOpen, User, Edit2 } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { jenisKegiatanMasterApi, type JenisKegiatanMaster } from '../../../api/academic/jenisKegiatanMaster.api';
import { toast } from 'react-hot-toast';
import { cn } from '../../../lib/utils';
import { WORKDAYS_HARI_KEYS } from '../../../constants/day.constants';
import { 
  useGuruOptions, 
  useMapelOptions, 
  useKelasOptions, 
  useTahunPelajaranOptions, 
  useSemesterOptions 
} from '../../common';

// Pillar 5: Lazy Loading
const JadwalKBMForm = lazy(() => import('./JadwalKBMForm').then(m => ({ default: m.JadwalKBMForm })));

interface PendingRow {
  hari: string;
  slot_index: number;
  jam_mulai: string;
  jam_selesai: string;
  jenis_kegiatan: string;
  mapel_id?: string;
  guru_id?: string;
}

export const JadwalKBMList: React.FC<{ kelasId?: string }> = ({ kelasId }) => {
  const queryClient = useQueryClient();
  const [agendaFilter, setAgendaFilter] = useState<'ALL' | 'KBM' | 'KEGIATAN'>('ALL');
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, can } = useAuth();

  // ── Canonical Reference Options Hooks ─────────────────────────────────────
  const { options: kelasOptions, rawList: kelasRawList } = useKelasOptions();
  const { options: guruOptions } = useGuruOptions({ jenisPtk: 'PENDIDIK' });
  const { options: mapelOptions } = useMapelOptions();
  const { activeTahunPelajaran } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions({ tahunPelajaranId: activeTahunPelajaran?.id });

  const [selectedKelasId, setSelectedKelasId] = useState<string>(kelasId || '');
  const [activeTahunId, setActiveTahunId] = useState<string>('');
  const [activeSemesterId, setActiveSemesterId] = useState<string>('');
  const [petugasLabel, setPetugasLabel] = useState<string>('');

  useEffect(() => {
    if (kelasId) {
      setSelectedKelasId(kelasId);
    }
  }, [kelasId]);

  useEffect(() => {
    if (kelasOptions.length > 0 && !selectedKelasId && !kelasId) {
      setSelectedKelasId(kelasOptions[0].value);
    }
  }, [kelasOptions, selectedKelasId, kelasId]);

  useEffect(() => {
    if (activeTahunPelajaran?.id && !activeTahunId) {
      setActiveTahunId(activeTahunPelajaran.id);
    }
  }, [activeTahunPelajaran, activeTahunId]);

  useEffect(() => {
    if (activeSemester?.id && !activeSemesterId) {
      setActiveSemesterId(activeSemester.id);
    }
  }, [activeSemester, activeSemesterId]);

  const { data: jenisResData } = useQuery({
    queryKey: ['jenis-kegiatan-list-options'],
    queryFn: () => jenisKegiatanMasterApi.getAll({ page: 1, limit: 100 }).catch(() => null),
    staleTime: 10 * 60 * 1000,
  });

  const jenisOptions = useMemo(() => {
    const jenisMaster = (jenisResData?.data || [])
      .filter((j: JenisKegiatanMaster) => j.aktif)
      .filter((j: JenisKegiatanMaster) => String(j.tipe).toUpperCase() !== 'GERBANG');
    return jenisMaster.map((j: JenisKegiatanMaster) => ({ value: j.id, label: j.nama, tipe: String(j.tipe) }));
  }, [jenisResData]);

  // ── Query: Jadwal KBM & Kegiatan ──────────────────────────────────────────
  const { data: fetchJadwalData, isLoading: loading, refetch: fetchJadwal } = useQuery({
    queryKey: ['jadwal-kbm-list', selectedKelasId, activeTahunId, activeSemesterId, refreshKey],
    queryFn: async () => {
      const [res, kegiatanRes] = await Promise.all([
        getJadwalKBM({
          kelas_id: selectedKelasId || undefined,
          tahun_pelajaran_id: activeTahunId || undefined,
          semester_id: activeSemesterId || undefined
        }).catch(() => null),
        getJadwalKegiatan({ aktif: true }).catch(() => ({ data: [] }))
      ]);
      return {
        jadwal: res?.data || [],
        meta: res?.meta || null,
        kegiatan: kegiatanRes?.data || []
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const jadwal = fetchJadwalData?.jadwal || [];
  const jadwalKegiatan = fetchJadwalData?.kegiatan || [];

  const kelasLabel = useMemo(() => {
    const metaLabel = fetchJadwalData?.meta?.nama_kelas;
    if (metaLabel) return metaLabel;
    const found = kelasOptions.find(k => k.value === selectedKelasId);
    return found?.label || '';
  }, [fetchJadwalData, kelasOptions, selectedKelasId]);

  useEffect(() => {
    setPetugasLabel(user?.full_name || user?.email || 'Siswa');
  }, [user]);

  // Edit State
  const [editingItem, setEditingItem] = useState<JadwalKBM | undefined>(undefined);
  const [pendingNewRows, setPendingNewRows] = useState<Record<string, Array<PendingRow>>>({});

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getOptionLabel = useCallback((options: Array<{ value: string; label: string }>, value?: string) => {
    if (!value) return undefined;
    return options.find((opt) => opt.value === value)?.label;
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteJadwalKBM(deletingId);
      queryClient.invalidateQueries({ queryKey: ['jadwal-kbm-grid'] });
      queryClient.invalidateQueries({ queryKey: ['jadwal-guru-timeline'] });
      queryClient.invalidateQueries({ queryKey: ['beban-guru-list'] });
      queryClient.invalidateQueries({ queryKey: ['bebanGuru'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-config'] });
      queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
      setRefreshKey(prev => prev + 1);
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      toast.success('Jadwal berhasil dihapus');
    } catch (err) {
      LogService.error('Failed to delete jadwal', err);
      toast.error('Gagal menghapus jadwal');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingId]);

  const addPendingRow = useCallback((day: string) => {
    setPendingNewRows(prev => {
      const next = { ...prev };
      const list = [...(next[day] || [])];
      list.push({ 
        hari: day, 
        slot_index: 1,
        jam_mulai: '07:00', 
        jam_selesai: '07:45', 
        jenis_kegiatan: jenisOptions.find(o => o.tipe === 'KBM')?.value || jenisOptions[0]?.value || '' 
      });
      next[day] = list;
      return next;
    });
  }, [jenisOptions]);

  const updatePendingField = useCallback((day: string, idx: number, field: keyof PendingRow, value: string | undefined) => {
    setPendingNewRows(prev => {
      const next = { ...prev };
      const list = [...(next[day] || [])];
      const row = { ...list[idx] };
      (row as any)[field] = value;
      list[idx] = row;
      next[day] = list;
      return next;
    });
  }, []);

  const savePendingRow = useCallback(async (day: string, idx: number) => {
    const row = (pendingNewRows[day] || [])[idx];
    if (!row) return;
    try {
      await createJadwalKBM({
        tahun_pelajaran_id: activeTahunId,
        semester_id: activeSemesterId,
        kelas_id: selectedKelasId,
        hari: day,
        slot_index: Number(row.slot_index || 1),
        jam_mulai: row.jam_mulai || '07:00',
        jam_selesai: row.jam_selesai || '07:45',
        jenis_kegiatan: row.jenis_kegiatan,
        mapel_id: row.mapel_id,
        guru_id: row.guru_id
      });
      setPendingNewRows(prev => {
        const next = { ...prev };
        next[day] = (next[day] || []).filter((_, i) => i !== idx);
        return next;
      });
      setRefreshKey(prev => prev + 1);
      toast.success('Jadwal berhasil disimpan');
    } catch (err) {
      LogService.error('Failed to save new jadwal row', err);
      toast.error(formatErrorMessage(err));
    }
  }, [pendingNewRows, activeTahunId, activeSemesterId, selectedKelasId]);

  const removePendingRow = useCallback((day: string, idx: number) => {
    setPendingNewRows(prev => {
      const next = { ...prev };
      next[day] = (next[day] || []).filter((_, i) => i !== idx);
      return next;
    });
  }, []);

  const days = WORKDAYS_HARI_KEYS;

  const getJadwalByDay = useCallback((day: string) => {
    const kbmItems = (agendaFilter === 'KEGIATAN') ? [] : jadwal.filter(j => j.hari === day).map(j => ({
      ...j,
      is_kegiatan: false,
      category: 'KBM'
    }));

    const kegiatanItems = (agendaFilter === 'KBM') ? [] : jadwalKegiatan
      .filter(k => k.aktif && (k.hari ?? []).includes(day as any) && (k.target_semua_kelas || (k.target_kelas_ids ?? []).includes(selectedKelasId)))
      .map(k => ({
        id: `kegiatan-${k.id}`,
        tenant_id: k.tenant_id,
        tahun_pelajaran_id: k.tahun_pelajaran_id,
        semester_id: '',
        kelas_id: selectedKelasId,
        hari: day as any,
        slot_index: 0,
        jam_mulai: k.waktu_mulai || '07:00',
        jam_selesai: k.waktu_selesai || '08:00',
        jenis_kegiatan: k.nama,
        is_kegiatan: true,
        category: 'KEGIATAN',
        nama: k.nama
      }));

    return [...kbmItems, ...kegiatanItems].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
  }, [jadwal, jadwalKegiatan, agendaFilter, selectedKelasId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Jadwal Kelas: {kelasLabel || '(Kelas)'}</h2>
          <p className="text-slate-500 dark:text-slate-400">Petugas: {petugasLabel || '-'}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
            {/* Filter Segmented */}
            <div className="bg-slate-100 dark:bg-slate-900 p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setAgendaFilter('ALL')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  agendaFilter === 'ALL'
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Semua Agenda
              </button>
              <button
                type="button"
                onClick={() => setAgendaFilter('KBM')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  agendaFilter === 'KBM'
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                📘 KBM Saja
              </button>
              <button
                type="button"
                onClick={() => setAgendaFilter('KEGIATAN')}
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                  agendaFilter === 'KEGIATAN'
                    ? "bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                🟧 Kegiatan Saja
              </button>
            </div>

            {!kelasId && (user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN' || can('academic.schedules.view.list') || can('attendance.schedules.view.list')) && (
              <div className="w-[200px]">
                  <SearchableSelect
                    value={selectedKelasId}
                    onValueChange={setSelectedKelasId}
                    options={kelasOptions}
                    placeholder="Pilih Kelas"
                    searchPlaceholder="Cari Kelas..."
                  />
              </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {days.map(day => {
          const dayJadwal = getJadwalByDay(day);
          return (
            <Card key={day} className="h-full flex flex-col border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden rounded-2xl">
              <CardHeader className="pb-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center text-slate-700 dark:text-slate-300">
                  <Calendar className="mr-2 h-4 w-4 text-indigo-500" />
                  {day}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-4 space-y-3 bg-white dark:bg-slate-950">
                <div className="flex justify-end mb-2">
                  {(can('academic.schedules.create') || can('attendance.schedules.create')) && (
                    <Button variant="outline" size="sm" className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900" onClick={() => addPendingRow(day)}>
                      <Plus className="mr-2 h-3 w-3" /> Tambah baris
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="flex justify-center py-10"><Loader /></div>
                ) : dayJadwal.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-600 text-sm italic bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                    Belum ada jadwal
                  </div>
                ) : (
                  dayJadwal.map((item: any) => (
                    <div key={item.id} className={cn(
                      "group relative flex flex-col p-4 rounded-2xl border transition-all duration-300",
                      item.is_kegiatan
                        ? "border-amber-200/80 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/10 hover:shadow-md"
                        : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30"
                    )}>
                      <div className="flex justify-between items-center mb-3 gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            "font-mono text-[10px] font-black flex items-center px-2.5 py-1 rounded-lg",
                            item.is_kegiatan
                              ? "bg-amber-100/60 dark:bg-amber-900/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                          )}>
                            <Clock className="mr-1.5 h-3 w-3 flex-shrink-0 text-indigo-500" />
                            <span>{item.is_kegiatan ? `${item.jam_mulai} - ${item.jam_selesai}` : `Jam ${item.slot_index || 1} (${item.jam_mulai} - ${item.jam_selesai})`}</span>
                          </Badge>
                          {item.is_kegiatan && (
                            <Badge className="bg-amber-500 text-white border-none text-[9px] px-2 py-0.5 font-bold">
                              KEGIATAN
                            </Badge>
                          )}
                        </div>
                        {!item.is_kegiatan && (
                          <div className="flex opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {(can('academic.schedules.update') || can('attendance.schedules.update')) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 mr-1.5 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg"
                                  onClick={() => setEditingItem(item)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {(can('academic.schedules.delete') || can('attendance.schedules.delete')) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                          </div>
                        )}
                      </div>
                      
                      {item.is_kegiatan ? (
                        <div className="space-y-1">
                          <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                            {item.nama || item.jenis_kegiatan}
                          </div>
                          <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                            Kegiatan Kesiswaan / Pembiasaan Sekolah
                          </div>
                        </div>
                      ) : (() => {
                        const opt = jenisOptions.find(o => o.value === item.jenis_kegiatan);
                        const t = (opt?.tipe || String(item.jenis_kegiatan || '')).toUpperCase();
                        return t.startsWith('KBM');
                      })() ? (
                        <div className="space-y-2">
                          <div className="font-bold text-sm flex items-center text-slate-800 dark:text-slate-200">
                            <BookOpen className="mr-2 h-3.5 w-3.5 text-indigo-500" />
                            {item.Mapel?.nama_mapel || '-'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center font-medium">
                            <User className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                            {item.Guru?.User?.full_name || 'Guru'}
                          </div>
                        </div>
                      ) : (
                        <div className="font-black text-[10px] uppercase tracking-widest text-center py-2.5 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800">
                          {getOptionLabel(jenisOptions, item.jenis_kegiatan) || item.jenis_kegiatan}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {(pendingNewRows[day] || []).map((row, idx) => {
                  const selectedOpt = jenisOptions.find(o => o.value === row.jenis_kegiatan);
                  const tipe = (selectedOpt?.tipe || String(row.jenis_kegiatan || '')).toUpperCase();
                  return (
                    <div key={`new-${day}-${idx}`} className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jenis Kegiatan</Label>
                          <SearchableSelect
                            value={row.jenis_kegiatan}
                            onValueChange={(v) => updatePendingField(day, idx, 'jenis_kegiatan', v)}
                            options={jenisOptions}
                            placeholder="Pilih Jenis"
                            searchPlaceholder="Cari Jenis..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Jam Pelajaran</Label>
                          <SearchableSelect
                            value={String(row.slot_index || 1)}
                            onValueChange={(v) => updatePendingField(day, idx, 'slot_index', String(Number(v || 1)))}
                            options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Jam Pelajaran Ke-${i + 1}` }))}
                            placeholder="Pilih Jam Pelajaran"
                            searchPlaceholder="Cari Jam Pelajaran..."
                          />
                        </div>
                      </div>
                      {tipe.startsWith('KBM') && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Mapel</Label>
                            <SearchableSelect
                              value={row.mapel_id}
                              onValueChange={(v) => updatePendingField(day, idx, 'mapel_id', v)}
                              options={mapelOptions}
                              placeholder="Pilih Mapel"
                              searchPlaceholder="Cari Mapel..."
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Guru</Label>
                            <SearchableSelect
                              value={row.guru_id}
                              onValueChange={(v) => updatePendingField(day, idx, 'guru_id', v)}
                              options={guruOptions}
                              placeholder="Pilih Guru"
                              searchPlaceholder="Cari Guru..."
                            />
                          </div>
                        </div>
                      )}
                      {(tipe === 'JURUSAN' || tipe === 'BK') && (
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Guru / Pembina</Label>
                          <SearchableSelect
                            value={row.guru_id}
                            onValueChange={(v) => updatePendingField(day, idx, 'guru_id', v)}
                            options={guruOptions}
                            placeholder="Pilih Guru"
                            searchPlaceholder="Cari Guru..."
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                        <Button variant="ghost" size="sm" className="rounded-xl text-slate-500" onClick={() => removePendingRow(day, idx)}>Batal</Button>
                        <Button size="sm" className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20" onClick={() => savePendingRow(day, idx)}>Simpan Jadwal</Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(undefined)}
        title="Edit Jadwal"
        size="lg"
      >
        <Suspense fallback={<div className="flex justify-center py-20"><Loader /></div>}>
          {editingItem && (
            <div className="p-6">
              <JadwalKBMForm
                initialData={editingItem}
                kelasId={selectedKelasId}
                tahunPelajaranId={activeTahunId}
                semesterId={activeSemesterId}
                onSuccess={() => {
                  setEditingItem(undefined);
                  setRefreshKey(prev => prev + 1);
                }}
                onCancel={() => setEditingItem(undefined)}
              />
            </div>
          )}
        </Suspense>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Hapus Jadwal?"
        description="Apakah Anda yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus"
        cancelText="Batal"
        style="danger"
        onConfirm={executeDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        loading={isDeleting}
      />
    </div>
  );
};
