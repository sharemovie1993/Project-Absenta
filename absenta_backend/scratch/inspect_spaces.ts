import fs from 'fs';

const path = 'src/modules/attendance/gerbang/controllers/gerbang.controller.ts';
let content = fs.readFileSync(path, 'utf8');

// Pattern to find the redundant SISWA check
const pattern = /if\s*\(roleName\s*===\s*RoleName\.SISWA\s*&&\s*userId\)\s*\{[\s\S]*?isPetugas\s*=\s*await\s*prisma\.organizationalAssignment\.findFirst[\s\S]*?\}\s*else\s*\{[\s\S]*?\}\s*\}\s*if\s*\(!isPetugas\)\s*\{[\s\S]*?\}\s*\}/g;

// Wait, the actual code doesn't have else in all cases.
// Let's use a simpler marker.

const redundantGetSessions = /if\s*\(roleName\s*===\s*RoleName\.SISWA\s*&&\s*userId\)\s*\{[\s\S]*?if\s*\(!isPetugas\)\s*\{[\s\S]*?return\s*\{[\s\S]*?\}\s*\}\s*\}/g;

// I'll just replace with a known unique string and then replace that.
// BUT better yet, I'll print the exact lines to a file and read it.

console.log('Reading specific block...');
const lines = content.split('\n');
console.log('LINE 1012 RAW:');
console.log(JSON.stringify(lines[1011])); // 0-indexed
console.log('LINE 1013 RAW:');
console.log(JSON.stringify(lines[1012]));
