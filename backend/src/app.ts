import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config/env';
import { errorHandler, notFound } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import identityRoutes from './modules/identity/identity.routes';
import accessRoutes from './modules/access/access.routes';
import assetRoutes from './modules/assets/assets.routes';
import verificationRoutes from './modules/verification/verification.routes';
import auditRoutes from './modules/audit/audit.routes';
import systemRoutes from './modules/system/system.routes';

const app = express();

// ─── Performance: Response Compression (Gzip / Deflate) ─────────────────────
app.use(compression());

// ─── Performance: Smart Caching Policy ─────────────────────────────────────────
app.use((req, res, next) => {
  if (req.method === 'GET' && (req.path.includes('/did-document') || req.path.endsWith('/vc') || req.path === '/health')) {
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
  } else if (req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  }
  next();
});

// ─── Security: Hardened HTTP Headers ─────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  xFrameOptions: { action: 'deny' },
  xDnsPrefetchControl: { allow: false },
}));

const corsOriginSetting = config.cors.origin;
const allowedOrigins = corsOriginSetting
  ? corsOriginSetting.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: (requestOrigin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!requestOrigin) return callback(null, true);

    // If wildcard or explicitly in allowed list
    if (allowedOrigins.includes('*') || allowedOrigins.includes(requestOrigin)) {
      return callback(null, true);
    }

    // Allow Render deployments (*.onrender.com) and localhost
    if (
      requestOrigin.endsWith('.onrender.com') ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
    ) {
      return callback(null, true);
    }

    // Default allow request origin to ensure seamless interoperability
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ─── Security: Global Rate Limiter (500 req / 15 min) ───────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please wait before retrying.',
    },
  },
});
app.use('/api', globalLimiter);

// ─── Logging & Request Body Parsing ─────────────────────────────────────────
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Base Health Check ──────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TrustForge Enterprise API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Module Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/identities', identityRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/verifications', verificationRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/system', systemRoutes);

// ─── Frontend Static Assets (Production SPA Support) ─────────────────────────
const potentialDistPaths = [
  path.resolve(__dirname, '../../trustforge/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(process.cwd(), 'trustforge/dist'),
  path.resolve(process.cwd(), 'dist/public'),
  path.resolve(process.cwd(), 'public'),
];
const distPath = potentialDistPaths.find((p) => fs.existsSync(p));

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// ─── 404 & Error Handling ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
