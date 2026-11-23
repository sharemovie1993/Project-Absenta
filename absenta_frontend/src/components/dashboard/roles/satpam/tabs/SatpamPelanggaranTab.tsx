import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Clock, 
  ShieldAlert, 
  User, 
  CheckCircle2,
  Trash2,
  RefreshCw,
  X,
  FileWarning,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { kesiswaanApi, type JenisPelanggaran } from '@/api/kesiswaan.api';
import { siswaApi } from '@/api/academic.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useSocket } from '@/hooks/useSocket';

interface GateViolationItem {
  id: string;
  siswa_id: string;
  nama_siswa: string;
  kelas: string;
  nisn: string;
  jenis_pelanggaran: string;
  poin: number;
  jam: string;
  tindakan: string;
  status: 'PENDING' | 'DITINDAK' | 'SELESAI';
  created_at?: string;
}

export const SatpamPelanggaranTab: React.FC = () => {
  const [violations, setViolations] = useState<GateViolationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Master Jenis Pelanggaran
  const [jenisPelanggaranList, setJenisPelanggaranList] = useState<JenisPelanggaran[]>([]);

  // Form State
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const debouncedStudentSearch = useDebounce(studentSearchTerm, 300);
  const [studentCandidates, setStudentCandidates] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState<boolean>(false);

  const [selectedJenisId, setSelectedJenisId] = useState<string>('');
  const [customKeterangan, setCustomKeterangan] = useState<string>('');
  const [tindakanSatpam, setTindakanSatpam] = useState<string>('Diberikan teguran & pembinaan di pos keamanan');

  const { isConnected, subscribe, unsubscribe } = useSocket();

  // Load Master Jenis Pelanggaran
  const fetchJenisPelanggaran = useCallback(async () => {
    try {
      const res = await kesiswaanApi.getJenisPelanggaran();
      if (res?.data && Array.isArray(res.data)) {
        setJenisPelanggaranList(res.data);
        if (res.data.length > 0 && !selectedJenisId) {
          setSelectedJenisId(res.data[0].id);
        }
      }
    } catch {
      // Fallback preset
      setJenisPelanggaranList([
        { id: 'jp-1', kategori: 'Kedisiplinan', nama_pelanggaran: 'Terlambat Masuk Sekolah (Gerbang)', poin: 5 },
        { id: 'jp-2', kategori: 'Kerapian', nama_pelanggaran: 'Atribut Seragam Tidak Lengkap (Dasi/Sabuk/Sepatu)', poin: 5 },
        { id: 'jp-3', kategori: 'Kedisiplinan', nama_pelanggaran: 'Menerobos / Tidak Tap Kartu Gerbang', poin: 10 },
        { id: 'jp-4', kategori: 'Ketertiban', nama_pelanggaran: 'Berkeliaran di Area Gerbang saat Jam KBM', poin: 10 },
      ]);
      setSelectedJenisId('jp-1');
    }
  }, [selectedJenisId]);

  // Load Today Violations
  const fetchViolations = useCallback(async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await kesiswaanApi.getPelanggaran({ tanggal: today });

      if (res?.data && Array.isArray(res.data)) {
        const formatted: GateViolationItem[] = res.data.map((item: any) => {
          const timeStr = item.created_at
            ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '-';
          return {
            id: item.id,
            siswa_id: item.siswa_id,
            nama_siswa: item.Siswa?.nama_siswa || item.nama_siswa || 'Siswa',
            kelas: item.Siswa?.Kelas?.nama_kelas || item.kelas || '-',
            nisn: item.Siswa?.nisn || item.Siswa?.nis || item.nisn || '-',
            jenis_pelanggaran: item.jenis_pelanggaran || item.nama_pelanggaran || 'Pelanggaran Kedisiplinan',
            poin: item.poin || 5,
            jam: timeStr,
            tindakan: item.keterangan || item.tindakan || 'Tindakan lapangan pos satpam',
            status: item.status === 'SELESAI' ? 'SELESAI' : 'DITINDAK',
            created_at: item.created_at,
          };
        });

        setViolations(formatted);
      }
    } catch {
      // Keep existing list
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJenisPelanggaran();
    fetchViolations();
  }, [fetchJenisPelanggaran, fetchViolations]);

  // Socket auto-sync
  useEffect(() => {
    if (!isConnected) return;
    const handleUpdate = () => {
      fetchViolations();
    };

    subscribe('gerbang_tap_update', handleUpdate);
    subscribe('attendance_update', handleUpdate);

    return () => {
      unsubscribe('gerbang_tap_update', handleUpdate);
      unsubscribe('attendance_update', handleUpdate);
    };
  }, [isConnected, fetchViolations, subscribe, unsubscribe]);

  // Search Students in Modal
  useEffect(() => {
    const term = debouncedStudentSearch.trim();
    if (term.length < 2) {
      setStudentCandidates([]);
      setIsSearchingStudents(false);
      return;
    }

    let isCancelled = false;
    setIsSearchingStudents(true);

    siswaApi.getAll({
      search: term,
      limit: 6,
      search_fields: ['nama_siswa', 'nisn', 'nis', 'id'],
      elevated_context: 'true',
      context: 'elevated'
    } as any).then((res) => {
      if (isCancelled) return;
      setStudentCandidates(res?.data || []);
      setIsSearchingStudents(false);
    }).catch(() => {
      if (!isCancelled) setIsSearchingStudents(false);
    });

    return () => {
      isCancelled = true;
    };
  }, [debouncedStudentSearch]);

  // Submit Violation to Backend
  const handleCreateViolation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Harap pilih siswa yang melakukan pelanggaran.');
      return;
    }

    const selectedJenis = jenisPelanggaranList.find((j) => j.id === selectedJenisId);
    const namaPelanggaran = selectedJenis?.nama_pelanggaran || 'Pelanggaran Pos Gerbang';
    const poin = selectedJenis?.poin || 5;

    setIsSubmitting(true);
    const now = new Date();
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    try {
      const payload = {
        siswa_id: selectedStudent.id,
        jenis_pelanggaran: namaPelanggaran,
        poin,
        keterangan: `${tindakanSatpam}${customKeterangan ? ` - ${customKeterangan}` : ''}`,
        tanggal: now.toISOString().split('T')[0],
        status: 'DITINDAK',
      };

      const res = await kesiswaanApi.createPelanggaran(payload);

      // Optimistic Prepend
      const newViolation: GateViolationItem = {
        id: res?.data?.id || `v-${Date.now()}`,
        siswa_id: selectedStudent.id,
        nama_siswa: selectedStudent.nama_siswa,
        kelas: selectedStudent.Kelas?.nama_kelas || '-',
        nisn: selectedStudent.nisn || selectedStudent.nis || '-',
        jenis_pelanggaran: namaPelanggaran,
        poin,
        jam: jamStr,
        tindakan: payload.keterangan,
        status: 'DITINDAK',
      };

      setViolations((prev) => [newViolation, ...prev]);
      toast.success(`Pelanggaran gerbang siswa ${selectedStudent.nama_siswa} berhasil dicatat.`);

      // Reset Modal
      setSelectedStudent(null);
      setStudentSearchTerm('');
      setCustomKeterangan('');
      setShowAddModal(false);
    } catch {
      toast.error('Gagal mencatat pelanggaran ke database.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Violation Handler
  const handleDelete = async (id: string, nama: string) => {
    if (!window.confirm(`Hapus catatan pelanggaran untuk ${nama}?`)) return;

    setIsProcessingId(id);
    try {
      await kesiswaanApi.deletePelanggaran(id);
      setViolations((prev) => prev.filter((v) => v.id !== id));
      toast.success('Catatan pelanggaran berhasil dihapus.');
    } catch {
      toast.error('Gagal menghapus catatan pelanggaran.');
    } finally {
      setIsProcessingId(null);
    }
  };

  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      const q = searchQuery.toLowerCase();
      return (
        v.nama_siswa.toLowerCase().includes(q) ||
        v.kelas.toLowerCase().includes(q) ||
        v.jenis_pelanggaran.toLowerCase().includes(q) ||
        v.tindakan.toLowerCase().includes(q)
      );
    });
  }, [violations, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── TOP STATS & ACTIONS BAR ─────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Penegakan Tata Tertib Gerbang
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">
                {violations.length} Kasus Hari Ini
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pencatatan pelanggaran atribut, keterlambatan, dan tindakan pembinaan lapangan oleh satpam
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchViolations}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold gap-1.5"
          >
            <RefreshCw size={13} className={cn(isLoading && 'animate-spin text-rose-600')} />
            <span>Segarkan</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-sm dark:shadow-lg dark:shadow-rose-950/40 text-xs font-bold gap-1.5"
          >
            <Plus size={15} />
            <span>Catat Pelanggaran Gerbang</span>
          </Button>
        </div>
      </div>

      {/* ── SEARCH STRIP ────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama siswa, kelas, jenis pelanggaran..."
            aria-label="Cari pelanggaran gerbang"
            className="pl-9 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
          />
        </div>
      </div>

      {/* ── LIST PELANGGARAN GERBANG ────────────────────────── */}
      <div className="space-y-3">
        {filteredViolations.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Nihil Pelanggaran Gerbang Hari Ini</p>
            <p className="text-xs text-slate-500">Seluruh siswa tertib mematuhi tata tertib dan jam masuk sekolah.</p>
          </div>
        ) : (
          filteredViolations.map((v) => (
            <div
              key={v.id}
              className="bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                  <AlertTriangle size={20} />
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {v.nama_siswa}
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {v.kelas}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      +{v.poin} Poin
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                    {v.jenis_pelanggaran}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    <span className="text-slate-400 font-normal">Tindakan Lapangan:</span> {v.tindakan}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                <div className="text-left md:text-right font-mono text-[11px] text-slate-400">
                  <p className="flex items-center gap-1">
                    <Clock size={12} />
                    {v.jam} WIB
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isProcessingId === v.id}
                  onClick={() => handleDelete(v.id, v.nama_siswa)}
                  className="h-8 w-8 p-0 rounded-xl border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300"
                  title="Hapus Catatan"
                >
                  {isProcessingId === v.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── MODAL INPUT PELANGGARAN GERBANG ─────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert size={18} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Catat Pelanggaran Pos Gerbang
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateViolation} className="space-y-4">
              {/* Smart Student Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pilih Siswa Pelanggar *
                </label>
                {selectedStudent ? (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {selectedStudent.nama_siswa}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {selectedStudent.Kelas?.nama_kelas || '-'} • NISN: {selectedStudent.nisn || '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Ganti
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        value={studentSearchTerm}
                        onChange={(e) => setStudentSearchTerm(e.target.value)}
                        placeholder="Ketik nama atau NISN siswa..."
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    {isSearchingStudents && (
                      <p className="text-[11px] text-slate-400 text-center py-1">Mencari siswa...</p>
                    )}

                    {studentCandidates.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-slate-200 dark:border-slate-800 p-1">
                        {studentCandidates.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSelectedStudent(s);
                              setStudentCandidates([]);
                              setStudentSearchTerm('');
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-slate-800 dark:text-slate-100">{s.nama_siswa}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{s.Kelas?.nama_kelas || '-'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Jenis Pelanggaran Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Jenis Pelanggaran *
                </label>
                <select
                  value={selectedJenisId}
                  onChange={(e) => setSelectedJenisId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                >
                  {jenisPelanggaranList.map((jp) => (
                    <option key={jp.id} value={jp.id}>
                      {jp.nama_pelanggaran} (+{jp.poin} Poin)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tindakan Lapangan Satpam */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tindakan Lapangan di Pos Satpam
                </label>
                <select
                  value={tindakanSatpam}
                  onChange={(e) => setTindakanSatpam(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                >
                  <option value="Diberikan teguran & pembinaan di pos keamanan">Diberikan teguran & pembinaan di pos keamanan</option>
                  <option value="Sanksi menyanyikan lagu nasional & lapor guru piket">Sanksi menyanyikan lagu nasional & lapor guru piket</option>
                  <option value="Penertiban atribut seragam di tempat">Penertiban atribut seragam di tempat</option>
                  <option value="Barang terlarang diamankan di pos satpam">Barang terlarang diamankan di pos satpam</option>
                  <option value="Diarahkan langsung menghadap Pembina Ketarunaan / BK">Diarahkan langsung menghadap Pembina Ketarunaan / BK</option>
                </select>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={customKeterangan}
                  onChange={(e) => setCustomKeterangan(e.target.value)}
                  placeholder="Misal: Sudah 3 kali terlambat dalam minggu ini..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="h-9 px-4 rounded-xl text-xs font-bold"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !selectedStudent}
                  className="h-9 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                >
                  {isSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <ShieldAlert size={14} />}
                  <span>Simpan Catatan</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
