import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';
import { initBlockchain } from './config/blockchain';

async function start() {
  try {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
    } catch (dbErr: any) {
      console.warn('⚠️ Primary DB connection error, using in-memory store:', dbErr?.message);
    }

    // Initialise blockchain — non-blocking (app still starts if node is offline)
    initBlockchain().catch(() => {});

    app.listen(config.port, () => {
      console.log(`🚀 TrustForge API running on http://localhost:${config.port}`);
      console.log(`🔗 Frontend: ${config.cors.origin}`);
      console.log(`📊 Environment: ${config.nodeEnv}`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
