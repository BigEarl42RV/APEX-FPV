/* © 2026 SampsonSystem's LLC. All Rights Reserved. Proprietary & Confidential Software. */
import http from 'http';
import path from 'path';
import express from 'express';
import { MultiplayerServerManager } from './src/server/multiplayerServer';

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

async function bootstrap() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const httpServer = http.createServer(app);
  const mpServer = new MultiplayerServerManager(httpServer);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'stratum-fpv-multiplayer' });
  });

  app.get('/api/multiplayer/rooms', (_req, res) => {
    res.json({ rooms: mpServer.getPublicRooms() });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, HOST, () => {
    console.log(`[Stratum FPV] Server listening on http://${HOST}:${PORT}`);
  });

  const shutdown = () => {
    mpServer.dispose();
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

void bootstrap();
