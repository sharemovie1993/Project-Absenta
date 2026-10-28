import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import { MapPin, Camera } from 'lucide-react';
import { resolveAttachmentUrl, getDriveThumbnailUrl } from '@/utils/hubinUtils';
import type { MitraTargetGroup } from './types';

export interface KunjunganMitraPrintSheetProps {
  showLogoDaerah: boolean;
  showLogoSekolah: boolean;
  tenantInfo: any;
  rawSekolah: any;
  group: MitraTargetGroup;
  cycleTitle: string;
  tahap?: string;
  visitDateFormatted: string;
  visitCatatan: string;
  visitCatatanDudi: string;
  visitFotoUrl?: string;
  visitLat?: number | string;
  visitLng?: number | string;
  visitJurnalVerified?: boolean;
  hubinSettings?: any;
  activeMitraNama: string;
  activePembimbingNama: string;
  activeHubinNama: string;
  activeHubinNip: string;
  activeKota: string;
  activeTanggal: string;
}

export const KunjunganMitraPrintSheet: React.FC<KunjunganMitraPrintSheetProps> = React.memo(({
  showLogoDaerah,
  showLogoSekolah,
  tenantInfo,
  rawSekolah,
  group,
  cycleTitle,
  tahap,
  visitDateFormatted,
  visitCatatan,
  visitCatatanDudi,
  visitFotoUrl,
  visitLat,
  visitLng,
  visitJurnalVerified,
  hubinSettings,
  activeMitraNama,
  activePembimbingNama,
  activeHubinNama,
  activeHubinNip,
  activeKota,
  activeTanggal,
}) => {
  const displayThumb = visitFotoUrl
    ? getDriveThumbnailUrl(visitFotoUrl) || resolveAttachmentUrl(visitFotoUrl)
    : null;

  const docTitle =
    tahap === 'PENGANTARAN'
      ? 'BERITA ACARA SERAH TERIMA & PENGANTARAN SISWA PKL'
      : tahap === 'PENJEMPUTAN'
      ? 'BERITA ACARA PENJEMPUTAN & PENARIKAN SISWA PKL'
      : tahap === 'INSIDENTAL'
      ? 'BERITA ACARA KUNJUNGAN KHUSUS & PEMBINAAN PKL'
      : 'BERITA ACARA & LAPORAN HASIL SUPERVISI PKL';

  return (
    <PrintDocumentSheet
      orientation="portrait"
      footerText="Berita Acara &amp; Laporan Hasil Supervisi Resmi Praktik Kerja Lapangan (PKL)"
    >
      {/* 1. Kop Surat Resmi Dinas & Sekolah */}
      <PrintHeader
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        tenantInfo={tenantInfo}
        rawSekolah={rawSekolah}
      />

      {/* 2. Judul Dokumen Berita Acara */}
      <div className="text-center mt-3 mb-3">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-black border-b-2 border-black inline-block pb-0.5">
          {docTitle}
        </h3>
        <p className="text-[11px] font-semibold text-gray-700 mt-1">
          Tahun Ajaran: {tenantInfo?.tahun_ajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`} • Mitra IDUKA: {group.nama_mitra}
        </p>
      </div>

      {/* 3. Identitas Pelaksanaan Kunjungan Supervisi */}
      <div className="border border-black rounded-sm p-2.5 mb-3 text-[11px] font-sans text-black">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Mitra DU/DI</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase">{group.nama_mitra}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Waktu Kunjungan</span>
            <span className="mr-1">:</span>
            <span className="font-semibold">{visitDateFormatted || '........................'}</span>
          </div>

          <div className="flex">
            <span className="w-32 font-bold shrink-0">Alamat DU/DI</span>
            <span className="mr-1">:</span>
            <span className="truncate">{group.alamat_mitra || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Tahap / Siklus</span>
            <span className="mr-1">:</span>
            <span className="font-bold text-indigo-950">{cycleTitle}</span>
          </div>

          <div className="flex">
            <span className="w-32 font-bold shrink-0">Guru Pembimbing</span>
            <span className="mr-1">:</span>
            <span>{activePembimbingNama || 'Ditugaskan Sekolah'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Pembimbing DU/DI</span>
            <span className="mr-1">:</span>
            <span>{activeMitraNama}</span>
          </div>
        </div>
      </div>

      {/* 4. Tabel Daftar Siswa yang Disupervisi */}
      <div className="mb-3">
        <p className="text-[10.5px] font-bold text-black uppercase tracking-wider mb-1">
          I. DAFTAR SISWA YANG DISUPERVISI ({group.siswaList.length} SISWA)
        </p>
        <table className="w-full border-collapse text-[10.5px] font-sans border border-black text-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-center font-bold">
              <th className="py-1.5 px-1 border-r border-black w-7">NO</th>
              <th className="py-1.5 px-2 border-r border-black text-left">NAMA SISWA</th>
              <th className="py-1.5 px-2 border-r border-black w-24">NIS / KELAS</th>
              <th className="py-1.5 px-2 border-r border-black w-24 text-center">STATUS DI DU/DI</th>
              <th className="py-1.5 px-2 border-r border-black w-28 text-center">JURNAL PKL</th>
              <th className="py-1.5 px-2 border-black text-left">CATATAN KHUSUS / EVALUASI</th>
            </tr>
          </thead>
          <tbody>
            {group.siswaList.map((siswa, idx) => {
              return (
                <tr key={siswa.penempatan_id} className="border-b border-black align-middle">
                  <td className="py-1.5 px-1 border-r border-black text-center font-bold">{idx + 1}</td>
                  <td className="py-1.5 px-2 border-r border-black font-bold uppercase">{siswa.nama_siswa}</td>
                  <td className="py-1.5 px-2 border-r border-black text-center font-mono">
                    {siswa.nis} / {siswa.kelas}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center font-semibold text-emerald-900">
                    Aktif ({siswa.visitsCount}x Supervisi)
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-center">
                    {visitJurnalVerified ? (
                      <span className="font-bold text-black">[ ✓ ] Terverifikasi</span>
                    ) : (
                      <span className="text-gray-500">[   ] Diperiksa</span>
                    )}
                  </td>
                  <td className="py-1.5 px-2 border-black text-[10px]">
                    {siswa.lastVisitNote ? (
                      <span className="line-clamp-2">{siswa.lastVisitNote}</span>
                    ) : (
                      <span className="text-gray-400 italic">Kondisi bimbingan baik</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Uraian Hasil Supervisi Guru & Pembimbing DU/DI */}
      <div className="mb-3 space-y-2 text-[10.5px] font-sans text-black">
        <p className="font-bold uppercase tracking-wider mb-0.5">
          II. URAIAN HASIL SUPERVISI &amp; EVALUASI LAPANGAN
        </p>

        {/* Catatan Guru */}
        <div className="border border-black rounded-sm p-2">
          <p className="font-bold text-[10px] text-gray-700 uppercase mb-1">
            A. Hasil Pembinaan &amp; Temuan Guru Pembimbing:
          </p>
          {visitCatatan ? (
            <p className="leading-relaxed whitespace-pre-wrap">{visitCatatan}</p>
          ) : (
            <div className="py-2 space-y-2">
              <div className="border-b border-dotted border-gray-400 h-2" />
              <div className="border-b border-dotted border-gray-400 h-2" />
            </div>
          )}
        </div>

        {/* Catatan DU/DI */}
        <div className="border border-black rounded-sm p-2">
          <p className="font-bold text-[10px] text-gray-700 uppercase mb-1">
            B. Umpan Balik / Catatan Pembimbing Industri DU/DI:
          </p>
          {visitCatatanDudi ? (
            <p className="leading-relaxed whitespace-pre-wrap">{visitCatatanDudi}</p>
          ) : (
            <div className="py-2 space-y-2">
              <div className="border-b border-dotted border-gray-400 h-2" />
              <div className="border-b border-dotted border-gray-400 h-2" />
            </div>
          )}
        </div>
      </div>

      {/* 6. Foto Dokumentasi Bersama (Jika Ada) */}
      {displayThumb && (
        <div className="border border-black rounded-sm p-2 mb-3 flex items-center gap-3 text-black">
          <div className="w-24 h-20 rounded border border-black overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center">
            <img
              src={displayThumb}
              alt="Dokumentasi Kunjungan Kolektif"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-[10px] space-y-1">
            <p className="font-bold uppercase flex items-center gap-1">
              <Camera size={11} /> Foto Dokumentasi Lapangan Bersama
            </p>
            <p className="text-gray-700 leading-tight">
              Foto otentik guru pembimbing bersama kelompok siswa bimbingan dan mentor DU/DI di lokasi industri.
            </p>
            {visitLat && visitLng && (
              <p className="font-mono text-[9.5px] text-gray-600 flex items-center gap-1">
                <MapPin size={10} /> Koordinat Geotag GPS: {Number(visitLat).toFixed(4)}, {Number(visitLng).toFixed(4)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 7. Pengesahan 3 Pihak (2-Tier Tanda Tangan Resmi SPJ) */}
      <div className="mt-4 text-black text-xs font-sans">
        <div className="flex justify-between items-start text-center">
          <div className="w-56">
            <p className="font-medium text-gray-700 mb-0.5">Mengetahui,</p>
            <p className="font-bold uppercase text-[11px]">{activeMitraNama}</p>
            <div className="h-16" />
            <p className="font-bold underline text-[11px]">( .................................................... )</p>
            <p className="text-[10px] text-gray-600">Pembimbing Industri / DU/DI</p>
          </div>

          <div className="w-64">
            <p className="text-gray-700 mb-0.5">
              {activeKota}, {activeTanggal}
            </p>
            <p className="font-bold uppercase text-[11px]">Guru Pembimbing PKL</p>
            <div className="h-16" />
            <p className="font-bold underline text-[11px]">
              {activePembimbingNama || '( .................................................... )'}
            </p>
            <p className="text-[10px] text-gray-600">Guru Pembimbing Lapangan</p>
          </div>
        </div>

        {/* Baris 2: Waka Hubin / Kepala Sekolah */}
        <div className="text-center mt-5 w-full flex justify-center">
          <div className="w-72">
            <p className="font-medium text-gray-700 mb-0.5">Mengesahkan,</p>
            <p className="font-bold uppercase text-[11px]">Waka. Bidang Hubungan Industri</p>
            <div className="h-14" />
            <p className="font-bold underline text-[11px]">
              {activeHubinNama || '( .................................................... )'}
            </p>
            <p className="text-[10px] text-gray-600">
              NIP. {activeHubinNip || '....................................................'}
            </p>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
});

export default KunjunganMitraPrintSheet;
