import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  X,
  FileText,
  CheckCircle2,
  Users,
  Building2,
  HelpCircle,
  Loader2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';
import { getMyTenant } from '@/api/tenants.api';
import {
  getKetarunaanNilaiExport,
  KetarunaanNilaiStudent,
  KetarunaanSkema,
  KetarunaanNilaiExportRow,
} from '@/api/kesiswaan/programKetarunaan.api';
import { exportKetarunaanMailMerge } from '@/utils/export/excelKetarunaanMailMerge';
import { getPredikatLabel } from '@/utils/print/modules/pdfSertifikatKetarunaan';
import { toast } from 'sonner';

export interface KetarunaanExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStudents?: KetarunaanNilaiStudent[];
  currentScores?: Record<string, { samapta: number; pbb: number; disiplin: number; mental: number }>;
  skema?: KetarunaanSkema | null;
  calculateLiveFinal?: (scores: { samapta: number; pbb: number; disiplin: number; mental: number }) => { final: number; grade: string };
  kelasId?: string;
  kelasNama?: string;
  jurusanNama?: string;
  tahunPelajaranId?: string;
  tahunPelajaranNama?: string;
  semesterId?: string;
  semesterNama?: string;
}

export const KetarunaanExportModal: React.FC<KetarunaanExportModalProps> = ({
  isOpen,
  onClose,
  currentStudents = [],
  currentScores = {},
  skema,
  calculateLiveFinal,
  kelasId,
  kelasNama,
  jurusanNama,
  tahunPelajaranId,
  tahunPelajaranNama,
  semesterId,
  semesterNama,
}) => {
  const [exportScope, setExportScope] = useState<'CLASS' | 'ALL'>(kelasId ? 'CLASS' : 'ALL');
  const [isExporting, setIsExporting] = useState(false);

  // Ambil metadata instansi sekolah
  const { user } = useAuthStore();
  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-details', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: isOpen && !!user?.tenant_id,
  });

  const tenantData = (tenantRes as any)?.data || tenantRes || user?.tenant;

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    try {
      setIsExporting(true);

      const sekolahNama = tenantData?.name || 'SMK NEGERI 1 PLERED';
      const sekolahNpsn = tenantData?.npsn || '';
      const sekolahAlamat = tenantData?.address || '';
      const kotaSekolah = tenantData?.city || tenantData?.kabupaten || 'Purwakarta';
      const kepsekNama = tenantData?.headmaster_name || 'Wahyu Tamimbarkah, S.Pd.';
      const kepsekNip = tenantData?.headmaster_nip || '197111022008011001';
      const yearNow = new Date().getFullYear();
      const tpLabel = tahunPelajaranNama || '2026/2027';
      const semLabel = semesterNama || 'Ganjil';

      if (exportScope === 'CLASS') {
        if (!currentStudents || currentStudents.length === 0) {
          toast.error('Tidak ada data siswa pada rombel ini untuk diekspor.');
          return;
        }

        toast.info('Menyiapkan data mail merge rombel...');

        const rows: KetarunaanNilaiExportRow[] = currentStudents.map((s, idx) => {
          const sc = currentScores[s.siswa_id] || {
            samapta: s.nilai_samapta ?? 0,
            pbb: s.nilai_pbb ?? 0,
            disiplin: s.nilai_disiplin ?? 0,
            mental: s.nilai_mental ?? 0,
          };

          const live = calculateLiveFinal
            ? calculateLiveFinal(sc)
            : {
                final: s.nilai_akhir || 0,
                grade: s.predikat || 'B',
              };

          const predikat = live.grade && live.grade !== '-' ? live.grade : 'B';
          const predikatLabel = getPredikatLabel(predikat);
          const keterangan = (predikat === 'A' || predikat === 'B' || predikat === 'C') ? 'KOMPETEN / LULUS' : 'BELUM MEMENUHI';

          const noSertifikat = `421.5/KETARUNAAN/${yearNow}/${s.nis || String(idx + 1).padStart(3, '0')}`;

          return {
            no: idx + 1,
            siswa_id: s.siswa_id,
            nis: s.nis || '',
            nisn: s.nisn || '',
            nama_taruna: s.nama_siswa || '',
            nama_lengkap: s.nama_siswa || '',
            nama_siswa: s.nama_siswa || '',
            jenis_kelamin: s.jenis_kelamin || 'L',
            jk: s.jenis_kelamin || 'L',
            jk_label: s.jenis_kelamin === 'P' ? 'Perempuan' : 'Laki-laki',
            kelas_id: kelasId || '',
            kelas: kelasNama || '',
            rombel: kelasNama || '',
            tingkat: kelasNama?.split(' ')[0] || '',
            jurusan_id: '',
            jurusan: jurusanNama || '',
            kode_jurusan: kelasNama?.split(' ')[1] || '',
            tahun_pelajaran: tpLabel,
            semester: semLabel,
            mode_pelatihan: skema?.mode_pelatihan === 'FULL_TARUNA' ? 'Murni Ketarunaan' : 'Semi Ketarunaan',
            nilai_samapta: sc.samapta,
            nilai_pbb: sc.pbb,
            nilai_disiplin: sc.disiplin,
            nilai_mental: sc.mental,
            bobot_samapta: skema?.bobot_samapta ?? 25,
            bobot_pbb: skema?.bobot_pbb ?? 20,
            bobot_disiplin: skema?.bobot_disiplin ?? 30,
            bobot_mental: skema?.bobot_mental ?? 25,
            nilai_akhir: live.final,
            predikat,
            predikat_label: predikatLabel,
            keterangan,
            deskripsi_capaian: s.deskripsi_rapor || '',
            deskripsi_rapor: s.deskripsi_rapor || '',
            nomor_sertifikat: noSertifikat,
            tempat_terbit: kotaSekolah,
            tanggal_terbit: `${kotaSekolah}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
            tanggal_cetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            nama_sekolah: sekolahNama,
            npsn: sekolahNpsn,
            alamat_sekolah: sekolahAlamat,
            kota_sekolah: kotaSekolah,
            kepala_sekolah: kepsekNama,
            nip_kepala_sekolah: kepsekNip,
            is_locked: s.is_locked,
          };
        });

        const safeKelas = (kelasNama || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Nilai_Ketarunaan_MailMerge_${safeKelas}_${tpLabel.replace('/', '-')}`;

        await exportKetarunaanMailMerge(rows, {
          filename,
          kelasNama,
          tahunPelajaran: tpLabel,
          semester: semLabel,
        });

        toast.success(`Berhasil mengunduh data nilai ketarunaan rombel ${kelasNama} (${rows.length} taruna)!`);
        onClose();
      } else {
        // EXPORT ALL CLASSES
        if (!tahunPelajaranId || !semesterId) {
          toast.error('Tahun pelajaran dan semester wajib dipilih pada toolbar.');
          return;
        }

        toast.info('Mengambil data seluruh rombel dari server...');

        const res = await getKetarunaanNilaiExport({
          tahun_pelajaran_id: tahunPelajaranId,
          semester_id: semesterId,
        });

        const exportData = (res as any)?.data ?? res;
        const students = exportData?.students || [];

        if (students.length === 0) {
          toast.warning('Tidak ada data nilai siswa ditemukan untuk seluruh rombel.');
          return;
        }

        const filename = `Nilai_Ketarunaan_MailMerge_Semua_Rombel_${tpLabel.replace('/', '-')}`;

        await exportKetarunaanMailMerge(students, {
          filename,
          tahunPelajaran: tpLabel,
          semester: semLabel,
        });

        toast.success(`Berhasil mengunduh data nilai ketarunaan semua rombel (${students.length} taruna)!`);
        onClose();
      }
    } catch (err: any) {
      console.error('Export Ketarunaan Error:', err);
      toast.error('Gagal mengekspor data: ' + (err?.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                Ekspor Nilai Ketarunaan ke Excel
              </h3>
              <p className="text-xs text-slate-500">
                Format 100% Kompatibel Microsoft Word Mail Merge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 space-y-5">
          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200/60 dark:border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Dirancang Khusus untuk Cetak Massal (Mail Merge)</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              File Excel (.xlsx) yang dihasilkan memiliki baris judul di baris pertama (<code className="px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200 font-mono text-[11px]">Row 1</code>) tanpa header bertingkat, sehingga langsung terbaca oleh fitur <strong>Mailings &gt; Select Recipients</strong> di Microsoft Word untuk mencetak Sertifikat, Transkrip, atau Rapor.
            </p>
          </div>

          {/* Opsi Cakupan Ekspor */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Pilih Cakupan Data:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opsi 1: Rombel Terpilih */}
              <button
                type="button"
                onClick={() => setExportScope('CLASS')}
                disabled={!kelasId}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                  exportScope === 'CLASS'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                } ${!kelasId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Rombel Saat Ini
                    </span>
                    {exportScope === 'CLASS' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {kelasNama ? `Kelas ${kelasNama}` : 'Belum memilih kelas'}
                  </p>
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className="text-[10px] font-bold">
                    {currentStudents.length} Taruna
                  </Badge>
                </div>
              </button>

              {/* Opsi 2: Seluruh Rombel Sekolah */}
              <button
                type="button"
                onClick={() => setExportScope('ALL')}
                className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                  exportScope === 'ALL'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      Seluruh Rombel
                    </span>
                    {exportScope === 'ALL' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Semua kelas tahun {tahunPelajaranNama || '2026/2027'}
                  </p>
                </div>
                <div className="mt-3">
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    1 Sekolah / Angkatan
                  </Badge>
                </div>
              </button>
            </div>
          </div>

          {/* Fitur Bawaan Buku Kerja Excel */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-3.5 space-y-2 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Isi Buku Kerja Excel (.xlsx) yang Dihasilkan:
            </span>
            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>
                  <strong>Sheet 1 (DATA_MAIL_MERGE):</strong> Berisi 40 kolom field gabungan lengkap (<code className="text-[10px]">&lt;&lt;NAMA_TARUNA&gt;&gt;</code>, <code className="text-[10px]">&lt;&lt;NIS&gt;&gt;</code>, <code className="text-[10px]">&lt;&lt;NILAI_AKHIR&gt;&gt;</code>, <code className="text-[10px]">&lt;&lt;PREDIKAT&gt;&gt;</code>, <code className="text-[10px]">&lt;&lt;DESKRIPSI_CAPAIAN&gt;&gt;</code>, dll) dengan teks NIS berformat string tanpa kehilangan angka nol depan.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">•</span>
                <span>
                  <strong>Sheet 2 (PANDUAN_MAIL_MERGE):</strong> Panduan langkah demi langkah bergambar dan kamus lengkap seluruh tag merge field untuk panduan operator.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5 bg-slate-50/50 dark:bg-slate-950/40">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isExporting}
            className="text-xs font-bold"
          >
            Batal
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleExecuteExport}
            disabled={isExporting}
            className="gap-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengekspor Excel...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh File Excel Mail Merge</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
