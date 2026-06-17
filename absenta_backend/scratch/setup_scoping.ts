const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setup() { 
  const rplUnitId = '8901d8d7-3f82-4810-8007-5eaa7aea4e40';
  const vanesaAssignmentId = '738ccbca-100a-41ca-be8b-1ada1c265adc';
  const labRplId = 'c2837861-ffe8-4f4f-818c-d593e371ab61';

  try {
    await prisma.organizationalAssignment.update({ 
      where: { id: vanesaAssignmentId }, 
      data: { unit_id: rplUnitId } 
    });
    console.log('Vanesa assigned to RPL unit');
  } catch (e) {
    console.warn('Failed to update Vanesa assignment:', e);
  }

  try {
    await prisma.sarprasLocation.update({ 
      where: { id: labRplId }, 
      data: { unit_id: rplUnitId } 
    });
    console.log('Laboratorium RPL assigned to RPL unit');
  } catch (e) {
    console.warn('Failed to update Location:', e);
  }
}

setup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
