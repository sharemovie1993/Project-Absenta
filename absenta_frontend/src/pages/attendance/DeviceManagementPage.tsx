import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Plus, 
  Settings, 
  Trash2, 
  BatteryLow, 
  BatteryMedium, 
  BatteryFull,
  RefreshCw,
  Search,
  Link as LinkIcon,
  Unlink,
  Radio,
  Signal
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Badge, 
  Loader, 
  SectionCard 
} from '@/components/ui';
import { toast } from 'react-hot-toast';
import useConfirm from '@/hooks/useConfirm';
import { getDevices, createDevice, updateDevice, deleteDevice, type AttendanceDevice } from '@/api/attendance/device.api';
import { getKelasList } from '@/api/academic/kelas.api';
import type { Kelas } from '@/types/academic';
import { formatDate } from '@/utils/layoutUtils';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';

// Lazy load modal
const DeviceFormModal = lazy(() => import('@/components/attendance/device/DeviceFormModal').then(m => ({ default: m.DeviceFormModal })));

// Zod Schema Validation Guard (Pilar 25)
const deviceFormSchema = z.object({
  device_id: z.string().min(1, 'Device ID / MAC Hardware wajib diisi'),
  name: z.string().min(1, 'Nama Terminal wajib diisi'),
  kelas_id: z.string().optional(),
});

export const DeviceManagementPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AttendanceDevice | null>(null);
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    kelas_id: '',
  });

  // React Query Fetching (Pilar 31)
  const { data: devices = [], isLoading: loadingDevices, refetch: refetchDevices } = useQuery<AttendanceDevice[]>({
    queryKey: ['attendance-devices-list', searchTerm],
    queryFn: async () => {
      const res = await getDevices(1, 100, searchTerm);
      return res?.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: kelasOptions = [] } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['kelas-options-for-device'],
    queryFn: async () => {
      const res = await getKelasList(1, 100);
      const list = res?.data ?? (Array.isArray(res) ? res : []);
      return (list ?? []).map((k: Kelas) => ({
        value: k.id,
        label: k.nama_kelas
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Mutations (Pilar 32 Cache Invalidation)
  const createMutation = useMutation({
    mutationFn: (data: { device_id: string; name: string; kelas_id: string }) => createDevice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices-list'] });
      toast.success('Perangkat baru berhasil didaftarkan');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal mendaftarkan perangkat');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { device_id: string; name: string; kelas_id: string } }) => updateDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices-list'] });
      toast.success('Perangkat berhasil diperbarui');
      setIsModalOpen(false);
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal memperbarui perangkat');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-devices-list'] });
      toast.success('Perangkat berhasil dihapus');
    },
    onError: (err: unknown) => {
      const errObj = err as { message?: string };
      toast.error(errObj.message || 'Gagal menghapus perangkat');
    }
  });

  const handleOpenModal = useCallback((device?: AttendanceDevice) => {
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
  }, []);

  const handleSave = useCallback(async () => {
    const parsed = deviceFormSchema.safeParse(formData);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data form tidak valid');
      return;
    }

    if (editingDevice) {
      await updateMutation.mutateAsync({ id: editingDevice.id, data: formData });
    } else {
      await createMutation.mutateAsync(formData);
    }
  }, [formData, editingDevice, updateMutation, createMutation]);

  const handleDelete = useCallback(async (device: AttendanceDevice) => {
    const ok = await confirm({
      title: 'Hapus Perangkat IoT?',
      description: `Apakah Anda yakin ingin menghapus perangkat "${device.name || device.device_id}"? Alat ini tidak akan dapat sinkron lagi.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      style: 'danger'
    });

    if (ok) {
      await deleteMutation.mutateAsync(device.id);
    }
  }, [confirm, deleteMutation]);

  const handleTogglePairing = useCallback(async (device: AttendanceDevice) => {
    if (device.kelas_id) {
      const ok = await confirm({
        title: 'Putus Sambungan Kelas?',
        description: `Putuskan hubungan perangkat "${device.name}" dari kelas ${device.kelas?.nama_kelas}?`,
        confirmText: 'Putuskan',
        cancelText: 'Batal',
        style: 'warning'
      });
      if (ok) {
        await updateMutation.mutateAsync({
          id: device.id,
          data: {
            device_id: device.device_id,
            name: device.name,
            kelas_id: ''
          }
        });
      }
    } else {
      handleOpenModal(device);
    }
  }, [confirm, updateMutation, handleOpenModal]);

  const getStatusBadge = useCallback((device: AttendanceDevice) => {
    if (!device.last_seen) {
      return <Badge variant="secondary" className="gap-1 text-[10px]"><WifiOff size={12} /> Belum Pernah Terhubung</Badge>;
    }
    const lastSeenDate = new Date(device.last_seen);
    const diffMinutes = (new Date().getTime() - lastSeenDate.getTime()) / (1000 * 60);

    if (diffMinutes < 5) {
      return <Badge variant="success" className="gap-1 text-[10px]"><Wifi size={12} /> Online</Badge>;
    } else if (diffMinutes < 60) {
      return <Badge variant="warning" className="gap-1 text-[10px]"><Radio size={12} /> Terputus ({Math.round(diffMinutes)}m lalu)</Badge>;
    } else {
      return <Badge variant="danger" className="gap-1 text-[10px]"><WifiOff size={12} /> Offline</Badge>;
    }
  }, []);

  const getBatteryIcon = useCallback((level?: number) => {
    if (level === undefined || level === null) return null;
    if (level <= 20) return <BatteryLow className="text-red-500" size={16} />;
    if (level <= 60) return <BatteryMedium className="text-yellow-500" size={16} />;
    return <BatteryFull className="text-green-500" size={16} />;
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Presensi', path: '/attendance' },
    { label: 'Perangkat IoT ESP32' }
  ], []);

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <PremiumFeatureGate feature="attendance_ops">
      <AcademicPageLayout
        title="Terminal & Perangkat IoT Presensi"
        description="Kelola terminal absensi cerdas (ESP32 / RFID / Fingerprint) yang terpasang di kelas dan gerbang sekolah."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="devicemanagementpage"
        topSlot={
          <div className="flex items-center justify-end gap-2">
            <Button 
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => refetchDevices()}
              disabled={loadingDevices}
              className="flex items-center gap-1.5 font-bold rounded-xl"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingDevices ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>
            <Button 
              variant="toolbarPrimary"
              size="toolbar"
              onClick={() => handleOpenModal()}
              className="flex items-center gap-1.5 font-bold rounded-xl shadow-md"
            >
              <Plus className="h-4 w-4" />
              Daftarkan Perangkat
            </Button>
          </div>
        }
        instruction={{
          title: "Panduan Manajemen IoT",
          description: "Kelola terminal absensi ESP32 yang terpasang di kelas atau gerbang.",
          items: [
            { text: "Device ID adalah MAC Address atau ChipID unik setiap alat." },
            { text: "Gunakan fitur Pairing untuk menghubungkan alat ke kelas tertentu." },
            { text: "Pantau kesehatan baterai dan koneksi secara berkala untuk pemeliharaan." }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <Input
                id="search-device-input"
                aria-label="Cari perangkat IoT"
                placeholder="Cari Device ID, nama terminal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-none shadow-none focus-visible:ring-0 text-xs p-0 h-auto"
              />
            </div>

            {/* Device Grid */}
            {loadingDevices ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <Loader size="lg" />
                <span className="text-xs font-medium">Memuat data perangkat IoT...</span>
              </div>
            ) : devices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 text-center">
                <Cpu className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">Belum Ada Perangkat Terdaftar</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Daftarkan terminal ESP32 / RFID untuk memulai absensi perangkat cerdas terintegrasi.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {devices?.map((device) => {
                  return (
                    <div 
                      key={device.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                              <Cpu className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                {device.name || 'Terminal Tanpa Nama'}
                              </h4>
                              <p className="font-mono text-[11px] text-slate-400">
                                {device.device_id}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(device)}
                        </div>

                        {/* Pairing Status */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <Signal size={13} className="text-slate-400" />
                            Terkait Kelas:
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {device.kelas?.nama_kelas || 'Umum (Gerbang)'}
                          </span>
                        </div>

                        {/* Status Telemetri */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                          <div className="flex items-center gap-1.5">
                            {getBatteryIcon(device.battery_level)}
                            <span>Baterai: {device.battery_level !== undefined && device.battery_level !== null ? `${device.battery_level}%` : '-'}</span>
                          </div>
                          <div className="text-right truncate font-mono text-[10px]">
                            {device.last_seen ? formatDate(device.last_seen, { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleTogglePairing(device)}
                          className="text-[11px] font-bold rounded-xl flex items-center gap-1"
                        >
                          {device.kelas_id ? (
                            <>
                              <Unlink size={12} className="text-amber-500" />
                              Lepas Pairing
                            </>
                          ) : (
                            <>
                              <LinkIcon size={12} className="text-indigo-500" />
                              Hubungkan Kelas
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-label="Edit perangkat"
                            onClick={() => handleOpenModal(device)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Settings size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Hapus perangkat"
                            onClick={() => handleDelete(device)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        <Suspense fallback={null}>
          {isModalOpen && (
            <DeviceFormModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              editingDevice={editingDevice}
              formData={formData}
              setFormData={setFormData}
              kelasOptions={kelasOptions}
              handleSave={handleSave}
              isSaving={isSaving}
            />
          )}
        </Suspense>
      </AcademicPageLayout>
    </PremiumFeatureGate>
  );
});

export default DeviceManagementPage;
