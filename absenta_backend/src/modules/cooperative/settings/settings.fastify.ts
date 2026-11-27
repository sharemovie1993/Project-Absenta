// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';
import { STRUKTUR_CODES } from '@/config/organization-structure';
import { authorizationService } from '@/modules/auth/services/authorization.service';
import { organizationalContextCache } from '@/modules/auth/services/organizational-context-cache';
import {
    CHAIRMAN_DELEGATION_CONFIG_KEY,
    CHAIRMAN_DELEGATION_GROUPS,
    CHAIRMAN_CAPABILITY_SET,
    parseChairmanDelegationConfig,
} from './chairman-delegation';

export default async function settingsRoutes(fastify: any) {
    const getTenantId = (req: any) => {
        return req.dataScope?.tenantId || req.user?.tenant_id || req.user?.tenantId || mockTenant.id;
    };

    const COOP_CONFIG_KEYS = [
        'cooperative_name',
        'cooperative_legal_no',
        'cooperative_address',
        'cooperative_phone',
        'cooperative_email',
        'cooperative_website',
        'cooperative_logo_url',
        'cooperative_default_interest_rate',
        'cooperative_loan_min_membership_enabled',
        'cooperative_loan_min_membership_months',
        'cooperative_loan_require_simpanan_pokok',
        'cooperative_show_member_shu_estimate'
    ];

    // GET /cooperative/settings
    fastify.get('/', { preHandler: [requireCapability(['cooperative.dashboard.view.overview', 'cooperative.loans.apply', 'cooperative.settings.view'])] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);

            const configs = await prisma.config.findMany({
                where: {
                    tenant_id: tenantId,
                    key: { in: COOP_CONFIG_KEYS }
                }
            });

            const configMap = configs.reduce((acc, curr) => {
                acc[curr.key] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            // Fetch dynamic signature names from Organizational Structure
            // 1. Get Bendahara Koperasi Name
            const bendaharaAssign = await prisma.organizationalAssignment.findFirst({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                    Position: { code: 'BENDAHARA_KOPERASI' }
                },
                include: {
                    User: {
                        include: {
                            Guru: { select: { nama_guru: true } },
                            Siswa: { select: { nama_siswa: true } }
                        }
                    }
                }
            });
            const bendaharaName = bendaharaAssign?.User?.Guru?.nama_guru || bendaharaAssign?.User?.Siswa?.nama_siswa || '';

            // 2. Get Ketua Koperasi Name
            const ketuaAssign = await prisma.organizationalAssignment.findFirst({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                    Position: { code: 'KETUA_KOPERASI' }
                },
                include: {
                    User: {
                        include: {
                            Guru: { select: { nama_guru: true } },
                            Siswa: { select: { nama_siswa: true } }
                        }
                    }
                }
            });
            const ketuaName = ketuaAssign?.User?.Guru?.nama_guru || ketuaAssign?.User?.Siswa?.nama_siswa || '';

            // 3. Get Kepala Sekolah Name (Pembina)
            const kepsekAssign = await prisma.organizationalAssignment.findFirst({
                where: {
                    tenant_id: tenantId,
                    is_active: true,
                    Position: { code: 'KEPALA_SEKOLAH' }
                },
                include: {
                    User: {
                        include: {
                            Guru: { select: { nama_guru: true } },
                            Siswa: { select: { nama_siswa: true } }
                        }
                    }
                }
            });
            const kepsekName = kepsekAssign?.User?.Guru?.nama_guru || kepsekAssign?.User?.Siswa?.nama_siswa || '';

            // Default values if not configured yet
            return reply.send({
                success: true,
                data: {
                    cooperative_name: configMap['cooperative_name'] || '',
                    cooperative_legal_no: configMap['cooperative_legal_no'] || '',
                    cooperative_address: configMap['cooperative_address'] || '',
                    cooperative_phone: configMap['cooperative_phone'] || '',
                    cooperative_email: configMap['cooperative_email'] || '',
                    cooperative_website: configMap['cooperative_website'] || '',
                    cooperative_logo_url: configMap['cooperative_logo_url'] || '',
                    cooperative_default_interest_rate: configMap['cooperative_default_interest_rate'] || '1.5',
                    cooperative_loan_min_membership_enabled: configMap['cooperative_loan_min_membership_enabled'] || 'false',
                    cooperative_loan_min_membership_months: configMap['cooperative_loan_min_membership_months'] || '3',
                    cooperative_loan_require_simpanan_pokok: configMap['cooperative_loan_require_simpanan_pokok'] ?? 'true',
                    cooperative_show_member_shu_estimate: configMap['cooperative_show_member_shu_estimate'] ?? 'true',
                    signatures: {
                        bendahara: bendaharaName,
                        ketua: ketuaName,
                        kepsek: kepsekName
                    }
                }
            });
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            req.log.error(error);
            return reply.code(500).send({ success: false, error: 'Failed to retrieve cooperative settings' });
        }
    });

    // GET /cooperative/settings/logo-proxy?url=...
    fastify.get('/logo-proxy', { preHandler: [requireCapability(['cooperative.dashboard.view.overview', 'cooperative.loans.apply', 'cooperative.settings.view'])] }, async (req: any, reply: any) => {
        try {
            const url = req.query.url;
            if (!url) {
                return reply.status(400).send({ success: false, message: 'URL is required'  });
            }

            const response = await require('axios').get(url, {
                responseType: 'arraybuffer'
            });

            const contentType = response.headers['content-type'] || 'image/png';
            reply.header('Content-Type', contentType);
            return reply.send(Buffer.from(response.data));
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            req.log.error(error);
            return reply.status(500).send({ success: false, message: 'Failed to proxy logo image'  });
        }
    });

    // PUT /cooperative/settings
    fastify.put('/', { preHandler: [requireCapability('cooperative.members.manage')] }, async (req: any, reply: any) => {
        try {
            const tenantId = getTenantId(req);
            const body = req.body || {};

            const updates = [];
            for (const key of COOP_CONFIG_KEYS) {
                if (body[key] !== undefined) {
                    const val = String(body[key] ?? '').trim();
                    
                    const existing = await prisma.config.findFirst({
                        where: { tenant_id: tenantId, key }
                    });

                    if (existing) {
                        updates.push(
                            prisma.config.update({
                                where: { id: existing.id },
                                data: { value: val }
                            })
                        );
                    } else {
                        updates.push(
                            prisma.config.create({
                                data: {
                                    tenant_id: tenantId,
                                    key,
                                    value: val
                                }
                            })
                        );
                    }
                }
            }

            if (updates.length > 0) {
                await prisma.$transaction(updates);
            }

            return reply.send({ success: true, message: 'Cooperative settings saved successfully' });
        } catch (error: any) {
        appLogger.error({ err: error }, 'Cooperative route error');
            req.log.error(error);
            return reply.code(500).send({ success: false, error: 'Failed to save cooperative settings' });
        }
    });

    const isActiveChairmanForTenant = async (tenantId: string, userId?: string) => {
        if (!userId) return false;
        const now = new Date();
        const chairmanAssign = await prisma.organizationalAssignment.findFirst({
            where: {
                tenant_id: tenantId,
                user_id: String(userId),
                is_active: true,
                Position: { code: STRUKTUR_CODES.KETUA_KOPERASI },
                OR: [{ start_date: null }, { start_date: { lte: now } }],
            },
            select: { id: true, end_date: true },
        });
        if (!chairmanAssign) return false;
        if (chairmanAssign.end_date && chairmanAssign.end_date.getTime() < now.getTime()) {
            return false;
        }
        return true;
    };

    // GET /cooperative/settings/delegation
    fastify.get(
        '/delegation',
        { preHandler: [requireCapability(['cooperative.dashboard.view.overview', 'cooperative.settings.view', 'cooperative.members.manage'])] },
        async (req: any, reply: any) => {
            try {
                const tenantId = getTenantId(req);
                const userId = req.user?.id || req.user?.userId || req.user?.user_id;

                const [cfg, isChairman, orgPositions] = await Promise.all([
                    prisma.config.findFirst({
                        where: { tenant_id: tenantId, key: CHAIRMAN_DELEGATION_CONFIG_KEY },
                    }),
                    isActiveChairmanForTenant(tenantId, userId),
                    prisma.organizationalPosition.findMany({
                        where: {
                            tenant_id: tenantId,
                            code: { not: STRUKTUR_CODES.KETUA_KOPERASI },
                        },
                        orderBy: { name: 'asc' },
                        include: {
                            Assignments: {
                                where: { is_active: true },
                                include: {
                                    User: {
                                        select: {
                                            id: true,
                                            full_name: true,
                                            Guru: { select: { nama_guru: true } },
                                            Siswa: { select: { nama_siswa: true } },
                                        },
                                    },
                                },
                            },
                        },
                    }),
                ]);

                // Prioritaskan posisi koperasi di bagian atas, lalu posisi struktural lain di tenant
                const coopPriority: Record<string, number> = {
                    SEKRETARIS_KOPERASI: 1,
                    BENDAHARA_KOPERASI: 2,
                    MANAJER_TOKO_KOPERASI: 3,
                    PENGAWAS_KOPERASI: 4,
                };

                const availablePositions = orgPositions
                    .map((p: any) => ({
                        code: p.code,
                        name: p.name,
                        isCooperativeRole: Boolean(coopPriority[p.code]) || String(p.code).includes('KOPERASI'),
                        holders: (p.Assignments || [])
                            .map((a: any) => a.User?.Guru?.nama_guru || a.User?.Siswa?.nama_siswa || a.User?.full_name)
                            .filter(Boolean),
                    }))
                    .sort((a: any, b: any) => {
                        const pa = coopPriority[a.code] || (a.isCooperativeRole ? 10 : 100);
                        const pb = coopPriority[b.code] || (b.isCooperativeRole ? 10 : 100);
                        if (pa !== pb) return pa - pb;
                        return a.name.localeCompare(b.name);
                    });

                return reply.send({
                    success: true,
                    data: {
                        delegation: parseChairmanDelegationConfig(cfg?.value),
                        isChairman,
                        availablePositions,
                        capabilityGroups: CHAIRMAN_DELEGATION_GROUPS,
                    },
                });
            } catch (error: any) {
                appLogger.error({ err: error }, 'Cooperative delegation GET error');
                return reply.code(500).send({ success: false, message: 'Gagal memuat konfigurasi delegasi Ketua Koperasi.' });
            }
        }
    );

    // PUT /cooperative/settings/delegation
    fastify.put(
        '/delegation',
        { preHandler: [requireCapability(['cooperative.settings.view', 'cooperative.settings.update', 'cooperative.members.manage'])] },
        async (req: any, reply: any) => {
            try {
                const tenantId = getTenantId(req);
                const userId = req.user?.id || req.user?.userId || req.user?.user_id;

                // Hanya Ketua Koperasi aktif di tenant ini yang berhak mengatur delegasi
                const isChairman = await isActiveChairmanForTenant(tenantId, userId);
                if (!isChairman) {
                    return reply.code(403).send({
                        success: false,
                        message: 'Hak prerogatif ditolak: hanya Ketua Koperasi aktif di tenant ini yang dapat mengatur delegasi wewenang.',
                    });
                }

                const body = (req.body || {}) as any;
                const enabled = Boolean(body.enabled);
                const targetPositions = Array.isArray(body.targetPositions)
                    ? Array.from(
                          new Set(
                              body.targetPositions
                                  .map((p: unknown) => String(p || '').trim().toUpperCase())
                                  .filter((p: string) => Boolean(p) && p !== STRUKTUR_CODES.KETUA_KOPERASI)
                          )
                      )
                    : [];

                if (enabled && targetPositions.length === 0) {
                    return reply.code(400).send({
                        success: false,
                        message: 'Pilih minimal satu posisi penerima delegasi sebelum mengaktifkan.',
                    });
                }

                const mode: 'ALL' | 'CUSTOM' = body.mode === 'CUSTOM' ? 'CUSTOM' : 'ALL';
                const capabilities = Array.isArray(body.capabilities)
                    ? Array.from(
                          new Set(
                              body.capabilities
                                  .map((c: unknown) => String(c || '').trim())
                                  .filter((c: string) => CHAIRMAN_CAPABILITY_SET.has(c))
                          )
                      )
                    : [];

                if (enabled && mode === 'CUSTOM' && capabilities.length === 0) {
                    return reply.code(400).send({
                        success: false,
                        message: 'Pilih minimal satu hak akses pada mode Kustomisasi.',
                    });
                }

                const operatorUser = userId
                    ? await prisma.user.findUnique({
                          where: { id: String(userId) },
                          select: {
                              full_name: true,
                              Guru: { select: { nama_guru: true } },
                          },
                      })
                    : null;

                const payload = {
                    enabled,
                    targetPositions,
                    mode,
                    capabilities,
                    notes: body.notes ? String(body.notes).trim() : '',
                    updatedAt: new Date().toISOString(),
                    updatedByUserId: userId ? String(userId) : undefined,
                    updatedByName: operatorUser?.Guru?.nama_guru || operatorUser?.full_name || 'Ketua Koperasi',
                };

                const existing = await prisma.config.findFirst({
                    where: { tenant_id: tenantId, key: CHAIRMAN_DELEGATION_CONFIG_KEY },
                });

                const serialized = JSON.stringify(payload);
                if (existing) {
                    await prisma.config.update({
                        where: { id: existing.id },
                        data: { value: serialized },
                    });
                } else {
                    await prisma.config.create({
                        data: {
                            tenant_id: tenantId,
                            key: CHAIRMAN_DELEGATION_CONFIG_KEY,
                            value: serialized,
                        },
                    });
                }

                // Invalidate cache seluruh pemegang jabatan di tenant ini agar hak akses langsung efektif
                const tenantHolders = await prisma.organizationalAssignment.findMany({
                    where: { tenant_id: tenantId, is_active: true },
                    select: { user_id: true },
                });
                const uniqueUserIds = Array.from(new Set(tenantHolders.map((h: any) => String(h.user_id))));
                await Promise.all(uniqueUserIds.map((uid) => organizationalContextCache.invalidateUser(uid)));
                authorizationService.invalidateUserCapabilities();

                appLogger.info({
                    action: 'COOP_CHAIRMAN_DELEGATION_UPDATED',
                    tenantId,
                    userId,
                    enabled,
                    targetPositions,
                    mode,
                    capabilitiesCount: mode === 'ALL' ? 'ALL' : capabilities.length,
                });

                return reply.send({
                    success: true,
                    message: enabled
                        ? 'Delegasi wewenang Ketua Koperasi berhasil diaktifkan.'
                        : 'Delegasi wewenang Ketua Koperasi dinonaktifkan.',
                    data: payload,
                });
            } catch (error: any) {
                appLogger.error({ err: error }, 'Cooperative delegation PUT error');
                return reply.code(500).send({ success: false, message: 'Gagal menyimpan konfigurasi delegasi Ketua Koperasi.' });
            }
        }
    );
}
