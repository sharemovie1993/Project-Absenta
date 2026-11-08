import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import type { DenahElementNode } from '../../types/spasial.types';

interface UseDenahInteractionParams {
  nodes: DenahElementNode[];
  setNodes: React.Dispatch<React.SetStateAction<DenahElementNode[]>>;
  pushHistory: (nodes: DenahElementNode[]) => void;
  scale: number;
  panOffset: { x: number; y: number };
  canvasRef: React.RefObject<HTMLDivElement | null>;
  isReadOnly?: boolean;
}

export function useDenahInteraction({
  nodes,
  setNodes,
  pushHistory,
  scale,
  panOffset,
  canvasRef,
  isReadOnly = false,
}: UseDenahInteractionParams) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [marqueeBox, setMarqueeBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const hasMovedRef = useRef(false);
  const hasResizedRef = useRef(false);
  const latestNodesRef = useRef<DenahElementNode[]>(nodes);

  // RAF Throttling & Snapped Tracking for 60FPS Drag & Drop on Low-Spec Hardware
  const rafIdRef = useRef<number | null>(null);
  const latestMousePosRef = useRef<{ clientX: number; clientY: number }>({ clientX: 0, clientY: 0 });
  const lastSnappedOffsetRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const lastSnappedSizeRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const marqueeStartRef = useRef<{ isSelecting: boolean; startX: number; startY: number } | null>(null);
  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    initialPositions: { id: string; x: number; y: number }[];
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialPositions: [],
  });

  const resizeState = useRef<{
    isResizing: boolean;
    nodeId: string | null;
    startX: number;
    startY: number;
    initialSizes: { id: string; origW: number; origH: number }[];
  }>({
    isResizing: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    initialSizes: [],
  });

  const snap = (val: number, step = 20) => Math.round(val / step) * step;

  // Single & Multi-select click handler
  const handleSelectNode = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        setSelectedNodeIds((prev) =>
          prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
        );
      } else {
        setSelectedNodeIds([nodeId]);
      }
    },
    []
  );

  // Dragging single or batch of selected rooms
  const handleStartDrag = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (isReadOnly) return;

      let activeSelection = selectedNodeIds;
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        if (!selectedNodeIds.includes(nodeId)) {
          activeSelection = [...selectedNodeIds, nodeId];
          setSelectedNodeIds(activeSelection);
        }
      } else if (!selectedNodeIds.includes(nodeId)) {
        activeSelection = [nodeId];
        setSelectedNodeIds([nodeId]);
      }

      hasMovedRef.current = false;
      latestNodesRef.current = nodes;
      lastSnappedOffsetRef.current = { dx: 0, dy: 0 };

      const activeSet = new Set(activeSelection);
      const targetNodes = nodes.filter((n) => activeSet.has(n.id));
      dragState.current = {
        isDragging: true,
        startX: e.clientX,
        startY: e.clientY,
        initialPositions: targetNodes.map((n) => ({ id: n.id, x: n.x, y: n.y })),
      };
    },
    [isReadOnly, selectedNodeIds, nodes]
  );

  const handleStartResize = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (isReadOnly) return;

      let activeSelection = selectedNodeIds;
      if (!selectedNodeIds.includes(nodeId)) {
        activeSelection = [nodeId];
        setSelectedNodeIds([nodeId]);
      }

      const activeSet = new Set(activeSelection);
      const targetNodes = nodes.filter((n) => activeSet.has(n.id));
      if (targetNodes.length === 0) return;

      hasResizedRef.current = false;
      latestNodesRef.current = nodes;
      lastSnappedSizeRef.current = { dx: 0, dy: 0 };

      resizeState.current = {
        isResizing: true,
        nodeId,
        startX: e.clientX,
        startY: e.clientY,
        initialSizes: targetNodes.map((n) => ({ id: n.id, origW: n.width, origH: n.height })),
      };
    },
    [isReadOnly, selectedNodeIds, nodes]
  );

  // Marquee selection start on canvas empty area
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('.group') || (e.target as HTMLElement).closest('button')) {
        return;
      }

      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedNodeIds([]);
      }

      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const startX = (e.clientX - rect.left - panOffset.x + canvasRef.current.scrollLeft) / scale;
      const startY = (e.clientY - rect.top - panOffset.y + canvasRef.current.scrollTop) / scale;

      marqueeStartRef.current = {
        isSelecting: true,
        startX,
        startY,
      };
    },
    [scale, panOffset, canvasRef]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const isDrag = dragState.current.isDragging && dragState.current.initialPositions.length > 0;
      const isResize = resizeState.current.isResizing && resizeState.current.initialSizes.length > 0;
      const isMarquee = Boolean(marqueeStartRef.current?.isSelecting);

      if (!isDrag && !isResize && !isMarquee) return;

      latestMousePosRef.current = { clientX: e.clientX, clientY: e.clientY };

      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const { clientX, clientY } = latestMousePosRef.current;

          if (dragState.current.isDragging && dragState.current.initialPositions.length > 0) {
            const dx = (clientX - dragState.current.startX) / scale;
            const dy = (clientY - dragState.current.startY) / scale;
            const snappedDx = snap(dx);
            const snappedDy = snap(dy);

            // Jika koordinat snap grid 20px belum berubah, lewati render untuk menghemat CPU
            if (
              snappedDx === lastSnappedOffsetRef.current.dx &&
              snappedDy === lastSnappedOffsetRef.current.dy
            ) {
              return;
            }

            lastSnappedOffsetRef.current = { dx: snappedDx, dy: snappedDy };
            hasMovedRef.current = true;

            const posMap = new Map(dragState.current.initialPositions.map((p) => [p.id, p]));

            setNodes((prev) => {
              let changed = false;
              const updated = prev.map((n) => {
                const initial = posMap.get(n.id);
                if (initial) {
                  const newX = Math.max(0, initial.x + snappedDx);
                  const newY = Math.max(0, initial.y + snappedDy);
                  if (newX !== n.x || newY !== n.y) {
                    changed = true;
                    return { ...n, x: newX, y: newY };
                  }
                }
                return n;
              });
              if (!changed) return prev;
              latestNodesRef.current = updated;
              return updated;
            });
          } else if (resizeState.current.isResizing && resizeState.current.initialSizes.length > 0) {
            const dx = (clientX - resizeState.current.startX) / scale;
            const dy = (clientY - resizeState.current.startY) / scale;
            const snappedDx = snap(dx);
            const snappedDy = snap(dy);

            if (
              snappedDx === lastSnappedSizeRef.current.dx &&
              snappedDy === lastSnappedSizeRef.current.dy
            ) {
              return;
            }

            lastSnappedSizeRef.current = { dx: snappedDx, dy: snappedDy };
            hasResizedRef.current = true;

            const sizeMap = new Map(resizeState.current.initialSizes.map((s) => [s.id, s]));

            setNodes((prev) => {
              let changed = false;
              const updated = prev.map((n) => {
                const initial = sizeMap.get(n.id);
                if (initial) {
                  const newW = Math.max(80, initial.origW + snappedDx);
                  const newH = Math.max(50, initial.origH + snappedDy);
                  if (newW !== n.width || newH !== n.height) {
                    changed = true;
                    return { ...n, width: newW, height: newH };
                  }
                }
                return n;
              });
              if (!changed) return prev;
              latestNodesRef.current = updated;
              return updated;
            });
          } else if (marqueeStartRef.current?.isSelecting && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            const curX = (clientX - rect.left - panOffset.x + canvasRef.current.scrollLeft) / scale;
            const curY = (clientY - rect.top - panOffset.y + canvasRef.current.scrollTop) / scale;

            const bx = Math.min(marqueeStartRef.current.startX, curX);
            const by = Math.min(marqueeStartRef.current.startY, curY);
            const bw = Math.abs(curX - marqueeStartRef.current.startX);
            const bh = Math.abs(curY - marqueeStartRef.current.startY);

            setMarqueeBox({ x: bx, y: by, width: bw, height: bh });

            const selected = nodesRef.current.filter(
              (n) => n.x < bx + bw && n.x + n.width > bx && n.y < by + bh && n.y + n.height > by
            );
            const newIds = selected.map((n) => n.id);
            setSelectedNodeIds((prev) => {
              if (prev.length === newIds.length && prev.every((id, idx) => id === newIds[idx])) {
                return prev;
              }
              return newIds;
            });
          }
        });
      }
    },
    [scale, panOffset, setNodes, canvasRef]
  );

  const handleMouseUp = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (dragState.current.isDragging) {
      dragState.current.isDragging = false;
      dragState.current.initialPositions = [];
      lastSnappedOffsetRef.current = { dx: 0, dy: 0 };
      if (hasMovedRef.current) {
        pushHistory(latestNodesRef.current);
        hasMovedRef.current = false;
      }
    }
    if (resizeState.current.isResizing) {
      resizeState.current.isResizing = false;
      resizeState.current.nodeId = null;
      resizeState.current.initialSizes = [];
      lastSnappedSizeRef.current = { dx: 0, dy: 0 };
      if (hasResizedRef.current) {
        pushHistory(latestNodesRef.current);
        hasResizedRef.current = false;
      }
    }
    if (marqueeStartRef.current?.isSelecting) {
      marqueeStartRef.current = null;
      setMarqueeBox(null);
    }
  }, [pushHistory]);

  // Batch actions on all selected rooms
  const handleBatchRotate = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, rotation: (n.rotation + 90) % 360 } : n
    );
    pushHistory(updated);
    toast.success(`Memutar kotak 90° (${selectedNodeIds.length} ruangan)`);
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleBatchToggleTextUpright = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const targetSet = new Set(selectedNodeIds);
    const anyNotUpright = nodes.some(
      (n) => targetSet.has(n.id) && n.kunci_teks_tegak === false
    );
    const nextState = anyNotUpright ? true : false;

    const updated = nodes.map((n) =>
      targetSet.has(n.id) ? { ...n, kunci_teks_tegak: nextState } : n
    );
    pushHistory(updated);
    toast.success(
      nextState
        ? `Teks dikunci tegak lurus (${selectedNodeIds.length} ruangan)`
        : `Teks mengikuti rotasi kotak (${selectedNodeIds.length} ruangan)`
    );
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleBatchFlipH = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const updated = nodes.map((n) =>
      selectedNodeIds.includes(n.id) ? { ...n, flip_h: !n.flip_h } : n
    );
    pushHistory(updated);
    toast.success(`Cermin horizontal (${selectedNodeIds.length} ruangan)`);
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleBatchDelete = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const count = selectedNodeIds.length;
    const updated = nodes.filter((n) => !selectedNodeIds.includes(n.id));
    pushHistory(updated);
    toast.success(`Menghapus ${count} ruangan terpilih`);
    setSelectedNodeIds([]);
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleSelectAll = useCallback(() => {
    setSelectedNodeIds(nodes.map((n) => n.id));
    toast.success(`Memilih seluruh ${nodes.length} ruangan`);
  }, [nodes]);

  // Global mouse listeners for drag & marquee
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Keyboard Shortcuts (Ctrl+A, Escape, Delete)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (e.key === 'Escape') {
        setSelectedNodeIds([]);
      } else if (e.key === 'Delete' && selectedNodeIds.length > 0) {
        handleBatchDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectAll, handleBatchDelete, selectedNodeIds.length]);

  // Batch resize by delta (e.g. -20, -15 to shrink; +20, +15 to enlarge)
  const handleBatchResizeStep = useCallback(
    (deltaW: number, deltaH: number) => {
      if (selectedNodeIds.length === 0) return;
      const count = selectedNodeIds.length;
      let sampleW = 0;
      let sampleH = 0;

      const updated = nodes.map((n) => {
        if (!selectedNodeIds.includes(n.id)) return n;
        const newW = Math.min(360, Math.max(80, n.width + deltaW));
        const newH = Math.min(240, Math.max(50, n.height + deltaH));
        sampleW = newW;
        sampleH = newH;
        return { ...n, width: newW, height: newH };
      });

      pushHistory(updated);
      toast.success(
        deltaW < 0
          ? `Perkecil kotak: ${sampleW}×${sampleH} px (${count} ruangan)`
          : `Perbesar kotak: ${sampleW}×${sampleH} px (${count} ruangan)`
      );
    },
    [selectedNodeIds, nodes, pushHistory]
  );

  // Batch set exact size (e.g. 100x60, 130x80, 160x100, 180x110)
  const handleBatchSetSize = useCallback(
    (width: number, height: number) => {
      if (selectedNodeIds.length === 0) return;
      const count = selectedNodeIds.length;
      const targetW = Math.min(360, Math.max(80, width));
      const targetH = Math.min(240, Math.max(50, height));

      const updated = nodes.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, width: targetW, height: targetH } : n
      );

      pushHistory(updated);
      toast.success(`Ukuran disetel: ${targetW}×${targetH} px (${count} ruangan)`);
    },
    [selectedNodeIds, nodes, pushHistory]
  );

  // Calculate current average size of selected nodes (Memoized for O(1) rendering)
  const currentSize = useMemo(() => {
    if (selectedNodeIds.length === 0) return undefined;
    const selectedSet = new Set(selectedNodeIds);
    const selected = nodes.filter((n) => selectedSet.has(n.id));
    if (selected.length === 0) return undefined;
    const totalW = selected.reduce((acc, n) => acc + n.width, 0);
    const totalH = selected.reduce((acc, n) => acc + n.height, 0);
    return {
      width: Math.round(totalW / selected.length),
      height: Math.round(totalH / selected.length),
    };
  }, [nodes, selectedNodeIds]);

  return {
    selectedNodeIds,
    setSelectedNodeIds,
    marqueeBox,
    currentSize,
    handleSelectNode,
    handleStartDrag,
    handleStartResize,
    handleCanvasMouseDown,
    handleBatchRotate,
    handleBatchToggleTextUpright,
    handleBatchFlipH,
    handleBatchDelete,
    handleSelectAll,
    handleBatchResizeStep,
    handleBatchSetSize,
  };
}
