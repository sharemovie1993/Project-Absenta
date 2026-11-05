import React, { useState } from 'react';
import {
  Search,
  Crosshair,
  Lock,
  Unlock,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  EyeOff,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  MapPin,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DenahMapGuideConfig, MapTileProvider } from '../../types/spasial.types';

interface DenahMapGuideFloatingBarProps {
  config: DenahMapGuideConfig;
  onUpdateConfig: (updated: Partial<DenahMapGuideConfig>) => void;
  onClose: () => void;
  isLightMode: boolean;
}

interface SearchResultItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const DenahMapGuideFloatingBar: React.FC<DenahMapGuideFloatingBarProps> = ({
  config,
  onUpdateConfig,
  onClose,
  isLightMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  // Search location using OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setShowResultsDropdown(true);

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&limit=5&countrycodes=id`;

      const res = await fetch(endpoint, {
        headers: {
          'Accept-Language': 'id',
        },
      });

      if (!res.ok) throw new Error('Gagal menghubungi server pencarian peta');

      const data: SearchResultItem[] = await res.json();
      setSearchResults(data);

      if (data.length === 0) {
        toast('Lokasi tidak ditemukan, coba nama sekolah atau kota', { icon: '🔍' });
      }
    } catch (err: any) {
      toast.error('Gagal mencari lokasi: ' + (err.message || 'Koneksi bermasalah'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select location from search
  const handleSelectLocation = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    onUpdateConfig({
      lat,
      lng,
      zoom: 18, // High-detail aerial view
      location_name: item.display_name.split(',')[0],
    });
    setShowResultsDropdown(false);
    toast.success(`Menuju lokasi: ${item.display_name.split(',')[0]}`);
  };

  // Browser Geolocation (GPS)
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Browser tidak mendukung geolokasi');
      return;
    }

    toast('Mendeteksi lokasi perangkat...', { icon: '📍' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUpdateConfig({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          zoom: 18,
          location_name: 'Lokasi Perangkat Saya',
        });
        toast.success('Peta bergeser ke lokasi perangkat');
      },
      (err) => {
        toast.error('Gagal membaca GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Fine-tuning micro pan steps
  const handleMicroPan = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const step = 0.0003; // Approx 30 meters
    let newLat = config.lat;
    let newLng = config.lng;

    if (dir === 'UP') newLat += step;
    if (dir === 'DOWN') newLat -= step;
    if (dir === 'LEFT') newLng -= step;
    if (dir === 'RIGHT') newLng += step;

    onUpdateConfig({
      lat: Number(newLat.toFixed(6)),
      lng: Number(newLng.toFixed(6)),
    });
  };

  return (
    <aside
      aria-label="Panel Panduan Peta Satelit"
      className={`absolute bottom-4 right-4 z-40 rounded-2xl shadow-2xl border backdrop-blur-md transition-all ${
        isLightMode
          ? 'bg-white/95 border-slate-300 text-slate-800'
          : 'bg-slate-900/95 border-slate-700 text-slate-100'
      } ${isCollapsed ? 'w-auto' : 'w-96'}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold flex items-center gap-1.5">
              <span>Panduan Peta Satelit</span>
              {config.location_name && (
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-normal truncate max-w-[120px]">
                  {config.location_name}
                </span>
              )}
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onUpdateConfig({ enabled: !config.enabled })}
            className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
              config.enabled
                ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-transparent'
            }`}
            title={config.enabled ? 'Sembunyikan Peta' : 'Tampilkan Peta'}
          >
            {config.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
            title={isCollapsed ? 'Perluas Kontrol' : 'Kecilkan Kontrol'}
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
            title="Tutup Panduan Peta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Controls Body */}
      {!isCollapsed && (
        <div className="p-3.5 space-y-3">
          {/* Location Search Bar */}
          <div className="relative">
            <form onSubmit={handleSearch} className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari sekolah (misal: SMKN 1 ...)"
                  className="w-full text-xs pl-7 pr-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Search className="w-3.5 h-3.5 absolute left-2 top-2.5 text-slate-400" />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cari'}
              </button>

              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Gunakan Lokasi GPS Saya"
                className="p-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
              >
                <Crosshair className="w-4 h-4" />
              </button>
            </form>

            {/* Dropdown Results */}
            {showResultsDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-9 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 dark:hover:bg-slate-700/60 border-b border-slate-100 dark:border-slate-700/40 flex items-start gap-2 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <span className="line-clamp-2 text-slate-700 dark:text-slate-200">
                      {item.display_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode Kunci / Geser Peta */}
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Interaksi Peta:
              </span>
              <button
                type="button"
                onClick={() => {
                  const newLocked = !config.is_locked;
                  onUpdateConfig({ is_locked: newLocked });
                  if (newLocked) {
                    toast.success('Peta dikunci. Sekarang Anda bebas menggeser kotak ruangan!');
                  } else {
                    toast('Peta dibuka kunci. Silakan geser / zoom peta untuk menyelaraskan bangunan.', {
                      icon: '🔓',
                    });
                  }
                }}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
                  config.is_locked
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {config.is_locked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Terkunci (Susun Ruang)</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Buka Kunci (Geser Peta)</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {config.is_locked
                ? '✅ Posisi peta terkunci tetap. Geser kotak ruangan di atas foto atap gedung sekolah.'
                : '⚠️ Peta aktif. Geser / perbesar peta sampai letak gedung sekolah pas di canvas.'}
            </p>

            {/* Fine Tuning Micro Pan & Zoom */}
            {!config.is_locked && (
              <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <Move className="w-3 h-3" />
                  <span>Geser Halus:</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMicroPan('LEFT')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Geser Kiri"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMicroPan('UP')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Geser Atas"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMicroPan('DOWN')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Geser Bawah"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMicroPan('RIGHT')}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Geser Kanan"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ zoom: Math.max(12, config.zoom - 1) })}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Perkecil Peta"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ zoom: Math.min(20, config.zoom + 1) })}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer"
                    title="Perbesar Peta"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Layer Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
              Tipe Tampilan Peta
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => onUpdateConfig({ layer: 'google_hybrid' })}
                className={`px-2 py-1.5 rounded-lg border text-left font-semibold cursor-pointer truncate ${
                  config.layer === 'google_hybrid'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Google Hybrid
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ layer: 'esri_satelit' })}
                className={`px-2 py-1.5 rounded-lg border text-left font-semibold cursor-pointer truncate ${
                  config.layer === 'esri_satelit'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Esri Satelit HD
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ layer: 'google_satelit' })}
                className={`px-2 py-1.5 rounded-lg border text-left font-semibold cursor-pointer truncate ${
                  config.layer === 'google_satelit'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                Google Polos
              </button>
              <button
                type="button"
                onClick={() => onUpdateConfig({ layer: 'osm' })}
                className={`px-2 py-1.5 rounded-lg border text-left font-semibold cursor-pointer truncate ${
                  config.layer === 'osm'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                OpenStreetMap
              </button>
            </div>
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Transparansi Satelit
              </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {Math.round(config.opacity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={config.opacity}
              onChange={(e) => onUpdateConfig({ opacity: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>
      )}
    </aside>
  );
};
