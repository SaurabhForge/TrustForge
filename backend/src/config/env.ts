import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/trustforge',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'trustforge-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  blockchain: {
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    chainId: parseInt(process.env.CHAIN_ID || '31337', 10),
    identityRegistryAddress: process.env.TRUSTFORGE_IDENTITY_REGISTRY_ADDRESS || '',
    accessControlAddress: process.env.TRUSTFORGE_ACCESS_CONTROL_ADDRESS || '',
    assetRegistryAddress: process.env.TRUSTFORGE_ASSET_REGISTRY_ADDRESS || '',
    deployerPrivateKey: process.env.DEPLOYER_PRIVATE_KEY || '',
  },
  ipfs: {
    apiUrl: process.env.IPFS_API_URL || 'http://localhost:5001',
    projectId: process.env.IPFS_PROJECT_ID || '',
    projectSecret: process.env.IPFS_PROJECT_SECRET || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },
};
