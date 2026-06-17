/**
 * OperationalSidebarPanels.tsx
 * Kumpulan panel sidebar reusable untuk jabatan operasional guru.
 * Setiap panel mengikuti pola desain yang konsisten:
 *   - Header identitas jabatan + status badge
 *   - Stats grid 2-kolom
 *   - Alert kondisi kritis (opsional)
 *   - CTA navigasi cepat
 */

import React from 'react';
import {
  Package,
  Briefcase,
  Wrench,
  GraduationCap,
  Hammer,
  Heart,
  Handshake,
  ScanLine,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Clock,
  Radio,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

// ─── Shared Base Panel ────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: number | string;
  sub?: string;
  highlight?: boolean;
}

interface BaseActionItem {
  label: string;
  onClick?: () => void;
}

interface BasePanelProps {
  /** Warna aksen: tailwind color name (e.g. 'emerald', 'indigo') */
  accentColor: string;
  icon: React.ElementType;
  roleLabel: string;
  panelTitle: string;
  statusLabel?: string;
  statusOk?: boolean;
  stats: [StatItem, StatItem];
  alertText?: string;
  actions: BaseActionItem[];
  isLoading?: boolean;
  className?: string;
}

const BaseSidebarPanel: React.FC<BasePanelProps> = ({
  accentColor: c,
  icon: Icon,
  roleLabel,
  panelTitle,
  statusLabel,
  statusOk = true,
  stats,
  alertText,
  actions,
  isLoading = false,
  className,
}) => {
  const [stat1, stat2] = stats;

  return (
    <div className={cn(
      'rounded-xl border border-gray-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden shadow-sm',
      className
    )}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700/50 bg-${c}-50/50 dark:bg-${c}-900/5`}>
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-${c}-100 dark:bg-${c}-900/20 flex items-center justify-center`}>
            <Icon size={14} className={`text-${c}-600 dark:text-${c}-400`} />
          </div>
          <div>
            <p className={`text-[9px] font-black text-${c}-500 uppercase tracking-widest leading-none`}>{roleLabel}</p>
            <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">{panelTitle}</p>
          </div>
        </div>
        {statusLabel && (
          <span className={cn(
            'text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded-full border',
            statusOk
              ? `text-${c}-700 bg-${c}-50 border-${c}-200 dark:text-${c}-400 dark:bg-${c}-900/20 dark:border-${c}-900/40`
              : 'text-gray-500 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-slate-700 dark:border-slate-600'
          )}>
            {statusLabel}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[stat1, stat2].map((s, i) => (
            <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 border border-gray-100 dark:border-slate-700/50">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
              {isLoading ? (
                <div className="h-6 bg-gray-200 dark:bg-slate-600/50 rounded animate-pulse" />
              ) : (
                <>
                  <p className={cn(
                    'text-xl font-black leading-none',
                    s.highlight ? `text-${c}-600 dark:text-${c}-400` : 'text-gray-800 dark:text-gray-100'
                  )}>
                    {s.value}
                  </p>
                  {s.sub && <p className="text-[8px] text-gray-400 mt-0.5">{s.sub}</p>}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Alert */}
        {alertText && !isLoading && (
          <div className={`flex items-center gap-2 px-3 py-2 bg-${c}-50/80 dark:bg-${c}-900/10 rounded-lg border border-${c}-100 dark:border-${c}-900/30`}>
            <AlertTriangle size={11} className={`text-${c}-500 flex-shrink-0`} />
            <p className={`text-[10px] font-bold text-${c}-700 dark:text-${c}-400`}>{alertText}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-1 pt-1 border-t border-gray-100 dark:border-slate-700/50">
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              className={`w-full flex items-center justify-between group py-2 px-3 rounded-lg hover:bg-${c}-50 dark:hover:bg-${c}-900/10 transition-colors`}
            >
              <span className={`text-[10px] font-bold text-gray-600 dark:text-gray-300 group-hover:text-${c}-700 dark:group-hover:text-${c}-400 transition-colors`}>
                {a.label}
              </span>
              <ChevronRight size={12} className={`text-gray-300 group-hover:text-${c}-500 transition-colors`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SARPRAS ─────────────────────────────────────────────────────────────────

interface SarpraSidebarPanelProps {
  activeBorrows?: number;
  availableAssets?: number;
  pendingMaintenance?: number;
  isLoading?: boolean;
  onManage?: () => void;
  className?: string;
}

export const SarpraSidebarPanel: React.FC<SarpraSidebarPanelProps> = ({
  activeBorrows = 0,
  availableAssets = 0,
  pendingMaintenance = 0,
  isLoading,
  onManage,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="emerald"
    icon={Package}
    roleLabel="Staf Sarpras"
    panelTitle="Inventaris & Sarana"
    statusLabel={pendingMaintenance > 0 ? `${pendingMaintenance} Perawatan` : 'Normal'}
    statusOk={pendingMaintenance === 0}
    stats={[
      { label: 'Peminjaman Aktif', value: activeBorrows, sub: 'unit dipinjam', highlight: activeBorrows > 0 },
      { label: 'Aset Tersedia', value: availableAssets, sub: 'unit siap pakai' },
    ]}
    alertText={pendingMaintenance > 0 ? `${pendingMaintenance} aset menunggu perawatan` : undefined}
    actions={[{ label: 'Inventaris Sarpras', onClick: onManage }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── HUBIN ───────────────────────────────────────────────────────────────────

interface HubinSidebarPanelProps {
  activePklStudents?: number;
  activePartners?: number;
  pendingReports?: number;
  isLoading?: boolean;
  onMonitor?: () => void;
  className?: string;
}

export const HubinSidebarPanel: React.FC<HubinSidebarPanelProps> = ({
  activePklStudents = 0,
  activePartners = 0,
  pendingReports = 0,
  isLoading,
  onMonitor,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="indigo"
    icon={Briefcase}
    roleLabel="Staf Hubin"
    panelTitle="Industri & PKL"
    statusLabel={pendingReports > 0 ? `${pendingReports} Laporan` : 'Update'}
    statusOk={pendingReports === 0}
    stats={[
      { label: 'Siswa PKL Aktif', value: activePklStudents, sub: 'sedang magang' },
      { label: 'Mitra Aktif', value: activePartners, sub: 'industri mitra' },
    ]}
    alertText={pendingReports > 0 ? `${pendingReports} laporan PKL menunggu verifikasi` : undefined}
    actions={[{ label: 'Monitoring PKL', onClick: onMonitor }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── TOOLMAN ─────────────────────────────────────────────────────────────────

interface ToolmanSidebarPanelProps {
  toolsBorrowed?: number;
  toolsAvailable?: number;
  damagedReports?: number;
  isLoading?: boolean;
  onManage?: () => void;
  className?: string;
}

export const ToolmanSidebarPanel: React.FC<ToolmanSidebarPanelProps> = ({
  toolsBorrowed = 0,
  toolsAvailable = 0,
  damagedReports = 0,
  isLoading,
  onManage,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="orange"
    icon={Wrench}
    roleLabel="Toolman"
    panelTitle="Alat & Lab"
    statusLabel={damagedReports > 0 ? `${damagedReports} Rusak` : 'Normal'}
    statusOk={damagedReports === 0}
    stats={[
      { label: 'Alat Dipinjam', value: toolsBorrowed, sub: 'unit keluar', highlight: toolsBorrowed > 0 },
      { label: 'Stok Tersedia', value: toolsAvailable, sub: 'unit di lab' },
    ]}
    alertText={damagedReports > 0 ? `${damagedReports} kerusakan alat dilaporkan` : undefined}
    actions={[{ label: 'Kelola Inventaris Lab', onClick: onManage }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── KAPROG ──────────────────────────────────────────────────────────────────

interface KaprogSidebarPanelProps {
  totalTeachers?: number;
  activeClasses?: number;
  supervisionCount?: number;
  programName?: string;
  isLoading?: boolean;
  onMonitor?: () => void;
  className?: string;
}

export const KaprogSidebarPanel: React.FC<KaprogSidebarPanelProps> = ({
  totalTeachers = 0,
  activeClasses = 0,
  supervisionCount = 0,
  programName = 'Jurusan',
  isLoading,
  onMonitor,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="violet"
    icon={GraduationCap}
    roleLabel="Kepala Program"
    panelTitle={`Kaprog ${programName}`}
    statusLabel={supervisionCount > 0 ? `${supervisionCount} Supervisi` : 'Aktif'}
    statusOk
    stats={[
      { label: 'Guru Jurusan', value: totalTeachers, sub: 'tenaga pengajar' },
      { label: 'Kelas Aktif', value: activeClasses, sub: 'berjalan hari ini' },
    ]}
    alertText={supervisionCount > 0 ? `${supervisionCount} supervisi praktikum dijadwalkan` : undefined}
    actions={[{ label: 'Monitoring Jurusan', onClick: onMonitor }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── KABENG ──────────────────────────────────────────────────────────────────

interface KabengSidebarPanelProps {
  activeBengkel?: number;
  availableTools?: number;
  practiceSchedules?: number;
  bengkelName?: string;
  isLoading?: boolean;
  onManage?: () => void;
  className?: string;
}

export const KabengSidebarPanel: React.FC<KabengSidebarPanelProps> = ({
  activeBengkel = 0,
  availableTools = 0,
  practiceSchedules = 0,
  bengkelName = 'Bengkel',
  isLoading,
  onManage,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="stone"
    icon={Hammer}
    roleLabel="Kepala Bengkel"
    panelTitle={`Kabeng ${bengkelName}`}
    statusLabel={activeBengkel > 0 ? '● Bengkel Aktif' : 'Tidak Aktif'}
    statusOk={activeBengkel > 0}
    stats={[
      { label: 'Bengkel Aktif', value: activeBengkel, sub: 'ruang praktik', highlight: activeBengkel > 0 },
      { label: 'Alat Tersedia', value: availableTools, sub: 'unit siap pakai' },
    ]}
    alertText={practiceSchedules > 0 ? `${practiceSchedules} jadwal praktik hari ini` : undefined}
    actions={[{ label: 'Jadwal Bengkel', onClick: onManage }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── BPBK ────────────────────────────────────────────────────────────────────

interface BpbkSidebarPanelProps {
  newCases?: number;
  handledCases?: number;
  criticalStudents?: number;
  isLoading?: boolean;
  onOpenData?: () => void;
  className?: string;
}

export const BpbkSidebarPanel: React.FC<BpbkSidebarPanelProps> = ({
  newCases = 0,
  handledCases = 0,
  criticalStudents = 0,
  isLoading,
  onOpenData,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="pink"
    icon={Heart}
    roleLabel="Staf BK"
    panelTitle="Bimbingan & Konseling"
    statusLabel={criticalStudents > 0 ? `${criticalStudents} Kritis` : 'Terkendali'}
    statusOk={criticalStudents === 0}
    stats={[
      { label: 'Kasus Baru', value: newCases, sub: 'perlu tindakan', highlight: newCases > 0 },
      { label: 'Ditangani', value: handledCases, sub: 'kasus berjalan' },
    ]}
    alertText={criticalStudents > 0 ? `${criticalStudents} siswa dengan poin pelanggaran kritis (>50)` : undefined}
    actions={[{ label: 'Data Konseling Siswa', onClick: onOpenData }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── BKK ─────────────────────────────────────────────────────────────────────

interface BkkSidebarPanelProps {
  alumniPlaced?: number;
  activeJobs?: number;
  pendingApplications?: number;
  isLoading?: boolean;
  onOpenPortal?: () => void;
  className?: string;
}

export const BkkSidebarPanel: React.FC<BkkSidebarPanelProps> = ({
  alumniPlaced = 0,
  activeJobs = 0,
  pendingApplications = 0,
  isLoading,
  onOpenPortal,
  className,
}) => (
  <BaseSidebarPanel
    accentColor="sky"
    icon={Handshake}
    roleLabel="Staf BKK"
    panelTitle="Bursa Kerja Khusus"
    statusLabel={pendingApplications > 0 ? `${pendingApplications} Lamaran` : 'Aktif'}
    statusOk={pendingApplications === 0}
    stats={[
      { label: 'Alumni Tersalur', value: alumniPlaced, sub: 'orang bekerja' },
      { label: 'Lowongan Aktif', value: activeJobs, sub: 'posisi tersedia' },
    ]}
    alertText={pendingApplications > 0 ? `${pendingApplications} lamaran menunggu proses verifikasi` : undefined}
    actions={[{ label: 'Portal Karir BKK', onClick: onOpenPortal }]}
    isLoading={isLoading}
    className={className}
  />
);

// ─── GERBANG ─────────────────────────────────────────────────────────────────

interface GerbangSidebarPanelProps {
  totalScansToday?: number;
  lateStudents?: number;
  gateStatus?: 'AKTIF' | 'NONAKTIF' | 'GANGGUAN';
  isLoading?: boolean;
  onOpenGerbang?: () => void;
  className?: string;
}

export const GerbangSidebarPanel: React.FC<GerbangSidebarPanelProps> = ({
  totalScansToday = 0,
  lateStudents = 0,
  gateStatus = 'AKTIF',
  isLoading,
  onOpenGerbang,
  className,
}) => {
  const statusOk = gateStatus === 'AKTIF';
  const statusLabel = gateStatus === 'AKTIF' ? '● Gate Aktif' : gateStatus === 'GANGGUAN' ? '⚠ Gangguan' : '○ Non-aktif';

  return (
    <BaseSidebarPanel
      accentColor="teal"
      icon={ScanLine}
      roleLabel="Op. Gerbang"
      panelTitle="Scan Kehadiran"
      statusLabel={statusLabel}
      statusOk={statusOk}
      stats={[
        { label: 'Scan Hari Ini', value: totalScansToday, sub: 'total scan masuk' },
        { label: 'Terlambat', value: lateStudents, sub: 'siswa terlambat', highlight: lateStudents > 0 },
      ]}
      alertText={gateStatus === 'GANGGUAN' ? 'Perangkat gerbang mengalami gangguan!' : undefined}
      actions={[{ label: 'Modul Gerbang', onClick: onOpenGerbang }]}
      isLoading={isLoading}
      className={className}
    />
  );
};
