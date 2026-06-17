import React, { useEffect, useMemo, useState } from 'react';
import { User as UserIcon, Mail } from 'lucide-react';
import { 
  Card, CardHeader, CardTitle, CardContent, 
  Button, Badge, Modal, ModalFooter, Input, Label, Alert, AlertTitle, AlertDescription, 
  Checkbox, Loader
} from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
import { changePassword } from '../../api/auth.api';
import { updateMyEmail } from '../../api/user.api';
import { UserCapabilityCard } from '../../components/dashboard/UserCapabilityCard';
import { MyJobdeskWidget } from '../../components/dashboard/MyJobdeskWidget';
import { guruApi, siswaApi } from '../../api/academic.api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import type { Guru, Siswa } from '../../types/academic';
import { 
  JENIS_KELAMIN_OPTIONS,
  AGAMA_OPTIONS,
  STATUS_SISWA_OPTIONS,
  TRANSPORTASI_OPTIONS,
  PENDIDIKAN_OPTIONS,
  PENGHASILAN_OPTIONS,
  PEKERJAAN_OPTIONS,
  HUBUNGAN_WALI_OPTIONS,
  getKelasForDropdown,
  getTahunPelajaranForDropdown,
  getSemesterByTahunPelajaranForDropdown,
  type DropdownOption
} from '../../api/dropdown.api';
import { SiswaForm } from '../../components/academic/siswa/SiswaForm';
import { GuruForm } from '../../components/academic/guru/GuruForm';

type GuruProfile = Guru;
type SiswaProfile = Siswa;

export default function ProfilePage() {
  const { user, subscription, isLoading: isAuthLoading } = useAuthStore();
  const roleName = user?.role?.name || '';
  const userId = user?.id || '';

  const [guruProfile, setGuruProfile] = useState<GuruProfile | null>(null);

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader size="lg" />
      </div>
    );
  }
  const [siswaProfile, setSiswaProfile] = useState<SiswaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<'biodata' | 'jobdesk'>('biodata');

  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      if (!userId) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        if (roleName === 'GURU') {
          const res = await guruApi.getAll({ limit: 1, ...( { user_id: userId } as any ) });
          const item = res.data?.[0] || null;
          if (mounted) setGuruProfile(item as any);
        } else if (roleName === 'SISWA') {
          const res = await siswaApi.getAll({ limit: 1, ...( { user_id: userId } as any ) });
          const item = res.data?.[0] || null;
          if (mounted) setSiswaProfile(item as any);
        }
      } catch (e: any) {
        if (mounted) setErrorMsg(e?.response?.data?.message || 'Gagal memuat profil.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchProfile();
    return () => { mounted = false; };
  }, [userId, roleName]);

  const isGuru = roleName === 'GURU';
  const isSiswa = roleName === 'SISWA';

  const summaryName = user?.full_name || '';
  const summaryEmail = user?.email || '';

  const details = useMemo(() => {
    if (isGuru && guruProfile) {
      return {
        utama1Label: 'Nama Guru',
        utama1: guruProfile.nama_guru || summaryName,
        utama2Label: 'NIP',
        utama2: guruProfile.nip || '-',
        kontakLabel: 'No HP',
        kontak: guruProfile.no_hp || '-',
        alamatLabel: 'Alamat',
        alamat: guruProfile.alamat || '-',
        lahirLabel: 'Tanggal Lahir',
        lahir: guruProfile.tanggal_lahir || '-',
        jkLabel: 'Jenis Kelamin',
        jk: guruProfile.jenis_kelamin || '-',
      };
    }
    if (isSiswa && siswaProfile) {
      return {
        utama1Label: 'Nama Siswa',
        utama1: siswaProfile.nama_siswa || summaryName,
        utama2Label: 'NIS',
        utama2: siswaProfile.nis || '-',
        kontakLabel: 'No HP',
        kontak: siswaProfile.no_hp || '-',
        alamatLabel: 'Alamat',
        alamat: siswaProfile.alamat || '-',
        lahirLabel: 'Tanggal Lahir',
        lahir: siswaProfile.tanggal_lahir || '-',
        jkLabel: 'Jenis Kelamin',
        jk: siswaProfile.jenis_kelamin || '-',
      };
    }
    return {
      utama1Label: 'Nama Lengkap',
      utama1: summaryName,
      utama2Label: 'Email',
      utama2: summaryEmail,
      kontakLabel: 'Role',
      kontak: roleName || '-',
      alamatLabel: 'Alamat',
      alamat: '-',
      lahirLabel: 'Tanggal Lahir',
      lahir: '-',
      jkLabel: 'Jenis Kelamin',
      jk: '-',
    };
  }, [isGuru, isSiswa, guruProfile, siswaProfile, summaryName, summaryEmail, roleName]);

  const [editNama, setEditNama] = useState('');
  const [editKode, setEditKode] = useState('');
  const [editHp, setEditHp] = useState('');
  const [editAlamat, setEditAlamat] = useState('');
  const [editLahir, setEditLahir] = useState('');
  const [editJK, setEditJK] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNoRfid, setEditNoRfid] = useState('');
  const [editAgama, setEditAgama] = useState('');
  const [editStatusKepegawaian, setEditStatusKepegawaian] = useState('');
  const [editPendidikanTerakhir, setEditPendidikanTerakhir] = useState('');

  const [editNisn, setEditNisn] = useState('');
  const [editNik, setEditNik] = useState('');
  const [editTempatLahir, setEditTempatLahir] = useState('');
  const [editDusun, setEditDusun] = useState('');
  const [editKelurahan, setEditKelurahan] = useState('');
  const [editKecamatan, setEditKecamatan] = useState('');
  const [editKabupaten, setEditKabupaten] = useState('');
  const [editProvinsi, setEditProvinsi] = useState('');
  const [editRt, setEditRt] = useState('');
  const [editRw, setEditRw] = useState('');
  const [editKodePos, setEditKodePos] = useState('');
  const [editTransportasi, setEditTransportasi] = useState('');
  const [editNamaAyah, setEditNamaAyah] = useState('');
  const [editNikAyah, setEditNikAyah] = useState('');
  const [editPekerjaanAyah, setEditPekerjaanAyah] = useState('');
  const [editPendidikanAyah, setEditPendidikanAyah] = useState('');
  const [editPenghasilanAyah, setEditPenghasilanAyah] = useState('');
  const [editNamaIbu, setEditNamaIbu] = useState('');
  const [editNikIbu, setEditNikIbu] = useState('');
  const [editPekerjaanIbu, setEditPekerjaanIbu] = useState('');
  const [editPendidikanIbu, setEditPendidikanIbu] = useState('');
  const [editPenghasilanIbu, setEditPenghasilanIbu] = useState('');
  const [editNamaWali, setEditNamaWali] = useState('');
  const [editHubunganWali, setEditHubunganWali] = useState('');
  const [editPekerjaanWali, setEditPekerjaanWali] = useState('');
  const [editPenghasilanWali, setEditPenghasilanWali] = useState('');
  const [editAnakKe, setEditAnakKe] = useState<number | ''>('');
  const [editKebutuhanKhusus, setEditKebutuhanKhusus] = useState('');
  const [editPenerimaKps, setEditPenerimaKps] = useState(false);
  const [editPenerimaKip, setEditPenerimaKip] = useState(false);
  const [editNoKip, setEditNoKip] = useState('');
  const [editKelasId, setEditKelasId] = useState('');
  const [editTahunPelajaranId, setEditTahunPelajaranId] = useState('');
  const [editSemesterId, setEditSemesterId] = useState('');
  const [editTanggalMasuk, setEditTanggalMasuk] = useState('');
  const [editTanggalKeluar, setEditTanggalKeluar] = useState('');
  const [editAlasanKeluar, setEditAlasanKeluar] = useState('');
  const [editStatus, setEditStatus] = useState('');

  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<DropdownOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  useEffect(() => {
    if (showEdit) {
      const loadDropdowns = async () => {
        setLoadingDropdowns(true);
        try {
          if (isSiswa) {
            const [kelas, tahun] = await Promise.all([
              getKelasForDropdown(),
              getTahunPelajaranForDropdown()
            ]);
            setKelasOptions(kelas);
            setTahunOptions(tahun);
            // Semester options will be loaded by the useEffect when tahunPelajaranId is set
          }
        } finally {
          setLoadingDropdowns(false);
        }
      };
      loadDropdowns();
      if (isGuru) {
        setEditNama(guruProfile?.nama_guru || summaryName);
        setEditKode(guruProfile?.nip || '');
        setEditHp(guruProfile?.no_hp || '');
        setEditAlamat(guruProfile?.alamat || '');
        setEditTempatLahir(guruProfile?.tempat_lahir || '');
        setEditLahir(guruProfile?.tanggal_lahir || '');
        setEditJK(guruProfile?.jenis_kelamin || '');
        setEditEmail(guruProfile?.email || '');
        setEditNoRfid(guruProfile?.no_rfid || '');
        setEditAgama(guruProfile?.agama || '');
        setEditStatusKepegawaian(guruProfile?.status_kepegawaian || '');
        setEditPendidikanTerakhir(guruProfile?.pendidikan_terakhir || '');
      } else if (isSiswa) {
        setEditNama(siswaProfile?.nama_siswa || summaryName);
        setEditKode(siswaProfile?.nis || '');
        setEditHp(siswaProfile?.no_hp || '');
        setEditAlamat(siswaProfile?.alamat || '');
        setEditLahir(siswaProfile?.tanggal_lahir || '');
        setEditJK(siswaProfile?.jenis_kelamin || '');
        setEditNisn(siswaProfile?.nisn || '');
        setEditNik(siswaProfile?.nik || '');
        setEditTempatLahir(siswaProfile?.tempat_lahir || '');
        setEditDusun(siswaProfile?.dusun || '');
        setEditKelurahan(siswaProfile?.kelurahan || '');
        setEditKecamatan(siswaProfile?.kecamatan || '');
        setEditKabupaten(siswaProfile?.kabupaten || '');
        setEditProvinsi(siswaProfile?.provinsi || '');
        setEditRt(siswaProfile?.rt || '');
        setEditRw(siswaProfile?.rw || '');
        setEditKodePos(siswaProfile?.kode_pos || '');
        setEditTransportasi(siswaProfile?.transportasi || '');
        setEditNamaAyah(siswaProfile?.nama_ayah || '');
        setEditNikAyah(siswaProfile?.nik_ayah || '');
        setEditPekerjaanAyah(siswaProfile?.pekerjaan_ayah || '');
        setEditPendidikanAyah(siswaProfile?.pendidikan_ayah || '');
        setEditPenghasilanAyah(siswaProfile?.penghasilan_ayah || '');
        setEditNamaIbu(siswaProfile?.nama_ibu || '');
        setEditNikIbu(siswaProfile?.nik_ibu || '');
        setEditPekerjaanIbu(siswaProfile?.pekerjaan_ibu || '');
        setEditPendidikanIbu(siswaProfile?.pendidikan_ibu || '');
        setEditPenghasilanIbu(siswaProfile?.penghasilan_ibu || '');
        setEditNamaWali(siswaProfile?.nama_wali || '');
        setEditHubunganWali(siswaProfile?.hubungan_wali || '');
        setEditPekerjaanWali(siswaProfile?.pekerjaan_wali || '');
        setEditPenghasilanWali(siswaProfile?.penghasilan_wali || '');
        setEditAnakKe(typeof siswaProfile?.anak_ke === 'number' ? siswaProfile!.anak_ke : '');
        setEditKebutuhanKhusus(siswaProfile?.kebutuhan_khusus || '');
        setEditPenerimaKps(!!siswaProfile?.penerima_kps);
        setEditPenerimaKip(!!siswaProfile?.penerima_kip);
        setEditNoKip(siswaProfile?.no_kip || '');
        setEditKelasId(siswaProfile?.kelas_id || '');
        setEditTahunPelajaranId(siswaProfile?.tahun_pelajaran_id || '');
        setEditSemesterId(siswaProfile?.semester_id || '');
        setEditTanggalMasuk(siswaProfile?.tanggal_masuk || '');
        setEditTanggalKeluar(siswaProfile?.tanggal_keluar || '');
        setEditAlasanKeluar(siswaProfile?.alasan_keluar || '');
        setEditStatus(siswaProfile?.status || '');
        setEditNoRfid(siswaProfile?.no_rfid || '');
      } else {
        setEditNama(summaryName);
        setEditKode('');
        setEditHp('');
        setEditAlamat('');
        setEditLahir('');
        setEditJK('');
        setEditEmail('');
        setEditNoRfid('');
      }
    }
  }, [showEdit, isGuru, isSiswa, guruProfile, siswaProfile, summaryName]);

  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');

  const [emailNew, setEmailNew] = useState('');
  const [emailPassword, setEmailPassword] = useState('');

  async function handleSaveProfile() {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      if (isGuru && guruProfile?.id) {
        const payload: any = {
          nama_guru: editNama,
          nip: editKode || undefined,
          no_hp: editHp || undefined,
          alamat: editAlamat || undefined,
          tempat_lahir: editTempatLahir || undefined,
          tanggal_lahir: editLahir || undefined,
          jenis_kelamin: editJK || undefined,
          email: editEmail || undefined,
          no_rfid: editNoRfid || undefined,
          agama: editAgama || undefined,
          status_kepegawaian: editStatusKepegawaian || undefined,
          pendidikan_terakhir: editPendidikanTerakhir || undefined,
        };
        const res = await guruApi.update(guruProfile.id, payload);
        setGuruProfile(res.data as unknown as GuruProfile);
      } else if (isSiswa && siswaProfile?.id) {
        const payload: any = {
          nama_siswa: editNama,
          nis: editKode || undefined,
          no_hp: editHp || undefined,
          alamat: editAlamat || undefined,
          tanggal_lahir: editLahir || undefined,
          jenis_kelamin: editJK || undefined,
          nisn: editNisn || undefined,
          nik: editNik || undefined,
          tempat_lahir: editTempatLahir || undefined,
          dusun: editDusun || undefined,
          kelurahan: editKelurahan || undefined,
          kecamatan: editKecamatan || undefined,
          kabupaten: editKabupaten || undefined,
          provinsi: editProvinsi || undefined,
          rt: editRt || undefined,
          rw: editRw || undefined,
          kode_pos: editKodePos || undefined,
          transportasi: editTransportasi || undefined,
          nama_ayah: editNamaAyah || undefined,
          nik_ayah: editNikAyah || undefined,
          pekerjaan_ayah: editPekerjaanAyah || undefined,
          pendidikan_ayah: editPendidikanAyah || undefined,
          penghasilan_ayah: editPenghasilanAyah || undefined,
          nama_ibu: editNamaIbu || undefined,
          nik_ibu: editNikIbu || undefined,
          pekerjaan_ibu: editPekerjaanIbu || undefined,
          pendidikan_ibu: editPendidikanIbu || undefined,
          penghasilan_ibu: editPenghasilanIbu || undefined,
          nama_wali: editNamaWali || undefined,
          hubungan_wali: editHubunganWali || undefined,
          pekerjaan_wali: editPekerjaanWali || undefined,
          penghasilan_wali: editPenghasilanWali || undefined,
          anak_ke: editAnakKe === '' ? undefined : Number(editAnakKe),
          kebutuhan_khusus: editKebutuhanKhusus || undefined,
          penerima_kps: editPenerimaKps,
          penerima_kip: editPenerimaKip,
          no_kip: editNoKip || undefined,
          kelas_id: editKelasId || undefined,
          tahun_pelajaran_id: editTahunPelajaranId || undefined,
          semester_id: editSemesterId || undefined,
          tanggal_masuk: editTanggalMasuk || undefined,
          tanggal_keluar: editTanggalKeluar || undefined,
          alasan_keluar: editAlasanKeluar || undefined,
          status: editStatus || undefined,
          no_rfid: editNoRfid || undefined,
        };
        const res = await siswaApi.update(siswaProfile.id, payload);
        setSiswaProfile(res.data as unknown as SiswaProfile);
      }
      setSuccessMsg('Profil berhasil diperbarui.');
      setShowEdit(false);
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Gagal menyimpan profil.');
    }
  }

  async function handleChangePassword() {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!pwdCurrent || !pwdNew) {
      setErrorMsg('Mohon isi password saat ini dan password baru.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }
    if (pwdNew.length < 8) {
      setErrorMsg('Password baru minimal 8 karakter.');
      return;
    }
    try {
      const res = await changePassword({ current_password: pwdCurrent, new_password: pwdNew });
      if (res.success) {
        setSuccessMsg('Password berhasil diperbarui.');
        setShowChangePwd(false);
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      } else {
        setErrorMsg(res.message || 'Gagal mengganti password.');
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Gagal mengganti password.');
    }
  }

  async function handleChangeEmail() {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!emailNew || !emailPassword) {
      setErrorMsg('Mohon isi email baru dan password saat ini.');
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNew);
    if (!isValidEmail) {
      setErrorMsg('Format email tidak valid.');
      return;
    }
    try {
      const res = await updateMyEmail(emailNew, emailPassword);
      if (res.success) {
        setSuccessMsg('Email berhasil diperbarui.');
        setShowChangeEmail(false);
        setEmailNew('');
        setEmailPassword('');
      } else {
        setErrorMsg(res.message || 'Gagal mengganti email.');
      }
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message || 'Gagal mengganti email.');
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <UserCapabilityCard user={user} subscription={subscription} />

      {/* Tab Navigation Profil Premium */}
      <div className="flex border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-1 rounded-t-2xl">
        <button
          onClick={() => setActiveProfileTab('biodata')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeProfileTab === 'biodata'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350'
          }`}
        >
          <UserIcon size={14} />
          Biodata & Akun
        </button>
        <button
          onClick={() => setActiveProfileTab('jobdesk')}
          className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
            activeProfileTab === 'jobdesk'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-350'
          }`}
        >
          📋 Jobdesk & Jabatan
        </button>
      </div>

      {activeProfileTab === 'biodata' ? (
        <Card>
          <CardHeader>
            <CardTitle>Detail Biodata</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{details.utama1Label}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.utama1}</div>
              </div>
              <div>
                <Label>{details.utama2Label}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.utama2}</div>
              </div>
              <div>
                <Label>{details.kontakLabel}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.kontak}</div>
              </div>
              <div>
                <Label>{details.alamatLabel}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.alamat}</div>
              </div>
              <div>
                <Label>{details.lahirLabel}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.lahir}</div>
              </div>
              <div>
                <Label>{details.jkLabel}</Label>
                <div className="mt-1 text-gray-900 dark:text-gray-100">{details.jk}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => setShowEdit(true)}>Edit Profil</Button>
              <Button variant="outline" onClick={() => setShowChangePwd(true)}>Ganti Password</Button>
              <Button variant="outline" onClick={() => setShowChangeEmail(true)}>Ganti Email</Button>
            </div>

            {loading && (
              <Alert className="mt-4">
                <AlertTitle>Memuat</AlertTitle>
                <AlertDescription>Memuat data profil...</AlertDescription>
              </Alert>
            )}

            {errorMsg && (
              <Alert variant="destructive" className="mt-4">
                <AlertTitle>Gagal</AlertTitle>
                <AlertDescription>{errorMsg}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert variant="success" className="mt-4">
                <AlertTitle>Berhasil</AlertTitle>
                <AlertDescription>{successMsg}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Peta Tugas Harian Tab khusus */}
          <MyJobdeskWidget />

          {/* Rincian Izin Fungsional Sistem */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/50 p-6 shadow-sm">
            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              🛡️ Kapabilitas Operasional & Izin Sistem
            </h4>
            <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 font-medium">
              Berikut adalah daftar kapabilitas fungsional yang aktif and disematkan pada akun Anda untuk menjalankan modul-modul di platform Absenta.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {user?.capabilities && user.capabilities.length > 0 ? (
                user.capabilities.map((cap: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/40 border border-gray-100 dark:border-slate-800/60 hover:border-gray-200 dark:hover:border-slate-700 transition-all duration-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 font-mono tracking-tight break-all">
                      {cap}
                    </span>
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-6 text-xs text-gray-400 dark:text-gray-500 italic">
                  Tidak ada kapabilitas khusus yang terdaftar.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        title={isSiswa ? 'Edit Data Siswa' : isGuru ? 'Edit Data Guru' : 'Edit Profil'}
        size="xl"
        className={isSiswa || isGuru ? '!max-w-[80vw]' : ''}
      >
        {isSiswa && siswaProfile ? (
          <SiswaForm
            siswaId={siswaProfile.id}
            mode="edit"
            onSuccess={() => {
              setShowEdit(false);
              setSuccessMsg('Profil berhasil diperbarui.');
              if (userId) {
                siswaApi.getAll({ limit: 1, ...( { user_id: userId } as any ) }).then(res => {
                  const item = res.data?.[0] || null;
                  setSiswaProfile(item as any);
                });
              }
            }}
            onCancel={() => setShowEdit(false)}
          />
        ) : isGuru && guruProfile ? (
          <GuruForm
            guruId={guruProfile.id}
            mode="edit"
            enableMapelAssignments={false}
            onSuccess={() => {
              setShowEdit(false);
              setSuccessMsg('Profil berhasil diperbarui.');
              if (userId) {
                guruApi.getAll({ limit: 1, ...( { user_id: userId } as any ) }).then(res => {
                  const item = res.data?.[0] || null;
                  setGuruProfile(item as any);
                });
              }
            }}
            onCancel={() => setShowEdit(false)}
          />
        ) : (
          <>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{isGuru ? 'Nama Guru' : isSiswa ? 'Nama Siswa' : 'Nama Lengkap'}</Label>
              <Input value={editNama} onChange={(e) => setEditNama(e.target.value)} />
            </div>
            <div>
              <Label>{isGuru ? 'NIP' : isSiswa ? 'NIS' : 'Kode'}</Label>
              <Input value={editKode} onChange={(e) => setEditKode(e.target.value)} />
            </div>
            <div>
              <Label>No HP</Label>
              <Input value={editHp} onChange={(e) => setEditHp(e.target.value)} />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input value={editAlamat} onChange={(e) => setEditAlamat(e.target.value)} />
            </div>
            <div>
              <Label>Tanggal Lahir</Label>
              <Input type="date" value={editLahir} onChange={(e) => setEditLahir(e.target.value)} />
            </div>
            <div>
              <Label>Jenis Kelamin</Label>
              <SearchableSelect
                value={editJK}
                onValueChange={setEditJK}
                options={JENIS_KELAMIN_OPTIONS}
                placeholder="Pilih jenis kelamin"
                searchPlaceholder="Cari jenis kelamin..."
              />
            </div>
            {isGuru && (
              <>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </div>
                <div>
                  <Label>No RFID</Label>
                  <Input value={editNoRfid} onChange={(e) => setEditNoRfid(e.target.value)} />
                </div>
                <div>
                  <Label>Tempat Lahir</Label>
                  <Input value={editTempatLahir} onChange={(e) => setEditTempatLahir(e.target.value)} />
                </div>
                <div>
                <Label>Agama</Label>
                <SearchableSelect
                  value={editAgama}
                  onValueChange={setEditAgama}
                  options={AGAMA_OPTIONS}
                  placeholder="Pilih agama"
                  searchPlaceholder="Cari agama..."
                />
                </div>
                <div>
                <Label>Status Kepegawaian</Label>
                <SearchableSelect
                  value={editStatusKepegawaian}
                  onValueChange={setEditStatusKepegawaian}
                  options={[
                    { label: 'PNS', value: 'PNS' },
                    { label: 'HONORER', value: 'HONORER' },
                    { label: 'KONTRAK', value: 'KONTRAK' }
                  ]}
                  placeholder="Pilih status"
                  searchPlaceholder="Cari status..."
                />
                </div>
                <div>
                <Label>Pendidikan Terakhir</Label>
                <SearchableSelect
                  value={editPendidikanTerakhir}
                  onValueChange={setEditPendidikanTerakhir}
                  options={PENDIDIKAN_OPTIONS}
                  placeholder="Pilih pendidikan"
                  searchPlaceholder="Cari pendidikan..."
                />
                </div>
              </>
            )}
          </div>

          {isSiswa && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>NISN</Label>
                <Input value={editNisn} onChange={(e) => setEditNisn(e.target.value)} />
              </div>
              <div>
                <Label>NIK</Label>
                <Input value={editNik} onChange={(e) => setEditNik(e.target.value)} />
              </div>
              <div>
                <Label>Tempat Lahir</Label>
                <Input value={editTempatLahir} onChange={(e) => setEditTempatLahir(e.target.value)} />
              </div>
              <div>
                <Label>Dusun</Label>
                <Input value={editDusun} onChange={(e) => setEditDusun(e.target.value)} />
              </div>
              <div>
                <Label>Kelurahan</Label>
                <Input value={editKelurahan} onChange={(e) => setEditKelurahan(e.target.value)} />
              </div>
              <div>
                <Label>Kecamatan</Label>
                <Input value={editKecamatan} onChange={(e) => setEditKecamatan(e.target.value)} />
              </div>
              <div>
                <Label>Kabupaten</Label>
                <Input value={editKabupaten} onChange={(e) => setEditKabupaten(e.target.value)} />
              </div>
              <div>
                <Label>Provinsi</Label>
                <Input value={editProvinsi} onChange={(e) => setEditProvinsi(e.target.value)} />
              </div>
              <div>
                <Label>RT</Label>
                <Input value={editRt} onChange={(e) => setEditRt(e.target.value)} />
              </div>
              <div>
                <Label>RW</Label>
                <Input value={editRw} onChange={(e) => setEditRw(e.target.value)} />
              </div>
              <div>
                <Label>Kode Pos</Label>
                <Input value={editKodePos} onChange={(e) => setEditKodePos(e.target.value)} />
              </div>
              <div>
                <Label>Transportasi</Label>
                <SearchableSelect
                  value={editTransportasi}
                  onValueChange={setEditTransportasi}
                  options={TRANSPORTASI_OPTIONS}
                  placeholder="Pilih transportasi"
                  searchPlaceholder="Cari transportasi..."
                />
              </div>

              <div className="md:col-span-2" />

              <div>
                <Label>Nama Ayah</Label>
                <Input value={editNamaAyah} onChange={(e) => setEditNamaAyah(e.target.value)} />
              </div>
              <div>
                <Label>NIK Ayah</Label>
                <Input value={editNikAyah} onChange={(e) => setEditNikAyah(e.target.value)} />
              </div>
              <div>
                <Label>Pekerjaan Ayah</Label>
                <SearchableSelect
                  value={editPekerjaanAyah}
                  onValueChange={setEditPekerjaanAyah}
                  options={PEKERJAAN_OPTIONS}
                  placeholder="Pilih pekerjaan"
                  searchPlaceholder="Cari pekerjaan..."
                />
              </div>
              <div>
                <Label>Pendidikan Ayah</Label>
                <SearchableSelect
                  value={editPendidikanAyah}
                  onValueChange={setEditPendidikanAyah}
                  options={PENDIDIKAN_OPTIONS}
                  placeholder="Pilih pendidikan"
                  searchPlaceholder="Cari pendidikan..."
                />
              </div>
              <div>
                <Label>Penghasilan Ayah</Label>
                <SearchableSelect
                  value={editPenghasilanAyah}
                  onValueChange={setEditPenghasilanAyah}
                  options={PENGHASILAN_OPTIONS}
                  placeholder="Pilih penghasilan"
                  searchPlaceholder="Cari penghasilan..."
                />
              </div>

              <div>
                <Label>Nama Ibu</Label>
                <Input value={editNamaIbu} onChange={(e) => setEditNamaIbu(e.target.value)} />
              </div>
              <div>
                <Label>NIK Ibu</Label>
                <Input value={editNikIbu} onChange={(e) => setEditNikIbu(e.target.value)} />
              </div>
              <div>
                <Label>Pekerjaan Ibu</Label>
                <SearchableSelect
                  value={editPekerjaanIbu}
                  onValueChange={setEditPekerjaanIbu}
                  options={PEKERJAAN_OPTIONS}
                  placeholder="Pilih pekerjaan"
                  searchPlaceholder="Cari pekerjaan..."
                />
              </div>
              <div>
                <Label>Pendidikan Ibu</Label>
                <SearchableSelect
                  value={editPendidikanIbu}
                  onValueChange={setEditPendidikanIbu}
                  options={PENDIDIKAN_OPTIONS}
                  placeholder="Pilih pendidikan"
                  searchPlaceholder="Cari pendidikan..."
                />
              </div>
              <div>
                <Label>Penghasilan Ibu</Label>
                <SearchableSelect
                  value={editPenghasilanIbu}
                  onValueChange={setEditPenghasilanIbu}
                  options={PENGHASILAN_OPTIONS}
                  placeholder="Pilih penghasilan"
                  searchPlaceholder="Cari penghasilan..."
                />
              </div>

              <div>
                <Label>Nama Wali</Label>
                <Input value={editNamaWali} onChange={(e) => setEditNamaWali(e.target.value)} />
              </div>
              <div>
                <Label>Hubungan Wali</Label>
                <SearchableSelect
                  value={editHubunganWali}
                  onValueChange={setEditHubunganWali}
                  options={HUBUNGAN_WALI_OPTIONS}
                  placeholder="Pilih hubungan"
                  searchPlaceholder="Cari hubungan..."
                />
              </div>
              <div>
                <Label>Pekerjaan Wali</Label>
                <Input value={editPekerjaanWali} onChange={(e) => setEditPekerjaanWali(e.target.value)} />
              </div>
              <div>
                <Label>Penghasilan Wali</Label>
                <Input value={editPenghasilanWali} onChange={(e) => setEditPenghasilanWali(e.target.value)} />
              </div>

              <div>
                <Label>Anak Ke</Label>
                <Input type="number" value={editAnakKe === '' ? '' : String(editAnakKe)} onChange={(e) => setEditAnakKe(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
              <div>
                <Label>Kebutuhan Khusus</Label>
                <Input value={editKebutuhanKhusus} onChange={(e) => setEditKebutuhanKhusus(e.target.value)} />
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={editPenerimaKps} onCheckedChange={(v) => setEditPenerimaKps(!!v)} />
                <Label>Penerima KPS</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox checked={editPenerimaKip} onCheckedChange={(v) => setEditPenerimaKip(!!v)} />
                <Label>Penerima KIP</Label>
              </div>
              <div>
                <Label>No KIP</Label>
                <Input value={editNoKip} onChange={(e) => setEditNoKip(e.target.value)} />
              </div>
              <div>
                <Label>Kelas</Label>
                <SearchableSelect
                  value={editKelasId}
                  onValueChange={setEditKelasId}
                  options={kelasOptions}
                  placeholder={loadingDropdowns ? 'Memuat...' : 'Pilih kelas'}
                  searchPlaceholder="Cari kelas..."
                  disabled={loadingDropdowns}
                />
              </div>
              <div>
                <Label>Tahun Pelajaran</Label>
                <SearchableSelect
                  value={editTahunPelajaranId}
                  onValueChange={setEditTahunPelajaranId}
                  options={tahunOptions}
                  placeholder={loadingDropdowns ? 'Memuat...' : 'Pilih tahun'}
                  searchPlaceholder="Cari tahun..."
                  disabled={loadingDropdowns}
                />
              </div>
              <div>
                <Label>Semester</Label>
                <SearchableSelect
                  value={editSemesterId}
                  onValueChange={setEditSemesterId}
                  options={semesterOptions}
                  placeholder={loadingDropdowns ? 'Memuat...' : 'Pilih semester'}
                  searchPlaceholder="Cari semester..."
                  disabled={loadingDropdowns}
                />
              </div>
              <div>
                <Label>Tanggal Masuk</Label>
                <Input type="date" value={editTanggalMasuk} onChange={(e) => setEditTanggalMasuk(e.target.value)} />
              </div>
              <div>
                <Label>Tanggal Keluar</Label>
                <Input type="date" value={editTanggalKeluar} onChange={(e) => setEditTanggalKeluar(e.target.value)} />
              </div>
              <div>
                <Label>Alasan Keluar</Label>
                <Input value={editAlasanKeluar} onChange={(e) => setEditAlasanKeluar(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <SearchableSelect
                  value={editStatus}
                  onValueChange={setEditStatus}
                  options={[
                    { label: 'AKTIF', value: 'AKTIF' },
                    { label: 'TIDAK_AKTIF', value: 'TIDAK_AKTIF' },
                    { label: 'LULUS', value: 'LULUS' },
                    { label: 'PINDAH', value: 'PINDAH' },
                    { label: 'KELUAR', value: 'KELUAR' }
                  ]}
                  placeholder="Pilih status"
                  searchPlaceholder="Cari status..."
                />
              </div>
              <div>
                <Label>No RFID</Label>
                <Input value={editNoRfid} onChange={(e) => setEditNoRfid(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowEdit(false)}>Batal</Button>
          <Button variant="primary" onClick={handleSaveProfile}>Simpan</Button>
        </ModalFooter>
          </>
        )}
      </Modal>

      <Modal isOpen={showChangePwd} onClose={() => setShowChangePwd(false)} title="Ganti Password" size="md">
        <div className="space-y-4">
          <div>
            <Label>Password Saat Ini</Label>
            <Input type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} />
          </div>
          <div>
            <Label>Password Baru</Label>
            <Input type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
          </div>
          <div>
            <Label>Konfirmasi Password Baru</Label>
            <Input type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowChangePwd(false)}>Batal</Button>
          <Button variant="primary" onClick={handleChangePassword}>Ganti Password</Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={showChangeEmail} onClose={() => setShowChangeEmail(false)} title="Ganti Email" size="md">
        <div className="space-y-4">
          <div>
            <Label>Email Baru</Label>
            <Input type="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} />
          </div>
          <div>
            <Label>Password Saat Ini</Label>
            <Input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
          </div>
        </div>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowChangeEmail(false)}>Batal</Button>
          <Button variant="primary" onClick={handleChangeEmail}>Ganti Email</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
