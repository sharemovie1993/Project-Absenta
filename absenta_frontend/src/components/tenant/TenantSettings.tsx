import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertTitle, AlertDescription, Loader, Input, Label, Switch, Badge } from '@/components/ui';
import { AlertTriangle, Trash2, Clock, XCircle, ShieldAlert, Plus, Save, Edit2, X, Globe, Phone, Mail, MapPin, Eye, Upload, Loader2, Layers, School } from 'lucide-react';
import { requestDeletion, cancelDeletion, getTenantById, updateTenant, type Tenant } from '@/api/tenants.api';
import { getGuruList } from '@/api/academic/guru.api';
import { PrintHeader, type PrintHeaderLine } from '../ui/PrintHeader';
import useConfirm from '@/hooks/useConfirm';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';
import { fetchActiveSystemConfig, saveSystemConfig } from '@/services/systemConfig';
import { getKelasForDropdown } from '@/api/dropdown.api';

/**
 * TenantSettings - Halaman Pengaturan & Profil Sekolah (Khusus Tenant Admin)
 * Memungkinkan administrator sekolah mengonfigurasi identitas resmi dan
 * Kop Surat Dinamis terpusat untuk segala dokumen cetak Absenta.
 * Dilengkapi dengan Rich Text Line-by-Line Formatter dan Live Preview presisi real-time.
 */
export const TenantSettings: React.FC = () => {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Mode edit & status saving
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // BPBK Settings state
  const [requireApproval, setRequireApproval] = useState(true);

  // Shift states
  const [kelasList, setKelasList] = useState<any[]>([]);
  const [activeShiftTab, setActiveShiftTab] = useState<'SHIFTS' | 'CLASSES'>('SHIFTS');
  const [activeSelectedShiftId, setActiveSelectedShiftId] = useState<string>('pagi');
  const [shiftConfig, setShiftConfig] = useState<any>({
    shifts: [
      {
        id: 'pagi',
        name: 'Shift Pagi',
        slots: [
          { slot: 1, start: '07:00', end: '07:45' },
          { slot: 2, start: '07:45', end: '08:30' },
          { slot: 3, start: '08:30', end: '09:15' },
          { slot: 4, start: '09:35', end: '10:20' },
          { slot: 5, start: '10:20', end: '11:05' },
          { slot: 6, start: '11:05', end: '11:50' },
          { slot: 7, start: '12:30', end: '13:15' },
          { slot: 8, start: '13:15', end: '14:00' },
          { slot: 9, start: '14:00', end: '14:45' },
          { slot: 10, start: '14:45', end: '15:30' }
        ]
      }
    ],
    class_assignments: {}
  });

  // Form states untuk Profil & Kop Surat
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDaerahUrl, setLogoDaerahUrl] = useState('');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepala, setNipKepala] = useState('');
  const [jenjang, setJenjang] = useState('');
  const [kurikulum, setKurikulum] = useState('MERDEKA');
  const [gurus, setGurus] = useState<any[]>([]);
  const [selectedGuruId, setSelectedGuruId] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const logoDaerahInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingLogoDaerah, setIsUploadingLogoDaerah] = useState(false);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        setLogoUrl(fileUrl);
        toast.success('Logo sekolah berhasil diunggah!');
      }
    } catch (err) {
      console.error('Failed to upload logo:', err);
      toast.error('Gagal mengunggah logo sekolah.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUploadLogoDaerah = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogoDaerah(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const fileUrl = res.data?.data?.url || res.data?.url || res.data?.data || '';
      if (fileUrl) {
        setLogoDaerahUrl(fileUrl);
        toast.success('Logo daerah berhasil diunggah!');
      }
    } catch (err) {
      console.error('Failed to upload logo daerah:', err);
      toast.error('Gagal mengunggah logo daerah.');
    } finally {
      setIsUploadingLogoDaerah(false);
    }
  };
  
  // Rich lines state
  const [headerLines, setHeaderLines] = useState<PrintHeaderLine[]>([]);
  
  // Active preview variant ('portrait' | 'landscape' | 'compact')
  const [previewVariant, setPreviewVariant] = useState<'portrait' | 'landscape' | 'compact'>('portrait');

  const fetchTenant = async () => {
    if (!user?.tenant_id) return;
    try {
      setLoading(true);
      const response = await getTenantById(user.tenant_id);
      
      // Fetch gurus list for dropdown
      try {
        const guruRes = await getGuruList(1, 1000);
        if (guruRes.success && guruRes.data) {
          setGurus(guruRes.data);
        }
      } catch (err) {
        console.error('Failed to load gurus:', err);
      }

      // Fetch kelas list for dropdown
      try {
        const kelasRes = await getKelasForDropdown();
        if (kelasRes) {
          setKelasList(kelasRes);
        }
      } catch (err) {
        console.error('Failed to load kelas:', err);
      }

      if (response.success) {
        const data = response.data;
        setTenant(data);
        setName(data.name || '');
        
        // Initialize shift config
        if (data.shift_jam_pelajaran) {
          setShiftConfig(data.shift_jam_pelajaran);
          if (data.shift_jam_pelajaran.shifts && data.shift_jam_pelajaran.shifts.length > 0) {
            setActiveSelectedShiftId(data.shift_jam_pelajaran.shifts[0].id);
          }
        } else {
          setShiftConfig({
            shifts: [
              {
                id: 'pagi',
                name: 'Shift Pagi',
                slots: [
                  { slot: 1, start: '07:00', end: '07:45' },
                  { slot: 2, start: '07:45', end: '08:30' },
                  { slot: 3, start: '08:30', end: '09:15' },
                  { slot: 4, start: '09:35', end: '10:20' },
                  { slot: 5, start: '10:20', end: '11:05' },
                  { slot: 6, start: '11:05', end: '11:50' },
                  { slot: 7, start: '12:30', end: '13:15' },
                  { slot: 8, start: '13:15', end: '14:00' },
                  { slot: 9, start: '14:00', end: '14:45' },
                  { slot: 10, start: '14:45', end: '15:30' }
                ]
              }
            ],
            class_assignments: {}
          });
          setActiveSelectedShiftId('pagi');
        }
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logo_url || '');
        setLogoDaerahUrl(data.logo_daerah_url || '');
        setKepalaSekolah(data.kepala_sekolah || '');
        setNipKepala(data.nip_kepala || '');
        setSelectedGuruId((data as any).kepala_sekolah_guru_id || '');
        setJenjang(data.jenjang || '');
        setKurikulum((data as any).kurikulum || 'MERDEKA');
        
        // Parse the dynamic lines from the database string array
        const rawLines = data.print_header_lines && data.print_header_lines.length > 0
          ? data.print_header_lines
          : [
              'PEMERINTAH DAERAH PROVINSI JAWA BARAT',
              'DINAS PENDIDIKAN',
              'CABANG DINAS PENDIDIKAN WILAYAH IV',
              data.name || 'SMK NEGERI 1 PLERED'
            ];

        const parsed: PrintHeaderLine[] = rawLines.map((line, idx) => {
          if (typeof line === 'object' && line !== null) {
            return line as PrintHeaderLine;
          }
          
          try {
            const parsedObj = JSON.parse(line);
            if (parsedObj && typeof parsedObj === 'object' && 'text' in parsedObj) {
              return parsedObj;
            }
          } catch (e) {
            // ignore and parse as plain text
          }

          // Fallback styling based on Pergub Jabar No. 30 Tahun 2018
          const textStr = typeof line === 'string' ? line : (line as any).text || '';
          let fontSize = 12;
          
          if (idx === 0) {
            fontSize = 14;
          } else if (idx === 1) {
            fontSize = 14;
          } else if (idx === 2) {
            fontSize = 12;
          } else if (idx === 3 || idx === rawLines.length - 1) {
            fontSize = 18;
          }

          return {
            text: textStr,
            fontSize,
            bold: true,
            italic: false,
            underline: false,
            fontFamily: 'Arial'
          };
        });

        setHeaderLines(parsed);

        // Fetch BPBK configuration
        const configData = await fetchActiveSystemConfig();
        if (configData) {
          setRequireApproval(configData.bpbk_summons_require_principal_approval ?? true);
        }
      }
    } catch (error) {
      console.error('Error fetching tenant:', error);
      toast.error('Gagal memuat data sekolah');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [user?.tenant_id]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    fetchTenant();
  };

  const handleSaveProfile = async () => {
    if (!tenant) return;

    const ok = await confirm({
      title: 'Simpan Konfigurasi Sekolah & Kop Surat',
      description: 'Apakah Anda yakin ingin menyimpan perubahan pada profil sekolah dan format Kop Surat? Format baru akan langsung diterapkan di seluruh dokumen cetak laporan Absenta.',
      confirmText: 'Ya, Simpan',
      cancelText: 'Batal',
      style: 'info',
    });
    if (!ok) return;

    setSaving(true);
    try {
      // Serialize rich formatted lines into strings for backward compatible db storage
      const serializedLines = headerLines
        .filter(line => line.text.trim() !== '')
        .map(line => JSON.stringify(line));

      const payload = {
        name,
        address,
        phone,
        email,
        website,
        logo_url: logoUrl,
        logo_daerah_url: logoDaerahUrl,
        print_header_lines: serializedLines,
        kepala_sekolah: kepalaSekolah,
        nip_kepala: nipKepala,
        jenjang: jenjang || null,
        kurikulum: kurikulum || 'MERDEKA',
        kepala_sekolah_guru_id: selectedGuruId || null,
        shift_jam_pelajaran: shiftConfig,
      };

      const response = await updateTenant(tenant.id, payload);
      
      // Save BPBK configuration
      await saveSystemConfig({
        bpbk_summons_require_principal_approval: requireApproval
      });

      if (response.success) {
        toast.success('Profil sekolah & Kop Surat berhasil disimpan!');
        setIsEditing(false);
        fetchTenant();
      } else {
        toast.error(response.message || 'Gagal menyimpan konfigurasi');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const calculateRetentionDays = (dateString?: string | null) => {
    if (!dateString) return 0;
    const requestDate = new Date(dateString);
    const deletionDate = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = deletionDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const handleRequestDeletion = async () => {
    if (!tenant) return;
    
    const ok = await confirm({
      title: 'Permintaan Penghapusan Akun',
      description: `Apakah Anda yakin ingin meminta penghapusan untuk akun sekolah "${tenant.name}"? Data akan dihapus secara permanen dalam 30 hari.`,
      confirmText: 'Ajukan Penghapusan',
      cancelText: 'Batal',
      style: 'danger',
    });
    if (!ok) return;

    try {
      const response = await requestDeletion(tenant.id);
      if (response.success) {
        toast.success('Permintaan penghapusan berhasil diajukan');
        fetchTenant();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Gagal mengajukan penghapusan');
    }
  };

  const handleCancelDeletion = async () => {
    if (!tenant) return;

    const ok = await confirm({
      title: 'Batalkan Penghapusan',
      description: `Apakah Anda yakin ingin membatalkan penghapusan untuk akun sekolah "${tenant.name}"? Status akun akan dikembalikan ke aktif.`,
      confirmText: 'Batalkan Penghapusan',
      cancelText: 'Tutup',
      style: 'info',
    });
    if (!ok) return;

    try {
      const response = await cancelDeletion(tenant.id);
      if (response.success) {
        toast.success('Penghapusan berhasil dibatalkan');
        fetchTenant();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Gagal membatalkan penghapusan');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader size="lg" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Data tenant tidak ditemukan.</AlertDescription>
      </Alert>
    );
  }

  const isPendingDeletion = tenant.status === 'PENDING_DELETION' || !!tenant.deletion_requested_at;
  const retentionDays = calculateRetentionDays(tenant.deletion_requested_at);

  // Dynamic construct for live preview
  const liveTenantInfo = {
    name,
    logo_url: logoUrl,
    logo_daerah_url: logoDaerahUrl,
    address,
    phone,
    email,
    website,
    print_header_lines: headerLines
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16 px-4 animate-fadeIn">
      {/* Clean Minimal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Pengaturan Sekolah</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Kelola identitas resmi, Kop Surat dinamis, dan alur kerja sistem.</p>
        </div>
        <div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 transition-all">
              <Edit2 className="h-4 w-4" /> Edit Profil & Kop
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="flex items-center gap-1">
                <X className="h-4 w-4" /> Batal
              </Button>
              <Button onClick={handleSaveProfile} disabled={saving} className="flex items-center gap-1">
                {saving ? <Loader className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                Simpan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Profil Sekolah & Kop Surat Card */}
      <Card className="shadow-xl shadow-slate-100 dark:shadow-none border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 py-5 px-8">
          <CardTitle className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <School className="h-4 w-4" />
            </div>
            Profil Sekolah & Format Dokumen Resmi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isEditing ? (
            // ================= EDIT MODE =================
            <div className="space-y-6 animate-fadeIn">
              
              {/* ✨ LIVE PREVIEW KOP SURAT (Dinamis & Real-time) */}
              <div className="p-6 border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Eye className="h-4 w-4 text-indigo-500 animate-pulse" />
                    Live Preview Kop Surat Dinamis (Cetak Dokumen)
                  </span>
                  
                  {/* Preview Selector Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('portrait')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${previewVariant === 'portrait' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                      A4 Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('landscape')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${previewVariant === 'landscape' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                      A4 Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('compact')}
                      className={`px-3 py-1.5 rounded-lg transition-all ${previewVariant === 'compact' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
                    >
                      Thermal Receipt
                    </button>
                  </div>
                </div>

                {/* Paper sheet replica */}
                <div className="p-6 bg-white dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-100 dark:shadow-none overflow-x-auto min-h-[140px] flex items-center justify-center border-dashed">
                  <div className={`w-full max-w-full ${previewVariant === 'compact' ? 'max-w-[280px]' : 'min-w-[480px]'}`}>
                    <PrintHeader variant={previewVariant} tenantInfo={liveTenantInfo} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* School Name & Website */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="school_name" className="text-xs font-bold text-slate-500 uppercase">Nama Resmi Sekolah</Label>
                    <Input
                      id="school_name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: SMK NEGERI 1 PLERED"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="website" className="text-xs font-bold text-slate-500 uppercase">Website Resmi</Label>
                    <Input
                      id="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="smkn1plered.mysch.id"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="jenjang" className="text-xs font-bold text-slate-500 uppercase">Jenjang Sekolah <span className="text-rose-500">*</span></Label>
                    <select
                      id="jenjang"
                      value={jenjang}
                      onChange={(e) => setJenjang(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 font-bold text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Pilih Jenjang...</option>
                      <option value="SD">SD (Sekolah Dasar)</option>
                      <option value="MI">MI (Madrasah Ibtidaiyah)</option>
                      <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                      <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                      <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                      <option value="MA">MA (Madrasah Aliyah)</option>
                      <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                      <option value="MAK">MAK (Madrasah Aliyah Kejuruan)</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="kurikulum" className="text-xs font-bold text-slate-500 uppercase">Kurikulum Utama <span className="text-rose-500">*</span></Label>
                    <select
                      id="kurikulum"
                      value={kurikulum}
                      onChange={(e) => setKurikulum(e.target.value)}
                      className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:ring-offset-slate-950 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300 font-bold text-slate-700 dark:text-slate-300"
                    >
                      <option value="MERDEKA">Kurikulum Merdeka</option>
                      <option value="K13" disabled>Kurikulum 2013 (K13) - Belum Didukung</option>
                    </select>
                  </div>
                </div>

                {/* Domain & Email */}
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="domain" className="text-xs font-bold text-slate-500 uppercase">Domain Absenta (Readonly)</Label>
                    <Input id="domain" value={tenant.domain || '-'} disabled className="bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase">Email Sekolah</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="smk@sch.id"
                    />
                  </div>
                </div>
              </div>

              {/* Alamat & Kontak */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 border-slate-100 dark:border-slate-800">
                <div className="grid gap-2">
                  <Label htmlFor="address" className="text-xs font-bold text-slate-500 uppercase">Alamat Lengkap Sekolah (Untuk Kop)</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Jalan Rawa Sari, Kec. Plered, Kab. Purwakarta, 41162"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase">No. Telepon Resmi</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(0264) 8315211"
                  />
                </div>
              </div>

              {/* Kepala Sekolah & NIP (Managed dynamically with two-way sync to Struktur Organisasi) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 border-slate-100 dark:border-slate-800">
                <div className="grid gap-2">
                  <Label htmlFor="kepala_sekolah" className="text-xs font-bold text-slate-500 uppercase">
                    Nama Kepala Sekolah {isEditing ? '(Pilih Guru)' : '(Readonly)'}
                  </Label>
                  {isEditing ? (
                    <select
                      id="kepala_sekolah"
                      value={selectedGuruId}
                      onChange={(e) => {
                        const guruId = e.target.value;
                        setSelectedGuruId(guruId);
                        const selected = gurus.find((g) => g.id === guruId);
                        if (selected) {
                          setKepalaSekolah(selected.nama_guru);
                          setNipKepala(selected.nip || '-');
                        } else {
                          setKepalaSekolah('');
                          setNipKepala('-');
                        }
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">-- Pilih Kepala Sekolah --</option>
                      {gurus.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.nama_guru} {g.nip ? `(NIP. ${g.nip})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="kepala_sekolah"
                      value={kepalaSekolah || 'Belum ditugaskan'}
                      disabled
                      className="bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed border-slate-200/60 dark:border-slate-800/80 font-bold"
                    />
                  )}
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {isEditing ? (
                      <span>Pilih Guru dari dropdown untuk menugaskannya langsung sebagai <span className="font-bold text-indigo-600 dark:text-indigo-400">Kepala Sekolah</span>.</span>
                    ) : (
                      <span>
                        Data diambil otomatis berdasarkan penugasan posisi <span className="font-bold text-indigo-600 dark:text-indigo-400">Kepala Sekolah</span> di{' '}
                        <a href="/academic/struktur-organisasi" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800">
                          Struktur Organisasi
                        </a>.
                      </span>
                    )}
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nip_kepala" className="text-xs font-bold text-slate-500 uppercase">NIP Kepala Sekolah (Readonly)</Label>
                  <Input
                    id="nip_kepala"
                    value={nipKepala || '-'}
                    disabled
                    className="bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed border-slate-200/60 dark:border-slate-800/80 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    NIP terikat langsung dengan data Guru yang ditugaskan sebagai Kepala Sekolah di{' '}
                    <a href="/academic/struktur-organisasi" className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800">
                      Struktur Organisasi
                    </a>.
                  </p>
                </div>
              </div>

              {/* URL LOGO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 border-slate-100 dark:border-slate-800">
                <div className="grid gap-2">
                  <Label htmlFor="logo_daerah" className="text-xs font-bold text-slate-500 uppercase">URL Logo Kiri (Logo Pemerintah / Yayasan)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo_daerah"
                      value={logoDaerahUrl}
                      onChange={(e) => setLogoDaerahUrl(e.target.value)}
                      placeholder="https://upload.wikimedia.org/wikipedia/.../Logo.svg"
                      disabled={!isEditing}
                      className="flex-1"
                    />
                    <input
                      type="file"
                      ref={logoDaerahInputRef}
                      onChange={handleUploadLogoDaerah}
                      accept="image/*"
                      className="hidden"
                      disabled={!isEditing}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoDaerahInputRef.current?.click()}
                      disabled={!isEditing || isUploadingLogoDaerah}
                      className="shrink-0 flex items-center gap-1.5 h-10 px-3 text-xs"
                    >
                      {isUploadingLogoDaerah ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Unggah
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">Gunakan tautan logo daerah (PNG/SVG) untuk sisi kiri Kop.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="logo_sekolah" className="text-xs font-bold text-slate-500 uppercase">URL Logo Kanan (Logo Sekolah)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="logo_sekolah"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://..."
                      disabled={!isEditing}
                      className="flex-1"
                    />
                    <input
                      type="file"
                      ref={logoInputRef}
                      onChange={handleUploadLogo}
                      accept="image/*"
                      className="hidden"
                      disabled={!isEditing}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={!isEditing || isUploadingLogo}
                      className="shrink-0 flex items-center gap-1.5 h-10 px-3 text-xs"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Unggah
                    </Button>
                  </div>
                  <p className="text-[10px] text-slate-400">Gunakan tautan logo resmi sekolah Anda untuk sisi kanan Kop.</p>
                </div>
              </div>

              {/* DYNAMIC HEADER LINES (KOP SURAT ENGINE - RICH FORMATTER) */}
              <div className="border-t pt-4 border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <Label className="text-sm font-black text-slate-800 dark:text-slate-200">
                    Susunan Baris Kop Surat Dinamis & Formatter Teks
                  </Label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Konfigurasi teks secara terpisah per-baris. Setiap baris mendukung format kustom (Jenis Font, Ukuran, Tebal, Miring, dan Garis Bawah). Preview akan merender format Anda secara real-time.
                  </p>
                </div>

                <div className="space-y-4 max-w-3xl">
                  {headerLines.map((line, index) => (
                    <div key={index} className="flex flex-col gap-2.5 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                      
                      {/* Teks Baris Utama */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 w-16 shrink-0 text-right pr-2">Baris {index + 1} :</span>
                        <Input
                          value={line.text}
                          onChange={(e) => {
                            const next = [...headerLines];
                            next[index] = { ...line, text: e.target.value };
                            setHeaderLines(next);
                          }}
                          placeholder="Masukkan teks kop surat (misal: DINAS PENDIDIKAN)"
                          className="flex-grow"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 shrink-0 rounded-xl"
                          onClick={() => {
                            setHeaderLines(headerLines.filter((_, i) => i !== index));
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Pemformatan Rich Text */}
                      <div className="flex flex-wrap items-center gap-4 pl-16 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 mt-1">
                        
                        {/* Font Family */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Font:</span>
                          <select
                            value={line.fontFamily || 'Inter'}
                            onChange={(e) => {
                              const next = [...headerLines];
                              next[index] = { ...line, fontFamily: e.target.value };
                              setHeaderLines(next);
                            }}
                            className="text-[11px] font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
                            style={{ fontFamily: line.fontFamily || 'Inter' }}
                          >
                            <optgroup label="Sistem (Standard Windows)">
                              <option value="Arial" style={{ fontFamily: 'Arial' }}>Arial</option>
                              <option value="Cambria" style={{ fontFamily: 'Cambria, Georgia, serif' }}>Cambria (Office Formal)</option>
                              <option value="Calibri" style={{ fontFamily: 'Calibri, Candara, Segoe UI, sans-serif' }}>Calibri (Office Modern)</option>
                              <option value="Times New Roman" style={{ fontFamily: 'Times New Roman' }}>Times New Roman</option>
                              <option value="Verdana" style={{ fontFamily: 'Verdana' }}>Verdana</option>
                              <option value="Tahoma" style={{ fontFamily: 'Tahoma' }}>Tahoma</option>
                              <option value="Trebuchet MS" style={{ fontFamily: 'Trebuchet MS' }}>Trebuchet MS</option>
                              <option value="Georgia" style={{ fontFamily: 'Georgia' }}>Georgia</option>
                              <option value="Garamond" style={{ fontFamily: 'Garamond' }}>Garamond</option>
                              <option value="Courier New" style={{ fontFamily: 'Courier New' }}>Courier New</option>
                              <option value="Brush Script MT" style={{ fontFamily: 'Brush Script MT' }}>Brush Script MT (Cursive)</option>
                            </optgroup>
                            <optgroup label="Modern (Google Fonts)">
                              <option value="Inter" style={{ fontFamily: 'Inter' }}>Inter</option>
                              <option value="Outfit" style={{ fontFamily: 'Outfit' }}>Outfit</option>
                              <option value="Montserrat" style={{ fontFamily: 'Montserrat' }}>Montserrat</option>
                              <option value="Roboto" style={{ fontFamily: 'Roboto' }}>Roboto</option>
                            </optgroup>
                          </select>
                        </div>

                        {/* Font Size */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ukuran:</span>
                          <input
                            type="number"
                            min="6"
                            max="36"
                            value={line.fontSize || 12}
                            onChange={(e) => {
                              const next = [...headerLines];
                              next[index] = { ...line, fontSize: Number(e.target.value) };
                              setHeaderLines(next);
                            }}
                            className="w-12 text-[11px] font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 text-slate-700 dark:text-slate-300 text-center focus:outline-none"
                          />
                          <span className="text-[9px] text-slate-400 font-bold">pt</span>
                        </div>

                        {/* Style Buttons (B, I, U) */}
                        <div className="flex items-center gap-1 bg-slate-200/50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-0.5 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...headerLines];
                              next[index] = { ...line, bold: !line.bold };
                              setHeaderLines(next);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors font-bold ${
                              line.bold ? 'bg-indigo-600 text-white shadow-sm font-black' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...headerLines];
                              next[index] = { ...line, italic: !line.italic };
                              setHeaderLines(next);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors italic font-serif ${
                              line.italic ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...headerLines];
                              next[index] = { ...line, underline: !line.underline };
                              setHeaderLines(next);
                            }}
                            className={`px-2.5 py-1 text-xs rounded-md transition-colors underline ${
                              line.underline ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            U
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-2 flex justify-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeaderLines([...headerLines, { text: '', fontSize: 10, bold: true, fontFamily: 'Arial' }])}
                      className="border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah Baris Kedinasan/Kop
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeaderLines([
                        { text: 'PEMERINTAH DAERAH PROVINSI JAWA BARAT', fontSize: 14, bold: true, fontFamily: 'Arial', italic: false, underline: false },
                        { text: 'DINAS PENDIDIKAN', fontSize: 14, bold: true, fontFamily: 'Arial', italic: false, underline: false },
                        { text: 'CABANG DINAS PENDIDIKAN WILAYAH IV', fontSize: 12, bold: true, fontFamily: 'Arial', italic: false, underline: false },
                        { text: name || 'SMK NEGERI 6 JAKARTA', fontSize: 18, bold: true, fontFamily: 'Arial', italic: false, underline: false }
                      ])}
                      className="border-indigo-200 text-indigo-600 hover:bg-indigo-50/50"
                    >
                      <Layers className="h-4 w-4 mr-1" /> Gunakan Preset Jabar Disdik
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ================= VIEW MODE =================
            <div className="space-y-8 px-2">
              
              {/* ✨ KOP PREVIEW (IN VIEW MODE) */}
              <div className="p-6 border border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl shadow-inner">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Eye className="h-4 w-4 text-slate-400" />
                      Pratinjau Kop Surat Resmi
                    </span>
                    
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewVariant('portrait')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${previewVariant === 'portrait' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewVariant('landscape')}
                        className={`px-3 py-1.5 rounded-lg transition-all ${previewVariant === 'landscape' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600 dark:text-indigo-400 font-black' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                  
                  {/* Container replica */}
                  <div className="flex justify-center bg-slate-100/50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800">
                    <div className={`bg-white dark:bg-slate-950 shadow-xl p-8 border border-slate-200/60 dark:border-slate-800 transition-all duration-300 ${previewVariant === 'landscape' ? 'w-full' : 'w-[800px] max-w-full'}`}>
                      <PrintHeader variant={previewVariant} tenantInfo={liveTenantInfo} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo & Subscription Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo Daerah */}
                <div className="flex flex-col items-center justify-center p-5 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 dark:bg-slate-700"></div>
                  <span className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-wider">Logo Pemda / Yayasan</span>
                  {logoDaerahUrl ? (
                    <img src={logoDaerahUrl} alt="Logo Pemda" className="h-16 w-auto object-contain transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center rounded-xl font-bold text-[10px] text-slate-400">Belum Unggah</div>
                  )}
                </div>

                {/* Logo Sekolah */}
                <div className="flex flex-col items-center justify-center p-5 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <span className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-wider">Logo Resmi Sekolah</span>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Sekolah" className="h-16 w-auto object-contain transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center rounded-xl font-bold text-[10px] text-slate-400">Belum Unggah</div>
                  )}
                </div>

                {/* Status Langganan info */}
                <div className="flex flex-col justify-between p-5 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl bg-white dark:bg-slate-950 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Paket Aktif</span>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">{tenant.subscription_plan || 'Free Plan'}</p>
                  </div>
                  <div className="mt-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Status Lisensi</span>
                    <div>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        tenant.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/30' :
                        tenant.status === 'SUSPENDED' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        isPendingDeletion ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current mr-1.5 animate-pulse"></span>
                        {isPendingDeletion ? 'Dalam Penghapusan' : tenant.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Sekolah View (Premium Info Cards) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-slate-100 dark:border-slate-800 pt-8">
                {/* Alamat */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Alamat Resmi</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{address || '-'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Resmi</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{email || '-'}</p>
                  </div>
                </div>

                {/* Telepon */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 rounded-xl shrink-0">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">No. Telepon</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{phone || '-'}</p>
                  </div>
                </div>

                {/* Website */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Website Resmi</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{website || '-'}</p>
                  </div>
                </div>

                {/* Jenjang */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 rounded-xl shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Jenjang Sekolah</span>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {tenant.jenjang ? `${tenant.jenjang} (Sekolah Terkonfigurasi)` : (
                        <span className="text-rose-500 italic text-[11px] font-black flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 inline" /> Harap tentukan jenjang!
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Kurikulum */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kurikulum Utama</span>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {tenant.kurikulum === 'K13' ? 'Kurikulum 2013 (K13)' : 'Kurikulum Merdeka'}
                    </p>
                  </div>
                </div>

                {/* Kepala Sekolah */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Kepala Sekolah</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {tenant.kepala_sekolah || <span className="text-slate-400 italic">Otomatis dari Struktur</span>}
                    </p>
                  </div>
                </div>

                {/* NIP Kepala Sekolah */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">NIP Kepala Sekolah</span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {tenant.nip_kepala || <span className="text-slate-400 italic">Otomatis dari Struktur</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>      {/* ⏰ SHIFT & JAM PELAJARAN KBM CARD */}
      <Card className="shadow-xl shadow-slate-100 dark:shadow-none border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 py-5 px-8">
          <CardTitle className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Clock className="h-4 w-4" />
            </div>
            Konfigurasi Shift & Waktu Kegiatan Belajar Mengajar (KBM)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 gap-6">
            <div className="space-y-1.5 max-w-lg">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Pengaturan Jam Pelajaran (KBM) & Shift
              </Label>
              <p className="text-xs text-slate-500 leading-normal">
                Konfigurasi pembagian shift (Pagi/Siang), pengaturan jam pelajaran per-slot, dan pemetaan kelas kini dikelola langsung secara terpusat oleh bagian **Kurikulum** untuk kemudahan pendelegasian tugas.
              </p>
            </div>
            <Link
              to="/kurikulum/jam-kbm"
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-650 dark:text-indigo-400 text-xs font-black rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-center inline-block shrink-0 transition-colors"
            >
              Buka Pengaturan Jam KBM
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ⚖️ PENGATURAN BIMBINGAN KONSELING (BK) CARD */}
      <Card className="shadow-xl shadow-slate-100 dark:shadow-none border border-slate-200/60 dark:border-slate-800 rounded-3xl overflow-hidden bg-white dark:bg-slate-950">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 py-5 px-8">
          <CardTitle className="text-base font-black text-slate-800 dark:text-slate-200 flex items-center gap-2.5">
            <div className="p-2 bg-violet-50 dark:bg-violet-950/40 rounded-xl text-violet-600 dark:text-violet-400">
              <Clock className="h-4 w-4" />
            </div>
            Konfigurasi Modul Bimbingan Konseling (BK)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-150 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 gap-6">
            <div className="space-y-1.5 max-w-lg">
              <Label className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                Persetujuan Kepala Sekolah untuk Surat Panggilan
                <Badge variant={requireApproval ? 'warning' : 'success'} className="font-bold text-[9px] uppercase px-2 py-0.5">
                  {requireApproval ? 'Wajib Persetujuan' : 'Langsung Terbit (Bypass)'}
                </Badge>
              </Label>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Jika diaktifkan, draf surat panggilan yang dibuat oleh Guru BK wajib disetujui Kepala Sekolah melalui modul Surat Keluar sebelum aktif. Jika dinonaktifkan, surat langsung aktif/terbit.
              </p>
            </div>
            <Switch
              checked={requireApproval}
              onCheckedChange={async (checked) => {
                setRequireApproval(checked);
                const toastId = toast.loading('Menyimpan pengaturan BK...');
                try {
                  await saveSystemConfig({
                    bpbk_summons_require_principal_approval: checked
                  });
                  toast.success('Pengaturan alur BK berhasil diperbarui!', { id: toastId });
                } catch (err: any) {
                  toast.error(err.message || 'Gagal menyimpan pengaturan', { id: toastId });
                  setRequireApproval(!checked); // rollback
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-200 dark:border-red-950 bg-red-50/10 dark:bg-red-950/5 shadow-lg rounded-3xl overflow-hidden">
        <CardHeader className="py-5 px-8 border-b border-red-100/50 dark:border-red-900/20 bg-red-50/30 dark:bg-red-950/10">
          <CardTitle className="flex items-center text-base font-black text-red-700 dark:text-red-400 gap-2.5">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          {isPendingDeletion ? (
             <div className="space-y-4">
                <Alert className="bg-white dark:bg-gray-800 border-red-200">
                    <Clock className="h-4 w-4 text-red-600 animate-spin" />
                    <AlertTitle className="text-red-600 font-bold">Penghapusan Dijadwalkan</AlertTitle>
                    <AlertDescription className="text-red-600 text-xs">
                        Akun ini dijadwalkan untuk dihapus permanen dalam <strong>{retentionDays} hari</strong>. 
                        Semua data akan hilang dan tidak dapat dipulihkan setelah periode ini berakhir.
                    </AlertDescription>
                </Alert>
                <div className="flex justify-end">
                    <Button 
                        variant="outline" 
                        className="border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={handleCancelDeletion}
                    >
                        <XCircle className="h-4 w-4 mr-2" />
                        Batalkan Penghapusan
                    </Button>
                </div>
             </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Jika Anda ingin berhenti menggunakan layanan ini, Anda dapat mengajukan permohonan penghapusan akun.
                Data Anda akan disimpan selama 30 hari sebelum dihapus secara permanen (Retention Period).
              </p>
              <div className="flex justify-end">
                <Button 
                    variant="danger" 
                    onClick={handleRequestDeletion}
                    disabled={isEditing}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Ajukan Penghapusan Akun
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantSettings;
