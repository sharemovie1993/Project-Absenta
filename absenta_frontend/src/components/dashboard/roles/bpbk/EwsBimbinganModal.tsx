import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ExternalLink, HeartHandshake, Save } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Badge } from '@/components/ui/Badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { bpbkApi, bpbkQueryKeys, type BpbkDashboardStats } from '@/api/bpbk.api';
import toast from 'react-hot-toast';

export type EwsCriticalStudent = BpbkDashboardStats['criticalStudents'][number];

interface EwsBimbinganModalProps {
  isOpen: boolean;
  student: EwsCriticalStudent | null;
  onClose: () => void;
  onOpenFullProfile?: (siswaId: string) => void;
}

export const EwsBimbinganModal: React.FC<EwsBimbinganModalProps> = ({
  isOpen,
  student,
  onClose,
  onOpenFullProfile,
}) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().split('T')[0]);
  const [tipe, setTipe] = useState<'INDIVIDU' | 'KELOMPOK' | 'KARIR'>('INDIVIDU');
  const [kasusBkId, setKasusBkId] = useState('');
  const [masalah, setMasalah] = useState('');
  const [solusi, setSolusi] = useState('');
  const [status, setStatus] = useState<'PROSES' | 'SELESAI'>('PROSES');
  const [visibility, setVisibility] = useState<'SENSITIVE' | 'LIMITED' | 'PUBLIC'>('SENSITIVE');

  const { data: studentCasesRes } = useQuery({
    queryKey: ['bpbk-cases-by-student', student?.id],
    queryFn: () => bpbkApi.getKasusBK({ siswa_id: student!.id, limit: 50 }),
    enabled: Boolean(isOpen && student?.id),
    staleTime: 60 * 1000,
  });

  const studentCases = useMemo(() => {
    const raw = studentCasesRes?.data;
    return Array.isArray(raw) ? raw : raw?.list || [];
  }, [studentCasesRes]);

  useEffect(() => {
    if (!isOpen || !student) return;
    setTanggal(new Date().toISOString().split('T')[0]);
    setTipe('INDIVIDU');
    setKasusBkId('');
    setMasalah(
      `Tindak lanjut EWS (${student.riskLevel}, Skor ${student.riskScore}): Pelanggaran +${student.violations}, Alpa ${student.alpaCount}x dalam 30 hari terakhir.`
    );
    setSolusi('');
    setStatus('PROSES');
    setVisibility('SENSITIVE');
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masalah.trim()) {
      toast.error('Harap isi uraian masalah / fokus bimbingan.');
      return;
    }

    setSaving(true);
    try {
      await bpbkApi.createKonseling({
        siswa_id: student.id,
        tanggal,
        tipe,
        masalah: masalah.trim(),
        solusi: solusi.trim() || undefined,
        status,
        visibility,
        kasus_bk_id: kasusBkId || undefined,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: bpbkQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ['bpbk-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['bpbk-cases-list'] }),
        queryClient.invalidateQueries({ queryKey: ['bpbk-cases-by-student', student.id] }),
        queryClient.invalidateQueries({ queryKey: ['ews-risk-students'] }),
        queryClient.invalidateQueries({ queryKey: ['konseling-history'] }),
      ]);

      toast.success(`Sesi bimbingan untuk ${student.nama_siswa} berhasil dicatat.`);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal mencatat sesi bimbingan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tindak Lanjut Bimbingan Siswa (EWS)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Ringkasan EWS Siswa */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50/80 via-amber-50/60 to-indigo-50/60 dark:from-rose-950/30 dark:to-indigo-950/30 border border-rose-200/80 dark:border-rose-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {student.nama_siswa}
              </span>
              <Badge
                variant={
                  student.riskLevel === 'HIGH'
                    ? 'error'
                    : student.riskLevel === 'MEDIUM'
                    ? 'warning'
                    : 'success'
                }
                className="text-[9px] font-bold uppercase"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                {student.riskLevel} ({student.riskScore})
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              NIS: <span className="font-mono font-semibold">{student.nis}</span> • Kelas:{' '}
              <span className="font-semibold">{student.kelas}</span> • Pelanggaran:{' '}
              <span className="text-rose-600 font-bold">+{student.violations}</span> • Alpa:{' '}
              <span className="font-bold text-amber-700 dark:text-amber-400">{student.alpaCount}x</span>
            </p>
          </div>

          {onOpenFullProfile && (
            <Button
              type="button"
              variant="toolbarOutline"
              size="toolbar"
              onClick={() => onOpenFullProfile(student.id)}
              className="shrink-0 text-xs bg-white/90 hover:bg-white border-rose-200"
            >
              <span>Riwayat Kasus</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-sky-50/45 dark:bg-sky-950/20 border border-sky-200/70">
          <div className="space-y-1.5">
            <Label htmlFor="ews-tanggal" className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Tanggal Sesi
            </Label>
            <Input
              id="ews-tanggal"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ews-tipe" className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-300">
              Tipe Sesi Konseling
            </Label>
            <SearchableSelect
              id="ews-tipe"
              options={[
                { value: 'INDIVIDU', label: 'Konseling Individu' },
                { value: 'KELOMPOK', label: 'Konseling Kelompok' },
                { value: 'KARIR', label: 'Konseling Karir' },
              ]}
              value={tipe}
              onValueChange={(val) => setTipe((val as 'INDIVIDU' | 'KELOMPOK' | 'KARIR') || 'INDIVIDU')}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-sky-200/80 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70">
          <div className="space-y-1.5">
            <Label htmlFor="ews-kasus" className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Hubungkan dengan Kasus BK
            </Label>
            <SearchableSelect
              id="ews-kasus"
              options={[
                { value: '', label: '-- Tidak Dihubungkan --' },
                ...studentCases.map((c: any) => ({
                  value: c.id,
                  label: `${c.judul} (${c.status})`,
                })),
              ]}
              value={kasusBkId}
              onValueChange={(val) => setKasusBkId(val || '')}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-indigo-200/80 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ews-status" className="text-[11px] font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
              Status Pendampingan
            </Label>
            <SearchableSelect
              id="ews-status"
              options={[
                { value: 'PROSES', label: 'Pendampingan Berjalan (PROSES)' },
                { value: 'SELESAI', label: 'Selesai (Tuntas)' },
              ]}
              value={status}
              onValueChange={(val) => setStatus((val as 'PROSES' | 'SELESAI') || 'PROSES')}
              className="h-10 text-xs bg-white dark:bg-slate-900 border-indigo-200/80 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-1.5 p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80">
          <Label htmlFor="ews-masalah" className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
            Fokus Bimbingan / Masalah
          </Label>
          <textarea
            id="ews-masalah"
            rows={3}
            value={masalah}
            onChange={(e) => setMasalah(e.target.value)}
            placeholder="Catat hasil observasi atau keluhan siswa..."
            className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-amber-200/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
        </div>

        <div className="space-y-1.5 p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80">
          <Label htmlFor="ews-solusi" className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
            Solusi / Rencana Tindak Lanjut
          </Label>
          <textarea
            id="ews-solusi"
            rows={2}
            value={solusi}
            onChange={(e) => setSolusi(e.target.value)}
            placeholder="Catat komitmen siswa, kesepakatan bimbingan, atau rencana tindak lanjut..."
            className="w-full p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ews-visibilitas" className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Level Visibilitas
          </Label>
          <SearchableSelect
            id="ews-visibilitas"
            options={[
              { value: 'SENSITIVE', label: 'Sensitif (Hanya Guru BK)' },
              { value: 'LIMITED', label: 'Terbatas (BK + Wali Kelas)' },
              { value: 'PUBLIC', label: 'Publik (Seluruh Guru)' },
            ]}
            value={visibility}
            onValueChange={(val) => setVisibility((val as 'SENSITIVE' | 'LIMITED' | 'PUBLIC') || 'SENSITIVE')}
            className="h-10 text-xs rounded-xl"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="toolbarOutline" size="toolbar" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" variant="toolbarPrimary" size="toolbar" disabled={saving} className="px-5">
            {saving ? (
              <span>Menyimpan...</span>
            ) : (
              <>
                <HeartHandshake className="w-3.5 h-3.5 mr-1.5" />
                <span>Simpan Sesi Bimbingan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
