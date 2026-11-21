import React, { useState, useRef, Suspense, lazy } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Tag, 
  Users, 
  Search, 
  Filter,
  CheckCircle2,
  FileText,
  Printer
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, Badge, Loader } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { 
  getJurnalWaliKelasList, 
  createJurnalWaliKelas, 
  deleteJurnalWaliKelas 
} from '@/api/kurikulum/waliKelas.api';
import { 
  PrintDocumentSheet, 
  PrintHeader, 
  UniversalDocumentSignatures,
  usePrintHeaderData 
} from '@/components/ui/PrintHeader';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import type { WalasDashboardData } from '../types';

// Code-splitting document modal to optimize initial tab bundle (Pilar 21B & TBT Optimization)
const UniversalDocumentModal = lazy(() =>
  import('@/components/ui/PrintHeader').then((m) => ({ default: m.UniversalDocumentModal }))
);

export interface WalasJurnalTabProps {
  kelasId?: string;
  kelasNama?: string;
  data?: WalasDashboardData;
}

export const WalasJurnalTab: React.FC<WalasJurnalTabProps> = React.memo(({
  kelasId,
  kelasNama,
  data,
}) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const printSheetRef = useRef<HTMLDivElement>(null);

  const { tenantInfo, logoSekolahBase64, logoDaerahBase64 } = usePrintHeaderData();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      toast.loading('Mempersiapkan dokumen PDF...', { id: 'walas-jurnal-pdf' });
      window.print();
      toast.success('Gunakan opsi "Save as PDF" pada dialog cetak browser.', { id: 'walas-jurnal-pdf', duration: 4000 });
    } catch {
      toast.error('Gagal mencetak dokumen.', { id: 'walas-jurnal-pdf' });
    }
  };

  const walasName = data?.kelasInfo?.waliKelas?.nama || (data as any)?.wali_kelas?.nama || 'Wali Kelas';
  const walasNip = data?.kelasInfo?.waliKelas?.nip || (data as any)?.wali_kelas?.nip || '';
  const tahunPelajaranStr = data?.academicContext?.tahunPelajaranNama || (data as any)?.tahun_pelajaran?.nama || '';
  const semesterStr = data?.academicContext?.semesterNama || (data as any)?.tahun_pelajaran?.semester || '';

  // Form State
  const [formData, setFormData] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    jam: '10:00 WIB',
    kategori: 'PEMBINAAN_KELAS',
    judul: '',
    isi: '',
    tags: '',
  });

  const isHistorical = data?.academicContext?.isHistoricalPeriod ?? false;

  // 1. Fetch Jurnal (High-Performance Cache)
  const { data: jurnalRes, isLoading } = useQuery({
    queryKey: ['walas-jurnal-list', kelasId, search],
    queryFn: () => getJurnalWaliKelasList(1, 50, search, kelasId),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const rawJurnalList = Array.isArray(jurnalRes?.data?.data) 
    ? jurnalRes.data.data 
    : (Array.isArray(jurnalRes?.data) ? jurnalRes.data : []);

  const filteredJurnal = rawJurnalList?.filter((j: any) => 
    selectedKategori === 'ALL' || j.kategori === selectedKategori
  );

  // 2. Mutation Create Jurnal
  const createMutation = useMutation({
    mutationFn: (payload: any) => createJurnalWaliKelas(payload),
    onSuccess: () => {
      toast.success('Jurnal pembinaan berhasil disimpan');
      setIsAddModalOpen(false);
      setFormData({
        tanggal: new Date().toISOString().slice(0, 10),
        jam: '10:00 WIB',
        kategori: 'PEMBINAAN_KELAS',
        judul: '',
        isi: '',
        tags: '',
      });
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal-list'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menyimpan jurnal');
    }
  });

  // 3. Mutation Delete Jurnal
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJurnalWaliKelas(id),
    onSuccess: () => {
      toast.success('Jurnal berhasil dihapus');
      queryClient.invalidateQueries({ queryKey: ['walas-jurnal-list'] });
      queryClient.invalidateQueries({ queryKey: ['walas-dashboard-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Gagal menghapus jurnal');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.judul.trim() || !formData.isi.trim()) {
      toast.error('Mohon isi judul dan konten jurnal');
      return;
    }

    createMutation.mutate({
      kelas_id: kelasId,
      tanggal: formData.tanggal,
      jam: formData.jam,
      kategori: formData.kategori,
      judul: formData.judul,
      isi: formData.isi,
      tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
    });
  };

  const getKategoriBadge = (kat: string) => {
    switch (kat) {
      case 'PEMBINAAN_KELAS':
        return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">Pembinaan Kelas</Badge>;
      case 'KOORDINASI_BK':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Koordinasi BK</Badge>;
      case 'RAPAT_ORTU':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Rapat Orang Tua</Badge>;
      case 'KASUS_SELESAI':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Kasus Teratasi</Badge>;
      default:
        return <Badge className="bg-slate-50 text-slate-700 border-slate-200">{kat || 'Lainnya'}</Badge>;
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* 1. HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Buku Jurnal Wali Kelas {kelasNama || data?.kelasInfo?.nama_kelas || 'Rombel'}</span>
              <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-800">
                Bukti Beban Kerja 2 Jam
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumentasi aktivitas bimbingan kelas, koordinasi penanganan kasus, dan rapat orang tua
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="font-semibold text-xs gap-1.5 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
            onClick={() => setIsPrintModalOpen(true)}
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak Buku Jurnal</span>
          </Button>
          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
            disabled={isHistorical}
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Tulis Jurnal Baru
          </Button>
        </div>
      </div>

      {/* 2. FILTER & PENCARIAN */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari judul atau isi jurnal..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar self-stretch sm:self-auto pb-1">
          {['ALL', 'PEMBINAAN_KELAS', 'KOORDINASI_BK', 'RAPAT_ORTU', 'KASUS_SELESAI'].map((kat) => (
            <button
              key={kat}
              onClick={() => setSelectedKategori(kat)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-all whitespace-nowrap",
                selectedKategori === kat
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              )}
            >
              {kat === 'ALL' ? 'Semua Kategori' : kat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* 3. TIMELINE JURNAL PEMBINAAN */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Memuat daftar jurnal...</div>
        ) : filteredJurnal && filteredJurnal.length > 0 ? (
          filteredJurnal.map((item: any) => (
            <Card key={item.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:border-slate-300 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {getKategoriBadge(item.kategori)}
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.judul}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {item.jam && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> {item.jam}
                    </span>
                  )}
                  {!isHistorical && (
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Hapus Jurnal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {item.konten || item.isi}
              </p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex items-center gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  {item.tags.map((t: string, i: number) => (
                    <span key={i} className="text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card className="p-12 text-center rounded-2xl border-dashed border-slate-200 dark:border-slate-800">
            <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Ada Catatan Jurnal Pembinaan</p>
            <p className="text-xs text-slate-400 mt-1">
              Catatan bimbingan yang Anda tulis akan tersimpan otomatis sebagai portofolio resmi beban kerja wali kelas.
            </p>
          </Card>
        )}
      </div>

      {/* 4. MODAL TAMBAH JURNAL BARU - Lazy Mounted */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Tulis Catatan Jurnal Wali Kelas"
          size="lg"
        >
          <form onSubmit={handleSave} className="space-y-4 p-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                <input
                  type="date"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Pelaksanaan</label>
                <input
                  type="text"
                  placeholder="e.g. 10:00 WIB"
                  value={formData.jam}
                  onChange={(e) => setFormData({ ...formData, jam: e.target.value })}
                  className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Kategori Aktivitas</label>
              <select
                value={formData.kategori}
                onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <option value="PEMBINAAN_KELAS">Pembinaan Karakter & Kelas</option>
                <option value="KOORDINASI_BK">Koordinasi Guru BK</option>
                <option value="RAPAT_ORTU">Rapat / Komunikasi Orang Tua</option>
                <option value="KASUS_SELESAI">Penyelesaian Kasus Siswa</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Agenda</label>
              <input
                type="text"
                placeholder="e.g. Bimbingan Kedisiplinan Jam Pertama & Evaluasi Kerapian"
                value={formData.judul}
                onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Isi Catatan Bimbingan</label>
              <textarea
                rows={4}
                placeholder="Tuliskan catatan arahan, perkembangan siswa, atau hasil kesepakatan bimbingan..."
                value={formData.isi}
                onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Tags (Pisahkan dengan koma)</label>
              <input
                type="text"
                placeholder="e.g. kedisiplinan, piket, motivasi"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Menyimpan...' : 'Simpan Jurnal'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 5. MODAL KONFIRMASI HAPUS JURNAL - Lazy Mounted */}
      {Boolean(deletingId) && (
        <Modal
          isOpen={Boolean(deletingId)}
          onClose={() => setDeletingId(null)}
          title="Konfirmasi Hapus Catatan Jurnal"
          size="sm"
        >
          <div className="p-4 space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-400">
              Apakah Anda yakin ingin menghapus catatan agenda pembinaan wali kelas ini? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingId(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (deletingId) {
                    deleteMutation.mutate(deletingId);
                    setDeletingId(null);
                  }
                }}
              >
                {deleteMutation.isPending ? 'Menghapus...' : 'Ya, Hapus Jurnal'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. UNIVERSAL DOCUMENT PRINT MODAL - BUKU JURNAL WALI KELAS */}
      {isPrintModalOpen && (
        <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
          <UniversalDocumentModal
            isOpen={isPrintModalOpen}
            onClose={() => setIsPrintModalOpen(false)}
            title="Dokumen Resmi: Buku Jurnal Pembinaan Wali Kelas"
            subtitle={`Rombel ${kelasNama || data?.kelasInfo?.nama_kelas || ''} - TP. ${tahunPelajaranStr} Semester ${semesterStr}`}
            orientation="portrait"
            onPrint={handlePrint}
            onDownloadPdf={handleDownloadPdf}
            printButtonText="Cetak Dokumen"
            downloadPdfText="Simpan PDF"
            size="5xl"
          >
            <div ref={printSheetRef}>
              <PrintDocumentSheet
                orientation="portrait"
                pageNumber={1}
                totalPages={1}
                footerText={`Dokumen Sah Wali Kelas • Dicetak otomatis oleh Absenta pada ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeID })}`}
              >
                {/* Kop Surat Resmi */}
                <PrintHeader 
                  showDoubleLine={true}
                  showLogoSekolah={true}
                  showLogoDaerah={true}
                  logoSekolahUrl={logoSekolahBase64}
                  logoDaerahUrl={logoDaerahBase64}
                />

                {/* Judul Dokumen */}
                <div className="text-center my-4 font-serif">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                    BUKU JURNAL PEMBINAAN WALI KELAS
                  </h2>
                  <p className="text-xs text-gray-700 mt-0.5">
                    Kelas: <span className="font-bold text-black">{kelasNama || data?.kelasInfo?.nama_kelas || '-'}</span> | 
                    Tahun Pelajaran: <span className="font-bold text-black">{tahunPelajaranStr || '-'}</span> (Semester {semesterStr || '-'})
                  </p>
                </div>

                {/* Table Data Content */}
                <div className="mt-4">
                  <table className="w-full border-collapse border border-black text-[11px] font-sans">
                    <thead>
                      <tr className="bg-gray-100 text-black">
                        <th className="border border-black p-1.5 text-center w-8">No</th>
                        <th className="border border-black p-1.5 text-center w-24">Tanggal</th>
                        <th className="border border-black p-1.5 text-center w-28">Kategori</th>
                        <th className="border border-black p-1.5 text-left">Uraian Pembinaan / Tindak Lanjut</th>
                        <th className="border border-black p-1.5 text-center w-28">Paraf Walas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!rawJurnalList || rawJurnalList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="border border-black p-3 text-center text-gray-500">
                            Belum ada riwayat catatan jurnal pembinaan.
                          </td>
                        </tr>
                      ) : (
                        rawJurnalList.map((j: any, idx: number) => (
                          <tr key={j.id || idx} className="text-black">
                            <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                            <td className="border border-black p-1.5 text-center">{new Date(j.tanggal).toLocaleDateString('id-ID')}</td>
                            <td className="border border-black p-1.5 text-center font-medium">{j.kategori?.replace('_', ' ') || j.kategori}</td>
                            <td className="border border-black p-1.5">
                              <p className="font-bold">{j.judul}</p>
                              <p className="text-gray-700 mt-0.5 leading-relaxed">{j.isi}</p>
                            </td>
                            <td className="border border-black p-1.5 text-center"></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 2-Tier Bureaucracy Signatures Menggunakan Universal Signature Engine */}
                <div className="mt-8 pt-2 w-full page-break-inside-avoid">
                  <UniversalDocumentSignatures
                    layout="triangle_2tier"
                    tahunPelajaranId={data?.academicContext?.selectedTahunPelajaranId}
                    semesterId={data?.academicContext?.selectedSemesterId}
                    kelasId={kelasId}
                    verifierLabel={"Mengetahui,\nWakil Kepala Sekolah Bid. Kesiswaan"}
                    makerLabel={`Wali Kelas ${kelasNama || data?.kelasInfo?.nama_kelas || ''},`}
                    notesOrApprovalLabel={"Menyetujui / Mengesahkan,\nKepala Sekolah"}
                    overrideSignerLeft={{
                      personName: '( ........................................ )',
                    }}
                    overrideSignerRight={{
                      personName: walasName,
                      nip: walasNip,
                    }}
                  />
                </div>
              </PrintDocumentSheet>
            </div>
          </UniversalDocumentModal>
        </Suspense>
      )}
    </div>
  );
});

WalasJurnalTab.displayName = 'WalasJurnalTab';
