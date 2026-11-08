import React, { useState, useEffect } from 'react';
import { X, Layers, MapPin, Loader2, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { InteractiveDenahCanvas } from '../../spasial/InteractiveDenahCanvas';
import { fetchDenahList, createDenah, cloneDenah } from '@/api/spasial.api';
import type { DenahSpasial } from '@/types/spasial.types';
import type { KelasRoomMapping } from './cbtOrchestratorHelper';

interface CbtDenahModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomMappings?: KelasRoomMapping[];
  eventName?: string;
  highlightRoomCode?: string | null;
  highlightLabel?: string;
  isReadOnly?: boolean;
}

export const CbtDenahModal: React.FC<CbtDenahModalProps> = ({
  isOpen,
  onClose,
  roomMappings = [],
  eventName,
  highlightRoomCode,
  highlightLabel,
  isReadOnly = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [denahList, setDenahList] = useState<DenahSpasial[]>([]);
  const [activeDenah, setActiveDenah] = useState<DenahSpasial | null>(null);

  // Convert roomMappings to unassigned palette items
  const unassignedRooms = (roomMappings || [])
    .filter((m) => Boolean(m.slot_ruang.trim()))
    .map((m) => ({
      slot_ruang: m.slot_ruang,
      nama_ruang: m.nama_ruang,
      kelas_nama: m.nama_kelas,
      kelas_id: m.kelas_id,
    }));

  const loadDenahData = async () => {
    setLoading(true);
    try {
      const data = await fetchDenahList();
      setDenahList(data);

      // Find if there is already an EVENT_UJIAN denah
      const eventDenah = data.find((d) => d.tipe === 'EVENT_UJIAN');
      if (eventDenah) {
        setActiveDenah(eventDenah);
      } else if (data.length > 0) {
        setActiveDenah(data[0]);
      } else {
        // Auto-create initial denah for this exam event
        const created = await createDenah({
          nama_denah: eventName ? `Denah ${eventName}` : 'Denah Ujian Asesmen CBT',
          tipe: 'EVENT_UJIAN',
          lantai: 1,
          canvas_width: 2400,
          canvas_height: 1600,
          elements: [],
        });
        setDenahList([created]);
        setActiveDenah(created);
      }
    } catch (err: any) {
      console.error('Gagal mengambil denah spasial:', err);
      // Fallback local denah
      const fallback: DenahSpasial = {
        id: 'temp-cbt-denah',
        nama_denah: eventName || 'Denah Ujian CBT',
        tipe: 'EVENT_UJIAN',
        lantai: 1,
        canvas_width: 2400,
        canvas_height: 1600,
        grid_size: 20,
        elements: [],
        is_active: true,
      };
      setActiveDenah(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDenahData();
    }
  }, [isOpen]);

  const handleCreateNewDenah = async () => {
    const nama = prompt('Masukkan nama denah baru (misal: Denah Lantai 2 / Gedung B):');
    if (!nama || !nama.trim()) return;

    try {
      const created = await createDenah({
        nama_denah: nama.trim(),
        tipe: 'EVENT_UJIAN',
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

  const handleCloneMaster = async (masterId: string) => {
    try {
      const cloned = await cloneDenah(masterId, {
        nama_denah: `Denah Ujian CBT (${eventName || 'Event'})`,
        tipe: 'EVENT_UJIAN',
      });
      setDenahList((prev) => [cloned, ...prev]);
      setActiveDenah(cloned);
      toast.success('Berhasil menduplikasi denah master sarpras untuk event ujian!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal kloning denah master');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-1 sm:p-3 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full h-full max-w-[98vw] max-h-[96vh] flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs">Memuat canvas denah spasial...</p>
          </div>
        ) : activeDenah ? (
          <InteractiveDenahCanvas
            key={activeDenah.id}
            denah={activeDenah}
            unassignedRooms={unassignedRooms}
            denahList={denahList}
            onSelectDenah={setActiveDenah}
            onCreateNewDenah={handleCreateNewDenah}
            onClose={onClose}
            isReadOnly={isReadOnly}
            highlightRoomCode={highlightRoomCode}
            highlightLabel={highlightLabel}
            onSaveSuccess={(updated) => {
              setDenahList((prev) =>
                prev.map((d) => (d.id === updated.id ? updated : d))
              );
              setActiveDenah(updated);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <MapPin className="w-10 h-10 text-slate-600 mb-2" />
            <p className="text-sm font-semibold">Belum ada denah yang dipilih</p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleCreateNewDenah}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-indigo-700 transition-colors"
              >
                Buat Denah Sekarang
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
