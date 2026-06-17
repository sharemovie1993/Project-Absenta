const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

const regex = /model\s+(\w+)\s+{[\s\S]*?}/g;
let match;
const models = [];
while ((match = regex.exec(schemaContent)) !== null) {
  const modelName = match[1];
  if (modelName.toLowerCase().includes('pkl') || modelName.toLowerCase().includes('mitra') || modelName.toLowerCase().includes('absensi')) {
    models.push(match[0]);
  }
}

console.log('--- FOUND MODELS ---');
models.forEach(m => console.log(m + '\n'));
