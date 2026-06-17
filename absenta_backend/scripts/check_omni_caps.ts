import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const assignments = await p.organizationalAssignment.findMany({
        where: {
            User: { email: 'guru0@aa8847c6-c265-4086-b786-99116a6b9d75.com' }
        },
        include: {
            Position: {
                include: {
                    organizationalCaps: true
                }
            }
        }
    });

    const result = assignments.map(a => ({
        code: a.Position.code,
        name: a.Position.name,
        caps: a.Position.organizationalCaps.map(c => c.permission_id)
    }));

    console.log(JSON.stringify(result, null, 2));
}
main().finally(() => p.$disconnect());
