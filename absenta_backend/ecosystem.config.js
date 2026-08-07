module.exports = {
  apps: [
    {
      name: 'absenta-redis',
      script: 'redis-server',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
    },
    {
      name: 'absenta-api:3003',
      script: './dist/main.js',
      cwd: __dirname,
      instances: 4,
      exec_mode: 'cluster',
      node_args: '-r tsconfig-paths/register',
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
      node_args: '-r tsconfig-paths/register',
      env: {
        NODE_ENV: 'production',
        SERVICE_ROLE: 'wa-worker',
      },
    },
  ],
};
