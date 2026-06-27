import React from 'react';
import { ExternalLink, Camera, LogIn, LogOut, ClipboardList, ShieldCheck } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { HUBIN_CONFIG } from '../constants/HubinConstants';

/**
 * Helper to format time strings from various formats (ISO, HH:mm:ss, HH:mm)
 */
export const formatTimeHuman = (t?: string) => {
  if (!t) return null;
  
  // ISO Format (contains T)
  if (t.includes('T')) {
    try {
      const parsed = parseISO(t);
      if (isValid(parsed)) return format(parsed, 'HH:mm');
    } catch (e) { /* fallback */ }
  }

  // HH:mm:ss or HH:mm
  if (t.includes(':')) {
    const parts = t.split(':');
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  
  return t;
};

/**
 * Haversine formula to calculate distance in meters between two coordinates
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = HUBIN_CONFIG.EARTH_RADIUS_METERS;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Standardized filename generator for PKL artifacts
 */
export const generateHubinFileName = (studentName: string | undefined, className: string | undefined, type: string): string => {
  const name = (studentName || 'Siswa').replace(/[^a-zA-Z0-9]/g, '_');
  const cleanClassName = (className || 'Kelas').replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = format(new Date(), 'dd-MM-yyyy');
  return `${cleanClassName}_${name}_${type}_${dateStr}.jpg`;
};

/**
 * Mendapatkan URL thumbnail dari Google Drive yang robust
 */
export const getDriveThumbnailUrl = (url: string | undefined): string | null => {
  if (!url) return null;
  
  // Extract File ID using a more robust approach
  let fileId = '';
  
  // Pattern 1: /file/d/[ID]/view
  const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  // Pattern 2: ?id=[ID] or &id=[ID]
  const openIdMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  // Pattern 3: /d/[ID]/
  const dMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  
  if (fileIdMatch && fileIdMatch[1]) {
    fileId = fileIdMatch[1];
  } else if (openIdMatch && openIdMatch[1]) {
    fileId = openIdMatch[1];
  } else if (dMatch && dMatch[1]) {
    fileId = dMatch[1];
  }

  if (fileId) {
    // Exclude simulated fake IDs
    if (fileId.startsWith('1_gdrive_')) {
      return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=60';
    }
    
    // Format lh3 is more robust for organizational accounts and different sharing settings.
    // Adding =s300 for 300px size
    return `https://lh3.googleusercontent.com/d/${fileId}=s300`;
  }

  return null;
};

/**
 * Resolves attachment URL for local development by rewriting app.absenta.id to localhost
 */
export const resolveAttachmentUrl = (url: string | undefined): string => {
  if (!url) return '';
  // If in development mode, rewrite app.absenta.id URLs to relative path to load from local backend
  if (import.meta.env.DEV && url.includes('app.absenta.id/api/uploads/')) {
    return url.replace(/^https?:\/\/app\.absenta\.id/, '');
  }
  return url;
};

/**
 * Merender seluruh timeline harian termasuk jam masuk, jurnal, dan jam pulang
 */
export const renderDailyTimeline = (abs: any) => {
  const jamMasuk = formatTimeHuman(abs.jam_masuk);
  const jamPulang = formatTimeHuman(abs.jam_pulang);
  
  let activities: any[] = [];
  try {
    if (abs.kegiatan) {
      const parsed = JSON.parse(abs.kegiatan);
      if (Array.isArray(parsed)) activities = parsed;
    }
  } catch (e) {}

  // Combine all events into one timeline
  const timelineItems: { time: string; text: string; type: 'IN' | 'OUT' | 'WORK'; image_url?: string; is_outside?: boolean; address?: string }[] = [];
  
  if (jamMasuk) {
    let distanceText = '';
    if (abs.is_outside_radius && abs.distance_meters) {
      const km = (abs.distance_meters / 1000).toFixed(2);
      distanceText = ` (Jarak: ${km} km)`;
    }

    timelineItems.push({ 
      time: jamMasuk, 
      text: abs.is_outside_radius ? `Check-In Masuk (Dinas Luar)${distanceText}` : 'Check-In Masuk', 
      type: 'IN', 
      image_url: abs.image_url,
      is_outside: abs.is_outside_radius,
      address: abs.address_snapshot
    });
  }
  
  activities.forEach(act => {
    timelineItems.push({ ...act, type: 'WORK' });
  });
  
  if (jamPulang) {
    timelineItems.push({ time: jamPulang, text: 'Check-Out Pulang', type: 'OUT', image_url: abs.image_url_out });
  }

  if (timelineItems.length === 0) {
    return <span className="text-slate-400 italic text-xs pl-2">Tidak ada catatan aktivitas</span>;
  }

  // Sort DESCENDING (Newest at top: Out -> Work -> In)
  const sorted = [...timelineItems].sort((a, b) => b.time.localeCompare(a.time));

  return (
    <div className="relative ml-1 pl-4 space-y-3 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
      {sorted.map((item, idx) => {
        const isEntry = item.type === 'IN';
        const isExit = item.type === 'OUT';
        const isWork = item.type === 'WORK';
        
        return (
          <div key={idx} className="relative group/item">
            {/* Dot marker with specific colors */}
            <span className={`absolute -left-[18.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 z-10 transition-transform group-hover/item:scale-125 ${
              isEntry ? (item.is_outside ? 'bg-amber-500' : 'bg-emerald-500') : 
              isExit ? 'bg-rose-500' : 
              'bg-slate-300 dark:bg-slate-600 group-hover/item:bg-indigo-500'
            }`} />
            
            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-2 flex-wrap flex-1 min-w-0">
                <span className={`font-mono text-[9px] font-black px-1.5 py-0.5 rounded-md border shadow-sm shrink-0 h-fit mt-0.5 ${
                  isEntry ? (item.is_outside ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400') :
                  isExit ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/30' :
                  'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/30'
                }`}>
                  {item.time}
                </span>
                
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  {isEntry && (item.is_outside ? <ShieldCheck size={9} className="text-amber-500" /> : <LogIn size={9} className="text-emerald-500" />)}
                  {isExit && <LogOut size={9} className="text-rose-500" />}
                  {isWork && <ClipboardList size={9} className="text-indigo-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[10px] font-bold leading-relaxed break-words ${
                    isEntry ? (item.is_outside ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300') :
                    isExit ? 'text-rose-700 dark:text-rose-300' :
                    'text-slate-700 dark:text-slate-200'
                  }`}>
                    {item.text}
                  </span>
                  
                  {isEntry && item.is_outside && item.address && (
                    <p className="text-[8px] font-medium text-slate-400 dark:text-slate-500 mt-0.5 leading-tight italic">
                      📍 {item.address}
                    </p>
                  )}
                </div>

                {item.image_url && (() => {
                  const resolvedUrl = resolveAttachmentUrl(item.image_url);
                  const thumbUrl = getDriveThumbnailUrl(resolvedUrl);
                  const isDrive = resolvedUrl.includes('drive.google.com');
                  return (
                    <div className="shrink-0 ml-1 mt-0.5">
                      {thumbUrl || (!isDrive && resolvedUrl) ? (
                        <a 
                          href={resolvedUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block w-8 h-8 relative group/img overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:ring-2 hover:ring-indigo-650 transition-all"
                        >
                          <img 
                            src={thumbUrl || resolvedUrl} 
                            alt="Foto Bukti" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink size={8} className="text-white" />
                          </div>
                        </a>
                      ) : (
                        <a 
                          href={resolvedUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 hover:bg-indigo-50 transition-all"
                          title="Lihat Foto"
                        >
                          <Camera size={12} />
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Merender teks aktivitas dengan format timeline mini
 */
export const renderActivityText = (kegiatanStr: string | undefined) => {
  if (!kegiatanStr) return <span className="text-slate-400 italic text-xs">Tidak ada catatan kegiatan</span>;
  try {
    const parsed = JSON.parse(kegiatanStr);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Sort descending: newest activities first
      const sorted = [...parsed].sort((a, b) => b.time.localeCompare(a.time));
      return (
        <div className="relative ml-2 pl-4 space-y-3 before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
          {sorted.map((item: any, idx: number) => (
            <div key={idx} className="relative group/item">
              {/* Dot marker */}
              <span className="absolute -left-[18.5px] top-1.5 h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-900 group-hover/item:bg-indigo-500 transition-colors" />
              
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                    {item.time}
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-relaxed">
                    {item.text}
                  </span>
                </div>
                
                {item.image_url && (() => {
                  const thumbUrl = getDriveThumbnailUrl(item.image_url);
                  return (
                    <div className="mt-1">
                      {thumbUrl ? (
                        <a 
                          href={item.image_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="block w-9 h-9 relative group/img overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm hover:ring-2 hover:ring-indigo-650 transition-all shrink-0"
                        >
                          <img 
                            src={thumbUrl} 
                            alt="Foto Kegiatan" 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <ExternalLink size={10} className="text-white" />
                          </div>
                        </a>
                      ) : (
                        <a 
                          href={item.image_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-600 hover:underline"
                        >
                          <Camera size={10} />
                          Lihat Foto
                        </a>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      );
    }
  } catch (e) {
    // Return plain text as fallback
  }
  return <span className="text-slate-700 dark:text-slate-350 text-sm font-bold leading-relaxed block pl-2 border-l-2 border-slate-100 dark:border-slate-800">"{kegiatanStr}"</span>;
};

/**
 * Merender teks aktivitas khusus untuk tampilan cetak dengan dukungan foto inline
 */
export const renderActivityTextForPrint = (abs: any) => {
  const jamMasuk = formatTimeHuman(abs.jam_masuk);
  const jamPulang = formatTimeHuman(abs.jam_pulang);
  
  let activities: any[] = [];
  try {
    if (abs.kegiatan) {
      const parsed = JSON.parse(abs.kegiatan);
      if (Array.isArray(parsed)) activities = parsed;
    }
  } catch (e) {}

  const timelineItems: { time: string; text: string; type: 'IN' | 'OUT' | 'WORK'; image_url?: string }[] = [];
  
  if (jamMasuk) {
    timelineItems.push({ time: jamMasuk, text: 'Check-In Masuk', type: 'IN', image_url: abs.image_url });
  }
  
  activities.forEach(act => {
    timelineItems.push({ ...act, type: 'WORK' });
  });
  
  if (jamPulang) {
    timelineItems.push({ time: jamPulang, text: 'Check-Out Pulang', type: 'OUT', image_url: abs.image_url_out });
  }

  if (timelineItems.length === 0) {
    return <span className="italic text-slate-400 text-[8px]">Tidak ada catatan kegiatan</span>;
  }

  // Sort ASCENDING for formal report/print
  const sorted = [...timelineItems].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-1.5 my-0.5">
      {sorted.map((item, idx) => {
        const isEntry = item.type === 'IN';
        const isExit = item.type === 'OUT';
        
        return (
          <div key={idx} className="flex gap-1.5 items-start border-b border-slate-50 last:border-0 pb-1 last:pb-0">
            <span className="font-mono font-bold bg-slate-50 px-1 py-0.5 rounded text-[7px] shrink-0 border border-slate-100">{item.time}</span>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start gap-1.5">
                <p className={`text-[9px] leading-snug flex-1 ${isEntry || isExit ? 'font-bold' : 'text-slate-900'}`}>
                  {isEntry ? '→ ' : isExit ? '← ' : ''}
                  {item.text}
                </p>
                {item.image_url && (() => {
                  const thumb = getDriveThumbnailUrl(item.image_url);
                  return thumb ? (
                    <img 
                      src={thumb} 
                      alt="Bukti" 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 object-cover rounded border border-slate-200 shrink-0"
                    />
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/**
 * Merender galeri foto aktivitas untuk tampilan cetak
 */
export const renderActivityImagesForPrint = (kegiatanStr: string | undefined, checkInImageUrl?: string, checkOutImageUrl?: string) => {
  const images: string[] = [];
  
  // Add check-in image
  if (checkInImageUrl) images.push(checkInImageUrl);
  
  // Add images from logbook activities
  if (kegiatanStr) {
    try {
      const parsed = JSON.parse(kegiatanStr);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item.image_url) images.push(item.image_url);
        });
      }
    } catch (e) {}
  }

  // Add check-out image last
  if (checkOutImageUrl) images.push(checkOutImageUrl);

  if (images.length === 0) return <span className="text-[7px] text-slate-300 italic">Tidak ada foto</span>;

  return (
    <div className="flex flex-wrap gap-1 justify-center py-1">
      {images.map((url, idx) => {
        const thumb = getDriveThumbnailUrl(url);
        return thumb ? (
          <div key={idx} className="relative">
            <img 
              src={thumb} 
              alt="Bukti" 
              referrerPolicy="no-referrer"
              className="w-10 h-10 object-cover rounded border border-slate-200"
            />
          </div>
        ) : null;
      })}
    </div>
  );
};

export interface SchoolTenantInfo {
  id: string;
  nama_sekolah?: string;
  logo_url?: string;
  alamat?: string;
  kontak?: string;
}

export interface GeolocationPositionWithMock extends GeolocationPosition {
  mocked?: boolean;
  coords: GeolocationCoordinates & {
    isFromMockProvider?: boolean;
  };
}

export interface UserAuthStore {
  id: string;
  email: string;
  full_name: string;
  siswa_id?: string;
  tenant_id?: string;
  role?: {
    name: string;
  };
  position_codes?: string[];
  capabilities?: string[];
  Role?: {
    rolePermissions?: Array<{ permission_id: string }>;
  };
}

export interface ActivityItem {
  time: string;
  text: string;
  image_url?: string;
}

export interface ApiErrorResponse {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export interface CheckInPayload {
  siswaPklId: string;
  latitude: number;
  longitude: number;
  kegiatan?: string;
  image_url?: string;
}

