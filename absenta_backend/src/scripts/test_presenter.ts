import { SessionPresenter } from '../domain/attendance/SessionPresenter';

function testSessionPresenter() {
  console.log('====================================================');
  console.log('🧪 TESTING SessionPresenter (Response Standardization)');
  console.log('====================================================\n');

  const mockAbsenStudent = {
    id: 'absen-123',
    sesi_id: 'sesi-456',
    status: 'HADIR',
    created_at: new Date('2026-08-11T07:00:00Z'),
    SesiAbsensi: {
      jenis_kegiatan: 'PEMBELAJARAN',
      Mapel: { nama_mapel: 'Matematika' },
      Kelas: { nama_kelas: 'XII RPL 1' },
      Guru: { nama_guru: 'Budi Santoso, S.Pd' }
    }
  };

  const formatted = SessionPresenter.formatStudentSessionItem(mockAbsenStudent, '07:00 WIB');
  console.log('Formatted Student Session:', formatted);
  console.log('Check Nama Kegiatan:', formatted.nama_kegiatan === 'Matematika' ? '✅ PASS' : '❌ FAIL');
  console.log('Check Nama Guru:', formatted.nama_guru === 'Budi Santoso, S.Pd' ? '✅ PASS' : '❌ FAIL');

  console.log('\n====================================================');
}

testSessionPresenter();
