import React, { useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SmartPermitPicker } from '../common/SmartPermitPicker';
import { ShieldCheck, ShieldAlert, AlertTriangle, LogIn } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';

interface PiketSecurityProps {
  dailyPermits: IzinKeluarSiswa[];
  verificationResult: {
    status: 'IDLE' | 'VALID' | 'INVALID';
    permit?: IzinKeluarSiswa;
    message?: string;
  };
  setVerificationResult: React.Dispatch<React.SetStateAction<{
    status: 'IDLE' | 'VALID' | 'INVALID';
    permit?: IzinKeluarSiswa;
    message?: string;
  }>>;
  handleSecuritySelect: (permit: IzinKeluarSiswa) => void;
  handleSecurityEnter: (code?: string) => void;
  handleMarkReturned: (id: string, namaSiswa: string) => Promise<void>;
}

export const PiketSecurity: React.FC<PiketSecurityProps> = ({
  dailyPermits,
  verificationResult,
  setVerificationResult,
  handleSecuritySelect,
  handleSecurityEnter,
  handleMarkReturned
}) => {
  const securityInputRef = useRef<any>(null);

  return (
    <Card className="p-8 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 relative overflow-visible border-t-4 border-slate-700">
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-full blur-2xl" />
      
      <div className="text-center space-y-2 mb-8">
        <ShieldCheck className="mx-auto text-indigo-600" size={48} />
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pos Satpam: Verifikasi Gerbang</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium">Dekatkan QR Code slip siswa ke kamera atau masukkan NIS/ID struk untuk verifikasi status izin.</p>
      </div>

      <div className="space-y-4">
        <SmartPermitPicker
          ref={securityInputRef}
          permitList={dailyPermits}
          onSelect={handleSecuritySelect}
          onEnter={handleSecurityEnter}
          placeholder="Cari nama, NIS, RFID, atau scan QR..."
          autoFocus
        />
      </div>

      {/* VERIFICATION STATE DISPLAY */}
      {verificationResult.status === 'VALID' && verificationResult.permit && (
        <div className="mt-8 p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/30 text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldCheck size={36} />
          </div>
          <div>
            <h4 className="text-xl font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">{verificationResult.message}</h4>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Siswa Berhak Keluar Gerbang</p>
          </div>

          {/* Student details display */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-left">
            <div>
              <Badge variant="outline" className="text-[8px] font-black tracking-widest text-gray-400 border-none px-0 uppercase block">Profil Siswa</Badge>
              <span className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight block mt-0.5">
                {verificationResult.permit.SiswaAkademik?.siswa.nama_siswa}
              </span>
              <span className="text-[10px] font-bold text-gray-500 uppercase block">
                NIS: {verificationResult.permit.SiswaAkademik?.siswa.nis} | Kelas: {verificationResult.permit.SiswaAkademik?.kelas?.nama_kelas || '-'}
              </span>
              <span className="text-xs text-gray-500 mt-2 block font-medium">Alasan: <span className="font-bold">"{verificationResult.permit.alasan}"</span></span>
            </div>
            {/* Return Action */}
            {verificationResult.permit.tipe_izin !== 'PULANG_AWAL' && (
              <Button
                variant="primary"
                onClick={() => {
                  handleMarkReturned(verificationResult.permit!.id, verificationResult.permit!.SiswaAkademik?.siswa.nama_siswa || 'Siswa');
                  setVerificationResult({ status: 'IDLE' });
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-wider h-10 flex items-center gap-1.5 shadow-md shrink-0 self-center"
              >
                <LogIn size={12} /> Siswa Kembali
              </Button>
            )}
          </div>
        </div>
      )}

      {verificationResult.status === 'INVALID' && (
        <div className="mt-8 p-6 rounded-xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500/30 text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
            <ShieldAlert size={36} />
          </div>
          <div>
            <h4 className="text-xl font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">{verificationResult.message}</h4>
            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-1">DILARANG KELUAR / PERIKSA DENGAN PIKET</p>
          </div>
        </div>
      )}

      {verificationResult.status === 'IDLE' && (
        <Card className="mt-8 py-10 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center shadow-none">
          <AlertTriangle className="text-slate-300 mb-2" size={32} />
          <p className="text-[10px] font-black uppercase tracking-widest">Menunggu Input Scan Gerbang</p>
        </Card>
      )}
    </Card>
  );
};
