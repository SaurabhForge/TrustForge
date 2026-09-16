import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';
import { initBlockchain } from './config/blockchain';
import { autoSeedDatabase } from './config/seedHelper';

async function start() {
  try {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      await autoSeedDatabase();
    } catch (dbErr: any) {
      console.warn('⚠️ Primary DB connection error, using in-memory store:', dbErr?.message);
    }

    // Initialise blockchain — non-blocking (app still starts if node is offline)
    initBlockchain().catch(() => {});

    const host = process.env.HOST || '0.0.0.0';
    app.listen(config.port, host, () => {
      console.log(`🚀 TrustForge API running on http://${host}:${config.port}`);
      console.log(`🔗 Frontend Origin: ${config.cors.origin}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
