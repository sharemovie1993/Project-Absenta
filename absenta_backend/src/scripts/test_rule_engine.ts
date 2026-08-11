import { AttendanceRuleEngine } from '../domain/attendance/AttendanceRuleEngine';

function testAttendanceRuleEngine() {
  console.log('====================================================');
  console.log('🧪 TESTING AttendanceRuleEngine (Zero I/O Pure Engine)');
  console.log('====================================================\n');

  // Test Case 1: Tepat Waktu
  const res1 = AttendanceRuleEngine.calculateHybridStatus(
    [{ arah: 'GERBANG_DATANG', status: 'HADIR', is_terlambat: false }],
    [{ status: 'HADIR', is_terlambat: false }]
  );
  console.log('Test 1 (Tepat Waktu):', res1, res1.points === 10 ? '✅ PASS' : '❌ FAIL');

  // Test Case 2: Terlambat Gerbang
  const res2 = AttendanceRuleEngine.calculateHybridStatus(
    [{ arah: 'GERBANG_DATANG', status: 'HADIR', is_terlambat: true }],
    [{ status: 'HADIR', is_terlambat: false }]
  );
  console.log('Test 2 (Terlambat Gerbang):', res2, res2.points === 5 && res2.isLate === true ? '✅ PASS' : '❌ FAIL');

  // Test Case 3: Izin
  const res3 = AttendanceRuleEngine.calculateHybridStatus([], [{ status: 'IZIN' }]);
  console.log('Test 3 (Izin):', res3, res3.status === 'IZIN' ? '✅ PASS' : '❌ FAIL');

  console.log('\n====================================================');
}

testAttendanceRuleEngine();
