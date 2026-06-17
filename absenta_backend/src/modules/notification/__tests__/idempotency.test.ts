import { WhatsAppService } from '../services/whatsapp.service';
import { PushService } from '../services/push.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const actual = jest.requireActual('@prisma/client');
  return { ...actual, PrismaClient: jest.fn() };
});

// Mock CacheService to avoid open handles
jest.mock('@/utils/cache.service', () => ({
  cacheService: {
    get: jest.fn(),
    set: jest.fn(),
    cleanupExpiredEntries: jest.fn(),
  }
}));

describe('Notification Idempotency', () => {
  let whatsappService: WhatsAppService;
  let pushService: PushService;
  let mockFindFirst: jest.Mock;
  let mockCreate: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockFindFirst = jest.fn();
    mockCreate = jest.fn();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    process.env.WHATSAPP_API_URL = 'https://api.whatsapp.com';
    process.env.WHATSAPP_API_KEY = 'test-key';

    (PrismaClient as jest.Mock).mockImplementation(() => ({
      notificationLog: {
        findFirst: mockFindFirst,
        create: mockCreate,
      },
      systemConfig: {
        findFirst: jest.fn().mockResolvedValue({
          whatsapp_api_url: 'https://api.whatsapp.com',
          whatsapp_api_key: 'test-key',
          enable_wa_notifications: true
        }),
      }
    }));

    // Re-instantiate services to pick up new mock
    whatsappService = new WhatsAppService();
    pushService = new PushService();
    
    // Default fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: true })
    });
  });

  describe('WhatsAppService', () => {
    it('should send message if no duplicate log exists', async () => {
      mockFindFirst.mockResolvedValue(null);

      await whatsappService.sendWhatsApp({
        phoneNumber: '628123456789',
        message: 'Test Message',
        tenantId: 'tenant-1',
        event: 'TEST_EVENT',
        relatedId: 'rel-1'
      });

      expect(mockFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          tenant_id: 'tenant-1',
          event: 'TEST_EVENT',
          related_id: 'rel-1',
          status: 'SENT'
        })
      }));
      expect(mockFetch).toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should NOT send message if duplicate log exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'log-1', status: 'SENT' });

      const result = await whatsappService.sendWhatsApp({
        phoneNumber: '628123456789',
        message: 'Test Message',
        tenantId: 'tenant-1',
        event: 'TEST_EVENT',
        relatedId: 'rel-1'
      });

      expect(mockFindFirst).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('PushService', () => {
    it('should return false for legacy sendPush stub', async () => {
      const res = await pushService.sendPush('token-123', 'Title', 'Body', 'tenant-1', 'TEST_EVENT', 'rel-1');

      expect(res).toBe(false);
      expect(mockFindFirst).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
