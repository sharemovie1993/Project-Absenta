/**
 * Jest Global Setup
 * 
 * Runs once before all tests start
 * 
 * @author AI Assistant
 * @date 2025-01-27
 * @version 1.0.0
 */

const { execSync } = require('child_process');
const dotenv = require('dotenv');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client } = require('pg');

module.exports = async () => {
  console.log('🚀 Setting up test environment...');

  process.env.NODE_ENV = 'test';
  dotenv.config();

  const tmpStatePath = path.join(os.tmpdir(), 'absenta_jest_testdb.json');
  const isPostgres = (url) => typeof url === 'string' && /^postgres(ql)?:\/\//.test(url);

  const canConnect = async (dbUrl) => {
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return true;
    } catch (e) {
      return false;
    } finally {
      try { await client.end(); } catch (e) {}
    }
  };

  const resolveDbUrl = () => {
    const testDbUrl = process.env.TEST_DATABASE_URL;
    const defaultDbUrl = process.env.DATABASE_URL;
    const effectiveDbUrl = isPostgres(testDbUrl) ? testDbUrl : (isPostgres(defaultDbUrl) ? defaultDbUrl : '');
    return effectiveDbUrl;
  };

  const ensureDockerPostgres = async () => {
    let dockerOk = true;
    try {
      execSync('docker --version', { stdio: 'ignore' });
    } catch (e) {
      dockerOk = false;
    }
    if (!dockerOk) return '';

    const user = 'absenta_test';
    const password = 'absenta_test_pwd';
    const db = 'absenta_test_db';
    const image = process.env.TEST_DB_DOCKER_IMAGE || 'postgres:15-alpine';

    const containerId = String(execSync(`docker run -d --rm -e POSTGRES_USER=${user} -e POSTGRES_PASSWORD=${password} -e POSTGRES_DB=${db} -p 0:5432 ${image}`, { encoding: 'utf8' })).trim();
    let hostPort = '';
    for (let i = 0; i < 60; i++) {
      try {
        const portLine = String(execSync(`docker port ${containerId} 5432/tcp`, { encoding: 'utf8' })).trim();
        const lastColon = portLine.lastIndexOf(':');
        if (lastColon > -1) {
          hostPort = portLine.slice(lastColon + 1).trim();
        }
      } catch (e) {}
      if (hostPort) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    const dbUrl = `postgresql://${user}:${password}@127.0.0.1:${hostPort}/${db}`;
    for (let i = 0; i < 80; i++) {
      if (await canConnect(dbUrl)) break;
      await new Promise((r) => setTimeout(r, 250));
    }

    fs.writeFileSync(tmpStatePath, JSON.stringify({ containerId, dbUrl }), 'utf8');
    return dbUrl;
  };

  if (process.env.SKIP_DB_SETUP) {
    const existing = resolveDbUrl();
    if (existing) process.env.DATABASE_URL = existing;
    return;
  }

  let dbUrl = resolveDbUrl();
  if (dbUrl && (await canConnect(dbUrl))) {
    process.env.DATABASE_URL = dbUrl;
  } else {
    dbUrl = await ensureDockerPostgres();
    if (!dbUrl) {
      throw new Error('PostgreSQL test database is not reachable and Docker is not available');
    }
    process.env.DATABASE_URL = dbUrl;
  }

  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
    });
  } catch (err) {
    console.warn('⚠️ [TestSetup] migrate deploy failed, falling back to prisma db push...');
    try {
      execSync('npx prisma db push --skip-generate', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
      });
    } catch {}
  }
};
