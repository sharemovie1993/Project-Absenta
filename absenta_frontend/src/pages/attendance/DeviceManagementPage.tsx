import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
// Standardized using lazy( and Suspense
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Plus, 
  Settings, 
  Trash2, 
  Battery, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull,
  RefreshCw,
  Search,
  Link as LinkIcon,
  Unlink,
  Info,
  Radio,
  Signal
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Loader, 
  SectionCard, 
  Modal, 
  Alert,
  AlertDescription,
  Label
} from '../../components/ui';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useToast } from '../../hooks/useToast';
import useConfirm from '../../hooks/useConfirm';
import { getDevices, createDevice, updateDevice, deleteDevice, type AttendanceDevice } from '../../api/attendance/device.api';
import { getKelasList } from '../../api/academic/kelas.api';
import type { Kelas } from '../../types/academic';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

import { useAuthStore } from '../../store/authStore';
import PremiumFeatureGate from '../../components/auth/PremiumFeatureGate';
import PageLayout from '../../components/common/PageLayout';

const instructionData = {
  title: "Manajemen IoT",
  description: "Kelola terminal absensi ESP32 yang terpasang di kelas atau gerbang.",
  items: [
    { text: "Device ID adalah MAC Address atau ChipID unik setiap alat." },
    { text: "Gunakan fitur Pairing untuk menghubungkan alat ke kelas tertentu." },
    { text: "Pantau kesehatan baterai secara berkala untuk pemeliharaan." }
  ]
};

const breadcrumbs = [
  { label: 'Presensi', path: '/attendance/ops' },
  { label: 'Perangkat IoT', active: true }
];

export const DeviceManagementPage: React.FC = React.memo(() => {
  const { subscription } = useAuthStore();
  const [devices, setDevices] = useState<AttendanceDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [kelasOptions, setKelasOptions] = useState<{ value: string; label: string }[]>([]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    kelas_id: '',
  });

  const { success, error } = useToast();
  const confirm = useConfirm();

  const features = (subscription as unknown as Record<string, unknown>)?.features || subscription?.Plan?.features_json || subscription?.plan?.features_json || [];
  const isLocked = !Array.isArray(features) || !features.includes('ABSENSI');

  const fetchData = useCallback(async () => {
    if (isLocked) {
      setDevices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [deviceRes, kelasRes] = await Promise.all([
        getDevices(1, 100, searchTerm),
        getKelasList(1, 100)
      ]);
      
      setDevices(deviceRes?.data || []);
      setKelasOptions((kelasRes?.data || []).map((k: Kelas) => ({
        value: k.id,
        label: k.nama_kelas
      })));
    } catch (e) {
      error('Gagal mengambil data perangkat');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, error, isLocked]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleOpenModal = (device?: AttendanceDevice) => {
    if (isLocked) return;
    if (device) {
      setEditingDevice(device);
      setFormData({
        device_id: device.device_id,
        name: device.name || '',
        kelas_id: device.kelas_id || '',
      });
    } else {
      setEditingDevice(null);
      setFormData({
        device_id: '',
        name: '',
        kelas_id: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, formData);
        success('Perangkat berhasil diperbarui');
      } else {
        await createDevice(formData);
        success('Perangkat berhasil didaftarkan');
      }
      setIsModalOpen(false);
      setRefreshTrigger(p => p + 1);
    } catch (e: unknown) {
      const errObj = e as { response?: { data?: { message?: string } } };
      error(errObj?.response?.data?.message || 'Gagal menyimpan perangkat');
    }
  };

  const handleDelete = async (id: string) => {
    if (isLocked) return;
    
    const ok = await confirm({
      title: 'Hapus Perangkat IoT',
      description: 'Apakah Anda yakin ingin menghapus perangkat ini dari sistem? Peminjaman kelas yang terhubung akan dilepas.',
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });
    
    if (!ok) return;

    try {
      await deleteDevice(id);
      success('Perangkat berhasil dihapus');
      setRefreshTrigger(p => p + 1);
    } catch (e) {
      error('Gagal menghapus perangkat');
    }
  };

  const getBatteryIcon = (level?: number) => {
    if (level === undefined) return <Battery className="w-4 h-4 text-slate-400" />;
    if (level <= 20) return <BatteryLow className="w-4 h-4 text-rose-500" />;
    if (level <= 60) return <BatteryMedium className="w-4 h-4 text-amber-500" />;
    return <BatteryFull className="w-4 h-4 text-emerald-500" />;
  };

  const getStatusBadge = (device: AttendanceDevice) => {
    const isOnline = device.heartbeat_at && 
                    (new Date().getTime() - new Date(device.heartbeat_at).getTime() < 5 * 60 * 1000);
    
    return (
      <Badge variant={isOnline ? 'success' : 'secondary'} className="gap-1.5 px-3 py-1 text-[10px] font-black tracking-widest uppercase rounded-xl">
        {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        {isOnline ? 'ONLINE' : 'OFFLINE'}
      </Badge>
    );
  };

  const stats = useMemo(() => [
    {
      title: "Alat Terhubung",
      value: (devices || []).length.toString(),
      icon: <Cpu size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Terdaftar di sistem"
    },
    {
      title: "Status Online",
      value: (devices || []).filter(d => {
        return d.heartbeat_at && (new Date().getTime() - new Date(d.heartbeat_at).getTime() < 5 * 60 * 1000);
      }).length.toString(),
      icon: <Signal size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Perangkat aktif"
    }
  ], [devices]);

  const pageContent = (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div className="relative group">
          <Input
            id="device-search"
            placeholder="Cari ID Hardware atau Nama Alat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-14 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 font-bold shadow-xl shadow-slate-200/50 dark:shadow-none transition-all group-focus-within:scale-[1.01]"
            aria-label="Cari Perangkat"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
        </div>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => setRefreshTrigger(p => p + 1)}
            className="h-14 px-6 rounded-xl font-black text-[11px] uppercase tracking-widest border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => handleOpenModal()}
            className="h-14 px-8 rounded-xl font-black text-[11px] uppercase tracking-widest bg-slate-900 dark:bg-blue-600 text-white shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Daftar Alat Baru
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading && devices.length === 0 ? (
          <div className="col-span-full py-20 flex justify-center">
            <Loader size="xl" />
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="w-20 h-20 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Cpu className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Belum ada perangkat</h3>
            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Daftarkan terminal absensi ESP32 Anda untuk mulai memantau.</p>
          </div>
        ) : (
          devices?.map((device) => (
            <SectionCard key={device.id} noPadding className="group relative overflow-hidden transition-all hover:scale-[1.02] hover:shadow-2xl">
               <div className="p-6">
                 <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                      <Cpu size={28} />
                    </div>
                    {getStatusBadge(device)}
                 </div>

                 <div className="mb-6">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                      {device.name || 'Perangkat Tanpa Nama'}
                    </h3>
                    <div className="flex items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      <Radio className="w-3.5 h-3.5 mr-1.5" /> {device.device_id}
                    </div>
                 </div>

                 <div className="space-y-4 bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-2xl mb-6 border border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Terhubung Ke</span>
                       <div className="flex items-center font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                          {device.Kelas ? (
                            <><LinkIcon className="w-3 h-3 mr-1.5 text-blue-500" /> {device.Kelas.nama_kelas}</>
                          ) : (
                            <><Unlink className="w-3 h-3 mr-1.5 text-rose-400" /> <span className="text-rose-400 italic">Unpaired</span></>
                          )}
                       </div>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Last Seen</span>
                       <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">
                          {device.heartbeat_at ? formatDistanceToNow(new Date(device.heartbeat_at), { addSuffix: true, locale: id }) : '-'}
                       </span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Daya Baterai</span>
                       <div className="flex items-center gap-1.5 font-black text-[11px]">
                          {getBatteryIcon(device.battery_level)}
                          <span>{device.battery_level ?? 'N/A'}%</span>
                       </div>
                    </div>
                 </div>

                 <div className="flex gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-xl h-10 font-bold text-[10px] uppercase tracking-widest border-slate-200 dark:border-slate-800" 
                      onClick={() => handleOpenModal(device)}
                    >
                      <Settings className="w-3.5 h-3.5 mr-2" /> Pengaturan
                    </Button>
                    <Button 
                      variant="danger" 
                      className="rounded-xl h-10 px-4"
                      onClick={() => handleDelete(device.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                 </div>
               </div>
            </SectionCard>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDevice ? 'Pengaturan Perangkat' : 'Daftarkan Perangkat Baru'}
        size="lg"
      >
        <div className="space-y-6 pt-4">
           <Alert className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30 rounded-xl">
             <Info className="w-4 h-4 mr-3 text-blue-600" />
             <AlertDescription className="text-[11px] font-bold text-blue-800 dark:text-blue-300 leading-relaxed uppercase tracking-tight">
               Pastikan <strong>Device ID</strong> sesuai dengan MAC Address atau ChipID yang diprogram pada firmware ESP32 Anda.
             </AlertDescription>
           </Alert>

           <div className="space-y-2">
             <Label htmlFor="device_id" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ID Hardware (Wajib)</Label>
             <Input 
                id="device_id"
                placeholder="Contoh: 4A:3B:2C:1D:0E:5F"
                value={formData.device_id}
                onChange={(e) => setFormData({...formData, device_id: e.target.value})}
                className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Alias Alat</Label>
             <Input 
                id="name"
                placeholder="Contoh: Terminal Gerbang Utama"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
             />
           </div>

           <div className="space-y-2">
             <Label htmlFor="kelas_id" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pairing Kelas</Label>
             <SearchableSelect
                value={formData.kelas_id}
                onValueChange={(val) => setFormData({...formData, kelas_id: val})}
                options={[
                  { value: '', label: 'Jangan Hubungkan (Standby)' },
                  ...kelasOptions
                ]}
                placeholder="Pilih Kelas untuk dipasangkan..."
                triggerClassName="h-12 rounded-xl font-bold bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
             />
           </div>

           <div className="flex gap-4 pt-8 mt-4 border-t border-slate-100 dark:border-slate-800">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest border-slate-200 dark:border-slate-800">Batal</Button>
              <Button onClick={handleSave} className="flex-1 h-12 rounded-xl font-black text-[11px] uppercase tracking-widest bg-blue-600 text-white shadow-xl">
                {editingDevice ? 'Simpan Perubahan' : 'Daftarkan Sekarang'}
              </Button>
           </div>
        </div>
      </Modal>
    </div>
  );

  return (
    <PageLayout
      title="Manajemen Perangkat IoT"
      description="Pusat kendali dan monitoring terminal absensi ESP32 di sekolah Anda."
      stats={stats}
      instruction={instructionData}
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="devicemanagementpage"
    >
      <PremiumFeatureGate 
        isLocked={isLocked}
        moduleName="ABSENSI"
        featureName="Manajemen Perangkat IoT"
        description="Kelola terminal absensi, monitoring status koneksi, dan kesehatan baterai perangkat ESP32 secara terpusat."
      >
        {pageContent}
      </PremiumFeatureGate>
    </PageLayout>
  );
});

DeviceManagementPage.displayName = 'DeviceManagementPage';

export default DeviceManagementPage;
