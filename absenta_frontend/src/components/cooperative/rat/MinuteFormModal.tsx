import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Input, Label, Textarea } from '../../ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axiosInstance';
import toast from 'react-hot-toast';
import { Clock, MessageSquare, User, Lightbulb, AlertTriangle, CheckCircle2, Megaphone, Scroll, Scale } from 'lucide-react';
import type { CoopAgendaItem, CoopMeetingMinuteItem } from '../../../pages/cooperative/RatMeetingPage';
import { getAgendaMinuteRequirement } from './ratAgendaClassifier';

interface MinuteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  agendas: CoopAgendaItem[];
  initialAgendaId?: string | null;
  editingMinute?: CoopMeetingMinuteItem | null;
  onSuccess?: () => void;
}

export const MinuteFormModal: React.FC<MinuteFormModalProps> = React.memo(({
  isOpen,
  onClose,
  meetingId,
  agendas = [],
  initialAgendaId,
  editingMinute,
  onSuccess
}) => {
  const queryClient = useQueryClient();

  const [agendaId, setAgendaId] = useState<string>('');
  const [category, setCategory] = useState<string>('DISCUSSION');
  const [timeRecord, setTimeRecord] = useState<string>('');
  const [speakerName, setSpeakerName] = useState<string>('');
  const [speakerRole, setSpeakerRole] = useState<string>('Anggota');
  const [topic, setTopic] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [actionItem, setActionItem] = useState<string>('');
  const [isPublic, setIsPublic] = useState<boolean>(true);

  // Selected Agenda Requirement
  const selectedAgenda = useMemo(() => {
    return agendas.find((ag) => ag.id === agendaId);
  }, [agendas, agendaId]);

  const selectedAgendaReq = useMemo(() => {
    return selectedAgenda ? getAgendaMinuteRequirement(selectedAgenda.title) : null;
  }, [selectedAgenda]);

  // Initialize or reset form on open
  useEffect(() => {
    if (editingMinute) {
      setAgendaId(editingMinute.agendaId || '');
      setCategory(editingMinute.category || 'DISCUSSION');
      setTimeRecord(editingMinute.timeRecord || '');
      setSpeakerName(editingMinute.speakerName || '');
      setSpeakerRole(editingMinute.speakerRole || 'Anggota');
      setTopic(editingMinute.topic || '');
      setContent(editingMinute.content || '');
      setActionItem(editingMinute.actionItem || '');
      setIsPublic(editingMinute.isPublic !== undefined ? editingMinute.isPublic : true);
    } else {
      const targetAgendaId = initialAgendaId || '';
      setAgendaId(targetAgendaId);
      const matched = agendas.find((ag) => ag.id === targetAgendaId);
      const req = matched ? getAgendaMinuteRequirement(matched.title) : null;
      setCategory(req ? req.defaultCategory : 'DISCUSSION');
      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      setTimeRecord(nowStr);
      setSpeakerName('');
      setSpeakerRole('Anggota');
      setTopic('');
      setContent('');
      setActionItem('');
      setIsPublic(true);
    }
  }, [editingMinute, initialAgendaId, isOpen, agendas]);

  // Mutation Save Minute
  const saveMinuteMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        agendaId: agendaId ? agendaId : null,
        category,
        timeRecord,
        speakerName: speakerName.trim() || null,
        speakerRole: speakerRole.trim() || 'Anggota',
        topic: topic.trim(),
        content: content.trim(),
        actionItem: actionItem.trim() || null,
        isPublic,
      };

      if (editingMinute) {
        const res = await api.put(`/cooperative/rat/minutes/${editingMinute.id}`, payload);
        return res.data;
      } else {
        const res = await api.post(`/cooperative/rat/${meetingId}/minutes`, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coop-rat-minutes', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['coop-rat-proceedings', meetingId] });
      toast.success(editingMinute ? 'Notulensi berhasil diperbarui' : 'Catatan notulensi berhasil disimpan');
      onSuccess?.();
      onClose();
    },
    onError: (err: unknown) => {
      const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Gagal menyimpan notulensi';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error('Topik bahasan wajib diisi');
      return;
    }
    if (!content.trim()) {
      toast.error('Isi catatan notulensi wajib diisi');
      return;
    }
    saveMinuteMutation.mutate();
  };

  const categories = [
    { id: 'DISCUSSION', label: 'Tanya Jawab & Diskusi', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60' },
    { id: 'SUGGESTION', label: 'Usulan & Saran', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60' },
    { id: 'OBJECTION', label: 'Interupsi & Sanggahan', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60' },
    { id: 'CONCLUSION', label: 'Kesepakatan / Mufakat', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60' },
    { id: 'ANNOUNCEMENT', label: 'Pengumuman Presidium', icon: Megaphone, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60' },
    { id: 'OPENING', label: 'Protokoler / Seremonial', icon: Scroll, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800' },
  ];

  const roles = ['Anggota', 'Pengurus', 'Pengawas', 'Presidium', 'Dinas Koperasi', 'Narasumber'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingMinute ? 'Sunting Butir Notulensi Sidang' : 'Catat Notulensi / Dinamika Sidang RAT'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Agenda Selector */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Terkait Butir Acara Sidang (Opsional)
          </Label>
          <select
            value={agendaId}
            onChange={(e) => {
              const val = e.target.value;
              setAgendaId(val);
              if (val && !editingMinute) {
                const matched = agendas.find((ag) => ag.id === val);
                if (matched) {
                  const req = getAgendaMinuteRequirement(matched.title);
                  setCategory(req.defaultCategory);
                }
              }
            }}
            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Notulensi Umum / Dinamika Pleno Terbuka --</option>
            {agendas.map((ag) => {
              const req = getAgendaMinuteRequirement(ag.title);
              return (
                <option key={ag.id} value={ag.id}>
                  Acara {ag.orderIndex || 0}: {ag.title} [{req.shortLabel}]
                </option>
              );
            })}
          </select>
        </div>

        {/* Selective Rundown Awareness Banner */}
        {selectedAgendaReq && (
          <div
            className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
              selectedAgendaReq.isMandatory
                ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                : selectedAgendaReq.obligation === 'ADVISORY'
                ? 'bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200'
                : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
            }`}
          >
            {selectedAgendaReq.isMandatory ? (
              <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : selectedAgendaReq.obligation === 'ADVISORY' ? (
              <Lightbulb className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            ) : (
              <Scroll className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] uppercase tracking-wide">
                  {selectedAgendaReq.label}
                </span>
                <span className="text-[10px] opacity-75 font-normal">
                  ({selectedAgendaReq.isMandatory ? 'Kewajiban Yuridis RAT' : 'Panduan Notulis'})
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">
                {selectedAgendaReq.helperText}
              </p>
            </div>
          </div>
        )}

        {/* Kategori Dinamika */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kategori Catatan
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 p-2 sm:p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/60 ring-2 ring-indigo-500/20 font-bold text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="text-[11px] leading-tight break-words font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Waktu & Pembicara */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Waktu Kejadian</span>
              <button
                type="button"
                onClick={() => setTimeRecord(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB')}
                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Clock className="w-3 h-3" />
                <span>Waktu Sekarang</span>
              </button>
            </Label>
            <Input
              type="text"
              value={timeRecord}
              onChange={(e) => setTimeRecord(e.target.value)}
              placeholder="Contoh: 10:15 WIB"
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nama Pembicara / Pengusul
            </Label>
            <Input
              type="text"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              placeholder="Contoh: Bpk. Ahmad Fauzi (Anggota #042)"
              className="text-xs"
            />
          </div>
        </div>

        {/* Peran Pembicara Quick Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">Peran:</span>
          {roles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSpeakerRole(r)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                speakerRole === r
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Topik Bahasan */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Topik Bahasan / Butir Pokok <span className="text-rose-500">*</span>
          </Label>
          <Input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Contoh: Usulan Penambahan Unit Toko Grosir Sembako"
            className="text-xs font-semibold"
            required
          />
        </div>

        {/* Isi Notulensi */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Catatan Dinamika Sidang / Tanggapan <span className="text-rose-500">*</span>
          </Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Dokumentasikan pernyataan pembicara, respons pengurus, suasana forum, atau rincian dinamika musyawarah..."
            rows={3}
            className="text-xs leading-relaxed"
            required
          />
        </div>

        {/* Action Item / Tindak Lanjut */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kesepakatan / Butir Rekomendasi (Opsional)
          </Label>
          <Input
            type="text"
            value={actionItem}
            onChange={(e) => setActionItem(e.target.value)}
            placeholder="Contoh: Pengurus akan melakukan studi kelayakan unit sembako pada Q2."
            className="text-xs"
          />
        </div>

        {/* Visibilitas Publik */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="minute-is-public"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700"
          />
          <label htmlFor="minute-is-public" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            Tampilkan butir notulensi ini di linimasa portal anggota (Publik peserta)
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarOutline"
            onClick={onClose}
            disabled={saveMinuteMutation.isPending}
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="toolbar"
            variant="toolbarPrimary"
            disabled={saveMinuteMutation.isPending}
            className="gap-1.5"
          >
            {saveMinuteMutation.isPending ? 'Menyimpan...' : editingMinute ? 'Simpan Perubahan' : 'Simpan Notulensi'}
          </Button>
        </div>
      </form>
    </Modal>
  );
});

MinuteFormModal.displayName = 'MinuteFormModal';
