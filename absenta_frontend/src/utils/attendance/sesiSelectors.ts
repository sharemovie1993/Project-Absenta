import { DoorOpen, Megaphone, Sun, BookOpen, Users, Repeat, Flag, GraduationCap, FileText, Handshake } from 'lucide-react';

export function isKBM(jenis?: string, jenisTypeByName?: Record<string, string>) {
  const map = jenisTypeByName || {};
  const type = (map[String(jenis || '')] || '').toUpperCase();
  return type === 'KBM';
}

export function guruStatusText(
  sesi: any,
  guruStatusLocal: Record<string, 'HADIR' | 'ALPA' | undefined>,
  guruConfirmed: Record<string, boolean>
) {
  const fromSession = String(sesi.guru_status || '').toUpperCase();
  if (fromSession === 'HADIR' || fromSession === 'HADIR / MENGAJAR') return 'HADIR';
  if (fromSession === 'ALPA' || fromSession === 'TIDAK HADIR') return 'TIDAK HADIR';
  const v = guruStatusLocal[sesi.id];
  if (v === 'HADIR') return 'HADIR';
  if (v === 'ALPA') return 'TIDAK HADIR';
  return guruConfirmed[sesi.id] ? 'HADIR' : 'BELUM HADIR';
}

export function jenisBadgeVariant(jenis?: string) {
  const t = String(jenis || '').toUpperCase();
  if (t === 'KBM') return 'success' as const;
  if (t === 'ESKUL') return 'info' as const;
  if (t === 'UJIAN') return 'secondary' as const;
  if (t === 'RAPAT') return 'warning' as const;
  return 'outline' as const;
}

export function guruStatusVariant(text?: string) {
  const s = String(text || '').toUpperCase();
  if (s === 'HADIR') return 'success' as const;
  if (s === 'BELUM HADIR') return 'warning' as const;
  if (s === 'TIDAK HADIR') return 'error' as const;
  return 'outline' as const;
}

export function jenisIcon(jenis?: string, jenisTypeByName?: Record<string, string>) {
  const map = jenisTypeByName || {};
  const type = (map[String(jenis || '')] || String(jenis || '')).toUpperCase();
  if (type === 'GERBANG') return DoorOpen;
  if (type === 'APEL') return Megaphone;
  if (type === 'DUHA') return Sun;
  if (type === 'KBM') return BookOpen;
  if (type === 'ESKUL') return Users;
  if (type === 'PEMBIASAAN') return Repeat;
  if (type === 'UPACARA') return Flag;
  if (type === 'JURUSAN') return GraduationCap;
  if (type === 'UJIAN') return FileText;
  if (type === 'RAPAT') return Handshake;
  return BookOpen;
}

export function jenisIconClass(jenis?: string, jenisTypeByName?: Record<string, string>) {
  const map = jenisTypeByName || {};
  const type = (map[String(jenis || '')] || String(jenis || '')).toUpperCase();
  if (type === 'GERBANG') return 'text-gray-600';
  if (type === 'APEL') return 'text-orange-600';
  if (type === 'DUHA') return 'text-amber-600';
  if (type === 'KBM') return 'text-indigo-600';
  if (type === 'ESKUL') return 'text-teal-600';
  if (type === 'PEMBIASAAN') return 'text-lime-600';
  if (type === 'UPACARA') return 'text-red-600';
  if (type === 'JURUSAN') return 'text-purple-600';
  if (type === 'UJIAN') return 'text-slate-600';
  if (type === 'RAPAT') return 'text-blue-600';
  return 'text-gray-600';
}

export function countsForSession(
  sesi: any,
  expanded: Record<string, boolean>,
  sessionAttendance: Record<string, any[]>
) {
  if (expanded[sesi.id] && sessionAttendance[sesi.id]) {
    const arr = sessionAttendance[sesi.id] as any[];
    const c = { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 } as Record<string, number>;
    for (const r of arr) {
      const st = String(r.status || '').toUpperCase();
      if (c[st] !== undefined) c[st] += 1;
    }
    return c;
  }
  return sesi.absen_counts || { HADIR: 0, TERLAMBAT: 0, IZIN: 0, SAKIT: 0, ALPA: 0 };
}

