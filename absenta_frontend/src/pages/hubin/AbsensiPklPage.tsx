import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hubinApi } from '../../api/hubin.api';
import type { AbsensiPkl, SiswaPkl } from '../../api/hubin.api';
import { 
  Building2, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  CheckSquare,
  History,
  FileText,
  RefreshCw,
  Printer,
  MessageCircle,
  UserCheck
} from 'lucide-react';
import * as Lucide from 'lucide-react';
const ClipIcon = Lucide.ClipboardList;
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

import { useAuthStore } from '../../store/authStore';
import { getMyTenant } from '../../api/tenants.api';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Tabs, TabsTrigger, SectionCard, Loader } from '../../components/ui';
import * as UI from '../../components/ui';
const MenuTabs = UI.TabsList;

// Lazy Loaded Components
const HubinStudentView = lazy(() => import('../../components/hubin/HubinStudentView').then(m => ({ default: m.HubinStudentView })));
const HubinManagementView = lazy(() => import('../../components/hubin/HubinManagementView').then(m => ({ default: m.HubinManagementView })));
const HubinLogbookEditModal = lazy(() => import('../../components/hubin/HubinLogbookEditModal').then(m => ({ default: m.HubinLogbookEditModal })));
const HubinPrintJurnalPkl = lazy(() => import('../../components/hubin/HubinPrintJurnalPkl').then(m => ({ default: m.HubinPrintJurnalPkl })));

import { 
  renderActivityText, 
  renderActivityTextForPrint, 
  renderActivityImagesForPrint,
  getDriveThumbnailUrl,
  type SchoolTenantInfo,
  type GeolocationPositionWithMock,
  type UserAuthStore,
  type ActivityItem,
  type ApiErrorResponse,
  type CheckInPayload
} from '../../utils/hubinUtils';

interface SiswaPklWithAbsensi extends SiswaPkl {
  AbsensiPkl?: AbsensiPkl[];
}


export const AbsensiPklSection: React.FC<{ hideLayout?: boolean }> = ({ hideLayout = false }) => {
  const { user, subscription } = useAuthStore();
  const queryClient = useQueryClient();
  
  // -- Local State --
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isSpoofedLocation, setIsSpoofedLocation] = useState(false);
  const [kegiatan, setKegiatan] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [newActivityPhotoUrl, setNewActivityPhotoUrl] = useState('');
  const [jurnalUrl, setJurnalUrl] = useState('');
  const [newActivityTime, setNewActivityTime] = useState('');
  const [newActivityText, setNewActivityText] = useState('');
  const [isAddingActivity, setIsAddingActivity] = useState(false);

  // Auto-set current time when opening new journal form
  useEffect(() => {
    if (isAddingActivity) {
      setNewActivityTime(format(new Date(), 'HH:mm'));
    }
  }, [isAddingActivity]);

  const [isPrintingJurnal, setIsPrintingJurnal] = useState(false);
  const [tenantInfo, setTenantInfo] = useState<SchoolTenantInfo | null>(null);

  // -- Print Handler --
  const handlePrint = useCallback(async () => {
    setIsPrintingJurnal(true);
    // Tunggu render dan gambar selesai dimuat
    setTimeout(() => {
      window.print();
      setIsPrintingJurnal(false);
    }, 1500);
  }, []);
  const [editingAbsensi, setEditingAbsensi] = useState<AbsensiPkl | null>(null);
  const [editingActivities, setEditingActivities] = useState<{ time: string; text: string; image_url?: string }[]>([]);
  const [quickAddTexts, setQuickAddTexts] = useState<Record<string, string>>({});

  // -- Feature Gating --
  const features = (subscription as { features?: string[] })?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  // Perbaiki logika gating agar tidak mengunci modul jika user memiliki izin HUBIN
  const hasHubinFeature = Array.isArray(features) && features.includes('HUBIN');
  const isEnabled = subscription !== undefined && hasHubinFeature;
  const isStudent = user?.role?.name === 'SISWA';

  // -- Data Fetching (Tenant Info via React Query) --
  const { data: tenantRes } = useQuery({
    queryKey: ['my-tenant-info', user?.tenant_id],
    queryFn: () => getMyTenant(),
    enabled: !!user?.tenant_id,
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (tenantRes?.success && tenantRes?.data) {
      setTenantInfo(tenantRes.data as SchoolTenantInfo);
    }
  }, [tenantRes]);

  // -- React Query Hooks (emptyState handled in child views) --
  const { data: penempatanData, isLoading: isLoadingAll } = useQuery({
    queryKey: ['penempatan-pkl', { limit: 100 }],
    queryFn: () => hubinApi.getPenempatan({ limit: 100 }),
    enabled: isEnabled && !isStudent
  });

  const { data: myPenempatan, isLoading: isLoadingMe } = useQuery({
    queryKey: ['hubin-penempatan-me'],
    queryFn: () => hubinApi.getMyPenempatan(),
    enabled: isEnabled && isStudent
  });

  const isLoading = isStudent ? isLoadingMe : isLoadingAll;
  const rawPenempatan = useMemo(() => {
    return Array.isArray(penempatanData?.data) ? (penempatanData.data as SiswaPklWithAbsensi[]) : (penempatanData as { data?: SiswaPklWithAbsensi[] })?.data || [];
  }, [penempatanData]);
  // Empty state guard: deteksi kondisi data PKL kosong untuk Pilar 8
  const isEmpty = !isLoading && rawPenempatan.length === 0 && !isStudent;

  const studentPkl = useMemo(() => {
    if (isStudent) return (myPenempatan as { data?: SiswaPklWithAbsensi })?.data || myPenempatan;
    const authUser = user as UserAuthStore;
    return rawPenempatan.find((p: SiswaPklWithAbsensi) => p.siswa_id === authUser?.siswa_id || p.siswa_id === authUser?.id);
  }, [isStudent, myPenempatan, rawPenempatan, user]);

  const { data: absensiData } = useQuery({
    queryKey: ['absensi-pkl-history', studentPkl?.id],
    queryFn: () => hubinApi.getAbsensi(studentPkl?.id, { limit: 100 }),
    enabled: !!studentPkl?.id && isEnabled,
  });

  const rawAbsensiHistory = useMemo(() => {
    return Array.isArray(absensiData?.data) ? (absensiData.data as AbsensiPkl[]) : (absensiData as { data?: AbsensiPkl[] })?.data || [];
  }, [absensiData]);

  const caps = (user as UserAuthStore)?.capabilities || (user as UserAuthStore)?.Role?.rolePermissions?.map((rp) => rp.permission_id) || [];
  const isGlobalHubin = caps.includes('hubin.partners.manage') || 
                       user?.role?.name === 'ADMIN' ||
                       (user as UserAuthStore)?.position_codes?.includes('HUBIN');

  const visibleTabsCount = useMemo(() => {
    if (isStudent) return 3; // Presensi, Riwayat, Portofolio
    return 1; // Monitoring is always there for teachers
  }, [isStudent]);

  // -- Mutations --

  const checkInMutation = useMutation({
    mutationFn: (data: CheckInPayload) => hubinApi.checkIn(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Check-in Berhasil!');
      setKegiatan(''); setFotoUrl('');
    },
    onError: (error: unknown) => {
      const errorMsg = error && typeof error === 'object' && 'response' in error ? ((error as ApiErrorResponse).response?.data?.message || 'Gagal Check-in') : 'Gagal Check-in';
      toast.error(errorMsg);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (data: CheckInPayload) => hubinApi.checkOut(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Check-out Berhasil! Sampai jumpa besok.');
      setKegiatan(''); setFotoUrl('');
    },
    onError: (error: unknown) => {
      const errorMsg = error && typeof error === 'object' && 'response' in error ? ((error as ApiErrorResponse).response?.data?.message || 'Gagal Check-out') : 'Gagal Check-out';
      toast.error(errorMsg);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => hubinApi.verifyAbsensi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Absensi Berhasil Diverifikasi');
    },
  });

  const submitJurnalMutation = useMutation({
    mutationFn: (url: string) => hubinApi.submitJurnalPortofolio(studentPkl.id, url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Jurnal & Portofolio Akhir berhasil dikumpulkan!');
    },
    onError: (error: unknown) => {
      const errorMsg = error && typeof error === 'object' && 'response' in error ? ((error as ApiErrorResponse).response?.data?.message || 'Gagal mengumpulkan jurnal') : 'Gagal mengumpulkan jurnal';
      toast.error(errorMsg);
    },
  });

  const updateLogbookMutation = useMutation({
    mutationFn: ({ keg, absensiId }: { keg: string; absensiId?: string }) => hubinApi.updateLogbook(studentPkl.id, keg, absensiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absensi-pkl-history'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      toast.success('Jurnal kegiatan berhasil diperbarui!');
      setEditingAbsensi(null);
    },
    onError: (error: unknown) => {
      const errorMsg = error && typeof error === 'object' && 'response' in error ? ((error as ApiErrorResponse).response?.data?.message || 'Gagal menyimpan jurnal') : 'Gagal menyimpan jurnal';
      toast.error(errorMsg);
    },
  });

  // -- Business Logic --
  const refreshLocation = useCallback(() => {
    // SIMULATION MODE for Non-HTTPS Preview
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      toast.success("SIMULASI: Menggunakan koordinat Mitra (HTTP Mode)", { id: 'gps-loading' });
      if (studentPkl?.Mitra?.latitude && studentPkl?.Mitra?.longitude) {
        setLocation({ lat: studentPkl.Mitra.latitude, lng: studentPkl.Mitra.longitude });
      } else {
        setLocation({ lat: -6.200000, lng: 106.816666 }); // Default Jakarta if no mitra
      }
      return;
    }

    if ("geolocation" in navigator) {
      toast.loading("Memperbarui posisi GPS...", { id: 'gps-loading', duration: 2000 });
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos = pos as GeolocationPositionWithMock;
          const isSpoofed = geoPos.mocked || geoPos.coords.isFromMockProvider;
          
          // Anti-Fraud Logic: Check for suspiciously perfect accuracy or mock flags
          if (isSpoofed) {
            setIsSpoofedLocation(true);
            toast.error("Terdeteksi penggunaan Lokasi Palsu (Fake GPS)!", { id: 'gps-loading' });
            return;
          }

          // Real GPS usually has accuracy between 3m to 30m. 
          // Fake GPS often returns exactly 0, 1, or very high values.
          if (pos.coords.accuracy < 1) {
             console.warn("Suspiciously high accuracy detected, possible spoofing.");
          }

          setLocation({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
          setIsSpoofedLocation(false);
          toast.success("Posisi GPS diperbarui", { id: 'gps-loading' });
        },
        (err) => {
          console.error("Error getting location:", err);
          const msg = err.code === 1 ? "Akses lokasi ditolak." : "Gagal mendapatkan lokasi.";
          toast.error(msg, { id: 'gps-loading' });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [studentPkl]);

  useEffect(() => {
    if (!user) return;

    // Auto-Simulate location if on HTTP preview
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      console.warn("Geolocation disabled on HTTP. Enabling Simulation Mode.");
      if (studentPkl?.Mitra?.latitude) {
        setLocation({ lat: studentPkl.Mitra.latitude, lng: studentPkl.Mitra.longitude });
      }
      return;
    }

    let watchId: number;
    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const geoPos = pos as GeolocationPositionWithMock;
          const isSpoofed = geoPos.mocked || geoPos.coords.isFromMockProvider;
          if (isSpoofed) {
            setIsSpoofedLocation(true);
            return;
          }
          setLocation({ 
            lat: pos.coords.latitude, 
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
          setIsSpoofedLocation(false);
        },
        (err) => console.error("Error watching location:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, studentPkl?.Mitra]);

  const todayAbsensi = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return rawAbsensiHistory.find((a: AbsensiPkl) => format(new Date(a.tanggal), 'yyyy-MM-dd') === todayStr);
  }, [rawAbsensiHistory]);

  const parsedTimeline = useMemo(() => {
    if (!todayAbsensi?.kegiatan) return [];
    try {
      const parsed = JSON.parse(todayAbsensi.kegiatan);
      return Array.isArray(parsed) ? [...parsed].sort((a, b) => b.time.localeCompare(a.time)) : [];
    } catch (e) {
      return [];
    }
  }, [todayAbsensi]);

  const handleOpenAddActivity = useCallback(() => {
    if (!todayAbsensi?.jam_masuk) {
      toast.error('Anda harus melakukan Check-In terlebih dahulu sebelum mencatat jurnal kegiatan!');
      return;
    }
    setIsAddingActivity(true);
  }, [todayAbsensi]);

  const handleSaveNewActivity = useCallback((updatedActivities: { time: string; text: string; image_url?: string }[]) => {
    updateLogbookMutation.mutate({ keg: JSON.stringify(updatedActivities) });
    setIsAddingActivity(false);
    setNewActivityText('');
    setNewActivityPhotoUrl('');
  }, [updateLogbookMutation]);

  const currentStudentClassName = useMemo(() => studentPkl?.Siswa?.Kelas?.nama_kelas || studentPkl?.Siswa?.Kelas?.nama || 'Kelas_Umum', [studentPkl]);

  const formatWhatsAppLink = useCallback((phone: string, text: string) => {
    if (!phone) return '';
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    } else if (cleaned.startsWith('8')) {
      cleaned = '62' + cleaned;
    }
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
  }, []);

  const generateCustomFileName = useCallback((suffix: string) => {
    const name = (user?.full_name || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
    const className = currentStudentClassName.replace(/[^a-zA-Z0-9]/g, '_');
    return `${className}_${name}_${format(new Date(), 'dd-MM-yyyy')}_${suffix}`;
  }, [user, currentStudentClassName]);

  const generateActivityFileName = useCallback((time: string, text: string) => {
    const cleanActivity = (text || 'kegiatan').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    return generateCustomFileName(`${cleanActivity}.jpg`);
  }, [generateCustomFileName]);

  // -- Stats --
  const stats = useMemo(() => {
    if (isStudent) {
      return [
        { title: 'Mitra PKL', value: studentPkl?.Mitra?.nama || 'Belum Ditempatkan', icon: <ClipIcon size={24} />, gradient: 'from-blue-500 to-indigo-600' },
        { title: 'Total Kehadiran', value: rawAbsensiHistory.filter((a: AbsensiPkl) => a.status === 'HADIR').length, icon: <Calendar size={24} />, gradient: 'from-emerald-400 to-teal-600' },
        { 
          title: 'Sisa Hari Estimasi', 
          value: studentPkl?.tanggal_selesai ? Math.max(0, Math.ceil((new Date(studentPkl.tanggal_selesai).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : '-', 
          icon: <Clock size={24} />, 
          gradient: 'from-amber-400 to-orange-600' 
        }
      ];
    }
    return [
      { title: 'Siswa PKL', value: rawPenempatan.length, icon: <ClipIcon size={24} />, gradient: 'from-blue-500 to-indigo-600' },
      { 
        title: 'Hadir Hari Ini', 
        value: rawPenempatan.filter((p: SiswaPklWithAbsensi) => p.AbsensiPkl?.some((a: AbsensiPkl) => format(new Date(a.tanggal), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && a.status === 'HADIR')).length, 
        icon: <CheckSquare size={24} />, 
        gradient: 'from-emerald-400 to-teal-600' 
      },
      { 
        title: 'Perlu Verifikasi', 
        value: rawPenempatan.reduce((sum: number, p: SiswaPklWithAbsensi) => sum + (p.AbsensiPkl?.filter((a: AbsensiPkl) => !a.is_verified).length || 0), 0), 
        icon: <ShieldCheck size={24} />, 
        gradient: 'from-rose-500 to-red-600' 
      }
    ];
  }, [isStudent, studentPkl, rawAbsensiHistory, rawPenempatan]);

  const content = (
    <>
      {/* Operational Divider */}
      <div className="h-px bg-slate-200 dark:bg-slate-800 w-full mb-6 mt-2" />

      {/* If embedded in tab and is student, show placement info at top */}
      {hideLayout && isStudent && studentPkl && (
        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm mb-6">
          <div className="flex-1 min-w-[150px]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mitra PKL Anda</span>
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{studentPkl.Mitra?.nama}</span>
            </div>
          </div>
          <div className="flex-1 min-w-[150px]">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Guru Pembimbing</span>
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-300">{studentPkl.Pembimbing?.nama_guru || '-'}</span>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto print:hidden">
        <SectionCard title={isStudent ? "Presensi & Jurnal Kegiatan" : "Monitoring Absensi PKL"} icon={ClipIcon} fullWidth noPadding>
          <div className="p-6">
            <Tabs defaultValue={isStudent ? "record" : "management"}>
              {visibleTabsCount > 1 && (
                <div className="flex justify-between items-center mb-6">
                  <MenuTabs className="h-10 bg-slate-100/80 dark:bg-slate-950/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm">
                    {isStudent ? (
                      <>
                        <TabsTrigger value="record" className="px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                          <Clock size={12} className="mr-2" /> Presensi
                        </TabsTrigger>
                        <TabsTrigger value="jurnal" className="px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                          <History size={12} className="mr-2" /> Riwayat
                        </TabsTrigger>
                        <TabsTrigger value="portofolio" className="px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                          <ClipIcon size={12} className="mr-2" /> Portofolio
                        </TabsTrigger>
                      </>
                    ) : (
                      <>
                        <TabsTrigger value="management" className="px-4 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600">
                          <ShieldCheck size={12} className="mr-2" /> Monitoring
                        </TabsTrigger>
                      </>
                    )}
                  </MenuTabs>
                </div>
              )}

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <RefreshCw className="animate-spin text-indigo-500" size={32} />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memuat Data PKL...</p>
                </div>
              ) : isStudent ? (
                <>
                  <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
                    <HubinStudentView
                      user={user} studentPkl={studentPkl} todayAbsensi={todayAbsensi} location={location}
                      isMockLocation={isSpoofedLocation}
                      kegiatan={kegiatan} setKegiatan={setKegiatan} fotoUrl={fotoUrl} setFotoUrl={setFotoUrl}
                      checkInMutation={checkInMutation} checkOutMutation={checkOutMutation}
                      onRefreshLocation={refreshLocation}
                      rawAbsensiHistory={rawAbsensiHistory}
                      parsedTimeline={parsedTimeline}
                      onDeleteActivity={(idx) => {
                        const updated = [...parsedTimeline].filter((_, i) => i !== idx).sort((a, b) => a.time.localeCompare(b.time));
                        updateLogbookMutation.mutate({ keg: JSON.stringify(updated) });
                      }}
                      onOpenAddModal={handleOpenAddActivity}
                      jurnalUrl={jurnalUrl} setJurnalUrl={setJurnalUrl}
                      submitJurnalMutation={submitJurnalMutation}
                      stats={stats} generateCustomFileName={generateCustomFileName}
                      onPrint={handlePrint}
                    />
                  </Suspense>

                  <Suspense fallback={null}>
                    <HubinLogbookEditModal
                      isOpen={isAddingActivity}
                      onClose={() => setIsAddingActivity(false)}
                      editingAbsensi={todayAbsensi || ({ tanggal: new Date().toISOString() } as AbsensiPkl)}
                      editingActivities={[{ time: newActivityTime, text: newActivityText, image_url: newActivityPhotoUrl }]}
                      setEditingActivities={(activities) => {
                        if (activities.length > 0) {
                          setNewActivityTime(activities[0].time);
                          setNewActivityText(activities[0].text);
                          setNewActivityPhotoUrl(activities[0].image_url || '');
                        }
                      }}
                      isPending={updateLogbookMutation.isPending}
                      onSave={(activities) => {
                        const newEntry = activities[0];
                        if (!newEntry.time || !newEntry.text.trim()) return toast.error('Harap isi jam dan deskripsi!');
                        const updated = [...parsedTimeline, { ...newEntry, text: newEntry.text.trim() }].sort((a, b) => a.time.localeCompare(b.time));
                        handleSaveNewActivity(updated);
                      }}
                      userEmail={user?.email}
                      studentClassName={currentStudentClassName}
                      generateActivityFileName={generateActivityFileName}
                    />
                  </Suspense>
                </>
              ) : (
                <Suspense fallback={<div className="flex justify-center p-8"><Loader size="lg" /></div>}>
                  <HubinManagementView
                    rawPenempatan={rawPenempatan} isLoading={isLoading} onVerify={verifyMutation.mutate}
                    onQuickAddForId={(abs: AbsensiPkl, text: string) => {
                      let parsed: ActivityItem[] = [];
                      try { 
                        parsed = JSON.parse(abs.kegiatan || '[]') as ActivityItem[]; 
                      } catch (e) { 
                        console.error('Failed to parse kegiatan:', e);
                      }
                      const updated = [...(Array.isArray(parsed) ? parsed : []), { time: format(new Date(), 'HH:mm'), text: text.trim() }].sort((a, b) => a.time.localeCompare(b.time));
                      updateLogbookMutation.mutate({ keg: JSON.stringify(updated), absensiId: abs.id });
                    }}
                    onEditLogbook={setEditingAbsensi} quickAddTexts={quickAddTexts} setQuickAddTexts={setQuickAddTexts}
                    renderActivityText={renderActivityText} getDriveThumbnailUrl={getDriveThumbnailUrl}
                    isGlobalHubin={isGlobalHubin}
                  />
                </Suspense>
              )}
            </Tabs>
          </div>
        </SectionCard>
      </div>

      {/* PRINT PORTAL */}
      {isPrintingJurnal && typeof document !== 'undefined' && createPortal(
        <Suspense fallback={null}>
          <HubinPrintJurnalPkl
            user={user} studentPkl={studentPkl} rawAbsensiHistory={rawAbsensiHistory} tenantInfo={tenantInfo}
            renderActivityTextForPrint={renderActivityTextForPrint} renderActivityImagesForPrint={renderActivityImagesForPrint}
          />
        </Suspense>, document.body
      )}

      {/* EDIT MODAL */}
      <Suspense fallback={null}>
        <HubinLogbookEditModal
          isOpen={!!editingAbsensi} onClose={() => setEditingAbsensi(null)}
          editingAbsensi={editingAbsensi} editingActivities={editingActivities} setEditingActivities={setEditingActivities}
          isPending={updateLogbookMutation.isPending} userEmail={user?.email} studentClassName={currentStudentClassName}
          generateActivityFileName={generateActivityFileName}
          onSave={(acts) => {
            const valid = acts.filter(a => a.text.trim() !== '').sort((a, b) => a.time.localeCompare(b.time));
            updateLogbookMutation.mutate({ keg: JSON.stringify(valid), absensiId: editingAbsensi?.id });
          }}
        />
      </Suspense>
    </>
  );

  if (hideLayout) {
    return <div className="space-y-6">{content}</div>;
  }

  return (
    <PremiumFeatureGate moduleName="HUBIN" featureName="Presensi & Absensi PKL">
      <AcademicPageLayout
        breadcrumbs={[{ label: 'Dashboard', path: '/dashboard' }, { label: 'Absensi PKL', path: '/hubin/absensi' }]}
        canView={isEnabled}
        permissionMessage="Modul Absensi PKL tidak aktif atau Anda tidak memiliki akses HUBIN."
        title={isStudent ? "ABSENSI PKL" : "MONITORING ABSENSI"}
        description={isStudent ? format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeID }) : "Verifikasi kehadiran & jurnal kegiatan siswa PKL"}
        hardeningModuleKey="hubin_absensi_pkl"
        instruction={{
          title: "Panduan Absensi & Presensi PKL",
          description: "Lakukan pencatatan kehadiran harian dan jurnal kegiatan praktik kerja lapangan secara digital.",
          items: [
            { text: "Lakukan Check-In di pagi hari saat tiba di lokasi PKL dan isi jurnal kegiatan harian." },
            { text: "Lakukan Check-Out di sore hari saat menyelesaikan jam praktik kerja." },
            { text: "Pastikan posisi GPS Anda aktif dan akurat sebelum melakukan absensi." }
          ]
        }}
        toolbar={isStudent ? (
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-0 w-full md:w-auto md:max-w-full">
            {/* Divider Vertikal - Adaptive spacing */}
            <div className="hidden md:block h-12 w-px bg-slate-200 dark:bg-slate-800 mx-2 lg:mx-10 shrink-0" />
            
            {/* Kolom 2: Kartu Informasi Tempat PKL & Stats - Compact on MD, Roomy on LG */}
            <div className="flex flex-wrap md:flex-nowrap items-center gap-y-4 gap-x-2 md:gap-2 lg:gap-4 bg-white dark:bg-slate-900 p-3 md:p-1.5 lg:p-2.5 px-4 md:px-2 lg:px-7 rounded-xl md:rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md w-full md:w-auto">
              <div className="flex flex-col pr-2 md:pr-2 lg:pr-10 border-r border-slate-100 dark:border-slate-800 flex-1 md:flex-initial min-w-[140px] md:min-w-0 md:shrink">
                <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Lokasi Penempatan</span>
                <div className="flex items-start gap-1.5 md:gap-2">
                  <div className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center shrink-0 mt-0.5">
                    <Building2 size="14" className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-[9px] md:text-[10px] lg:text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase leading-[1.2] max-w-[150px] md:max-w-[100px] lg:max-w-[200px] break-words line-clamp-2">
                    {studentPkl?.Mitra?.nama}
                  </span>
                </div>
              </div>

              <div className="flex flex-col pr-2 md:pr-2 lg:pr-10 md:border-r border-slate-100 dark:border-slate-800 flex-1 md:flex-initial min-w-[120px] md:min-w-0 md:shrink">
                <span className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">Pembimbing</span>
                <div className="flex items-start gap-1.5 md:gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center shrink-0 mt-0.5">
                    <UserCheck size="14" className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-[9px] md:text-[10px] lg:text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase leading-[1.2] max-w-[120px] md:max-w-[90px] lg:max-w-[180px] break-words line-clamp-2">
                    {studentPkl?.Pembimbing?.nama_guru || '-'}
                  </span>
                </div>
              </div>

              {/* Stats Group - Optimized for desktop space */}
              <div className="flex flex-row items-center gap-2 lg:gap-5 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 md:pl-1 lg:pl-2 border-slate-50 dark:border-slate-800 md:shrink-0">
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 px-2 lg:px-5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex-1 md:flex-none min-w-[45px] lg:min-w-[65px] h-[42px] lg:h-[48px]">
                  <span className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase leading-none mb-1.5">Hub. Pembimbing</span>
                  <a
                    href={studentPkl?.Pembimbing?.no_hp ? formatWhatsAppLink(studentPkl.Pembimbing.no_hp, `Halo Pak/Bu ${studentPkl.Pembimbing.nama_guru}, saya ${user?.full_name} ingin berkonsultasi mengenai PKL.`) : '#'}
                    target={studentPkl?.Pembimbing?.no_hp ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center transition-all ${
                      studentPkl?.Pembimbing?.no_hp 
                        ? 'text-emerald-500 hover:text-emerald-600 hover:scale-110 active:scale-95' 
                        : 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                    }`}
                    title={studentPkl?.Pembimbing?.no_hp ? "Hubungi via WhatsApp" : "Nomor HP tidak tersedia"}
                    onClick={(e) => { if (!studentPkl?.Pembimbing?.no_hp) e.preventDefault(); }}
                  >
                    <svg 
                      viewBox="0 0 24 24" 
                      width="18" 
                      height="18" 
                      fill="currentColor" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.394 0 12.03c0 2.122.554 4.197 1.604 6.046L0 24l6.117-1.605a11.837 11.837 0 005.925 1.586h.005c6.632 0 12.032-5.396 12.034-12.032a11.77 11.77 0 00-3.411-8.497z"/>
                    </svg>
                  </a>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 px-2.5 lg:px-5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex-1 md:flex-none min-w-[45px] lg:min-w-[65px] h-[42px] lg:h-[48px]">
                  <span className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase leading-none mb-1.5">Hadir</span>
                  <span className="text-[11px] md:text-[13px] font-black text-indigo-600 dark:text-indigo-400 leading-none">
                    {rawAbsensiHistory.filter((a) => a.status === 'HADIR').length}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 px-2.5 lg:px-5 py-2 rounded-xl border border-slate-100 dark:border-slate-700 flex-1 md:flex-none min-w-[45px] lg:min-w-[65px] h-[42px] lg:h-[48px]">
                  <span className="text-[6px] md:text-[7px] font-black text-slate-400 uppercase leading-none mb-1.5">Entri Jurnal</span>
                  <span className="text-[11px] md:text-[13px] font-black text-emerald-600 dark:text-emerald-400 leading-none">
                    {parsedTimeline.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      >
        {content}
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
};

const AbsensiPklPage = () => <AbsensiPklSection hideLayout={false} />;
export default AbsensiPklPage;
