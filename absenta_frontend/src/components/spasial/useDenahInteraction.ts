import { useState, useRef, useEffect, useCallback } from 'react';
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

      const targetNodes = nodes.filter((n) => activeSelection.includes(n.id));
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

      const targetNodes = nodes.filter((n) => activeSelection.includes(n.id));
      if (targetNodes.length === 0) return;

      hasResizedRef.current = false;
      latestNodesRef.current = nodes;

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
      if (dragState.current.isDragging && dragState.current.initialPositions.length > 0) {
        hasMovedRef.current = true;
        const dx = (e.clientX - dragState.current.startX) / scale;
        const dy = (e.clientY - dragState.current.startY) / scale;
        const snappedDx = snap(dx);
        const snappedDy = snap(dy);

        const posMap = new Map(dragState.current.initialPositions.map((p) => [p.id, p]));

        setNodes((prev) => {
          const updated = prev.map((n) => {
            const initial = posMap.get(n.id);
            if (initial) {
              return {
                ...n,
                x: Math.max(0, initial.x + snappedDx),
                y: Math.max(0, initial.y + snappedDy),
              };
            }
            return n;
          });
          latestNodesRef.current = updated;
          return updated;
        });
      } else if (resizeState.current.isResizing && resizeState.current.initialSizes.length > 0) {
        hasResizedRef.current = true;
        const dx = (e.clientX - resizeState.current.startX) / scale;
        const dy = (e.clientY - resizeState.current.startY) / scale;
        const snappedDx = snap(dx);
        const snappedDy = snap(dy);

        const sizeMap = new Map(resizeState.current.initialSizes.map((s) => [s.id, s]));

        setNodes((prev) => {
          const updated = prev.map((n) => {
            const initial = sizeMap.get(n.id);
            if (initial) {
              const newW = Math.max(80, initial.origW + snappedDx);
              const newH = Math.max(50, initial.origH + snappedDy);
              return { ...n, width: newW, height: newH };
            }
            return n;
          });
          latestNodesRef.current = updated;
          return updated;
        });
      } else if (marqueeStartRef.current?.isSelecting && canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const curX = (e.clientX - rect.left - panOffset.x + canvasRef.current.scrollLeft) / scale;
        const curY = (e.clientY - rect.top - panOffset.y + canvasRef.current.scrollTop) / scale;

        const bx = Math.min(marqueeStartRef.current.startX, curX);
        const by = Math.min(marqueeStartRef.current.startY, curY);
        const bw = Math.abs(curX - marqueeStartRef.current.startX);
        const bh = Math.abs(curY - marqueeStartRef.current.startY);

        setMarqueeBox({ x: bx, y: by, width: bw, height: bh });

        // Select all nodes intersecting marquee rectangle
        const selected = nodesRef.current.filter(
          (n) => n.x < bx + bw && n.x + n.width > bx && n.y < by + bh && n.y + n.height > by
        );
        setSelectedNodeIds(selected.map((n) => n.id));
      }
    },
    [scale, panOffset, setNodes, canvasRef]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState.current.isDragging) {
      dragState.current.isDragging = false;
      dragState.current.initialPositions = [];
      if (hasMovedRef.current) {
        pushHistory(latestNodesRef.current);
        hasMovedRef.current = false;
      }
    }
    if (resizeState.current.isResizing) {
      resizeState.current.isResizing = false;
      resizeState.current.nodeId = null;
      resizeState.current.initialSizes = [];
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
    toast.success(`Memutar 90° (${selectedNodeIds.length} ruangan)`);
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

  // Calculate current average size of selected nodes
  const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id));
  const currentSize =
    selectedNodes.length > 0
      ? {
          width: Math.round(selectedNodes.reduce((acc, n) => acc + n.width, 0) / selectedNodes.length),
          height: Math.round(selectedNodes.reduce((acc, n) => acc + n.height, 0) / selectedNodes.length),
        }
      : undefined;

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
    handleBatchFlipH,
    handleBatchDelete,
    handleSelectAll,
    handleBatchResizeStep,
    handleBatchSetSize,
  };
}
