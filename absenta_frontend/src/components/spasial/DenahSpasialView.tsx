import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2, MapPin, Plus, RefreshCw, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { InteractiveDenahCanvas } from './InteractiveDenahCanvas';
import {
  fetchDenahList,
  createDenah,
  cloneDenah,
  deleteDenah,
} from '@/api/spasial.api';
import { useKelasOptions } from '@/hooks/useKelasOptions';
import { useAuthStore } from '@/store/authStore';
import {
  generateClassRoomMappings,
  loadPersistedRoomMappings,
  KelasRoomMapping,
} from '@/components/cbt/jadwal/cbtOrchestratorHelper';
import type { DenahSpasial, TipeDenah } from '@/types/spasial.types';
import type { UnassignedRoomItem } from './DenahPaletteSidebar';

export interface UniversalDenahSpasialViewProps {
  // 1. Context & Scope Injections
  denahId?: string;
  tipe?: TipeDenah;
  eventCbtId?: string;
  highlightRoomCode?: string | null;
  highlightLabel?: string;
  eventName?: string;
  roomMappings?: KelasRoomMapping[];

  // 2. Display Modifiers
  isModal?: boolean;       // True jika dirender dalam dialog modal
  hideLayout?: boolean;    // True jika dirender dalam tab role dashboard
  readOnly?: boolean;      // True jika hak akses hanya lihat (Siswa, Pengawas, Kepsek)

  // 3. Event Callbacks
  onClose?: () => void;
  onSelectRoom?: (roomCode: string) => void;
}

export const DenahSpasialView: React.FC<UniversalDenahSpasialViewProps> = React.memo(({
  denahId,
  tipe,
  eventCbtId,
  highlightRoomCode,
  highlightLabel,
  eventName,
  roomMappings,
  isModal = false,
  hideLayout = false,
  readOnly = false,
  onClose,
  onSelectRoom,
}) => {
  const { user } = useAuthStore();
  const tenantId = (user as any)?.tenant_id || user?.tenantId;

  const [loading, setLoading] = useState(false);
  const [denahList, setDenahList] = useState<DenahSpasial[]>([]);
  const [activeDenah, setActiveDenah] = useState<DenahSpasial | null>(null);

  // Active classes fallback from master data
  const { rawList: kelasList = [] } = useKelasOptions();

  const activeKelasList = useMemo(() => {
    return kelasList.filter(
      (k) =>
        k.is_active !== false &&
        String((k as any).status || '').toUpperCase() !== 'NONAKTIF'
    );
  }, [kelasList]);

  // Convert available rooms to unassigned items for palette/canvas
  const unassignedRooms: UnassignedRoomItem[] = useMemo(() => {
    if (roomMappings && roomMappings.length > 0) {
      return roomMappings
        .filter((m) => Boolean(m.slot_ruang?.trim()))
        .map((m) => ({
          slot_ruang: m.slot_ruang,
          nama_ruang: m.nama_ruang,
          kelas_nama: m.nama_kelas,
          kelas_id: m.kelas_id,
          tingkat: m.tingkat,
        }));
    }

    if (activeKelasList.length > 0) {
      const persisted = loadPersistedRoomMappings(tenantId);
      const mappings = generateClassRoomMappings(activeKelasList);
      return mappings.map((m) => {
        const saved = persisted?.[m.kelas_id];
        return {
          kelas_id: m.kelas_id,
          kelas_nama: m.nama_kelas,
          slot_ruang: saved?.slot_ruang || m.slot_ruang,
          nama_ruang: saved?.nama_ruang || m.nama_ruang,
          tingkat: m.tingkat,
        };
      });
    }

    return [];
  }, [roomMappings, activeKelasList, tenantId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDenahList();
      setDenahList(data);

      let selected: DenahSpasial | null = null;

      if (denahId) {
        selected = data.find((d) => d.id === denahId) || null;
      }

      if (!selected && tipe) {
        selected = data.find((d) => d.tipe === tipe) || null;
      }

      if (!selected) {
        // Otomatis prioritaskan denah ujian jika ada event/highlight, atau master denah
        const preferTipe = highlightRoomCode || eventName ? 'EVENT_UJIAN' : 'MASTER_SARPRAS';
        selected =
          data.find((d) => d.tipe === preferTipe) ||
          data.find((d) => d.tipe === 'EVENT_UJIAN') ||
          data.find((d) => d.tipe === 'MASTER_SARPRAS') ||
          data[0] ||
          null;
      }

      if (selected) {
        setActiveDenah(selected);
      } else {
        // Fallback auto-create jika database denah masih kosong
        const fallbackNama = eventName
          ? `Denah ${eventName}`
          : 'Denah Kampus & Ruang Ujian';
        const initial = await createDenah({
          nama_denah: fallbackNama,
          tipe: highlightRoomCode || eventName ? 'EVENT_UJIAN' : 'MASTER_SARPRAS',
          lantai: 1,
          canvas_width: 2400,
          canvas_height: 1600,
          elements: [],
        });
        setDenahList([initial]);
        setActiveDenah(initial);
      }
    } catch (err: any) {
      console.warn('Gagal memuat denah spasial, menggunakan fallback lokal:', err);
      const fallback: DenahSpasial = {
        id: 'local-denah-fallback',
        nama_denah: eventName ? `Denah ${eventName}` : 'Denah Kampus & Ruang Ujian',
        tipe: highlightRoomCode || eventName ? 'EVENT_UJIAN' : 'MASTER_SARPRAS',
        lantai: 1,
        canvas_width: 2400,
        canvas_height: 1600,
        grid_size: 20,
        elements: [],
        is_active: true,
      };
      setDenahList([fallback]);
      setActiveDenah(fallback);
    } finally {
      setLoading(false);
    }
  }, [denahId, tipe, eventName, highlightRoomCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateNewDenah = async () => {
    const nama = prompt('Masukkan nama denah baru (misal: Denah Lantai 2 / Gedung B):');
    if (!nama || !nama.trim()) return;

    try {
      const created = await createDenah({
        nama_denah: nama.trim(),
        tipe: tipe || (highlightRoomCode ? 'EVENT_UJIAN' : 'MASTER_SARPRAS'),
        lantai: (denahList.length || 0) + 1,
        elements: [],
      });
      setDenahList((prev) => [created, ...prev]);
      setActiveDenah(created);
      toast.success('Denah baru berhasil dibuat');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuat denah');
    }
  };

  const handleSaveSuccess = (updated: DenahSpasial) => {
    setDenahList((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
    setActiveDenah(updated);
  };

  return (
    <div className={`w-full h-full flex flex-col overflow-hidden min-h-[500px] ${hideLayout ? 'p-0' : ''}`}>
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          <p className="text-xs font-semibold">Memuat kanvas denah &amp; peta satelit...</p>
        </div>
      ) : activeDenah ? (
        <InteractiveDenahCanvas
          key={activeDenah.id}
          denah={activeDenah}
          unassignedRooms={unassignedRooms}
          denahList={denahList}
          onSelectDenah={setActiveDenah}
          onCreateNewDenah={readOnly ? undefined : handleCreateNewDenah}
          onClose={onClose}
          isReadOnly={readOnly}
          highlightRoomCode={highlightRoomCode}
          highlightLabel={highlightLabel}
          onSaveSuccess={handleSaveSuccess}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
          <MapPin className="w-10 h-10 text-slate-500 mb-2" />
          <p className="text-sm font-semibold">Belum ada denah yang dipilih</p>
          {!readOnly && (
            <button
              type="button"
              onClick={handleCreateNewDenah}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Buat Denah Sekarang
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default DenahSpasialView;
