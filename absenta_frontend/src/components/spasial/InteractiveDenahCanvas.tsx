import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  Printer,
  Undo2,
  Redo2,
  Layers,
  MapPin,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DenahNodeCard } from './DenahNodeCard';
import { DenahPaletteSidebar, UnassignedRoomItem } from './DenahPaletteSidebar';
import { DenahPrintModal } from './DenahPrintModal';
import { updateDenah } from '../../api/spasial.api';
import type { DenahElementNode, DenahSpasial } from '../../types/spasial.types';

interface InteractiveDenahCanvasProps {
  denah: DenahSpasial;
  unassignedRooms?: UnassignedRoomItem[];
  onSaveSuccess?: (updated: DenahSpasial) => void;
  isReadOnly?: boolean;
}

export const InteractiveDenahCanvas: React.FC<InteractiveDenahCanvasProps> = ({
  denah,
  unassignedRooms = [],
  onSaveSuccess,
  isReadOnly = false,
}) => {
  const [nodes, setNodes] = useState<DenahElementNode[]>(denah.elements || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 40, y: 40 });
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<DenahElementNode[][]>([denah.elements || []]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    isDragging: boolean;
    nodeId: string | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const resizeState = useRef<{
    isResizing: boolean;
    nodeId: string | null;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  }>({
    isResizing: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    origW: 0,
    origH: 0,
  });

  const pushHistory = (newNodes: DenahElementNode[]) => {
    const nextHistory = history.slice(0, historyIdx + 1);
    nextHistory.push(newNodes);
    setHistory(nextHistory);
    setHistoryIdx(nextHistory.length - 1);
    setNodes(newNodes);
  };

  const handleUndo = () => {
    if (historyIdx > 0) {
      setHistoryIdx(historyIdx - 1);
      setNodes(history[historyIdx - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      setHistoryIdx(historyIdx + 1);
      setNodes(history[historyIdx + 1]);
    }
  };

  const snap = (val: number, step = 20) => Math.round(val / step) * step;

  // Add exam room node from palette
  const handleAddRoomNode = (room: UnassignedRoomItem) => {
    const existing = nodes.find((n) => n.kelas_id === room.kelas_id);
    if (existing) {
      setSelectedNodeId(existing.id);
      toast('Ruang ini sudah diletakkan pada denah', { icon: 'ℹ️' });
      return;
    }

    const newNode: DenahElementNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: snap(80 + (nodes.length % 5) * 40),
      y: snap(80 + Math.floor(nodes.length / 5) * 40),
      width: 180,
      height: 110,
      rotation: 0,
      label_utama: room.slot_ruang,
      label_sub: room.kelas_nama,
      kategori_ruang: 'RUANG_UJIAN',
      kelas_id: room.kelas_id,
      catatan: room.nama_ruang,
    };

    pushHistory([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success(`Menambahkan ${room.slot_ruang} (${room.kelas_nama})`);
  };

  // Add virtual node (Toilet, Lab, Ruang Guru, etc.)
  const handleAddVirtualNode = (virtual: Omit<DenahElementNode, 'id' | 'x' | 'y'>) => {
    const newNode: DenahElementNode = {
      ...virtual,
      id: `node-v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: snap(120),
      y: snap(120),
    };
    pushHistory([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success(`Menambahkan ${virtual.label_utama}`);
  };

  // Rotate node 90 deg
  const handleRotateNode = (nodeId: string) => {
    const updated = nodes.map((n) => {
      if (n.id !== nodeId) return n;
      const nextRot = (n.rotation + 90) % 360;
      return { ...n, rotation: nextRot };
    });
    pushHistory(updated);
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    const updated = nodes.filter((n) => n.id !== nodeId);
    pushHistory(updated);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Start Node Drag
  const handleStartDrag = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;

    dragState.current = {
      isDragging: true,
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origX: target.x,
      origY: target.y,
    };
  };

  // Start Node Resize
  const handleStartResize = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;

    resizeState.current = {
      isResizing: true,
      nodeId,
      startX: e.clientX,
      startY: e.clientY,
      origW: target.width,
      origH: target.height,
    };
  };

  // Mouse Move listener
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (dragState.current.isDragging && dragState.current.nodeId) {
        const dx = (e.clientX - dragState.current.startX) / scale;
        const dy = (e.clientY - dragState.current.startY) / scale;
        const newX = Math.max(0, snap(dragState.current.origX + dx));
        const newY = Math.max(0, snap(dragState.current.origY + dy));

        setNodes((prev) =>
          prev.map((n) =>
            n.id === dragState.current.nodeId ? { ...n, x: newX, y: newY } : n
          )
        );
      } else if (resizeState.current.isResizing && resizeState.current.nodeId) {
        const dx = (e.clientX - resizeState.current.startX) / scale;
        const dy = (e.clientY - resizeState.current.startY) / scale;
        const newW = Math.max(100, snap(resizeState.current.origW + dx));
        const newH = Math.max(60, snap(resizeState.current.origH + dy));

        setNodes((prev) =>
          prev.map((n) =>
            n.id === resizeState.current.nodeId
              ? { ...n, width: newW, height: newH }
              : n
          )
        );
      }
    },
    [scale]
  );

  // Mouse Up listener
  const handleMouseUp = useCallback(() => {
    if (dragState.current.isDragging || resizeState.current.isResizing) {
      dragState.current.isDragging = false;
      dragState.current.nodeId = null;
      resizeState.current.isResizing = false;
      resizeState.current.nodeId = null;
      // sync history
      pushHistory(nodes);
    }
  }, [nodes]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Save to Database
  const handleSaveDenah = async () => {
    setIsSaving(true);
    try {
      const saved = await updateDenah(denah.id, {
        elements: nodes,
      });
      toast.success('Denah spasial berhasil disimpan ke database!');
      if (onSaveSuccess) onSaveSuccess(saved);
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan denah');
    } finally {
      setIsSaving(false);
    }
  };

  const placedKelasIds = new Set(
    nodes.filter((n) => n.kelas_id).map((n) => n.kelas_id as string)
  );

  return (
    <div className="flex flex-col h-[750px] w-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl select-none">
      {/* Top Toolbar */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-slate-850 border-b border-slate-750 text-slate-200 z-30">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-600/30 text-indigo-400 rounded-lg">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              {denah.nama_denah}
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-indigo-950 text-indigo-300 border border-indigo-750">
                {denah.tipe === 'EVENT_UJIAN' ? 'Event CBT' : 'Sarpras Master'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Lantai {denah.lantai} {denah.gedung ? `• Gedung ${denah.gedung}` : ''} • Grid Snap 20px
            </p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {/* Zoom Controls */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-bold px-2 text-slate-300 min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(1))))}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setScale(1);
                setPanOffset({ x: 40, y: 40 });
              }}
              className="p-1.5 hover:bg-slate-700 rounded text-slate-300 border-l border-slate-700"
              title="Reset Tampilan"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Undo / Redo */}
          {!isReadOnly && (
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIdx <= 0}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30"
                title="Urungkan"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIdx >= history.length - 1}
                className="p-1.5 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30"
                title="Ulangi"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Print Map Modal */}
          <button
            type="button"
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Denah A4
          </button>

          {/* Save Button */}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleSaveDenah}
              disabled={isSaving}
              className="px-3.5 py-1.5 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Simpan Denah
            </button>
          )}
        </div>
      </header>

      {/* Main Studio Body: Palette Sidebar + Canvas Surface */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Palette */}
        {!isReadOnly && (
          <DenahPaletteSidebar
            unassignedRooms={unassignedRooms}
            placedKelasIds={placedKelasIds}
            onAddRoomNode={handleAddRoomNode}
            onAddVirtualNode={handleAddVirtualNode}
          />
        )}

        {/* Canvas Surface with Infinite Grid */}
        <div
          ref={canvasRef}
          onClick={() => setSelectedNodeId(null)}
          className="flex-1 overflow-auto bg-slate-950 relative"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
          }}
        >
          {/* Scalable Container */}
          <div
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: `${denah.canvas_width || 2400}px`,
              height: `${denah.canvas_height || 1600}px`,
              position: 'relative',
              left: `${panOffset.x}px`,
              top: `${panOffset.y}px`,
            }}
            className="border border-dashed border-slate-700/60 rounded-xl"
          >
            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <Layers className="w-12 h-12 stroke-[1.2] mb-2 text-slate-600" />
                <p className="text-sm font-semibold">Canvas Denah Masih Kosong</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
                  Tarik atau klik tombol <b>Pasang</b> pada panel kiri untuk menata posisi ruang ujian dan bangunan sekolah.
                </p>
              </div>
            ) : (
              nodes.map((node) => (
                <DenahNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onRotate={handleRotateNode}
                  onDelete={handleDeleteNode}
                  onStartDrag={handleStartDrag}
                  onStartResize={handleStartResize}
                  isReadOnly={isReadOnly}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Print & PDF Modal */}
      <DenahPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        denah={denah}
        nodes={nodes}
      />
    </div>
  );
};
