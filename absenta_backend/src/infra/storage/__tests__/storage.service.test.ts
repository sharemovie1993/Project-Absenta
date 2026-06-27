import { storageService } from '../storage.service';
import path from 'path';

describe('StorageService Robustness Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('resolveLocalPath & STORAGE_LOCAL_DIR', () => {
    it('should resolve local path relative to process.cwd() when STORAGE_LOCAL_DIR is not set', async () => {
      delete process.env.STORAGE_LOCAL_DIR;
      
      // We can upload a test buffer locally
      const testKey = 'uploads/test-local-default.txt';
      const testBuffer = Buffer.from('hello default local');
      
      const result = await storageService.uploadBuffer(testKey, testBuffer);
      expect(result.key).toBe(testKey);
      
      const exists = await storageService.exists(testKey);
      expect(exists).toBe(true);
      
      // Cleanup
      await storageService.delete(testKey);
    });

    it('should resolve local path relative to STORAGE_LOCAL_DIR when it is configured', async () => {
      const customLocalDir = path.resolve(process.cwd(), 'temp_test_storage_dir');
      process.env.STORAGE_LOCAL_DIR = customLocalDir;
      
      const testKey = 'uploads/test-custom-local.txt';
      const testBuffer = Buffer.from('hello custom local');
      
      const result = await storageService.uploadBuffer(testKey, testBuffer);
      expect(result.key).toBe(testKey);
      
      // The file path should physically exist under the custom folder
      const expectedPath = path.resolve(customLocalDir, testKey);
      const fs = require('fs');
      expect(fs.existsSync(expectedPath)).toBe(true);
      
      // Cleanup
      await storageService.delete(testKey);
      
      // Cleanup directory
      try {
        fs.rmSync(customLocalDir, { recursive: true, force: true });
      } catch {}
    });
  });

  describe('buildS3Config Validation', () => {
    it('should throw an error when STORAGE_DRIVER is S3 but credentials are empty', () => {
      process.env.STORAGE_DRIVER = 's3';
      delete process.env.S3_BUCKET;
      delete process.env.S3_ACCESS_KEY;
      delete process.env.S3_SECRET_KEY;
      delete process.env.S3_ACCESS_KEY_ID;
      delete process.env.S3_SECRET_ACCESS_KEY;

      expect(() => {
        storageService.getDriverName();
      }).toThrowError(/Storage driver is set to S3, but configuration is incomplete/);
    });

    it('should return local driver and not throw if STORAGE_DRIVER is local', () => {
      process.env.STORAGE_DRIVER = 'local';
      
      const driver = storageService.getDriverName();
      expect(driver).toBe('local');
    });
  });
});
