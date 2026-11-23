import React from 'react';
import { 
  ShieldCheck, 
  Award, 
  Crown, 
  User, 
  Users, 
  Plus, 
  ChevronDown,
  Building,
  Flag,
  FileCheck,
  Zap,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { 
  KetarunaanPanitiaMember, 
  KetarunaanExOfficio 
} from '@/api/kesiswaan/programKetarunaan.api';

interface KetarunaanOrgChartProps {
  panitiaList: KetarunaanPanitiaMember[];
  exOfficio: {
    penanggung_jawab: KetarunaanExOfficio | null;
    pengarah: KetarunaanExOfficio | null;
  };
  onOpenAddModal: () => void;
  canManage?: boolean;
}

interface OrgNodeCardProps {
  titleBadge: string;
  badgeColor: string;
  name?: string | null;
  nip?: string | null;
  subLabel?: string | null;
  icon?: React.ReactNode;
  isLeader?: boolean;
  isExOfficio?: boolean;
  onAdd?: () => void;
  emptyText?: string;
}

const OrgNodeCard: React.FC<OrgNodeCardProps> = ({
  titleBadge,
  badgeColor,
  name,
  nip,
  subLabel,
  icon,
  isLeader = false,
  isExOfficio = false,
  onAdd,
  emptyText = 'Belum Diploting',
}) => {
  if (!name) {
    return (
      <div className="w-56 p-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-center space-y-1.5 shadow-2xs">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${badgeColor}`}>
          {titleBadge}
        </span>
        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{emptyText}</p>
        {onAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAdd}
            className="text-[10px] h-6 px-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50"
          >
            <Plus size={11} className="mr-0.5" />
            Ploting
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`w-60 sm:w-64 p-3.5 rounded-2xl border transition-all shadow-2xs text-left ${
        isLeader
          ? 'bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-white dark:from-amber-950/40 dark:to-slate-900 border-amber-300 dark:border-amber-700/60 ring-2 ring-amber-400/20 shadow-md'
          : isExOfficio
          ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}>
          {titleBadge}
        </span>
        {icon && <span className="text-sm shrink-0">{icon}</span>}
      </div>

      <div className="flex items-start gap-2.5">
        <div
          className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center text-xs shrink-0 text-white shadow-2xs ${
            isLeader
              ? 'bg-gradient-to-br from-amber-500 to-rose-600'
              : isExOfficio
              ? 'bg-gradient-to-br from-slate-600 to-slate-800'
              : 'bg-gradient-to-br from-rose-500 to-pink-600'
          }`}
        >
          {name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
            {name}
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            NIP: {nip && nip !== '-' ? nip : 'Non-PNS / Staf'}
          </p>
          {subLabel && (
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate pt-0.5">
              {subLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const KetarunaanOrgChart: React.FC<KetarunaanOrgChartProps> = ({
  panitiaList,
  exOfficio,
  onOpenAddModal,
  canManage = true,
}) => {
  // Pengelompokan Personel
  const ketua = panitiaList.find(p => p.is_leader || p.assignment_flag === 'KETUA');
  const wakilKetua = panitiaList.find(p => p.assignment_flag === 'WAKIL_KETUA');
  const sekretarisList = panitiaList.filter(p => p.assignment_flag === 'SEKRETARIS');
  const bendaharaList = panitiaList.filter(p => p.assignment_flag === 'BENDAHARA');
  const korlapList = panitiaList.filter(p => p.assignment_flag === 'KORLAP');
  const disiplinList = panitiaList.filter(p => p.assignment_flag === 'SEKSI_DISIPLIN');
  const pengujiList = panitiaList.filter(p => p.assignment_flag === 'PENGUJI_FISIK');
  const poskoList = panitiaList.filter(p => p.assignment_flag === 'PEMBINA_POS' || (!p.is_leader && !['KETUA', 'WAKIL_KETUA', 'SEKRETARIS', 'BENDAHARA', 'KORLAP', 'SEKSI_DISIPLIN', 'PENGUJI_FISIK'].includes(p.assignment_flag)));

  return (
    <div className="p-4 sm:p-6 rounded-3xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800 space-y-8 overflow-x-auto no-scrollbar">
      {/* ── Top Header Notice ── */}
      <div className="text-center max-w-lg mx-auto space-y-1">
        <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
          <ShieldCheck size={18} className="text-rose-600" />
          <span>Bagan Struktur Organisasi Korps Ketarunaan</span>
        </h4>
        <p className="text-xs text-slate-500">
          Hierarki komando pembinaan kedisiplinan taruna, apel upacara & penilaian 4 pilar
        </p>
      </div>

      <div className="flex flex-col items-center space-y-8 min-w-[700px]">
        {/* ── LEVEL 1: EX-OFFICIO (Penanggung Jawab & Pengarah) ── */}
        <div className="flex items-center justify-center gap-6 sm:gap-12 relative">
          {/* Penanggung Jawab */}
          <OrgNodeCard
            titleBadge="Penanggung Jawab"
            badgeColor="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            name={exOfficio.penanggung_jawab?.nama}
            nip={exOfficio.penanggung_jawab?.nip}
            subLabel="Kepala Sekolah"
            icon="🏛️"
            isExOfficio
            emptyText="Kepala Sekolah Terpilih"
          />

          {/* Pengarah */}
          <OrgNodeCard
            titleBadge="Pengarah & Penasihat"
            badgeColor="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
            name={exOfficio.pengarah?.nama}
            nip={exOfficio.pengarah?.nip}
            subLabel="Wakil Kepala Sekolah Bidang Kesiswaan"
            icon="🎓"
            isExOfficio
            emptyText="Waka Kesiswaan Terpilih"
          />
        </div>

        {/* Connector Line 1 */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

        {/* ── LEVEL 2: KETUA PEMBINA TARUNA ── */}
        <div className="flex flex-col items-center">
          <OrgNodeCard
            titleBadge="Ketua Pelaksana Ketarunaan"
            badgeColor="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 font-extrabold"
            name={ketua?.nama_guru}
            nip={ketua?.nip}
            subLabel={ketua?.custom_title || 'Ketua Pembina Taruna'}
            icon="👑"
            isLeader
            onAdd={canManage ? onOpenAddModal : undefined}
            emptyText="Belum Ada Ketua Pembina"
          />
        </div>

        {/* Connector Line 2 */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

        {/* ── LEVEL 3: WAKIL KETUA, SEKRETARIS & BENDAHARA ── */}
        <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-6">
          {/* Wakil Ketua */}
          <OrgNodeCard
            titleBadge="Wakil Ketua / Operasional"
            badgeColor="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
            name={wakilKetua?.nama_guru}
            nip={wakilKetua?.nip}
            subLabel={wakilKetua?.custom_title}
            icon="⭐"
            onAdd={canManage ? onOpenAddModal : undefined}
            emptyText="Belum Ada Wakil Ketua"
          />

          {/* Sekretaris */}
          <OrgNodeCard
            titleBadge="Sekretaris & Administrasi"
            badgeColor="bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
            name={sekretarisList[0]?.nama_guru}
            nip={sekretarisList[0]?.nip}
            subLabel={sekretarisList[0]?.custom_title}
            icon="📝"
            onAdd={canManage ? onOpenAddModal : undefined}
            emptyText="Belum Ada Sekretaris"
          />

          {/* Bendahara */}
          <OrgNodeCard
            titleBadge="Bendahara & Logistik"
            badgeColor="bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
            name={bendaharaList[0]?.nama_guru}
            nip={bendaharaList[0]?.nip}
            subLabel={bendaharaList[0]?.custom_title}
            icon="💰"
            onAdd={canManage ? onOpenAddModal : undefined}
            emptyText="Belum Ada Bendahara"
          />
        </div>

        {/* Connector Line 3 */}
        <div className="w-0.5 h-6 bg-slate-300 dark:bg-slate-700" />

        {/* ── LEVEL 4: SEKSI-SEKSI LAPANGAN & PENGUJI ── */}
        <div className="w-full space-y-4">
          <div className="text-center">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              Seksi Lapangan & Penguji Kesamaptaan Taruna
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Korlap Pelatih PBB */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>📢</span>
                  <span>Pelatih PBB & Korlap</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                  {korlapList.length}
                </span>
              </div>
              <div className="space-y-2">
                {korlapList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">Belum ada pelatih</p>
                ) : (
                  korlapList.map(p => (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.nama_guru}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {p.nip || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 2. Seksi Kedisiplinan & Tatib */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>🛡️</span>
                  <span>Kedisiplinan & Tatib</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                  {disiplinList.length}
                </span>
              </div>
              <div className="space-y-2">
                {disiplinList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">Belum ada seksi tatib</p>
                ) : (
                  disiplinList.map(p => (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.nama_guru}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {p.nip || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Penguji Fisik & Kesamaptaan */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>🏃</span>
                  <span>Penguji Kesamaptaan</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                  {pengujiList.length}
                </span>
              </div>
              <div className="space-y-2">
                {pengujiList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">Belum ada penguji fisik</p>
                ) : (
                  pengujiList.map(p => (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.nama_guru}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {p.nip || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Pembina Pos Lapangan */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <span>🚩</span>
                  <span>Pembina Posko</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-rose-600 bg-rose-50 dark:bg-rose-950 px-1.5 py-0.5 rounded">
                  {poskoList.length}
                </span>
              </div>
              <div className="space-y-2">
                {poskoList.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic text-center py-2">Belum ada pembina posko</p>
                ) : (
                  poskoList.map(p => (
                    <div key={p.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.nama_guru}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {p.nip || '-'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
