const fs = require('fs');
const path = require('path');

// Helper to read and parse a .env file dynamically
function readEnv(filePath) {
  const env = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmed.substring(0, firstEqual).trim();
            let val = trimmed.substring(firstEqual + 1).trim();
            // Remove surrounding quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    console.error(`[PM2 Ecosystem] Error reading env file at ${filePath}:`, err);
  }
  return env;
}

// Load configurations from env files
const backendEnv = readEnv(path.join(__dirname, 'absenta_backend', '.env'));
const frontendEnv = readEnv(path.join(__dirname, 'absenta_frontend', '.env'));

// Dynamic Port Configuration (Fallbacks to defaults if not set)
const backendPort = process.env.PORT || backendEnv.PORT || '3003';
const frontendPort = process.env.FRONTEND_PORT || frontendEnv.PORT || '5175';

// Print a beautiful summary in terminal when PM2 loads/executes this config file
console.log('\x1b[36m==================================================\x1b[0m');
console.log('\x1b[32m       🚀  PROJECT ABSENTA DEPLOYMENT INFO  🚀     \x1b[0m');
console.log('\x1b[36m==================================================\x1b[0m');
console.log(` 🌐 Backend API : \x1b[35mhttp://localhost:${backendPort}\x1b[0m`);
console.log(` 💻 Frontend Web: \x1b[35mhttp://localhost:${frontendPort}\x1b[0m`);
console.log('\x1b[36m==================================================\x1b[0m\n');

module.exports = {
  apps: [
    {
      name: 'absenta-redis',
      script: 'scripts/start-embedded-redis.js',
      cwd: path.join(__dirname, 'absenta_backend'),
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      windowsHide: true,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: `absenta-api:${backendPort}`,
      script: 'dist/main.js',
      cwd: path.join(__dirname, 'absenta_backend'),
      instances: 'max', 
      exec_mode: 'cluster',
      windowsHide: true,
      restart_delay: 3000,
      listen_timeout: 10000,
      env: {
        NODE_ENV: 'production',
        PORT: backendPort,
        EMBEDDED_WORKERS: 'true',
        AUTOSCALER_MAX_WORKERS: '10',
        ...backendEnv
      },
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: `absenta-web:${frontendPort}`,
      script: 'scripts/start-web.js',
      cwd: path.join(__dirname, 'absenta_frontend'),
      instances: 1, 
      exec_mode: 'fork',
      windowsHide: true,
      env: {
        NODE_ENV: 'production',
        PORT: frontendPort,
        ...frontendEnv
      },
      watch: false
    }
  ]
};
