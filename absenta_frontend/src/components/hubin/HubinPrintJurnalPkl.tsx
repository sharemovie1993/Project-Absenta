import React from 'react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { PrintHeader } from '../ui/PrintHeader';

interface HubinPrintJurnalPklProps {
  user: any;
  studentPkl: any;
  rawAbsensiHistory: any[];
  tenantInfo?: any;
  renderActivityTextForPrint: (abs: any) => React.ReactNode;
  renderActivityImagesForPrint: (kegiatanStr: string | undefined, checkInImageUrl?: string, checkOutImageUrl?: string) => React.ReactNode;
}

export const HubinPrintJurnalPkl: React.FC<HubinPrintJurnalPklProps> = ({
  user,
  studentPkl,
  rawAbsensiHistory,
  tenantInfo,
  renderActivityTextForPrint,
  renderActivityImagesForPrint,
}) => {
  return (
    <div id="print-jurnal-area" className="hidden print:block p-8 bg-white text-black font-serif w-full">
      {/* Kop Surat Resmi Terpusat (Portrait) */}
      <PrintHeader variant="portrait" tenantInfo={tenantInfo} />

      {/* Title */}
      <div className="text-center space-y-1 mb-8 mt-4">
        <h3 className="text-sm font-bold uppercase tracking-widest decoration-1 underline">
          JURNAL KEGIATAN PRAKTIK KERJA LAPANGAN (PKL)
        </h3>
        <p className="text-[10px] italic text-slate-600 font-sans">
          Kurikulum Merdeka (Tahun Ajaran {new Date().getFullYear()})
        </p>
      </div>

      {/* Student Identity */}
      <table className="w-full text-[10px] font-sans mb-6 border-collapse">
        <tbody>
          <tr>
            <td className="w-32 py-1 font-semibold">Nama Siswa</td>
            <td className="w-3 py-1 text-center">:</td>
            <td className="py-1 font-bold uppercase">{user?.full_name}</td>
            <td className="w-32 py-1 font-semibold">Mitra Industri (DUDI)</td>
            <td className="w-3 py-1 text-center">:</td>
            <td className="py-1 font-bold">{studentPkl?.Mitra?.nama || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">NIS / NISN</td>
            <td className="py-1 text-center">:</td>
            <td>{studentPkl?.Siswa?.nis || '-'}</td>
            <td className="py-1 font-semibold">Guru Pembimbing</td>
            <td className="py-1 text-center">:</td>
            <td>{studentPkl?.Pembimbing?.nama_guru || '-'}</td>
          </tr>
          <tr>
            <td className="py-1 font-semibold">Program Keahlian</td>
            <td className="py-1 text-center">:</td>
            <td>{studentPkl?.Siswa?.Jurusan?.nama_jurusan || 'Keahlian SMK'}</td>
            <td className="py-1 font-semibold">Periode PKL</td>
            <td className="py-1 text-center">:</td>
            <td>
              {studentPkl?.tanggal_mulai ? format(new Date(studentPkl.tanggal_mulai), 'dd MMMM yyyy', { locale: localeID }) : '-'} s.d {studentPkl?.tanggal_selesai ? format(new Date(studentPkl.tanggal_selesai), 'dd MMMM yyyy', { locale: localeID }) : '-'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Logbook Table */}
      <table className="w-full text-[9px] font-sans border-collapse border border-slate-400 mb-8">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-400 px-1 py-2 text-center w-6 uppercase tracking-tighter text-[7px]">No</th>
            <th className="border border-slate-400 px-1 py-2 text-center w-24 uppercase tracking-tighter text-[7px]">Hari / Tanggal</th>
            <th className="border border-slate-400 px-3 py-2 text-left uppercase tracking-tighter text-[7px]">Deskripsi Kegiatan & Dokumentasi Jurnal PKL</th>
            <th className="border border-slate-400 px-1 py-2 text-center w-16 uppercase tracking-tighter text-[7px]">Status</th>
            <th className="border border-slate-400 px-1 py-2 text-center w-24 uppercase tracking-tighter text-[7px]">Validasi</th>
          </tr>
        </thead>
        <tbody>
          {rawAbsensiHistory.map((a: any, idx: number) => (
            <tr key={a.id} className="break-inside-avoid">
              <td className="border border-slate-400 px-1 py-1 text-center font-mono text-[9px]">{idx + 1}</td>
              <td className="border border-slate-400 px-1 py-1 text-center font-bold text-slate-900 text-[8px]">
                {format(new Date(a.tanggal), 'EEEE', { locale: localeID })}
                <br />
                <span className="font-normal text-slate-500 text-[7px]">{format(new Date(a.tanggal), 'dd/MM/yyyy')}</span>
              </td>
              <td className="border border-slate-400 px-3 py-1 align-top">
                {renderActivityTextForPrint(a)}
              </td>
              <td className="border border-slate-400 px-1 py-1 text-center font-bold text-[7px]">
                {a.status}
              </td>
              <td className="border border-slate-400 px-1 py-1 text-center">
                {a.is_verified ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="w-6 h-6 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-600 bg-emerald-50 text-[9px]">
                      ✓
                    </div>
                    <span className="text-[6px] font-black text-emerald-700 uppercase leading-none">Verified</span>
                  </div>
                ) : (
                  <div className="h-8 border-b border-dotted border-slate-300 w-full mb-1"></div>
                )}
              </td>
            </tr>
          ))}
          {rawAbsensiHistory.length === 0 && (
            <tr>
              <td colSpan={5} className="border border-slate-400 px-2 py-6 text-center text-slate-400 italic">
                Belum ada data jurnal kegiatan terdaftar.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signature Section */}
      <div className="grid grid-cols-3 gap-4 text-[9px] font-sans text-center mt-8">
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Guru Pembimbing PKL</p>
          <div className="h-14 flex items-center justify-center">
            <span className="text-slate-300 italic text-[8px]">(Tanda Tangan)</span>
          </div>
          <p className="font-bold underline uppercase">{studentPkl?.Pembimbing?.nama_guru || '................................'}</p>
          <p className="text-[8px] text-slate-500">NIP. ................................</p>
        </div>
        <div>
          <p>Mengetahui,</p>
          <p className="font-bold">Pembimbing Industri (DUDI)</p>
          <div className="h-14 flex items-center justify-center">
            <span className="text-slate-300 italic text-[8px]">(Tanda Tangan & Cap)</span>
          </div>
          <p className="font-bold underline uppercase">................................</p>
          <p className="text-[8px] text-slate-500">Instruktur Lapangan</p>
        </div>
        <div>
          <p>Merdeka, {format(new Date(), 'dd MMMM yyyy', { locale: localeID })}</p>
          <p className="font-bold">Siswa Praktikan</p>
          <div className="h-14 flex items-center justify-center">
            <span className="text-slate-300 italic text-[8px]">(Tanda Tangan)</span>
          </div>
          <p className="font-bold underline uppercase">{user?.full_name}</p>
          <p className="text-[8px] text-slate-500">NIS. {studentPkl?.Siswa?.nis || '................'}</p>
        </div>
      </div>
    </div>
  );
};
