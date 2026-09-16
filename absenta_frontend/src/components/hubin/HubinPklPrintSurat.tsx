import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format, addMonths } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { PrintHeader } from '../ui/PrintHeader';
import { PrintSignature } from '../ui/PrintSignature';
import type { MonitoringPrintConfig } from './HubinPklPrintMonitoringModal';

export interface SiswaData {
  id: string;
  nama_siswa: string;
  nis: string;
  no_hp?: string;
  Kelas?: {
    id: string;
    nama_kelas: string;
  };
}

export interface MitraData {
  id: string;
  nama: string;
  alamat?: string;
  kontak?: string;
}

export interface PembimbingData {
  id: string;
  nama_guru: string;
  full_name?: string;
  user_id?: string;
}

export interface SiswaPkl {
  id: string;
  siswa_id: string;
  mitra_id: string;
  pembimbing_id: string;
  status: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  Siswa?: SiswaData;
  Mitra?: MitraData;
  Pembimbing?: PembimbingData;
  kunjungan_json?: any;
  nilai_json?: any;
  jurnal_json?: any;
}

interface TenantData {
  data?: {
    name?: string;
    kota?: string;
    kepala_sekolah?: string;
    nip_kepala?: string;
  };
}

interface HubinPklPrintSuratProps {
  printData: SiswaPkl | null;
  printKolektifMitraId: string | null;
  tenantData: TenantData | null;
  collectiveStudents: SiswaPkl[];
  representativeRow: SiswaPkl | null;
  printMode?: 'surat_tugas' | 'lembar_monitoring';
  monitoringConfig?: MonitoringPrintConfig;
}

export const HubinPklPrintSurat: React.FC<HubinPklPrintSuratProps> = React.memo(({
  printData,
  printKolektifMitraId,
  tenantData,
  collectiveStudents,
  representativeRow,
  printMode = 'surat_tugas',
  monitoringConfig
}) => {
  // Safely parse kunjungan list
  const kunjunganList: any[] = useMemo(() => {
    if (!printData?.kunjungan_json) return [];
    try {
      return Array.isArray(printData.kunjungan_json)
        ? printData.kunjungan_json
        : JSON.parse(printData.kunjungan_json || '[]');
    } catch {
      return [];
    }
  }, [printData?.kunjungan_json]);

  // Dynamic monitoring rows calculation based on selected pattern (single 1x, monthly, standard 3, or custom)
  const monitoringRows = useMemo(() => {
    if (!printData) return [];
    const pattern = monitoringConfig?.pattern || 'standard_3';
    const includeEmpty = monitoringConfig?.includeEmptyRows ?? true;
    const customTarget = monitoringConfig?.customCount || 3;

    // Calculate duration in months
    let durationMonths = 3;
    if (printData.tanggal_mulai) {
      const start = new Date(printData.tanggal_mulai);
      if (!isNaN(start.getTime())) {
        const end = printData.tanggal_selesai ? new Date(printData.tanggal_selesai) : null;
        if (end && !isNaN(end.getTime())) {
          const diffYear = end.getFullYear() - start.getFullYear();
          const diffMonth = end.getMonth() - start.getMonth();
          const months = diffYear * 12 + diffMonth + (end.getDate() >= start.getDate() ? 1 : 0);
          durationMonths = Math.max(1, Math.min(12, months));
        }
      }
    }

    let targetCount = 3;
    if (pattern === 'single') targetCount = 1;
    else if (pattern === 'monthly') targetCount = durationMonths;
    else if (pattern === 'recorded_only') targetCount = Math.max(1, kunjunganList.length);
    else if (pattern === 'custom') targetCount = customTarget;
    else targetCount = 3;

    const rowCount = pattern === 'recorded_only'
      ? Math.max(1, kunjunganList.length)
      : (includeEmpty ? Math.max(targetCount, kunjunganList.length) : Math.max(1, kunjunganList.length));

    const standardLabels = [
      'Kunjungan 1 (Orientasi & Pengantaran)',
      'Kunjungan 2 (Monitoring Progres Lapangan)',
      'Kunjungan 3 (Evaluasi Akhir & Penarikan)'
    ];

    const startDate = printData.tanggal_mulai ? new Date(printData.tanggal_mulai) : new Date();

    return Array.from({ length: rowCount }).map((_, idx) => {
      const k = kunjunganList[idx];
      let label = `Kunjungan Ke-${idx + 1}`;

      if (pattern === 'single') {
        label = idx === 0 ? 'Kunjungan Monitoring & Evaluasi' : `Kunjungan Ke-${idx + 1}`;
      } else if (pattern === 'monthly') {
        const mDate = addMonths(startDate, idx);
        const mName = !isNaN(mDate.getTime()) ? format(mDate, 'MMMM yyyy', { locale: localeID }) : '';
        label = `Kunjungan Bulan Ke-${idx + 1}${mName ? ` (${mName})` : ''}`;
      } else if (pattern === 'standard_3') {
        label = standardLabels[idx] || `Kunjungan Ke-${idx + 1}`;
      }

      return {
        index: idx + 1,
        label,
        kunjungan: k
      };
    });
  }, [printData, monitoringConfig, kunjunganList]);

  if (typeof document === 'undefined') return null;

  return (
    <>
      {/* Printable Document (Hidden on screen, visible only on print) */}
      {printData && createPortal(
        <div id="print-surat-tugas" className="hidden print:block p-10 bg-white text-black font-serif text-[13px] leading-relaxed w-[210mm] min-h-[297mm]">
          {/* Kop Surat Resmi Terpusat */}
          <PrintHeader variant="portrait" tenantInfo={tenantData?.data} />

          {printMode === 'lembar_monitoring' ? (
            /* ===== LEMBAR KONTROL & MONITORING KUNJUNGAN PKL ===== */
            <>
              {/* Judul Surat */}
              <div className="text-center mb-5 mt-4">
                <h3 className="text-[15px] font-bold underline uppercase tracking-wide">
                  LEMBAR MONITORING & KONTROL KUNJUNGAN PKL
                </h3>
                <p className="text-xs mt-1 font-semibold text-gray-700">
                  PROGRAM PRAKTIK KERJA LAPANGAN (PKL) TAHUN {new Date().getFullYear()}
                </p>
                <p className="text-[11px] text-gray-500 font-mono">
                  No. Kontrol: LMK/HUBIN/{new Date().getFullYear()}/{String(printData.id).slice(0, 5).toUpperCase()}
                </p>
              </div>

              {/* Detail Siswa & Perusahaan (Grid 2 Kolom Ringkas) */}
              <div className="border border-black p-3 mb-5 text-xs">
                <table className="w-full border-collapse text-left">
                  <tbody>
                    <tr className="align-top">
                      <td className="w-32 py-1 font-bold">Nama Siswa</td>
                      <td className="w-3 py-1">:</td>
                      <td className="py-1 font-bold uppercase w-[35%]">{printData.Siswa?.nama_siswa}</td>
                      <td className="w-36 py-1 font-bold">Mitra Industri (DUDI)</td>
                      <td className="w-3 py-1">:</td>
                      <td className="py-1 font-bold uppercase">{printData.Mitra?.nama}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-bold">NIS / Kelas</td>
                      <td className="py-1">:</td>
                      <td className="py-1 font-mono">{printData.Siswa?.nis} / {printData.Siswa?.Kelas?.nama_kelas || 'XII'}</td>
                      <td className="py-1 font-bold">Alamat Mitra</td>
                      <td className="py-1">:</td>
                      <td className="py-1 text-gray-800">{printData.Mitra?.alamat || '-'}</td>
                    </tr>
                    <tr className="align-top">
                      <td className="py-1 font-bold">Guru Pembimbing</td>
                      <td className="py-1">:</td>
                      <td className="py-1 uppercase font-medium">{printData.Pembimbing?.nama_guru || 'Ditunjuk Sekolah'}</td>
                      <td className="py-1 font-bold">Periode PKL</td>
                      <td className="py-1">:</td>
                      <td className="py-1 font-semibold">
                        {format(new Date(printData.tanggal_mulai), 'd MMM yyyy', { locale: localeID })} s/d {printData.tanggal_selesai ? format(new Date(printData.tanggal_selesai), 'd MMM yyyy', { locale: localeID }) : 'Selesai'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabel Siklus Monitoring (Standar 3 Siklus Kunjungan) */}
              <p className="mb-2 font-bold text-xs uppercase tracking-tight">Catatan & Riwayat Monitoring Berkala:</p>
              <table className="w-full mb-6 border-collapse text-xs border border-black">
                <thead>
                  <tr className="font-bold border-b border-black text-center bg-gray-100">
                    <th className="py-2 px-2 border-r border-black w-10 text-center">NO</th>
                    <th className="py-2 px-2 border-r border-black w-36 text-center">SIKLUS & TANGGAL</th>
                    <th className="py-2 px-3 border-r border-black text-left">AGENDA & CATATAN GURU PEMBIMBING</th>
                    <th className="py-2 px-3 border-r border-black w-44 text-left">CATATAN / MASUKAN DU/DI</th>
                    <th className="py-2 px-2 text-center w-28">PARAF & CAP DU/DI</th>
                  </tr>
                </thead>
                <tbody>
                  {monitoringRows.map((row) => {
                    const k = row.kunjungan;
                    return (
                      <tr key={row.index} className="border-b border-black align-top">
                        <td className="py-3 px-2 border-r border-black text-center font-bold">{row.index}</td>
                        <td className="py-3 px-2 border-r border-black">
                          <p className="font-bold text-[11px] text-gray-900">{row.label}</p>
                          {k?.tanggal ? (
                            <p className="font-semibold text-xs mt-1 text-indigo-900">
                              {format(new Date(k.tanggal), 'dd MMMM yyyy', { locale: localeID })}
                              <br />
                              <span className="text-[10px] text-gray-500 font-normal">
                                {format(new Date(k.tanggal), 'HH:mm', { locale: localeID })} WIB
                              </span>
                            </p>
                          ) : (
                            <p className="text-[10px] text-gray-400 mt-2 italic font-mono">Tgl: ..... / ..... / 20...</p>
                          )}
                        </td>
                        <td className="py-3 px-3 border-r border-black">
                          {k?.catatan ? (
                            <div>
                              <p className="text-justify font-sans text-[11.5px] leading-relaxed whitespace-pre-wrap">{k.catatan}</p>
                              {(k.latitude || k.longitude || k.foto_url) && (
                                <div className="mt-2 pt-1 border-t border-dashed border-gray-300 text-[10px] text-gray-600 font-sans flex flex-wrap gap-x-3">
                                  {k.latitude && k.longitude && (
                                    <span>📍 GPS: {Number(k.latitude).toFixed(5)}, {Number(k.longitude).toFixed(5)}</span>
                                  )}
                                  {k.foto_url && (
                                    <span className="text-emerald-700 font-semibold">📷 Dokumentasi Foto Terverifikasi</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-4 space-y-3">
                              <div className="border-b border-dotted border-gray-400 h-2" />
                              <div className="border-b border-dotted border-gray-400 h-2" />
                              <div className="border-b border-dotted border-gray-400 h-2" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 border-r border-black">
                          {k?.catatan_dudi ? (
                            <p className="text-justify font-sans text-[11.5px] leading-relaxed whitespace-pre-wrap">{k.catatan_dudi}</p>
                          ) : (
                            <div className="py-4 space-y-3">
                              <div className="border-b border-dotted border-gray-400 h-2" />
                              <div className="border-b border-dotted border-gray-400 h-2" />
                              <div className="border-b border-dotted border-gray-400 h-2" />
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-center align-middle">
                          <div className="h-16 flex items-center justify-center text-[10px] text-gray-400 italic">
                            (Paraf & Cap)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Catatan Tambahan */}
              <p className="text-[11px] text-gray-600 mb-8 italic">
                * Lembar ini wajib diisi dan diparaf oleh Pembimbing DU/DI serta Guru Pembimbing setiap kali kunjungan monitoring berlangsung sebagai bukti otentik kegiatan bimbingan PKL.
              </p>

              {/* Tanda Tangan Pembimbing Industri & Guru Pembimbing */}
              <div className="flex justify-between mt-8 text-center">
                <div className="w-[240px]">
                  <p className="text-xs font-semibold mb-1">Mengetahui,</p>
                  <p className="text-xs font-bold uppercase">{printData.Mitra?.nama || 'Pembimbing DU/DI'}</p>
                  <div className="h-16" />
                  <p className="text-xs font-bold underline">( .................................................... )</p>
                  <p className="text-[11px] text-gray-600">Pembimbing Industri / DU/DI</p>
                </div>

                <div className="w-[280px]">
                  <p className="text-xs text-gray-700 mb-1">
                    {tenantData?.data?.kota ? `${tenantData.data.kota}, ` : ''}{format(new Date(), 'd MMMM yyyy', { locale: localeID })}
                  </p>
                  <p className="text-xs font-bold uppercase">Guru Pembimbing PKL</p>
                  <div className="h-16" />
                  <p className="text-xs font-bold underline">
                    {printData.Pembimbing?.nama_guru || '( .................................................... )'}
                  </p>
                  <p className="text-[11px] text-gray-600">
                    {printData.Pembimbing?.nama_guru ? 'Guru Pembimbing Sekolah' : 'NIP. ....................................................'}
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* ===== SURAT TUGAS PKL STANDAR ===== */
            <>
              {/* Judul Surat */}
              <div className="text-center mb-6 mt-4">
                <h3 className="text-[16px] font-bold underline uppercase tracking-wide">SURAT TUGAS PRAKTEK KERJA LAPANGAN (PKL)</h3>
                <p className="text-xs mt-1 font-semibold">Nomor: ST/HUBIN/{new Date().getFullYear()}/{String(printData.id).slice(0, 5).toUpperCase()}</p>
              </div>

              <p className="mb-4 text-justify">
                Yang bertanda tangan di bawah ini, Kepala Hubungan Industri (HUBIN) atas nama Kepala Sekolah {tenantData?.data?.name || 'SMK Unggul Absenta'} memberikan tugas resmi kepada siswa yang tercantum di bawah ini untuk melaksanakan program Praktek Kerja Lapangan (PKL) pada Industri/Dunia Usaha dan Dunia Kerja (IDUKA) Mitra:
              </p>

              {/* Detail Siswa */}
              <table className="w-full mb-6 mt-4 border-collapse text-left text-xs">
                <tbody>
                  <tr className="align-top">
                    <td className="w-48 py-1.5 font-bold">Nama Siswa</td>
                    <td className="w-4 py-1.5">:</td>
                    <td className="py-1.5 uppercase font-bold">{printData.Siswa?.nama_siswa}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1.5 font-bold">NIS / Kelas</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-mono">{printData.Siswa?.nis} / {printData.Siswa?.Kelas?.nama_kelas || 'XII'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1.5 font-bold">Perusahaan Mitra (IDUKA)</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-bold uppercase">{printData.Mitra?.nama}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1.5 font-bold">Alamat Penempatan</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 text-gray-800">{printData.Mitra?.alamat || '-'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1.5 font-bold">Guru Pembimbing</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-medium uppercase">{printData.Pembimbing?.nama_guru || 'Ditunjuk Sekolah'}</td>
                  </tr>
                  <tr className="align-top">
                    <td className="py-1.5 font-bold">Masa Penempatan PKL</td>
                    <td className="py-1.5">:</td>
                    <td className="py-1.5 font-bold">
                      {format(new Date(printData.tanggal_mulai), 'd MMMM yyyy', { locale: localeID })} s/d {printData.tanggal_selesai ? format(new Date(printData.tanggal_selesai), 'd MMMM yyyy', { locale: localeID }) : 'Selesai'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <p className="mb-10 text-justify">
                Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab, dedikasi, serta mematuhi seluruh tata tertib dan protokol kerja yang berlaku di Industri Mitra. Atas kerja sama dan dukungannya kami ucapkan terima kasih.
              </p>

              {/* Tanda Tangan */}
              <div className="flex justify-between mt-16 text-center">
                <PrintSignature 
                  role="mitra"
                  widthClass="w-[240px]"
                />
                <PrintSignature 
                  role="principal"
                  kota={tenantData?.data?.kota || undefined}
                  date={new Date()}
                  name={tenantData?.data?.kepala_sekolah || undefined}
                  nip={tenantData?.data?.nip_kepala || undefined}
                  showDate={true}
                  widthClass="w-[280px]"
                />
              </div>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Printable Surat Tugas Kolektif (Hidden on screen, visible only on print) */}
      {printKolektifMitraId && representativeRow && createPortal(
        <div id="print-surat-tugas" className="hidden print:block p-10 bg-white text-black font-serif text-[13px] leading-relaxed w-[210mm] min-h-[297mm]">
          {/* Kop Surat Resmi Terpusat */}
          <PrintHeader variant="portrait" tenantInfo={tenantData?.data} />

          {/* Judul Surat */}
          <div className="text-center mb-6 mt-4">
            <h3 className="text-[16px] font-bold underline uppercase tracking-wide">SURAT TUGAS KOLEKTIF PRAKTEK KERJA LAPANGAN (PKL)</h3>
            <p className="text-xs mt-1 font-semibold">Nomor: ST/HUBIN/{new Date().getFullYear()}/KOL/{String(representativeRow.id).slice(0, 5).toUpperCase()}</p>
          </div>

          <p className="mb-4 text-justify">
            Yang bertanda tangan di bawah ini, Kepala Hubungan Industri (HUBIN) atas nama Kepala Sekolah {tenantData?.data?.name || 'SMK Unggul Absenta'} memberikan tugas resmi kepada **para siswa** yang tercantum di bawah ini untuk melaksanakan program Praktek Kerja Lapangan (PKL) secara kelompok pada mitra industri terkait:
          </p>

          {/* Detail Lokasi PKL */}
          <table className="w-full mb-6 mt-4 border-collapse text-left text-xs">
            <tbody>
              <tr className="align-top">
                <td className="w-48 py-1.5 font-bold">Perusahaan Mitra (IDUKA)</td>
                <td className="w-4 py-1.5">:</td>
                <td className="py-1.5 font-bold uppercase">{representativeRow.Mitra?.nama}</td>
              </tr>
              <tr className="align-top">
                <td className="py-1.5 font-bold">Alamat Penempatan</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 text-gray-800">{representativeRow.Mitra?.alamat || '-'}</td>
              </tr>
              <tr className="align-top">
                <td className="py-1.5 font-bold">Guru Pembimbing</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 font-medium uppercase">{representativeRow.Pembimbing?.nama_guru || 'Ditunjuk Sekolah'}</td>
              </tr>
              <tr className="align-top">
                <td className="py-1.5 font-bold">Masa Penempatan PKL</td>
                <td className="py-1.5">:</td>
                <td className="py-1.5 font-bold">
                  {format(new Date(representativeRow.tanggal_mulai), 'd MMMM yyyy', { locale: localeID })} s/d {representativeRow.tanggal_selesai ? format(new Date(representativeRow.tanggal_selesai), 'd MMMM yyyy', { locale: localeID }) : 'Selesai'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Daftar Siswa Kolektif */}
          <p className="mb-3 font-bold text-xs uppercase">Daftar Siswa Penerima Tugas:</p>
          <table className="w-full mb-8 border-collapse text-xs border border-black">
            <thead>
              <tr className="font-bold border-b border-black text-center bg-gray-50">
                <th className="py-2 px-3 border-r border-black w-12 text-center">NO</th>
                <th className="py-2 px-3 border-r border-black text-left">NAMA LENGKAP SISWA</th>
                <th className="py-2 px-3 border-r border-black w-36 text-center">NIS</th>
                <th className="py-2 px-3 text-center w-32">KELAS</th>
              </tr>
            </thead>
            <tbody>
              {collectiveStudents?.map((item: SiswaPkl, index: number) => (
                <tr key={item.id} className="border-b border-black">
                  <td className="py-2 px-3 border-r border-black text-center">{index + 1}</td>
                  <td className="py-2 px-3 border-r border-black uppercase font-bold">{item.Siswa?.nama_siswa}</td>
                  <td className="py-2 px-3 border-r border-black text-center font-mono">{item.Siswa?.nis}</td>
                  <td className="py-2 px-3 text-center uppercase font-medium">{item.Siswa?.Kelas?.nama_kelas || 'XII'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mb-10 text-justify">
            Demikian surat tugas kolektif ini dibuat untuk dilaksanakan dengan penuh tanggung jawab, dedikasi tinggi, serta mematuhi seluruh tata tertib dan protokol kerja yang berlaku di Dunia Kerja Mitra terkait.
          </p>

          {/* Tanda Tangan */}
          <div className="flex justify-between mt-16 text-center">
            <PrintSignature 
              role="mitra"
              widthClass="w-[240px]"
            />
            <PrintSignature 
              role="principal"
              kota={tenantData?.data?.kota || undefined}
              date={new Date()}
              name={tenantData?.data?.kepala_sekolah || undefined}
              nip={tenantData?.data?.nip_kepala || undefined}
              showDate={true}
              widthClass="w-[280px]"
            />
          </div>
        </div>,
        document.body
      )}

      {/* Global Print-Only Override Style Hack (Standar A4) */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          #root {
            display: none !important;
          }
          body > :not(#print-surat-tugas) {
            display: none !important;
          }
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #print-surat-tugas {
            display: block !important;
            position: absolute !important;
            left: 50% !important;
            top: 0 !important;
            transform: translateX(-50%) !important;
            width: 210mm !important;
            max-width: 210mm !important;
            box-sizing: border-box !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </>
  );
});
