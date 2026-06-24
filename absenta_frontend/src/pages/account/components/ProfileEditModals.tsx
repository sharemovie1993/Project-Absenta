import React, { useState, useEffect } from 'react';
import { 
  Modal, ModalFooter, Input, Label, Button, Loader
} from '../../../components/ui';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { changePassword } from '../../../api/auth.api';
import { updateMyEmail } from '../../../api/user.api';
import { guruApi, siswaApi } from '../../../api/academic.api';
import type { Guru, Siswa } from '../../../types/academic';
import { SiswaForm } from '../../../components/academic/siswa/SiswaForm';
import { GuruForm } from '../../../components/academic/guru/GuruForm';
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
  type DropdownOption
} from '../../../api/dropdown.api';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  isSiswa: boolean;
  isGuru: boolean;
  siswaProfile: Siswa | null;
  guruProfile: Guru | null;
  onSuccess: (type: 'siswa' | 'guru' | 'user', updatedData: any) => void;
  onError: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = React.memo(({
  isOpen,
  onClose,
  user,
  isSiswa,
  isGuru,
  siswaProfile,
  guruProfile,
  onSuccess,
  onError
}) => {
  const summaryName = user?.full_name || '';

  // Dropdowns state
  const [kelasOptions, setKelasOptions] = useState<DropdownOption[]>([]);
  const [tahunOptions, setTahunOptions] = useState<DropdownOption[]>([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Form states
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

  // Siswa specific
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

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingDropdowns(false);
        }
      };
      loadDropdowns();

      if (isGuru && guruProfile) {
        setEditNama(guruProfile.nama_guru || summaryName);
        setEditKode(guruProfile.nip || '');
        setEditHp(guruProfile.no_hp || '');
        setEditAlamat(guruProfile.alamat || '');
        setEditTempatLahir(guruProfile.tempat_lahir || '');
        setEditLahir(guruProfile.tanggal_lahir || '');
        setEditJK(guruProfile.jenis_kelamin || '');
        setEditEmail(guruProfile.email || '');
        setEditNoRfid(guruProfile.no_rfid || '');
        setEditAgama(guruProfile.agama || '');
        setEditStatusKepegawaian(guruProfile.status_kepegawaian || '');
        setEditPendidikanTerakhir(guruProfile.pendidikan_terakhir || '');
      } else if (isSiswa && siswaProfile) {
        setEditNama(siswaProfile.nama_siswa || summaryName);
        setEditKode(siswaProfile.nis || '');
        setEditHp(siswaProfile.no_hp || '');
        setEditAlamat(siswaProfile.alamat || '');
        setEditLahir(siswaProfile.tanggal_lahir || '');
        setEditJK(siswaProfile.jenis_kelamin || '');
        setEditNisn(siswaProfile.nisn || '');
        setEditNik(siswaProfile.nik || '');
        setEditTempatLahir(siswaProfile.tempat_lahir || '');
        setEditDusun(siswaProfile.dusun || '');
        setEditKelurahan(siswaProfile.kelurahan || '');
        setEditKecamatan(siswaProfile.kecamatan || '');
        setEditKabupaten(siswaProfile.kabupaten || '');
        setEditProvinsi(siswaProfile.provinsi || '');
        setEditRt(siswaProfile.rt || '');
        setEditRw(siswaProfile.rw || '');
        setEditKodePos(siswaProfile.kode_pos || '');
        setEditTransportasi(siswaProfile.transportasi || '');
        setEditNamaAyah(siswaProfile.nama_ayah || '');
        setEditNikAyah(siswaProfile.nik_ayah || '');
        setEditPekerjaanAyah(siswaProfile.pekerjaan_ayah || '');
        setEditPendidikanAyah(siswaProfile.pendidikan_ayah || '');
        setEditPenghasilanAyah(siswaProfile.penghasilan_ayah || '');
        setEditNamaIbu(siswaProfile.nama_ibu || '');
        setEditNikIbu(siswaProfile.nik_ibu || '');
        setEditPekerjaanIbu(siswaProfile.pekerjaan_ibu || '');
        setEditPendidikanIbu(siswaProfile.pendidikan_ibu || '');
        setEditPenghasilanIbu(siswaProfile.penghasilan_ibu || '');
        setEditNamaWali(siswaProfile.nama_wali || '');
        setEditHubunganWali(siswaProfile.hubungan_wali || '');
        setEditPekerjaanWali(siswaProfile.pekerjaan_wali || '');
        setEditPenghasilanWali(siswaProfile.penghasilan_wali || '');
        setEditAnakKe(typeof siswaProfile.anak_ke === 'number' ? siswaProfile.anak_ke : '');
        setEditKebutuhanKhusus(siswaProfile.kebutuhan_khusus || '');
        setEditPenerimaKps(!!siswaProfile.penerima_kps);
        setEditPenerimaKip(!!siswaProfile.penerima_kip);
        setEditNoKip(siswaProfile.no_kip || '');
        setEditKelasId(siswaProfile.kelas_id || '');
        setEditTahunPelajaranId(siswaProfile.tahun_pelajaran_id || '');
        setEditSemesterId(siswaProfile.semester_id || '');
        setEditTanggalMasuk(siswaProfile.tanggal_masuk || '');
        setEditTanggalKeluar(siswaProfile.tanggal_keluar || '');
        setEditAlasanKeluar(siswaProfile.alasan_keluar || '');
        setEditStatus(siswaProfile.status || '');
        setEditNoRfid(siswaProfile.no_rfid || '');
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
  }, [isOpen, isGuru, isSiswa, guruProfile, siswaProfile, summaryName]);

  const handleSaveProfile = async () => {
    setSaving(true);
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
        onSuccess('guru', res.data);
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
        onSuccess('siswa', res.data);
      } else {
        onSuccess('user', null);
      }
    } catch (e: any) {
      onError(e?.response?.data?.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  const renderGeneralForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="editNama">Nama Lengkap</Label>
          <Input id="editNama" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="editKode">Kode</Label>
          <Input id="editKode" value={editKode} onChange={(e) => setEditKode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="editHp">No HP</Label>
          <Input id="editHp" value={editHp} onChange={(e) => setEditHp(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="editAlamat">Alamat</Label>
          <Input id="editAlamat" value={editAlamat} onChange={(e) => setEditAlamat(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="editLahir">Tanggal Lahir</Label>
          <Input id="editLahir" type="date" value={editLahir} onChange={(e) => setEditLahir(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="editJK">Jenis Kelamin</Label>
          <SearchableSelect
            id="editJK"
            value={editJK}
            onValueChange={setEditJK}
            options={JENIS_KELAMIN_OPTIONS}
            placeholder="Pilih jenis kelamin"
            searchPlaceholder="Cari jenis kelamin..."
          />
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isSiswa ? 'Edit Data Siswa' : isGuru ? 'Edit Data Guru' : 'Edit Profil'}
      size="xl"
      className={isSiswa || isGuru ? '!max-w-[80vw]' : ''}
    >
      {isSiswa && siswaProfile ? (
        <SiswaForm
          siswaId={siswaProfile.id}
          mode="edit"
          onSuccess={() => onSuccess('siswa', null)}
          onCancel={onClose}
        />
      ) : isGuru && guruProfile ? (
        <GuruForm
          guruId={guruProfile.id}
          mode="edit"
          enableMapelAssignments={false}
          onSuccess={() => onSuccess('guru', null)}
          onCancel={onClose}
        />
      ) : (
        <>
          {renderGeneralForm()}
          <ModalFooter>
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button variant="primary" onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader size="sm" /> : 'Simpan'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
});

EditProfileModal.displayName = 'EditProfileModal';

// --- CHANGE PASSWORD MODAL ---
interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = React.memo(({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    }
  }, [isOpen]);

  const handleChangePassword = async () => {
    if (!pwdCurrent || !pwdNew) {
      onError('Mohon isi password saat ini dan password baru.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      onError('Konfirmasi password tidak cocok.');
      return;
    }
    if (pwdNew.length < 8) {
      onError('Password baru minimal 8 karakter.');
      return;
    }
    setSaving(true);
    try {
      const res = await changePassword({ current_password: pwdCurrent, new_password: pwdNew });
      if (res.success) {
        onSuccess('Password berhasil diperbarui.');
        onClose();
      } else {
        onError(res.message || 'Gagal mengganti password.');
      }
    } catch (e: any) {
      onError(e?.response?.data?.message || 'Gagal mengganti password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ganti Password" size="md">
      <div className="space-y-4">
        <div>
          <Label htmlFor="pwdCurrent">Password Saat Ini</Label>
          <Input id="pwdCurrent" type="password" value={pwdCurrent} onChange={(e) => setPwdCurrent(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pwdNew">Password Baru</Label>
          <Input id="pwdNew" type="password" value={pwdNew} onChange={(e) => setPwdNew(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="pwdConfirm">Konfirmasi Password Baru</Label>
          <Input id="pwdConfirm" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} />
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={handleChangePassword} disabled={saving}>
          {saving ? <Loader size="sm" /> : 'Ganti Password'}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

ChangePasswordModal.displayName = 'ChangePasswordModal';

// --- CHANGE EMAIL MODAL ---
interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export const ChangeEmailModal: React.FC<ChangeEmailModalProps> = React.memo(({
  isOpen,
  onClose,
  onSuccess,
  onError
}) => {
  const [emailNew, setEmailNew] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setEmailNew('');
      setEmailPassword('');
    }
  }, [isOpen]);

  const handleChangeEmail = async () => {
    if (!emailNew || !emailPassword) {
      onError('Mohon isi email baru dan password saat ini.');
      return;
    }
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNew);
    if (!isValidEmail) {
      onError('Format email tidak valid.');
      return;
    }
    setSaving(true);
    try {
      const res = await updateMyEmail(emailNew, emailPassword);
      if (res.success) {
        onSuccess('Email berhasil diperbarui.');
        onClose();
      } else {
        onError(res.message || 'Gagal mengganti email.');
      }
    } catch (e: any) {
      onError(e?.response?.data?.message || 'Gagal mengganti email.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ganti Email" size="md">
      <div className="space-y-4">
        <div>
          <Label htmlFor="emailNew">Email Baru</Label>
          <Input id="emailNew" type="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="emailPassword">Password Saat Ini</Label>
          <Input id="emailPassword" type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
        </div>
      </div>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button variant="primary" onClick={handleChangeEmail} disabled={saving}>
          {saving ? <Loader size="sm" /> : 'Ganti Email'}
        </Button>
      </ModalFooter>
    </Modal>
  );
});

ChangeEmailModal.displayName = 'ChangeEmailModal';
