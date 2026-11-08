import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { DenahNodeCard } from './DenahNodeCard';
import { DenahPaletteSidebar, UnassignedRoomItem } from './DenahPaletteSidebar';
import { DenahPrintModal } from './DenahPrintModal';
import { DenahConfigModal } from './DenahConfigModal';
import { InteractiveDenahCanvasToolbar } from './InteractiveDenahCanvasToolbar';
import { DenahMapGuideLayer } from './DenahMapGuideLayer';
import { DenahMapGuideFloatingBar } from './DenahMapGuideFloatingBar';
import { DenahBatchActionBar } from './DenahBatchActionBar';
import { useDenahInteraction } from './useDenahInteraction';
import { generateAutoFloorplan } from './denahAutoLayout';
import { updateDenah } from '../../api/spasial.api';
import type { DenahElementNode, DenahSpasial, DenahMapGuideConfig } from '../../types/spasial.types';

interface InteractiveDenahCanvasProps {
  denah: DenahSpasial;
  unassignedRooms?: UnassignedRoomItem[];
  onSaveSuccess?: (updated: DenahSpasial) => void;
  isReadOnly?: boolean;
  denahList?: DenahSpasial[];
  onSelectDenah?: (denah: DenahSpasial) => void;
  onCreateNewDenah?: () => void;
  onClose?: () => void;
  highlightRoomCode?: string | null;
  highlightLabel?: string;
}

export const extractMapGuideConfig = (elements?: any[], denahId?: string): DenahMapGuideConfig => {
  // 1. Coba dari elemen database metadata
  if (Array.isArray(elements)) {
    const metaNode = elements.find((el: any) => el?.id === '__MAP_GUIDE_CONFIG__');
    if (metaNode && metaNode.catatan) {
      try {
        const parsed = JSON.parse(metaNode.catatan);
        if (parsed && typeof parsed.lat === 'number') {
          return {
            ...parsed,
            enabled: parsed.enabled !== false,
          };
        }
      } catch (_) {}
    }
  }

  // 2. Coba dari localStorage
  if (denahId) {
    try {
      const saved = localStorage.getItem(`absenta_denah_map_${denahId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.lat === 'number') {
          return {
            ...parsed,
            enabled: parsed.enabled !== false,
          };
        }
      }
    } catch (_) {}
  }

  // 3. Default Satelit Sekolah Aktif (Google Hybrid Realistis)
  return {
    enabled: true,
    lat: -6.6548,
    lng: 107.3912,
    zoom: 18.5,
    opacity: 0.85,
    layer: 'google_hybrid',
    is_locked: true,
    location_name: 'Kampus SMKN 1 Plered Purwakarta',
  };
};

export const InteractiveDenahCanvas: React.FC<InteractiveDenahCanvasProps> = ({
  denah,
  unassignedRooms = [],
  onSaveSuccess,
  isReadOnly = false,
  denahList,
  onSelectDenah,
  onCreateNewDenah,
  onClose,
  highlightRoomCode,
  highlightLabel,
}) => {
  // Canvas dimulai dari elemen tersimpan (filter metadata peta). Jika kosong, gunakan auto-floorplan agar canvas tidak hampa
  const rawElements = Array.isArray(denah.elements) ? denah.elements : [];
  const realNodes = rawElements.filter((el: any) => el?.id !== '__MAP_GUIDE_CONFIG__');
  const initialNodes = realNodes.length > 0 ? realNodes : generateAutoFloorplan(unassignedRooms);

  const [nodes, setNodes] = useState<DenahElementNode[]>(initialNodes);
  const [scale, setScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 40, y: 40 });
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isReadOnly);

  // Satellite Map Guide State (Disinkronkan otomatis dari database denah)
  const [mapGuideConfig, setMapGuideConfig] = useState<DenahMapGuideConfig>(() =>
    extractMapGuideConfig(denah.elements, denah.id)
  );

  useEffect(() => {
    setMapGuideConfig(extractMapGuideConfig(denah.elements, denah.id));
  }, [denah.id, denah.elements]);
  const [isMapGuideOpen, setIsMapGuideOpen] = useState(false);

  // History for Undo/Redo
  const [history, setHistory] = useState<DenahElementNode[][]>([initialNodes]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const canvasRef = useRef<HTMLDivElement>(null);

  const pushHistory = useCallback(
    (newNodes: DenahElementNode[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIdx + 1);
        next.push(newNodes);
        return next;
      });
      setHistoryIdx((prev) => prev + 1);
      setNodes(newNodes);
    },
    [historyIdx]
  );

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const targetIdx = historyIdx - 1;
      setHistoryIdx(targetIdx);
      setNodes(history[targetIdx]);
      toast('Mengurungkan posisi kotak (Undo)', { icon: '↩️' });
    }
  }, [historyIdx, history]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const targetIdx = historyIdx + 1;
      setHistoryIdx(targetIdx);
      setNodes(history[targetIdx]);
      toast('Mengulangi posisi kotak (Redo)', { icon: '↪️' });
    }
  }, [historyIdx, history]);

  // Keyboard shortcut Ctrl+Z (Undo) and Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? handleRedo() : handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const snap = (val: number, step = 20) => Math.round(val / step) * step;

  // Add room node from palette
  const handleAddRoomNode = (room: UnassignedRoomItem) => {
    const existing = nodes.find((n) => n.kelas_id === room.kelas_id);
    if (existing) {
      setSelectedNodeIds([existing.id]);
      toast('Ruang ini sudah diletakkan pada denah', { icon: 'ℹ️' });
      return;
    }

    const newNode: DenahElementNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      x: snap(80 + (nodes.length % 5) * 40),
      y: snap(80 + Math.floor(nodes.length / 5) * 40),
      width: 100,
      height: 60,
      rotation: 0,
      label_utama: room.slot_ruang || 'R.XX',
      label_sub: room.kelas_nama,
      kategori_ruang: 'RUANG_UJIAN',
      kelas_id: room.kelas_id,
      catatan: room.nama_ruang,
    };

    pushHistory([...nodes, newNode]);
    setSelectedNodeIds([newNode.id]);
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
    setSelectedNodeIds([newNode.id]);
    toast.success(`Menambahkan ${virtual.label_utama}`);
  };

  // Fit canvas view to screen without manual zooming
  const handleFitToScreen = useCallback((targetNodes: DenahElementNode[] = nodes) => {
    const container = canvasRef.current;
    if (!container) return;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW <= 0 || containerH <= 0) return;

    if (targetNodes.length === 0) {
      setScale(1);
      setPanOffset({ x: 40, y: 40 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of targetNodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + (n.width || 100));
      maxY = Math.max(maxY, n.y + (n.height || 60));
    }

    const contentW = Math.max(200, maxX - minX);
    const contentH = Math.max(160, maxY - minY);
    const padding = 40;
    const availW = Math.max(100, containerW - padding * 2);
    const availH = Math.max(100, containerH - padding * 2);

    const fitScale = Math.min(availW / contentW, availH / contentH);
    const clampedScale = Math.max(0.4, Math.min(1.25, Math.round(fitScale * 100) / 100));

    const offsetX = Math.round((containerW - contentW * clampedScale) / 2 - minX * clampedScale);
    const offsetY = Math.round((containerH - contentH * clampedScale) / 2 - minY * clampedScale);

    setScale(clampedScale);
    setPanOffset({ x: Math.max(16, offsetX), y: Math.max(16, offsetY) });
    container.scrollLeft = 0;
    container.scrollTop = 0;
  }, [nodes]);

  // Auto-fit on initial render when nodes exist
  useEffect(() => {
    if (initialNodes.length > 0) {
      const timer = setTimeout(() => handleFitToScreen(initialNodes), 150);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-generate layout
  const handleAutoGenerateLayout = () => {
    const generated = generateAutoFloorplan(unassignedRooms);
    pushHistory(generated);
    setTimeout(() => handleFitToScreen(generated), 50);
    toast.success(`Berhasil menyusun tata letak otomatis (${generated.length} elemen)`);
  };

  // Node transformations
  const handleRotateNode = (id: string) =>
    pushHistory(nodes.map((n) => (n.id === id ? { ...n, rotation: (n.rotation + 90) % 360 } : n)));
  const handleFlipH = (id: string) =>
    pushHistory(nodes.map((n) => (n.id === id ? { ...n, flip_h: !n.flip_h } : n)));
  const handleFlipV = (id: string) =>
    pushHistory(nodes.map((n) => (n.id === id ? { ...n, flip_v: !n.flip_v } : n)));

  // Multi-selection & batch drag engine
  const {
    selectedNodeIds,
    setSelectedNodeIds,
    marqueeBox,
    currentSize,
    handleSelectNode,
    handleStartDrag,
    handleStartResize,
    handleCanvasMouseDown,
    handleBatchRotate,
    handleBatchFlipH,
    handleBatchDelete,
    handleSelectAll,
    handleBatchResizeStep,
    handleBatchSetSize,
  } = useDenahInteraction({
    nodes,
    setNodes,
    pushHistory,
    scale,
    panOffset,
    canvasRef,
    isReadOnly,
  });

  const handleDeleteNode = (nodeId: string) => {
    const updated = nodes.filter((n) => n.id !== nodeId);
    pushHistory(updated);
    setSelectedNodeIds((prev) => prev.filter((id) => id !== nodeId));
  };

  const handleSaveDenah = async () => {
    setIsSaving(true);
    try {
      const cleanNodes = nodes.filter((n) => n.id !== '__MAP_GUIDE_CONFIG__');
      const mapMetaNode: DenahElementNode = {
        id: '__MAP_GUIDE_CONFIG__',
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        rotation: 0,
        label_utama: '__MAP_GUIDE__',
        kategori_ruang: 'LAINNYA',
        catatan: JSON.stringify(mapGuideConfig),
      };

      const payload = [...cleanNodes, mapMetaNode];

      const saved = await updateDenah(denah.id, {
        elements: payload,
      });

      try {
        localStorage.setItem(`absenta_denah_map_${denah.id}`, JSON.stringify(mapGuideConfig));
      } catch (_) {}

      toast.success('Denah spasial & peta satelit berhasil disimpan ke database!');
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

  // Deteksi pencocokan ruang yang di-highlight dari kartu sesi siswa
  const isRoomHighlighted = useCallback(
    (node: DenahElementNode, code?: string | null): boolean => {
      if (!code) return false;
      const clean = (str?: string | null) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const target = clean(code);
      if (!target) return false;

      const nodeMain = clean(node.label_utama);
      const nodeSub = clean(node.label_sub);
      const nodeCat = clean(node.catatan);

      return (
        nodeMain === target ||
        nodeCat === target ||
        nodeMain.includes(target) ||
        target.includes(nodeMain) ||
        nodeSub.includes(target)
      );
    },
    []
  );

  // Jika highlightRoomCode diberikan tetapi belum ada di nodes denah, tambahkan dinamis agar selalu tampil & berdenyut
  useEffect(() => {
    if (!highlightRoomCode) return;
    const exists = nodes.some((n) => isRoomHighlighted(n, highlightRoomCode));
    if (!exists) {
      const newNode: DenahElementNode = {
        id: `node-highlight-${Date.now()}`,
        x: 180,
        y: 60,
        width: 110,
        height: 65,
        rotation: 0,
        label_utama: highlightRoomCode,
        label_sub: 'Ruang Ujian Anda',
        kategori_ruang: 'RUANG_UJIAN',
        catatan: `Ruang Ujian Terplot ${highlightRoomCode}`,
      };
      setNodes((prev) => [newNode, ...prev]);
    }
  }, [highlightRoomCode, nodes, isRoomHighlighted]);

  // Otomatis pusatkan kamera (panOffset) ke ruangan yang di-highlight saat modal dibuka
  useEffect(() => {
    if (!highlightRoomCode || nodes.length === 0) return;
    const target = nodes.find((n) => isRoomHighlighted(n, highlightRoomCode));
    if (target) {
      setSelectedNodeIds([target.id]);
      if (canvasRef.current) {
        const w = canvasRef.current.clientWidth || 800;
        const h = canvasRef.current.clientHeight || 600;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        setPanOffset({
          x: Math.round(w / 2 - targetCenterX * scale),
          y: Math.round(h / 2 - targetCenterY * scale),
        });
      }
    }
  }, [highlightRoomCode, nodes, scale, isRoomHighlighted, setSelectedNodeIds]);

  return (
    <div
      className={`flex flex-col h-full min-h-[620px] flex-1 w-full rounded-2xl overflow-hidden shadow-xl select-none transition-colors border ${
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
        onSetZoomScale={(val) => setScale(val)}
        onFitToScreen={() => handleFitToScreen()}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIdx > 0}
        canRedo={historyIdx < history.length - 1}
        onAutoLayout={handleAutoGenerateLayout}
        isMapGuideOpen={isMapGuideOpen}
        onToggleMapGuide={() => {
          setIsMapGuideOpen((prev) => {
            const next = !prev;
            if (next) {
              setMapGuideConfig((c) => ({ ...c, enabled: true }));
            }
            return next;
          });
        }}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        onOpenConfig={() => setIsConfigModalOpen(true)}
        onSave={handleSaveDenah}
        isSaving={isSaving}
        isReadOnly={isReadOnly}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        denahList={denahList}
        onSelectDenah={onSelectDenah}
        onCreateNewDenah={onCreateNewDenah}
        onClose={onClose}
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
            isCollapsed={!isSidebarOpen}
            onToggleCollapse={() => setIsSidebarOpen((prev) => !prev)}
          />
        )}

        {/* Canvas Surface with Infinite Grid */}
        <div
          ref={canvasRef}
          onMouseDown={handleCanvasMouseDown}
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
            {/* Realtime Satellite/Map Guide Layer */}
            {mapGuideConfig.enabled && (
              <DenahMapGuideLayer
                config={mapGuideConfig}
                width={denah.canvas_width || 2400}
                height={denah.canvas_height || 1600}
                onMapChange={(updated) => {
                  setMapGuideConfig((prev) => {
                    const next = { ...prev, ...updated };
                    try {
                      localStorage.setItem(`absenta_denah_map_${denah.id}`, JSON.stringify(next));
                    } catch (_) {}
                    return next;
                  });
                }}
              />
            )}

            {/* Subtle Floating Empty State (Non-intrusive) */}
            {nodes.length === 0 && (
              <div
                style={{ left: '50%', top: '40px', transform: 'translateX(-50%)' }}
                className="absolute z-20 flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/85 text-white backdrop-blur-md shadow-lg border border-slate-700/60 text-xs select-none pointer-events-auto"
              >
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shrink-0" />
                <span className="text-slate-300">
                  Kanvas denah kosong. Pilih ruang dari panel kiri, atau
                </span>
                <button
                  type="button"
                  onClick={handleAutoGenerateLayout}
                  className="font-bold text-indigo-300 hover:text-white underline cursor-pointer"
                >
                  Susun Otomatis ({unassignedRooms.length > 0 ? `${unassignedRooms.length} Ruangan` : 'Template'})
                </button>
              </div>
            )}

            {nodes.map((node) => (
              <DenahNodeCard
                key={node.id}
                node={node}
                isSelected={selectedNodeIds.includes(node.id)}
                isHighlighted={isRoomHighlighted(node, highlightRoomCode)}
                highlightLabel={highlightLabel}
                onSelect={handleSelectNode}
                onRotate={handleRotateNode}
                onFlipH={handleFlipH}
                onFlipV={handleFlipV}
                onDelete={handleDeleteNode}
                onStartDrag={handleStartDrag}
                onStartResize={handleStartResize}
                isReadOnly={isReadOnly}
              />
            ))}

            {/* Marquee Area Selection Rectangle */}
            {marqueeBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${marqueeBox.x}px`,
                  top: `${marqueeBox.y}px`,
                  width: `${marqueeBox.width}px`,
                  height: `${marqueeBox.height}px`,
                  pointerEvents: 'none',
                }}
                className="border-2 border-dashed border-blue-500 bg-blue-500/20 rounded-xl z-50 pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Floating Map Guide Control HUD */}
        {isMapGuideOpen && (
          <DenahMapGuideFloatingBar
            config={mapGuideConfig}
            onUpdateConfig={(updated) => {
              setMapGuideConfig((prev) => {
                const next = { ...prev, ...updated };
                try {
                  localStorage.setItem(`absenta_denah_map_${denah.id}`, JSON.stringify(next));
                } catch (_) {}
                return next;
              });
            }}
            onClose={() => {
              setIsMapGuideOpen(false);
              setMapGuideConfig((prev) => ({ ...prev, enabled: false }));
            }}
            isLightMode={isLightMode}
          />
        )}

        {/* Floating Batch Action Bar for Multiple Selected Rooms */}
        {!isReadOnly && (
          <DenahBatchActionBar
            selectedCount={selectedNodeIds.length}
            totalCount={nodes.length}
            currentSize={currentSize}
            onRotateAll={handleBatchRotate}
            onFlipHAll={handleBatchFlipH}
            onDeleteAll={handleBatchDelete}
            onDeselectAll={() => setSelectedNodeIds([])}
            onSelectAll={handleSelectAll}
            onResizeStep={handleBatchResizeStep}
            onSetSize={handleBatchSetSize}
            onSave={handleSaveDenah}
            isSaving={isSaving}
          />
        )}
      </div>

      {/* Print & PDF Modal */}
      <DenahPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        denah={denah}
        nodes={nodes}
        mapGuideConfig={mapGuideConfig}
      />

      {/* Modal Ekspor & Impor Konfigurasi Denah (JSON) */}
      <DenahConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        denah={denah}
        nodes={nodes}
        mapGuideConfig={mapGuideConfig}
        isReadOnly={isReadOnly}
        onImportConfig={(importedNodes, importedMapConfig) => {
          pushHistory(importedNodes);
          if (importedMapConfig) {
            setMapGuideConfig(importedMapConfig);
            setIsMapGuideOpen(importedMapConfig.enabled !== false);
            try {
              localStorage.setItem(`absenta_denah_map_${denah.id}`, JSON.stringify(importedMapConfig));
            } catch (_) {}
          }
        }}
      />
    </div>
  );
};
