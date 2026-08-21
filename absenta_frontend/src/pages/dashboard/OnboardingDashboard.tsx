import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import axiosInstance from '@/lib/axiosInstance';
import { getPrepChecklist, type PrepChecklistData } from '@/api/academic/cetak-berkas.api';
import { easyTunnelApi } from '@/api/easyTunnel.api';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Globe, 
  School, 
  Layers, 
  Info, 
  Loader2, 
  Calendar, 
  UserCheck, 
  BookOpen, 
  Smile, 
  Settings 
} from 'lucide-react';

export default function OnboardingDashboard({ mode = 'page', onClose }: { mode?: 'page' | 'modal'; onClose?: () => void }) {
  const navigate = useNavigate();
  const { user, subscription, markOnboardingCompleted, isLoading: isAuthLoading } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [checklistData, setChecklistData] = useState<PrepChecklistData | null>(null);

  const [isPublic, setIsPublic] = useState(false);

  // 2. Extract active features/modules
  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  
  const isModuleActive = (moduleKey: string) => {
    if (moduleKey === 'ACADEMIC' || moduleKey === 'RAPOR') return true; // Always active
    return Array.isArray(features) && features.includes(moduleKey);
  };

  const loadOnboardingData = useCallback(async () => {
    try {
      setLoading(true);
      const [tenantInfoRes, checklistRes, tunnelsRes] = await Promise.allSettled([
        axiosInstance.get('/auth/tenant-info'),
        getPrepChecklist(),
        easyTunnelApi.getTunnels()
      ]);

      let publicActive = false;

      if (tenantInfoRes.status === 'fulfilled' && tenantInfoRes.value.data?.success) {
        const tenant = tenantInfoRes.value.data.data;
        // Profile is considered completed if school has configured address, logo, and phone
        if (tenant?.logo_url && tenant?.address && tenant?.phone) {
          setProfileCompleted(true);
        } else {
          setProfileCompleted(false);
        }
        if (tenant?.is_tunnel_active) {
          publicActive = true;
        }
      }

      if (tunnelsRes.status === 'fulfilled' && tunnelsRes.value?.success) {
        const tunnels = Array.isArray(tunnelsRes.value.data) ? tunnelsRes.value.data : [];
        const hasConnectedTunnel = tunnels.some((t: any) => 
          t.status === 'active' || 
          t.status === 'connected' || 
          t.wg_status?.status === 'connected'
        );
        if (hasConnectedTunnel) {
          publicActive = true;
        }
      }

      setIsPublic(publicActive);

      if (checklistRes.status === 'fulfilled' && checklistRes.value.success) {
        setChecklistData(checklistRes.value.data);
      }
    } catch (err) {
      console.error('[OnboardingDashboard] Failed to fetch setup checklist:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOnboardingData();
  }, [loadOnboardingData]);

  if (isAuthLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-medium text-slate-500">Memuat status konfigurasi platform...</span>
      </div>
    );
  }

  const handleContinue = () => {
    markOnboardingCompleted();
    if (mode === 'modal') {
      onClose && onClose();
      return;
    }
    navigate('/dashboard');
  };

  const schoolName = user?.tenant?.name || 'Sekolah Anda';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans p-6 md:p-12 flex items-center justify-center">
      <div className="w-full max-w-5xl space-y-6">
        
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 md:p-10 text-white shadow-xl shadow-blue-500/10 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-12 translate-x-12">
            <School className="w-80 h-80" />
          </div>
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
              🚀 Setup Aplikasi Absenta
            </div>
            <h1 className="text-2xl md:text-3xl font-black">Selamat Datang di Portal Admin {schoolName}!</h1>
            <p className="text-white/80 text-sm max-w-2xl leading-relaxed">
              Platform Absenta Anda telah berhasil terpasang. Ikuti checklist di bawah ini untuk memastikan seluruh fitur berjalan dengan sempurna di sekolah Anda.
            </p>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Column: Platform & Modules */}
          <div className="md:col-span-5 space-y-6">
            
            {/* Status Platform */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Globe size={16} className="text-blue-500" />
                  Status Platform
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Akses Public */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Akses Publik / Online</p>
                    <p className="text-[10px] text-slate-400">Dapat diakses dari internet luar</p>
                  </div>
                  {isPublic ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} strokeWidth={3} /> Sudah
                      </span>
                      <button 
                        onClick={() => navigate('/settings?tab=easy_tunnel')}
                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        Atur
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate('/settings?tab=easy_tunnel')}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/50 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/50 transition-all animate-pulse"
                    >
                      Aktifkan
                    </button>
                  )}
                </div>

                {/* Profil Sekolah */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">Kelengkapan Profil Sekolah</p>
                    <p className="text-[10px] text-slate-400">Logo, alamat, dan nomor telepon</p>
                  </div>
                  {profileCompleted ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                        <CheckCircle size={12} strokeWidth={3} /> Sudah
                      </span>
                      <button 
                        onClick={() => navigate('/settings?tab=tenant_profile')}
                        className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => navigate('/settings?tab=tenant_profile')}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100/50 px-2.5 py-1 rounded-full border border-blue-100 dark:border-blue-900/50 transition-all"
                    >
                      Lengkapi
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Modul Aktif */}
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  Katalog & Modul Aktif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { key: 'ACADEMIC', label: 'ACADEMIC CORE (Akademik & Kelas)' },
                  { key: 'ABSENSI', label: 'ABSENSI (Tap Kartu & Absen Wajah)' },
                  { key: 'RAPOR', label: 'RAPOR (E-Rapor Digital)' },
                  { key: 'SARPRAS', label: 'SARPRAS (Sarana & Prasarana)' },
                  { key: 'HUBIN', label: 'HUBIN (Prakerin, PKL & Alumni)' },
                  { key: 'KOPERASI', label: 'KOPERASI (Keuangan & Kantin)' },
                  { key: 'CBT', label: 'CBT (Ujian & Bank Soal)' },
                ].map((mod) => {
                  const active = isModuleActive(mod.key);
                  return (
                    <div key={mod.key} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{mod.label}</span>
                      {active ? (
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-full">
                          Aktif
                        </span>
                      ) : (
                        <button 
                          onClick={() => navigate('/service-center?tab=catalog')}
                          className="text-[10px] font-black text-slate-400 hover:text-blue-600 px-2 py-0.5 border border-slate-200 dark:border-slate-700 rounded-full hover:border-blue-300 dark:hover:border-blue-900 transition-all"
                        >
                          Buka Kunci
                        </button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

          </div>

          {/* Right Column: System Checklist */}
          <div className="md:col-span-7">
            <Card className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm h-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <UserCheck size={16} className="text-violet-500" />
                  Kesiapan Data & Aplikasi
                </CardTitle>
                {checklistData && (
                  <span className="text-xs font-black bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                    {checklistData.completion_percentage}% Siap
                  </span>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                
                {checklistData?.checklist && checklistData.checklist.length > 0 ? (
                  <div className="space-y-3">
                    {checklistData.checklist.map((item) => (
                      <div 
                        key={item.key} 
                        className={`flex items-start justify-between p-3.5 rounded-xl border transition-all ${
                          item.completed 
                            ? 'bg-emerald-50/20 dark:bg-emerald-950/5 border-emerald-100/50 dark:border-emerald-900/30' 
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <div className="flex gap-3">
                          {item.completed ? (
                            <CheckCircle size={18} strokeWidth={3} className="text-emerald-600 mt-0.5 shrink-0" />
                          ) : (
                            <XCircle size={18} strokeWidth={3} className="text-slate-300 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">{item.label}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(item.action_path)}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all shrink-0 ml-4 ${
                            item.completed
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50/30 dark:border-emerald-900/40 dark:text-emerald-400'
                              : 'border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/40 dark:text-blue-400'
                          }`}
                        >
                          {item.completed ? 'Edit' : 'Setup'}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                    <Smile size={32} strokeWidth={1.5} className="text-slate-300" />
                    <span className="text-xs font-semibold">Seluruh data persiapan akademik siap digunakan.</span>
                  </div>
                )}

                {/* Warning note */}
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl flex gap-2.5 items-start">
                  <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold leading-relaxed">
                    Catatan: Checklist di atas diambil langsung dari verifikasi kesiapan sistem pada modul Akademik (Cetak Berkas). Anda tetap bisa menggunakan dashboard dan modul lain meskipun checklist belum mencapai 100%.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Action Section */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
          <div className="text-center sm:text-left space-y-1">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Kondisi Onboarding</h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-bold">
              Anda dapat membuka dashboard utama kapan saja. Onboarding ini tidak akan muncul kembali setelah Anda klik tombol di samping.
            </p>
          </div>
          <Button onClick={handleContinue} className="h-14 px-10 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-3 w-full sm:w-auto shrink-0 shadow-lg shadow-blue-500/20">
            Lanjutkan ke Dashboard Utama
            <ArrowRight size={18} strokeWidth={2.5} />
          </Button>
        </div>

      </div>
    </div>
  );
}
