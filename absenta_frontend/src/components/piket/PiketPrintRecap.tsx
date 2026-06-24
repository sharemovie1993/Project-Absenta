import React from 'react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { PrintHeader } from '../ui/PrintHeader';
import { PrintSignature } from '../ui/PrintSignature';

interface PiketPrintRecapProps {
  isPrintingRekap: boolean;
  tenantInfo?: {
    kepala_sekolah?: string;
    nip_kepala?: string;
    name?: string;
    kota?: string;
    [key: string]: any;
  } | null;
  user?: {
    full_name?: string;
    name?: string;
    [key: string]: any;
  } | null;
  dailyPermits: IzinKeluarSiswa[];
  dateLabel?: string;
  signatureDate?: string;
}

export const PiketPrintRecap: React.FC<PiketPrintRecapProps> = React.memo(({
  isPrintingRekap,
  tenantInfo,
  user,
  dailyPermits,
  dateLabel,
  signatureDate
}) => {
  if (!isPrintingRekap) return null;

  return (
    <div className="hidden print:block print-rekap-sheet">
      {/* A4 SIZE LAYOUT (Laporan Resmi Khas Indonesia) */}
      <div className="w-full">
        {/* Kop Surat Resmi Terpusat (Portrait) */}
        <PrintHeader variant="portrait" tenantInfo={tenantInfo} />

        {/* Title */}
        <div className="text-center space-y-1 mb-8">
          <h2 className="text-sm font-black underline tracking-wide uppercase leading-none">LAPORAN REKAPITULASI IZIN KELUAR SISWA</h2>
          <p className="text-[10px] font-bold text-gray-500">
            Hari/Tanggal: {dateLabel || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Duty Officer Info Block */}
        <div className="grid grid-cols-2 gap-4 text-[10px] mb-6 pb-2 border-b border-gray-200">
          <div>
            <span className="font-bold text-gray-400 uppercase tracking-widest block">Petugas Piket</span>
            <span className="font-black text-xs text-gray-900 uppercase block mt-0.5">{user?.full_name || user?.name || 'GURU PIKET'}</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-gray-400 uppercase tracking-widest block">Status Rekap</span>
            <span className="font-black text-xs text-emerald-600 uppercase block mt-0.5">SELESAI TUGAS / PULANG SEKOLAH</span>
          </div>
        </div>

        {/* Permit Table */}
        <table className="w-full text-left border-collapse text-[10px] border border-gray-400 mb-12">
          <thead>
            <tr className="bg-gray-100 text-gray-800 font-bold uppercase tracking-wider border-b border-gray-400">
              <th className="py-2 px-3 border border-gray-400 text-center w-8">No</th>
              <th className="py-2 px-3 border border-gray-400">Nama Siswa</th>
              <th className="py-2 px-3 border border-gray-400 text-center w-20">NIS</th>
              <th className="py-2 px-3 border border-gray-400 text-center w-24">Kelas</th>
              <th className="py-2 px-3 border border-gray-400">Tipe Izin</th>
              <th className="py-2 px-3 border border-gray-400">Keperluan / Alasan</th>
              <th className="py-2 px-3 border border-gray-400 text-center w-16">Keluar</th>
              <th className="py-2 px-3 border border-gray-400 text-center w-16">Kembali</th>
              <th className="py-2 px-3 border border-gray-400 text-center w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {dailyPermits?.map((p, idx) => (
              <tr key={p.id} className="border-b border-gray-400">
                <td className="py-2 px-3 border border-gray-400 text-center font-bold">{idx + 1}</td>
                <td className="py-2 px-3 border border-gray-400 font-bold uppercase">{p.SiswaAkademik?.siswa.nama_siswa}</td>
                <td className="py-2 px-3 border border-gray-400 text-center font-mono">{p.SiswaAkademik?.siswa.nis}</td>
                <td className="py-2 px-3 border border-gray-400 text-center font-bold uppercase">{p.SiswaAkademik?.kelas?.nama_kelas || '-'}</td>
                <td className="py-2 px-3 border border-gray-400 uppercase font-medium">{p.tipe_izin === 'PULANG_AWAL' ? 'PULANG CEPAT' : 'IZIN SEMENTARA'}</td>
                <td className="py-2 px-3 border border-gray-400">"{p.alasan}"</td>
                <td className="py-2 px-3 border border-gray-400 text-center">
                  {new Date(p.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-2 px-3 border border-gray-400 text-center">
                  {p.jam_kembali 
                    ? new Date(p.jam_kembali).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) 
                    : '-'}
                </td>
                <td className="py-2 px-3 border border-gray-400 text-center font-bold uppercase">
                  {p.status === 'KEMBALI' ? 'KEMBALI' : 'DI LUAR'}
                </td>
              </tr>
            ))}
            {(dailyPermits?.length || 0) === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-gray-400 font-bold uppercase italic">
                  Tidak ada data izin yang diterbitkan hari ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signature Area (Tanda Tangan Khas Laporan Kesiswaan) */}
        <div className="flex justify-between text-center mt-16 px-4">
          <PrintSignature 
            role="principal"
            name={tenantInfo?.kepala_sekolah}
            nip={tenantInfo?.nip_kepala}
            customLabel={
              <div className="flex flex-col items-center">
                <p>Mengetahui,</p>
                <p className="text-[12px] font-bold">Kepala {tenantInfo?.name || 'Sekolah'},</p>
              </div>
            }
            widthClass="w-[240px]"
          />
          <PrintSignature 
            role="custom"
            kota={tenantInfo?.kota || 'Jakarta'}
            date={signatureDate ? new Date(signatureDate) : new Date()}
            showDate={true}
            customLabel="Guru Piket Kesiswaan,"
            name={user?.full_name || user?.name || '........................................'}
            customSubLabel="NIP/NUPTK. ...................................."
            widthClass="w-[240px]"
          />
        </div>
      </div>
    </div>
  );
});
