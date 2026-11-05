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
  roomMappings: KelasRoomMapping[];
  eventName?: string;
}

export const CbtDenahModal: React.FC<CbtDenahModalProps> = ({
  isOpen,
  onClose,
  roomMappings,
  eventName,
}) => {
  const [loading, setLoading] = useState(false);
  const [denahList, setDenahList] = useState<DenahSpasial[]>([]);
  const [activeDenah, setActiveDenah] = useState<DenahSpasial | null>(null);

  // Convert roomMappings to unassigned palette items
  const unassignedRooms = roomMappings
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-[96vw] h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-5 py-3.5 bg-slate-850 border-b border-slate-750 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Studio Denah Spasial Interaktif</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Universal DRY: Sarpras &amp; CBT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Puzzle penyusun denah ruang ujian • Drag, rotate 90°, kotak virtual fasilitas kampus
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Denah Selector Dropdown */}
            {denahList.length > 1 && (
              <select
                value={activeDenah?.id || ''}
                onChange={(e) => {
                  const sel = denahList.find((d) => d.id === e.target.value);
                  if (sel) setActiveDenah(sel);
                }}
                className="text-xs px-2.5 py-1.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg focus:outline-none"
              >
                {denahList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nama_denah} ({d.tipe === 'MASTER_SARPRAS' ? 'Sarpras' : 'CBT'}) - Lt {d.lantai}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleCreateNewDenah}
              className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg font-semibold transition-colors"
            >
              + Denah Baru
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-hidden relative p-3 bg-slate-950 flex flex-col">
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
              <button
                type="button"
                onClick={handleCreateNewDenah}
                className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Buat Denah Sekarang
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
