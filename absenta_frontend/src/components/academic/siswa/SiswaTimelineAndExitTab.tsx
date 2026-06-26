import React, { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../../hooks/useAuth';
import { 
  getSiswaTimeline, 
  deleteSiswaDocument, 
  downloadSiswaDocumentFile, 
  downloadSiswaExitBundle,
  type SiswaTimelineItem 
} from '../../../api/academic/siswa.api';
import toast from 'react-hot-toast';
import { Button } from '../../ui/Button';
import { Loader } from '../../ui/Loader';
import { Card, CardContent, Timeline, TimelineItem } from '../../ui';
import { UploadSiswaDocumentModal } from './UploadSiswaDocumentModal';
import { CompleteSiswaExitModal } from './CompleteSiswaExitModal';
import { Download, Plus, LogOut, FileText, Trash2, Calendar, ShieldAlert, Paperclip } from 'lucide-react';
import type { Siswa } from '../../../types/academic';

interface SiswaTimelineAndExitTabProps {
  siswa: Siswa;
}

export const SiswaTimelineAndExitTab: React.FC<SiswaTimelineAndExitTabProps> = React.memo(({ siswa }) => {
  const { can, user } = useAuth();

  
  const [timeline, setTimeline] = useState<SiswaTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  
  // Permissions
  const canManage = can('academic.students.manage') || user?.role?.name === 'SUPERADMIN';
  const canUpload = can('academic.students.manage') || can('affairs.violations.report') || user?.role?.name === 'SUPERADMIN';

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSiswaTimeline(siswa.id);
      setTimeline(data || []);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat linimasa');
    } finally {
      setLoading(false);
    }
  }, [siswa.id]);

  useEffect(() => {
    if (siswa.id) {
      fetchTimeline();
    }
  }, [siswa.id, fetchTimeline]);

  const handleDownloadZip = useCallback(async () => {
    try {
      setDownloadingZip(true);
      const blob = await downloadSiswaExitBundle(siswa.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Exit_Bundle_${siswa.nama_siswa.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Arsip bundel berkas berhasil diunduh.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh berkas bundel');
    } finally {
      setDownloadingZip(false);
    }
  }, [siswa.id, siswa.nama_siswa]);

  const handleDownloadDoc = useCallback(async (docId: string, fileName: string) => {
    try {
      setDownloadingDocId(docId);
      const blob = await downloadSiswaDocumentFile(siswa.id, docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Dokumen berhasil diunduh.');
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengunduh dokumen');
    } finally {
      setDownloadingDocId(null);
    }
  }, [siswa.id]);

  const handleDeleteDoc = useCallback(async (docId: string, judul: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus lampiran '${judul}'?`)) return;
    try {
      setLoading(true);
      const res = await deleteSiswaDocument(siswa.id, docId);
      if (res.success) {
        toast.success('Dokumen berhasil dihapus');
        fetchTimeline();
      } else {
        toast.error(res.message || 'Gagal menghapus dokumen');
      }
    } catch (err: any) {
      toast.error(err.message || 'Koneksi bermasalah');
    } finally {
      setLoading(false);
    }
  }, [siswa.id, fetchTimeline]);

  if (loading && timeline.length === 0) return (
    <div className="py-20 flex flex-col items-center justify-center">
      <Loader className="mb-4" />
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Memproses Linimasa...</p>
    </div>
  );

  if (error) return <p className="p-4 text-xs text-red-600 font-bold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl">{error}</p>;

  return (
    <div className="space-y-6">
      {/* Action Header Card */}
      <Card className="border border-slate-100 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/10">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Status Siswa Saat Ini</span>
            <span className={`text-sm font-black uppercase tracking-tight ${
              siswa.status === 'AKTIF' ? 'text-emerald-600' : 'text-red-500'
            }`}>{siswa.status}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download Exit Bundle */}
            <Button 
              variant="toolbarPrimary" 
              size="toolbar" 
              onClick={handleDownloadZip} 
              disabled={downloadingZip}
            >
              <Download className="w-3.5 h-3.5 mr-2" />
              {downloadingZip ? 'Mengunduh...' : 'Unduh Bundel (ZIP)'}
            </Button>

            {/* Upload and Exit Actions for active students */}
            {siswa.status === 'AKTIF' && (
              <>
                {canUpload && (
                  <Button 
                    variant="toolbarOutline" 
                    size="toolbar" 
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Unggah Lampiran
                  </Button>
                )}
                {canManage && (
                  <Button 
                    variant="danger" 
                    size="toolbar" 
                    onClick={() => setExitModalOpen(true)}
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    Keluarkan Siswa
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timeline view */}
      {timeline.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center opacity-50">
          <FileText className="w-8 h-8 text-slate-300 mb-3" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Belum ada linimasa terdaftar</p>
        </div>
      ) : (
        <Timeline className="px-2">
          {(timeline || []).map((item, index) => {
            const isAkademik = item.tipe === 'STATUS_AKADEMIK';
            const isPelanggaran = item.tipe === 'PELANGGARAN';
            const isDokumen = item.tipe === 'DOKUMEN';

            const status = isAkademik ? 'success' : isPelanggaran ? 'error' : 'info';

            return (
              <TimelineItem
                key={item.id}
                isLast={index === timeline.length - 1}
                status={status}
                icon={isAkademik ? <Calendar size={12} /> : isPelanggaran ? <ShieldAlert size={12} /> : <FileText size={12} />}
                title={
                  <div className="flex-1 flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{item.judul}</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                        {new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-normal">{item.keterangan}</p>
                    
                    {isPelanggaran && item.poin !== undefined && (
                      <span className="text-[10px] font-bold text-red-600 dark:text-red-400">+{item.poin} Poin Pelanggaran</span>
                    )}

                    {isDokumen && item.file_url && (
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadDoc(item.id, item.file_name || 'dokumen.pdf')}
                          disabled={downloadingDocId === item.id}
                          className="flex items-center text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-700 active:scale-[0.98] transition-all"
                        >
                          <Paperclip className="w-3 h-3 mr-1" />
                          {item.file_name || 'Unduh Lampiran'}
                        </button>

                        {canUpload && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(item.id, item.judul)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight pt-1">Oleh: {item.user_name}</span>
                  </div>
                }
              />
            );
          })}
        </Timeline>
      )}

      {/* Modals */}
      <UploadSiswaDocumentModal 
        isOpen={uploadModalOpen} 
        onClose={() => setUploadModalOpen(false)} 
        siswaId={siswa.id} 
        onSuccess={fetchTimeline} 
      />

      <CompleteSiswaExitModal 
        isOpen={exitModalOpen} 
        onClose={() => setExitModalOpen(false)} 
        siswaId={siswa.id} 
        onSuccess={() => {
          fetchTimeline();
          // Reload page to reflect changed status
          window.location.reload();
        }} 
      />
    </div>
  );
});

SiswaTimelineAndExitTab.displayName = 'SiswaTimelineAndExitTab';

