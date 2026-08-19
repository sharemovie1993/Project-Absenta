import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Search, UserCheck, ShieldAlert, Check, X } from 'lucide-react';
import { submitTap, bypassLate, type TapPayload } from '../../../../api/attendanceGerbang.api';
import { siswaApi, guruApi } from '../../../../api/academic.api';
import { getTenantById } from '../../../../api/tenants.api';
import { useTenant } from '../../../../hooks/useTenant';
import { useDebounce } from '../../../../hooks/useDebounce';
import { useAudioFeedback } from '../../../../hooks/useAudioFeedback';
import { useGateLogic } from '../../../../hooks/useGateLogic';
import { Label, Switch, Loader } from '../../../ui';
import { type Student } from '../../../common/SmartStudentPicker';

export const StaffManualInputTab: React.FC = React.memo(() => {
  const { tenantId } = useTenant();
  const { playBeep } = useAudioFeedback();

  // Tenant config Query
  const tenantConfigQuery = useQuery({
    queryKey: ['tenant-config-gate-manual', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const res = await getTenantById(tenantId);
      return res.data || null;
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const tenantConfig = tenantConfigQuery.data || null;
  const { internalDirection, setInternalDirection } = useGateLogic(tenantConfig);
  const inputDirection = internalDirection;
  
  const [isBypassMode, setIsBypassMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Search candidates Query (Siswa & Guru)
  const candidatesQuery = useQuery({
    queryKey: ['manual-search-candidates', debouncedSearch, tenantId],
    queryFn: async () => {
      const term = debouncedSearch.trim();
      if (term.length < 2) return [];

      const [resSiswa, resGuru] = await Promise.all([
        siswaApi.getAll({
          search: term,
          limit: 10,
          search_fields: ['nama_siswa', 'nisn', 'nis', 'no_rfid', 'id'],
          elevated_context: 'true',
          context: 'elevated'
        } as any).catch(() => ({ data: [] })),
        guruApi.getAll({
          search: term,
          limit: 5,
          search_fields: ['nama_guru', 'nip', 'nik', 'no_rfid', 'id'],
          elevated_context: 'true',
          context: 'elevated'
        } as any).catch(() => ({ data: [] }))
      ]);

      const siswaList = ((resSiswa.data || []).map((s: any) => ({
        ...s,
        entityType: 'SISWA',
        displayName: s.nama_siswa,
        displayId: s.nisn || s.nis || s.id,
        subLabel: s.Kelas?.nama_kelas || 'Siswa'
      })));

      const guruList = ((resGuru.data || []).map((g: any) => ({
        ...g,
        entityType: 'GURU',
        displayName: g.nama_guru,
        displayId: g.nip || g.nik || g.id,
        subLabel: g.jenis_ptk || 'Guru / Pegawai'
      })));

      return [...siswaList, ...guruList];
    },
    enabled: debouncedSearch.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  const candidates = candidatesQuery.data || [];
  const isSearching = candidatesQuery.isLoading;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tapHistory, setTapHistory] = useState<{ id: string; type: 'success' | 'error'; message: string; time: string }[]>([]);

  const addTapFeedback = useCallback((type: 'success' | 'error', message: string, time: string) => {
    const newItem = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      time
    };
    setTapHistory(prev => [newItem, ...prev.slice(0, 4)]);
  }, []);

  const handleSelectEntity = useCallback(async (item: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    try {
      if (isBypassMode) {
        const res = await bypassLate({ siswa_id: item.id, note: 'Bypass Manual' });
        if (res.success) {
          const sInfo = (res as any).data;
          const nama = sInfo?.nama_siswa || item.displayName || 'Siswa';
          const kelas = sInfo?.kelas && sInfo.kelas !== '-' ? ` - ${sInfo.kelas}` : '';
          const msg = `BYPASS BERHASIL: ${nama}${kelas}`;
          
          toast.success(msg, { position: 'bottom-center' });
          addTapFeedback('success', msg, timeStr);
          await playBeep('success');
          setSearchTerm('');
        } else {
          const errMsg = (res as any).message || 'Gagal memproses bypass';
          toast.error(errMsg, { position: 'bottom-center' });
          addTapFeedback('error', errMsg, timeStr);
        }
        return;
      }

      // Submit tap directly to backend
      const tapRes = await submitTap({ siswa_id: item.id, arah: inputDirection, device_id: 'MANUAL_DASHBOARD' });
      if (tapRes.success) {
        const sInfo = (tapRes as any).data?.siswa_info;
        const gInfo = (tapRes as any).data?.guru_info;
        
        let successMsg = '';
        if (sInfo?.nama) {
          const kelasLabel = sInfo.nama_kelas ? ` - ${sInfo.nama_kelas}` : '';
          successMsg = `PRESENSI BERHASIL: ${sInfo.nama}${kelasLabel}`;
        } else if (gInfo?.nama) {
          successMsg = `PRESENSI BERHASIL: ${gInfo.nama} (${gInfo.jenis_ptk || 'Pegawai'})`;
        } else {
          successMsg = (tapRes as any).message || `PRESENSI BERHASIL: ${item.displayName}`;
        }

        toast.success(successMsg, { position: 'bottom-center' });
        addTapFeedback('success', successMsg, timeStr);
        await playBeep('success');
        setSearchTerm('');
      } else {
        const errMsg = (tapRes as any).message || 'Gagal mencatat tap';
        toast.error(errMsg, { position: 'bottom-center' });
        addTapFeedback('error', errMsg, timeStr);
      }
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Gagal mencatat presensi';
      toast.error(errMsg, { position: 'bottom-center' });
      addTapFeedback('error', errMsg, timeStr);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, isBypassMode, inputDirection, playBeep, addTapFeedback]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            type="button"
            onClick={() => setInternalDirection('GERBANG_DATANG')} 
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${inputDirection === 'GERBANG_DATANG' ? 'bg-white dark:bg-gray-700 text-green-600 shadow-sm' : 'text-gray-500'}`}
          >
            MASUK
          </button>
          <button 
            type="button"
            onClick={() => setInternalDirection('GERBANG_PULANG')} 
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${inputDirection === 'GERBANG_PULANG' ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm' : 'text-gray-500'}`}
          >
            PULANG
          </button>
        </div>

        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 px-3.5 py-2 rounded-xl border border-amber-200 dark:border-amber-800/60">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <Label className="text-xs font-bold text-amber-900 dark:text-amber-300 cursor-pointer">
            Mode Bypass (Force HADIR)
          </Label>
          <Switch 
            checked={isBypassMode} 
            onChange={(checked: boolean) => setIsBypassMode(checked)} 
          />
        </div>
      </div>

      {/* Manual Search Form Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="space-y-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
              Pencarian Siswa / Guru Lupa Kartu
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && candidates.length > 0) {
                    e.preventDefault();
                    handleSelectEntity(candidates[0]);
                  }
                }}
                placeholder="Ketik Nama Siswa, Guru, NISN, NIP, atau No RFID..."
                className="w-full pl-12 pr-10 py-3.5 text-base md:text-lg font-medium rounded-xl border-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Ketik minimal 2 huruf untuk memunculkan daftar nama siswa atau guru.
            </p>
          </div>

          {/* Results List */}
          {isSearching && (
            <div className="py-6 flex justify-center items-center gap-2 text-slate-400 text-xs">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Mencari data siswa & guru...</span>
            </div>
          )}

          {!isSearching && debouncedSearch.trim().length >= 2 && candidates.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              Tidak ditemukan siswa atau guru dengan kata kunci &quot;{debouncedSearch}&quot;
            </div>
          )}

          {candidates.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {candidates.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectEntity(item)}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                      item.entityType === 'GURU' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {item.entityType === 'GURU' ? 'GURU' : 'SISWA'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                        {item.displayName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-medium">{item.subLabel}</span>
                        {item.displayId && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{item.displayId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs group-hover:scale-105 transition-all"
                  >
                    Tandai Hadir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Result History Stream */}
      {tapHistory.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 px-1">
            <span>Riwayat Presensi Manual Terakhir</span>
            <button 
              type="button" 
              onClick={() => setTapHistory([])}
              className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
            >
              Bersihkan
            </button>
          </div>
          <div className="space-y-2">
            {tapHistory.map((item, idx) => (
              <div 
                key={item.id}
                className={`p-3.5 rounded-xl border flex items-center justify-between shadow-xs transition-all duration-300 animate-in fade-in slide-in-from-top-3 ${
                  idx === 0 ? 'ring-2 ring-indigo-500/20 scale-[1.01]' : 'opacity-85'
                } ${
                  item.type === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                    item.type === 'success' ? 'bg-emerald-500 text-white shadow-xs' : 'bg-rose-500 text-white shadow-xs'
                  }`}>
                    {item.type === 'success' ? '✓' : '✕'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs sm:text-sm uppercase tracking-tight truncate">{item.message}</span>
                      {idx === 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-600 text-white uppercase shrink-0">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] opacity-75 font-medium mt-0.5">Waktu Tap: {item.time} WIB</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
