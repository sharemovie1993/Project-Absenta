import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { DenahMapGuideConfig, MapTileProvider } from '../../types/spasial.types';

interface DenahMapGuideLayerProps {
  config: DenahMapGuideConfig;
  width: number;
  height: number;
  onMapChange: (updated: Partial<DenahMapGuideConfig>) => void;
}

const TILE_URLS: Record<MapTileProvider, { url: string; maxNativeZoom: number; subdomains?: string[] }> = {
  esri_satelit: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxNativeZoom: 19,
  },
  google_hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxNativeZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  google_satelit: {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    maxNativeZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxNativeZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
};

export const DenahMapGuideLayer = React.memo<DenahMapGuideLayerProps>(
  ({ config, width, height, onMapChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const currentTileLayerRef = useRef<L.TileLayer | null>(null);
  const isUpdatingFromProps = useRef(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current, {
      center: [config.lat, config.lng],
      zoom: config.zoom,
      minZoom: 12,
      maxZoom: 24,
      zoomSnap: 0.1,
      zoomDelta: 0.2,
      wheelPxPerZoomLevel: 100,
      zoomControl: false,
      attributionControl: false,
      dragging: !config.is_locked,
      scrollWheelZoom: !config.is_locked,
      doubleClickZoom: !config.is_locked,
      touchZoom: !config.is_locked,
    });

    mapRef.current = map;

    // Attach initial tile layer with digital oversampling up to zoom 24
    const tileConfig = TILE_URLS[config.layer] || TILE_URLS.google_hybrid;
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxNativeZoom: tileConfig.maxNativeZoom,
      maxZoom: 24,
      subdomains: tileConfig.subdomains || 'abc',
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      crossOrigin: true,
    }).addTo(map);
    currentTileLayerRef.current = tileLayer;

    // Listen to user map interactions when unlocked
    const handleMoveEnd = () => {
      if (isUpdatingFromProps.current) return;
      const center = map.getCenter();
      const zoom = map.getZoom();
      onMapChange({
        lat: Number(center.lat.toFixed(6)),
        lng: Number(center.lng.toFixed(6)),
        zoom,
      });
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    // Initial resize checks for modals & tab transitions
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    const t3 = setTimeout(() => map.invalidateSize(), 800);

    const handleWindowResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', handleWindowResize);
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
      map.remove();
      mapRef.current = null;
      currentTileLayerRef.current = null;
    };
  }, []);

  // Update tile provider if changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentTileLayerRef.current) {
      map.removeLayer(currentTileLayerRef.current);
    }

    const tileConfig = TILE_URLS[config.layer] || TILE_URLS.google_hybrid;
    const newLayer = L.tileLayer(tileConfig.url, {
      maxNativeZoom: tileConfig.maxNativeZoom,
      maxZoom: 24,
      subdomains: tileConfig.subdomains || 'abc',
      keepBuffer: 8,
      updateWhenIdle: false,
      updateWhenZooming: true,
      crossOrigin: true,
    }).addTo(map);

    currentTileLayerRef.current = newLayer;
  }, [config.layer]);

  // Update center/zoom if changed from search or buttons
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    const diffLat = Math.abs(currentCenter.lat - config.lat);
    const diffLng = Math.abs(currentCenter.lng - config.lng);
    const diffZoom = Math.abs(currentZoom - config.zoom) > 0.05;

    if (diffLat > 0.0001 || diffLng > 0.0001 || diffZoom) {
      isUpdatingFromProps.current = true;
      map.stop();
      map.setView([config.lat, config.lng], config.zoom, { animate: false });
      setTimeout(() => {
        isUpdatingFromProps.current = false;
        if (mapRef.current) {
          mapRef.current.invalidateSize({ debounceMoveend: true });
        }
      }, 50);
    }
  }, [config.lat, config.lng, config.zoom]);

  // Update lock/unlock interactions without interrupting rendering
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.stop();

    if (config.is_locked) {
      map.dragging.disable();
      map.scrollWheelZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoom.disable();
    } else {
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoom.enable();
    }

    // Force tile revalidation so screen NEVER goes blank
    requestAnimationFrame(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ debounceMoveend: true });
      }
    });
  }, [config.is_locked]);

  // Handle dimensions resize
  const rotation = config.rotation || 0;
  const oversize = 1.5;
  const mapWidth = Math.round(width * oversize);
  const mapHeight = Math.round(height * oversize);
  const offsetX = Math.round((mapWidth - width) / 2);
  const offsetY = Math.round((mapHeight - height) / 2);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [mapWidth, mapHeight]);

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        opacity: config.opacity,
        zIndex: 1,
      }}
      className={`absolute inset-0 select-none overflow-hidden rounded-xl transition-opacity duration-200 ${
        config.is_locked ? 'pointer-events-none' : 'pointer-events-auto cursor-grab active:cursor-grabbing'
      }`}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          width: `${mapWidth}px`,
          height: `${mapHeight}px`,
          left: `-${offsetX}px`,
          top: `-${offsetY}px`,
          transform: `rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: 'transform 0.1s ease-out',
        }}
      />
    </div>
  );
}, (prev, next) => {
  return (
    prev.width === next.width &&
    prev.height === next.height &&
    prev.config.enabled === next.config.enabled &&
    prev.config.lat === next.config.lat &&
    prev.config.lng === next.config.lng &&
    prev.config.zoom === next.config.zoom &&
    prev.config.rotation === next.config.rotation &&
    prev.config.opacity === next.config.opacity &&
    prev.config.layer === next.config.layer &&
    prev.config.is_locked === next.config.is_locked
  );
});

DenahMapGuideLayer.displayName = 'DenahMapGuideLayer';
