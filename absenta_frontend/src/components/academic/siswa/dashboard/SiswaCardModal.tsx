import React, { useState } from 'react';
import { QrCode, X, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PreviewCard } from '@/components/academic/student-card/PreviewCard';
import { CardBackPreview } from '@/components/academic/student-card/CardBackPreview';
import { PrintableCard } from '@/components/academic/student-card/PrintableCard';
import { CardBackPrint } from '@/components/academic/student-card/CardBackPrint';
import { cn } from '@/lib/utils';

export interface SiswaCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaProfile: any;
  user: any;
  sekolahName: string;
  dynamicLogoUrl: string | null;
  studentPhotoUrl: string | null;
  studentInitials: string;
  studentName: string;
  currentClassName: string;
  currentJurusan: string;
  currentNisn: string;
  currentNik: string;
  studentCardConfigRes: any;
  cardConfig?: any;
}

export const SiswaCardModal: React.FC<SiswaCardModalProps> = ({
  isOpen,
  onClose,
  siswaProfile,
  user,
  sekolahName,
  dynamicLogoUrl,
  studentPhotoUrl,
  studentInitials,
  studentName,
  currentClassName,
  currentJurusan,
  currentNisn,
  currentNik,
  studentCardConfigRes,
  cardConfig,
}) => {
  const [cardSide, setCardSide] = useState<'front' | 'back'>('front');

  if (!isOpen) return null;

  const dynamicCardTitle = studentCardConfigRes?.data?.nama_desain || 'KARTU TANDA SISWA';

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-auto text-white">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">Kartu Pelajar Digital Verified</h3>
              <p className="text-[10px] text-slate-400 font-bold">{sekolahName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle Front / Back View Button */}
            <button
              type="button"
              onClick={() => setCardSide((prev) => (prev === 'front' ? 'back' : 'front'))}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition-all"
            >
              <Eye size={14} />
              <span>{cardSide === 'front' ? 'Lihat Sisi Belakang' : 'Lihat Sisi Depan'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="relative w-full">
          <div className={cn(
            "relative w-full rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 overflow-hidden border border-emerald-500/30 text-white space-y-4",
            cardSide === 'front' 
              ? "bg-gradient-to-br from-emerald-600 via-teal-800 to-slate-950" 
              : "bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-950"
          )}>
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-400/20 rounded-full blur-2xl pointer-events-none" />

            {cardSide === 'front' ? (
              <>
                {/* Front Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-3">
                  <div className="flex items-center gap-3">
                    {dynamicLogoUrl ? (
                      <img src={dynamicLogoUrl} alt="Logo Sekolah" className="w-10 h-10 rounded-xl object-contain bg-white p-0.5 shadow-md shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white text-emerald-700 font-black text-xl flex items-center justify-center shadow-md shrink-0">
                        {sekolahName ? sekolahName.charAt(0) : 'A'}
                      </div>
                    )}
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-white leading-tight">{sekolahName}</h4>
                      <p className="text-[9px] font-extrabold text-emerald-200/90 uppercase tracking-widest">{dynamicCardTitle}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 flex items-center gap-1 shrink-0">
                    <Check size={10} strokeWidth={4} />
                    VERIFIED
                  </span>
                </div>

                {/* Front Content */}
                <div className="flex items-center gap-4 py-2">
                  <div className="relative shrink-0">
                    {studentPhotoUrl ? (
                      <img
                        src={studentPhotoUrl}
                        alt={siswaProfile?.nama}
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                          const el = document.getElementById('card-modal-initials');
                          if (el) el.style.display = 'flex';
                        }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-emerald-300/40 shadow-md"
                      />
                    ) : null}
                    <div
                      id="card-modal-initials"
                      style={{ display: studentPhotoUrl ? 'none' : 'flex' }}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/10 border-2 border-emerald-300/40 p-0.5 shadow-md items-center justify-center font-black text-2xl text-white"
                    >
                      {studentInitials}
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-slate-950 rounded-full flex items-center justify-center text-slate-950">
                      <Check size={11} strokeWidth={4} />
                    </span>
                  </div>

                  <div className="space-y-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                      {studentName}
                    </h2>
                    <p className="text-xs font-extrabold text-emerald-200 font-mono">
                      Kelas {currentClassName} • {currentJurusan}
                    </p>
                    <p className="text-xs font-semibold text-slate-200 font-mono">
                      NISN: <span className="font-bold text-white">{currentNisn}</span>
                    </p>
                    <p className="text-xs font-semibold text-slate-200 font-mono">
                      NIK: <span className="font-bold text-white">{currentNik}</span>
                    </p>
                  </div>
                </div>

                {/* Front Footer */}
                <div className="flex items-end justify-between border-t border-white/15 pt-3">
                  <div>
                    <span className="text-[9px] font-black uppercase text-emerald-200/70 block tracking-wider">MASA BERLAKU</span>
                    <span className="text-xs font-black text-white font-mono">2024 - 2027</span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="h-7 w-32 bg-white/95 rounded px-1.5 py-1 flex items-center justify-between shadow-xs">
                      {[...Array(24)].map((_, i) => (
                        <div key={i} className={cn("h-full bg-slate-950 rounded-xs", i % 3 === 0 ? "w-1" : i % 5 === 0 ? "w-1.5" : "w-0.5")} />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-emerald-200/80 tracking-widest block">{currentNisn}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Back View */}
                <div className="flex items-center justify-between border-b border-white/15 pb-3">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-white">KETENTUAN KARTU DIGITAL</h4>
                    <p className="text-[9px] font-extrabold text-emerald-200/80 uppercase">{sekolahName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-white/20 text-white border border-white/30">
                    SISI BELAKANG
                  </span>
                </div>

                <div className="grid grid-cols-12 gap-3 py-2 items-center">
                  <div className="col-span-8 space-y-1.5 text-[10px] text-slate-200 font-medium leading-relaxed">
                    <p>1. Kartu ini milik sah <strong className="text-white">{sekolahName}</strong> dan wajib dibawa saat kegiatan sekolah.</p>
                    <p>2. Dilarang menggandakan atau menyalahgunakan QR Code ini untuk tindakan manipulasi absensi.</p>
                    <p>3. Jika kartu hilang, segera laporkan ke bagian Tata Usaha / Kesiswaan.</p>
                  </div>

                  <div className="col-span-4 flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-white/30 shadow-md">
                    <div className="w-20 h-20 bg-slate-950 rounded-xl p-1.5 flex items-center justify-center">
                      <div className="w-full h-full bg-white rounded flex items-center justify-center font-mono font-black text-slate-950 text-[10px] text-center p-1 leading-tight">
                        QR:{currentNisn}
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-slate-800 font-mono mt-1 uppercase tracking-widest">SCAN DISINI</span>
                  </div>
                </div>

                <div className="border-t border-white/15 pt-2 flex items-center justify-between text-[9px] text-emerald-200/70 font-semibold">
                  <span>Sistem Informasi Akademik &amp; Presensi Absenta</span>
                  <span>ID: {siswaProfile?.id?.substring(0, 8) || 'VERIFIED'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-1 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-extrabold border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
