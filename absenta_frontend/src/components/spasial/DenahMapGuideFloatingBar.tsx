import React, { useState } from 'react';
import {
  Search,
  Crosshair,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  ClipboardPaste,
  Compass,
  Check,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { DenahMapGuideConfig } from '../../types/spasial.types';
import { parseGoogleMapsCoordinates, SearchResultItem } from './denahMapHelper';
import { DenahMapInteractivitySection } from './DenahMapInteractivitySection';

interface DenahMapGuideFloatingBarProps {
  config: DenahMapGuideConfig;
  onUpdateConfig: (updated: Partial<DenahMapGuideConfig>) => void;
  onClose: () => void;
  isLightMode: boolean;
}

export const DenahMapGuideFloatingBar: React.FC<DenahMapGuideFloatingBarProps> = ({
  config,
  onUpdateConfig,
  onClose,
  isLightMode,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [inputTab, setInputTab] = useState<'COORDS' | 'SEARCH'>('COORDS');
  const [coordInput, setCoordInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  // Apply coordinates from input string
  const handleApplyCoordinates = (rawText: string) => {
    const parsed = parseGoogleMapsCoordinates(rawText);
    if (!parsed) {
      toast.error('Format koordinat tidak valid. Contoh: -6.837123, 108.225456');
      return;
    }

    onUpdateConfig({
      lat: parsed.lat,
      lng: parsed.lng,
      zoom: 18,
      location_name: `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`,
    });
    setCoordInput(`${parsed.lat}, ${parsed.lng}`);
    toast.success(`Berhasil memuat lokasi: ${parsed.lat}, ${parsed.lng}`);
  };

  // Paste from system clipboard
  const handlePasteClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        toast.error('Akses clipboard tidak didukung oleh browser Anda');
        return;
      }
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast('Clipboard kosong. Silakan salin koordinat dari Google Maps terlebih dahulu', {
          icon: '📋',
        });
        return;
      }
      setCoordInput(text.trim());
      handleApplyCoordinates(text.trim());
    } catch (err: any) {
      toast.error('Gagal membaca clipboard: ' + (err.message || 'Izin ditolak'));
    }
  };

  // Search location using OpenStreetMap Nominatim
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if user accidentally pasted coordinates in the search box
    const directCoords = parseGoogleMapsCoordinates(searchQuery);
    if (directCoords) {
      handleApplyCoordinates(searchQuery);
      return;
    }

    setIsSearching(true);
    setShowResultsDropdown(true);

    try {
      const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        searchQuery.trim()
      )}&limit=5&countrycodes=id`;

      const res = await fetch(endpoint, {
        headers: { 'Accept-Language': 'id' },
      });

      if (!res.ok) throw new Error('Gagal menghubungi server pencarian peta');

      const data: SearchResultItem[] = await res.json();
      setSearchResults(data);

      if (data.length === 0) {
        toast('Nama sekolah tidak ditemukan. Silakan gunakan tab "Paste Koordinat"', {
          icon: '📍',
        });
      }
    } catch (err: any) {
      toast.error('Gagal mencari nama: ' + (err.message || 'Koneksi bermasalah'));
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Select location from search dropdown
  const handleSelectLocation = (item: SearchResultItem) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    onUpdateConfig({
      lat,
      lng,
      zoom: 18,
      location_name: item.display_name.split(',')[0],
    });
    setShowResultsDropdown(false);
    toast.success(`Menuju lokasi: ${item.display_name.split(',')[0]}`);
  };

  // Browser Geolocation (GPS)
  const handleUseCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Browser tidak mendukung GPS');
      return;
    }

    toast('Mendeteksi lokasi perangkat...', { icon: '📍' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        onUpdateConfig({
          lat,
          lng,
          zoom: 18,
          location_name: 'Lokasi GPS Perangkat',
        });
        setCoordInput(`${lat}, ${lng}`);
        toast.success('Peta bergeser ke lokasi perangkat');
      },
      (err) => {
        toast.error('Gagal membaca GPS: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
                <span className="text-[10px] px-1.5 py-0.2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded font-mono truncate max-w-[130px]">
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
          {/* Method Switcher Tabs: Coordinates vs Search */}
          <div className="flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setInputTab('COORDS')}
              className={`flex-1 py-1 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                inputTab === 'COORDS'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Paste Koordinat</span>
            </button>
            <button
              type="button"
              onClick={() => setInputTab('SEARCH')}
              className={`flex-1 py-1 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                inputTab === 'SEARCH'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Cari Nama</span>
            </button>
          </div>

          {/* TAB 1: Paste Coordinates from Google Maps */}
          {inputTab === 'COORDS' ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={coordInput}
                  onChange={(e) => setCoordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoordinates(coordInput)}
                  placeholder="Paste koordinat: -6.83712, 108.22545"
                  className="w-full text-xs px-2.5 py-1.5 font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />

                <button
                  type="button"
                  onClick={() => handleApplyCoordinates(coordInput)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer shadow-xs"
                  title="Terapkan koordinat ke peta"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handlePasteClipboard}
                  className="flex-1 py-1 px-2 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Tempel dari Clipboard</span>
                </button>

                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  title="Gunakan GPS Perangkat"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>GPS</span>
                </button>
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                💡 <strong>Cara dari Google Maps:</strong> Buka Google Maps → klik kanan gedung sekolah → klik angka koordinat paling atas untuk copy → klik <em>Tempel dari Clipboard</em> di atas.
              </div>
            </div>
          ) : (
            /* TAB 2: Search by Name */
            <div className="relative">
              <form onSubmit={handleSearch} className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama sekolah atau kota..."
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
          )}

          {/* Mode Kunci / Geser Peta */}
          <DenahMapInteractivitySection config={config} onUpdateConfig={onUpdateConfig} />

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
