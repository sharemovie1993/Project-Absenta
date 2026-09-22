import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MoreVertical, 
  Award, 
  MapPin, 
  FileText, 
  Printer, 
  Edit, 
  Trash2, 
  MessageCircle, 
  Building2,
  CheckCircle,
  ArrowRightLeft,
  History
} from 'lucide-react';
import type { SiswaPkl } from '../../pages/hubin/types/penempatan.types';

export interface PenempatanRowActionMenuProps {
  row: SiswaPkl;
  canManage: boolean;
  hasKolektif: (mitraId: string) => boolean;
  onNilai: (row: SiswaPkl) => void;
  onKunjungan: (row: SiswaPkl) => void;
  onReviewJurnal: (row: SiswaPkl) => void;
  onCetakTugas: (row: SiswaPkl) => void;
  onCetakKolektif: (mitraId: string) => void;
  onPrintMonitoring?: (row: SiswaPkl) => void;
  onHapus: (row: SiswaPkl) => void;
  onEdit?: (row: SiswaPkl) => void;
  onSelesai?: (row: SiswaPkl) => void;
  onMutasi?: (row: SiswaPkl) => void;
  onFilterSiswaHistory?: (namaSiswa: string) => void;
  onEditMitraKontak?: (mitraId: string) => void;
  siswaPhone?: string;
  mitraPhone?: string;
}

export const PenempatanRowActionMenu: React.FC<PenempatanRowActionMenuProps> = React.memo(({
  row,
  canManage,
  hasKolektif,
  onNilai,
  onKunjungan,
  onReviewJurnal,
  onCetakTugas,
  onCetakKolektif,
  onPrintMonitoring,
  onHapus,
  onEdit,
  onSelesai,
  onMutasi,
  onFilterSiswaHistory,
  onEditMitraKontak,
  siswaPhone,
  mitraPhone
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; openUpward: boolean }>({
    top: 0,
    left: 0,
    openUpward: false
  });

  const updateCoords = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < menuHeight && rect.top > menuHeight;

    const left = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, rect.right - menuWidth));
    const top = openUpward ? rect.top - 6 : rect.bottom + 6;

    setCoords({ top, left, openUpward });
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => setIsOpen(false);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const formatWhatsAppLink = (phone: string, text: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
    else if (cleaned.startsWith('8')) cleaned = '62' + cleaned;
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  };

  const resolvedSiswaPhone = siswaPhone || row.Siswa?.no_hp || '';
  const resolvedMitraPhone = mitraPhone || row.Mitra?.kontak || '';

  const isJurnalAvailable = !!row.jurnal_json?.file_url;
  const isKolektifAvailable = hasKolektif(row.mitra_id);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        title="Menu Aksi"
        aria-label={`Menu aksi untuk ${row.Siswa?.nama_siswa || 'siswa'}`}
        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
          isOpen
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs'
            : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop Shield */}
          <div 
            className="fixed inset-0 z-50 bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating Dropdown Panel */}
          <div
            style={{
              position: 'fixed',
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: '224px',
            }}
            className="z-50 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200/90 dark:border-slate-800 py-1.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          >
            {/* Context Header */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
              <p className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight truncate">
                {row.Siswa?.nama_siswa}
              </p>
              <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                {row.Mitra?.nama || 'Tanpa Mitra'}
              </p>
            </div>

            {/* Quick Filter: Riwayat Siswa */}
            {onFilterSiswaHistory && row.Siswa?.nama_siswa && (
              <div className="border-b border-slate-100 dark:border-slate-800 py-1 bg-indigo-50/30 dark:bg-indigo-950/20">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onFilterSiswaHistory(row.Siswa!.nama_siswa);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors text-left cursor-pointer"
                >
                  <History size={14} className="text-indigo-500 shrink-0" />
                  <span>Riwayat Siswa Ini</span>
                </button>
              </div>
            )}

            {/* Group 1: Pembimbingan & Penilaian */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onNilai(row);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
              >
                <Award size={15} className="text-blue-500 shrink-0" />
                <span>Input Nilai PKL</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onKunjungan(row);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-left cursor-pointer"
              >
                <MapPin size={15} className="text-amber-500 shrink-0" />
                <span>Jurnal Kunjungan Guru</span>
              </button>

              {isJurnalAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onReviewJurnal(row);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left cursor-pointer"
                >
                  <FileText size={15} className="text-emerald-500 shrink-0" />
                  <span>Review Jurnal Portofolio</span>
                </button>
              )}
            </div>

            {/* Aksi Khusus: Info & Kontak PIC DUDI */}
            {onEditMitraKontak && row.mitra_id && (
              <div className="border-t border-slate-100 dark:border-slate-800 py-1 bg-indigo-50/20 dark:bg-indigo-950/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onEditMitraKontak(row.mitra_id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors text-left cursor-pointer"
                >
                  <Building2 size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Info & Kontak PIC DUDI</span>
                </button>
              </div>
            )}

            {/* Group 2: Surat & Dokumen */}
            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCetakTugas(row);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
              >
                <Printer size={15} className="text-slate-400 shrink-0" />
                <span>Cetak Surat Tugas PKL</span>
              </button>

              {onPrintMonitoring && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onPrintMonitoring(row);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                >
                  <Printer size={15} className="text-amber-500 shrink-0" />
                  <span>Cetak Lembar Monitoring</span>
                </button>
              )}

              {isKolektifAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onCetakKolektif(row.mitra_id);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors text-left cursor-pointer"
                >
                  <Printer size={15} className="text-indigo-500 shrink-0" />
                  <span>Cetak Tugas Kolektif</span>
                </button>
              )}
            </div>

            {/* Group 3: WhatsApp Quick Links */}
            {(resolvedSiswaPhone || resolvedMitraPhone) && (
              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                {resolvedSiswaPhone && (
                  <a
                    href={formatWhatsAppLink(
                      resolvedSiswaPhone,
                      `Halo ${row.Siswa?.nama_siswa || 'Siswa'}, saya pembimbing PKL Anda dari sekolah. Bagaimana perkembangan praktik Anda hari ini?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left"
                  >
                    <MessageCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>Chat Siswa (WA)</span>
                  </a>
                )}
                {resolvedMitraPhone && (
                  <a
                    href={formatWhatsAppLink(
                      resolvedMitraPhone,
                      `Halo Bapak/Ibu dari ${row.Mitra?.nama || 'Mitra'}, saya pembimbing PKL dari sekolah untuk siswa ${row.Siswa?.nama_siswa || 'Siswa'}. Bagaimana progres magang siswa kami di sana?`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-left"
                  >
                    <Building2 size={14} className="text-indigo-500 shrink-0" />
                    <span>Chat Mitra/HRD (WA)</span>
                  </a>
                )}
              </div>
            )}

            {/* Group 4: Manajemen (Edit & Hapus) */}
            {canManage && (
              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                {onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onEdit(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-left cursor-pointer"
                  >
                    <Edit size={15} className="text-slate-500 shrink-0" />
                    <span>Edit Plotting</span>
                  </button>
                )}

                {row.status === 'AKTIF' && onSelesai && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onSelesai(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
                  >
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <span>Tandai Selesai PKL</span>
                  </button>
                )}

                {row.status === 'AKTIF' && onMutasi && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onMutasi(row);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left cursor-pointer"
                  >
                    <ArrowRightLeft size={15} className="text-amber-500 shrink-0" />
                    <span>Mutasi / Pindah DUDI</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onHapus(row);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                >
                  <Trash2 size={15} className="text-rose-500 shrink-0" />
                  <span>Hapus Penempatan</span>
                </button>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
});