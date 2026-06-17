const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const schemaPath = path.join('prisma', 'schema.prisma');

try {
  // Ensure we are in the project root
  const rootDir = path.resolve(__dirname, '..');
  process.chdir(rootDir);

  console.log('Checking for schema changes...');
  
  // Check if file is modified or untracked
  let status = '';
  try {
      status = execSync(`git status --porcelain "${schemaPath}"`).toString();
  } catch (e) {
      // If git status fails, maybe not a git repo or other error
      console.warn('Git status check failed, proceeding with forced add just in case.');
      status = 'FORCE_UPDATE';
  }

  if (status.trim()) {
    console.log('Schema changes detected. Backing up...');
    try {
        execSync(`git add "${schemaPath}"`);
        execSync(`git commit -m "Auto-backup: schema.prisma before operation"`);
        console.log('Schema backed up successfully.');
    } catch (commitError) {
        if (commitError.message.includes('nothing to commit')) {
             console.log('Nothing to commit (changes might be whitespace or already staged).');
        } else {
             throw commitError;
        }
    }
  } else {
    console.log('No schema changes to backup.');
  }
} catch (error) {
  console.error('Backup warning:', error.message);
  // Do not fail the process, just warn
}
