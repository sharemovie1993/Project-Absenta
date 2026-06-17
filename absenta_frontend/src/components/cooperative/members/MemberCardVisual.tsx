import React from 'react';
import type { Member, CoopProfile } from './types';

interface MemberCardVisualProps {
  member: Member;
  coopName: string;
  coopProfile: CoopProfile;
  qrCodeUrl: string;
}

export const MemberCardVisual: React.FC<MemberCardVisualProps> = ({
  member,
  coopName,
  coopProfile,
  qrCodeUrl
}) => {
  return (
    <div className="space-y-3">
      <h5 className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-1">
        Visual Kartu Anggota (2 Sisi)
      </h5>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TAMPAK DEPAN */}
        <div className="space-y-1.5">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">
            TAMPAK DEPAN
          </span>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 p-5 text-white shadow-lg shadow-indigo-600/10 flex justify-between items-center gap-3 h-[155px]">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
            
            <div className="space-y-6 flex-1 min-w-0">
              <div className="space-y-1">
                <span className="text-[9px] font-black tracking-[0.2em] opacity-80 uppercase block truncate">
                  {coopName}
                </span>
                <h4 className="text-base font-bold font-sans tracking-tight leading-tight truncate" title={member.name}>
                  {member.name}
                </h4>
                <span className="inline-block bg-white/15 border border-white/20 text-white font-black text-[8px] px-1.5 py-0.5 tracking-wider rounded-full uppercase mt-0.5">
                  {member.type === 'STUDENT' ? 'SISWA' : 'GURU/STAF'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 block">Nomor Anggota</span>
                <p className="font-mono text-base font-black tracking-widest truncate">{member.memberNo}</p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-1 shrink-0 bg-white p-1.5 rounded-xl shadow-inner border border-white/25">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-12 h-12" />
              ) : (
                <div className="w-12 h-12 bg-slate-100 animate-pulse rounded-lg" />
              )}
              <span className="text-[6px] font-black text-slate-800 tracking-wider">SCAN ME</span>
            </div>
          </div>
        </div>

        {/* TAMPAK BELAKANG */}
        <div className="space-y-1.5">
          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block text-center">
            TAMPAK BELAKANG
          </span>
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-200/10 dark:border-slate-800 p-4 text-white shadow-lg flex flex-col justify-between h-[155px]">
            {/* Magnetic Stripe Mock */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-black/80" />
            
            <div className="mt-2 space-y-1 z-10">
              <div className="flex justify-between items-start">
                <span className="text-[7px] font-black tracking-[0.1em] text-slate-400 uppercase">KETENTUAN PENGGUNAAN KARTU</span>
                {coopProfile.legalNo && (
                  <span className="text-[6px] text-slate-500 font-medium">B.H: {coopProfile.legalNo}</span>
                )}
              </div>
              <ul className="text-[6px] text-slate-400 list-disc pl-3 space-y-0.5 font-medium leading-tight">
                <li>Kartu ini bukti resmi keanggotaan Koperasi {coopName}.</li>
                <li>Wajib dibawa saat bertransaksi atau belanja di POS Koperasi.</li>
                <li>Kartu tidak dapat dipindahtangankan kepada orang lain.</li>
              </ul>
            </div>

            {/* Mock Signature Box */}
            <div className="flex items-center gap-2 my-1 z-10">
              <div className="bg-slate-200 border border-slate-350 w-24 h-3.5 rounded text-[5px] text-slate-650 font-mono italic flex items-center justify-center">
                Tanda Tangan Anggota
              </div>
              <span className="text-[5px] text-slate-500 font-bold">Authorized Signature</span>
            </div>

            <div className="border-t border-slate-800 pt-1.5 text-[6px] text-slate-400 space-y-0.5 z-10">
              <p className="font-bold text-[6px] text-amber-500 uppercase tracking-wide">JIKA HILANG / DITEMUKAN, MOHON DIKIRIMKAN KEMBALI KEPADA:</p>
              <p className="truncate font-black text-slate-300">{coopName.toUpperCase()}</p>
              <p className="truncate"><span className="font-bold text-slate-400">Alamat Pos/Kurir:</span> {coopProfile.address}</p>
              <p className="truncate"><span className="font-bold text-slate-400">Kontak:</span> {coopProfile.phone} | {coopProfile.email} {coopProfile.website !== '-' ? `| ${coopProfile.website}` : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
