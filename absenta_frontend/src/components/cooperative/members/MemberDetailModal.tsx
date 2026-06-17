import React from 'react';
import { Mail, Phone, MapPin, PowerOff, Download, FileText, CreditCard } from 'lucide-react';
import { Button } from '../../ui';
import { Modal } from '../ui/Modal';
import type { Member, CoopProfile } from './types';
import { MemberCardVisual } from './MemberCardVisual';
import { MemberSavingsLedger } from './MemberSavingsLedger';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  coopName: string;
  coopProfile: CoopProfile;
  qrCodeUrl: string;
  onDownloadCardPdf: (m: Member) => void;
  onExportSinglePdf: (m: Member) => void;
  onInitiateTerminate: (m: Member) => void;
  onChangePin?: (m: Member) => void;
  canUpdate?: boolean;
  canDelete?: boolean;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member,
  coopName,
  coopProfile,
  qrCodeUrl,
  onDownloadCardPdf,
  onExportSinglePdf,
  onInitiateTerminate,
  onChangePin,
  canUpdate = false,
  canDelete = false
}) => {
  if (!member) return null;

  const pokokAmount = parseFloat((member.savings || [])?.find((s) => s.type === 'POKOK')?.amount as any) || 0;
  const wajibAmount = parseFloat((member.savings || [])?.find((s) => s.type === 'WAJIB')?.amount as any) || 0;
  const sukarelaAmount = parseFloat((member.savings || [])?.find((s) => s.type === 'SUKARELA')?.amount as any) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil Detail Keanggotaan Koperasi"
      size="xl"
    >
      <div className="space-y-6">
        {/* Two-Sided Membership Card Visual */}
        <MemberCardVisual
          member={member}
          coopName={coopName}
          coopProfile={coopProfile}
          qrCodeUrl={qrCodeUrl}
        />

        {/* Financial Widget (Real-time Deposits Ledger from Database) */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/30 dark:border-emerald-950/20 rounded-xl text-center space-y-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Simpanan Pokok</span>
            <p className="text-xs font-black text-emerald-700 dark:text-emerald-300">
              Rp {pokokAmount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-950/20 rounded-xl text-center space-y-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Simpanan Wajib</span>
            <p className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              Rp {wajibAmount.toLocaleString('id-ID')}
            </p>
          </div>
          <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl text-center space-y-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sukarela</span>
            <p className="text-xs font-black text-slate-700 dark:text-slate-350">
              Rp {sukarelaAmount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Savings Transaction Ledger */}
        <MemberSavingsLedger savings={member.savings} />

        {/* Core Profile Details */}
        <div className="space-y-4 pt-2">
          <h5 className="text-xs font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/80 pb-2">
            Informasi Kontak & Domisili
          </h5>
          
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex items-center gap-3 p-3 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-850 rounded-xl">
              <span className="text-slate-400 shrink-0"><Mail size={16} /></span>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Alamat Email</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{member.email || '-'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-850 rounded-xl">
              <span className="text-slate-400 shrink-0"><Phone size={16} /></span>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Nomor Telepon</span>
                <p className="font-bold text-slate-700 dark:text-slate-300">{member.phone || '-'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50/30 dark:bg-slate-900/20 border border-slate-100/50 dark:border-slate-850 rounded-xl">
              <span className="text-slate-400 shrink-0"><MapPin size={16} /></span>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Alamat Lengkap</span>
                <p className="font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{member.address || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex gap-2">
            {member.status === 'ACTIVE' && canDelete && (
              <Button 
                type="button"
                onClick={() => onInitiateTerminate(member)}
                className="h-9 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/10 transition-all duration-300"
              >
                <PowerOff size={13} />
                Berhentikan
              </Button>
            )}
            {member.status === 'ACTIVE' && onChangePin && canUpdate && (
              <Button 
                type="button"
                onClick={() => onChangePin(member)}
                className="h-9 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-md shadow-amber-500/10 transition-all duration-300"
              >
                <CreditCard size={13} />
                Ganti PIN
              </Button>
            )}
            <Button 
              type="button"
              onClick={() => onDownloadCardPdf(member)}
              className="h-9 text-xs font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 flex items-center gap-1.5 shadow-sm transition-all duration-300"
            >
              <Download size={13} />
              Cetak Kartu
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              type="button"
              onClick={() => onExportSinglePdf(member)}
              className="h-9 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-600/10 transition-all duration-300"
            >
              <FileText size={14} />
              Cetak Laporan
            </Button>
            <Button 
              type="button"
              variant="outline" 
              onClick={onClose}
              className="h-9 text-xs font-bold rounded-xl border-slate-200 text-slate-700 dark:text-slate-350"
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
