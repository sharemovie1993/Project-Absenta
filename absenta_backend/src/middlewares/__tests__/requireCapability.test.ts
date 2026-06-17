
import { requireCapability } from '../requireCapability';
import { authorizationService } from '../../modules/auth/services/authorization.service';
import { RoleName } from '../../constants/enums';

// Mock dependencies
jest.mock('../../utils/prisma', () => ({
  prisma: {
    guru: { findUnique: jest.fn(), findFirst: jest.fn() },
    siswa: { findFirst: jest.fn() },
    siswaStrukturOrganisasi: { findFirst: jest.fn(), findMany: jest.fn() },
    strukturPermission: { findMany: jest.fn() },
    menu: { findMany: jest.fn() },
    menuRole: { findMany: jest.fn() },
  },
}));

jest.mock('../../modules/auth/services/authorization.service', () => ({
  authorizationService: {
    isUserAuthorized: jest.fn(),
  },
}));

describe('requireCapability Middleware (GURU Cut-off)', () => {
  let req: any;
  let reply: any;

  beforeEach(() => {
    req = {
      user: {
        id: 'user-id',
        email: 'test@example.com',
        roleName: RoleName.GURU,
        role: { permissions: [] },
        tenantId: 'tenant-id',
      },
    };
    reply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('should return 403 for GURU if capability is missing (Legacy Fallback Removed)', async () => {
    (authorizationService.isUserAuthorized as jest.Mock).mockResolvedValue({ allowed: false });

    const middleware = requireCapability('some.capability');
    await middleware(req, reply);

    expect(authorizationService.isUserAuthorized).toHaveBeenCalledWith('user-id', ['some.capability'], { user: req.user });
    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'CAPABILITY_ACCESS_DENIED', code: 'FORBIDDEN' })
    );
  });

  it('should pass for GURU if capability is present', async () => {
    (authorizationService.isUserAuthorized as jest.Mock).mockResolvedValue({ allowed: true });

    const middleware = requireCapability('some.capability');
    await middleware(req, reply);

    expect(authorizationService.isUserAuthorized).toHaveBeenCalledWith('user-id', ['some.capability'], { user: req.user });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should pass for SISWA if capability is present', async () => {
    req.user.roleName = RoleName.SISWA;
    (authorizationService.isUserAuthorized as jest.Mock).mockResolvedValue({ allowed: true });

    const middleware = requireCapability('attendance.scan');
    await middleware(req, reply);

    expect(authorizationService.isUserAuthorized).toHaveBeenCalledWith('user-id', ['attendance.scan'], { user: req.user });
    expect(reply.status).not.toHaveBeenCalled();
  });
  
  it('should return 403 for SISWA if capability is missing', async () => {
    req.user.roleName = RoleName.SISWA;
    req.user.role = { permissions: [] };
    (authorizationService.isUserAuthorized as jest.Mock).mockResolvedValue({ allowed: false });

    const middleware = requireCapability('attendance.scan');
    await middleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(403);
  });

  it('should support SISWA payload with userId field (no id)', async () => {
    req.user = {
      userId: 'user-id',
      email: 'test@example.com',
      roleName: RoleName.SISWA,
      capabilities: ['academic.view.guru'],
      tenantId: 'tenant-id',
    };
    (authorizationService.isUserAuthorized as jest.Mock).mockResolvedValue({ allowed: true });

    const middleware = requireCapability("academic.view.guru");
    await middleware(req, reply);

    expect(reply.status).not.toHaveBeenCalled();
  });
});
