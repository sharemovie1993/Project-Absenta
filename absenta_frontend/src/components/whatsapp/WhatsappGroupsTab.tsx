import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getWaParticipatingGroups, type WaGroupInfo } from '@/api/whatsapp.api';
import { Button, Loader, Alert, AlertTitle, AlertDescription } from '@/components/ui';
import { Users, RefreshCw, Search, ShieldAlert, Copy, Check, MessageSquare, Megaphone } from 'lucide-react';
import { toast } from 'sonner';

interface WhatsappGroupsTabProps {
  localStatus: 'connected' | 'connecting' | 'disconnected' | null;
}

const WhatsappGroupsTab: React.FC<WhatsappGroupsTabProps> = ({ localStatus }) => {
  const [groups, setGroups] = useState<WaGroupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchGroups = useCallback(async (refresh = false) => {
    if (localStatus !== 'connected') {
      setGroups([]);
      setErrorMsg('Gateway WhatsApp belum terhubung. Silakan hubungkan WhatsApp terlebih dahulu di tab Koneksi.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await getWaParticipatingGroups(refresh);
      if (res.success && Array.isArray(res.data)) {
        setGroups(res.data);
      } else {
        setErrorMsg(res.message || 'Gagal memuat daftar grup.');
      }
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Gagal terhubung ke gateway WA untuk mengambil grup.');
    } finally {
      setLoading(false);
    }
  }, [localStatus]);

  useEffect(() => {
    fetchGroups(false);
  }, [fetchGroups]);

  const handleCopyId = (groupId: string) => {
    navigator.clipboard.writeText(groupId);
    setCopiedId(groupId);
    toast.success('ID Grup berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const term = searchTerm.toLowerCase();
    return groups.filter(
      (g) => g.subject.toLowerCase().includes(term) || g.id.toLowerCase().includes(term)
    );
  }, [groups, searchTerm]);

  if (localStatus !== 'connected') {
    return (
      <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-amber-900 dark:text-amber-300">WhatsApp Gateway Belum Terhubung</h3>
        <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md mx-auto">
          Fitur pendeteksi grup WhatsApp memerlukan koneksi WhatsApp yang aktif. Silakan scan QR Code pada tab <strong>Koneksi</strong> untuk menghubungkan nomor WA sekolah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              Daftar Grup WhatsApp Tertaut
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500 text-white">
                {groups.length} Grup
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Menampilkan grup WhatsApp yang diikuti oleh nomor WA sekolah yang sedang aktif
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => fetchGroups(true)}
          disabled={loading}
          variant="outline"
          size="sm"
          className="h-10 px-4 rounded-xl font-bold text-xs gap-2 shrink-0 border-blue-200 dark:border-blue-800 hover:bg-blue-100/50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <Alert className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
          <AlertTitle className="text-red-700 dark:text-red-400 font-bold">Gagal Mengambil Grup</AlertTitle>
          <AlertDescription className="text-xs text-red-600 dark:text-red-300">{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Search Input */}
      {groups.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama grup atau ID grup..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Group List Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader size="md" />
          <span className="ml-3 text-xs font-semibold text-slate-500">Mendeteksi grup WhatsApp...</span>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {searchTerm ? 'Grup Tidak Ditemukan' : 'Tidak Ada Grup WhatsApp'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm
              ? 'Tidak ada grup yang cocok dengan kata kunci pencarian Anda.'
              : 'Nomor WhatsApp ini belum terdaftar di grup WhatsApp manapun.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                      {group.subject.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {group.subject}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>{group.participantsCount} Anggota</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {group.announce && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      <Megaphone className="w-2.5 h-2.5" /> Pengumuman (Admin Only)
                    </span>
                  )}
                  {group.isCommunity && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">
                      Komunitas
                    </span>
                  )}
                </div>
              </div>

              {/* Group ID Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-mono text-slate-400 truncate" title={group.id}>
                    ID: {group.id}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopyId(group.id)}
                  className="h-7 px-2 text-[11px] text-slate-500 hover:text-blue-600 gap-1 rounded-lg"
                >
                  {copiedId === group.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Salin ID</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WhatsappGroupsTab;
