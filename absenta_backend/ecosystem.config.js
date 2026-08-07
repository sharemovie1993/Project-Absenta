module.exports = {
  apps: [
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
