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

const TILE_URLS: Record<MapTileProvider, { url: string; maxZoom: number; subdomains?: string[] }> = {
  esri_satelit: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
  },
  google_hybrid: {
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  google_satelit: {
    url: 'https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    maxZoom: 20,
    subdomains: ['0', '1', '2', '3'],
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
  },
};

export const DenahMapGuideLayer: React.FC<DenahMapGuideLayerProps> = ({
  config,
  width,
  height,
  onMapChange,
}) => {
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

    // Attach initial tile layer
    const tileConfig = TILE_URLS[config.layer] || TILE_URLS.google_hybrid;
    const tileLayer = L.tileLayer(tileConfig.url, {
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
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

    // Initial resize check
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
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
      maxZoom: tileConfig.maxZoom,
      subdomains: tileConfig.subdomains || 'abc',
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
    const diffZoom = currentZoom !== config.zoom;

    if (diffLat > 0.00005 || diffLng > 0.00005 || diffZoom) {
      isUpdatingFromProps.current = true;
      map.setView([config.lat, config.lng], config.zoom, { animate: true });
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 500);
    }
  }, [config.lat, config.lng, config.zoom]);

  // Update lock/unlock interactions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

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
  }, [config.is_locked]);

  // Handle dimensions resize
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.invalidateSize();
    }
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        opacity: config.opacity,
        zIndex: 1,
      }}
      className={`absolute inset-0 select-none overflow-hidden rounded-xl transition-opacity duration-200 ${
        config.is_locked ? 'pointer-events-none' : 'pointer-events-auto cursor-grab active:cursor-grabbing'
      }`}
    />
  );
};
