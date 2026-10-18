import { jsPDF } from 'jspdf';
import { getBase64ImageFromUrl } from '../../cooperative/coopDocUtils';

export interface PrintRaporOptions {
  siswaId: string;
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  tenantId?: string;
}

export interface PrintRaporBatchOptions {
  students: any[];
  tahunPelajaranId: string;
  semesterId: string;
  tahunPelajaranNama?: string;
  semesterNama?: string;
  kelasNama?: string;
  onProgress?: (current: number, total: number, studentName: string) => void;
}

/**
 * Standar Urutan Mata Pelajaran e-Rapor Kemendikbudristek (Multi-Jenjang: SD, SMP, SMA, SMK)
 */
export const getMapelCanonicalPriority = (
  mapelName: string,
  kelompok: string,
  jenjang: 'SD' | 'SMP' | 'SMA' | 'SMK',
  urutanDb?: number
): number => {
  if (typeof urutanDb === 'number' && urutanDb > 0 && urutanDb < 900) {
    return urutanDb;
  }

  const name = (mapelName || '').toLowerCase().trim();
  const grp = (kelompok || '').toLowerCase().trim();

  // 1. KELOMPOK MATA PELAJARAN UMUM
  if (grp.includes('umum')) {
    if (name.includes('agama') || name.includes('budi pekerti') || name.includes('pai') || name.includes('pak')) return 10;
    if (name.includes('pancasila') || name.includes('ppkn') || name.includes('kewarganegaraan')) return 20;
    if (name.includes('bahasa indonesia') || name === 'indonesia') return 30;

    if (jenjang === 'SMK') {
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok') || name.includes('penjas')) return 40;
      if (name.includes('sejarah')) return 50;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 60;
      if (name.includes('matematika')) return 70;
      if (name.includes('inggris')) return 80;
    } else if (jenjang === 'SD') {
      if (name.includes('matematika')) return 40;
      if (name.includes('ipas') || (name.includes('alam') && name.includes('sosial'))) return 50;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 60;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 70;
      if (name.includes('inggris')) return 80;
    } else if (jenjang === 'SMP') {
      if (name.includes('matematika')) return 40;
      if (name.includes('ipa') || name.includes('alam')) return 50;
      if (name.includes('ips') || name.includes('sosial')) return 60;
      if (name.includes('inggris')) return 70;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 80;
      if (name.includes('informatika')) return 90;
      if (name.includes('seni') || name.includes('prakarya')) return 100;
    } else if (jenjang === 'SMA') {
      if (name.includes('matematika')) return 40;
      if (name.includes('inggris')) return 50;
      if (name.includes('jasmani') || name.includes('olahraga') || name.includes('pjok')) return 60;
      if (name.includes('sejarah')) return 70;
      if (name.includes('seni') || name.includes('budaya') || name.includes('prakarya')) return 80;
    }
    return 100;
  }

  // 2. KELOMPOK KEJURUAN / PEMINATAN
  if (grp.includes('kejuruan') || grp.includes('peminatan')) {
    if (name.includes('matematika')) return 110;
    if (name.includes('inggris')) return 120;
    if (name.includes('informatika')) return 130;
    if (name.includes('ipas') || (name.includes('alam') && name.includes('sosial'))) return 140;
    if (name.includes('dasar') || name.includes('dptm') || name.includes('pdtm') || name.includes('gtm')) return 150;
    if (name.includes('konsentrasi') || name.includes('program') || name.includes('pemesinan') || name.includes('otomotif') || name.includes('listrik') || name.includes('las') || name.includes('bangunan')) return 160;
    if (name.includes('pkk') || name.includes('kewirausahaan') || name.includes('kreatif')) return 170;
    if (name.includes('pkl') || name.includes('praktik kerja') || name.includes('lapangan')) return 180;
    return 190;
  }

  // 3. MATA PELAJARAN PILIHAN
  if (grp.includes('pilihan')) {
    if (name.includes('koding') || name.includes('kecerdasan') || name.includes('ai') || name.includes('robotika')) return 210;
    return 250;
  }

  // 4. MUATAN LOKAL
  if (grp.includes('muatan lokal') || grp.includes('mulok') || grp.includes('lokal')) {
    if (name.includes('sunda') || name.includes('jawa') || name.includes('madura') || name.includes('bali') || name.includes('daerah')) return 310;
    if (name.includes('lingkungan') || name.includes('plh')) return 320;
    return 350;
  }

  return 999;
};

/**
 * Helper Format Tanggal Bahasa Indonesia
 */
export const formatIndoDate = (dateVal?: string | Date | null): string => {
  if (!dateVal) return '-';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(dateVal);
  }
};

export const DEFAULT_JABAR_LOGO_SVG = "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg"><path d="M50 5 C75 5, 92 18, 92 48 C92 82, 68 108, 50 115 C32 108, 8 82, 8 48 C8 18, 25 5, 50 5 Z" fill="#057835" stroke="#FFD700" stroke-width="4"/><path d="M50 18 C52 24, 55 35, 50 50 C46 38, 48 24, 50 18 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1.5"/><circle cx="50" cy="30" r="3" fill="#FFFFFF"/><path d="M30 45 C30 25, 45 20, 50 20 C55 20, 70 25, 70 45 C70 65, 55 75, 50 75 C45 75, 30 65, 30 45 Z" stroke="#FFD700" stroke-width="2" stroke-dasharray="3,3" fill="none"/><path d="M20 78 C30 92, 42 98, 50 100 C58 98, 70 92, 80 78 Z" fill="#002D62"/><rect x="28" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="44" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="60" y="80" width="8" height="6" fill="#FFFFFF"/><rect x="36" y="86" width="8" height="6" fill="#FFFFFF"/><rect x="52" y="86" width="8" height="6" fill="#FFFFFF"/><path d="M15 102 C30 112, 70 112, 85 102 C80 115, 20 115, 15 102 Z" fill="#FFD700" stroke="#B8860B" stroke-width="1"/></svg>`
);

export const downscaleCanvasImage = (img: HTMLImageElement, maxDim = 500): string | null => {
  try {
    const naturalW = img.naturalWidth || img.width || 200;
    const naturalH = img.naturalHeight || img.height || 200;
    let targetW = naturalW;
    let targetH = naturalH;
    if (targetW > maxDim || targetH > maxDim) {
      if (targetW >= targetH) {
        targetH = Math.max(1, Math.round((targetH * maxDim) / targetW));
        targetW = maxDim;
      } else {
        targetW = Math.max(1, Math.round((targetW * maxDim) / targetH));
        targetH = maxDim;
      }
    }
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Image downscaling failed:', err);
    return null;
  }
};

export const resolveCoverImageBase64 = async (url: string | null | undefined): Promise<string | null> => {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // If already base64 data URL
  if (trimmed.startsWith('data:image/png') || trimmed.startsWith('data:image/jpeg') || trimmed.startsWith('data:image/webp')) {
    if (trimmed.length < 100000) {
      return trimmed;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaled = downscaleCanvasImage(img, 500);
        resolve(scaled || trimmed);
      };
      img.onerror = () => resolve(trimmed);
      img.src = trimmed;
    });
  }

  // Handle SVG data URI by rendering to canvas PNG
  if (trimmed.startsWith('data:image/svg+xml')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaled = downscaleCanvasImage(img, 500);
        resolve(scaled);
      };
      img.onerror = () => resolve(null);
      img.src = trimmed;
    });
  }

  // 1. Direct browser image loading via canvas (handles relative /api/uploads/..., CORS, and absolute URLs)
  const fromCanvas = await new Promise<string | null>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scaled = downscaleCanvasImage(img, 500);
      resolve(scaled);
    };
    img.onerror = () => resolve(null);
    img.src = trimmed;
  });

  if (fromCanvas) return fromCanvas;

  // 2. Fallback via getBase64ImageFromUrl
  const rawBase64 = await getBase64ImageFromUrl(trimmed).catch(() => null);
  if (rawBase64 && rawBase64.length > 100000) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const scaled = downscaleCanvasImage(img, 500);
        resolve(scaled || rawBase64);
      };
      img.onerror = () => resolve(rawBase64);
      img.src = rawBase64;
    });
  }
  return rawBase64;
};

let cachedCambriaRegular: string | null = null;
let cachedCambriaBold: string | null = null;

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return window.btoa(binary);
};

export const ensureCambriaFont = async (doc: jsPDF): Promise<string> => {
  try {
    if (!cachedCambriaRegular || !cachedCambriaBold) {
      const [regRes, boldRes] = await Promise.all([
        fetch('/fonts/cambria.ttf'),
        fetch('/fonts/cambria-bold.ttf'),
      ]);
      if (regRes.ok && boldRes.ok) {
        const [regBuf, boldBuf] = await Promise.all([
          regRes.arrayBuffer(),
          boldRes.arrayBuffer(),
        ]);
        cachedCambriaRegular = arrayBufferToBase64(regBuf);
        cachedCambriaBold = arrayBufferToBase64(boldBuf);
      }
    }
    if (cachedCambriaRegular && cachedCambriaBold) {
      if (!doc.existsFileInVFS('Cambria.ttf')) {
        doc.addFileToVFS('Cambria.ttf', cachedCambriaRegular);
        doc.addFont('Cambria.ttf', 'Cambria', 'normal');
      }
      if (!doc.existsFileInVFS('Cambria-Bold.ttf')) {
        doc.addFileToVFS('Cambria-Bold.ttf', cachedCambriaBold);
        doc.addFont('Cambria-Bold.ttf', 'Cambria', 'bold');
      }
      return 'Cambria';
    }
  } catch (err) {
    console.warn('Fallback font rapor:', err);
  }
  return 'Times';
};

export const resolveJenjangLines = (sekolah: any, tenantInfo: any, siswa: any) => {
  const tingkatNum = Number(siswa?.tingkat || 10);
  const jenjangRaw = String(sekolah?.jenjang || tenantInfo?.jenjang || siswa?.jenjang || '').toUpperCase();
  let jenjangLine1 = 'SEKOLAH MENENGAH KEJURUAN';
  let jenjangLine2 = '(SMK)';
  if (jenjangRaw.includes('SD') || jenjangRaw.includes('MI') || (tingkatNum >= 1 && tingkatNum <= 6)) {
    jenjangLine1 = 'SEKOLAH DASAR';
    jenjangLine2 = '(SD)';
  } else if (jenjangRaw.includes('SMP') || jenjangRaw.includes('MTS') || (tingkatNum >= 7 && tingkatNum <= 9)) {
    jenjangLine1 = 'SEKOLAH MENENGAH PERTAMA';
    jenjangLine2 = '(SMP)';
  } else if (jenjangRaw.includes('SMA') || jenjangRaw.includes('MA')) {
    jenjangLine1 = 'SEKOLAH MENENGAH ATAS';
    jenjangLine2 = '(SMA)';
  }
  return { jenjangLine1, jenjangLine2 };
};

export const formatAlamatDuaBaris = (
  rawAlamat?: string,
  dusun?: string,
  rt?: string,
  rw?: string,
  kelurahan?: string,
  kecamatan?: string,
  kabupaten?: string
): string => {
  if (rawAlamat && (/kec\b|kecamatan\b/i.test(rawAlamat) || /kab\b|kabupaten\b/i.test(rawAlamat))) {
    const splitMatch = rawAlamat.split(/(?=\b(?:Kec|Kecamatan)\b)/i);
    if (splitMatch.length >= 2) {
      return `${splitMatch[0].trim()}\n${splitMatch.slice(1).join('').trim()}`;
    }
  }
  const p1 = [
    rawAlamat || '',
    dusun ? `Dusun ${dusun}` : '',
    (rt || rw) ? `RT ${rt || '01'} RW ${rw || '01'}` : '',
    kelurahan ? `Desa ${kelurahan}` : '',
  ].filter(Boolean).map(s => s.trim()).filter(Boolean);

  const p2 = [
    kecamatan ? `Kecamatan ${kecamatan.replace(/^kec(amatan)?\.?\s*/i, '')}` : '',
    kabupaten ? `Kabupaten ${kabupaten.replace(/^kab(upaten)?\.?\s*/i, '')}` : '',
  ].filter(Boolean).map(s => s.trim()).filter(Boolean);

  let l1 = p1.join(' ');
  let l2 = p2.join(' ');
  if (l1 && l2) return `${l1}\n${l2}`;
  const comb = l1 || l2 || '-';
  if (comb.length > 40 && comb.includes(' ')) {
    const words = comb.split(' ');
    const half = Math.ceil(words.length / 2);
    return `${words.slice(0, half).join(' ')}\n${words.slice(half).join(' ')}`;
  }
  return comb;
};

export const formatAnakKe = (val: any): string => {
  if (!val) return '-';
  const num = parseInt(String(val), 10);
  const words = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'];
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return `${num} (${words[num]})`;
  }
  return String(val);
};
