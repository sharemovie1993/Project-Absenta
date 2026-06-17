import React from 'react';
import { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  ShieldCheck, 
  RefreshCw, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Plus, 
  BookOpen,
  Search,
  Users,
  AlertTriangle,
  Clock,
  UserCheck,
  ArrowRight,
  ChevronRight,
  Filter,
  ChevronDown
} from 'lucide-react';
import { 
  SectionCard, 
  TabsContent, 
  Table, 
  Button, 
  Input, 
  Badge, 
  AnalyticsCard,
  SimpleFormField 
} from '../ui';
import { format, parseISO, isValid } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { renderDailyTimeline } from '../../utils/hubinUtils';
import { HubinGoogleDriveUploader } from './HubinGoogleDriveUploader';
import { PklStatusBadge } from './PklStatusBadge';
import type { AbsensiPkl } from '../../api/hubin.api';

import { HubinAbsensiStatus } from '../../constants/HubinConstants';

interface HubinManagementViewProps {
  rawPenempatan: any[];
  isLoading: boolean;
  onVerify: (id: string) => void;
  onQuickAddForId: (absensi: AbsensiPkl, text: string) => void;
  onEditLogbook: (absensi: AbsensiPkl) => void;
  quickAddTexts: Record<string, string>;
  setQuickAddTexts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  settingsData: any;
  updateSettingsMutation: any;
  renderActivityText: (str: string | undefined) => React.ReactNode;
  getDriveThumbnailUrl: (url: string | undefined) => string | null;
  isGlobalHubin?: boolean;
}

export const HubinManagementView: React.FC<HubinManagementViewProps> = ({
  rawPenempatan,
  isLoading,
  onVerify,
  onQuickAddForId,
  onEditLogbook,
  quickAddTexts,
  setQuickAddTexts,
  settingsData,
  updateSettingsMutation,
  renderActivityText,
  getDriveThumbnailUrl,
  isGlobalHubin = false
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const needsVerificationCount = rawPenempatan.reduce((acc: number, curr: any) => acc + (curr.AbsensiPkl?.[0]?.is_verified === false ? 1 : 0), 0);
  const attendedTodayCount = rawPenempatan.filter((p: any) => {
    const lastAbs = p.AbsensiPkl?.[0];
    if (!lastAbs) return false;
    const today = new Date().toISOString().split('T')[0];
    return lastAbs.tanggal.startsWith(today);
  }).length;

  return (
    <>
    <TabsContent value="management" className="mt-0">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <AnalyticsCard 
          title="Total Siswa PKL"
          value={rawPenempatan.length}
          icon={<Users size={20} />}
          gradient="from-indigo-600 to-violet-700"
          className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-none shadow-md shadow-indigo-100 dark:shadow-none"
          variant="ghost"
          subtitle="DATABASE"
          compact
        />

        <AnalyticsCard 
          title="Perlu Verifikasi"
          value={needsVerificationCount}
          icon={<AlertTriangle size={20} className="text-amber-500" />}
          gradient="from-amber-400 to-amber-600"
          className="shadow-sm border-slate-100 dark:border-slate-800"
          compact
        />

        <AnalyticsCard 
          title="Sudah Hadir"
          value={attendedTodayCount}
          icon={<ShieldCheck size={20} className="text-emerald-500" />}
          gradient="from-emerald-400 to-emerald-600"
          className="shadow-sm border-slate-100 dark:border-slate-800"
          compact
        />
      </div>

      <SectionCard 
        title="Daftar Siswa & Monitoring Jurnal" 
        icon={BookOpen}
        fullWidth
        noPadding
        actions={
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input 
                placeholder="Cari nama siswa..." 
                className="pl-9 h-9 w-64 rounded-xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-xs font-medium"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest border-slate-100 dark:border-slate-800">
              <Filter size={14} /> Filter
            </Button>
          </div>
        }
      >
        <div className="w-full p-4 md:p-8 space-y-6">
          {rawPenempatan.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center w-full">
              <div className="w-20 h-20 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-800">
                <Users size={32} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Belum Ada Siswa Bimbingan</h3>
              <p className="text-[11px] text-slate-450 font-medium mt-1 max-w-[240px]">Data siswa akan muncul secara otomatis jika Anda telah diploting sebagai Pembimbing.</p>
            </div>
          ) : (
            <div className="w-full space-y-4">
              {rawPenempatan.map((p: any, idx: number) => {
                const lastAbsensi = p.AbsensiPkl?.[0];
                const isExpanded = expandedRows[p.id];
                const needsVerification = lastAbsensi && !lastAbsensi.is_verified;

                return (
                  <div key={p.id || idx} className={`group relative bg-white dark:bg-slate-900/40 rounded-xl border transition-all duration-500 overflow-hidden w-full ${
                    isExpanded 
                      ? 'border-indigo-200 dark:border-indigo-900/50 shadow-lg shadow-indigo-500/5' 
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm'
                  }`}>
                    {/* Compact Header (Always Visible) */}
                    <div className="flex flex-col lg:flex-row lg:items-center p-3 lg:p-3.5 gap-4 lg:gap-10 w-full">
                      {/* Student Info Group */}
                      <div className="flex items-center gap-3 lg:w-[280px] shrink-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-inner shrink-0 group-hover:scale-105 transition-all duration-500 ${
                          needsVerification 
                            ? 'bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 dark:from-amber-900/20 dark:to-amber-950/20 dark:text-amber-400'
                            : 'bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-500 dark:from-slate-800 dark:to-slate-900 dark:text-indigo-400'
                        }`}>
                          {(p.Siswa?.nama_siswa || p.Siswa?.full_name || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 uppercase text-[12px] tracking-tight leading-none truncate mb-1.5">
                            {p.Siswa?.nama_siswa || p.Siswa?.full_name}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50/50 dark:bg-indigo-950/30 px-1.5 py-0.5 rounded-md border border-indigo-100/50 dark:border-indigo-900/30">
                              {p.Siswa?.Kelas?.nama_kelas || 'Umum'}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">
                              {p.Siswa?.nis || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Grid (Partner & Status) */}
                      <div className="flex-1 flex flex-col lg:flex-row items-start lg:items-center gap-4 lg:gap-12 min-w-0">
                        {/* Partner Info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 w-full">
                          <div className="p-2 bg-indigo-50/50 dark:bg-slate-800/50 rounded-lg text-indigo-500 dark:text-indigo-400 shrink-0">
                            <Building2 size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Penempatan</p>
                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight truncate">
                              {p.Mitra?.nama || <span className="text-slate-300 italic font-normal text-[9px]">Belum Ditempatkan</span>}
                            </p>
                          </div>
                        </div>

                        {/* Status Summary */}
                        <div className="flex items-center gap-2.5 min-w-0 shrink-0 lg:w-[220px]">
                          <div className="p-2 bg-emerald-50/50 dark:bg-slate-800/50 rounded-lg text-emerald-500 dark:text-emerald-400 shrink-0">
                            <UserCheck size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">Presensi</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {lastAbsensi ? (
                                <>
                                  <PklStatusBadge status={lastAbsensi.status || 'HADIR'} className="h-4 text-[7px] px-1.5" />
                                  {lastAbsensi.is_outside_radius && (
                                    <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 rounded-full uppercase font-black text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900/30">Dinas Luar</Badge>
                                  )}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-[7px] py-0 px-1.5 h-4 rounded-full uppercase font-black text-slate-400 border-slate-200 bg-slate-50/50">BELUM ABSEN</Badge>
                              )}
                              {lastAbsensi?.is_verified && (
                                <div className="flex items-center gap-1 text-[7px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50/50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full border border-emerald-100/50">
                                  <ShieldCheck size={9} /> Verified
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Group */}
                      <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleRow(p.id)}
                          className={`h-8 px-3.5 rounded-lg gap-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30' 
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {isExpanded ? 'Tutup' : 'Aktivitas'}
                          <div className={`p-0.5 rounded transition-all duration-500 ${isExpanded ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            <ChevronDown size={10} />
                          </div>
                        </Button>

                        {needsVerification && (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); onVerify(lastAbsensi.id); }}
                            className="h-8 px-4 rounded-lg text-[9px] font-black uppercase tracking-[0.12em] bg-gradient-to-br from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white shadow-md shadow-indigo-200/50 dark:shadow-none transition-all active:scale-95 gap-1.5 group/btn"
                          >
                            <ShieldCheck size={12} className="group-hover/btn:scale-110 transition-transform" /> 
                            Verifikasi
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expandable Content */}
                    {isExpanded && (
                      <div className="border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-950/5 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex flex-col lg:flex-row p-4 lg:p-5 gap-6">
                          {/* Timeline Section */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-4">
                              <div className="space-y-0.5">
                                <h5 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                  <Clock size={12} className="text-indigo-500" /> Jurnal & Riwayat
                                </h5>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Monitoring harian real-time</p>
                              </div>
                              {lastAbsensi && (
                                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800 shadow-sm">
                                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                  <span className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                    {format(parseISO(lastAbsensi.tanggal), 'EEEE, dd MMMM yyyy', { locale: localeID })}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900/80 p-4 lg:p-5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner relative overflow-hidden group/timeline">
                              {lastAbsensi ? (
                                renderDailyTimeline(lastAbsensi)
                              ) : (
                                <div className="py-10 flex flex-col items-center justify-center text-slate-300">
                                  <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                                    <Clock size={24} className="opacity-20" />
                                  </div>
                                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-center">Data belum tersedia</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Quick Interaction Section */}
                          <div className="lg:w-[300px] space-y-4">
                            <div className="space-y-0.5">
                              <h5 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-2">
                                <Edit size={12} className="text-indigo-500" /> Instruksi
                              </h5>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Feedback jurnal</p>
                            </div>
                            
                            <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Feedback</p>
                                  <Badge variant="outline" className="text-[7px] font-black text-indigo-500 border-indigo-100 bg-indigo-50/30 px-1 h-4">Quick Note</Badge>
                                </div>
                                <div className="relative group/input">
                                  <textarea 
                                    placeholder="Feedback jurnal..."
                                    value={quickAddTexts[lastAbsensi?.id || ''] || ''}
                                    onChange={(e) => setQuickAddTexts(prev => ({ ...prev, [lastAbsensi?.id || '']: e.target.value }))}
                                    className="w-full p-3 h-24 rounded-lg border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[11px] font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-300 focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-200 transition-all resize-none outline-none shadow-inner"
                                  />
                                </div>
                                <Button 
                                  size="sm"
                                  disabled={!lastAbsensi || !quickAddTexts[lastAbsensi?.id || '']?.trim()}
                                  onClick={() => {
                                    onQuickAddForId(lastAbsensi, quickAddTexts[lastAbsensi.id]);
                                    setQuickAddTexts(prev => ({ ...prev, [lastAbsensi.id]: '' }));
                                  }}
                                  className="w-full h-9 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-900 hover:bg-black text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
                                >
                                  Kirim Feedback <ArrowRight size={12} />
                                </Button>
                              </div>

                              <div className="pt-3 border-t border-slate-50 dark:border-slate-800">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => lastAbsensi && onEditLogbook(lastAbsensi)}
                                  className="w-full h-9 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-100"
                                >
                                  <ExternalLink size={12} /> Editor Penuh
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Status Indicator (Left Border Style) */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-500 ${
                      needsVerification ? 'bg-amber-500' : isExpanded ? 'bg-indigo-600' : 'bg-transparent'
                    }`} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </TabsContent>

      {isGlobalHubin && (
        <TabsContent value="settings" className="mt-0">
          <SectionCard title="Pengaturan Integrasi Google Drive" icon={RefreshCw}>
            <div className="space-y-8 p-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900/40 dark:to-indigo-950/20 p-6 rounded-xl border border-blue-100 dark:border-indigo-900/30 flex gap-5 text-blue-800 dark:text-indigo-350 shadow-sm leading-relaxed">
                <div className="shrink-0 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm h-fit">
                  <RefreshCw className="text-indigo-500" size={24} />
                </div>
                <div className="text-xs space-y-1.5 leading-relaxed">
                  <p className="font-black text-sm text-indigo-900 dark:text-indigo-350 uppercase tracking-tight">Koneksi Google Drive PKL</p>
                  <p className="font-medium">Atur folder utama tempat seluruh foto bukti presensi dan jurnal siswa akan disimpan secara otomatis.</p>
                  <div className="pt-2 flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-blue-100/50 dark:border-slate-700 font-bold text-[9px]">SaaS Ready</span>
                    <span className="px-2 py-1 bg-white/50 dark:bg-slate-800/50 rounded-lg border border-blue-100/50 dark:border-slate-700 font-bold text-[9px]">Automatic Folder Creation</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <SimpleFormField 
                  label="Mode Integrasi Drive" 
                  description="Pilih bagaimana sistem menangani upload file."
                >
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => updateSettingsMutation.mutate({ ...settingsData, driveMode: 'direct' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${settingsData.driveMode === 'direct' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <ShieldCheck className={settingsData.driveMode === 'direct' ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                        {settingsData.driveMode === 'direct' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">Google Drive API</p>
                      <p className="text-[9px] text-slate-500 font-medium mt-1">Upload langsung ke akun institusi Anda.</p>
                    </button>
                    <button 
                      onClick={() => updateSettingsMutation.mutate({ ...settingsData, driveMode: 'simulated' })}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${settingsData.driveMode === 'simulated' ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <RefreshCw className={settingsData.driveMode === 'simulated' ? 'text-indigo-600' : 'text-slate-400'} size={20} />
                        {settingsData.driveMode === 'simulated' && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />}
                      </div>
                      <p className="text-[11px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">Simulasi Cloud</p>
                      <p className="text-[9px] text-slate-500 font-medium mt-1">Gunakan penyimpanan cloud Absenta (Default).</p>
                    </button>
                  </div>
                </SimpleFormField>

                <div className="space-y-4">
                  <SimpleFormField 
                    label="Tautan Folder Root (Google Drive)" 
                    description="Salin URL folder Google Drive tempat penyimpanan pusat."
                    required
                  >
                    <Input 
                      placeholder="https://drive.google.com/drive/folders/..."
                      value={settingsData.folderUrl || ''}
                      onChange={(e) => updateSettingsMutation.mutate({ ...settingsData, folderUrl: e.target.value })}
                      className="rounded-xl border-slate-200 dark:border-slate-800"
                    />
                  </SimpleFormField>
                  
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Panduan Folder</h5>
                    <ul className="text-[9px] text-slate-500 space-y-1.5 font-medium list-disc list-inside">
                      <li>Sistem akan membuat sub-folder otomatis per Kelas.</li>
                      <li>Pastikan folder Root memiliki izin "Editor" untuk akun sistem.</li>
                      <li>Siswa tidak perlu memiliki akun Google untuk upload.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>
      )}
    </>
  );
};
