import * as fs from 'fs';


function main() {
  const logPath = 'C:\\Users\\SERVER-DELL\\.gemini\\antigravity\\brain\\d72d4f30-f957-4d6c-9178-fe3f77f2857f\\.system_generated\\logs\\overview.txt';
  if (!fs.existsSync(logPath)) {
    console.error('Log file not found!');
    return;
  }

  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  
  // Baris 433 (0-indexed adalah 432)
  const line433 = lines[432];
  if (!line433) {
    console.error('Line 433 is empty or not found!');
    return;
  }

  try {
    const parsed = JSON.parse(line433);
    console.log('=== STEP INDEX ===', parsed.step_index);
    console.log('=== CONTENT ===');
    console.log(parsed.content);
  } catch (err: any) {
    console.error('Failed to parse JSON:', err.message);
    // Fallback: print raw snippet
    console.log(line433.substring(0, 1000));
  }
}

main();
