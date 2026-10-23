import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UniversalDocumentModal,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import {
  dknApi,
  dknQueryKeys,
  type PreviewSuratPengantarResponse,
} from '@/api/correspondence/dkn.api';
import { SuratPengantarDknSheet } from './SuratPengantarDknSheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SuratPengantarModalProps {
  isOpen: boolean;
  onClose: () => void;
  tahunPelajaranId: string;
  jurusanId?: string;
  kelasId?: string;
  tahunPelajaran?: string;
}

export const SuratPengantarModal: React.FC<SuratPengantarModalProps> = ({
  isOpen,
  onClose,
  tahunPelajaranId,
  jurusanId,
  kelasId,
}) => {
  const queryClient = useQueryClient();
  const { tenantInfo } = usePrintHeaderData();

  // Mode tab dalam dialog: 'FORM' | 'PREVIEW'
  const [activeTab, setActiveTab] = useState<'FORM' | 'PREVIEW'>('FORM');

  // Form states
  const [tujuanDinas, setTujuanDinas] = useState(
    'Kepala Cabang Dinas Pendidikan Wilayah IV Provinsi Jawa Barat'
  );
  const [alamatDinas, setAlamatDinas] = useState(
    'Jl. Veteran No. 1, Purwakarta'
  );
  const [nomorManual, setNomorManual] = useState('');
  const [tanggalSurat, setTanggalSurat] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [lampiran, setLampiran] = useState('1 (Satu) Berkas');
  const [catatan, setCatatan] = useState('');

  // Signatures
  const [wakaNama, setWakaNama] = useState('');
  const [wakaNip, setWakaNip] = useState('');
  const [pengawasNama, setPengawasNama] = useState('');
  const [pengawasNip, setPengawasNip] = useState('');

  // Preview data state
  const [previewData, setPreviewData] = useState<PreviewSuratPengantarResponse['data'] | null>(null);

  // Mutation untuk preview
  const previewMutation = useMutation({
    mutationFn: () =>
      dknApi.previewSuratPengantar({
        tahun_pelajaran_id: tahunPelajaranId,
        jurusan_id: jurusanId,
        kelas_id: kelasId,
        tujuan_dinas: tujuanDinas,
        alamat_dinas: alamatDinas,
        nomor_surat_manual: nomorManual || undefined,
        tanggal_surat: tanggalSurat,
        lampiran: lampiran,
        catatan_pengantar: catatan || undefined,
      }),
    onSuccess: (res) => {
      setPreviewData(res.data);
      if (!wakaNama && res.data.pejabat.waka_kurikulum.nama) {
        setWakaNama(res.data.pejabat.waka_kurikulum.nama);
        setWakaNip(res.data.pejabat.waka_kurikulum.nip);
      }
      setActiveTab('PREVIEW');
    },
    onError: (err: any) => {
      toast.error('Gagal memuat pratinjau surat pengantar', {
        description: err.message,
      });
    },
  });

  // Mutation untuk issue (terbitkan resmi)
  const issueMutation = useMutation({
    mutationFn: () =>
      dknApi.issueSuratPengantar({
        tahun_pelajaran_id: tahunPelajaranId,
        jurusan_id: jurusanId,
        kelas_id: kelasId,
        tujuan_dinas: tujuanDinas,
        alamat_dinas: alamatDinas,
        nomor_surat_manual: nomorManual || undefined,
        tanggal_surat: tanggalSurat,
        lampiran: lampiran,
        catatan_pengantar: catatan || undefined,
        waka_kurikulum_nama: wakaNama || undefined,
        waka_kurikulum_nip: wakaNip || undefined,
        pengawas_pembina_nama: pengawasNama || undefined,
        pengawas_pembina_nip: pengawasNip || undefined,
      }),
    onSuccess: (res) => {
      toast.success('Surat Pengantar DKN berhasil diterbitkan!', {
        description: `Nomor: ${res.data?.nomor_surat || 'Tercatat di Agenda Keluar'}`,
      });
      queryClient.invalidateQueries({ queryKey: dknQueryKeys.all });
      onClose();
    },
    onError: (err: any) => {
      toast.error('Gagal menerbitkan surat pengantar dinas', {
        description: err.message,
      });
    },
  });

  const handleGeneratePreview = () => {
    if (!tujuanDinas) {
      toast.warning('Tujuan cabang dinas wajib diisi');
      return;
    }
    previewMutation.mutate();
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Surat Pengantar Penyerahan DKN ke Dinas Pendidikan"
      subtitle="Dokumen resmi pengantar penyerahan berkas kelulusan ke Cabang Dinas Wilayah (KCD)"
      allowLogoToggles={true}
      orientation="portrait"
    >
      <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* TAB SELECTOR */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab('FORM')}
            className={`pb-2.5 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'FORM'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            1. Konfigurasi Surat Pengantar
          </button>
          <button
            type="button"
            onClick={handleGeneratePreview}
            className={`pb-2.5 px-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'PREVIEW'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            2. Pratinjau Lembar Surat Dinas
          </button>
        </div>

        {/* TAB 1: FORM CONFIG */}
        {activeTab === 'FORM' && (
          <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="tujuan_dinas">Tujuan Surat (Instansi / KCD)</Label>
                <Input
                  id="tujuan_dinas"
                  value={tujuanDinas}
                  onChange={(e) => setTujuanDinas(e.target.value)}
                  placeholder="Contoh: Kepala Cabang Dinas Pendidikan Wilayah IV"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="alamat_dinas">Alamat Instansi / KCD</Label>
                <Input
                  id="alamat_dinas"
                  value={alamatDinas}
                  onChange={(e) => setAlamatDinas(e.target.value)}
                  placeholder="Contoh: Jl. Veteran No. 1, Purwakarta"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nomor_manual">Nomor Surat (Opsional / Manual)</Label>
                <Input
                  id="nomor_manual"
                  value={nomorManual}
                  onChange={(e) => setNomorManual(e.target.value)}
                  placeholder="Kosongkan untuk penomoran baku otomatis 421.5/..."
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tanggal_surat">Tanggal Surat</Label>
                <Input
                  id="tanggal_surat"
                  type="date"
                  value={tanggalSurat}
                  onChange={(e) => setTanggalSurat(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lampiran">Keterangan Lampiran</Label>
                <Input
                  id="lampiran"
                  value={lampiran}
                  onChange={(e) => setLampiran(e.target.value)}
                  placeholder="1 (Satu) Berkas"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catatan">Catatan Tambahan (Opsional)</Label>
                <Input
                  id="catatan"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Keterangan khusus rapat kelulusan"
                />
              </div>
            </div>

            {/* SEKSI PENGAWAS PEMBINA & WAKA */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Identitas Pejabat Penandatangan Tambahan (Opsional)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Nama Pengawas Pembina Dinas</Label>
                  <Input
                    value={pengawasNama}
                    onChange={(e) => setPengawasNama(e.target.value)}
                    placeholder="Nama Pengawas Pembina"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>NIP Pengawas Pembina</Label>
                  <Input
                    value={pengawasNip}
                    onChange={(e) => setPengawasNip(e.target.value)}
                    placeholder="19xxxxxxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" onClick={onClose}>
                Batal
              </Button>
              <Button
                onClick={handleGeneratePreview}
                disabled={previewMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {previewMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                Lihat Pratinjau Surat
              </Button>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW & ISSUE */}
        {activeTab === 'PREVIEW' && (
          <div className="space-y-6">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Pratinjau Surat Pengantar Dinas Telah Siap
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Periksa kebenaran isi dokumen sebelum menerbitkan nomor registrasi dan mencetak.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab('FORM')}
                >
                  Edit Data
                </Button>
                <Button
                  size="sm"
                  onClick={() => issueMutation.mutate()}
                  disabled={issueMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {issueMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  ) : (
                    <Send className="w-4 h-4 mr-1.5" />
                  )}
                  Terbitkan & Simpan Arsip
                </Button>
              </div>
            </div>

            {/* SHEET CONTAINER */}
            <div className="flex justify-center p-2 bg-slate-100 dark:bg-slate-950 rounded-xl overflow-x-auto">
              {previewData && (
                <SuratPengantarDknSheet data={previewData} tenantInfo={tenantInfo} />
              )}
            </div>
          </div>
        )}
      </div>
    </UniversalDocumentModal>
  );
};
