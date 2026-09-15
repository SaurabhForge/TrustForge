import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
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

app.use(cors({
  origin: config.cors.origin,
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

// ─── 404 & Error Handling ───────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
