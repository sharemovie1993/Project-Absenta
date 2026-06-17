const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTree() {
  const menus = await prisma.menu.findMany({ 
      where: { is_active: true },
      orderBy: { order: 'asc' }
  });
  
  const byId = {};
  menus.forEach(m => byId[m.id] = { ...m, children: [] });
  const roots = [];
  menus.forEach(m => {
    if (m.parent_id && byId[m.parent_id]) {
      byId[m.parent_id].children.push(byId[m.id]);
    } else {
      roots.push(byId[m.id]);
    }
  });

  function print(nodes, indent = 0) {
    nodes.forEach(n => {
      console.log(' '.repeat(indent) + `- [${n.name}] Path: ${n.path}, Cap: ${n.required_capability}`);
      print(n.children, indent + 2);
    });
  }

  console.log('--- Full Menu Tree ---');
  print(roots);
}

checkTree().catch(console.error).finally(() => prisma.$disconnect());
