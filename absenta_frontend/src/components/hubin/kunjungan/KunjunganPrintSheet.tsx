import React from 'react';
import { PrintDocumentSheet, PrintHeader } from '@/components/ui/PrintHeader';
import { MapPin, Camera, CheckCircle2 } from 'lucide-react';
import type { SiswaPkl } from '@/api/hubin.api';

export interface MonitoringRow {
  index: number;
  label: string;
  kunjungan: any | null;
}

export interface KunjunganPrintSheetProps {
  showLogoDaerah: boolean;
  showLogoSekolah: boolean;
  tenantInfo: any;
  rawSekolah: any;
  selectedPkl: SiswaPkl;
  monitoringRows: MonitoringRow[];
  hubinSettings?: any;
  tglMulai: string;
  tglSelesai: string;
  activeMitraNama: string;
  activePembimbingNama: string;
  activeHubinNama: string;
  activeHubinNip: string;
  activeKepsekNama: string;
  activeKepsekNip: string;
  activeKota: string;
  activeTanggal: string;
}

export const KunjunganPrintSheet: React.FC<KunjunganPrintSheetProps> = React.memo(({
  showLogoDaerah,
  showLogoSekolah,
  tenantInfo,
  rawSekolah,
  selectedPkl,
  monitoringRows,
  hubinSettings,
  tglMulai,
  tglSelesai,
  activeMitraNama,
  activePembimbingNama,
  activeHubinNama,
  activeHubinNip,
  activeKepsekNama,
  activeKepsekNip,
  activeKota,
  activeTanggal,
}) => {
  const requirePhoto = hubinSettings?.visitRequirePhoto !== false;
  const requireJournal = hubinSettings?.visitRequireJournal !== false;

  return (
    <PrintDocumentSheet orientation="portrait" footerText="Lembar Monitoring Resmi Praktik Kerja Lapangan (PKL)">
      {/* 1. Kop Surat Resmi Dinas & Sekolah */}
      <PrintHeader
        showLogoDaerah={showLogoDaerah}
        showLogoSekolah={showLogoSekolah}
        tenantInfo={tenantInfo}
        rawSekolah={rawSekolah}
      />

      {/* 2. Judul Dokumen Resmi */}
      <div className="text-center mt-3 mb-3">
        <h3 className="text-base font-black uppercase tracking-wider text-black border-b-2 border-black inline-block pb-0.5">
          LEMBAR SUPERVISI &amp; MONITORING PRAKTIK KERJA LAPANGAN
        </h3>
        <p className="text-[11px] font-semibold text-gray-700 mt-1">
          Tahun Ajaran: {tenantInfo?.tahun_ajaran || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}
        </p>
      </div>

      {/* 3. Ringkasan Instrumen Kebijakan Hubin */}
      {hubinSettings && (
        <div className="flex items-center justify-between text-[10px] bg-slate-50 border border-black/40 px-2.5 py-1 mb-3 font-mono text-black">
          <span>
            <strong>Aturan Siklus:</strong>{' '}
            {hubinSettings.visitCycleMode === 'FOUR_CYCLE'
              ? '4 Siklus Intensif Vokasi'
              : hubinSettings.visitCycleMode === 'CUSTOM'
              ? `Kustom (${hubinSettings.visitCycleTarget || 3} Kunjungan)`
              : '3 Siklus Standar Kemendikbud'}
          </span>
          <div className="flex items-center gap-3">
            <span>Instrumen:</span>
            <span className={requirePhoto ? 'font-bold' : 'text-gray-400'}>
              {requirePhoto ? '✓ Foto GPS' : '— Foto'}
            </span>
            <span className={hubinSettings.visitRequireSignature !== false ? 'font-bold' : 'text-gray-400'}>
              {hubinSettings.visitRequireSignature !== false ? '✓ TTD DU/DI' : '— TTD'}
            </span>
            <span className={requireJournal ? 'font-bold' : 'text-gray-400'}>
              {requireJournal ? '✓ Jurnal PKL' : '— Jurnal'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Biodata Siswa & Perusahaan Mitra */}
      <div className="border border-black rounded-sm p-3 mb-3 text-xs font-sans text-black">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Nama Siswa</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase">{selectedPkl.Siswa?.nama_siswa || '-'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Mitra IDUKA / DU/DI</span>
            <span className="mr-1">:</span>
            <span className="font-bold uppercase">{selectedPkl.Mitra?.nama || '-'}</span>
          </div>

          <div className="flex">
            <span className="w-32 font-bold shrink-0">NIS / Kelas</span>
            <span className="mr-1">:</span>
            <span className="font-mono">
              {selectedPkl.Siswa?.nis || '-'} / {selectedPkl.Siswa?.Kelas?.nama_kelas || 'XII'}
            </span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Alamat DU/DI</span>
            <span className="mr-1">:</span>
            <span className="truncate">{selectedPkl.Mitra?.alamat || '-'}</span>
          </div>

          <div className="flex">
            <span className="w-32 font-bold shrink-0">Guru Pembimbing</span>
            <span className="mr-1">:</span>
            <span>{selectedPkl.Pembimbing?.nama_guru || 'Ditunjuk Sekolah'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-bold shrink-0">Periode PKL</span>
            <span className="mr-1">:</span>
            <span>
              {tglMulai} s/d {tglSelesai}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Tabel Siklus Supervisi & Monitoring Berkala */}
      <table className="w-full mb-3 border-collapse text-[11px] font-sans border border-black text-black">
        <thead>
          <tr className="bg-slate-100 border-b border-black text-center font-bold">
            <th className="py-2 px-1.5 border-r border-black w-8">NO</th>
            <th className="py-2 px-2 border-r border-black w-36">SIKLUS &amp; TANGGAL</th>
            <th className="py-2 px-3 border-r border-black text-left">AGENDA &amp; CATATAN GURU PEMBIMBING</th>
            <th className="py-2 px-3 border-r border-black w-44 text-left">CATATAN / MASUKAN DU/DI</th>
            <th className="py-2 px-2 border-black w-24 text-center">PARAF &amp; CAP</th>
          </tr>
        </thead>
        <tbody>
          {monitoringRows.map((row) => {
            const k = row.kunjungan;
            const formattedTgl = k?.tanggal
              ? new Date(k.tanggal).toLocaleDateString('id-ID', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })
              : null;

            return (
              <tr key={row.index} className="border-b border-black align-top">
                <td className="py-2.5 px-1.5 border-r border-black text-center font-bold">{row.index}</td>
                <td className="py-2.5 px-2 border-r border-black">
                  <p className="font-bold text-[10.5px] leading-tight">{row.label}</p>
                  {formattedTgl ? (
                    <p className="font-semibold text-[11px] mt-1 text-indigo-950">
                      {formattedTgl}
                      <span className="block text-[9.5px] text-gray-500 font-normal">
                        Pukul {new Date(k.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-400 mt-2 italic font-mono">Tgl: .... / .... / 20...</p>
                  )}
                </td>
                <td className="py-2.5 px-3 border-r border-black">
                  {k?.catatan ? (
                    <div className="space-y-1.5">
                      <p className="leading-relaxed whitespace-pre-wrap">{k.catatan}</p>
                      <div className="pt-1 border-t border-dashed border-gray-300 text-[9.5px] text-gray-600 flex flex-wrap gap-x-2.5 gap-y-1">
                        {k.latitude && k.longitude && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={9} /> GPS: {Number(k.latitude).toFixed(4)}, {Number(k.longitude).toFixed(4)}
                          </span>
                        )}
                        {k.foto_url ? (
                          <span className="text-emerald-800 font-bold flex items-center gap-0.5">
                            <Camera size={9} /> Foto Geotag Terverifikasi
                          </span>
                        ) : requirePhoto ? (
                          <span className="text-amber-800 italic flex items-center gap-0.5">
                            <Camera size={9} /> *Dokumentasi Foto Belum Diunggah
                          </span>
                        ) : null}
                        {requireJournal && (
                          <span className="text-slate-700 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 size={9} className="text-emerald-700" /> Jurnal PKL Diperiksa
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="border-b border-dotted border-gray-400 h-2" />
                      <div className="border-b border-dotted border-gray-400 h-2" />
                      <div className="flex items-center justify-between text-[9px] text-gray-500 pt-1">
                        <span>Agenda: Supervisi &amp; Bimbingan Teknis</span>
                        {requireJournal && <span>[  ] Verifikasi Jurnal PKL</span>}
                      </div>
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-3 border-r border-black">
                  {k?.catatan_dudi ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{k.catatan_dudi}</p>
                  ) : (
                    <div className="py-4 space-y-2">
                      <div className="border-b border-dotted border-gray-400 h-2" />
                      <div className="border-b border-dotted border-gray-400 h-2" />
                      <div className="border-b border-dotted border-gray-400 h-2" />
                    </div>
                  )}
                </td>
                <td className="py-2.5 px-1.5 text-center align-middle">
                  <div className="h-14 flex items-center justify-center text-[9px] text-gray-400 italic">
                    (Paraf &amp; Cap DU/DI)
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 6. Catatan Kaki Otentik */}
      <p className="text-[10px] text-gray-600 mb-6 italic leading-relaxed">
        * Lembar ini wajib diisi dan diparaf oleh Pembimbing DU/DI serta Guru Pembimbing setiap kali kunjungan monitoring berlangsung sebagai bukti otentik kegiatan bimbingan PKL sesuai regulasi Kemendikbudristek &amp; Ditjen Vokasi.
      </p>

      {/* 7. Tanda Tangan 2-Tier Standar Industri */}
      <div className="mt-6 text-black text-xs font-sans">
        {/* Baris 1: Pembimbing Industri & Guru Pembimbing */}
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
            <p className="text-[10px] text-gray-600">Guru Pembimbing Sekolah</p>
          </div>
        </div>

        {/* Baris 2: Waka Hubungan Industri (Hubin) / Kepala Sekolah */}
        <div className="text-center mt-6 w-full flex justify-center">
          <div className="w-72">
            <p className="font-medium text-gray-700 mb-0.5">Mengesahkan,</p>
            <p className="font-bold uppercase text-[11px]">Waka. Bidang Hubungan Industri</p>
            <div className="h-14" />
            <p className="font-bold underline text-[11px]">
              {activeHubinNama || activeKepsekNama || '( .................................................... )'}
            </p>
            <p className="text-[10px] text-gray-600">
              NIP. {activeHubinNip || activeKepsekNip || '....................................................'}
            </p>
          </div>
        </div>
      </div>
    </PrintDocumentSheet>
  );
});

export default KunjunganPrintSheet;
