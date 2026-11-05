import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DenahNodeCard } from './DenahNodeCard';
import { DenahPaletteSidebar, UnassignedRoomItem } from './DenahPaletteSidebar';
import { DenahPrintModal } from './DenahPrintModal';
import { InteractiveDenahCanvasToolbar } from './InteractiveDenahCanvasToolbar';
import { generateAutoFloorplan } from './denahAutoLayout';
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
  const [isLightMode, setIsLightMode] = useState(true);

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

  // Add room node from palette
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
      label_utama: room.slot_ruang || 'R.XX',
      label_sub: room.kelas_nama,
      kategori_ruang: 'RUANG_UJIAN',
      kelas_id: room.kelas_id,
      catatan: room.nama_ruang,
    };

    pushHistory([...nodes, newNode]);
    setSelectedNodeId(newNode.id);
    toast.success(`Menambahkan ${room.slot_ruang || ''} ${room.kelas_nama}`);
  };

  // Add virtual node
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

  // Auto-generate layout
  const handleAutoGenerateLayout = () => {
    const generated = generateAutoFloorplan(unassignedRooms);
    pushHistory(generated);
    toast.success(`Berhasil menyusun tata letak otomatis (${generated.length} elemen)`);
  };

  // Node transformations
  const handleRotateNode = (nodeId: string) => {
    const updated = nodes.map((n) =>
      n.id === nodeId ? { ...n, rotation: (n.rotation + 90) % 360 } : n
    );
    pushHistory(updated);
  };

  const handleFlipH = (nodeId: string) => {
    const updated = nodes.map((n) =>
      n.id === nodeId ? { ...n, flip_h: !n.flip_h } : n
    );
    pushHistory(updated);
  };

  const handleFlipV = (nodeId: string) => {
    const updated = nodes.map((n) =>
      n.id === nodeId ? { ...n, flip_v: !n.flip_v } : n
    );
    pushHistory(updated);
  };

  const handleDeleteNode = (nodeId: string) => {
    const updated = nodes.filter((n) => n.id !== nodeId);
    pushHistory(updated);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

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

  const handleMouseUp = useCallback(() => {
    if (dragState.current.isDragging || resizeState.current.isResizing) {
      dragState.current.isDragging = false;
      dragState.current.nodeId = null;
      resizeState.current.isResizing = false;
      resizeState.current.nodeId = null;
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
    <div
      className={`flex flex-col h-[750px] w-full rounded-2xl overflow-hidden shadow-xl select-none transition-colors border ${
        isLightMode
          ? 'bg-slate-100 border-slate-300'
          : 'bg-slate-900 border-slate-700/80'
      }`}
    >
      {/* Top Toolbar Component */}
      <InteractiveDenahCanvasToolbar
        denah={denah}
        isLightMode={isLightMode}
        onToggleLightMode={() => setIsLightMode((prev) => !prev)}
        scale={scale}
        onZoomIn={() => setScale((s) => Math.min(1.8, Number((s + 0.1).toFixed(1))))}
        onZoomOut={() => setScale((s) => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
        onResetZoom={() => {
          setScale(1);
          setPanOffset({ x: 40, y: 40 });
        }}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        onAutoLayout={handleAutoGenerateLayout}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onSave={handleSaveDenah}
        isSaving={isSaving}
        isReadOnly={isReadOnly}
      />

      {/* Main Studio Body: Palette Sidebar + Canvas Surface */}
      <div className="flex-1 flex overflow-hidden relative">
        {!isReadOnly && (
          <DenahPaletteSidebar
            unassignedRooms={unassignedRooms}
            placedKelasIds={placedKelasIds}
            onAddRoomNode={handleAddRoomNode}
            onAddVirtualNode={handleAddVirtualNode}
            isLightMode={isLightMode}
          />
        )}

        {/* Canvas Surface with Infinite Grid */}
        <div
          ref={canvasRef}
          onClick={() => setSelectedNodeId(null)}
          className={`flex-1 overflow-auto relative transition-colors ${
            isLightMode ? 'bg-slate-100/90' : 'bg-slate-950'
          }`}
          style={{
            backgroundImage: isLightMode
              ? `radial-gradient(rgba(100, 116, 139, 0.25) 1px, transparent 1px)`
              : `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
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
            className={`rounded-xl border border-dashed transition-colors ${
              isLightMode
                ? 'bg-white/70 border-slate-300 shadow-sm'
                : 'bg-slate-900/40 border-slate-700/60'
            }`}
          >
            {nodes.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-3xl mb-3 shadow-xs">
                  <Wand2 className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Canvas Denah Masih Kosong
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-4">
                  Mulai rancang peta denah fisik sekolah. Anda dapat menyusun otomatis dari data kelas &amp; fasilitas atau memilih preset dari panel samping kiri.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoGenerateLayout}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>
                      Susun Otomatis ({unassignedRooms.length > 0 ? `${unassignedRooms.length} Ruangan` : 'Template Gedung'})
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              nodes.map((node) => (
                <DenahNodeCard
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onRotate={handleRotateNode}
                  onFlipH={handleFlipH}
                  onFlipV={handleFlipV}
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
