const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/cooperative/Products.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const regex1 = /:\s*any/g;
const regex2 = /<\s*any\s*>/g;

lines.forEach((line, index) => {
  if (regex1.test(line) || regex2.test(line)) {
    console.log(`${index + 1}: ${line}`);
  }
});
