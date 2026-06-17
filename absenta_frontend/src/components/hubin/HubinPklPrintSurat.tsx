import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { PrintHeader } from '../ui/PrintHeader';
import { PrintSignature } from '../ui/PrintSignature';

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

interface HubinPklPrintSuratProps {
  printData: SiswaPkl | null;
  printKolektifMitraId: string | null;
  tenantData: any;
  collectiveStudents: SiswaPkl[];
  representativeRow: SiswaPkl | null;
}

export const HubinPklPrintSurat: React.FC<HubinPklPrintSuratProps> = ({
  printData,
  printKolektifMitraId,
  tenantData,
  collectiveStudents,
  representativeRow
}) => {
  if (typeof document === 'undefined') return null;

  return (
    <>
      {/* Printable Surat Tugas (Hidden on screen, visible only on print) */}
      {printData && createPortal(
        <div id="print-surat-tugas" className="hidden print:block p-10 bg-white text-black font-serif text-[13px] leading-relaxed w-[210mm] min-h-[297mm]">
          {/* Kop Surat Resmi Terpusat */}
          <PrintHeader variant="portrait" tenantInfo={tenantData?.data} />

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
};
