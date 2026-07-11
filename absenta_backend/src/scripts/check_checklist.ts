import { PrepChecklistService } from '../modules/academic/services/prep-checklist.service';

async function main() {
  const tenantId = 'b4b316ce-c4cf-4519-a7a1-c0d3284d8745';
  const service = new PrepChecklistService();
  const res = await service.getChecklist(tenantId);
  console.log('CURRENT ACTIVE:', res.current_year?.tahun, res.current_semester?.nama_semester);
  console.log('TARGET YEAR:', res.target_year?.tahun, res.target_semester?.nama_semester);
  console.log('CHECKLIST DETAILS:');
  res.checklist.forEach(item => {
    console.log(`- [${item.completed ? 'x' : ' '}] ${item.label}: ${item.status_text}`);
  });
}

main().catch(console.error);
