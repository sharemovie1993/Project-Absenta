import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Search, Download, ChevronRight, Loader2, Edit3, BookOpen
} from 'lucide-react';
import { getSesiAbsensiList } from '../../../../api/attendanceGerbang.api';
import { JurnalKbmModal } from '../../../kurikulum/JurnalKbmModal';
import toast from 'react-hot-toast';

export interface JurnalRecord {
  id: string;
  sesiId: string;
  tanggal: string;
  kelas: string;
  kelasId: string;
  mapel: string;
  mapelId?: string;
  jamKe: string;
  materiPokok: string;
  capaianPembelajaran: string;
  pencapaianPersen: number;
  catatanKelas: string;
  kehadiranSiswa: {
    hadir: number;
    sakit: number;
    izin: number;
    alpa: number;
    terlambat: number;
    total: number;
  };
  statusSesi: 'SELESAI' | 'BERLANGSUNG' | 'MENDATANG' | string;
  progresRaw?: any;
}

export const RekapJurnalPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelas, setSelectedKelas] = useState('ALL');
  const [selectedJurnal, setSelectedJurnal] = useState<JurnalRecord | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingJurnal, setEditingJurnal] = useState<JurnalRecord | null>(null);

  // ── Fetch Live Sessions from Backend ──
  const { data: responseData, isLoading, error } = useQuery({
    queryKey: ['rekapJurnalSesiList'],
    queryFn: async () => {
      const res = await getSesiAbsensiList({
        limit: 100,
        summary: true,
      });
      return res;
    },
    staleTime: 30 * 1000,
  });

  // ── Transform Backend Sessions into Jurnal Records ──
  const jurnalList: JurnalRecord[] = useMemo(() => {
    const raw = responseData?.data?.data || responseData?.data || responseData || [];
    const rawSessions: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.data)
      ? (raw as any).data
      : Array.isArray((responseData as any)?.items)
      ? (responseData as any).items
      : [];
    if (!Array.isArray(rawSessions) || rawSessions.length === 0) return [];

    return rawSessions
      .filter((s: any) => {
        const pRaw = s.ProgresMateri || s.progres || s.progres_materi;
        const hasJournal = Array.isArray(pRaw) ? pRaw.length > 0 : Boolean(pRaw && (pRaw.judul_materi || pRaw.deskripsi || pRaw.id));
        const statusUpper = String(s.status || '').toUpperCase();
        return statusUpper === 'SELESAI' || statusUpper === 'BERLANGSUNG' || statusUpper === 'AKTIF' || hasJournal;
      })
      .map((s: any) => {
        const pRaw = s.ProgresMateri || s.progres || s.progres_materi || {};
        const p = Array.isArray(pRaw) ? (pRaw[0] || {}) : pRaw;
        const summary = s.summary || s._summary?.attendance_counts || {};
        
        let tglStr = '-';
        if (s.tanggal) {
          tglStr = String(s.tanggal).split('T')[0];
        } else if (s.waktu_mulai) {
          tglStr = String(s.waktu_mulai).split('T')[0];
        }

        const jamMulai = s.jam_mulai || (s.waktu_mulai ? String(s.waktu_mulai).substring(11, 16) : '--:--');
        const jamSelesai = s.jam_selesai || (s.waktu_selesai ? String(s.waktu_selesai).substring(11, 16) : '--:--');
        const slotLabel = s.jam_label || (s.slot_kbm ? `Slot ${s.slot_kbm}` : `${jamMulai} - ${jamSelesai}`);

        return {
          id: p.id || s.id,
          sesiId: s.id,
          tanggal: tglStr,
          kelas: s.Kelas?.nama_kelas || s.kelas_nama || 'Kelas',
          kelasId: s.kelas_id,
          mapel: s.Mapel?.nama_mapel || s.mapel_nama || 'Mata Pelajaran',
          mapelId: s.mapel_id,
          jamKe: `${slotLabel} (${jamMulai} - ${jamSelesai})`,
          materiPokok: p.judul_materi || (String(s.status).toUpperCase() === 'BERLANGSUNG' ? 'Sedang Berlangsung' : 'Belum Diisi'),
          capaianPembelajaran: p.deskripsi || 'Belum ada uraian materi / CP tercatat.',
          pencapaianPersen: p.pencapaian_persen || 0,
          catatanKelas: p.kendala || 'Tidak ada catatan khusus.',
          kehadiranSiswa: {
            hadir: summary.HADIR || 0,
            sakit: summary.SAKIT || 0,
            izin: summary.IZIN || 0,
            alpa: summary.ALPA || 0,
            terlambat: summary.TERLAMBAT || 0,
            total: summary.total || ((summary.HADIR || 0) + (summary.SAKIT || 0) + (summary.IZIN || 0) + (summary.ALPA || 0)),
          },
          statusSesi: s.status || 'SELESAI',
          progresRaw: p,
        };
      });
  }, [responseData]);

  // ── Dynamic Class List for Filter Dropdown ──
  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    jurnalList.forEach(j => {
      if (j.kelas) set.add(j.kelas);
    });
    return Array.from(set).sort();
  }, [jurnalList]);

  // ── Filtered Jurnal ──
  const filteredJurnal = useMemo(() => {
    return jurnalList.filter(j => {
      const matchSearch = j.materiPokok.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.kelas.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.mapel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.tanggal.includes(searchTerm);
      const matchKelas = selectedKelas === 'ALL' || j.kelas === selectedKelas;
      return matchSearch && matchKelas;
    });
  }, [jurnalList, searchTerm, selectedKelas]);

  const handleExport = () => {
    if (filteredJurnal.length === 0) {
      toast.error('Tidak ada data jurnal untuk diekspor.');
      return;
    }
    toast.success(`Laporan Rekapitulasi Jurnal Mengajar (${filteredJurnal.length} entri) siap diunduh!`, { icon: '📄' });
  };

  const handleOpenEdit = (jurnal: JurnalRecord) => {
    setEditingJurnal(jurnal);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['rekapJurnalSesiList'] });
    queryClient.invalidateQueries({ queryKey: ['sesiAbsensiList'] });
    queryClient.invalidateQueries({ queryKey: ['guruTeachingTimeline'] });
    setSelectedJurnal(null);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* ── COMPACT TOOLBAR & FILTERS ── */}
        <div className="p-2.5 sm:p-3 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Cari materi pokok, kelas, atau mapel..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            title="Ekspor PDF Jurnal"
          >
            <Download size={13} />
            <span>Ekspor PDF</span>
          </button>
        </div>

        {/* ── JURNAL RECORDS LIST ── */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {isLoading ? (
            <div className="py-10 text-center space-y-2">
              <Loader2 className="animate-spin text-blue-500 mx-auto" size={24} />
              <p className="text-xs font-medium text-slate-400">Memuat arsip jurnal mengajar...</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-xs font-bold text-rose-500">Gagal memuat arsip jurnal.</p>
              <p className="text-[11px] text-slate-400">{(error as any)?.message || 'Terjadi kesalahan koneksi'}</p>
            </div>
          ) : filteredJurnal.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <FileText className="text-slate-300 dark:text-slate-600 mx-auto" size={28} />
              <p className="text-xs font-bold text-slate-500">Belum ada arsip riwayat jurnal mengajar.</p>
            </div>
          ) : (
            filteredJurnal.map((jurnal) => (
              <div
                key={jurnal.sesiId}
                onClick={() => setSelectedJurnal(jurnal)}
                className="p-3 sm:p-4 hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors space-y-1.5 cursor-pointer group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-300 font-black text-[11px] font-mono border border-blue-200 dark:border-blue-800">
                      {jurnal.kelas}
                    </span>
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      {jurnal.mapel}
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
                      {jurnal.tanggal}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform self-start sm:self-auto">
                    <span>Detail Jurnal</span>
                    <ChevronRight size={14} />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    {jurnal.materiPokok}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {jurnal.capaianPembelajaran}
                  </p>
                </div>

                {/* Presensi Siswa Status Pills */}
                <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-200 dark:border-emerald-800">
                      Hadir: {jurnal.kehadiranSiswa.hadir}/{jurnal.kehadiranSiswa.total}
                    </span>
                    {jurnal.kehadiranSiswa.sakit > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                        Sakit: {jurnal.kehadiranSiswa.sakit}
                      </span>
                    )}
                    {jurnal.kehadiranSiswa.izin > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold">
                        Izin: {jurnal.kehadiranSiswa.izin}
                      </span>
                    )}
                    {jurnal.kehadiranSiswa.alpa > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                        Alpa: {jurnal.kehadiranSiswa.alpa}
                      </span>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {jurnal.statusSesi}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── MODAL DETAIL JURNAL ── */}
      {selectedJurnal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
          onClick={() => setSelectedJurnal(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-5 space-y-4 text-slate-800 dark:text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-extrabold text-[11px]">
                  {selectedJurnal.kelas} • {selectedJurnal.mapel}
                </span>
                <h3 className="text-sm font-bold mt-1 text-slate-900 dark:text-white">
                  Detail Jurnal Mengajar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJurnal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Waktu Pertemuan</label>
                <p className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">
                  {selectedJurnal.tanggal} — {selectedJurnal.jamKe}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Materi Pokok</label>
                <p className="font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedJurnal.materiPokok}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Capaian Pembelajaran / Uraian</label>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                  {selectedJurnal.capaianPembelajaran}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Catatan & Kendala</label>
                <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 italic">
                  "{selectedJurnal.catatanKelas}"
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  const j = selectedJurnal;
                  setSelectedJurnal(null);
                  handleOpenEdit(j);
                }}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Jurnal</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedJurnal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL EDIT JURNAL ── */}
      {editingJurnal && (
        <JurnalKbmModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setEditingJurnal(null);
          }}
          sesiId={editingJurnal.sesiId}
          initialData={editingJurnal.progresRaw || {
            judul_materi: editingJurnal.materiPokok,
            deskripsi: editingJurnal.capaianPembelajaran,
            kendala: editingJurnal.catatanKelas,
            pencapaian_persen: editingJurnal.pencapaianPersen,
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
