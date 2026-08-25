// @ts-nocheck
import { getTenantTimezone } from '@/utils/timezone.utils';
import { appLogger } from '@/utils/app-logger';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../../utils/prisma';
import { mockTenant } from '../../../utils/mocks';
import { requireCapability } from '@/middlewares/requireCapability';

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
        'cooperative_default_interest_rate'
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
}
