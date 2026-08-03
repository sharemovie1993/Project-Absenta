module.exports = {
  apps: [
    {
      name: 'absenta-api:3003',
      script: './dist/main.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SERVICE_ROLE: 'api',
      },
    },
    {
      name: 'absenta-wa-service',
      script: './dist/workers/wa-worker.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        SERVICE_ROLE: 'wa-worker',
      },
    },
  ],
};
