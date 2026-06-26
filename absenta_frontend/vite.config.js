import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
// https://vite.dev/config/
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    // CRITICAL: Enforce VITE_API_BASE_URL for production builds
    if (mode === 'production' && !env.VITE_API_BASE_URL) {
        throw new Error('❌ VITE_API_BASE_URL is not defined in environment variables. Build aborted.');
    }
    // Use env var for proxy target in dev mode, fallback to localhost only if not set
    var isRelativeApi = (_b = env.VITE_API_BASE_URL) === null || _b === void 0 ? void 0 : _b.startsWith('/');
    var rawProxyTarget = env.VITE_PROXY_TARGET || (isRelativeApi ? 'http://localhost:3001' : env.VITE_API_BASE_URL) || 'http://localhost:3001';
    var proxyTarget = rawProxyTarget.replace('://localhost', '://127.0.0.1');
    var isTargetApi = proxyTarget.endsWith('/api');
    return {
        define: {
            'globalThis.__VITE_API_BASE_URL__': JSON.stringify(env.VITE_API_BASE_URL || ''),
        },
        plugins: [
            react(),
            basicSsl(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            chunkSizeWarningLimit: 2000,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    parent: path.resolve(__dirname, 'public/parent/index.html'),
                },
                output: {
                    manualChunks: {
                        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                        'vendor-framer': ['framer-motion'],
                        'vendor-query': ['@tanstack/react-query'],
                        'vendor-date': ['date-fns'],
                        'vendor-ui-libs': ['clsx', 'tailwind-merge', 'react-hot-toast'],
                        'vendor-utils': ['axios', 'zod'],
                    }
                }
            },
        },
        server: {
            host: true, // Listen on all local IPs (LAN access)
            port: 5173,
            strictPort: false,
            cors: true,
            hmr: {
                protocol: env.VITE_HMR_PROTOCOL || undefined,
                port: env.VITE_HMR_PORT ? parseInt(env.VITE_HMR_PORT) : undefined,
            },
            headers: {
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache',
            },
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                    timeout: 120000,
                    proxyTimeout: 120000,
                },
                '/auth': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                    timeout: 60000,
                    proxyTimeout: 60000,
                },
                '/socket.io': {
                    target: isTargetApi ? proxyTarget.replace(/\/api$/, '') : proxyTarget,
                    ws: true,
                    changeOrigin: true,
                    secure: false,
                    timeout: 60000,
                    proxyTimeout: 60000,
                }
            }
        },
        preview: {
            host: true,
            port: 4173,
            proxy: {
                '/api': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                },
                '/auth': {
                    target: proxyTarget,
                    changeOrigin: true,
                    secure: false,
                    ws: true,
                },
                '/socket.io': {
                    target: isTargetApi ? proxyTarget.replace(/\/api$/, '') : proxyTarget,
                    ws: true,
                    changeOrigin: true,
                    secure: false,
                }
            }
        },
    };
});
