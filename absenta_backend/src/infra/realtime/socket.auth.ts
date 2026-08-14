import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export type ParentTokenValidator = (token: string) => Promise<any>;

export function setupSocketAuth(
  io: any,
  ioApi: any,
  fastify: any,
  opts?: { validateParentToken?: ParentTokenValidator }
) {
  io.use(async (socket: any, next: any) => {
    try {
      const origin = (socket.handshake.headers as any)?.origin || (socket.handshake.headers as any)?.referer || '';
      const address = String((socket.handshake as any)?.address || '');
      const url = String((socket.handshake as any)?.url || '');
      const authTokenRaw = (socket.handshake.auth as any)?.token;
      const authHeaderRaw = (socket.handshake.headers as any)?.authorization;
      const q = (socket.handshake as any)?.query || {};
      const queryTokenRaw = (q as any)?.token ?? (q as any)?.access_token ?? (q as any)?.auth_token;
      const queryToken = Array.isArray(queryTokenRaw) ? String(queryTokenRaw[0] || '') : String(queryTokenRaw || '');
      const hasHeaderToken = typeof authHeaderRaw === 'string' && authHeaderRaw.length > 0;
      const hasAuthToken = typeof authTokenRaw === 'string' && authTokenRaw.length > 0;
      const hasQueryToken = queryToken.length > 0;
      fastify.log.info(`[WS AUTH] Handshake address=${address} origin=${origin} url=${url} hasAuthToken=${hasAuthToken} hasHeaderToken=${hasHeaderToken} hasQueryToken=${hasQueryToken}`);

      let headerToken = '';
      if (hasHeaderToken) {
        headerToken = authHeaderRaw.startsWith('Bearer ') ? authHeaderRaw.slice(7) : authHeaderRaw;
      }
      const token = hasAuthToken ? authTokenRaw : (headerToken || queryToken);
      if (!token) {
        fastify.log.warn('[WS AUTH] Unauthorized: missing token');
        return next(new Error('Unauthorized: missing token'));
      }

      // Try validating as Standard User (JWT)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded?.id || '';
        const userTenant = decoded?.tenantId || decoded?.tenant_id || '';
        const userRole = decoded?.roleName || decoded?.role?.name || '';
        const userName = decoded?.full_name || decoded?.fullName || decoded?.name || decoded?.username || '';
        if (!userRole) {
          fastify.log.warn('[WS AUTH] Unauthorized: missing role');
          return next(new Error('Unauthorized: missing role'));
        }

        // Guard: Ensure provided tenantId (if any) matches token
        const providedTenantId = (socket.handshake.query as any)?.tenantId || (socket.handshake.auth as any)?.tenantId;
        if (providedTenantId && String(providedTenantId) !== String(userTenant)) {
          fastify.log.warn(`[WS AUTH] Tenant mismatch: token=${userTenant}, provided=${providedTenantId}`);
          return next(new Error('Unauthorized: Tenant mismatch'));
        }

        fastify.log.info(`[WS AUTH] Token verified userId=${userId} name=${userName} tenantId=${userTenant} roleName=${userRole}`);
        socket.data.user = { id: userId, name: userName, full_name: userName, tenantId: userTenant, roleName: userRole };
        return next();
      } catch (jwtError) {
        // If JWT fails, try validating as Parent Token
        try {
           if (!opts?.validateParentToken) throw new Error('Parent token validator not configured');
           const parent = await opts.validateParentToken(token);
           if (!parent) throw new Error('Invalid Parent Token');
           
           const activeStudents = parent.OrangTuaSiswa
             ?.filter((link: any) => link.Siswa?.status === 'AKTIF')
             .map((link: any) => link.Siswa?.id) || [];
             
           socket.data.user = {
             id: parent.id,
             tenantId: parent.tenant_id,
             roleName: 'PARENT',
             activeStudents
           };
           fastify.log.info(`[WS AUTH] Parent Token verified parentId=${parent.id} tenantId=${parent.tenant_id} students=${activeStudents.length}`);
           return next();
        } catch (parentError) {
           // Both failed
           const msg = typeof (jwtError as any)?.message === 'string' ? (jwtError as any).message : String(jwtError);
          fastify.log.error(`[WS AUTH] Token verification failed (JWT & Parent): ${msg}`);
          return next(new Error('Unauthorized: invalid token'));
        }
      }

    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      fastify.log.error(`[WS AUTH] Handshake error: ${msg}`);
      next(new Error('Unauthorized: handshake error'));
    }
  });

  ioApi.use(async (socket: any, next: any) => {
    try {
      const origin = (socket.handshake.headers as any)?.origin || (socket.handshake.headers as any)?.referer || '';
      const address = String((socket.handshake as any)?.address || '');
      const url = String((socket.handshake as any)?.url || '');
      const authTokenRaw = (socket.handshake.auth as any)?.token;
      const authHeaderRaw = (socket.handshake.headers as any)?.authorization;
      const q = (socket.handshake as any)?.query || {};
      const queryTokenRaw = (q as any)?.token ?? (q as any)?.access_token ?? (q as any)?.auth_token;
      const queryToken = Array.isArray(queryTokenRaw) ? String(queryTokenRaw[0] || '') : String(queryTokenRaw || '');
      const hasHeaderToken = typeof authHeaderRaw === 'string' && authHeaderRaw.length > 0;
      const hasAuthToken = typeof authTokenRaw === 'string' && authTokenRaw.length > 0;
      const hasQueryToken = queryToken.length > 0;
      fastify.log.info(`[WS AUTH] Handshake address=${address} origin=${origin} url=${url} hasAuthToken=${hasAuthToken} hasHeaderToken=${hasHeaderToken} hasQueryToken=${hasQueryToken}`);

      let headerToken = '';
      if (hasHeaderToken) {
        headerToken = authHeaderRaw.startsWith('Bearer ') ? authHeaderRaw.slice(7) : authHeaderRaw;
      }
      const token = hasAuthToken ? authTokenRaw : (headerToken || queryToken);
      if (!token) {
        fastify.log.warn('[WS AUTH] Unauthorized: missing token');
        return next(new Error('Unauthorized: missing token'));
      }

      // Try validating as Standard User (JWT)
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const userId = decoded?.id || '';
        const userTenant = decoded?.tenantId || decoded?.tenant_id || '';
        const userRole = decoded?.roleName || decoded?.role?.name || '';
        const userName = decoded?.full_name || decoded?.fullName || decoded?.name || decoded?.username || '';
        
        // Guard: Ensure provided tenantId (if any) matches token
        const providedTenantId = (socket.handshake.query as any)?.tenantId || (socket.handshake.auth as any)?.tenantId;
        if (providedTenantId && String(providedTenantId) !== String(userTenant)) {
          fastify.log.warn(`[WS AUTH] Tenant mismatch: token=${userTenant}, provided=${providedTenantId}`);
          return next(new Error('Unauthorized: Tenant mismatch'));
        }

        fastify.log.info(`[WS AUTH] Token verified userId=${userId} name=${userName} tenantId=${userTenant} roleName=${userRole}`);
        socket.data.user = { id: userId, name: userName, full_name: userName, tenantId: userTenant, roleName: userRole };
        return next();
      } catch (jwtError) {
         // If JWT fails, try validating as Parent Token
         try {
            if (!opts?.validateParentToken) throw new Error('Parent token validator not configured');
            const parent = await opts.validateParentToken(token);
            if (!parent) throw new Error('Invalid Parent Token');
            
            const activeStudents = parent.OrangTuaSiswa
              ?.filter((link: any) => link.Siswa?.status === 'AKTIF')
              .map((link: any) => link.Siswa?.id) || [];
              
            socket.data.user = {
              id: parent.id,
              tenantId: parent.tenant_id,
              roleName: 'PARENT',
              activeStudents
            };
            fastify.log.info(`[WS AUTH] Parent Token verified parentId=${parent.id} tenantId=${parent.tenant_id} students=${activeStudents.length}`);
            return next();
         } catch (parentError) {
            // Both failed
            const msg = typeof (jwtError as any)?.message === 'string' ? (jwtError as any).message : String(jwtError);
            fastify.log.error(`[WS AUTH] Token verification failed (JWT & Parent): ${msg}`);
            return next(new Error('Unauthorized: invalid token'));
         }
      }

    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      fastify.log.error(`[WS AUTH] Token verification failed: ${msg}`);
      next(new Error('Unauthorized: invalid token'));
    }
  });
}
