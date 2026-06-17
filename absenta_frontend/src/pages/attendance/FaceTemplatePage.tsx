import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { 
  SectionCard, 
  Button, 
  Input, 
  Table, 
  EnhancedAlert, 
  Loader, 
  Modal, 
  Badge, 
  Alert, 
  AlertDescription 
} from '../../components/ui';
import { getFaceTemplates, enrollFaceTemplate, deleteFaceTemplate } from '../../api/attendanceGerbang.api';
import { siswaApi } from '../../api/academic.api';
import { dropdownApi, type DropdownOption } from '../../api/dropdown.api';
import { useAuth } from '../../hooks/useAuth';
import { useGerbangModeAndRole } from '../../hooks/attendance/useGerbangModeAndRole';
import { Camera, RefreshCcw, Plus, Search, Trash, ScanFace, ShieldCheck, Activity } from 'lucide-react';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';

import { SearchableSelect } from '@/components/ui/SearchableSelect';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { BiometricHudOverlay } from '../../components/attendance/ai/BiometricHudOverlay';
import PageLayout from '../../components/common/PageLayout';

export default function FaceTemplatePage() {
  const { subscription } = useAuthStore();
  const { user, can, isLoading: authLoading } = useAuth();

  const canView = useMemo(() => {
    return can('attendance.manage.face.templates');
  }, [can]);

  const features = (subscription as any)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  useGerbangModeAndRole({ user });

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kelasId, setKelasId] = useState<string>('');
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });

  const [showEnroll, setShowEnroll] = useState(false);

  const loadData = useCallback(async () => {
    if (isLocked) return;
    try {
      setLoading(true);
      const res = await getFaceTemplates({ 
        search: searchTerm || undefined, 
        kelas_id: kelasId || undefined, 
        limit: pagination.limit, 
        offset: pagination.offset 
      });
      setItems(res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat template');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, kelasId, pagination.limit, pagination.offset, isLocked]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (authLoading) return <div className="flex justify-center py-20"><Loader size="lg" /></div>;
  if (!canView) return <Alert variant="destructive" className="m-4"><AlertDescription>Akses Ditolak</AlertDescription></Alert>;

  const stats = [
    {
      title: "Template Terdaftar",
      value: items.length.toString(),
      icon: <ScanFace size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Basis data biometrik"
    },
    {
      title: "Status AI",
      value: "Ready",
      icon: <ShieldCheck size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Face API Loaded"
    }
  ];

  const instructionData = {
    title: "Panduan Rekam Wajah",
    description: "Daftarkan wajah siswa ke dalam sistem AI untuk fitur presensi nirsentuh.",
    items: [
      { text: "Pastikan pencahayaan cukup saat melakukan perekaman wajah." },
      { text: "Wajah harus menghadap kamera secara lurus tanpa kacamata hitam atau masker." },
      { text: "Sistem akan mengekstrak ciri wajah unik (descriptor) dan menyimpannya secara aman." }
    ]
  };

  const columns = [
    { 
      key: 'Siswa', 
      label: 'Siswa', 
      render: (v: any) => (
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
             <Camera size={18} />
           </div>
           <div>
             <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{v?.nama_siswa}</div>
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{v?.nis}</div>
           </div>
        </div>
      ) 
    },
    { 
      key: 'created_at', 
      label: 'Waktu Rekam', 
      render: (v: any) => (
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
          {new Date(v).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </span>
      )
    },
    { 
      key: 'source', 
      label: 'Sumber', 
      render: (v: any) => (
        <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border-slate-200 dark:border-slate-800">
          {v}
        </Badge>
      )
    },
    {
      key: 'actions',
      label: '',
      render: (_: any, row: any) => (
        <div className="flex justify-end">
          <Button variant="danger" size="sm" className="rounded-xl h-9 px-3" onClick={async () => {
             if(window.confirm('Hapus template wajah ini?')) {
               try {
                 await deleteFaceTemplate(row.id);
                 setSuccess('Template berhasil dihapus');
                 loadData();
               } catch (e) {
                 setError('Gagal menghapus template');
               }
             }
          }}>
            <Trash size={14} />
          </Button>
        </div>
      )
    }
  ];

  const pageContent = (
    <div className="space-y-6">
      {error && <EnhancedAlert variant="destructive" title="Kesalahan" description={error} dismissible onDismiss={() => setError(null)} />}
      {success && <EnhancedAlert variant="success" title="Berhasil" description={success} dismissible onDismiss={() => setSuccess(null)} />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="relative group">
          <Input 
            placeholder="Cari Nama Siswa atau NIS..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="pl-12 h-14 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold shadow-xl shadow-slate-200/50 dark:shadow-none transition-all group-focus-within:scale-[1.01]"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={() => setShowEnroll(true)} 
            disabled={isLocked}
            className="h-14 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all gap-2"
          >
            <Plus className="w-4 h-4" /> 
            Rekam Wajah Baru
          </Button>
        </div>
      </div>

      <SectionCard title="Daftar Template Wajah" icon={ScanFace} fullWidth noPadding>
        <div className="bg-white dark:bg-slate-950 overflow-hidden">
          <Table
            columns={columns}
            data={items}
            loading={loading}
            emptyMessage="Belum ada template wajah terdaftar. Klik Rekam Wajah Baru untuk memulai."
            compact={true}
            className="border-none"
          />
        </div>
      </SectionCard>
    </div>
  );

  return (
    <PageLayout
      title="Rekam Wajah Premium"
      description="Kelola basis data biometrik untuk fitur AI Face Recognition."
      stats={stats}
      instruction={instructionData}
    >
      <PremiumFeatureGate
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Biometrik Wajah (AI Recognition)"
        description="Gunakan teknologi AI untuk mengenali wajah siswa secara instan. Fitur ini memungkinkan presensi nirsentuh yang sangat akurat dan sulit dipalsukan."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
}
