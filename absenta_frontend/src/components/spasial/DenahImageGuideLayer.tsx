import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Lock, Move, AlertCircle } from 'lucide-react';
import type { DenahImageGuideConfig } from '../../types/spasial.types';

export interface DenahImageGuideLayerProps {
  config: DenahImageGuideConfig;
  width: number;
  height: number;
  canvasScale?: number;
  onImageChange?: (updated: Partial<DenahImageGuideConfig>) => void;
}

export const DenahImageGuideLayer: React.FC<DenahImageGuideLayerProps> = React.memo(
  ({ config, width, height, canvasScale = 1, onImageChange }) => {
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
      startX: 0,
      startY: 0,
      initX: 0,
      initY: 0,
    });
    const [hasError, setHasError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
      setHasError(false);
    }, [config.url]);

    // Handle mouse drag to reposition image when unlocked
    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (config.is_locked || !onImageChange) return;
        // Hanya proses klik kiri
        if (e.button !== 0) return;
        e.stopPropagation();

        isDraggingRef.current = true;
        dragStartRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          initX: config.x || 0,
          initY: config.y || 0,
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
          if (!isDraggingRef.current) return;
          const deltaX = (moveEvent.clientX - dragStartRef.current.startX) / canvasScale;
          const deltaY = (moveEvent.clientY - dragStartRef.current.startY) / canvasScale;
          onImageChange({
            x: Math.round(dragStartRef.current.initX + deltaX),
            y: Math.round(dragStartRef.current.initY + deltaY),
          });
        };

        const handleMouseUp = () => {
          isDraggingRef.current = false;
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      },
      [config.is_locked, config.x, config.y, canvasScale, onImageChange]
    );

    // Handle touch drag for mobile/tablet when unlocked
    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        if (config.is_locked || !onImageChange || e.touches.length !== 1) return;
        e.stopPropagation();

        const touch = e.touches[0];
        isDraggingRef.current = true;
        dragStartRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          initX: config.x || 0,
          initY: config.y || 0,
        };

        const handleTouchMove = (moveEvent: TouchEvent) => {
          if (!isDraggingRef.current || moveEvent.touches.length !== 1) return;
          const currentTouch = moveEvent.touches[0];
          const deltaX = (currentTouch.clientX - dragStartRef.current.startX) / canvasScale;
          const deltaY = (currentTouch.clientY - dragStartRef.current.startY) / canvasScale;
          onImageChange({
            x: Math.round(dragStartRef.current.initX + deltaX),
            y: Math.round(dragStartRef.current.initY + deltaY),
          });
        };

        const handleTouchEnd = () => {
          isDraggingRef.current = false;
          window.removeEventListener('touchmove', handleTouchMove);
          window.removeEventListener('touchend', handleTouchEnd);
        };

        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);
      },
      [config.is_locked, config.x, config.y, canvasScale, onImageChange]
    );

    if (!config.enabled || !config.url) {
      return null;
    }

    const {
      x = 0,
      y = 0,
      scale = 1,
      rotation = 0,
      opacity = 0.85,
      fit = 'contain',
      is_locked = true,
    } = config;

    return (
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          zIndex: 1,
        }}
        className={`absolute inset-0 select-none overflow-hidden transition-opacity duration-200 ${
          is_locked ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        {/* Layer Kontainer Gambar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`,
            transformOrigin: 'center center',
            opacity,
            cursor: is_locked ? 'default' : 'grab',
            userSelect: 'none',
          }}
          className={`${!is_locked ? 'active:cursor-grabbing' : ''}`}
        >
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-red-500/10 border-2 border-dashed border-red-400 text-red-500">
              <AlertCircle className="w-8 h-8 mb-2 animate-bounce" />
              <p className="text-xs font-bold">Gagal memuat berkas gambar denah</p>
              <p className="text-[10px] text-slate-400 max-w-xs text-center truncate">{config.url}</p>
            </div>
          ) : (
            <img
              src={config.url}
              alt={config.file_name || 'Denah Blueprint'}
              draggable={false}
              onError={() => setHasError(true)}
              style={{
                maxWidth: fit === 'original' ? 'none' : '100%',
                maxHeight: fit === 'original' ? 'none' : '100%',
                objectFit: fit === 'cover' ? 'cover' : 'contain',
                pointerEvents: 'none',
              }}
              className="transition-transform duration-75 drop-shadow-sm"
            />
          )}

          {/* Outline penanda saat mode unlocked agar batas gambar terlihat jelas */}
          {!is_locked && (
            <div
              style={{
                position: 'absolute',
                inset: -6,
                border: '2px dashed #10b981',
                borderRadius: '8px',
                pointerEvents: 'none',
                opacity: isHovered ? 0.9 : 0.6,
              }}
            />
          )}
        </div>

        {/* Floating helper badge saat gambar dalam mode Unlock (Dapat Digeser) */}
        {!is_locked && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 text-emerald-200 border border-emerald-500/50 shadow-xl backdrop-blur-md text-[11px] font-semibold pointer-events-none animate-fade-in"
          >
            <Move className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span>Mode Atur Gambar: Klik & seret gambar langsung di kanvas untuk menggeser</span>
          </div>
        )}
      </div>
    );
  }
);

DenahImageGuideLayer.displayName = 'DenahImageGuideLayer';
