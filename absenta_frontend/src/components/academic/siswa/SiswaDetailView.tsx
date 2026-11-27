import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Check, 
  Edit3, 
  Key, 
  User, 
  Users, 
  MapPin, 
  Award, 
  QrCode, 
  Save, 
  Loader2, 
  Camera, 
  Upload, 
  X, 
  RotateCcw, 
  AlertCircle, 
  Briefcase, 
  Shield, 
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Phone,
  Mail,
  Calendar,
  GraduationCap,
  CreditCard,
  Building2,
  Send,
  HeartHandshake,
  LogIn
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useConfirm from '../../../hooks/useConfirm';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { useAuthStore } from '../../../store/authStore';
import { Button, Modal, SearchableSelect, Input, Label, Textarea, Loader } from '../../ui';
import { toast } from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiswaById, updateSiswa, sendParentAccess, siswaQueryKeys } from '../../../api/academic/siswa.api';
import { useProvinsiOptions, useKabupatenOptions, useKecamatanOptions, useKelurahanOptions } from '../../../hooks/useWilayahOptions';
import { formatAlamatLengkap } from '../../../lib/alamat.util';
import { uploadSiswaDocument, getMemberDocPreviewUrl } from '../../../api/memberDocs.api';
import { cn, resolveProfilePhotoUrl } from '../../../lib/utils';
import { FieldDocumentTrigger } from '../../documents/FieldDocumentTrigger';
import { normalizeStudentIdentity } from '@/utils/academic/academicIdentityNormalizer';
import { SelfMemberDocsSection } from '../../documents/SelfMemberDocsSection';
import { 
  getKelasForDropdown, 
  PEKERJAAN_OPTIONS,
  PENDIDIKAN_OPTIONS,
  PENGHASILAN_OPTIONS,
  HUBUNGAN_WALI_OPTIONS,
  TRANSPORTASI_OPTIONS,
  AGAMA_OPTIONS,
  type DropdownOption 
} from '../../../api/dropdown.api';
import { SiswaTimelineAndExitTab } from './SiswaTimelineAndExitTab';
import { SiswaHistory } from './SiswaHistory';
import { SiswaOnboardingModal, type SectionEditType } from './SiswaOnboardingModal';
import { History, FileText, Activity } from 'lucide-react';

// ─── Webcam Modal ─────────────────────────────────────────────────────────────
interface WebcamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const WebcamModal: React.FC<WebcamModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  useEffect(() => {
    if (!isOpen) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Browser tidak mendukung fitur kamera live.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: { ideal: 640 }, height: { ideal: 640 } } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setCameraError('Gagal mengakses kamera. Pastikan izin kamera telah diberikan.'));

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isOpen, facingMode]);

  const handleSnap = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) onCapture(new File([blob], `foto_siswa_${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onClose();
      }, 'image/jpeg', 0.9);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <Camera size={18} className="text-indigo-400" />
            <span>Kamera — Pas Foto Siswa</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')}
              className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer border border-slate-700">
              <RotateCcw size={13} /><span>Switch</span>
            </button>
            <button type="button" onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="relative aspect-square w-full rounded-2xl bg-black overflow-hidden border-2 border-indigo-500/50 flex items-center justify-center">
          {cameraError ? (
            <div className="p-4 text-xs font-bold text-rose-400 text-center space-y-2">
              <AlertCircle size={24} className="mx-auto" /><p>{cameraError}</p>
            </div>
          ) : (
            <video ref={videoRef} autoPlay playsInline muted
              className={`w-full h-full object-cover${facingMode === 'user' ? ' scale-x-[-1]' : ''}`} />
          )}
        </div>
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-bold border-slate-700 text-slate-300 cursor-pointer">Batal</Button>
          {!cameraError && (
            <button type="button" onClick={handleSnap}
              className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all active:scale-95">
              <Camera size={16} /><span>📸 Ambil Foto</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface SiswaDetailViewProps {
  siswaId: string;
  onBack: () => void;
  onEdit?: (siswaId: string) => void;
  canEdit?: boolean;
}

export const SiswaDetailView: React.FC<SiswaDetailViewProps> = ({
  siswaId,
  onBack,
  canEdit = true,
}) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { isAdmin } = useCapabilities();
  const { user, isImpersonating, impersonateSiswaAction } = useAuthStore();
  const isSuperAdmin = user?.role?.name === 'SUPERADMIN' || user?.tenant_id === 'system';
  const canImpersonate = (isAdmin || isSuperAdmin) && !isImpersonating;
  const [isImpersonatingThis, setIsImpersonatingThis] = useState(false);

  // Fetch Siswa Detail
  const { data: siswa, isLoading, refetch, isFetching } = useQuery({
    queryKey: siswaQueryKeys.detail(siswaId),
    queryFn: () => getSiswaById(siswaId),
    enabled: !!siswaId,
    staleTime: 2 * 60 * 1000,
  });

  // Local photo upload states
  const [activeViewTab, setActiveViewTab] = useState<'profile' | 'history' | 'timeline' | 'docs'>('profile');
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);
  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Account Settings Form State
  const [noHpOrtu, setNoHpOrtu] = useState('');
  const [emailSiswa, setEmailSiswa] = useState('');
  const [passwordBaru, setPasswordBaru] = useState('');
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSendingWa, setIsSendingWa] = useState(false);

  // Per-Section Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditSection, setActiveEditSection] = useState<SectionEditType>('all');
  const [isReactivatingDirect, setIsReactivatingDirect] = useState(false);

  // Editable Form Fields
  const [editNamaSiswa, setEditNamaSiswa] = useState('');
  const [editNis, setEditNis] = useState('');
  const [editNisn, setEditNisn] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editNoRfid, setEditNoRfid] = useState('');
  const [editNoKk, setEditNoKk] = useState('');
  const [editJenisKelamin, setEditJenisKelamin] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editTanggalLahir, setEditTanggalLahir] = useState('');
  const [editAgama, setEditAgama] = useState('');
  const [editTinggiBadan, setEditTinggiBadan] = useState('');
  const [editBeratBadan, setEditBeratBadan] = useState('');
  const [editAnakKe, setEditAnakKe] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editKelasId, setEditKelasId] = useState('');
  const [editSekolahAsal, setEditSekolahAsal] = useState('');
  const [editNoIjazahSmp, setEditNoIjazahSmp] = useState('');
  const [editTanggalMasuk, setEditTanggalMasuk] = useState('');
  const [editTanggalKeluar, setEditTanggalKeluar] = useState('');
  
  // Orang Tua & Wali
  const [editNamaAyah, setEditNamaAyah] = useState('');
  const [editNikAyah, setEditNikAyah] = useState('');
  const [editNoHpAyah, setEditNoHpAyah] = useState('');
  const [editPekerjaanAyah, setEditPekerjaanAyah] = useState('');
  const [editPendidikanAyah, setEditPendidikanAyah] = useState('');
  const [editPenghasilanAyah, setEditPenghasilanAyah] = useState('');
  const [editNamaIbu, setEditNamaIbu] = useState('');
  const [editNikIbu, setEditNikIbu] = useState('');
  const [editNoHpIbu, setEditNoHpIbu] = useState('');
  const [editPekerjaanIbu, setEditPekerjaanIbu] = useState('');
  const [editPendidikanIbu, setEditPendidikanIbu] = useState('');
  const [editPenghasilanIbu, setEditPenghasilanIbu] = useState('');
  const [editNamaWali, setEditNamaWali] = useState('');
  const [editNikWali, setEditNikWali] = useState('');
  const [editNoHpWali, setEditNoHpWali] = useState('');
  const [editHubunganWali, setEditHubunganWali] = useState('');
  const [editPekerjaanWali, setEditPekerjaanWali] = useState('');
  const [editPenghasilanWali, setEditPenghasilanWali] = useState('');
  const [editAlamatOrtu, setEditAlamatOrtu] = useState('');
  const [editHobi, setEditHobi] = useState('');
  const [editCitaCita, setEditCitaCita] = useState('');

  // Alamat
  const [editAlamat, setEditAlamat] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editKabupaten, setEditKabupaten] = useState('');
  const [editProvinsi, setEditProvinsi] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editKodePos, setEditKodePos] = useState('');
  const [editTransportasi, setEditTransportasi] = useState('');

  // Kelas Dropdown
  const [kelasList, setKelasList] = useState<DropdownOption[]>([]);
  useEffect(() => {
    getKelasForDropdown().then(setKelasList).catch(() => {});
  }, []);

  // Cascading Wilayah Hooks
  const { options: provinsiOptions } = useProvinsiOptions();
  const { options: kabupatenOptions } = useKabupatenOptions(editProvinsi);
  const { options: kecamatanOptions } = useKecamatanOptions(editKabupaten);
  const { options: kelurahanOptions } = useKelurahanOptions(editKecamatan, editKabupaten);

  // Sync state when siswa data arrives
  useEffect(() => {
    if (siswa) {
      const formatDateForInput = (val?: string | null) => {
        if (!val) return '';
        try {
          const str = String(val);
          if (str.includes('T')) return str.split('T')[0];
          const d = new Date(str);
          return isNaN(d.getTime()) ? str : d.toISOString().split('T')[0];
        } catch {
          return '';
        }
      };

      const matchOptionLabel = (val: string | null | undefined, options: Array<{ value: string; label: string }>): string => {
        if (!val) return '';
        const cleanVal = String(val).trim().toLowerCase();
        const byLabel = options.find(o => o.label.toLowerCase() === cleanVal);
        if (byLabel) return byLabel.label;
        const byValue = options.find(o => o.value.toLowerCase() === cleanVal);
        if (byValue) return byValue.label;
        const normVal = cleanVal.replace(/[\s\-_]+/g, '');
        const byNorm = options.find(o =>
          o.label.toLowerCase().replace(/[\s\-_]+/g, '') === normVal ||
          o.value.toLowerCase().replace(/[\s\-_]+/g, '') === normVal
        );
        if (byNorm) return byNorm.label;
        return val;
      };

      const hasValidWali = Boolean(siswa.nama_wali && String(siswa.nama_wali).trim());
      const cleanAlamat = siswa.alamat || '';
      const cleanDusun = siswa.dusun && siswa.dusun !== cleanAlamat ? siswa.dusun : '';

      setEditNamaSiswa(siswa.nama_siswa || '');
      setEditNis(siswa.nis || '');
      setEditNisn(siswa.nisn || '');
      setEditNik(siswa.nik || '');
      setEditNoRfid((siswa as any).no_rfid || '');
      setEditNoKk((siswa as any).no_kk || '');
      setEditJenisKelamin(siswa.jenis_kelamin || 'L');
      setEditTempatLahir(siswa.tempat_lahir || '');
      setEditTanggalLahir(formatDateForInput(siswa.tanggal_lahir));
      setEditAgama(matchOptionLabel((siswa as any).agama, AGAMA_OPTIONS) || 'Islam');
      setEditTinggiBadan(siswa.tinggi_badan ? String(siswa.tinggi_badan) : '');
      setEditBeratBadan(siswa.berat_badan ? String(siswa.berat_badan) : '');
      setEditAnakKe(siswa.anak_ke ? String(siswa.anak_ke) : '');
      setEditHobi((siswa as any).hobi || '');
      setEditCitaCita((siswa as any).cita_cita || '');
      setEditStatus(siswa.status || 'AKTIF');
      setEditKelasId(siswa.kelas_id || (siswa as any).Kelas?.id || '');
      setEditSekolahAsal(siswa.sekolah_asal || '');
      setEditNoIjazahSmp(siswa.no_ijazah_smp || '');
      setEditTanggalMasuk(formatDateForInput(siswa.tanggal_masuk));
      setEditTanggalKeluar(formatDateForInput(siswa.tanggal_keluar));

      setEditNamaAyah(siswa.nama_ayah || '');
      setEditNikAyah(siswa.nik_ayah || '');
      setEditNoHpAyah(siswa.no_hp_ayah || '');
      setEditPekerjaanAyah(matchOptionLabel(siswa.pekerjaan_ayah, PEKERJAAN_OPTIONS));
      setEditPendidikanAyah(matchOptionLabel(siswa.pendidikan_ayah, PENDIDIKAN_OPTIONS));
      setEditPenghasilanAyah(matchOptionLabel(siswa.penghasilan_ayah, PENGHASILAN_OPTIONS));
      setEditNamaIbu(siswa.nama_ibu || '');
      setEditNikIbu(siswa.nik_ibu || '');
      setEditNoHpIbu(siswa.no_hp_ibu || '');
      setEditPekerjaanIbu(matchOptionLabel(siswa.pekerjaan_ibu, PEKERJAAN_OPTIONS));
      setEditPendidikanIbu(matchOptionLabel(siswa.pendidikan_ibu, PENDIDIKAN_OPTIONS));
      setEditPenghasilanIbu(matchOptionLabel(siswa.penghasilan_ibu, PENGHASILAN_OPTIONS));
      setEditNamaWali(hasValidWali ? (siswa.nama_wali || '') : '');
      setEditNikWali(hasValidWali ? (siswa.nik_wali || '') : '');
      setEditNoHpWali(hasValidWali ? (siswa.no_hp_wali || '') : '');
      setEditHubunganWali(hasValidWali ? matchOptionLabel(siswa.hubungan_wali, HUBUNGAN_WALI_OPTIONS) : '');
      setEditPekerjaanWali(hasValidWali ? matchOptionLabel(siswa.pekerjaan_wali, PEKERJAAN_OPTIONS) : '');
      setEditPenghasilanWali(hasValidWali ? matchOptionLabel(siswa.penghasilan_wali, PENGHASILAN_OPTIONS) : '');
      setEditAlamatOrtu((siswa as any).alamat_ortu || '');

      setNoHpOrtu(siswa.no_hp_ortu || '');
      setEmailSiswa((siswa as any).email || '');

      setEditAlamat(cleanAlamat);
      setEditDusun(cleanDusun);
      setEditKelurahan(siswa.kelurahan || '');
      setEditKecamatan(siswa.kecamatan || '');
      setEditKabupaten(siswa.kabupaten || '');
      setEditProvinsi(siswa.provinsi || '');
      setEditRt(siswa.rt || '');
      setEditRw(siswa.rw || '');
      setEditKodePos(siswa.kode_pos || '');
      setEditTransportasi(matchOptionLabel(siswa.transportasi, TRANSPORTASI_OPTIONS));
    }
  }, [siswa]);

  const handleOpenEditSection = (section: SectionEditType) => {
    setActiveEditSection(section);
    setIsEditModalOpen(true);
  };

  const handleReactivateDirect = useCallback(async () => {
    if (!siswaId || !siswa) return;
    if (!window.confirm(`Kembalikan status siswa ${siswa.nama_siswa} menjadi AKTIF? Akun login LMS siswa akan diaktifkan kembali dan tanggal/alasan keluar akan dibersihkan.`)) {
      return;
    }

    try {
      setIsReactivatingDirect(true);
      const res = await updateSiswa(siswaId, {
        status: 'AKTIF',
        tanggal_keluar: null,
        alasan_keluar: null,
      });

      if (res.success) {
        toast.success(`Siswa ${siswa.nama_siswa} berhasil diaktifkan kembali!`);
        setEditStatus('AKTIF');
        setEditTanggalKeluar('');
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.detail(siswaId) });
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ['siswa-options-list'] });
        queryClient.invalidateQueries({ queryKey: ['academic-stats'] });
        queryClient.invalidateQueries({ queryKey: ['classmates-roster-list'] });
        refetch();
      } else {
        toast.error(res.message || 'Gagal mengaktifkan kembali siswa');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsReactivatingDirect(false);
    }
  }, [siswaId, siswa, queryClient, refetch]);

  // Submit Account Update
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siswaId) return;

    try {
      setIsSavingAccount(true);
      const payload: any = {
        no_hp_ortu: noHpOrtu ? noHpOrtu.trim() : null,
      };
      if (emailSiswa && emailSiswa.trim()) {
        payload.email = emailSiswa.trim().toLowerCase();
      }
      if (passwordBaru && passwordBaru.trim()) {
        payload.password = passwordBaru.trim();
      }

      await updateSiswa(siswaId, payload);
      toast.success('Pengaturan akun & kontak siswa berhasil disimpan!');
      setPasswordBaru('');
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.detail(siswaId) });
      queryClient.invalidateQueries({ queryKey: siswaQueryKeys.lists() });
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan akun siswa.';
      toast.error(msg);
    } finally {
      setIsSavingAccount(false);
    }
  };

  // Kirim Akses Orang Tua via WhatsApp
  const handleSendAccessWhatsApp = async () => {
    if (!siswaId) return;
    try {
      setIsSendingWa(true);
      const res = await sendParentAccess(siswaId);
      if (res.success) {
        toast.success(res.message || 'Pesan WhatsApp akses portal orang tua berhasil dikirim!');
      } else {
        toast.error(res.message || 'Gagal mengirim WhatsApp.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Gagal mengirim akses WhatsApp.');
    } finally {
      setIsSendingWa(false);
    }
  };

  // Photo upload handler
  const handleUploadPhoto = useCallback(async (file: File) => {
    if (!siswaId) return;
    if (!file.type.startsWith('image/')) { toast.error('File harus berupa gambar (JPG, PNG, WebP).'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Ukuran file maksimum 5 MB.'); return; }

    const blobUrl = URL.createObjectURL(file);
    setLocalPhotoPreview(blobUrl);
    setIsUploadingPhoto(true);
    const tid = toast.loading('Mengunggah pas foto siswa...');
    try {
      const res = await uploadSiswaDocument({ siswaId, file, judul: 'Pas Foto Siswa', kategori: 'FOTO' });
      if (res.success && res.data?.id) {
        const servedUrl = getMemberDocPreviewUrl('SISWA', siswaId, res.data.id);
        setLocalPhotoPreview(servedUrl);
        toast.success('Pas foto siswa berhasil diunggah!', { id: tid });
        queryClient.invalidateQueries({ queryKey: siswaQueryKeys.detail(siswaId) });
        refetch();
      } else {
        toast.error(res.message || 'Gagal mengunggah foto.', { id: tid });
        setLocalPhotoPreview(null);
      }
    } catch (err: any) {
      toast.error('Gagal mengunggah foto.', { id: tid });
      setLocalPhotoPreview(null);
    } finally {
      setIsUploadingPhoto(false);
      URL.revokeObjectURL(blobUrl);
    }
  }, [siswaId, queryClient, refetch]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleUploadPhoto(f); e.target.value = '';
  }, [handleUploadPhoto]);

  const studentIdentity = normalizeStudentIdentity(siswa);
  const rawSiswaPhoto = studentIdentity.fotoUrl;
  const resolvedPhotoUrl = rawSiswaPhoto ? resolveProfilePhotoUrl(rawSiswaPhoto) : null;
  const displayPhotoUrl = localPhotoPreview ?? resolvedPhotoUrl;
  const siswaInitials = studentIdentity.initials;
  const namaKelas = studentIdentity.namaKelas;
  const namaJurusan = studentIdentity.jurusanNama;

  const handleImpersonate = useCallback(async () => {
    if (!siswa) return;
    try {
      const ok = await confirm({
        title: `Login Sebagai ${siswa.nama_siswa}?`,
        description: (
          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-start gap-3">
              <div className="bg-indigo-600 text-white p-2 rounded-xl shrink-0 shadow-sm">
                <LogIn size={20} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                  Mode Pengawasan Impersonasi Siswa
                </p>
                <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  Anda akan masuk ke dalam sistem sebagai <strong>{siswa.nama_siswa}</strong> ({siswa.nis ? `NIS: ${siswa.nis}` : 'Siswa'}{namaKelas ? ` • ${namaKelas}` : ''}). Anda dapat memeriksa dashboard siswa, jadwal KBM, kartu ujian, presensi, dan simulasi CBT dari sudut pandang siswa tersebut.
                </p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
              💡 <strong>Tips:</strong> Anda dapat kembali ke akun Administrator kapan saja menggunakan tombol di banner oranye pada bagian atas layar.
            </div>
          </div>
        ),
        confirmText: 'Ya, Login Sebagai Siswa',
        cancelText: 'Batal'
      });

      if (!ok) return;

      setIsImpersonatingThis(true);
      await impersonateSiswaAction(siswa.id);
      toast.success(`Berhasil login sebagai ${siswa.nama_siswa}`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Gagal login sebagai siswa');
    } finally {
      setIsImpersonatingThis(false);
    }
  }, [confirm, impersonateSiswaAction, navigate, siswa, namaKelas]);

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-4">
        <Loader size="lg" />
        <p className="text-xs font-bold text-slate-500 animate-pulse">Memuat profil lengkap siswa...</p>
      </div>
    );
  }

  if (!siswa) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-sm font-bold text-red-500">Data siswa tidak ditemukan.</p>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={14} className="mr-1.5" /> Kembali ke Daftar
        </Button>
      </div>
    );
  }

  const alamatLengkapFormatted = formatAlamatLengkap({
    alamat: editAlamat,
    rt: editRt,
    rw: editRw,
    dusun: editDusun,
    kelurahan: editKelurahan,
    kecamatan: editKecamatan,
    kabupaten: editKabupaten,
    provinsi: editProvinsi,
    kode_pos: editKodePos,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-5 sm:space-y-6"
    >
      {/* Webcam Modal */}
      <WebcamModal isOpen={isWebcamOpen} onClose={() => setIsWebcamOpen(false)} onCapture={handleUploadPhoto} />

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Top Breadcrumb & Action Navigation Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            className="h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ArrowLeft size={15} />
            <span>Kembali ke Daftar Siswa</span>
          </Button>
          <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 hidden sm:block" />
          <div className="hidden sm:block">
            <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Profil &amp; Biodata: {siswa.nama_siswa}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium font-mono">
              NISN: {siswa.nisn || '-'} • NIS: {siswa.nis || '-'} • Kelas: {namaKelas}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEditSection('all')}
              className="h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30 cursor-pointer"
              title="Buka Formulir Edit Biodata Lengkap Siswa"
            >
              <Edit3 size={14} />
              <span className="hidden sm:inline">Edit Biodata Lengkap</span>
            </Button>
          )}
          {canImpersonate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleImpersonate}
              disabled={isImpersonatingThis}
              className="h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/30 cursor-pointer"
              title={`Login sebagai ${siswa.nama_siswa} (Khusus Administrator)`}
            >
              {isImpersonatingThis ? (
                <Loader size="sm" className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogIn size={14} />
              )}
              <span className="hidden sm:inline">Login Sebagai Siswa</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3 rounded-xl text-xs font-bold"
            title="Segarkan Data"
          >
            <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* 1. TOP ROW: 2 COLUMNS (Avatar Card & Account Settings Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        
        {/* Left Column (Avatar & Quick Info Card) - 4 cols on lg */}
        <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5 text-center sm:text-left">
          <div className="space-y-4">
            {/* Photo Avatar Frame with hover overlay */}
            <div className="relative w-28 h-28 mx-auto group cursor-pointer">
              <div className="w-full h-full rounded-3xl overflow-hidden border-2 border-indigo-500/30 shadow-md">
                {isUploadingPhoto ? (
                  <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                    <Loader2 size={28} className="text-indigo-500 animate-spin" />
                  </div>
                ) : displayPhotoUrl ? (
                  <img src={displayPhotoUrl} alt={siswa.nama_siswa}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-indigo-500/10 dark:bg-indigo-950/40 flex items-center justify-center">
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                      {siswaInitials}
                    </span>
                  </div>
                )}
              </div>

              {/* Hover overlay for Camera / Upload */}
              <div className="absolute inset-0 rounded-3xl bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 p-2">
                <button type="button" onClick={() => setIsWebcamOpen(true)}
                  className="w-full py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer">
                  <Camera size={11} /><span>Kamera</span>
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer border border-slate-700">
                  <Upload size={11} /><span>Galeri</span>
                </button>
              </div>

              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <Camera size={10} className="text-white" />
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setIsWebcamOpen(true)}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200/60 dark:border-indigo-800/40"
                title="Ambil foto via webcam / kamera"
              >
                <Camera size={11} />
                <span>Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                title="Unggah foto dari galeri / file"
              >
                <Upload size={11} />
                <span>Galeri</span>
              </button>
            </div>

            {/* Nama & Badges Siswa */}
            <div className="text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                  {siswa.nama_siswa}
                </h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditSection('identitas')}
                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Nama Siswa & Identitas"
                  >
                    <Edit3 size={13} />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 justify-center pt-0.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl border text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                  <GraduationCap size={11} />
                  <span>Kelas {namaKelas}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-xl border text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                  <Shield size={11} />
                  <span>{editStatus || 'AKTIF'}</span>
                </span>
              </div>
            </div>

            {/* Quick Detail Key-Value List */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-dashed border-slate-200/80 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Blok Identitas Pokok</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditSection('identitas')}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={11} />
                    <span>Edit Identitas</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NISN</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{siswa.nisn || '-'}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection('identitas')}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                      title="Edit NISN"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}
                  {siswaId && (
                    <FieldDocumentTrigger
                      entityType="SISWA"
                      entityId={siswaId}
                      entityName={siswa.nama_siswa}
                      kategori="NISN"
                      label="NISN"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIS</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{siswa.nis || '-'}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection('identitas')}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                      title="Edit NIS"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">NIK (KTP/KIA)</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNik || '-'}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection('identitas')}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                      title="Edit NIK"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}
                  {siswaId && (
                    <FieldDocumentTrigger
                      entityType="SISWA"
                      entityId={siswaId}
                      entityName={siswa.nama_siswa}
                      kategori="KK"
                      label="KK"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">No. Kartu RFID</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{siswa.no_rfid || '-'}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection('identitas')}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                      title="Edit RFID"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Rombel Kelas</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{namaKelas}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditSection('identitas')}
                      className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                      title="Pindah / Edit Kelas"
                    >
                      <Edit3 size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Jurusan</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{namaJurusan}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Sekolah Asal</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{editSekolahAsal || '-'}</span>
              </div>
            </div>
          </div>

          {/* Bottom Full-Width QR Card Digital Button */}
          <Button
            type="button"
            onClick={() => toast('Membuka Cetak Kartu Pelajar Digital...', { icon: '💳' })}
            className="w-full h-10 rounded-2xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white border-none flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
          >
            <QrCode size={16} />
            <span>Lihat Kartu Pelajar Digital</span>
          </Button>
        </div>

        {/* Right Column (Pengaturan Akun & Kontak Siswa/Ortu Card) - 8 cols on lg */}
        <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header Title */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Edit3 size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                    Pengaturan Akun LMS &amp; Kontak Orang Tua
                  </h3>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  Perbarui nomor WhatsApp orang tua/wali, email siswa, atau set kata sandi baru untuk login siswa
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendAccessWhatsApp}
                disabled={isSendingWa || !noHpOrtu}
                className="h-8 px-3 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 flex items-center gap-1.5 cursor-pointer"
                title="Kirim kredensial login portal orang tua ke WhatsApp"
              >
                {isSendingWa ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Kirim WA Akses Ortu</span>
              </Button>
            </div>

            {/* Input Fields Grid Form */}
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <Label htmlFor="noHpOrtu">
                    Nomor WhatsApp Orang Tua / Siswa
                  </Label>
                  <Input
                    id="noHpOrtu"
                    type="text"
                    value={noHpOrtu}
                    onChange={(e) => setNoHpOrtu(e.target.value)}
                    placeholder="628123456789"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="emailSiswa">
                    Email Siswa (Opsional)
                  </Label>
                  <Input
                    id="emailSiswa"
                    type="email"
                    value={emailSiswa}
                    onChange={(e) => setEmailSiswa(e.target.value)}
                    placeholder="siswa@absenta.sch.id"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  <Key size={14} className="text-amber-500" />
                  <span>SET KATA SANDI LOGIN LMS (OPSIONAL)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="passwordBaruSiswa">
                      Kata Sandi Baru (Kosongkan jika tidak ingin mengubah)
                    </Label>
                    <Input
                      id="passwordBaruSiswa"
                      type="password"
                      value={passwordBaru}
                      onChange={(e) => setPasswordBaru(e.target.value)}
                      placeholder="Masukkan kata sandi baru untuk akun siswa..."
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSavingAccount}
                  className="h-10 px-6 rounded-xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white border-none cursor-pointer shadow-md shadow-indigo-600/20 flex items-center gap-2"
                >
                  {isSavingAccount ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Simpan Perubahan Akun</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 2. BOTTOM ROW: 4 GRID CARDS (DATA PRIBADI, AKADEMIK, ORANG TUA/WALI, KONTAK & ALAMAT) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Card 1: DATA PRIBADI SISWA */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                DATA PRIBADI SISWA
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('pribadi')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Data Pribadi Siswa"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jenis Kelamin</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {editJenisKelamin === 'L' ? 'Laki - laki' : 'Perempuan'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Agama</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editAgama || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tempat Lahir</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editTempatLahir || '-'}</p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Lahir</p>
                {siswaId && (
                  <FieldDocumentTrigger
                    entityType="SISWA"
                    entityId={siswaId}
                    entityName={siswa.nama_siswa}
                    kategori="AKTA"
                    label="Akta Lahir"
                  />
                )}
              </div>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editTanggalLahir || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tinggi / Berat Badan / Anak Ke-</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {editTinggiBadan ? `${editTinggiBadan} cm` : '-'} / {editBeratBadan ? `${editBeratBadan} kg` : '-'} / {editAnakKe ? `Ke-${editAnakKe}` : '-'}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold text-slate-400 uppercase">No. Kartu Keluarga (KK)</p>
                {siswaId && (
                  <FieldDocumentTrigger
                    entityType="SISWA"
                    entityId={siswaId}
                    entityName={siswa.nama_siswa}
                    kategori="KK"
                    label="KK"
                  />
                )}
              </div>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNoKk || '-'}</p>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <p className="text-[10px] font-bold text-slate-400 uppercase">NIK (KTP / KIA)</p>
                {siswaId && (
                  <FieldDocumentTrigger
                    entityType="SISWA"
                    entityId={siswaId}
                    entityName={siswa.nama_siswa}
                    kategori="KK"
                    label="KK"
                  />
                )}
              </div>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNik || '-'}</p>
            </div>
          </div>
        </div>

        {/* Card 2: DATA AKADEMIK & ASAL SEKOLAH */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <GraduationCap size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                AKADEMIK &amp; ASAL SEKOLAH
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('akademik')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Data Akademik"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NISN</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{editNisn || '-'}</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditSection('identitas')}
                    className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                    title="Edit NISN"
                  >
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">NIS</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{editNis || '-'}</p>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleOpenEditSection('identitas')}
                    className="text-slate-400 hover:text-indigo-600 p-0.5 rounded cursor-pointer"
                    title="Edit NIS"
                  >
                    <Edit3 size={11} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status Siswa</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={cn(
                  "font-extrabold px-2 py-0.5 rounded-lg text-xs",
                  editStatus === 'AKTIF' 
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                )}>
                  {editStatus || 'AKTIF'}
                </span>
                {canEdit && editStatus !== 'AKTIF' && (
                  <button
                    type="button"
                    onClick={handleReactivateDirect}
                    disabled={isReactivatingDirect}
                    className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    title="Aktifkan kembali siswa ini (Batalkan Mutasi/Keluar)"
                  >
                    <RotateCcw size={10} />
                    <span>{isReactivatingDirect ? 'Mengaktifkan...' : 'Aktifkan Kembali'}</span>
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Kelas Aktif</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{namaKelas}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Jurusan</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{namaJurusan}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sekolah Asal</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editSekolahAsal || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">No. Ijazah SMP/MTS</p>
              <p className="font-mono font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editNoIjazahSmp || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Masuk</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editTanggalMasuk || '-'}</p>
            </div>
          </div>
        </div>

        {/* Card 3: ORANG TUA & WALI */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <HeartHandshake size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                ORANG TUA &amp; WALI
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('orangtua')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Data Orang Tua"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Ayah Kandung</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editNamaAyah || '-'}</p>
              {editPekerjaanAyah && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">💼 {editPekerjaanAyah}</p>}
              {editNoHpAyah && <p className="text-[11px] font-mono text-slate-500 mt-0.5">📞 {editNoHpAyah}</p>}
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Ibu Kandung</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{editNamaIbu || '-'}</p>
              {editPekerjaanIbu && <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">💼 {editPekerjaanIbu}</p>}
              {editNoHpIbu && <p className="text-[11px] font-mono text-slate-500 mt-0.5">📞 {editNoHpIbu}</p>}
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Nama Wali (Opsional — Jika Ada)</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                {editNamaWali && editNamaWali.trim() ? (
                  <>
                    {editNamaWali}
                    {editHubunganWali ? <span className="text-[11px] font-normal text-slate-500"> ({editHubunganWali})</span> : null}
                  </>
                ) : (
                  <span className="text-slate-400 font-normal italic">Tidak Menggunakan Wali</span>
                )}
              </p>
              {editNamaWali && editNamaWali.trim() && editPekerjaanWali && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">💼 {editPekerjaanWali}</p>
              )}
              {editNamaWali && editNamaWali.trim() && editNoHpWali && (
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">📞 {editNoHpWali}</p>
              )}
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Orang Tua</p>
              <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed">{editAlamatOrtu || '-'}</p>
            </div>
          </div>
        </div>

        {/* Card 4: KONTAK & ALAMAT TEMPAT TINGGAL */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                KONTAK &amp; ALAMAT TEMPAT TINGGAL
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditSection('alamat')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title="Edit Kontak & Alamat"
            >
              <Edit3 size={14} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">No. WhatsApp</p>
                <p className="font-mono font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">{noHpOrtu || '-'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Alat Transportasi</p>
                <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{editTransportasi || '-'}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Lengkap</p>
              <p className="font-bold text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">
                {alamatLengkapFormatted || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. RIWAYAT AKADEMIK & KENAIKAN ROMBEL */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Riwayat Akademik &amp; Kenaikan Rombel</h3>
            <p className="text-xs text-slate-400">Histori kelas, semester, dan status naik kelas siswa per periode akademik</p>
          </div>
        </div>
        <SiswaHistory siswaId={siswaId} />
      </div>

      {/* 4. LINIMASA & REKAM JEJAK MUTASI SISWA */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <SiswaTimelineAndExitTab siswa={siswa} />
      </div>

      {/* 5. DOKUMEN & BERKAS DIGITAL SISWA */}
      <SelfMemberDocsSection
        entityType="SISWA"
        entityId={siswaId}
        entityName={siswa?.nama_siswa || ''}
        memberType="SISWA"
        memberId={siswaId}
        memberName={siswa?.nama_siswa || ''}
      />

      {/* ── Unified Biodata Edit Modal (Sama Persis Antara Siswa, Walas & Admin) ── */}
      <SiswaOnboardingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        siswa={siswa}
        activeSection={activeEditSection}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: siswaQueryKeys.detail(siswaId) });
          queryClient.invalidateQueries({ queryKey: siswaQueryKeys.lists() });
          queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
          refetch();
        }}
      />
    </motion.div>
  );
};

export default SiswaDetailView;
