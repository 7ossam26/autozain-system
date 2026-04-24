import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { env } from './config/env.js';
import { API_PREFIX } from './config/constants.js';
import apiRouter from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendDist = path.resolve(__dirname, '..', '..', 'frontend', 'dist');
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  }),
);
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(uploadsDir));

app.use(API_PREFIX, apiRouter);

// Serve the React build (production) — in dev, Vite handles the SPA.
if (env.isProd) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith(API_PREFIX) || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.use(API_PREFIX, notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`[autozain] API on http://localhost:${env.port}${API_PREFIX}`);
  console.log(`[autozain] env: ${env.nodeEnv}`);
});
