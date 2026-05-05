import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

function rewriteStoreSlug(requestUrl?: string | null) {
  if (!requestUrl) {
    return requestUrl;
  }

  const normalizedUrl = new URL(requestUrl, 'http://localhost');
  const pathname = normalizedUrl.pathname;
  const search = normalizedUrl.search || '';

  if (pathname === '/auth' || pathname === '/auth/') {
    return `/auth/index.html${search}`;
  }

  if (pathname === '/entry' || pathname === '/entry/') {
    return `/entry/index.html${search}`;
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return `/admin/index.html${search}`;
  }

  if (pathname === '/onboarding' || pathname === '/onboarding/') {
    return `/onboarding/index.html${search}`;
  }

  if (pathname === '/s' || pathname.startsWith('/s/')) {
    return `/store/index.html${search}`;
  }

  return requestUrl;
}

export default defineConfig({
  plugins: [
    {
      name: 'ordely-store-slug-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          req.url = rewriteStoreSlug(req.url);
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          req.url = rewriteStoreSlug(req.url);
          next();
        });
      },
    },
  ],
  server: {
    host: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    outDir: 'dist/public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, 'index.html'),
        auth: path.resolve(rootDir, 'auth/index.html'),
        entry: path.resolve(rootDir, 'entry/index.html'),
        onboarding: path.resolve(rootDir, 'onboarding/index.html'),
        admin: path.resolve(rootDir, 'admin/index.html'),
        store: path.resolve(rootDir, 'store/index.html'),
      },
    },
  },
});
