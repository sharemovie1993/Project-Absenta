SELECT 
  oa.id, 
  oa.user_id, 
  oa.kelas_id, 
  oa.is_active, 
  oa.start_date, 
  oa.end_date, 
  op.name as position_name, 
  op.scope_type 
FROM "OrganizationalAssignment" oa
JOIN "OrganizationalPosition" op ON oa.position_id = op.id
WHERE oa.user_id = '933486cc-e74f-410a-afe1-7667e41135eb'
  AND oa.tenant_id = '990d0b8c-5722-4977-94fd-4378f8cb6e04';
