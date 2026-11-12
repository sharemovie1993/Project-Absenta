import React, { useState, useRef } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  PrintHeader,
  usePrintHeaderData,
} from '@/components/ui/PrintHeader';
import type { RapatMasterItem, RapatPesertaItem } from '@/api/academic/rapat.api';
import toast from 'react-hot-toast';

export interface RapatBeritaAcaraPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  rapat: RapatMasterItem | null;
  attendees: RapatPesertaItem[];
}

export const RapatBeritaAcaraPrintModal: React.FC<RapatBeritaAcaraPrintModalProps> = ({
  isOpen,
  onClose,
  rapat,
  attendees,
}) => {
  const printSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showLogoDaerah, setShowLogoDaerah] = useState(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState(true);

  const { tenantInfo, rawSekolah } = usePrintHeaderData();

  const defaultKota = React.useMemo(() => {
    return (
      rawSekolah?.kota ||
      tenantInfo?.kota ||
      'Purwakarta'
    );
  }, [rawSekolah, tenantInfo]);

  const formattedDate = React.useMemo(() => {
    if (!rapat?.tanggal_rapat) return 'Hari ini';
    try {
      const d = new Date(rapat.tanggal_rapat);
      if (isNaN(d.getTime())) return rapat.tanggal_rapat;
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return rapat.tanggal_rapat;
    }
  }, [rapat?.tanggal_rapat]);

  const totalPeserta = attendees.length;
  const hadirCount = attendees.filter((a) => a.is_hadir).length;
  const izinCount = attendees.filter((a) => a.metode_kehadiran === 'IZIN').length;
  const sakitCount = attendees.filter((a) => a.metode_kehadiran === 'SAKIT').length;
  const belumHadirCount = Math.max(0, totalPeserta - hadirCount - izinCount - sakitCount);
  const persentaseHadir = totalPeserta > 0 ? Math.round((hadirCount / totalPeserta) * 100) : 0;

  const handlePrintBrowser = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (!printSheetRef.current) return;
    try {
      setIsExportingPdf(true);
      toast.loading('Menyiapkan Berita Acara & Daftar Hadir PDF...', { id: 'pdf-bap' });

      const html2pdf = (await import('html2pdf.js')).default;
      const element = printSheetRef.current;
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `BERITA_ACARA_RAPAT_${(rapat?.judul_rapat || 'RAPAT').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('Berkas Berita Acara PDF berhasil diunduh!', { id: 'pdf-bap' });
    } catch (error) {
      console.error('Gagal cetak PDF:', error);
      toast.error('Gagal membuat PDF. Silakan gunakan tombol Cetak Browser.', { id: 'pdf-bap' });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen || !rapat) return null;

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title="Berita Acara & Daftar Hadir Rapat"
      subtitle={`${rapat.judul_rapat} • Dokumen Resmi Sekolah`}
      onPrint={handlePrintBrowser}
      onExportPdf={handleExportPdf}
      isExportingPdf={isExportingPdf}
      showLogoDaerah={showLogoDaerah}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoDaerah={() => setShowLogoDaerah(!showLogoDaerah)}
      onToggleLogoSekolah={() => setShowLogoSekolah(!showLogoSekolah)}
    >
      <PrintDocumentSheet ref={printSheetRef} size="A4" orientation="portrait" padding="15mm">
        {/* Kop Surat Sekolah Resmi */}
        <PrintHeader showLogoDaerah={showLogoDaerah} showLogoSekolah={showLogoSekolah} />

        {/* Judul Dokumen */}
        <div className="text-center my-3 pb-2 border-b-2 border-slate-900">
          <h2 className="text-base font-bold tracking-tight text-slate-900 uppercase">
            BERITA ACARA & NOTULEN RAPAT
          </h2>
          <p className="text-sm font-semibold text-slate-800 uppercase mt-0.5">
            {rapat.judul_rapat}
          </p>
          {rapat.nomor_surat ? (
            <p className="text-xs font-mono text-slate-600">Nomor: {rapat.nomor_surat}</p>
          ) : (
            <p className="text-xs text-slate-600">Tahun Ajaran Aktif</p>
          )}
        </div>

        {/* Pengantar / Narasi Berita Acara */}
        <div className="text-xs text-slate-800 text-justify leading-relaxed mb-3">
          Pada hari ini, <span className="font-semibold">{formattedDate}</span>, bertempat di{' '}
          <span className="font-semibold">{rapat.tempat}</span>, telah diselenggarakan{' '}
          <span className="font-semibold">{rapat.judul_rapat}</span> ({rapat.kategori_rapat.replace(/_/g, ' ')}) yang dihadiri oleh unsur{' '}
          <span className="font-semibold">{rapat.target_peserta.replace(/_/g, ' ')}</span> dengan ringkasan pelaksanaan sebagai berikut:
        </div>

        {/* Ringkasan Parameter Rapat */}
        <div className="bg-slate-50 border border-slate-300 rounded p-2.5 mb-3 text-xs">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="w-28 font-semibold py-0.5 text-slate-600">Waktu Pelaksanaan</td>
                <td className="w-3">:</td>
                <td className="font-medium text-slate-900">
                  Pukul {rapat.jam_mulai} {rapat.jam_selesai ? `- ${rapat.jam_selesai}` : 's/d Selesai'} WIB
                </td>
                <td className="w-28 font-semibold py-0.5 text-slate-600 pl-4">Tingkat Kehadiran</td>
                <td className="w-3">:</td>
                <td className="font-bold text-slate-900">
                  {hadirCount} dari {totalPeserta} Peserta ({persentaseHadir}%)
                </td>
              </tr>
              <tr>
                <td className="font-semibold py-0.5 text-slate-600">Pimpinan Rapat</td>
                <td>:</td>
                <td className="font-medium text-slate-900">{rapat.pimpinan_rapat || 'Kepala Sekolah'}</td>
                <td className="font-semibold py-0.5 text-slate-600 pl-4">Notulis</td>
                <td>:</td>
                <td className="font-medium text-slate-900">{rapat.notulis || '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Agenda Pembahasan */}
        {rapat.agenda && Array.isArray(rapat.agenda) && rapat.agenda.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">
              I. Agenda Pembahasan
            </h4>
            <ul className="list-disc list-inside text-xs text-slate-800 space-y-0.5 pl-2">
              {rapat.agenda.map((item: string, idx: number) => (
                <li key={idx} className="leading-snug">{item}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Notulen / Hasil Keputusan */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1">
            II. Hasil Keputusan & Notulen Rapat
          </h4>
          <div className="text-xs text-slate-800 whitespace-pre-line bg-slate-50 border border-slate-200 rounded p-2.5 leading-relaxed min-h-[60px]">
            {rapat.notulen_hasil || (
              <span className="italic text-slate-500">
                Seluruh peserta telah mengikuti jalannya rapat dan menyepakati poin-poin arahan yang disampaikan oleh pimpinan rapat.
              </span>
            )}
          </div>
        </div>

        {/* Tabel Daftar Hadir Peserta */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              III. Daftar Hadir Peserta Rapat
            </h4>
            <span className="text-[11px] font-mono text-slate-600">
              Hadir: {hadirCount} • Izin/Sakit: {izinCount + sakitCount} • Belum Hadir: {belumHadirCount}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-400 text-[11px]">
            <thead>
              <tr className="bg-slate-200/80 text-slate-800">
                <th className="border border-slate-400 px-2 py-1 text-center w-8">No</th>
                <th className="border border-slate-400 px-2 py-1 text-left">Nama Lengkap Peserta</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-28">NIP / Identitas</th>
                <th className="border border-slate-400 px-2 py-1 text-left w-36">Jabatan / Keterangan</th>
                <th className="border border-slate-400 px-2 py-1 text-center w-20">Status</th>
                <th className="border border-slate-400 px-2 py-1 text-center w-28">Waktu / Tanda Tangan</th>
              </tr>
            </thead>
            <tbody>
              {attendees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-3 text-slate-500 italic">
                    Belum ada data peserta yang terdaftar.
                  </td>
                </tr>
              ) : (
                attendees.map((a, idx) => (
                  <tr key={a.id || idx} className={idx % 2 === 1 ? 'bg-slate-50/70' : ''}>
                    <td className="border border-slate-400 px-2 py-0.5 text-center">{idx + 1}</td>
                    <td className="border border-slate-400 px-2 py-0.5 font-medium text-slate-900">
                      {a.nama_peserta}
                    </td>
                    <td className="border border-slate-400 px-2 py-0.5 font-mono text-slate-600">
                      {a.nomor_identitas || '-'}
                    </td>
                    <td className="border border-slate-400 px-2 py-0.5 text-slate-700">
                      {a.jabatan_keterangan || '-'}
                    </td>
                    <td className="border border-slate-400 px-2 py-0.5 text-center font-semibold">
                      {a.is_hadir ? (
                        <span className="text-emerald-700">HADIR</span>
                      ) : a.metode_kehadiran === 'IZIN' ? (
                        <span className="text-amber-700">IZIN</span>
                      ) : a.metode_kehadiran === 'SAKIT' ? (
                        <span className="text-blue-700">SAKIT</span>
                      ) : (
                        <span className="text-rose-600">BELUM HADIR</span>
                      )}
                    </td>
                    <td className="border border-slate-400 px-2 py-0.5 text-center text-[10px] font-mono text-slate-600">
                      {a.is_hadir && a.waktu_hadir ? (
                        new Date(a.waktu_hadir).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pengesahan Tanda Tangan */}
        <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-800">
          <div className="w-56 text-center">
            <p>Notulis Rapat,</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">{rapat.notulis || '( ...................................... )'}</p>
            <p className="text-[11px] text-slate-600">NIP. -</p>
          </div>

          <div className="w-56 text-center">
            <p>{defaultKota}, {formattedDate}</p>
            <p className="font-semibold">Pimpinan Rapat,</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">{rapat.pimpinan_rapat || 'Kepala Sekolah'}</p>
            <p className="text-[11px] text-slate-600">NIP. -</p>
          </div>
        </div>
      </PrintDocumentSheet>
    </UniversalDocumentModal>
  );
};
