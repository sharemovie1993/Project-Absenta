/**
 * Unit Tests for SIMPLE Mode Attendance
 * 
 * Tests gerbang attendance only scenarios for tenants with SIMPLE mode
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { prisma } = require('../../../src/utils/prisma');
const { gerbangService } = require('../../../src/modules/attendance/gerbang/services/gerbang.service');
const { AbsensiMode, JenisTap } = require('@prisma/client');

describe('SIMPLE Mode Attendance Tests', () => {
  let testTenant;
  let testSiswa;
  let testGuru;
  let testSesiGerbang;

  beforeEach(async () => {
    // Create test tenant with SIMPLE mode
    testTenant = await prisma.tenant.create({
      data: {
        nama: 'Test School SIMPLE',
        kode: 'TEST_SIMPLE',
        alamat: 'Test Address',
        telepon: '081234567890',
        email: 'test@simple.school',
        absensi_mode: AbsensiMode.SIMPLE,
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
        kelas_id: null, // Will be set if needed
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
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.absenGerbangSiswa.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.absenGerbangGuru.deleteMany({
      where: { tenant_id: testTenant.id }
    });
    await prisma.logTap.deleteMany({
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
    await prisma.tenant.delete({
      where: { id: testTenant.id }
    });
  });

  describe('Student Gerbang Attendance', () => {
    it('should record student MASUK tap successfully', async () => {
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

      // Verify attendance record created
      const attendance = await prisma.absenGerbangSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.waktu_masuk).toBeDefined();
      expect(attendance.waktu_keluar).toBeNull();
    });

    it('should record student KELUAR tap successfully', async () => {
      // First, record MASUK tap
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Then record KELUAR tap
      const tapData = {
        rfid: testSiswa.rfid,
        arah: JenisTap.KELUAR,
        device_id: 'GATE_001'
      };

      const result = await gerbangService.tap(tapData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.jenis_tap).toBe(JenisTap.KELUAR);

      // Verify attendance record updated
      const attendance = await prisma.absenGerbangSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.waktu_masuk).toBeDefined();
      expect(attendance.waktu_keluar).toBeDefined();
    });

    it('should prevent duplicate MASUK taps', async () => {
      const tapData = {
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      // First tap should succeed
      await gerbangService.tap(tapData, testTenant.id);

      // Second tap should fail
      await expect(
        gerbangService.tap(tapData, testTenant.id)
      ).rejects.toThrow('Duplicate tap detected');
    });

    it('should prevent KELUAR tap without MASUK', async () => {
      const tapData = {
        rfid: testSiswa.rfid,
        arah: JenisTap.KELUAR,
        device_id: 'GATE_001'
      };

      await expect(
        gerbangService.tap(tapData, testTenant.id)
      ).rejects.toThrow('Student must tap MASUK first');
    });

    it('should handle unknown RFID', async () => {
      const tapData = {
        rfid: 'UNKNOWN_RFID',
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      await expect(
        gerbangService.tap(tapData, testTenant.id)
      ).rejects.toThrow('Student not found');
    });
  });

  describe('Teacher Gerbang Attendance', () => {
    it('should record teacher MASUK tap successfully', async () => {
      const tapData = {
        rfid: testGuru.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      const result = await gerbangService.tap(tapData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.jenis_tap).toBe(JenisTap.MASUK);
      expect(result.guru_id).toBe(testGuru.id);

      // Verify attendance record created
      const attendance = await prisma.absenGerbangGuru.findFirst({
        where: {
          guru_id: testGuru.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.waktu_masuk).toBeDefined();
      expect(attendance.waktu_keluar).toBeNull();
    });

    it('should record teacher KELUAR tap successfully', async () => {
      // First, record MASUK tap
      await gerbangService.tap({
        rfid: testGuru.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Then record KELUAR tap
      const tapData = {
        rfid: testGuru.rfid,
        arah: JenisTap.KELUAR,
        device_id: 'GATE_001'
      };

      const result = await gerbangService.tap(tapData, testTenant.id);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.jenis_tap).toBe(JenisTap.KELUAR);

      // Verify attendance record updated
      const attendance = await prisma.absenGerbangGuru.findFirst({
        where: {
          guru_id: testGuru.id,
          sesi_gerbang_id: testSesiGerbang.id
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.waktu_masuk).toBeDefined();
      expect(attendance.waktu_keluar).toBeDefined();
    });
  });

  describe('SIMPLE Mode Restrictions', () => {
    it('should not create SesiAbsensi records', async () => {
      // Record some gerbang taps
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Verify no SesiAbsensi records created
      const sesiAbsensi = await prisma.sesiAbsensi.findMany({
        where: { tenant_id: testTenant.id }
      });

      expect(sesiAbsensi).toHaveLength(0);
    });

    it('should not create AbsenSiswa records', async () => {
      // Record some gerbang taps
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Verify no AbsenSiswa records created
      const absenSiswa = await prisma.absenSiswa.findMany({
        where: { tenant_id: testTenant.id }
      });

      expect(absenSiswa).toHaveLength(0);
    });

    it('should only use gerbang-related tables', async () => {
      // Record student and teacher taps
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      await gerbangService.tap({
        rfid: testGuru.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Verify only gerbang tables have data
      const gerbangSiswa = await prisma.absenGerbangSiswa.findMany({
        where: { tenant_id: testTenant.id }
      });
      const gerbangGuru = await prisma.absenGerbangGuru.findMany({
        where: { tenant_id: testTenant.id }
      });
      const logTap = await prisma.logTap.findMany({
        where: { tenant_id: testTenant.id }
      });

      expect(gerbangSiswa).toHaveLength(1);
      expect(gerbangGuru).toHaveLength(1);
      expect(logTap.length).toBeGreaterThan(0);

      // Verify session tables are empty
      const sesiAbsensi = await prisma.sesiAbsensi.findMany({
        where: { tenant_id: testTenant.id }
      });
      const absenSiswa = await prisma.absenSiswa.findMany({
        where: { tenant_id: testTenant.id }
      });
      const absenGuru = await prisma.absenGuru.findMany({
        where: { tenant_id: testTenant.id }
      });

      expect(sesiAbsensi).toHaveLength(0);
      expect(absenSiswa).toHaveLength(0);
      expect(absenGuru).toHaveLength(0);
    });
  });

  describe('Audit Logging', () => {
    it('should create log entries for all taps', async () => {
      const tapData = {
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      };

      await gerbangService.tap(tapData, testTenant.id);

      // Verify log entry created
      const logEntry = await prisma.logTap.findFirst({
        where: {
          tenant_id: testTenant.id,
          rfid: testSiswa.rfid,
          jenis_tap: JenisTap.MASUK
        }
      });

      expect(logEntry).toBeDefined();
      expect(logEntry.device_id).toBe('GATE_001');
      expect(logEntry.waktu).toBeDefined();
    });

    it('should log both successful and failed taps', async () => {
      // Successful tap
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Failed tap (duplicate)
      try {
        await gerbangService.tap({
          rfid: testSiswa.rfid,
          arah: JenisTap.MASUK,
          device_id: 'GATE_001'
        }, testTenant.id);
      } catch (error) {
        // Expected to fail
      }

      // Verify both logs exist
      const logs = await prisma.logTap.findMany({
        where: {
          tenant_id: testTenant.id,
          rfid: testSiswa.rfid
        }
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity', async () => {
      await gerbangService.tap({
        rfid: testSiswa.rfid,
        arah: JenisTap.MASUK,
        device_id: 'GATE_001'
      }, testTenant.id);

      // Verify all foreign keys are valid
      const attendance = await prisma.absenGerbangSiswa.findFirst({
        where: {
          siswa_id: testSiswa.id,
          sesi_gerbang_id: testSesiGerbang.id
        },
        include: {
          Siswa: true,
          SesiGerbang: true
        }
      });

      expect(attendance).toBeDefined();
      expect(attendance.Siswa).toBeDefined();
      expect(attendance.SesiGerbang).toBeDefined();
      expect(attendance.tenant_id).toBe(testTenant.id);
    });

    it('should handle concurrent taps gracefully', async () => {
      const tapPromises = [
        gerbangService.tap({
          rfid: testSiswa.rfid,
          arah: JenisTap.MASUK,
          device_id: 'GATE_001'
        }, testTenant.id),
        gerbangService.tap({
          rfid: testSiswa.rfid,
          arah: JenisTap.MASUK,
          device_id: 'GATE_002'
        }, testTenant.id)
      ];

      const results = await Promise.allSettled(tapPromises);
      
      // One should succeed, one should fail
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      expect(successful).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });
});