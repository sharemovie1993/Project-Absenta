import { prisma } from '../utils/prisma';

async function main() {
  console.log('Starting data update simulation...');

  // 1. Find records to update (03 Jan)
  // We look for taps after 2026-01-02 17:00 UTC (which is 03 Jan 00:00 WIB)
  const targetDate = new Date('2026-01-02T17:00:00Z');
  
  const records = await prisma.absenGerbangSiswa.findMany({
    where: {
      waktu_tap: {
        gte: targetDate
      }
    }
  });

  console.log(`Found ${records.length} records to shift back 1 day.`);

  // 2. Update each record
  // Session ID for 02 Jan (starts 01 Jan 16:00 UTC): 'e1c075bd-a51c-41bb-9434-d49d96ccec7f'
  const newSessionId = 'e1c075bd-a51c-41bb-9434-d49d96ccec7f';

  for (const record of records) {
    if (record.waktu_tap) {
      const newDate = new Date(record.waktu_tap.getTime() - 24 * 60 * 60 * 1000);
      await prisma.absenGerbangSiswa.update({
        where: { id_created_at: { id: record.id, created_at: record.created_at! } },
        data: {
          waktu_tap: newDate,
          sesi_gerbang_id: newSessionId
        }
      });
      console.log(`Updated record ${record.id}: ${record.waktu_tap.toISOString()} -> ${newDate.toISOString()}`);
    }
  }

  // 3. Delete the empty session (the one that covered 03 Jan)
  // ID from previous analysis: 'ec45c1fd-3b5f-448e-bd9c-7c7a30063d3c'
  const oldSessionId = 'ec45c1fd-3b5f-448e-bd9c-7c7a30063d3c';
  try {
    // Check if session has any other records
    const remaining = await prisma.absenGerbangSiswa.count({
      where: { sesi_gerbang_id: oldSessionId }
    });
    
    if (remaining === 0) {
      await prisma.sesiGerbang.delete({
        where: { id: oldSessionId }
      });
      console.log(`Deleted empty session ${oldSessionId}`);
    } else {
      console.log(`Session ${oldSessionId} still has ${remaining} records, skipping delete.`);
    }
  } catch (e: unknown) {
    const error = e as Error;
    console.log(`Could not delete session ${oldSessionId}: ${error.message}`);
  }

  console.log('Update complete.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
