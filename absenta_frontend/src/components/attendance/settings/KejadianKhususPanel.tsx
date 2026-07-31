import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { getKejadianKhususList, createKejadianKhusus, deleteKejadianKhusus, type KejadianKhusus } from '../../../api/attendance/kejadianKhusus.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import { getSesiAbsensiList } from '../../../api/attendanceGerbang.api';
import { Button, Input, Card, Label, Badge } from '../../ui';
import ConfirmDialog from '../../ui/ConfirmDialog';
import { toast } from 'react-hot-toast';
import { Trash2, Plus, AlertCircle, ShieldAlert, XCircle, CheckCircle2, Users, BookOpen, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toLocalDate } from '../../../utils/attendance/time';

const SearchableSelect = lazy(() => import('../../ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const KejadianKhususPanelComponent: React.FC = () => {
  const [events, setEvents] = useState<KejadianKhusus[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [affectedSessions, setAffectedSessions] = useState<any[]>([]);
  const [isLoadingAffected, setIsLoadingAffected] = useState(false);
  
  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [newEvent, setNewEvent] = useState({
    tanggal: toLocalDate(),
    keterangan: '',
    abaikan_terlambat: true,
    mode_kejadian: 'NORMAL' as 'NORMAL' | 'LIBUR' | 'DISPEN',
    kelas_id: null as string | null
  });

  const PRESET_REASONS = [
    'Bencana Alam (Banjir/Gempa)',
    'Instruksi Libur Mendadak (Dinas)',
    'Cuaca Ekstrem',
    'Gangguan Keamanan / Darurat',
    'Masalah Teknis Infrastruktur',
    'Kunjungan Industri / Studi Banding',
    'Kegiatan Sosial / Takziah Masal'
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [eventsRes, classesRes] = await Promise.all([
        getKejadianKhususList(),
        getKelasList(1, 100)
      ]);
      setEvents(eventsRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error loading data', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadAffectedSessions = useCallback(async () => {
    if (!isAdding || !newEvent.tanggal) return;
    try {
      setIsLoadingAffected(true);
      const res = await getSesiAbsensiList({
        tanggal: newEvent.tanggal,
        kelas_id: newEvent.kelas_id || undefined,
        summary: true
      });
      setAffectedSessions(res.data || []);
    } catch (error) {
      console.error('Error loading affected sessions', error);
      setAffectedSessions([]);
    } finally {
      setIsLoadingAffected(false);
    }
  }, [isAdding, newEvent.tanggal, newEvent.kelas_id]);

  useEffect(() => {
    loadAffectedSessions();
  }, [loadAffectedSessions]);

  const handleAdd = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await createKejadianKhusus(newEvent);
      toast.success(newEvent.kelas_id ? 'Aksi darurat diterapkan pada kelas terpilih' : 'Aksi darurat diterapkan secara global');
      setNewEvent({ 
        tanggal: toLocalDate(), 
        keterangan: '', 
        abaikan_terlambat: true, 
        mode_kejadian: 'NORMAL',
        kelas_id: null
      });
      setAffectedSessions([]);
      setIsAdding(false);
      loadData();
    } catch (error) {
      console.error('Error creating event', error);
      toast.error('Gagal menerapkan aksi darurat');
    } finally {
      setLoading(false);
    }
  }, [newEvent, loadData]);

  const handleDelete = useCallback((idStr: string) => {
    setDeletingId(idStr);
    setIsDeleteModalOpen(true);
  }, []);

  const executeDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      setIsDeleting(true);
      await deleteKejadianKhusus(deletingId);
      toast.success('Dihapus');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      loadData();
    } catch (error) {
      console.error('Error deleting event', error);
      toast.error('Gagal menghapus');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingId, loadData]);

  const toggleAdding = useCallback(() => {
    setIsAdding((prev) => {
      if (prev) setAffectedSessions([]);
      return !prev;
    });
  }, []);

  const closeAdding = useCallback(() => {
    setAffectedSessions([]);
    setIsAdding(false);
  }, []);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">Kejadian Khusus & Aksi Darurat</h3>
          <p className="text-xs text-slate-500">Gunakan HANYA untuk kejadian tak terduga (Bencana/Darurat) yang tidak ada di Kalender Akademik.</p>
        </div>
        <Button onClick={toggleAdding} variant={isAdding ? 'ghost' : 'outline'} size="sm">
          {isAdding ? 'Batal' : <><Plus className="w-4 h-4 mr-2" /> Tambah</>}
        </Button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-6 text-amber-600 dark:text-amber-400">
            <ShieldAlert className="w-5 h-5" />
            <h4 className="font-black text-xs uppercase tracking-widest">Konfigurasi Aksi Global</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="tanggal-input-field" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tanggal Kejadian</Label>
                <button 
                  type="button"
                  onClick={() => setNewEvent(prev => ({ ...prev, tanggal: toLocalDate() }))}
                  className="text-[10px] font-bold text-indigo-600 hover:underline"
                >
                  Hari Ini
                </button>
              </div>
              <Input
                id="tanggal-input-field"
                type="date"
                value={newEvent.tanggal}
                onChange={(e) => setNewEvent(prev => ({ ...prev, tanggal: e.target.value }))}
                className="rounded-xl border-slate-200 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Target Lingkup (Scope)</Label>
              <div className="relative">
                <Suspense fallback={<div className="h-10 bg-slate-100 animate-pulse rounded-xl" />}>
                  <SearchableSelect
                    options={[
                      { value: 'GLOBAL', label: 'Seluruh Sekolah (Global)' },
                      ...classes.map(c => ({ value: c.id, label: `Kelas ${c.nama_kelas}` }))
                    ]}
                    value={newEvent.kelas_id || 'GLOBAL'}
                    onValueChange={(val) => setNewEvent(prev => ({ ...prev, kelas_id: val === 'GLOBAL' ? null : val }))}
                    placeholder="Pilih Lingkup Aksi"
                    className="rounded-xl border-slate-200"
                  />
                </Suspense>
              </div>
              <p className="text-[9px] text-slate-400 font-medium">Pilih kelas spesifik jika kejadian hanya berdampak pada kelas tertentu.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keterangan-input-field" className="text-[10px] font-black uppercase tracking-wider text-slate-500">Keterangan / Alasan</Label>
              <div className="relative">
                <Input
                  id="keterangan-input-field"
                  type="text"
                  placeholder="Contoh: Kunjungan Industri, Banjir, dll"
                  value={newEvent.keterangan}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewEvent(prev => {
                      let newMode = prev.mode_kejadian;
                      const lowerVal = val.toLowerCase();
                      if (lowerVal.includes('libur')) newMode = 'LIBUR';
                      else if (lowerVal.includes('dispen')) newMode = 'DISPEN';
                      else if (lowerVal.includes('kunjungan') || lowerVal.includes('studi')) newMode = 'DISPEN';
                      
                      return { ...prev, keterangan: val, mode_kejadian: newMode };
                    });
                  }}
                  className="rounded-xl border-slate-200 focus:ring-indigo-500 pr-10"
                  required
                />
                {newEvent.keterangan && (
                  <button 
                    type="button"
                    onClick={() => setNewEvent(prev => ({ ...prev, keterangan: '' }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESET_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNewEvent(prev => ({ ...prev, keterangan: reason }))}
                    className="text-[9px] px-2 py-1 rounded-full bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 border border-slate-200 transition-colors"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pilih Aksi Sistem (PENTING)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                onClick={() => setNewEvent(prev => ({ ...prev, mode_kejadian: 'NORMAL' }))}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${newEvent.mode_kejadian === 'NORMAL' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between">
                   <AlertCircle className={`w-5 h-5 ${newEvent.mode_kejadian === 'NORMAL' ? 'text-indigo-600' : 'text-slate-400'}`} />
                   {newEvent.mode_kejadian === 'NORMAL' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">Normal (Bypass)</span>
                <span className="text-[9px] text-slate-500 leading-tight">Hanya mengabaikan keterlambatan. Sesi tetap berjalan.</span>
              </div>

              <div 
                onClick={() => setNewEvent(prev => ({ ...prev, mode_kejadian: 'DISPEN' }))}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${newEvent.mode_kejadian === 'DISPEN' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between">
                   <CheckCircle2 className={`w-5 h-5 ${newEvent.mode_kejadian === 'DISPEN' ? 'text-emerald-600' : 'text-slate-400'}`} />
                   {newEvent.mode_kejadian === 'DISPEN' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">Isi Dispen Masal</span>
                <span className="text-[9px] text-slate-500 leading-tight">Selesaikan semua sesi & isi semua siswa sebagai DISPEN.</span>
              </div>

              <div 
                onClick={() => setNewEvent(prev => ({ ...prev, mode_kejadian: 'LIBUR' }))}
                className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${newEvent.mode_kejadian === 'LIBUR' ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}
              >
                <div className="flex items-center justify-between">
                   <XCircle className={`w-5 h-5 ${newEvent.mode_kejadian === 'LIBUR' ? 'text-rose-600' : 'text-slate-400'}`} />
                   {newEvent.mode_kejadian === 'LIBUR' && <div className="w-2 h-2 rounded-full bg-rose-500" />}
                </div>
                <span className="text-xs font-bold uppercase tracking-tight">Sekolah Libur</span>
                <span className="text-[9px] text-slate-500 leading-tight">Hapus semua sesi pada tanggal ini secara permanen.</span>
              </div>
            </div>
          </div>
          
          {isAdding && (
            <div className="mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Estimasi Sesi Terdampak ({affectedSessions.length})</h5>
                </div>
                {isLoadingAffected && <RefreshCw className="w-3 h-3 text-indigo-600 animate-spin" />}
              </div>
              
              {affectedSessions.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {affectedSessions.map((s: any) => (
                    <div key={s.id} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                          {new Date(s.waktu_mulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={s.status === 'SELESAI' ? 'secondary' : 'info'} className="text-[7px] px-1 py-0">
                            {s.status}
                          </Badge>
                          {newEvent.mode_kejadian === 'LIBUR' && (
                            <Badge variant="destructive" className="text-[6px] px-1 py-0 animate-pulse">AKAN DIHAPUS</Badge>
                          )}
                          {newEvent.mode_kejadian === 'DISPEN' && (
                            <Badge variant="warning" className="text-[6px] px-1 py-0 animate-pulse">AKAN DISPEN</Badge>
                          )}
                          {newEvent.mode_kejadian === 'NORMAL' && s.status !== 'SELESAI' && (
                            <Badge variant="success" className="text-[6px] px-1 py-0 animate-pulse">BYPASS TELAT</Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">{s.Mapel?.nama_mapel || s.jenis_kegiatan}</span>
                      <div className="flex items-center gap-1">
                        <Users size={10} className="text-slate-400" />
                        <span className="text-[9px] font-medium text-slate-500">Kelas {s.Kelas?.nama_kelas}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-[10px] text-slate-400 font-medium italic">Tidak ada sesi ditemukan pada parameter ini.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl mb-6">
             <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
             <p className="text-[10px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
               <strong>PERINGATAN:</strong> Aksi "Isi Dispen" atau "Libur" bersifat permanen dan akan memproses ribuan data siswa sekaligus. Pastikan tanggal sudah benar sebelum menekan tombol simpan.
             </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={closeAdding} className="rounded-xl">Batal</Button>
            <Button type="submit" isLoading={loading} className="rounded-xl px-8 bg-slate-900 text-white hover:bg-black">Terapkan Aksi Global</Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 font-black text-[9px] uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
            <tr>
              <th className="py-4 px-6">Tanggal</th>
              <th className="py-4 px-6">Lingkup (Scope)</th>
              <th className="py-4 px-6">Keterangan</th>
              <th className="py-4 px-6">Mode / Aksi</th>
              <th className="py-4 px-6 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 font-medium italic">
                  Belum ada kejadian khusus tercatat.
                </td>
              </tr>
            ) : (
              (events || []).map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">
                    {format(new Date(ev.tanggal), 'dd MMMM yyyy', { locale: id })}
                  </td>
                  <td className="py-4 px-6">
                    {ev.kelas_id ? (
                      <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                        <Users size={14} />
                        <span>Kelas {ev.Kelas?.nama_kelas || 'Terhapus'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                        <ShieldAlert size={14} />
                        <span>Seluruh Sekolah</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-slate-600 dark:text-slate-400">{ev.keterangan}</td>
                  <td className="py-4 px-6">
                    <div className="flex gap-2">
                      {ev.abaikan_terlambat && <Badge variant="success" className="text-[8px] uppercase tracking-tighter">Bypass Telat</Badge>}
                      {ev.mode_kejadian === 'LIBUR' && <Badge variant="destructive" className="text-[8px] uppercase tracking-tighter">Sekolah Libur</Badge>}
                      {ev.mode_kejadian === 'DISPEN' && <Badge variant="warning" className="text-[8px] uppercase tracking-tighter">Dispen Masal</Badge>}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(ev.id)}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        title="Hapus Kejadian Khusus?"
        description="Apakah Anda yakin ingin menghapus kejadian ini? Data absensi pada tanggal tersebut mungkin akan kembali ke status terlambat jika sebelumnya dibypass."
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
    </Card>
  );
};

KejadianKhususPanelComponent.displayName = 'KejadianKhususPanel';
export const KejadianKhususPanel = React.memo(KejadianKhususPanelComponent);
