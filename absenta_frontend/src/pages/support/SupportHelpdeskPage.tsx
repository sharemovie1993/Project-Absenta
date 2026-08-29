import React, { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, Button, Input, SectionCard } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatDate } from '@/utils/date.utils';
import { DEFAULT_SUPPORT_PHONE, DEFAULT_LICENSE_SERVER_URL } from '@/config/env-config';
import { supportApi, type SupportTicketItem } from '@/api/support.api';
import { 
  LifeBuoy, 
  Send, 
  Phone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Server,
  RefreshCw,
  HelpCircle,
  KeyRound,
  MessageSquareReply,
  ArrowDownCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Zod Validation Schema ───────────────────────────────────────────────────
const ticketFormSchema = z.object({
  kategori: z.enum(['LISENSI', 'BUG', 'HARDWARE_RFID', 'KBM_ABSENSI', 'FITUR_BARU', 'LAINNYA']),
  prioritas: z.enum(['NORMAL', 'PENTING', 'URGENT']),
  judul: z.string().min(5, 'Judul kendala minimal 5 karakter').max(150, 'Judul kendala maksimal 150 karakter'),
  pesan: z.string().min(15, 'Penjelasan kendala minimal 15 karakter'),
});

const CATEGORY_OPTIONS = [
  { value: 'LISENSI', label: '🔑 Aktivasi & Masa Aktif Lisensi' },
  { value: 'BUG', label: '🐛 Bug / Kendala Sistem Aplikasi' },
  { value: 'HARDWARE_RFID', label: '💳 Mesin Presensi & Kartu RFID' },
  { value: 'KBM_ABSENSI', label: '📖 Alur KBM & Perhitungan Jam Mengajar' },
  { value: 'FITUR_BARU', label: '✨ Permintaan Fitur / Kustomisasi' },
  { value: 'LAINNYA', label: '❓ Bantuan Umum & Konsultasi IT' },
];

const PRIORITY_OPTIONS = [
  { value: 'NORMAL', label: '🟢 Normal (Respon 1x24 Jam)' },
  { value: 'PENTING', label: '🟡 Penting (Respon < 6 Jam)' },
  { value: 'URGENT', label: '🔴 Mendesak / Gangguan Operasional Sekolah' },
];

export const SupportHelpdeskPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<string>('BUAT_TIKET');

  // Form State
  const [kategori, setKategori] = useState<string>('LISENSI');
  const [prioritas, setPrioritas] = useState<string>('NORMAL');
  const [judul, setJudul] = useState<string>('');
  const [pesan, setPesan] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Active reply thread state
  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');

  // ── TanStack Query: Fetch Tickets List (OUTBOUND PULL SYNC) ───────────────
  const { 
    data: rawTickets = [], 
    isLoading: loadingTickets,
    isFetching: isPullingSync,
    refetch: refetchTickets
  } = useQuery<SupportTicketItem[]>({
    queryKey: ['support-tickets-list'],
    queryFn: () => supportApi.getTickets(),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // Background Auto-Pull setiap 15 detik (Anti-CGNAT)
    refetchOnWindowFocus: true, // Auto-Pull saat berpindah kembali ke tab browser
  });

  const tickets = useMemo(() => {
    return Array.isArray(rawTickets) ? rawTickets : [];
  }, [rawTickets]);

  // ── TanStack Mutation: Create Ticket ──────────────────────────────────────
  const createTicketMutation = useMutation({
    mutationFn: supportApi.createTicket,
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets-list'] });
      toast.success(`Tiket ${newTicket.nomorTiket} berhasil diajukan ke Tim Server Lisensi!`, { duration: 5000 });
      setJudul('');
      setPesan('');
      setActiveTab('RIWAYAT');
    },
    onError: () => {
      toast.error('Gagal mengirimkan tiket ke Server Lisensi.');
    }
  });

  // ── TanStack Mutation: Reply Ticket Message ───────────────────────────────
  const replyMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) => 
      supportApi.replyTicket(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets-list'] });
      toast.success('Pesan balasan berhasil terkirim ke Tim Teknis Pusat!');
      setReplyMessage('');
      setReplyingTicketId(null);
    },
    onError: () => {
      toast.error('Gagal mengirim balasan.');
    }
  });

  const tenantName = user?.tenant_id ? 'SMKN 1 Plered' : 'Instansi Sekolah';
  const userDisplayName = user?.full_name || 'Administrator Sekolah';

  // ── Manual Pull Trigger Handler ───────────────────────────────────────────
  const handleManualPullSync = useCallback(async () => {
    const res = await refetchTickets();
    if (res.isSuccess) {
      toast.success('Pembaruan tiket & balasan terbaru berhasil ditarik dari Server Lisensi!', { id: 'pull-sync-toast' });
    }
  }, [refetchTickets]);

  // ── Submit Ticket Handler ─────────────────────────────────────────────────
  const handleSubmitTicket = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    const validationResult = ticketFormSchema.safeParse({
      kategori,
      prioritas,
      judul: judul.trim(),
      pesan: pesan.trim(),
    });

    if (!validationResult.success) {
      const fieldErrors: Record<string, string> = {};
      (validationResult.error.issues ?? [])?.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        fieldErrors[fieldName] = issue.message;
      });
      setFormErrors(fieldErrors);
      toast.error('Mohon lengkapi seluruh formulir tiket dengan benar.');
      return;
    }

    const selectedCategoryObj = (CATEGORY_OPTIONS ?? [])?.find(c => c.value === kategori);

    createTicketMutation.mutate({
      kategori: selectedCategoryObj?.label || kategori,
      prioritas: prioritas as 'NORMAL' | 'PENTING' | 'URGENT',
      judul: judul.trim(),
      pesan: pesan.trim(),
      tenant_id: user?.tenant_id,
      tenant_name: tenantName,
      user_name: userDisplayName,
      user_email: user?.email,
    });
  }, [kategori, prioritas, judul, pesan, createTicketMutation, user, tenantName, userDisplayName]);

  // ── 1-Click WhatsApp Hotline ──────────────────────────────────────────────
  const handleOpenWhatsappHotline = useCallback((topic?: string) => {
    const textMsg = `Halo Tim Support Server Lisensi Absenta (PT Baraya Teknologi Indonesia),\n\nSaya *${userDisplayName}* dari *${tenantName}*.\nSaya membutuhkan bantuan teknis mengenai: *${topic || 'Layanan Sistem Absenta'}*.\n\n_Mohon bantuannya, terima kasih!_`;
    const encoded = encodeURIComponent(textMsg);
    window.open(`https://wa.me/${DEFAULT_SUPPORT_PHONE}?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }, [userDisplayName, tenantName]);

  const breadcrumbs = useMemo(() => [
    { label: 'Pusat Bantuan & Dukungan' },
    { label: 'Tiket Bantuan Server Lisensi' }
  ], []);

  const tabOptions = useMemo(() => [
    { id: 'BUAT_TIKET', label: 'Buat Tiket Bantuan Baru' },
    { id: 'RIWAYAT', label: `Riwayat Tiket Saya (${(tickets ?? []).length})` },
    { id: 'HOTLINE', label: 'Kontak & Saluran Bantuan' }
  ], [(tickets ?? []).length]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Bantuan & Tiket Dukungan Teknis"
        description="Layanan resmi kendala sistem, aktivasi lisensi, dan konsultasi teknis yang terhubung langsung ke Tim Pengembang Server Lisensi Pusat."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="support_helpdesk"
        instruction={{
          title: 'Panduan Pusat Bantuan & Tiket Server Lisensi',
          description: 'Halaman ini menggunakan mekanisme Outbound Pull Sync (Anti-CGNAT) untuk menyinkronkan tiket & balasan dengan Server Lisensi Pusat.',
          items: [
            { text: 'Buat tiket kendala baru untuk mendapatkan penanganan resmi dan riwayat terdata.' },
            { text: 'Aplikasi otomatis menarik balasan terbaru setiap 15 detik atau melalui tombol Tarik Balasan Terbaru.' },
            { text: 'Gunakan Hotline WhatsApp Cepat jika terjadi kendala mendesak pada saat jam operasional KBM/Presensi.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0 pb-24">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            
            {/* ── HEADER SERVER LISENSI STATUS BANNER ── */}
            <Card className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl overflow-hidden relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 shrink-0">
                    <LifeBuoy className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-base font-black">Helpdesk &amp; Support Server Lisensi</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 size={10} /> Terhubung Cloud (Pull Sync Active)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Instansi: <strong className="text-white">{tenantName}</strong> • Server Pusat: <span className="font-mono text-indigo-200">{DEFAULT_LICENSE_SERVER_URL}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={() => handleOpenWhatsappHotline('Kendala Darurat Sistem')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    <Phone size={13} />
                    Hotline WA Bantuan Cepat
                  </Button>
                </div>
              </div>
            </Card>

            {/* ── TAB CONTROLS (Pilar 30) ── */}
            <TabSwitcher
              tabs={tabOptions}
              activeTab={activeTab}
              onChange={(tabId) => setActiveTab(tabId)}
            />

            {/* ── TAB CONTENT: BUAT TIKET BARU ── */}
            {activeTab === 'BUAT_TIKET' && (
              <Card className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                <form onSubmit={handleSubmitTicket} className="space-y-4 max-w-3xl">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Send className="w-4 h-4 text-indigo-600" /> Formulir Pengajuan Tiket Dukungan Teknis
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Tiket Anda akan diteruskan ke antrean penanganan teknis Server Lisensi PT Baraya Teknologi Indonesia.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="kategori-tiket-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Kategori Kendala:
                      </label>
                      <SearchableSelect
                        id="kategori-tiket-select"
                        value={kategori}
                        onValueChange={(val) => setKategori(val)}
                        options={CATEGORY_OPTIONS}
                        placeholder="Pilih Kategori"
                      />
                      {formErrors.kategori && (
                        <p className="text-[11px] text-rose-500 mt-1">{formErrors.kategori}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="prioritas-tiket-select" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Tingkat Prioritas:
                      </label>
                      <SearchableSelect
                        id="prioritas-tiket-select"
                        value={prioritas}
                        onValueChange={(val) => setPrioritas(val)}
                        options={PRIORITY_OPTIONS}
                        placeholder="Pilih Tingkat Prioritas"
                      />
                      {formErrors.prioritas && (
                        <p className="text-[11px] text-rose-500 mt-1">{formErrors.prioritas}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="judul-tiket-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Judul / Ringkasan Kendala:
                    </label>
                    <Input
                      id="judul-tiket-input"
                      placeholder="Contoh: Sinkronisasi kartu RFID gerbang terputus saat jam tap pagi"
                      value={judul}
                      onChange={(e) => setJudul(e.target.value)}
                      className="rounded-xl text-xs"
                    />
                    {formErrors.judul && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.judul}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pesan-tiket-textarea" className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                      Deskripsi Rinci Kendala &amp; Langkah Terakhir yang Dilakukan:
                    </label>
                    <textarea
                      id="pesan-tiket-textarea"
                      rows={5}
                      placeholder="Tuliskan penjelasan kendala secara lengkap agar tim teknis pusat dapat langsung melakukan diagnosis perbaikan..."
                      value={pesan}
                      onChange={(e) => setPesan(e.target.value)}
                      className="w-full p-3 text-xs rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    {formErrors.pesan && (
                      <p className="text-[11px] text-rose-500 mt-1">{formErrors.pesan}</p>
                    )}
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] text-slate-400">
                      🔒 Informasi tenant dan token otentikasi akan disertakan secara aman bersama tiket.
                    </p>
                    <Button
                      type="submit"
                      variant="toolbarPrimary"
                      size="toolbar"
                      disabled={createTicketMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      {createTicketMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {createTicketMutation.isPending ? 'Mengirimkan Tiket...' : 'Kirim Tiket ke Server Lisensi'}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {/* ── TAB CONTENT: RIWAYAT TIKET (WITH PULL SYNC CONTROLS) ── */}
            {activeTab === 'RIWAYAT' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Sinkronisasi Otomatis Setiap 15 Detik (Anti-CGNAT Pull Active)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={handleManualPullSync}
                    disabled={isPullingSync}
                    className="font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPullingSync ? 'animate-spin text-indigo-600' : ''}`} />
                    {isPullingSync ? 'Menarik Data...' : 'Tarik Balasan Terbaru'}
                  </Button>
                </div>

                {loadingTickets ? (
                  <Card className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                    <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Menghubungi Server Lisensi &amp; memuat riwayat tiket...</p>
                  </Card>
                ) : (tickets ?? []).length === 0 ? (
                  <Card className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs">
                    <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Riwayat Tiket</h4>
                    <p className="text-xs text-slate-400 mt-1">Seluruh tiket kendala yang diajukan ke Server Lisensi akan tercatat di sini.</p>
                  </Card>
                ) : (
                  (tickets ?? [])?.map((t) => (
                    <Card key={t.id} className="p-4 sm:p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                            {t.nomorTiket}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {t.kategori}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                            t.prioritas === 'URGENT' 
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200' 
                              : t.prioritas === 'PENTING'
                                ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200'
                                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200'
                          }`}>
                            {t.prioritas}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : t.status === 'IN_PROGRESS'
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {t.status === 'RESOLVED' ? '✓ SELESAI' : t.status === 'IN_PROGRESS' ? '⏳ DIPROSES' : '📥 MENUNGGU RESPON'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(t.createdAt, 'dd MMM yyyy, HH:mm')}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{t.judul}</h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-line leading-relaxed">
                          {t.pesan}
                        </p>
                      </div>

                      {/* Utas Percakapan / Balasan Tim Teknis */}
                      {Array.isArray(t.messages) && t.messages.length > 0 ? (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {(t.messages ?? [])?.map((m) => (
                            <div 
                              key={m.id} 
                              className={`p-3 rounded-2xl text-xs space-y-1 ${
                                m.sender === 'agent'
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-200'
                                  : 'bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 font-bold text-[10px] text-indigo-600 dark:text-indigo-400">
                                <span className="flex items-center gap-1">
                                  {m.sender === 'agent' ? <ShieldCheck size={11} /> : <MessageSquareReply size={11} />}
                                  {m.senderName}
                                </span>
                                <span className="text-slate-400 font-normal">{formatDate(m.createdAt, 'dd MMM, HH:mm')}</span>
                              </div>
                              <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                            </div>
                          ))}
                        </div>
                      ) : t.adminReply ? (
                        <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-1">
                          <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck size={12} /> Tanggapan Tim Teknis Server Lisensi Pusat:
                          </span>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                            {t.adminReply}
                          </p>
                        </div>
                      ) : null}

                      {/* Tombol Balas Pesan */}
                      <div className="pt-2 flex flex-col gap-2">
                        {replyingTicketId === t.id ? (
                          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                            <textarea
                              rows={3}
                              placeholder="Tulis pesan balasan ke tim teknis Server Lisensi..."
                              value={replyMessage}
                              onChange={(e) => setReplyMessage(e.target.value)}
                              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="toolbarOutline"
                                size="toolbar"
                                onClick={() => { setReplyingTicketId(null); setReplyMessage(''); }}
                                className="text-xs rounded-xl"
                              >
                                Batal
                              </Button>
                              <Button
                                type="button"
                                variant="toolbarPrimary"
                                size="toolbar"
                                disabled={!replyMessage.trim() || replyMutation.isPending}
                                onClick={() => replyMutation.mutate({ ticketId: t.id, message: replyMessage.trim() })}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1"
                              >
                                <Send size={11} /> {replyMutation.isPending ? 'Mengirim...' : 'Kirim Balasan'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="toolbarOutline"
                              size="toolbar"
                              onClick={() => setReplyingTicketId(t.id)}
                              className="text-xs rounded-xl flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400"
                            >
                              <MessageSquareReply size={12} /> Balas Pesan Tim Teknis
                            </Button>
                          </div>
                        )}
                      </div>

                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── TAB CONTENT: HOTLINE & SALURAN BANTUAN ── */}
            {activeTab === 'HOTLINE' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                      <Phone className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Hotline WhatsApp CS</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bantuan instan untuk kendala operasional darurat sekolah atau panduan langsung staf teknis.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="toolbarPrimary"
                    size="toolbar"
                    onClick={() => handleOpenWhatsappHotline('Konsultasi CS')}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={12} /> Buka WhatsApp CS
                  </Button>
                </Card>

                <Card className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Perpanjangan Lisensi</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Konsultasi pembaruan masa aktif langganan, penambahan kuota siswa/guru, atau aktivasi modul baru.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => handleOpenWhatsappHotline('Perpanjangan Lisensi')}
                    className="w-full font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <KeyRound size={12} /> Hubungi Bagian Lisensi
                  </Button>
                </Card>

                <Card className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                      <Server className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">Dokumentasi &amp; Panduan</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Panduan lengkap instalasi perangkat keras RFID tap, integrasi Dapodik/EMIS, dan tutorial modul.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="toolbarOutline"
                    size="toolbar"
                    onClick={() => window.open('https://absenta.id/docs', '_blank')}
                    className="w-full font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={12} /> Buka Dokumentasi
                  </Button>
                </Card>
              </div>
            )}

          </div>
        </SectionCard>
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

SupportHelpdeskPage.displayName = 'SupportHelpdeskPage';
export default SupportHelpdeskPage;
