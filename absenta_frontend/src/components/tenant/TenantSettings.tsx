import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent, Button, Alert, AlertTitle, AlertDescription, Loader, Input, Label } from '@/components/ui';
import { AlertTriangle, Trash2, Clock, XCircle, ShieldAlert, Plus, Save, Edit2, X, Globe, Phone, Mail, MapPin, Eye, Upload, Loader2 } from 'lucide-react';
import { requestDeletion, cancelDeletion, getTenantById, updateTenant, type Tenant } from '@/api/tenants.api';
import { PrintHeader, type PrintHeaderLine } from '../ui/PrintHeader';
import useConfirm from '@/hooks/useConfirm';
import { toast } from 'sonner';
import axiosInstance from '@/lib/axiosInstance';

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
      if (response.success) {
        const data = response.data;
        setTenant(data);
        setName(data.name || '');
        setAddress(data.address || '');
        setPhone(data.phone || '');
        setEmail(data.email || '');
        setWebsite(data.website || '');
        setLogoUrl(data.logo_url || '');
        setLogoDaerahUrl(data.logo_daerah_url || '');
        setKepalaSekolah(data.kepala_sekolah || '');
        setNipKepala(data.nip_kepala || '');
        
        // Parse the dynamic lines from the database string array
        const rawLines = data.print_header_lines && data.print_header_lines.length > 0
          ? data.print_header_lines
          : [
              'PEMERINTAH DAERAH PROPINSI JAWA BARAT',
              'DINAS PENDIDIKAN',
              'KANTOR CABANG DINAS PENDIDIKAN WILAYAH IV',
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

          // Fallback styling based on Indonesia public school hierarchy
          const isLast = idx === rawLines.length - 1;
          const isSecondLast = idx === rawLines.length - 2 && rawLines.length > 1;
          
          return {
            text: line,
            fontSize: isLast ? 16 : isSecondLast ? 12 : 10,
            bold: true,
            italic: false,
            underline: false,
            fontFamily: isLast ? 'Outfit' : 'Inter'
          };
        });

        setHeaderLines(parsed);
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
    if (tenant) {
      setName(tenant.name || '');
      setAddress(tenant.address || '');
      setPhone(tenant.phone || '');
      setEmail(tenant.email || '');
      setWebsite(tenant.website || '');
      setLogoUrl(tenant.logo_url || '');
      setLogoDaerahUrl(tenant.logo_daerah_url || '');
      setKepalaSekolah(tenant.kepala_sekolah || '');
      setNipKepala(tenant.nip_kepala || '');
      
      const rawLines = tenant.print_header_lines && tenant.print_header_lines.length > 0
        ? tenant.print_header_lines
        : [];
      
      const parsed: PrintHeaderLine[] = rawLines.map(line => {
        if (typeof line === 'object' && line !== null) {
          return line as PrintHeaderLine;
        }
        try {
          const parsedObj = JSON.parse(line);
          if (parsedObj && typeof parsedObj === 'object' && 'text' in parsedObj) {
            return parsedObj;
          }
        } catch (e) {
          // ignore
        }
        return { text: line };
      });
      setHeaderLines(parsed);
    }
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
        nip_kepala: nipKepala
      };

      const response = await updateTenant(tenant.id, payload);
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
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Pengaturan Sekolah</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Kelola identitas, Kop Surat dinamis, dan akun sekolah Anda.</p>
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
      <Card className="shadow-sm border border-slate-100 dark:border-slate-800">
        <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 py-4">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
            Identitas Sekolah & Konfigurasi Kop Dokumen
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isEditing ? (
            // ================= EDIT MODE =================
            <div className="space-y-6 animate-fadeIn">
              
              {/* ✨ LIVE PREVIEW KOP SURAT (Dinamis & Real-time) */}
              <div className="p-5 border border-indigo-200 dark:border-indigo-900 bg-indigo-50/10 dark:bg-indigo-950/5 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-indigo-500 animate-pulse" />
                    Live Preview Kop Surat Absenta (Dokumen Cetak)
                  </span>
                  
                  {/* Preview Selector Tabs */}
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('portrait')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${previewVariant === 'portrait' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      A4 Portrait
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('landscape')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${previewVariant === 'landscape' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      A4 Landscape
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVariant('compact')}
                      className={`px-2.5 py-1 rounded-md transition-colors ${previewVariant === 'compact' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      Thermal Receipt
                    </button>
                  </div>
                </div>

                {/* Paper sheet replica */}
                <div className="p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl shadow-inner overflow-x-auto min-h-[140px] flex items-center justify-center">
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

              {/* Kepala Sekolah & NIP */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4 border-slate-100 dark:border-slate-800">
                <div className="grid gap-2">
                  <Label htmlFor="kepala_sekolah" className="text-xs font-bold text-slate-500 uppercase">Nama Kepala Sekolah (Bila diisi, override Struktur)</Label>
                  <Input
                    id="kepala_sekolah"
                    value={kepalaSekolah}
                    onChange={(e) => setKepalaSekolah(e.target.value)}
                    placeholder="Contoh: Drs. H. Budi Setiadi, M.Pd."
                  />
                  <p className="text-[10px] text-slate-400">Jika dikosongkan, sistem akan otomatis mengambil nama dari Struktur Organisasi yang menduduki jabatan Kepala Sekolah.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nip_kepala" className="text-xs font-bold text-slate-500 uppercase">NIP Kepala Sekolah (Bila diisi, override Struktur)</Label>
                  <Input
                    id="nip_kepala"
                    value={nipKepala}
                    onChange={(e) => setNipKepala(e.target.value)}
                    placeholder="Contoh: 197402092003121002"
                  />
                  <p className="text-[10px] text-slate-400">Jika dikosongkan, sistem akan otomatis mengambil NIP dari Struktur Organisasi yang menduduki jabatan Kepala Sekolah.</p>
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
                          <span className="text-[9px] text-slate-400 font-bold">px</span>
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
                  
                  <div className="pt-2 flex justify-start">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setHeaderLines([...headerLines, { text: '', fontSize: 10, bold: true, fontFamily: 'Inter' }])}
                      className="border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Tambah Baris Kedinasan/Kop
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // ================= VIEW MODE =================
            <div className="space-y-6">
              
              {/* ✨ KOP PREVIEW (IN VIEW MODE) */}
              <div className="p-8 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl shadow-inner overflow-x-auto">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-2">
                    <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="h-4 w-4 text-slate-400" />
                      Pratinjau Kop Surat (Real Configuration)
                    </span>
                    
                    <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setPreviewVariant('portrait')}
                        className={`px-3 py-1 rounded-md transition-all ${previewVariant === 'portrait' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Portrait
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewVariant('landscape')}
                        className={`px-3 py-1 rounded-md transition-all ${previewVariant === 'landscape' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Landscape
                      </button>
                    </div>
                  </div>
                  
                  {/* Container dengan lebar statis untuk mensimulasikan kertas agar tidak terpengaruh zoom browser secara fluid */}
                  <div className="flex justify-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className={`bg-white dark:bg-slate-950 shadow-lg p-8 border border-slate-200 dark:border-slate-800 transition-all duration-300 ${previewVariant === 'landscape' ? 'w-[1000px]' : 'w-[800px]'} min-w-[800px]`}>
                      <PrintHeader variant={previewVariant} tenantInfo={liveTenantInfo} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                {/* Logo Daerah */}
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/30">
                  <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Logo Kiri (Pemda/Yayasan)</span>
                  {logoDaerahUrl ? (
                    <img src={logoDaerahUrl} alt="Logo Pemda" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded font-semibold text-[10px] text-slate-400">Belum Ada</div>
                  )}
                </div>

                {/* Logo Sekolah */}
                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/30">
                  <span className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Logo Kanan (Sekolah)</span>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo Sekolah" className="h-16 w-auto object-contain" />
                  ) : (
                    <div className="h-16 w-16 bg-slate-100 flex items-center justify-center rounded font-semibold text-[10px] text-slate-400">Belum Ada</div>
                  )}
                </div>

                {/* Status Langganan info */}
                <div className="flex flex-col justify-center p-5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Paket Langganan</span>
                    <p className="text-base font-bold text-slate-800 dark:text-slate-200">{tenant.subscription_plan || 'Free'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Status Akun</span>
                    <div className="mt-0.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tenant.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'SUSPENDED' ? 'bg-yellow-100 text-yellow-800' :
                        isPendingDeletion ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {isPendingDeletion ? 'Dalam Penghapusan' : tenant.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Sekolah View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Alamat Resmi</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Phone className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">No. Telepon</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-slate-100/50 pt-2.5 dark:border-slate-800/50">
                    <ShieldAlert className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Kepala Sekolah</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {tenant.kepala_sekolah || (
                          <span className="text-slate-400 italic text-xs">Otomatis dari Struktur Organisasi</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Email Sekolah</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{email || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Globe className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Website</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{website || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5 border-t border-slate-100/50 pt-2.5 dark:border-slate-800/50">
                    <Clock className="h-4 w-4 text-slate-400 mt-1 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">NIP Kepala Sekolah</span>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {tenant.nip_kepala || (
                          <span className="text-slate-400 italic text-xs">Otomatis dari Struktur Organisasi</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone Card */}
      <Card className="border-red-100 dark:border-red-950 bg-red-50/20 dark:bg-red-950/5 shadow-sm">
        <CardHeader className="py-4 border-b border-red-50/50">
          <CardTitle className="flex items-center text-sm font-bold text-red-700 dark:text-red-400">
            <ShieldAlert className="h-4.5 w-4.5 mr-2" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
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
