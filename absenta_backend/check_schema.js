const fs = require('fs');

const schema = fs.readFileSync('d:/BarayaProject/Project Absenta/absenta_backend/prisma/schema.prisma', 'utf8');
const lines = schema.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('model Role') || lines[i].includes('model Capab')) {
    console.log(lines.slice(i, i + 20).join('\n'));
  }
}
