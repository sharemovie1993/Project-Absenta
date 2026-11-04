import React, { useRef, useState } from 'react';
import { Modal, Button } from '@/components/ui';
import { Printer, Download, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import type { CbtJadwalUjian } from '@/types/cbt.types';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { getTimezone, getTimezoneLabel } from '@/utils/attendance/time';

interface CbtBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  jadwal: CbtJadwalUjian | null;
}

export const CbtBeritaAcaraPrintModal: React.FC<CbtBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  jadwal,
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [pengawas1, setPengawas1] = useState('');
  const [pengawas2, setPengawas2] = useState('');
  const [catatanPelaksanaan, setCatatanPelaksanaan] = useState('Ujian berlangsung tertib, aman, dan lancar tanpa kendala teknis jaringan.');

  // Fetch tenant profile for Kop Surat & dynamic city
  const { data: tenantProfile } = useQuery({
    queryKey: ['active-tenant-school-profile'],
    queryFn: async () => {
      const res = await axiosInstance.get('/sekolah/profile');
      return res.data?.data || null;
    },
    enabled: isOpen,
  });

  const namaSekolah = tenantProfile?.nama || tenantProfile?.name || 'SMK NEGERI 1 PLERED';
  const alamatSekolah = tenantProfile?.alamat || 'Jl. Raya Sempur No. 27, Plered, Purwakarta';
  const kotaSekolah = tenantProfile?.kota || 'Purwakarta';

  const handlePrint = () => {
    window.print();
  };

  if (!jadwal) return null;

  const activeTz = getTimezone();
  const tzLabel = getTimezoneLabel(activeTz);
  const tglMulai = new Date(jadwal.tanggal_mulai);
  const tanggalFormat = tglMulai.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: activeTz,
  });

  const jamFormat = `${tglMulai.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: activeTz })} ${tzLabel} s.d. Selesai`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cetak Berita Acara Pelaksanaan Ujian CBT"
      size="xl"
    >
      <div className="space-y-4">
        {/* Customization Toolbar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pengawas 1:
            </label>
            <input
              type="text"
              value={pengawas1}
              onChange={(e) => setPengawas1(e.target.value)}
              placeholder="Nama Lengkap & Gelar Pengawas 1"
              className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-950 font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nama Pengawas 2 (Opsional):
            </label>
            <input
              type="text"
              value={pengawas2}
              onChange={(e) => setPengawas2(e.target.value)}
              placeholder="Nama Lengkap & Gelar Pengawas 2"
              className="w-full px-2.5 py-1.5 border rounded-lg bg-white dark:bg-slate-950 font-medium"
            />
          </div>
        </div>

        {/* Printable WYSIWYG Document Sheet */}
        <div className="overflow-x-auto p-4 bg-slate-200/50 dark:bg-slate-950/80 rounded-xl flex justify-center">
          <div
            ref={printRef}
            className="w-[210mm] min-h-[297mm] p-10 bg-white text-black shadow-lg rounded-sm text-sm space-y-6 font-serif leading-relaxed"
            style={{ boxSizing: 'border-box' }}
          >
            {/* Kop Surat Resmi */}
            <div className="border-b-2 border-double border-black pb-4 text-center space-y-1">
              <h2 className="text-base font-bold uppercase tracking-wide">
                PEMERINTAH DAERAH PROVINSI JAWA BARAT
              </h2>
              <h1 className="text-xl font-black uppercase tracking-wider">
                {namaSekolah}
              </h1>
              <p className="text-xs italic font-sans text-gray-700">{alamatSekolah}</p>
            </div>

            {/* Judul Dokumen */}
            <div className="text-center space-y-1 pt-2">
              <h3 className="text-base font-black underline uppercase tracking-wider">
                BERITA ACARA PELAKSANAAN ASESMEN CBT
              </h3>
              <p className="text-xs font-sans font-semibold text-gray-700">
                Nomor: BA-CBT/{tglMulai.getFullYear()}/{jadwal.token_ujian}
              </p>
            </div>

            {/* Pembuka */}
            <div className="text-xs font-sans text-justify space-y-3 pt-2">
              <p>
                Pada hari ini <span className="font-bold">{tanggalFormat}</span>, telah dilaksanakan asesmen Computer-Based Test (CBT) berbasis digital dengan rincian pelaksanaan sebagai berikut:
              </p>

              {/* Rincian Tabel Sesi */}
              <table className="w-full border-collapse border border-gray-400 text-xs">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="w-48 p-2 font-bold bg-gray-50 border-r border-gray-300">Nama Sesi Ujian</td>
                    <td className="p-2 font-semibold">{jadwal.nama_sesi}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-gray-50 border-r border-gray-300">Mata Pelajaran</td>
                    <td className="p-2 font-semibold">{jadwal.BankSoal?.Mapel?.nama_mapel || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-gray-50 border-r border-gray-300">Kode Bank Soal</td>
                    <td className="p-2 font-mono font-bold">{jadwal.BankSoal?.kode_bank || '-'}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-gray-50 border-r border-gray-300">Alokasi Waktu Pengerjaan</td>
                    <td className="p-2">{jadwal.durasi_menit} Menit ({jamFormat})</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-gray-50 border-r border-gray-300">Token Masuk Ujian</td>
                    <td className="p-2 font-mono font-black text-sm tracking-widest">{jadwal.token_ujian}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-gray-50 border-r border-gray-300">Status Keamanan Sistem</td>
                    <td className="p-2 text-emerald-700 font-bold">Terkunci (Lock Device & Anti-Tab Switch Guard Aktif)</td>
                  </tr>
                </tbody>
              </table>

              {/* Catatan Khusus */}
              <div className="pt-2">
                <span className="font-bold">Catatan Pengawas Selama Ujian:</span>
                <p className="p-2 border border-gray-300 rounded bg-gray-50/50 mt-1 italic text-[11px]">
                  {catatanPelaksanaan}
                </p>
              </div>

              <p className="pt-2">
                Demikian Berita Acara ini dibuat dengan sesungguhnya dan penuh rasa tanggung jawab untuk dipergunakan sebagaimana mestinya.
              </p>
            </div>

            {/* Area Tanda Tangan */}
            <div className="pt-8 flex justify-between text-xs font-sans">
              <div className="text-center w-52 space-y-16">
                <p>Pengawas 1,</p>
                <div>
                  <p className="font-bold underline">{pengawas1 || '( .......................................... )'}</p>
                  <p className="text-[10px] text-gray-600">NIP. .....................................</p>
                </div>
              </div>

              <div className="text-center w-52 space-y-16">
                <p>{kotaSekolah}, {tglMulai.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: activeTz })}<br />Pengawas 2 / Tim CBT,</p>
                <div>
                  <p className="font-bold underline">{pengawas2 || '( .......................................... )'}</p>
                  <p className="text-[10px] text-gray-600">NIP. .....................................</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            <Printer size={14} className="mr-1.5" />
            <span>Cetak Dokumen (Print)</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
