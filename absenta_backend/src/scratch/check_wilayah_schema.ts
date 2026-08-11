import { readFileSync } from 'fs';
import { join } from 'path';

const schemaPath = join(__dirname, '../../prisma/schema.prisma');
const schema = readFileSync(schemaPath, 'utf8');

const modelMatches = Array.from(schema.matchAll(/model\s+(\w+)/g)).map(m => m[1]);

console.log('Total Models in Schema:', modelMatches.length);
const wilayahModels = modelMatches.filter(m => /wilayah|provinsi|kabupaten|kecamatan|kelurahan|region|area/i.test(m));
console.log('Wilayah/Region Related Models:', wilayahModels);
console.log('All Models:', modelMatches);
