import { PrismaClient } from '@prisma/client';
import { emitDomainEvent } from '../../infra/event-bus';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const rfid = args[0] || 'ABC123XYZ';

  const tenant = await prisma.tenant.findFirst({ where: { domain: 'smkn1cimahi' } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.siswa.findFirst({
    where: { tenant_id: tenant.id, no_rfid: rfid }
  });
  if (!student) throw new Error(`Student with RFID ${rfid} not found`);

  console.log(`Firing GATE tap event for Student: ${student.nama_siswa} (RFID: ${rfid})`);

  // Emitting the event that triggers the reconciliation worker
  await emitDomainEvent({
    event_type: 'attendance.tap',
    tenant_id: tenant.id,
    source_service: 'gate.simulation',
    payload: {
        rfid: rfid,
        siswa_id: student.id,
        waktu: new Date().toISOString(),
        is_masuk: true,
        terminal_id: 'SIMULATED_GATE_1'
    }
  });

  console.log('EVENT EMITTED. Reconciliation worker should pick this up.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
