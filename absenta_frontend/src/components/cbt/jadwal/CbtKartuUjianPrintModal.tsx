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
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { useQuery } from '@tanstack/react-query';
import { siswaApi } from '@/api/academic.api';
import { cbtApi, cbtQueryKeys } from '@/api/cbt.api';
import { useTahunPelajaranOptions, useSemesterOptions } from '@/components/common';
import type { CbtEventItem, CbtBankSoal } from '@/types/cbt.types';
import { formatTingkatRomawi } from '../bank-soal/cbtAsesmenHelper';
import {
  KelasRoomMapping,
  loadPersistedMatrixState,
  isMultiJurusanSlot,
  parseMultiJurusanSlot,
  ExamDayConfig,
} from './cbtOrchestratorHelper';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/date.utils';
import { normalizeStudentIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { cn, resolveProfilePhotoUrl } from '@/lib/utils';

export interface CbtKartuUjianPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  kelasList: any[];
  roomMappings: KelasRoomMapping[];
  selectedKelasId?: string | null;
  eventName?: string;
  activeTpName?: string;
  semester?: string;
  activeEvent?: CbtEventItem | null;
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

export interface ExamDaySessionItem {
  sesi: string;
  mapel: string;
  waktu: string;
}

export interface ExamDaySchedule {
  tanggal: string;
  hariLabel: string;
  mapelList: string[];
  waktu: string;
  sesi: string;
  sessions?: ExamDaySessionItem[];
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

    students.push({
      id: `sample-${cls.kelas_id}-${i}`,
      nama_siswa: nama,
      nis,
      nisn,
      kelas_id: cls.kelas_id,
      nama_kelas: cls.nama_kelas,
      tingkat: cls.tingkat,
      jurusan: cls.kode_jurusan || cls.nama_jurusan || (cls as any).jurusan || 'Kejuruan',
      slot_ruang: cls.slot_ruang || 'R.01',
      nama_ruang: cls.nama_ruang || 'Ruang CBT',
      sesi_ujian: 'Sesi 1 (07.30 - 09.30 WIB)',
      no_peserta: noPeserta,
      username: nisn,
      pin: nisn,
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

export type QrCodeSize = 'normal' | 'jumbo';
export type QrPlacement = 'header' | 'photo_box';
export type QrPayloadMode = 'url_short' | 'credentials_only';

// Cache QR Code base64 per payload agar tidak di-generate ulang saat re-render/ganti mode
const qrDataUrlCache = new Map<string, string>();
const MAX_QR_CACHE_SIZE = 1000;

function buildQrPayload(username: string, pin: string, mode: QrPayloadMode): string {
  if (mode === 'credentials_only') {
    return `${username}:${pin}`;
  }
  return `${window.location.origin}/login?u=${encodeURIComponent(username)}&p=${encodeURIComponent(pin)}`;
}

// ── Subkomponen Memoized Tabel Jadwal agar tidak ikut re-render saat QR/Foto berubah ──
const formatCompactSesi = (sesi: string) => sesi.replace(/^Sesi\s+/i, 'S');

const SHORT_INDO_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

function formatShortIndoDate(tanggalStr: string): string {
  const parts = (tanggalStr || '').split('-');
  if (parts.length !== 3) return tanggalStr;
  // Mendukung DD-MM-YYYY maupun YYYY-MM-DD
  const isYearFirst = parts[0].length === 4;
  const day = isYearFirst ? parts[2] : parts[0];
  const monthIdx = Number(parts[1]) - 1;
  const year = isYearFirst ? parts[0] : parts[2];
  const monthName = SHORT_INDO_MONTHS[monthIdx];
  if (!monthName) return tanggalStr;
  return `${Number(day)} ${monthName} ${year}`;
}

const ExamCardSchedulesTable = memo(({ schedules }: { schedules: ExamDaySchedule[] }) => (
  <div className="flex-1 min-w-0 h-full overflow-hidden">
    <table className="w-full table-fixed text-left border-collapse border border-slate-300">
      <thead>
        <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-black text-[6px]">
          <th className="py-0.5 px-1 border-r border-slate-300 w-[20%]">Tanggal</th>
          <th className="py-0.5 px-1 border-r border-slate-300 w-[47%]">Mata Pelajaran</th>
          <th className="py-0.5 px-1 w-[33%] text-center">Waktu</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 text-[6px]">
        {schedules.map((sch, sIdx) => {
          const sessionRows: ExamDaySessionItem[] =
            sch.sessions && sch.sessions.length > 0
              ? sch.sessions
              : sch.mapelList.map((m) => ({ sesi: sch.sesi, mapel: m, waktu: sch.waktu }));

          return sessionRows.map((row, rIdx) => (
            <tr key={`${sIdx}-${rIdx}`} className="leading-tight">
              {rIdx === 0 && (
                <td
                  rowSpan={sessionRows.length}
                  className="py-0.5 px-1 border-r border-slate-200 align-top whitespace-nowrap"
                >
                  <div className="uppercase font-black text-slate-800 leading-tight">
                    {sch.hariLabel},
                  </div>
                  <div className="text-[5.5px] font-semibold text-slate-500 leading-tight">
                    {formatShortIndoDate(sch.tanggal)}
                  </div>
                </td>
              )}
              <td className="py-0.5 px-1 border-r border-slate-200 align-top text-slate-800">
                <div className="truncate leading-tight">- {row.mapel}</div>
              </td>
              <td className="py-0.5 px-0.5 text-center align-top font-bold text-slate-600 whitespace-nowrap text-[5.5px]">
                <span className="text-slate-700">{formatCompactSesi(row.sesi)}</span>{' '}
                <span className="font-normal text-slate-500">{row.waktu}</span>
              </td>
            </tr>
          ));
        })}
      </tbody>
    </table>
  </div>
));
ExamCardSchedulesTable.displayName = 'ExamCardSchedulesTable';

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
  qrSize: QrCodeSize;
  qrPlacement: QrPlacement;
  qrPayloadMode: QrPayloadMode;
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
  qrSize,
  qrPlacement,
  qrPayloadMode,
}) => {
  const qrPayload = useMemo(
    () => (showQrCode ? buildQrPayload(student.username, student.pin, qrPayloadMode) : ''),
    [student.username, student.pin, showQrCode, qrPayloadMode]
  );

  const [qrUrl, setQrUrl] = useState<string>(() => (qrPayload ? qrDataUrlCache.get(qrPayload) || '' : ''));
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    setImgError(false);
  }, [student.id, student.foto]);

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

  // Generate QR Code dengan cache & resolusi optimal (180px) agar tidak membebani main thread
  useEffect(() => {
    if (!showQrCode || !qrPayload) {
      setQrUrl('');
      return;
    }

    const cached = qrDataUrlCache.get(qrPayload);
    if (cached) {
      setQrUrl(cached);
      return;
    }

    let isMounted = true;

    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 180,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (qrDataUrlCache.size >= MAX_QR_CACHE_SIZE) {
          qrDataUrlCache.clear();
        }
        qrDataUrlCache.set(qrPayload, url);
        if (isMounted) setQrUrl(url);
      })
      .catch((err) => {
        console.warn('QR generation skipped', err);
      });

    return () => {
      isMounted = false;
    };
  }, [qrPayload, showQrCode]);

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
        <div className={cn('shrink-0 flex items-center justify-center', is6Grid ? 'w-[12mm] h-[12mm]' : 'w-[15mm] h-[15mm]')}>
          {showLogoSekolah && (
            <img
              src={resolveProfilePhotoUrl(sekolahData?.logo_url || tenantInfo?.logo_url || '/logo.png')}
              alt="Logo"
              decoding="async"
              className={cn('object-contain', is6Grid ? 'w-[11mm] h-[11mm]' : 'w-[14mm] h-[14mm]')}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}
        </div>

        {/* Judul Kartu TKA Pusmendik Model */}
        <div className="flex-1 text-center min-w-0 px-1 flex flex-col justify-center">
          <h4
            className={cn(
              'font-black uppercase tracking-wider text-slate-900 leading-tight truncate',
              is6Grid ? 'text-[8.5px]' : 'text-[10px]'
            )}
          >
            KARTU LOGIN
          </h4>
          <p
            className={cn(
              'font-extrabold uppercase text-slate-800 leading-tight truncate mt-0.5',
              is6Grid ? 'text-[7.5px]' : 'text-[9px]'
            )}
          >
            {customEventName}
          </p>
          <p
            className={cn(
              'font-bold text-slate-500 uppercase leading-none truncate mt-0.5',
              is6Grid ? 'text-[7px]' : 'text-[8px]'
            )}
          >
            {activeTpName}
          </p>
        </div>

        {/* QR Code Quick Login di Pojok Kanan Atas (Aktif jika qrPlacement === 'header') */}
        {qrPlacement === 'header' && (
          <div
            className={cn(
              'shrink-0 flex items-center justify-end',
              qrSize === 'jumbo'
                ? (is6Grid ? 'w-[19.5mm] h-[19.5mm]' : 'w-[23mm] h-[23mm]')
                : (is6Grid ? 'w-[16.5mm] h-[16.5mm]' : 'w-[20mm] h-[20mm]')
            )}
          >
            {showQrCode && (
              qrUrl ? (
                <img
                  src={qrUrl}
                  alt="QR Quick Login"
                  className="w-full h-full object-contain border border-slate-300 rounded-xs p-0.5 bg-white shrink-0 shadow-2xs"
                  title={`Ukuran QR: ${qrSize === 'jumbo' ? '19.5mm (Jumbo Inkjet)' : '16.5mm (Standar)'} • Pindai untuk login instan`}
                />
              ) : (
                <div className="w-full h-full border border-slate-200 rounded-xs bg-slate-50 flex items-center justify-center shrink-0">
                  <QrCodeIcon size={14} className="text-slate-300 animate-pulse" />
                </div>
              )
            )}
          </div>
        )}
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
          <span className="col-span-4 text-slate-600 font-bold">Username / NISN</span>
          <span className="col-span-8 font-mono font-black text-slate-900">
            : {student.username}
          </span>
        </div>
        <div className="grid grid-cols-12 items-baseline">
          <span className="col-span-4 text-slate-600 font-bold">Password</span>
          <span className="col-span-8 font-mono font-black text-indigo-700 tracking-wider">
            : {showPassword ? student.pin : '••••••••••'}
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
          {qrPlacement === 'photo_box' ? (
            showQrCode && qrUrl ? (
              <div className="flex flex-col items-center justify-center p-0.5">
                <img
                  src={qrUrl}
                  alt="QR Quick Login"
                  className={cn(
                    'object-contain border-2 border-slate-900 rounded p-0.5 bg-white shadow-2xs',
                    is6Grid ? 'w-[20.5mm] h-[20.5mm]' : 'w-[23.5mm] h-[23.5mm]'
                  )}
                  title="Pindai QR ini untuk login instan tanpa ketik password"
                />
                <span className="text-[5.5px] font-black uppercase text-indigo-700 mt-1 tracking-wider text-center">
                  SCAN CEPAT CBT
                </span>
              </div>
            ) : (
              <div
                className={cn(
                  'border border-dashed border-slate-300 rounded bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-0.5 text-center',
                  is6Grid ? 'w-[20mm] h-[28mm]' : 'w-[23mm] h-[31mm]'
                )}
              >
                <QrCodeIcon size={is6Grid ? 16 : 20} className="text-slate-300 mb-0.5" />
                <span className="text-[5.5px] font-bold text-slate-400">QR KOSONG</span>
              </div>
            )
          ) : showFoto && normIdentity.fotoUrl && !imgError ? (
            <img
              src={resolveProfilePhotoUrl(normIdentity.fotoUrl)}
              alt={normIdentity.nama}
              decoding="async"
              onError={() => setImgError(true)}
              className={cn(
                'object-cover rounded-xs border border-slate-300 shadow-2xs',
                is6Grid ? 'w-[20mm] h-[28mm]' : 'w-[23mm] h-[31mm]'
              )}
            />
          ) : !showFoto && showQrCode && qrUrl ? (
            // Jika foto dimatikan, otomatis isi kotak foto dengan QR Code Jumbo (20.5mm)
            <div className="flex flex-col items-center justify-center p-0.5">
              <img
                src={qrUrl}
                alt="QR Quick Login"
                className={cn(
                  'object-contain border-2 border-slate-900 rounded p-0.5 bg-white shadow-2xs',
                  is6Grid ? 'w-[20.5mm] h-[20.5mm]' : 'w-[23.5mm] h-[23.5mm]'
                )}
                title="Pindai QR ini untuk login instan tanpa ketik password"
              />
              <span className="text-[5.5px] font-black uppercase text-indigo-700 mt-1 tracking-wider text-center">
                SCAN CEPAT CBT
              </span>
            </div>
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
        <ExamCardSchedulesTable schedules={schedules} />
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
  eventName,
  activeTpName,
  semester,
  activeEvent,
}) => {
  const sheetContainerRef = useRef<HTMLDivElement>(null);

  // Hook Konteks Akademik & Konfigurasi Event CBT Aktif (SSoT)
  const { data: eventsData } = useQuery({
    queryKey: cbtQueryKeys.eventsSummary(),
    queryFn: () => cbtApi.getEventsSummary(),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const { activeYear: activeTp, rawList: tpRawList = [] } = useTahunPelajaranOptions();
  const { activeSemester } = useSemesterOptions();

  const effectiveEvent = activeEvent || eventsData?.active_event;

  // 1. Resolusi Nama Event CBT
  const resolvedEventName = useMemo(() => {
    if (eventName && eventName.trim()) return eventName.trim();
    if (effectiveEvent?.nama_event && effectiveEvent.nama_event.trim()) {
      return effectiveEvent.nama_event.trim();
    }
    return 'TES KEMAMPUAN AKADEMIK / UJIAN CBT';
  }, [eventName, effectiveEvent]);

  // 2. Resolusi Tahun Pelajaran (Event Aktif CBT -> Konteks Akademik Aktif -> Dynamic Fallback)
  const resolvedTpName = useMemo(() => {
    if (activeTpName && activeTpName.trim()) return activeTpName.trim();

    if (effectiveEvent?.tahun_pelajaran_id && eventsData?.summary) {
      const matched = eventsData.summary.find(
        (s) => s.tahun_pelajaran_id === effectiveEvent.tahun_pelajaran_id
      );
      if (matched?.tahun_ajaran) return matched.tahun_ajaran;
    }
    if (effectiveEvent?.tahun_pelajaran_id && tpRawList.length > 0) {
      const matched = tpRawList.find((tp) => tp.id === effectiveEvent.tahun_pelajaran_id);
      if (matched?.tahun) return matched.tahun;
    }

    if (activeTp?.tahun) return activeTp.tahun;
    if ((activeTp as any)?.nama) return (activeTp as any).nama;

    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return curMonth >= 7 ? `${curYear}/${curYear + 1}` : `${curYear - 1}/${curYear}`;
  }, [activeTpName, effectiveEvent, eventsData, tpRawList, activeTp]);

  // 3. Resolusi Semester (Event Aktif CBT -> Konteks Akademik Aktif)
  const resolvedSemester = useMemo(() => {
    if (semester && semester.trim()) return semester.trim();
    if (effectiveEvent?.semester) return effectiveEvent.semester;
    if (activeSemester?.nama_semester) return activeSemester.nama_semester;
    if ((activeSemester as any)?.nama) return (activeSemester as any).nama;
    return new Date().getMonth() + 1 >= 7 ? 'GANJIL' : 'GENAP';
  }, [semester, effectiveEvent, activeSemester]);

  const formatDefaultCardTp = (tp: string, sem?: string) => {
    const cleanTp = (tp || '').replace(/tahun\s*(pelajaran|ajaran)?/i, '').trim();
    const cleanSem = (sem || '').replace(/^semester\s+/i, '').trim();
    const semText = cleanSem ? ` - SEMESTER ${cleanSem.toUpperCase()}` : '';
    return `TAHUN PELAJARAN ${cleanTp || '2025/2026'}${semText}`;
  };

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

  // ── 3. Visual & Security Toggles & Inkjet Optimization (Default Standar TKA Pusmendik + Inkjet HVS) ──
  const [showPassword, setShowPassword] = useState<boolean>(true);
  const [showFoto, setShowFoto] = useState<boolean>(true);
  const [showQrCode, setShowQrCode] = useState<boolean>(true);
  const [showLogoSekolah, setShowLogoSekolah] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [qrSize, setQrSize] = useState<QrCodeSize>('jumbo'); // 20mm (Inkjet)
  const [qrPlacement, setQrPlacement] = useState<QrPlacement>('header'); // Header pojok kanan atas
  const [qrPayloadMode, setQrPayloadMode] = useState<QrPayloadMode>('credentials_only'); // Dot Raksasa Version 1
  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false); // Tray Pengaturan Tersembunyi (Anti-Noise)

  // ── 4. Editable Text (dengan debounce 250ms agar mengetik tidak me-render ulang seluruh kartu) ──
  const [eventNameInput, setEventNameInput] = useState<string>(resolvedEventName);
  const [tpTextInput, setTpTextInput] = useState<string>(() =>
    formatDefaultCardTp(resolvedTpName, resolvedSemester)
  );
  const [customEventName, setCustomEventName] = useState<string>(resolvedEventName);
  const [customTpText, setCustomTpText] = useState<string>(() =>
    formatDefaultCardTp(resolvedTpName, resolvedSemester)
  );

  // Universal Header Info (SSoT)
  const { tenantInfo, rawSekolah } = usePrintHeaderData();
  const sekolahData = (rawSekolah || {}) as any;

  useEffect(() => {
    if (resolvedEventName) {
      setEventNameInput(resolvedEventName);
      setCustomEventName(resolvedEventName);
    }
  }, [resolvedEventName]);

  useEffect(() => {
    if (resolvedTpName) {
      const formatted = formatDefaultCardTp(resolvedTpName, resolvedSemester);
      setTpTextInput(formatted);
      setCustomTpText(formatted);
    }
  }, [resolvedTpName, resolvedSemester]);

  useEffect(() => {
    const timer = setTimeout(() => setCustomEventName(eventNameInput), 250);
    return () => clearTimeout(timer);
  }, [eventNameInput]);

  useEffect(() => {
    const timer = setTimeout(() => setCustomTpText(tpTextInput), 250);
    return () => clearTimeout(timer);
  }, [tpTextInput]);

  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;

  // Resolusi Ploting Matriks yang Melekat pada Event Ujian Aktif (SSoT)
  const eventId = effectiveEvent?.id;
  const activeTpId = effectiveEvent?.tahun_pelajaran_id || activeTp?.id;
  const activeSemId = activeSemester?.id;

  const persistedMatrix = useMemo(() => {
    if (!isOpen) return null;
    return loadPersistedMatrixState(tenantId, activeTpId, activeSemId, eventId);
  }, [tenantId, activeTpId, activeSemId, eventId, isOpen]);

  // ── 5. Query Jadwal Ujian Aktif (Fase 3 Hari & Sesi) ──
  const { data: jadwalRes } = useQuery({
    queryKey: cbtQueryKeys.jadwal({ limit: 1000, sort_direction: 'asc' }),
    queryFn: () => cbtApi.getJadwalList({ limit: 1000, sort_direction: 'asc' }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const jadwalList = jadwalRes?.items || [];

  // Query Master Bank Soal untuk Resolusi Nama Mata Pelajaran & Tingkat (Jalur 1 & Jalur 2)
  const { data: bankRes } = useQuery({
    queryKey: cbtQueryKeys.bankSoal({ limit: 500 }),
    queryFn: () => cbtApi.getBankSoalList({ limit: 500 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const bankList: CbtBankSoal[] = bankRes?.items || [];
  const bankMap = useMemo(() => new Map(bankList.map((b) => [b.id, b])), [bankList]);
  const mapelNameById = useMemo(() => {
    const map = new Map<string, string>();
    bankList.forEach((b) => {
      const mId = b.mapel_id || b.Mapel?.id;
      const mName = b.Mapel?.nama_mapel;
      if (mId && mName && !map.has(mId)) {
        map.set(mId, mName);
      }
    });
    return map;
  }, [bankList]);

  // Hitung jadwal sesi untuk kelas aktif (SSoT: DB Jadwal Terbit -> Days Config Event & Matriks -> Fallback)
  const classSchedules = useMemo<ExamDaySchedule[]>(() => {
    if (!currentClassMapping) return [];

    const tingkatNum = Number(currentClassMapping.tingkat) || 10;
    const classId = currentClassMapping.kelas_id;
    const jurKode = currentClassMapping.kode_jurusan || '';
    const jurId = currentClassMapping.jurusan_id || '';

    const parseTingkatNum = (val: unknown): number | undefined => {
      if (val === undefined || val === null || val === '') return undefined;
      const str = String(val).trim().toUpperCase();
      if (str === 'X') return 10;
      if (str === 'XI') return 11;
      if (str === 'XII') return 12;
      if (str === 'XIII') return 13;
      const n = Number(str);
      return Number.isNaN(n) ? undefined : n;
    };

    const resolveMatrixSubjectName = (val: string, fallback: string): string => {
      const bank = bankMap.get(val);
      if (bank) {
        return bank.Mapel?.nama_mapel || bank.judul || bank.nama_bank || fallback;
      }
      return mapelNameById.get(val) || fallback;
    };

    // =========================================================================
    // JALUR 1: JIKA SUDAH ADA JADWAL SESI TERBIT DI DATABASE (CbtJadwalUjian)
    // =========================================================================
    const matchedFromDb = jadwalList.filter((j) => {
      if (eventId && (j as any).event_id && (j as any).event_id !== eventId) {
        return false;
      }
      if (activeTpId && j.tahun_pelajaran_id && j.tahun_pelajaran_id !== activeTpId) {
        return false;
      }
      if (activeSemId && j.semester_id && j.semester_id !== activeSemId) {
        return false;
      }

      const clsIds: string[] = j.target_kelas_ids || (j as any).kelas_ids || [];
      if (clsIds.length > 0) {
        return clsIds.includes(classId);
      }

      const linkedBank = bankMap.get(j.bank_soal_id);
      const jTingkatNum = parseTingkatNum(
        (j as any).tingkat ?? j.BankSoal?.tingkat ?? linkedBank?.tingkat
      );
      if (jTingkatNum !== undefined && jTingkatNum !== tingkatNum) {
        return false;
      }
      return true;
    });

    if (matchedFromDb.length > 0) {
      const mapByDate = new Map<
        string,
        {
          tanggalStr: string;
          hariLabel: string;
          entries: Array<{ startMin: number; startStr: string; endStr: string; sesi: string; mapel: string }>;
        }
      >();

      matchedFromDb.forEach((j) => {
        const startObj = j.tanggal_mulai ? new Date(j.tanggal_mulai) : null;
        const endObj = j.tanggal_selesai ? new Date(j.tanggal_selesai) : null;
        const hasValidStart = startObj && !Number.isNaN(startObj.getTime());
        const hasValidEnd = endObj && !Number.isNaN(endObj.getTime());

        const rawDate = hasValidStart
          ? `${startObj.getFullYear()}-${String(startObj.getMonth() + 1).padStart(2, '0')}-${String(startObj.getDate()).padStart(2, '0')}`
          : '2026-11-30';

        const linkedBank = bankMap.get(j.bank_soal_id);
        const mapelName =
          j.display_mapel ||
          j.BankSoal?.Mapel?.nama_mapel ||
          (j.BankSoal as any)?.MataPelajaran?.nama_mapel ||
          linkedBank?.Mapel?.nama_mapel ||
          j.BankSoal?.judul ||
          j.BankSoal?.nama_bank ||
          linkedBank?.judul ||
          linkedBank?.nama_bank ||
          'Mata Pelajaran';

        const startStr = hasValidStart
          ? `${String(startObj.getHours()).padStart(2, '0')}:${String(startObj.getMinutes()).padStart(2, '0')}`
          : (j as any).jam_mulai?.slice(0, 5) || '07:30';
        const endStr = hasValidEnd
          ? `${String(endObj.getHours()).padStart(2, '0')}:${String(endObj.getMinutes()).padStart(2, '0')}`
          : (j as any).jam_selesai?.slice(0, 5) || '09:00';

        const startMin = hasValidStart ? startObj.getHours() * 60 + startObj.getMinutes() : 450;
        const sec = j.setting_keamanan as any;
        const sesiStr = sec?.nama_sesi_waktu || j.nama_sesi || 'Sesi 1';

        if (!mapByDate.has(rawDate)) {
          const dObj = hasValidStart ? startObj : new Date(rawDate);
          const hari = !Number.isNaN(dObj.getTime())
            ? ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dObj.getDay()]
            : 'Hari Ujian';
          const parts = rawDate.split('-');
          const tglFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : rawDate;

          mapByDate.set(rawDate, {
            tanggalStr: tglFormatted,
            hariLabel: hari,
            entries: [{ startMin, startStr, endStr, sesi: sesiStr, mapel: mapelName }],
          });
        } else {
          const item = mapByDate.get(rawDate)!;
          item.entries.push({ startMin, startStr, endStr, sesi: sesiStr, mapel: mapelName });
        }
      });

      const sorted = Array.from(mapByDate.entries())
        .sort(([dA], [dB]) => dA.localeCompare(dB))
        .map(([_, v]) => {
          const ordered = v.entries.sort((a, b) => a.startMin - b.startMin);
          const uniqueMapels: string[] = [];
          const sessions: ExamDaySessionItem[] = [];
          const seenKeys = new Set<string>();

          ordered.forEach((e) => {
            if (!uniqueMapels.includes(e.mapel)) uniqueMapels.push(e.mapel);
            const dedupKey = `${e.sesi}|${e.mapel}|${e.startStr}-${e.endStr}`;
            if (!seenKeys.has(dedupKey)) {
              seenKeys.add(dedupKey);
              sessions.push({
                sesi: e.sesi,
                mapel: e.mapel,
                waktu: `${e.startStr}-${e.endStr}`,
              });
            }
          });

          const firstEntry = ordered[0];
          const lastEntry = ordered[ordered.length - 1];
          const waktu = `${firstEntry.startStr}-${lastEntry.endStr}`;
          const sesi =
            firstEntry.sesi === lastEntry.sesi
              ? firstEntry.sesi
              : `${firstEntry.sesi} - ${lastEntry.sesi}`;

          return {
            tanggal: v.tanggalStr,
            hariLabel: v.hariLabel,
            mapelList: uniqueMapels,
            waktu,
            sesi,
            sessions,
          };
        });

      if (sorted.length > 0) return sorted;
    }

    // =========================================================================
    // JALUR 2: MELEKAT PADA EVENT UJIAN AKTIF (days_config + matrix_draft / Matriks Ploting)
    // =========================================================================
    const effectiveDays: ExamDayConfig[] =
      effectiveEvent?.days_config && Array.isArray(effectiveEvent.days_config) && effectiveEvent.days_config.length > 0
        ? effectiveEvent.days_config
        : persistedMatrix?.days && Array.isArray(persistedMatrix.days) && persistedMatrix.days.length > 0
        ? persistedMatrix.days
        : [];

    const serverMatrixDraft =
      effectiveEvent?.matrix_draft &&
      typeof effectiveEvent.matrix_draft === 'object' &&
      Object.keys(effectiveEvent.matrix_draft).length > 0
        ? effectiveEvent.matrix_draft
        : null;
    const matrixState = serverMatrixDraft || persistedMatrix?.matrix || {};

    if (effectiveDays.length > 0) {
      const scheduleResult: ExamDaySchedule[] = [];

      effectiveDays.forEach((day) => {
        const parts = (day.tanggal || '').split('-');
        const tglFormatted = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : day.tanggal;
        const hariText = day.nama_hari || 'Hari Ujian';

        const dayMapelList: string[] = [];
        const daySessions: ExamDaySessionItem[] = [];
        let firstStart = '';
        let lastEnd = '';
        let firstSesi = '';
        let lastSesi = '';

        day.sessions.forEach((sess) => {
          if (!firstStart) {
            firstStart = sess.jam_mulai;
            firstSesi = sess.nama_sesi;
          }
          lastEnd = sess.jam_selesai;
          lastSesi = sess.nama_sesi;

          // Slot key matriks: ${day_index}_${session_index}_${tingkat}
          const matrixKey = `${day.day_index}_${sess.session_index}_${tingkatNum}`;
          const matrixVal = matrixState[matrixKey];
          const sessWaktu = `${sess.jam_mulai}-${sess.jam_selesai}`;

          let resolvedMapelName = `Ujian ${sess.nama_sesi}`;
          if (matrixVal) {
            if (isMultiJurusanSlot(matrixVal)) {
              const multi = parseMultiJurusanSlot(matrixVal);
              let resolvedId = '';
              if (multi?.assignments) {
                resolvedId =
                  (jurKode && multi.assignments[jurKode]) ||
                  (jurId && multi.assignments[jurId]) ||
                  Object.values(multi.assignments)[0] ||
                  '';
              }
              resolvedMapelName = resolvedId
                ? resolveMatrixSubjectName(resolvedId, multi?.title || 'Mapel Kejuruan')
                : multi?.title || 'Mapel Kejuruan';
            } else {
              resolvedMapelName = resolveMatrixSubjectName(matrixVal, `Mapel ${sess.nama_sesi}`);
            }
          }

          if (!dayMapelList.includes(resolvedMapelName)) {
            dayMapelList.push(resolvedMapelName);
          }
          daySessions.push({
            sesi: sess.nama_sesi,
            mapel: resolvedMapelName,
            waktu: sessWaktu,
          });
        });

        const waktu = firstStart && lastEnd ? `${firstStart}-${lastEnd}` : '07:30-09:00';
        const sesi =
          firstSesi && lastSesi && firstSesi !== lastSesi
            ? `${firstSesi} - ${lastSesi}`
            : firstSesi || 'Sesi 1';

        scheduleResult.push({
          tanggal: tglFormatted,
          hariLabel: hariText,
          mapelList: dayMapelList.length > 0 ? dayMapelList : ['Ujian CBT'],
          waktu,
          sesi,
          sessions: daySessions,
        });
      });

      return scheduleResult;
    }

    // =========================================================================
    // JALUR 3: FALLBACK STATIS JIKA EVENT BELUM MEMILIKI HARI & SESI
    // =========================================================================
    return DEFAULT_WEEK_SCHEDULE;
  }, [currentClassMapping, jadwalList, effectiveEvent, persistedMatrix, bankMap, mapelNameById, eventId, activeTpId, activeSemId]);

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

    const firstSession = classSchedules[0]?.sessions?.[0];
    const defaultSesiWaktu = firstSession
      ? `${firstSession.sesi} (${firstSession.waktu})`
      : classSchedules[0]?.waktu
      ? `${classSchedules[0]?.sesi || 'Sesi 1'} (${classSchedules[0]?.waktu})`
      : 'Sesi 1';

    if (realStudents.length > 0) {
      const tingkatStr = currentClassMapping.tingkat === 10 ? 'X' : currentClassMapping.tingkat === 11 ? 'XI' : 'XII';
      const cleanClassName = currentClassMapping.nama_kelas.replace(/\s+/g, '');

      return realStudents.map((s, idx) => {
        const noPeserta = `26-${tingkatStr}-${cleanClassName}-${String(idx + 1).padStart(3, '0')}`;
        const cleanNisn = s.nisn ? String(s.nisn).trim() : '';
        const cleanNis = s.nis ? String(s.nis).trim() : '';

        // SSoT Login Platform Absenta: Login menggunakan NISN murni (atau NIS jika belum ada NISN)
        const loginUsername = cleanNisn || cleanNis || s.User?.username || s.User?.email || s.id.slice(0, 8);
        // Default password platform: NISN murni (atau NIS / fallback)
        const loginPassword = cleanNisn || cleanNis || 'Siswa123!';

        return {
          id: s.id,
          nama_siswa: s.nama_siswa || (s as any).nama || 'Siswa CBT',
          nis: cleanNis || '-',
          nisn: cleanNisn || '-',
          kelas_id: currentClassMapping.kelas_id,
          nama_kelas: currentClassMapping.nama_kelas,
          tingkat: currentClassMapping.tingkat,
          jurusan: currentClassMapping.kode_jurusan || currentClassMapping.nama_jurusan || (currentClassMapping as any).jurusan || 'Kejuruan',
          slot_ruang: currentClassMapping.slot_ruang || 'R.01',
          nama_ruang: currentClassMapping.nama_ruang || 'Ruang CBT',
          sesi_ujian: defaultSesiWaktu,
          no_peserta: noPeserta,
          username: loginUsername,
          pin: loginPassword,
          foto: s.foto,
        };
      });
    }

    // Fallback realistis khusus 1 rombel ini
    return generateSampleStudentsForClass(currentClassMapping, 30);
  }, [currentClassMapping, realStudents, classSchedules]);

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

      const sheetElements = sheetContainerRef.current
        ? sheetContainerRef.current.querySelectorAll<HTMLElement>('.print-sheet')
        : document.querySelectorAll<HTMLElement>('.print-sheet');
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
        toast.loading(`Memproses lembar ${i + 1} dari ${sheetElements.length}...`, {
          id: 'pdf-export-toast',
        });
        // Beri jeda event loop agar UI & toast progres tetap responsif
        await new Promise((resolve) => setTimeout(resolve, 0));

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const sheetElement = sheetElements[i];

        const canvas = await html2canvas(sheetElement, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          onclone: (clonedDoc, clonedSheet) => {
            const clonedDesk = clonedDoc.getElementById('print-desk-canvas-area');
            if (clonedDesk) {
              clonedDesk.style.zoom = '1';
              clonedDesk.style.transform = 'none';
            }
            if (clonedSheet) {
              clonedSheet.style.zoom = '1';
              clonedSheet.style.transform = 'none';
              clonedSheet.style.letterSpacing = 'normal';
              clonedSheet.style.fontVariantLigatures = 'none';
              clonedSheet.style.border = 'none';
              clonedSheet.style.boxShadow = 'none';
              clonedSheet.style.outline = 'none';
            }
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
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
      allowLogoToggles={false}
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
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
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
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
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

          {/* Tombol Expand/Collapse Pengaturan Kartu (Anti-Noise Toolbar) */}
          <button
            type="button"
            onClick={() => setIsOptionsOpen((prev) => !prev)}
            className={cn(
              'px-2.5 py-1 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer',
              isOptionsOpen
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            )}
            title="Buka / Tutup Pengaturan Kartu Ujian (Event, TP, Logo, PIN, Foto, QR Code)"
          >
            <SlidersHorizontal size={12} className={isOptionsOpen ? 'text-indigo-300 dark:text-indigo-600' : 'text-indigo-600'} />
            <span>Pengaturan Kartu</span>
            <ChevronDown size={12} className={cn('transition-transform duration-200', isOptionsOpen && 'rotate-180')} />
          </button>
        </div>
      }
      subHeader={
        isOptionsOpen ? (
          <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200 print:hidden">
            {/* Baris 1: Header Dokumen (Event, Tahun Pelajaran & Logo Sekolah) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
              <div className="md:col-span-6 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">
                <Edit3 size={13} className="text-indigo-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Event:</span>
                <input
                  type="text"
                  value={eventNameInput}
                  onChange={(e) => setEventNameInput(e.target.value)}
                  placeholder="Nama Event Asesmen..."
                  aria-label="Edit nama event ujian pada kartu"
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden w-full"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">TP:</span>
                <input
                  type="text"
                  value={tpTextInput}
                  onChange={(e) => setTpTextInput(e.target.value)}
                  placeholder="Tahun Pelajaran..."
                  aria-label="Edit tahun pelajaran pada kartu ujian"
                  className="text-xs font-bold bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden w-full"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setShowLogoSekolah((prev) => !prev)}
                  className={cn(
                    'w-full py-1.5 px-2 text-xs font-bold rounded-lg border transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                    showLogoSekolah
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                  )}
                  title="Tampilkan logo sekolah di header kartu ujian"
                >
                  <span>Logo {showLogoSekolah ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            </div>

            {/* Baris 2: Visual, Keamanan & Inkjet Optimization */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-200/80 dark:border-slate-800/80">
              <div className="flex flex-wrap items-center gap-2">
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
                  title="Tampilkan foto siswa di kartu (Jika OFF, otomatis diisi QR Code)"
                >
                  <User size={12} />
                  <span>Foto {showFoto ? 'ON' : 'OFF'}</span>
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
              </div>

              {/* Kelompok Opsi Khusus QR Code Inkjet */}
              {showQrCode && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Group 1: Ukuran QR Code */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px] shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 pl-1.5 pr-0.5">QR:</span>
                    <button
                      type="button"
                      onClick={() => setQrSize('normal')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        qrSize === 'normal'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="Ukuran Standar TKA (16.5 mm x 16.5 mm)"
                    >
                      17mm
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrSize('jumbo')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer flex items-center gap-1',
                        qrSize === 'jumbo'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="Ukuran Jumbo Inkjet (19.5 mm x 19.5 mm) - Sangat direkomendasikan untuk printer inkjet & kertas HVS"
                    >
                      <Sparkles size={10} />
                      <span>20mm (Inkjet)</span>
                    </button>
                  </div>

                  {/* Group 2: Posisi QR Code */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px] shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 pl-1.5 pr-0.5">Posisi:</span>
                    <button
                      type="button"
                      onClick={() => setQrPlacement('header')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        qrPlacement === 'header'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="Pojok Kanan Atas Header (Standar Pusmendik TKA)"
                    >
                      Header
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrPlacement('photo_box')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        qrPlacement === 'photo_box'
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="Gantikan Kotak Pasfoto (Ukuran Jumbo 21mm x 21mm)"
                    >
                      Ganti Foto
                    </button>
                  </div>

                  {/* Group 3: Mode Dot Inkjet */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-lg text-[11px] shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 pl-1.5 pr-0.5">Dot:</span>
                    <button
                      type="button"
                      onClick={() => setQrPayloadMode('url_short')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        qrPayloadMode === 'url_short'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="URL Singkat: Scan langsung pakai Kamera HP bawaan (Version 3 Matrix, ~50 karakter)"
                    >
                      URL HP
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrPayloadMode('credentials_only')}
                      className={cn(
                        'px-2 py-0.5 rounded font-bold transition-all cursor-pointer',
                        qrPayloadMode === 'credentials_only'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                      title="Kredensial Saja: Dot Kotak Raksasa Anti-Luber Inkjet (Version 1 Matrix 21x21, ~20 karakter)"
                    >
                      Dot Raksasa
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null
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
                      activeTpName={customTpText}
                      showLogoSekolah={showLogoSekolah}
                      showFoto={showFoto}
                      showQrCode={showQrCode}
                      showPassword={showPassword}
                      schedules={classSchedules}
                      gridMode={gridMode}
                      qrSize={qrSize}
                      qrPlacement={qrPlacement}
                      qrPayloadMode={qrPayloadMode}
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
