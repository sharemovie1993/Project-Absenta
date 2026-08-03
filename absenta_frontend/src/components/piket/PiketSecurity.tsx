import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { SmartPermitPicker } from '../common/SmartPermitPicker';
import { AnalyticsCard } from '../ui/AnalyticsCard';
import { ShieldCheck, ShieldAlert, AlertTriangle, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import type { IzinKeluarSiswa } from '../../api/piket.api';
import { usePiketGateStore } from '../../hooks/usePiketGateStore';
import { calculatePiketAnalytics, getPermitGateStage, getTipeIzinBadgeConfig } from '../../utils/piketStatusHelper';

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
  handleMarkReturned: (id: string, namaSiswa: string) => Promise<boolean>;
}

export const PiketSecurity: React.FC<PiketSecurityProps> = React.memo(({
  dailyPermits,
  verificationResult,
  setVerificationResult,
  handleSecuritySelect,
  handleSecurityEnter,
  handleMarkReturned
}) => {
  const securityInputRef = useRef<any>(null);

  // Reactive cross-tab gate store
  const { exitedGateIds, confirmGateExit, removeGateExit } = usePiketGateStore();

  const handleConfirmGateExit = React.useCallback(async (permit: IzinKeluarSiswa, namaSiswa: string) => {
    if (permit.tipe_izin === 'PULANG_AWAL') {
      const ok = await handleMarkReturned(permit.id, namaSiswa);
      if (ok) {
        toast.success(`Siswa ${namaSiswa} diizinkan Pulang Awal & selesai di gerbang`);
      }
      return;
    }

    confirmGateExit(permit.id);
    toast.success(`Verifikasi Gerbang: Siswa ${namaSiswa} diizinkan keluar sementara`);
  }, [handleMarkReturned, confirmGateExit]);

  const handleReturnFromGate = React.useCallback(async (id: string, namaSiswa: string) => {
    const success = await handleMarkReturned(id, namaSiswa);
    if (success) {
      removeGateExit(id);
    }
  }, [handleMarkReturned, removeGateExit]);

  // All active permits (not yet returned)
  const allActivePermits = React.useMemo(() => {
    return (dailyPermits || []).filter(
      p => p.status !== 'KEMBALI' && !p.jam_kembali
    );
  }, [dailyPermits]);

  // Split active permits using canonical stage helper
  const pendingExitPermits = React.useMemo(() => {
    return allActivePermits.filter(p => getPermitGateStage(p, exitedGateIds) === 'PENDING_GATE');
  }, [allActivePermits, exitedGateIds]);

  const outsidePermits = React.useMemo(() => {
    return allActivePermits.filter(p => getPermitGateStage(p, exitedGateIds) === 'OUTSIDE');
  }, [allActivePermits, exitedGateIds]);

  // Single-source-of-truth quantitative analytics calculation
  const {
    totalPermitsToday,
    countSedangDiLuar,
    countPulangAwal,
    countSudahKembali,
    countMenungguGerbang
  } = React.useMemo(() => {
    return calculatePiketAnalytics(dailyPermits, exitedGateIds);
  }, [dailyPermits, exitedGateIds]);

  // Pure derived active tab state (No useEffect required)
  const [userTabOverride, setUserTabOverride] = React.useState<'pending' | 'outside' | null>(null);

  const activeTab = React.useMemo(() => {
    if (userTabOverride !== null) return userTabOverride;
    if (pendingExitPermits.length === 0 && outsidePermits.length > 0) {
      return 'outside';
    }
    return 'pending';
  }, [userTabOverride, pendingExitPermits.length, outsidePermits.length]);

  // Handle Scan Verification Selection to also auto-confirm exit if valid
  const onSecuritySelectWithAutoExit = React.useCallback((permit: IzinKeluarSiswa) => {
    handleSecuritySelect(permit);
    if (permit.status !== 'KEMBALI' && !permit.jam_kembali) {
      const nama = permit.SiswaAkademik?.siswa?.nama_siswa || (permit as any).Siswa?.nama_siswa || 'Siswa';
      handleConfirmGateExit(permit, nama);
    }
  }, [handleSecuritySelect, handleConfirmGateExit]);

  return (
    <div className="space-y-6">
      {/* RINGKASAN STATISTIK ANALITIK LIVE POS SATPAM (PREMIUM VARIANT) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsCard
          variant="premium"
          title="Sedang di Luar"
          value={`${countSedangDiLuar} Siswa`}
          subtitle="Siswa izin sementara"
          icon={<LogOut className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-400/30"
        />

        <AnalyticsCard
          variant="premium"
          title="Pulang Awal"
          value={`${countPulangAwal} Siswa`}
          subtitle="Selesai di gerbang"
          icon={<CheckCircle2 className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-purple-500 to-purple-700 text-white border-purple-400/30"
        />

        <AnalyticsCard
          variant="premium"
          title="Sudah Kembali"
          value={`${countSudahKembali} Siswa`}
          subtitle="Masuk sekolah lagi"
          icon={<LogIn className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-400/30"
        />

        <AnalyticsCard
          variant="premium"
          title="Total Izin Terbit"
          value={`${totalPermitsToday} Izin`}
          subtitle={`${countMenungguGerbang} menunggu gerbang`}
          icon={<ShieldCheck className="text-white" size={20} />}
          gradient="bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-400/30"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* PANEL KIRI: VERIFIKASI GERBANG (SCANNER & SEARCH) */}
      <Card className="lg:col-span-7 p-6 md:p-8 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 relative overflow-visible border-t-4 border-slate-700">
        <div className="absolute top-0 right-0 w-32 h-32 bg-slate-400/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="text-center space-y-2 mb-6">
          <ShieldCheck className="mx-auto text-indigo-600" size={44} />
          <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Pos Satpam: Verifikasi Gerbang</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">
            Dekatkan QR Code slip siswa ke kamera atau masukkan NIS / ID slip untuk memverifikasi keabsahan izin keluar.
          </p>
        </div>

        <div className="space-y-4">
          <SmartPermitPicker
            ref={securityInputRef}
            permitList={dailyPermits}
            onSelect={onSecuritySelectWithAutoExit}
            onEnter={handleSecurityEnter}
            placeholder="Cari nama, NIS, RFID, atau scan QR..."
            autoFocus
          />
        </div>

        {/* VERIFICATION STATE DISPLAY */}
        {verificationResult.status === 'VALID' && verificationResult.permit && (
          <div className="mt-6 p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-500/30 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h4 className="text-lg font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tight">{verificationResult.message}</h4>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Siswa Berhak Keluar Gerbang</p>
            </div>

            {/* Student details display */}
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge variant="outline" className="text-[8px] font-black tracking-widest text-gray-400 border-none px-0 uppercase">Profil Siswa</Badge>
                  {(() => {
                    const cfg = getTipeIzinBadgeConfig(verificationResult.permit.tipe_izin);
                    return (
                      <span className={`inline-flex items-center gap-1 text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${cfg.badgeClass}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                <span className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-tight block mt-0.5">
                  {verificationResult.permit.SiswaAkademik?.siswa?.nama_siswa || (verificationResult.permit as any).Siswa?.nama_siswa}
                </span>
                <span className="text-[10px] font-bold text-gray-500 uppercase block">
                  NIS: {verificationResult.permit.SiswaAkademik?.siswa?.nis || (verificationResult.permit as any).Siswa?.nis || '-'} | Kelas: {verificationResult.permit.SiswaAkademik?.kelas?.nama_kelas || (verificationResult.permit as any).Siswa?.Kelas?.nama_kelas || '-'}
                </span>
                <span className="text-xs text-gray-500 mt-1 block font-medium">Alasan: <span className="font-bold">"{verificationResult.permit.alasan}"</span></span>
              </div>

              {/* Action based on status */}
              {verificationResult.permit.tipe_izin !== 'PULANG_AWAL' && (
                <Button
                  variant="primary"
                  onClick={() => {
                    handleReturnFromGate(verificationResult.permit!.id, verificationResult.permit!.SiswaAkademik?.siswa?.nama_siswa || (verificationResult.permit as any).Siswa?.nama_siswa || 'Siswa');
                    setVerificationResult({ status: 'IDLE' });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-4 py-2 font-black text-[10px] uppercase tracking-wider h-10 flex items-center gap-1.5 shadow-md shrink-0 self-start sm:self-center"
                >
                  <LogIn size={12} /> Siswa Kembali
                </Button>
              )}
            </div>
          </div>
        )}

        {verificationResult.status === 'INVALID' && (
          <div className="mt-6 p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-500/30 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="w-14 h-14 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20">
              <ShieldAlert size={32} />
            </div>
            <div>
              <h4 className="text-lg font-black text-rose-800 dark:text-rose-400 uppercase tracking-tight">{verificationResult.message}</h4>
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-0.5">DILARANG KELUAR / PERIKSA DENGAN PIKET</p>
            </div>
          </div>
        )}

        {verificationResult.status === 'IDLE' && (
          <Card className="mt-6 py-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center shadow-none">
            <AlertTriangle className="text-slate-300 mb-2" size={28} />
            <p className="text-[10px] font-black uppercase tracking-widest">Menunggu Input Scan / Pencarian Gerbang</p>
          </Card>
        )}
      </Card>

      {/* PANEL KANAN: PANTAUAN 2-STAGE POS SATPAM GERBANG */}
      <Card className="lg:col-span-5 p-6 rounded-3xl border-none shadow-xl bg-white dark:bg-slate-900 flex flex-col h-full border-t-4 border-indigo-500">
        {/* Stage Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mb-4">
          <button
            onClick={() => setUserTabOverride('pending')}
            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            ⏳ Menunggu Gerbang ({pendingExitPermits.length})
          </button>
          <button
            onClick={() => setUserTabOverride('outside')}
            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'outside'
                ? 'bg-rose-500 text-white shadow-md'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            🏃‍♂️ Sedang di Luar ({outsidePermits.length})
          </button>
        </div>

        {/* TAB 1: MENUNGGU KELUAR GERBANG (IZIN BARU TERBIT MEJA PIKET) */}
        {activeTab === 'pending' && (
          <div className="flex-1 flex flex-col">
            <p className="text-[10px] text-slate-400 font-medium mb-3 leading-relaxed">
              Daftar izin baru dari Meja Piket. Satpam mengeklik <span className="font-bold text-amber-600">"Izinkan Keluar"</span> saat siswa tiba di gerbang.
            </p>

            {pendingExitPermits.length > 0 ? (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {pendingExitPermits.map((item) => {
                  const namaSiswa = item.SiswaAkademik?.siswa?.nama_siswa || (item as any).Siswa?.nama_siswa || (item as any).nama_siswa || 'Siswa';
                  const nis = item.SiswaAkademik?.siswa?.nis || (item as any).Siswa?.nis || '-';
                  const kelas = item.SiswaAkademik?.kelas?.nama_kelas || (item as any).Siswa?.Kelas?.nama_kelas || '-';
                  const jamTerbit = item.jam_keluar ? new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';
                  const isPulangAwal = item.tipe_izin === 'PULANG_AWAL';

                  return (
                    <div key={item.id} className={`p-3.5 rounded-2xl flex items-center justify-between transition-all ${isPulangAwal ? 'bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 hover:border-purple-300' : 'bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 hover:border-amber-300'}`}>
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{namaSiswa}</span>
                          {isPulangAwal && (
                            <span className="text-[8px] font-black bg-purple-600 text-white px-1.5 py-0.2 rounded uppercase shrink-0">Pulang Awal</span>
                          )}
                        </div>
                        <div className={`text-[9px] font-bold uppercase mt-0.5 truncate ${isPulangAwal ? 'text-purple-700 dark:text-purple-400' : 'text-amber-700 dark:text-amber-400'}`}>
                          NIS: {nis} | {kelas}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1 truncate">
                          Alasan: <span className="italic">"{item.alasan}"</span> • Terbit: <span className="font-bold">{jamTerbit}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConfirmGateExit(item, namaSiswa)}
                        className={`rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider h-8 flex items-center gap-1 shadow-xs shrink-0 ${isPulangAwal ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                      >
                        {isPulangAwal ? <LogIn size={11} /> : <ShieldCheck size={11} />}
                        {isPulangAwal ? 'Izinkan Pulang' : 'Izinkan Keluar'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 font-medium flex flex-col items-center justify-center my-auto">
                <ShieldCheck size={36} className="text-amber-400 mb-2" />
                <p className="font-black uppercase text-[10px] text-slate-500 tracking-wider">Tidak Ada Antrean Izin Baru</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Belum ada permohonan surat izin keluar baru yang diterbitkan dari Meja Piket.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SEDANG DI LUAR SEKOLAH (SUDAH LEWAT GERBANG) */}
        {activeTab === 'outside' && (
          <div className="flex-1 flex flex-col">
            <p className="text-[10px] text-slate-400 font-medium mb-3 leading-relaxed">
              Daftar siswa yang telah diverifikasi keluar gerbang. Klik <span className="font-bold text-emerald-600">"Kembali"</span> saat siswa kembali ke gerbang.
            </p>

            {outsidePermits.length > 0 ? (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {outsidePermits.map((item) => {
                  const namaSiswa = item.SiswaAkademik?.siswa?.nama_siswa || (item as any).Siswa?.nama_siswa || (item as any).nama_siswa || 'Siswa';
                  const nis = item.SiswaAkademik?.siswa?.nis || (item as any).Siswa?.nis || '-';
                  const kelas = item.SiswaAkademik?.kelas?.nama_kelas || (item as any).Siswa?.Kelas?.nama_kelas || '-';
                  const jamKeluarStr = item.jam_keluar ? new Date(item.jam_keluar).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                  return (
                    <div key={item.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex items-center justify-between hover:border-indigo-200 dark:hover:border-indigo-900 transition-all">
                      <div className="min-w-0 pr-2">
                        <div className="font-black text-xs text-slate-800 dark:text-white uppercase truncate">{namaSiswa}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 truncate">
                          NIS: {nis} | {kelas}
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1 truncate">
                          Izin: <span className="italic">"{item.alasan}"</span> • Keluar: <span className="text-indigo-600 font-bold">{jamKeluarStr}</span>
                        </div>
                      </div>
                      {item.tipe_izin !== 'PULANG_AWAL' && (
                        <Button
                          size="sm"
                          onClick={() => handleReturnFromGate(item.id, namaSiswa)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-wider h-8 flex items-center gap-1 shadow-xs shrink-0"
                        >
                          <LogIn size={10} /> Kembali
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 font-medium flex flex-col items-center justify-center my-auto">
                <ShieldCheck size={36} className="text-emerald-400 mb-2" />
                <p className="font-black uppercase text-[10px] text-slate-500 tracking-wider">Tidak Ada Siswa di Luar</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs">Tidak ada siswa yang terkonfirmasi sedang berada di luar sekolah saat ini.</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  </div>
);
});
