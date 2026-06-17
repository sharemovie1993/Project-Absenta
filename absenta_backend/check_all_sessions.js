const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const today = "2026-04-16";
    console.log("Checking all sessions for date:", today);
    try {
        const sessions = await prisma.absensiSesi.findMany({
            where: {
                tanggal: today
            },
            include: {
                Tenant: {
                    select: {
                        name: true,
                        slug: true
                    }
                }
            }
        });

        if (sessions.length > 0) {
            console.log(`Found ${sessions.length} sessions:`);
            sessions.forEach(s => {
                console.log(`- Tenant: ${s.Tenant.name} (${s.Tenant.slug}) | ID: ${s.id} | Name: ${s.nama_sesi}`);
            });
        } else {
            console.log("No sessions found for today globally.");
            
            // Just double check if there are ANY sessions at all to be sure the DB is connected
            const count = await prisma.absensiSesi.count();
            console.log("Total sessions in DB:", count);
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
