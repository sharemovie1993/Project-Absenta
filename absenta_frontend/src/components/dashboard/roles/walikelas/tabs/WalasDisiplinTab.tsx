import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Users, 
  Send, 
  CheckCircle2, 
  Calendar, 
  MessageSquare,
  Search,
  Filter,
  FileText
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { getPelanggaranList } from '@/api/kurikulum/waliKelas.api';
import { bpbkApi } from '@/api/bpbk.api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

export interface WalasDisiplinTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasDisiplinTab: React.FC<WalasDisiplinTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'pelanggaran' | 'rujukan_bk'>('pelanggaran');
  const [isRujukanModalOpen, setIsRujukanModalOpen] = useState(false);
  const [selectedStudentForRujukan, setSelectedStudentForRujukan] = useState<any | null>(null);

  // Form State Rujukan BK
  const [rujukanForm, setRujukanForm] = useState({
    alasan: '',
    kategori: 'KEDISIPLINAN',
    urgensi: 'SEDANG',
    catatanAwal: '',
  });

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // 1. Fetch Pelanggaran Siswa Rombel
  const { data: pelanggaranRes, isLoading: isLoadingPelanggaran } = useQuery({
    queryKey: ['walas-pelanggaran-list', kelasId],
    queryFn: () => getPelanggaranList(kelasId),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  // 2. Fetch Kasus BK Rombel
  const { data: bpbkCasesRes, isLoading: isLoadingBpbk } = useQuery({
    queryKey: ['walas-bpbk-cases', kelasId],
    queryFn: () => bpbkApi.getCases({ kelas_id: kelasId }),
    enabled: Boolean(kelasId),
    staleTime: 60 * 1000,
  });

  const rawPelanggaran = Array.isArray(pelanggaranRes?.data) ? pelanggaranRes.data : (Array.isArray(pelanggaranRes) ? pelanggaranRes : []);
  const rawCases = Array.isArray(bpbkCasesRes?.data) ? bpbkCasesRes.data : (Array.isArray(bpbkCasesRes?.cases) ? bpbkCasesRes.cases : []);

  // 3. Mutation Rujukan BK
  const rujukanMutation = useMutation({
    mutationFn: (payload: any) => bpbkApi.createRujukan(payload),
    onSuccess: () => {
      toast.success('Rujukan kasus berhasil dikirim ke Guru BK');
      setIsRujukanModalOpen(false);
      setSelectedStudentForRujukan(null);
      setRujukanForm({ alasan: '', kategori: 'KEDISIPLINAN', urgensi: 'SEDANG', catatanAwal: '' });
      queryClient.invalidateQueries({ queryKey: ['walas-bpbk-cases'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal mengirim rujukan ke Guru BK');
    }
  });

  const handleSendRujukan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForRujukan?.id) {
      toast.error('Pilih siswa terlebih dahulu');
      return;
    }
    if (!rujukanForm.alasan.trim()) {
      toast.error('Tuliskan alasan rujukan');
      return;
    }

    rujukanMutation.mutate({
      siswa_id: selectedStudentForRujukan.id,
      alasan_rujukan: rujukanForm.alasan,
      kategori: rujukanForm.kategori,
      tingkat_urgensi: rujukanForm.urgensi,
      catatan_wali_kelas: rujukanForm.catatanAwal,
    });
  };

  const getSeverityBadge = (poin: number) => {
    if (poin >= 20) return <Badge className="bg-rose-100 text-rose-800 border-rose-300">Berat ({poin} Poin)</Badge>;
    if (poin >= 10) return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Sedang ({poin} Poin)</Badge>;
    return <Badge className="bg-slate-100 text-slate-800 border-slate-300">Ringan ({poin} Poin)</Badge>;
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. HEADER & SUB-TABS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Kedisiplinan & Kolaborasi Guru BK</span>
              <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">
                Permendikbud No. 111/2014
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Monitoring pelanggaran tata tertib rombel dan alur alih tangan kasus ke Guru Bimbingan Konseling
            </p>
          </div>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveSubTab('pelanggaran')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeSubTab === 'pelanggaran'
                ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Pelanggaran Rombel ({rawPelanggaran.length})
          </button>
          <button
            onClick={() => setActiveSubTab('rujukan_bk')}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
              activeSubTab === 'rujukan_bk'
                ? "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-sm"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            Kasus & Rujukan BK ({rawCases.length})
          </button>
        </div>
      </div>

      {/* 2. KONTEN TAB PELANGGARAN */}
      {activeSubTab === 'pelanggaran' ? (
        <div className="space-y-4">
          {isLoadingPelanggaran ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat log pelanggaran...</div>
          ) : rawPelanggaran && rawPelanggaran.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawPelanggaran.map((p: any) => (
                <Card key={p.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {p.Siswa?.nama_siswa || p.nama_siswa || 'Peserta Didik'}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Pelapor: {p.Pelapor?.nama || p.pelapor || 'Guru Piket'} • {new Date(p.created_at || p.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    {getSeverityBadge(p.poin || p.bobot || 5)}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {p.deskripsi || p.alasan || p.keterangan || 'Pelanggaran tata tertib'}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Butuh konseling intensif?</span>
                    {!isHistorical && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-0 h-auto font-semibold"
                        onClick={() => {
                          setSelectedStudentForRujukan(p.Siswa || { id: p.siswa_id, nama_siswa: p.nama_siswa });
                          setIsRujukanModalOpen(true);
                        }}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" /> Rujuk ke Guru BK
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nol Catatan Pelanggaran</p>
              <p className="text-xs text-slate-400 mt-1">
                Seluruh siswa rombel binaan Anda mematuhi tata tertib sekolah dengan tertib.
              </p>
            </Card>
          )}
        </div>
      ) : (
        /* KONTEN TAB RUJUKAN & KASUS BK */
        <div className="space-y-4">
          <div className="flex justify-end">
            {!isHistorical && (
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs"
                onClick={() => {
                  setSelectedStudentForRujukan(null);
                  setIsRujukanModalOpen(true);
                }}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" /> Buat Rujukan Kasus Baru ke BK
              </Button>
            )}
          </div>

          {isLoadingBpbk ? (
            <div className="py-12 text-center text-slate-400 text-xs">Memuat kasus BK...</div>
          ) : rawCases && rawCases.length > 0 ? (
            <div className="space-y-3">
              {rawCases.map((c: any) => (
                <Card key={c.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {c.Siswa?.nama_siswa || c.nama_siswa || 'Kasus Siswa'}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600">
                        {c.kategori || 'Bimbingan Konseling'}
                      </Badge>
                    </div>
                    <Badge className={cn(
                      "text-[10px] font-bold px-2 py-0.5",
                      c.status === 'SELESAI' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {c.status || 'Dalam Penanganan'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {c.judul_kasus || c.deskripsi || c.alasan}
                  </p>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Ada Kasus Rujukan BK</p>
              <p className="text-xs text-slate-400 mt-1">
                Jika terdapat kendala belajar berat atau masalah perilaku siswa, wali kelas dapat merujuk langsung ke Guru BK.
              </p>
            </Card>
          )}
        </div>
      )}

      {/* 3. MODAL RUJUKAN KE GURU BK */}
      <Modal
        isOpen={isRujukanModalOpen}
        onClose={() => setIsRujukanModalOpen(false)}
        title="Form Alih Tangan Kasus ke Guru BK (Referral)"
        size="md"
      >
        <form onSubmit={handleSendRujukan} className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Nama Siswa</label>
            {selectedStudentForRujukan ? (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                {selectedStudentForRujukan.nama_siswa || selectedStudentForRujukan.nama}
              </div>
            ) : (
              <input
                type="text"
                placeholder="Masukkan ID / Nama Siswa..."
                onChange={(e) => setSelectedStudentForRujukan({ id: e.target.value, nama_siswa: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Masalah</label>
              <select
                value={rujukanForm.kategori}
                onChange={(e) => setRujukanForm({ ...rujukanForm, kategori: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="KEDISIPLINAN">Kedisiplinan & Tata Tertib</option>
                <option value="AKADEMIK">Kendala Belajar / Nilai</option>
                <option value="PRIBADI_SOSIAL">Masalah Pribadi / Sosial</option>
                <option value="KEHADIRAN_MEMBOLOS">Mangkir / Membolos Beruntun</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tingkat Urgensi</label>
              <select
                value={rujukanForm.urgensi}
                onChange={(e) => setRujukanForm({ ...rujukanForm, urgensi: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="RENDAH">Rendah (Pemantauan)</option>
                <option value="SEDANG">Sedang (Konseling Terjadwal)</option>
                <option value="TINGGI">Tinggi (Perlu Panggilan Ortu)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Alasan Rujukan</label>
            <input
              type="text"
              placeholder="e.g. Sering tidur di kelas dan nilai tugas kosong 3 minggu berturut"
              value={rujukanForm.alasan}
              onChange={(e) => setRujukanForm({ ...rujukanForm, alasan: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Catatan Awal Wali Kelas</label>
            <textarea
              rows={3}
              placeholder="Upaya pembinaan awal yang sudah pernah dilakukan wali kelas..."
              value={rujukanForm.catatanAwal}
              onChange={(e) => setRujukanForm({ ...rujukanForm, catatanAwal: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRujukanModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              disabled={rujukanMutation.isPending}
            >
              Kirim Rujukan ke BK
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
});

WalasDisiplinTab.displayName = 'WalasDisiplinTab';
