import React, { useState } from 'react';
import {
  Calendar,
  Building2,
  Plus,
  Trash2,
  Printer,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
} from 'lucide-react';
import { Badge, Button, Input } from '@/components/ui';
import { toast } from 'react-hot-toast';
import type { SiswaBimbinganItem, KunjunganMonitoringItem } from '../types';

export interface PklMonitoringTabProps {
  siswaList: SiswaBimbinganItem[];
  kunjunganList?: KunjunganMonitoringItem[];
  onAddKunjungan?: (data: {
    penempatan_id: string;
    nama_mitra: string;
    tanggal_kunjungan: string;
    catatan_supervisi: string;
    kendala_siswa?: string;
    tindak_lanjut?: string;
  }) => Promise<void>;
  onDeleteKunjungan?: (id: string) => Promise<void>;
}

export const PklMonitoringTab: React.FC<PklMonitoringTabProps> = ({
  siswaList,
  kunjunganList = [],
  onAddKunjungan,
  onDeleteKunjungan,
}) => {
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedSiswaId, setSelectedSiswaId] = useState('');
  const [tanggalKunjungan, setTanggalKunjungan] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [catatanSupervisi, setCatatanSupervisi] = useState('');
  const [kendalaSiswa, setKendalaSiswa] = useState('');
  const [tindakLanjut, setTindakLanjut] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fallback demo visits
  const displayVisits: KunjunganMonitoringItem[] = kunjunganList.length > 0 ? kunjunganList : [
    {
      id: 'visit-1',
      penempatan_id: 'pen-1',
      nama_mitra: 'PT Telkom Indonesia (Witel Jabar)',
      tanggal_kunjungan: '2026-10-15',
      tujuan: 'Supervisi Rutin & Koordinasi Mentor Lapangan',
      catatan_supervisi: 'Siswa beradaptasi sangat baik dengan ritme kerja divisi jaringan. Mentor mengapresiasi kedisiplinan dan inisiatif tinggi.',
      kendala_siswa: 'Transportasi shift pagi sempat terlambat karena cuaca.',
      tindak_lanjut: 'Diberikan saran penyesuaian rute perjalanan lebih awal.',
      dibuat_oleh: 'Guru Pembimbing',
    },
    {
      id: 'visit-2',
      penempatan_id: 'pen-2',
      nama_mitra: 'PT Astra Honda Motor Plant',
      tanggal_kunjungan: '2026-09-28',
      tujuan: 'Monitoring Bulan Ke-1 & Penyelarasan K3',
      catatan_supervisi: 'Siswa telah mematuhi APD lengkap dan memahami alur kerja lini perakitan komponen utama.',
      kendala_siswa: 'Belum ada kendala berarti.',
      tindak_lanjut: 'Lanjutkan bimbingan jurnal harian.',
      dibuat_oleh: 'Guru Pembimbing',
    },
  ];

  const filteredVisits = displayVisits.filter(
    (v) =>
      v.nama_mitra.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.catatan_supervisi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiswaId) {
      toast.error('Pilih siswa/mitra yang dikunjungi.');
      return;
    }
    if (!catatanSupervisi.trim()) {
      toast.error('Wajib mengisi catatan hasil supervisi.');
      return;
    }

    const siswaObj = siswaList.find((s) => s.id === selectedSiswaId);
    setIsSubmitting(true);
    try {
      if (onAddKunjungan) {
        await onAddKunjungan({
          penempatan_id: selectedSiswaId,
          nama_mitra: siswaObj?.nama_mitra || 'Mitra Industri',
          tanggal_kunjungan: tanggalKunjungan,
          catatan_supervisi: catatanSupervisi,
          kendala_siswa: kendalaSiswa,
          tindak_lanjut: tindakLanjut,
        });
      }
      toast.success('Laporan kunjungan supervisi berhasil disimpan!');
      setShowFormModal(false);
      setCatatanSupervisi('');
      setKendalaSiswa('');
      setTindakLanjut('');
    } catch {
      toast.error('Gagal menyimpan laporan kunjungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input
            type="text"
            placeholder="Cari catatan kunjungan atau nama mitra..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs sm:text-sm rounded-xl h-10 w-full"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => setShowFormModal(true)}
          className="text-xs font-bold rounded-xl h-10 gap-1.5 shadow-xs shrink-0"
        >
          <Plus size={16} />
          Catat Supervisi Baru
        </Button>
      </div>

      {/* Visits Feed List */}
      {filteredVisits.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Belum Ada Catatan Supervisi
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Gunakan tombol &apos;Catat Supervisi Baru&apos; untuk mendokumentasikan kunjungan monitoring Anda ke DU/DI.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVisits.map((visit) => (
            <div
              key={visit.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {visit.nama_mitra}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {visit.tanggal_kunjungan}
                    </Badge>
                  </div>
                  {visit.tujuan && (
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      Tujuan: {visit.tujuan}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.print()}
                    className="text-xs font-bold rounded-xl h-8 gap-1.5 text-slate-600 dark:text-slate-300"
                  >
                    <Printer size={14} />
                    Cetak Lembar
                  </Button>
                  {onDeleteKunjungan && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteKunjungan(visit.id)}
                      className="text-xs font-bold rounded-xl h-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>

              {/* Catatan & Evaluasi */}
              <div className="space-y-2 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  <span className="font-bold block text-[11px] text-slate-400 uppercase tracking-wider mb-1">
                    Hasil Observasi Supervisi
                  </span>
                  {visit.catatan_supervisi}
                </div>

                {(visit.kendala_siswa || visit.tindak_lanjut) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visit.kendala_siswa && (
                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200">
                        <span className="font-bold block text-[10px] uppercase">Kendala Siswa:</span>
                        {visit.kendala_siswa}
                      </div>
                    )}
                    {visit.tindak_lanjut && (
                      <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/40 text-xs text-teal-900 dark:text-teal-200">
                        <span className="font-bold block text-[10px] uppercase">Rekomendasi / Solusi:</span>
                        {visit.tindak_lanjut}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Dialog Form Tambah Kunjungan */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Dokumentasi Kunjungan Supervisi DU/DI
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Siswa &amp; Lokasi DU/DI <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedSiswaId}
                  onChange={(e) => setSelectedSiswaId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">-- Pilih Siswa Bimbingan / Mitra DU/DI --</option>
                  {siswaList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nama_siswa} ({s.kelas}) - {s.nama_mitra}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tanggal Kunjungan <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={tanggalKunjungan}
                  onChange={(e) => setTanggalKunjungan(e.target.value)}
                  className="w-full text-xs rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Catatan Supervisi &amp; Evaluasi Mentor <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsikan perkembangan siswa, kedisiplinan, materi kerja, dan masukan dari mentor industri..."
                  value={catatanSupervisi}
                  onChange={(e) => setCatatanSupervisi(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Kendala Siswa (Bila Ada)
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Kesulitan memahami software internal atau adaptasi shift..."
                  value={kendalaSiswa}
                  onChange={(e) => setKendalaSiswa(e.target.value)}
                  className="w-full text-xs rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Tindak Lanjut / Rekomendasi
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Diberikan modul suplemen atau koordinasi lanjutan..."
                  value={tindakLanjut}
                  onChange={(e) => setTindakLanjut(e.target.value)}
                  className="w-full text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFormModal(false)}
                  className="text-xs font-bold rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Laporan Supervisi'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
