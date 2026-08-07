const os = require('os');
const cpuCores = os.cpus().length;
const apiInstances = process.env.PM2_INSTANCES
  ? (process.env.PM2_INSTANCES === 'max' ? 'max' : parseInt(process.env.PM2_INSTANCES))
  : (cpuCores > 0 ? Math.min(cpuCores, 4) : 4);

module.exports = {
  apps: [
    {
      name: 'absenta-redis',
      script: './scripts/redis-monitor.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'absenta-api:3003',
      script: './dist/main.js',
      cwd: __dirname,
      instances: apiInstances,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_ROLE: 'api',
      },
    },
    {
      name: 'absenta-web:5175',
      script: 'npx',
      args: 'serve -s ../absenta_frontend/dist -l 5175',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'absenta-wa-service',
      script: './dist/workers/wa-worker.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVICE_ROLE: 'wa-worker',
      },
    },
  ],
};
