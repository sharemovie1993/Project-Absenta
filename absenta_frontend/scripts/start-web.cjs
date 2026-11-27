const http = require('http');
const path = require('path');
const fs = require('fs');

process.title = 'absenta-web';

const frontendPort = parseInt(process.env.PORT || '5175', 10);
const distPath = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('\x1b[31m[Frontend] ERROR: Folder "dist" tidak ditemukan!\x1b[0m');
  console.error('\x1b[33m[Frontend] Silakan jalankan "npm run build" terlebih dahulu.\x1b[0m');
  process.exit(1);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

function sendFileSafe(filePath, req, res, isImmutableAsset = false) {
  fs.stat(filePath, (statErr, stats) => {
    if (statErr || !stats.isFile()) {
      if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      }
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': isImmutableAsset
        ? 'public, max-age=31536000, immutable'
        : ext === '.html'
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=3600',
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, headers);
      res.end();
      return;
    }

    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      if (!res.writableEnded) {
        res.end();
      }
    });
    stream.pipe(res);
  });
}

const server = http.createServer((req, res) => {
  try {
    const rawUrl = (req.url || '/').split('?')[0].split('#')[0];
    let decodedPath = '/';
    try {
      decodedPath = decodeURIComponent(rawUrl);
    } catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request');
      return;
    }

    const safeRelPath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^[/\\]+/, '');
    const candidatePath = path.resolve(distPath, safeRelPath);

    // Path traversal guard
    if (!candidatePath.startsWith(distPath)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(candidatePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const isHashedAsset = decodedPath.startsWith('/assets/');
        sendFileSafe(candidatePath, req, res, isHashedAsset);
        return;
      }

      // If request is explicitly for a missing static asset file (e.g. old chunk hash after deploy), return 404 cleanly instead of crashing
      const ext = path.extname(decodedPath).toLowerCase();
      if (decodedPath.startsWith('/assets/') || (ext && ext !== '.html')) {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end('Asset Not Found');
        return;
      }

      // SPA Fallback -> index.html
      const indexHtmlPath = path.join(distPath, 'index.html');
      sendFileSafe(indexHtmlPath, req, res, false);
    });
  } catch {
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
    }
    if (!res.writableEnded) {
      res.end('Internal Server Error');
    }
  }
});

server.on('error', (err) => {
  console.error('[Frontend] HTTP Server Error:', err.message);
});

server.listen(frontendPort, '0.0.0.0', () => {
  console.log(`[Frontend] Native SPA Static Server listening on http://0.0.0.0:${frontendPort}`);
  if (process.send) {
    process.send('ready');
  }
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
