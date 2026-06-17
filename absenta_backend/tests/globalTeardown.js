/**
 * Jest Global Teardown
 * 
 * Runs once after all tests complete
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up test environment...');

  const tmpStatePath = path.join(os.tmpdir(), 'absenta_jest_testdb.json');
  if (fs.existsSync(tmpStatePath)) {
    try {
      const raw = fs.readFileSync(tmpStatePath, 'utf8');
      const state = JSON.parse(raw);
      if (state && state.containerId) {
        try {
          execSync(`docker rm -f ${state.containerId}`, { stdio: 'ignore' });
        } catch (e) {}
      }
    } catch (e) {}
    try { fs.rmSync(tmpStatePath, { force: true }); } catch (e) {}
  }

  console.log('✅ Test environment cleanup complete');
};
