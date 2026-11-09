import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import {
  UniversalDocumentModal,
  PrintDocumentSheet,
  usePrintHeaderData,
} from '@/components/ui';
import {
  CreditCard,
  Download,
  Filter,
  Edit3,
  User,
  KeyRound,
  QrCode as QrCodeIcon,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Scissors,
  Check,
  Loader2,
  LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { useQuery } from '@tanstack/react-query';
import { siswaApi } from '@/api/academic.api';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import { KelasRoomMapping } from './cbtOrchestratorHelper';
import { formatDate } from '@/utils/date.utils';
import { normalizeStudentIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { cn } from '@/lib/utils';

export interface CbtKartuUjianPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  selectedKelasId?: string | null;
  eventName?: string;
  activeTpName?: string;
}

export interface StudentExamCardData {
  id: string;
  nama_siswa: string;
  nis: string;
  nisn: string;
  kelas_id: string;
  nama_kelas: string;
  tingkat: number;
  jurusan: string;
  slot_ruang: string;
  nama_ruang: string;
  sesi_ujian: string;
  no_peserta: string;
  username: string;
  pin: string;
  foto?: string;
}

export interface ExamDaySchedule {
  tanggal: string;
  hariLabel: string;
  mapelList: string[];
  waktu: string;
  sesi: string;
}

/**
 * Pemecah data siswa menjadi potongan per halaman
 */
function chunkArray<T>(items: T[], size = 6): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generator sample data siswa realistis jika DB siswa kelas terkait belum ada / kosong
 */
const SAMPLE_FIRST_NAMES = [
  'Ahmad', 'Aditia', 'Budi', 'Chandra', 'Dimas', 'Eko', 'Fajar', 'Gilang',
  'Hendra', 'Ilham', 'Joko', 'Kevin', 'Lutfi', 'Muhammad', 'Naufal', 'Pratama',
  'Raditya', 'Rian', 'Rizky', 'Syahrul', 'Taufik', 'Wahyu', 'Yoga', 'Zulham',
  'Annisa', 'Bella', 'Citra', 'Dewi', 'Fitri', 'Gita', 'Intan', 'Lestari',
  'Nabila', 'Putri', 'Rahma', 'Siti', 'Tiara', 'Winda', 'Zahra', 'Aulia'
];

const SAMPLE_LAST_NAMES = [
  'Santoso', 'Pratama', 'Hidayat', 'Saputra', 'Kurniawan', 'Ramadhan',
  'Setiawan', 'Wibowo', 'Nugroho', 'Firmansyah', 'Permana', 'Maulana',
  'Kusuma', 'Gunawan', 'Wijaya', 'Siregar', 'Harahap', 'Lubis', 'Nasution'
];

function generateSampleStudentsForClass(
  cls: KelasRoomMapping,
  count = 28
): StudentExamCardData[] {
  const students: StudentExamCardData[] = [];
  const tingkatStr = cls.tingkat === 10 ? 'X' : cls.tingkat === 11 ? 'XI' : 'XII';
  const cleanClassName = cls.nama_kelas.replace(/\s+/g, '');
  const prefixNo = `26-${tingkatStr}-${cleanClassName}`;

  for (let i = 1; i <= count; i++) {
    const fn = SAMPLE_FIRST_NAMES[(i * 3 + cls.tingkat * 5) % SAMPLE_FIRST_NAMES.length];
    const ln = SAMPLE_LAST_NAMES[(i * 7 + cls.tingkat * 2) % SAMPLE_LAST_NAMES.length];
    const nama = `${fn} ${ln}`;
    const nis = `${23 + (12 - cls.tingkat)}24${String(i).padStart(4, '0')}`;
    const nisn = `007${String(1000000 + i * 47).padStart(7, '0')}`;
    const noPeserta = `${prefixNo}-${String(i).padStart(3, '0')}`;
    const pin = String(100000 + ((i * 8492) % 900000));

    students.push({
      id: `sample-${cls.kelas_id}-${i}`,
      nama_siswa: nama,
      nis,
      nisn,
      kelas_id: cls.kelas_id,
      nama_kelas: cls.nama_kelas,
      tingkat: cls.tingkat,
      jurusan: cls.jurusan || 'Kejuruan',
      slot_ruang: cls.slot_ruang || 'R.01',
      nama_ruang: cls.nama_ruang || 'Ruang CBT',
      sesi_ujian: 'Sesi 1 (07.30 - 09.30 WIB)',
      no_peserta: noPeserta,
      username: `TC${nisn.slice(-9)}`,
      pin,
    });
  }
  return students;
}

/**
 * Jadwal Ujian Default 1 Minggu (6 Hari: Senin s/d Sabtu) jika belum di-plot di DB
 */
const DEFAULT_WEEK_SCHEDULE: ExamDaySchedule[] = [
  {
    tanggal: '09-11-2026',
    hariLabel: 'Senin',
    mapelList: ['Bahasa Indonesia', 'Matematika', 'Bahasa Inggris'],
    waktu: '08:30-11:00',
    sesi: 'Sesi 1',
  },
  {
    tanggal: '10-11-2026',
    hariLabel: 'Selasa',
    mapelList: ['Pendidikan Agama & BP', 'Pendidikan Pancasila'],
    waktu: '08:30-10:40',
    sesi: 'Sesi 1',
  },
  {
    tanggal: '11-11-2026',
    hariLabel: 'Rabu',
    mapelList: ['Informatika / Komputer', 'Sejarah Indonesia'],
    waktu: '08:30-10:40',
    sesi: 'Sesi 1',
  },
  {
    tanggal: '12-11-2026',
    hariLabel: 'Kamis',
    mapelList: ['Dasar Kejuruan 1', 'Dasar Kejuruan 2'],
    waktu: '08:30-11:00',
    sesi: 'Sesi 1',
  },
  {
    tanggal: '13-11-2026',
    hariLabel: 'Jumat',
    mapelList: ['B. Indonesia Tingkat Lanjut', 'Sosiologi'],
    waktu: '08:00-09:30',
    sesi: 'Sesi 1',
  },
  {
    tanggal: '14-11-2026',
    hariLabel: 'Sabtu',
    mapelList: ['Muatan Lokal / B. Sunda', 'Kewirausahaan'],
    waktu: '08:30-10:40',
    sesi: 'Sesi 1',
  },
];

// ── Subkomponen Memoized Satuan Kartu Peserta Ujian TKA (Grid 2x3 & 2x2) ──
interface ExamCardSingleItemProps {
  student: StudentExamCardData;
  sekolahData: any;
  tenantInfo: any;
  customEventName: string;
  activeTpName: string;
  showLogoSekolah: boolean;
  showFoto: boolean;
  showQrCode: boolean;
  showPassword: boolean;
  schedules: ExamDaySchedule[];
  gridMode: '6_per_page' | '4_per_page';
}

const ExamCardSingleItem: React.FC<ExamCardSingleItemProps> = memo(({
  student,
  sekolahData,
  tenantInfo,
  customEventName,
  activeTpName,
  showLogoSekolah,
  showFoto,
  showQrCode,
  showPassword,
  schedules,
  gridMode,
}) => {
  const [qrUrl, setQrUrl] = useState<string>('');

  // SSoT Universal Academic Identity Normalizer
  const normIdentity = useMemo(() => {
    return normalizeStudentIdentity({
      id: student.id,
      nama: student.nama_siswa,
      nis: student.nis,
      nisn: student.nisn,
      foto: student.foto,
      Kelas: { nama_kelas: student.nama_kelas },
    });
  }, [student]);

  // Generate QR Code secara asynchronous & terisolasi per-kartu (Level 'L' tercepat)
  useEffect(() => {
    if (!showQrCode) {
      setQrUrl('');
      return;
    }

    let isMounted = true;
    const quickPayload = {
      u: student.username || student.nisn,
      p: student.pin,
      nisn: student.nisn,
      room: student.slot_ruang,
      name: student.nama_siswa,
      cbt: true,
    };
    let encodedToken = '';
    try {
      encodedToken = btoa(unescape(encodeURIComponent(JSON.stringify(quickPayload))));
    } catch {
      encodedToken = btoa(JSON.stringify({ u: quickPayload.u, p: quickPayload.p }));
    }
    const payload = `${window.location.origin}/login?cbtAuth=${encodeURIComponent(encodedToken)}&u=${encodeURIComponent(quickPayload.u)}`;

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'L',
      margin: 1,
      width: 80,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => {
        console.warn('QR generation skipped', err);
      });

    return () => {
      isMounted = false;
    };
  }, [student.username, student.pin, student.slot_ruang, showQrCode]);

  const is6Grid = gridMode === '6_per_page';

  return (
    <div
      className={cn(
        'relative h-full flex flex-col justify-between border-2 border-slate-300 print:border-slate-400 rounded-lg bg-white text-slate-900 shadow-2xs print:shadow-none overflow-hidden select-text',
        is6Grid ? 'p-2' : 'p-3'
      )}
    >
      {/* ── 1. Header Kartu: Logo di Kiri, Judul di Tengah, QR Code di Pojok Kanan Atas ── */}
      <div className="flex items-center justify-between gap-1.5 pb-1 border-b border-slate-800 shrink-0">
        {/* Logo Sekolah / Tut Wuri */}
        <div className="w-8 shrink-0 flex items-center justify-center">
          {showLogoSekolah && (
            <img
              src={sekolahData?.logo_url || tenantInfo?.logo_url || '/logo.png'}
              alt="Logo"
              className={cn('object-contain', is6Grid ? 'w-7 h-7' : 'w-8 h-8')}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Judul Kartu TKA Pusmendik Model */}
        <div className="flex-1 text-center min-w-0 px-1">
          <h4
            className={cn(
              'font-black uppercase tracking-wider text-slate-900 leading-tight truncate',
              is6Grid ? 'text-[8px]' : 'text-[9.5px]'
            )}
          >
            KARTU LOGIN
          </h4>
          <p
            className={cn(
              'font-extrabold uppercase text-slate-800 leading-tight truncate mt-0.2',
              is6Grid ? 'text-[7px]' : 'text-[8.5px]'
            )}
          >
            {customEventName}
          </p>
          <p
            className={cn(
              'font-bold text-slate-500 uppercase leading-none truncate mt-0.2',
              is6Grid ? 'text-[6.5px]' : 'text-[7.5px]'
            )}
          >
            {activeTpName}
          </p>
        </div>

        {/* QR Code Quick Login di Pojok Kanan Atas */}
        <div className="w-8 shrink-0 flex items-center justify-end">
          {showQrCode && (
            qrUrl ? (
              <img
                src={qrUrl}
                alt="QR"
                className={cn(
                  'border border-slate-200 rounded p-0.5 bg-white shrink-0',
                  is6Grid ? 'w-7 h-7' : 'w-8 h-8'
                )}
                title="Pindai kamera untuk masuk otomatis tanpa ketik password"
              />
            ) : (
              <div
                className={cn(
                  'border border-slate-200 rounded bg-slate-50 flex items-center justify-center shrink-0',
                  is6Grid ? 'w-7 h-7' : 'w-8 h-8'
                )}
              >
                <QrCodeIcon size={12} className="text-slate-300 animate-pulse" />
              </div>
            )
          )}
        </div>
      </div>

      {/* ── 2. Badan Atas: Biodata & Kredensial Key-Value Rata Titik Dua (Persis TKA) ── */}
      <div
        className={cn(
          'py-1 space-y-0.2 font-sans shrink-0 border-b border-slate-200',
          is6Grid ? 'text-[6.8px] leading-tight' : 'text-[8px] leading-snug'
        )}
      >
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Nama Peserta</span>
          <span className="col-span-8 font-black text-slate-900 uppercase truncate">
            : {normIdentity.nama}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">NISN</span>
          <span className="col-span-8 font-bold text-slate-800">
            : {normIdentity.nisn}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Tempat, Tanggal Lahir</span>
          <span className="col-span-8 font-bold text-slate-800 truncate">
            : {normIdentity.ttlFormatted || 'PURWAKARTA, 12 MEI 2008'}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Username</span>
          <span className="col-span-8 font-mono font-black text-slate-900">
            : {student.username}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Password</span>
          <span className="col-span-8 font-mono font-black text-indigo-700 tracking-wider">
            : {showPassword ? `${student.pin}*` : '••••••*'}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">ID Proktor / Ruang</span>
          <span className="col-span-8 font-bold text-slate-800 truncate">
            : {student.slot_ruang} / {student.nama_ruang} ({student.nama_kelas})
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Gelombang / Sesi</span>
          <span className="col-span-8 font-bold text-slate-800">
            : Gelombang 1 / {student.sesi_ujian}
          </span>
        </div>
      </div>

      {/* ── 3. Badan Bawah: Pasfoto 3x4 di Kiri & Tabel Jadwal 1 Minggu di Kanan ── */}
      <div className="flex gap-1.5 pt-1 flex-1 min-h-0 items-start">
        {/* Pasfoto Resmi Siswa 3x4 */}
        <div className={cn('shrink-0 flex flex-col items-center justify-start', is6Grid ? 'w-[21mm]' : 'w-[24mm]')}>
          {showFoto && normIdentity.fotoUrl ? (
            <img
              src={normIdentity.fotoUrl}
              alt={normIdentity.nama}
              className={cn(
                'object-cover rounded-xs border border-slate-300 shadow-2xs',
                is6Grid ? 'w-[20mm] h-[28mm]' : 'w-[23mm] h-[31mm]'
              )}
            />
          ) : (
            <div
              className={cn(
                'border border-dashed border-slate-300 rounded-xs bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-0.5 text-center',
                is6Grid ? 'w-[20mm] h-[28mm]' : 'w-[23mm] h-[31mm]'
              )}
            >
              <User size={is6Grid ? 14 : 18} className="text-slate-300 mb-0.5" />
              <span className="text-[5.5px] font-black uppercase leading-tight text-slate-400">
                PASFOTO
                <br />
                3 × 4
              </span>
            </div>
          )}
        </div>

        {/* Tabel Jadwal Sesi 1 Minggu (Senin s/d Sabtu) */}
        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-black text-[6px]">
                <th className="py-0.5 px-1 border-r border-slate-300 w-[24%]">Tanggal</th>
                <th className="py-0.5 px-1 border-r border-slate-300 w-[54%]">Mata Pelajaran</th>
                <th className="py-0.5 px-1 w-[22%] text-center">Waktu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[6px]">
              {schedules.map((sch, sIdx) => (
                <tr key={sIdx} className="leading-tight">
                  <td className="py-0.5 px-1 border-r border-slate-200 font-bold text-slate-700 align-top whitespace-nowrap">
                    {sch.tanggal}
                  </td>
                  <td className="py-0.5 px-1 border-r border-slate-200 align-top text-slate-800">
                    {sch.mapelList.map((m, mIdx) => (
                      <div key={mIdx} className="truncate leading-tight">
                        - {m}
                      </div>
                    ))}
                  </td>
                  <td className="py-0.5 px-0.5 text-center align-top font-bold text-slate-600 whitespace-nowrap">
                    <div>{sch.sesi}</div>
                    <div className="text-[5px] text-slate-400 font-normal">{sch.waktu}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

ExamCardSingleItem.displayName = 'ExamCardSingleItem';

export const CbtKartuUjianPrintModal: React.FC<CbtKartuUjianPrintModalProps> = ({
  isOpen,
  onClose,
  kelasList,
  roomMappings,
  selectedKelasId,
  eventName = 'TES KEMAMPUAN AKADEMIK PAKET C/ULYA',
  activeTpName = 'TAHUN 2026',
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // ── 1. Target Kelas Fokus ──
  const initialClassId = useMemo(() => {
    return selectedKelasId || roomMappings[0]?.kelas_id || '';
  }, [selectedKelasId, roomMappings]);

  const [activeKelasId, setActiveKelasId] = useState<string>(initialClassId);

  // ── 2. Mode Grid: 6 Kartu (Default TKA) vs 4 Kartu (Jumbo) ──
  const [gridMode, setGridMode] = useState<'6_per_page' | '4_per_page'>('6_per_page');

  useEffect(() => {
    if (selectedKelasId) {
      setActiveKelasId(selectedKelasId);
    } else if (!activeKelasId && roomMappings.length > 0) {
      setActiveKelasId(roomMappings[0].kelas_id);
    }
  }, [selectedKelasId, roomMappings]);

  // Rombel aktif yang sedang diproses kartu ujiannya
  const currentClassMapping = useMemo(() => {
    return roomMappings.find((r) => r.kelas_id === activeKelasId) || roomMappings[0];
  }, [roomMappings, activeKelasId]);

  // ── 3. Visual & Security Toggles ──
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [showFoto, setShowFoto] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // ── 4. Editable Text ──
  const [customEventName, setCustomEventName] = useState<string>(
    eventName || 'TES KEMAMPUAN AKADEMIK PAKET C/ULYA'
  );

  // Universal Header Info (SSoT)
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = (rawSekolah || {}) as any;

  useEffect(() => {
    if (eventName) {
      setCustomEventName(eventName);
    }
  }, [eventName]);

  // ── 5. Query Jadwal Ujian Aktif (Fase 3 Hari & Sesi) ──
  const { data: jadwalRes } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 100 }),
    queryFn: () => cbtApi.getJadwalList({ limit: 100 }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const jadwalList = jadwalRes?.items || [];

  // Hitung jadwal 1 minggu untuk kelas aktif
  const classSchedules = useMemo<ExamDaySchedule[]>(() => {
    if (!currentClassMapping || jadwalList.length === 0) {
      return DEFAULT_WEEK_SCHEDULE;
    }

    // Filter jadwal yang terkait dengan kelas aktif
    const matched = jadwalList.filter((j) => {
      const clsIds = j.kelas_ids || [];
      return clsIds.length === 0 || clsIds.includes(currentClassMapping.kelas_id);
    });

    if (matched.length === 0) {
      return DEFAULT_WEEK_SCHEDULE;
    }

    // Kelompokkan per tanggal
    const mapByDate = new Map<string, { mapelList: string[]; waktu: string; sesi: string }>();

    matched.forEach((j) => {
      const rawDate = j.tanggal_mulai ? j.tanggal_mulai.split('T')[0] : '2026-11-09';
      const mapelName = j.BankSoal?.MataPelajaran?.nama_mapel || j.BankSoal?.nama_bank || 'Mata Pelajaran';
      const jamMulai = j.jam_mulai ? j.jam_mulai.slice(0, 5) : '08:00';
      const jamSelesai = j.jam_selesai ? j.jam_selesai.slice(0, 5) : '10:00';
      const waktuStr = `${jamMulai}-${jamSelesai}`;
      const sesiStr = j.nama_sesi || 'Sesi 1';

      if (!mapByDate.has(rawDate)) {
        mapByDate.set(rawDate, {
          mapelList: [mapelName],
          waktu: waktuStr,
          sesi: sesiStr,
        });
      } else {
        const item = mapByDate.get(rawDate)!;
        if (!item.mapelList.includes(mapelName)) {
          item.mapelList.push(mapelName);
        }
      }
    });

    // Urutkan tanggal
    const sortedDates = Array.from(mapByDate.keys()).sort();
    return sortedDates.slice(0, 6).map((d) => {
      const item = mapByDate.get(d)!;
      const parts = d.split('-');
      const formattedDate = `${parts[2] || '09'}-${parts[1] || '11'}-${parts[0] || '2026'}`;
      return {
        tanggal: formattedDate,
        hariLabel: 'Hari Ujian',
        mapelList: item.mapelList,
        waktu: item.waktu,
        sesi: item.sesi,
      };
    });
  }, [currentClassMapping, jadwalList]);

  // ── 6. Query Siswa Terfokus 1 Kelas ──
  const { data: realStudentsRes, isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['cbt-print-students-class', activeKelasId],
    queryFn: async () => {
      if (!activeKelasId) return [];
      const res = await siswaApi.getAll({ kelas_id: activeKelasId, limit: 50, status: 'AKTIF' });
      return res?.data || [];
    },
    enabled: isOpen && Boolean(activeKelasId),
    staleTime: 60 * 1000,
  });

  const realStudents = realStudentsRes || [];

  // ── 7. Assemble Student Cards Data ──
  const studentCardsList = useMemo<StudentExamCardData[]>(() => {
    if (!currentClassMapping) return [];

    if (realStudents.length > 0) {
      const tingkatStr = currentClassMapping.tingkat === 10 ? 'X' : currentClassMapping.tingkat === 11 ? 'XI' : 'XII';
      const cleanClassName = currentClassMapping.nama_kelas.replace(/\s+/g, '');

      return realStudents.map((s, idx) => {
        const noPeserta = `26-${tingkatStr}-${cleanClassName}-${String(idx + 1).padStart(3, '0')}`;
        const username = s.User?.username || s.nisn || s.nis || `user_${s.id.slice(0, 5)}`;
        const pin = s.nisn && s.nisn.length >= 6 ? s.nisn.slice(-6) : String(849200 + ((idx * 17) % 999));

        return {
          id: s.id,
          nama_siswa: s.nama_siswa || (s as any).nama || 'Siswa CBT',
          nis: s.nis || '-',
          nisn: s.nisn || '-',
          kelas_id: currentClassMapping.kelas_id,
          nama_kelas: currentClassMapping.nama_kelas,
          tingkat: currentClassMapping.tingkat,
          jurusan: currentClassMapping.jurusan || 'Kejuruan',
          slot_ruang: currentClassMapping.slot_ruang || 'R.01',
          nama_ruang: currentClassMapping.nama_ruang || 'Ruang CBT',
          sesi_ujian: 'Sesi 1',
          no_peserta: noPeserta,
          username: `TC${username.replace(/[^a-zA-Z0-9]/g, '').slice(-11)}`,
          pin,
          foto: s.foto,
        };
      });
    }

    // Fallback realistis khusus 1 rombel ini
    return generateSampleStudentsForClass(currentClassMapping, 30);
  }, [currentClassMapping, realStudents]);

  // Chunk siswa: 6 kartu per lembar (Grid 2x3) atau 4 kartu (Grid 2x2)
  const chunkSize = gridMode === '6_per_page' ? 6 : 4;
  const studentChunks = useMemo(() => {
    return chunkArray(studentCardsList, chunkSize);
  }, [studentCardsList, chunkSize]);

  // ── 8. Print Handler (Browser True WYSIWYG) ──
  const handleBrowserPrint = () => {
    window.print();
  };

  // ── 9. PDF Export Handler (5-Step Protocol) ──
  const handleDownloadPdf = async () => {
    const deskCanvas = document.getElementById('print-desk-canvas-area');
    const prevZoom = deskCanvas ? deskCanvas.style.zoom : '';

    try {
      setIsExportingPdf(true);
      const toastId = toast.loading('Menyiapkan dokumen PDF True WYSIWYG...', { id: 'pdf-export-toast' });

      if (deskCanvas) {
        deskCanvas.style.zoom = '1';
        deskCanvas.style.transform = 'none';
        void deskCanvas.offsetHeight;
      }

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }
      await new Promise((resolve) => setTimeout(resolve, 120));

      const sheetElements = document.querySelectorAll<HTMLElement>('.print-sheet');
      if (!sheetElements || sheetElements.length === 0) {
        toast.error('Lembar dokumen tidak ditemukan', { id: 'pdf-export-toast' });
        return;
      }

      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < sheetElements.length; i++) {
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const sheetElement = sheetElements[i];

        const canvas = await html2canvas(sheetElement, {
          scale: 2.0,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              clonedDesk.style.transform = 'none';
            }
            const clonedSheets = clonedDoc.querySelectorAll<HTMLElement>('.print-sheet');
            clonedSheets.forEach((s) => {
              s.style.zoom = '1';
              s.style.transform = 'none';
              s.style.letterSpacing = 'normal';
              s.style.fontVariantLigatures = 'none';
              s.style.border = 'none';
              s.style.boxShadow = 'none';
              s.style.outline = 'none';
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.88);
        const canvasRatio = canvas.height / canvas.width;
        const imgHeight = pdfWidth * canvasRatio;

        if (imgHeight <= pdfHeight + 1) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
        } else {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
      }

      const cleanClassLabel = currentClassMapping?.nama_kelas?.replace(/\s+/g, '_') || 'ROMBEL';
      const cleanSlotLabel = currentClassMapping?.slot_ruang || 'CBT';
      const fileName = `KARTU_LOGIN_TKA_${cleanSlotLabel}_${cleanClassLabel}.pdf`;

      pdf.save(fileName);
      toast.success(`File PDF Kartu Ujian ${currentClassMapping?.nama_kelas} (${sheetElements.length} Lembar) berhasil diunduh!`, {
        id: 'pdf-export-toast',
      });
    } catch (err) {
      console.error('[CBT Exam Card PDF Export Error]', err);
      toast.error('Gagal mengekspor PDF, silakan gunakan tombol Cetak Browser', { id: 'pdf-export-toast' });
    } finally {
      if (deskCanvas) {
        deskCanvas.style.zoom = prevZoom;
      }
      setIsExportingPdf(false);
    }
  };

  return (
    <UniversalDocumentModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cetak Kartu Login TKA: ${currentClassMapping?.nama_kelas || 'Kelas'} (${currentClassMapping?.slot_ruang || 'Ruang'})`}
      subtitle={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Format:</span>
          <span className="text-xs font-bold text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-md">
            Kertas A4 Portrait ({gridMode === '6_per_page' ? 'Grid 2×3 / 6 Kartu' : 'Grid 2×2 / 4 Kartu'} per Lembar)
          </span>
          <span className="text-[11px] text-muted-foreground">
            • {studentCardsList.length} Siswa ({studentChunks.length} Lembar A4)
          </span>
          {isLoadingSiswa && (
            <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-bold">
              <Loader2 size={12} className="animate-spin" /> Memuat Siswa...
            </span>
          )}
        </div>
      }
      orientation="portrait"
      allowOrientationToggle={false}
      allowLogoToggles={true}
      showLogoSekolah={showLogoSekolah}
      onToggleLogoSekolah={setShowLogoSekolah}
      onPrint={handleBrowserPrint}
      onDownloadPdf={handleDownloadPdf}
      downloadPdfText={isExportingPdf ? 'Memproses PDF...' : 'Unduh PDF (A4 Portrait)'}
      printButtonText="Cetak Kartu Ujian"
      size="5xl"
      extraActions={
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle Grid Mode: 6 Kartu (TKA) vs 4 Kartu */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px]">
            <button
              type="button"
              onClick={() => setGridMode('6_per_page')}
              className={cn(
                'px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1',
                gridMode === '6_per_page'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
              title="6 Kartu per lembar (Grid 2x3 - Standar TKA Pusmendik)"
            >
              <LayoutGrid size={11} />
              <span>6 Kartu (TKA)</span>
            </button>
            <button
              type="button"
              onClick={() => setGridMode('4_per_page')}
              className={cn(
                'px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1',
                gridMode === '4_per_page'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              )}
              title="4 Kartu per lembar (Grid 2x2 - Jumbo)"
            >
              <CreditCard size={11} />
              <span>4 Kartu</span>
            </button>
          </div>

          {/* Pemilih Kelas / Rombel Fokus */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
            <Filter size={12} className="text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Rombel:</span>
            <select
              value={activeKelasId}
              onChange={(e) => setActiveKelasId(e.target.value)}
              aria-label="Pilih rombel target kartu ujian"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer max-w-[140px] sm:max-w-none"
            >
              {roomMappings.map((r) => (
                <option key={r.kelas_id} value={r.kelas_id}>
                  {r.nama_kelas} ({r.slot_ruang})
                </option>
              ))}
            </select>
          </div>

          {/* Input Edit Nama Event Asesmen */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
            <Edit3 size={12} className="text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Event:</span>
            <input
              type="text"
              value={customEventName}
              onChange={(e) => setCustomEventName(e.target.value)}
              placeholder="Nama Event Asesmen..."
              aria-label="Edit nama event ujian pada kartu"
              className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden w-44 sm:w-52"
            />
          </div>

          {/* Toggle Password Visible / Hidden */}
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer',
              showPassword
                ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-300'
                : 'bg-white dark:bg-slate-800 text-slate-600 border-slate-200 dark:border-slate-700'
            )}
            title="Sembunyikan atau tampilkan password/PIN di kartu"
          >
            {showPassword ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>{showPassword ? 'PIN Terlihat' : 'PIN Sensor (••••••*)'}</span>
          </button>

          {/* Toggle QR Code */}
          <button
            type="button"
            onClick={() => setShowQrCode((prev) => !prev)}
            className={cn(
              'px-2 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer',
              showQrCode
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:border-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            )}
            title="Tampilkan QR Code Quick Login di kartu"
          >
            <QrCodeIcon size={12} />
            <span>QR {showQrCode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Toggle Foto Siswa */}
          <button
            type="button"
            onClick={() => setShowFoto((prev) => !prev)}
            className={cn(
              'px-2 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1 cursor-pointer',
              showFoto
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            )}
            title="Tampilkan foto siswa di kartu"
          >
            <User size={12} />
            <span>Foto {showFoto ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      }
    >
      <div ref={sheetContainerRef} className="space-y-8 print:space-y-0">
        {studentChunks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            <p className="text-sm font-bold">Tidak ada kartu peserta untuk kelas ini.</p>
            <p className="text-xs mt-1 text-slate-400">Silakan pilih rombel lain di menu dropdown atas.</p>
          </div>
        ) : (
          studentChunks.map((cards, pageIdx) => (
            <PrintDocumentSheet
              key={`sheet-${currentClassMapping?.kelas_id || 'cls'}-${pageIdx}`}
              orientation="portrait"
              pageNumber={pageIdx + 1}
              totalPages={studentChunks.length}
              footerText={`${sekolahData?.nama_sekolah || tenantInfo?.name || 'Absenta CBT'} • Kartu Login Peserta ${currentClassMapping?.nama_kelas || ''}`}
              className="p-5 print:p-4 relative"
            >
              {/* ── Kontainer Grid 2 × 3 (6 Kartu per Lembar A4 Portrait) atau Grid 2 × 2 ── */}
              <div className="relative w-full h-[1035px] flex flex-col justify-between">
                {/* Grid Layout */}
                <div
                  className={cn(
                    'grid h-full w-full',
                    gridMode === '6_per_page'
                      ? 'grid-cols-2 grid-rows-3 gap-2.5'
                      : 'grid-cols-2 grid-rows-2 gap-3.5'
                  )}
                >
                  {cards.map((student, cardIdx) => (
                    <ExamCardSingleItem
                      key={student.id || `card-${cardIdx}`}
                      student={student}
                      sekolahData={sekolahData}
                      tenantInfo={tenantInfo}
                      customEventName={customEventName}
                      activeTpName={activeTpName}
                      showLogoSekolah={showLogoSekolah}
                      showFoto={showFoto}
                      showQrCode={showQrCode}
                      showPassword={showPassword}
                      schedules={classSchedules}
                      gridMode={gridMode}
                    />
                  ))}
                </div>

                {/* ── Panduan Gunting Lembar Kertas (Cutting Guides) ── */}
                {/* Garis Potong Vertikal Tengah */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                  <span className="text-[9px] leading-none text-slate-500">✂</span>
                  <div className="w-px h-full border-r border-dashed border-slate-400 my-1"></div>
                  <span className="text-[9px] leading-none text-slate-500">✂</span>
                </div>

                {/* Garis Potong Horizontal (Khusus 6 Kartu: 2 Garis di 33.3% & 66.6%) */}
                {gridMode === '6_per_page' ? (
                  <>
                    <div className="absolute left-0 right-0 top-[33.33%] -translate-y-1/2 flex items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                      <span className="text-[9px] leading-none text-slate-500">✂</span>
                      <div className="h-px w-full border-b border-dashed border-slate-400 mx-1"></div>
                      <span className="text-[9px] leading-none text-slate-500">✂</span>
                    </div>
                    <div className="absolute left-0 right-0 top-[66.66%] -translate-y-1/2 flex items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                      <span className="text-[9px] leading-none text-slate-500">✂</span>
                      <div className="h-px w-full border-b border-dashed border-slate-400 mx-1"></div>
                      <span className="text-[9px] leading-none text-slate-500">✂</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none opacity-30 print:opacity-50 z-10">
                    <span className="text-[9px] leading-none text-slate-500">✂</span>
                    <div className="h-px w-full border-b border-dashed border-slate-400 mx-1"></div>
                    <span className="text-[9px] leading-none text-slate-500">✂</span>
                  </div>
                )}
              </div>
            </PrintDocumentSheet>
          ))
        )}
      </div>
    </UniversalDocumentModal>
  );
};
