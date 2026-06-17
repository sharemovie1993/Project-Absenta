import { prisma } from './src/utils/prisma';
import { organizationalAuthorizationEngine } from './src/modules/auth/services/organizational-authorization.engine';

async function debugHidayat() {
    const hidayatEmail = 'hidayat.catur@school.id'; // Asumsi email
    const user = await prisma.user.findFirst({
        where: { email: { contains: 'hidayat' } },
        include: { Role: true }
    });

    if (!user) {
        console.log('User Hidayat not found');
        return;
    }

    console.log('User Found:', user.id, user.email);
    const scope = await organizationalAuthorizationEngine.resolveUserScope(user.id, user.tenant_id);
    console.log('Resolved Scope:', JSON.stringify(scope, null, 2));

    const assignments = await prisma.organizationalAssignment.findMany({
        where: { user_id: user.id },
        include: { Position: true, Kelas: true }
    });
    console.log('Assignments:', JSON.stringify(assignments.map(a => ({
        pos: a.Position.code,
        kelas: a.Kelas?.nama_kelas,
        kelas_id: a.kelas_id,
        active: a.is_active
    })), null, 2));
}

debugHidayat().catch(console.error);
