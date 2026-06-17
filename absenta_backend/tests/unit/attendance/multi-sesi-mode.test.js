/**
 * Unit Tests for MULTI_SESI Mode Attendance
 * 
 * Tests full attendance workflow including gerbang, manual, and session-based attendance
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { prisma } = require('../../../src/utils/prisma');
const { gerbangService } = require('../../../src/modules/attendance/gerbang/services/gerbang.service');
const { manualService } = require('../../../src/modules/attendance/manual/services/manual.service');
const { rekapService } = require('../../../src/modules/attendance/rekap/services/rekap.service');
const { AbsensiMode, JenisTap, AbsenStatus } = require('@prisma/client');

describe('MULTI_SESI Mode Attendance Tests', () => {
  let testTenant;
  let testKelas;
  let testSiswa;
  let testGuru;
  let testSesiGerbang;
  let testSesiAbsensi;

  beforeEach(async () => {
    // Create test tenant with MULTI_SESI mode
    testTenant = await prisma.tenant.create({
      data: {
        nama: 'Test School MULTI_SESI',
        kode: 'TEST_MULTI',
        alamat: 'Test Address',
        telepon: '081234567890',
        email: 'test@multi.school',
        absensi_mode: AbsensiMode.MULTI_SESI,
        status: 'AKTIF'
      }
    });

    // Create test class
    testKelas = await prisma.kelas.create({
      data: {
        nama: 'Test Class',
        tingkat: '10',
        tenant_id: testTenant.id,
        status: 'AKTIF'
      }
    });

    // Create test student
    testSiswa = await prisma.siswa.create({
      data: {
        nama: 'Test Student',
        nis: 'TEST001',
        rfid: 'RFID001',
        tenant_id: testTenant.id,
        kelas_id: testKelas.id,
        status: 'AKTIF'
      }
    });

    // Create test teacher
    testGuru = await prisma.guru.create({
      data: {
        nama: 'Test Teacher',
        nip: 'TEACHER001',
        rfid: 'RFID_TEACHER001',
        tenant_id: testTenant.id,
        status: 'AKTIF'
      }
    });

    // Create test gerbang session
    testSesiGerbang = await prisma.sesiGerbang.create({
      data: {
        tenant_id: testTenant.id,
        tanggal: new Date(),
        jam_buka: '06:00:00',
        jam_tutup: '18:00:00',
        status: 'AKTIF'
      }
    });

    // Create test attendance session
    testSesiAbsensi = await prisma.sesiAbsensi.create({
      data: {
        tenant_id: testTenant.id,
        kelas_id: testKelas.id,
        guru_id: testGuru.id,
        tanggal: new Date(),
        jam_mulai: '08:00:00',
        jam_selesai: '10:00:00',
        mata_pelajaran: 'Test Subject',
        status: 'AKTIF'
      }
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.absenSiswa.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.absenGuru.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.absenGerbangSiswa.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.absenGerbangGuru.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.logTap.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.sesiAbsensi.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.sesiGerbang.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.siswa.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.guru.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.kelas.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.tenant.delete({
      where: { id: testTenant.id }
    });
  });

  describe('Gerbang Attendance', () => {
    it('should record gerbang attendance for students', async () => {
      const tapData = {
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      const result = await gerbangService.tap(tapData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.jenis_tap).toBe(JenisTap.MASUK);
      expect(result.siswa_id).toBe(testSiswa.id);

      // Verify gerbang attendance record
      const gerbangAttendance = await prisma.absenGerbangSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(gerbangAttendance).toBeDefined();
      expect(gerbangAttendance.waktu_masuk).toBeDefined();
    });

    it('should record gerbang attendance for teachers', async () => {
      const tapData = {
        rfid: testGuru.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      const result = await gerbangService.tap(tapData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.guru_id).toBe(testGuru.id);

      // Verify gerbang attendance record
      const gerbangAttendance = await prisma.absenGerbangGuru.findFirst({
        where: {
          guru_id: testGuru.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(gerbangAttendance).toBeDefined();
      expect(gerbangAttendance.waktu_masuk).toBeDefined();
    });
  });

  describe('Manual Attendance', () => {
    it('should list untapped students for manual attendance', async () => {
      const result = await manualService.listUnTapped(
        testKelas.id,
        testSesiAbsensi.id,
        testTenant.id
      );

      expect(result).toBeDefined();
      expect(result.siswa).toHaveLength(1);
      expect(result.siswa[0].id).toBe(testSiswa.id);
      expect(result.siswa[0].status).toBe('BELUM_ABSEN');
    });

    it('should submit manual attendance successfully', async () => {
      const attendanceData = {
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      };

      const result = await manualService.submit(attendanceData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.processed).toBe(1);

      // Verify attendance record created
      const attendance = await prisma.absenSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_absensi_id: testSesiAbsensi.id
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.status).toBe(AbsenStatus.HADIR);
      expect(attendance.keterangan).toBe('Present');
    });

    it('should handle different attendance statuses', async () => {
      const attendanceData = {
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.SAKIT,
            keterangan: 'Sick with fever'
          }
        ]
      };

      const result = await manualService.submit(attendanceData, testTenant.id);

      expect(result.success).toBe(true);

      const attendance = await prisma.absenSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_absensi_id: testSesiAbsensi.id
        }
      });

      expect(attendance.status).toBe(AbsenStatus.SAKIT);
      expect(attendance.keterangan).toBe('Sick with fever');
    });

    it('should prevent duplicate manual attendance', async () => {
      const attendanceData = {
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      };

      // First submission should succeed
      await manualService.submit(attendanceData, testTenant.id);

      // Second submission should fail or update
      await expect(
        manualService.submit(attendanceData, testTenant.id)
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should create attendance sessions', async () => {
      const sessionData = {
        kelas_id: testKelas.id,
        guru_id: testGuru.id,
        tanggal: new Date(),
        jam_mulai: '10:00:00',
        jam_selesai: '12:00:00',
        mata_pelajaran: 'Mathematics'
      };

      const session = await prisma.sesiAbsensi.create({
        data: {
          ...sessionData,
          tenant_id: testTenant.id,
          status: 'AKTIF'
        }
      });

      expect(session).toBeDefined();
      expect(session.mata_pelajaran).toBe('Mathematics');
      expect(session.status).toBe('AKTIF');
    });

    it('should link attendance to sessions', async () => {
      const attendanceData = {
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      };

      await manualService.submit(attendanceData, testTenant.id);

      const attendance = await prisma.absenSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_absensi_id: testSesiAbsensi.id
        },
        include: {
          SesiAbsensi: true
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.SesiAbsensi).toBeDefined();
      expect(attendance.SesiAbsensi.mata_pelajaran).toBe('Test Subject');
    });
  });

  describe('Tracking and Reporting', () => {
    beforeEach(async () => {
      // Set up attendance data for tracking tests
      await manualService.submit({
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      }, testTenant.id);
    });

    it('should generate daily tracking for students', async () => {
      const tracking = await rekapService.getTrackingHarianSiswa(
        testSiswa.id,
        new Date().toISOString().split('T')[0],
        testTenant.id
      );

      expect(tracking).toBeDefined();
      expect(tracking.siswa_id).toBe(testSiswa.id);
      expect(tracking.tanggal).toBeDefined();
      expect(tracking.sesi_absensi).toHaveLength(1);
      expect(tracking.sesi_absensi[0].status).toBe(AbsenStatus.HADIR);
    });

    it('should generate daily recap for students', async () => {
      const recap = await rekapService.getRekapHarianSiswa(
        testSiswa.id,
        new Date().toISOString().split('T')[0],
        testTenant.id
      );

      expect(recap).toBeDefined();
      expect(recap.siswa_id).toBe(testSiswa.id);
      expect(recap.total_sesi).toBe(1);
      expect(recap.hadir).toBe(1);
      expect(recap.alpha).toBe(0);
    });

    it('should generate monthly recap for students', async () => {
      const recap = await rekapService.getRekapBulananSiswa(
        testSiswa.id,
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        testTenant.id
      );

      expect(recap).toBeDefined();
      expect(recap.siswa_id).toBe(testSiswa.id);
      expect(recap.total_hari).toBeGreaterThan(0);
    });

    it('should generate class monthly recap', async () => {
      const recap = await rekapService.getRekapBulananKelas(
        testKelas.id,
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        testTenant.id
      );

      expect(recap).toBeDefined();
      expect(recap.kelas_id).toBe(testKelas.id);
      expect(recap.siswa).toHaveLength(1);
      expect(recap.siswa[0].siswa_id).toBe(testSiswa.id);
    });
  });

  describe('Data Relationships', () => {
    it('should maintain proper relationships between all entities', async () => {
      // Record gerbang attendance
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Record manual attendance
      await manualService.submit({
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      }, testTenant.id);

      // Verify all relationships
      const gerbangAttendance = await prisma.absenGerbangSiswa.findFirst({
        where: { siswa_id: testSiswa.id },
        include: {
          Siswa: {
            include: {
              Kelas: true
            }
          },
          SesiGerbang: true
        }
      });

      const sessionAttendance = await prisma.absenSiswa.findFirst({
        where: { siswa_id: testSiswa.id },
        include: {
          Siswa: {
            include: {
              Kelas: true
            }
          },
          SesiAbsensi: {
            include: {
              Guru: true,
              Kelas: true
            }
          }
        }
      });

      expect(gerbangAttendance).toBeDefined();
      expect(gerbangAttendance.Siswa.Kelas.id).toBe(testKelas.id);
      
      expect(sessionAttendance).toBeDefined();
      expect(sessionAttendance.SesiAbsensi.Guru.id).toBe(testGuru.id);
      expect(sessionAttendance.SesiAbsensi.Kelas.id).toBe(testKelas.id);
    });

    it('should handle cascade operations correctly', async () => {
      // Create attendance records
      await manualService.submit({
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      }, testTenant.id);

      // Verify attendance exists
      let attendance = await prisma.absenSiswa.findMany({
        where: { siswa_id: testSiswa.id }
      });
      expect(attendance).toHaveLength(1);

      // Delete session (should cascade to attendance)
      await prisma.sesiAbsensi.delete({
        where: { id: testSesiAbsensi.id }
      });

      // Verify attendance is also deleted
      attendance = await prisma.absenSiswa.findMany({
        where: { siswa_id: testSiswa.id }
      });
      expect(attendance).toHaveLength(0);
    });
  });

  describe('MULTI_SESI Mode Features', () => {
    it('should support multiple sessions per day', async () => {
      // Create second session
      const secondSession = await prisma.sesiAbsensi.create({
        data: {
          tenant_id: testTenant.id,
          kelas_id: testKelas.id,
          guru_id: testGuru.id,
          tanggal: new Date(),
          jam_mulai: '10:00:00',
          jam_selesai: '12:00:00',
          mata_pelajaran: 'Second Subject',
          status: 'AKTIF'
        }
      });

      // Record attendance for both sessions
      await manualService.submit({
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      }, testTenant.id);

      await manualService.submit({
        sesi_absensi_id: secondSession.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.ALPA,
            keterangan: 'Absent'
          }
        ]
      }, testTenant.id);

      // Verify both attendance records
      const attendances = await prisma.absenSiswa.findMany({
        where: { siswa_id: testSiswa.id },
        include: { SesiAbsensi: true }
      });

      expect(attendances).toHaveLength(2);
      expect(attendances.find(a => a.status === AbsenStatus.HADIR)).toBeDefined();
      expect(attendances.find(a => a.status === AbsenStatus.ALPA)).toBeDefined();
    });

    it('should support detailed tracking per session', async () => {
      await manualService.submit({
        sesi_absensi_id: testSesiAbsensi.id,
        absensi: [
          {
            siswa_id: testSiswa.id,
            status: AbsenStatus.HADIR,
            keterangan: 'Present'
          }
        ]
      }, testTenant.id);

      const tracking = await rekapService.getTrackingHarianSiswa(
        testSiswa.id,
        new Date().toISOString().split('T')[0],
        testTenant.id
      );

      expect(tracking.sesi_absensi).toHaveLength(1);
      expect(tracking.sesi_absensi[0]).toHaveProperty('mata_pelajaran');
      expect(tracking.sesi_absensi[0]).toHaveProperty('jam_mulai');
      expect(tracking.sesi_absensi[0]).toHaveProperty('jam_selesai');
      expect(tracking.sesi_absensi[0]).toHaveProperty('status');
    });
  });
});
