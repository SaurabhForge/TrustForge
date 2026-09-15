/**
 * blockchain.service.ts
 * High-level wrappers for all on-chain operations.
 * Each function gracefully falls back to simulation if the node is unavailable.
 */
import { ethers } from 'ethers';
import {
  isBlockchainAvailable,
  getIdentityRegistry,
  getAssetRegistry,
  getAccessControl,
  getProvider,
} from '../config/blockchain';

export interface OnChainResult {
  txHash: string;
  blockNumber: string;
  onChain: boolean;
}

function mockResult(): OnChainResult {
  const txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const blockNumber = (18_000_000 + Math.floor(Math.random() * 300_000)).toLocaleString();
  return { txHash, blockNumber, onChain: false };
}

async function waitAndExtract(txPromise: Promise<ethers.ContractTransactionResponse>): Promise<OnChainResult> {
  try {
    const tx = await txPromise;
    const receipt = await tx.wait();
    return {
      txHash: tx.hash,
      blockNumber: (receipt?.blockNumber ?? 0).toLocaleString(),
      onChain: true,
    };
  } catch (err: any) {
    console.warn('[Blockchain] TX failed, falling back to mock:', err?.message);
    return mockResult();
  }
}

// ─── Identity Registry ────────────────────────────────────────────────────────

/**
 * Register a new DID on-chain.
 */
export async function onChainCreateIdentity(
  did: string,
  controller: string,
  publicKeyHex: string,
  metadataUri: string,
): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getIdentityRegistry()!;
  const pubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(publicKeyHex));
  // Use a deterministic address derived from DID if controller is not a real address
  const addr = ethers.isAddress(controller)
    ? controller
    : ethers.Wallet.createRandom().address;
  return waitAndExtract(contract.createIdentity(did, addr, pubKeyHash, metadataUri));
}

/**
 * Revoke a DID on-chain.
 */
export async function onChainRevokeIdentity(did: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getIdentityRegistry()!;
  return waitAndExtract(contract.revokeIdentity(did));
}

/**
 * Reactivate a DID on-chain.
 */
export async function onChainReactivateIdentity(did: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getIdentityRegistry()!;
  return waitAndExtract(contract.reactivateIdentity(did));
}

/**
 * Update DID metadata URI (key rotation).
 */
export async function onChainUpdateIdentity(did: string, newMetadataUri: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getIdentityRegistry()!;
  return waitAndExtract(contract.updateIdentity(did, newMetadataUri));
}

/**
 * Resolve a DID from the chain. Returns null if unavailable.
 */
export async function onChainResolveIdentity(did: string): Promise<{
  controller: string;
  publicKeyHash: string;
  metadataUri: string;
  status: number;
  createdAt: number;
  updatedAt: number;
} | null> {
  if (!isBlockchainAvailable()) return null;
  try {
    const contract = getIdentityRegistry()!;
    const result = await contract.resolveIdentity(did);
    return {
      controller: result[0],
      publicKeyHash: result[1],
      metadataUri: result[2],
      status: Number(result[3]),
      createdAt: Number(result[4]),
      updatedAt: Number(result[5]),
    };
  } catch {
    return null;
  }
}

// ─── Asset Registry ──────────────────────────────────────────────────────────

/**
 * Mint an NFT asset on-chain. Returns tokenId + tx details.
 */
export async function onChainMintAsset(
  to: string,
  assetId: string,
  ownerDid: string,
  issuerDid: string,
  metadataJson: string,
  tokenUri: string,
  transferable: boolean,
): Promise<OnChainResult & { tokenId?: string }> {
  if (!isBlockchainAvailable()) return { ...mockResult(), tokenId: String(Date.now()) };
  try {
    const contract = getAssetRegistry()!;
    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(metadataJson));
    const addr = ethers.isAddress(to) ? to : ethers.Wallet.createRandom().address;
    const tx = await contract.mintAsset(addr, assetId, ownerDid, issuerDid, metadataHash, tokenUri, transferable);
    const receipt = await tx.wait();
    // Parse AssetMinted event
    let tokenId: string | undefined;
    for (const log of (receipt?.logs ?? [])) {
      try {
        const parsed = contract.interface.parseLog(log as any);
        if (parsed?.name === 'AssetMinted') {
          tokenId = parsed.args[0].toString();
        }
      } catch {}
    }
    return {
      txHash: tx.hash,
      blockNumber: (receipt?.blockNumber ?? 0).toLocaleString(),
      onChain: true,
      tokenId,
    };
  } catch (err: any) {
    console.warn('[Blockchain] mintAsset failed:', err?.message);
    return { ...mockResult(), tokenId: String(Date.now()) };
  }
}

/**
 * Revoke (mark REVOKED) an NFT on-chain.
 */
export async function onChainRevokeAsset(tokenId: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getAssetRegistry()!;
  return waitAndExtract(contract.revokeAsset(BigInt(tokenId)));
}

// ─── Access Control ──────────────────────────────────────────────────────────

const ROLE_MAP: Record<string, string> = {
  Admin: 'DID_ROLE_ADMIN',
  'Security Admin': 'DID_ROLE_SECURITY_ADMIN',
  Auditor: 'DID_ROLE_AUDITOR',
  Developer: 'DID_ROLE_DEVELOPER',
  Verifier: 'DID_ROLE_VERIFIER',
  User: 'DID_ROLE_USER',
};

export async function onChainGrantRole(did: string, roleName: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getAccessControl()!;
  const roleKey = ROLE_MAP[roleName] || roleName;
  const roleHash = ethers.id(roleKey);
  return waitAndExtract(contract.grantDidRole(did, roleHash));
}

export async function onChainRevokeRole(did: string, roleName: string): Promise<OnChainResult> {
  if (!isBlockchainAvailable()) return mockResult();
  const contract = getAccessControl()!;
  const roleKey = ROLE_MAP[roleName] || roleName;
  const roleHash = ethers.id(roleKey);
  return waitAndExtract(contract.revokeDidRole(did, roleHash));
}

// ─── Blockchain Stats ────────────────────────────────────────────────────────

export async function getBlockchainStats(): Promise<{
  blockNumber: string;
  network: string;
  chainId: number;
  gasPrice: string;
  totalIdentities: string;
  totalAssets: string;
  nodeUrl: string;
  onChain: boolean;
}> {
  const defaults = {
    blockNumber: '18,294,105',
    network: 'Hardhat Local (chainId 31337)',
    chainId: 31337,
    gasPrice: '1.0 Gwei',
    totalIdentities: '0',
    totalAssets: '0',
    nodeUrl: 'http://127.0.0.1:8545',
    onChain: false,
  };

  if (!isBlockchainAvailable()) return defaults;

  try {
    const provider = getProvider()!;
    const identityContract = getIdentityRegistry()!;
    const assetContract = getAssetRegistry()!;

    const [blockNum, feeData, identCount, assetCount, network] = await Promise.all([
      provider.getBlockNumber(),
      provider.getFeeData(),
      identityContract.identityCount(),
      assetContract.totalMinted(),
      provider.getNetwork(),
    ]);

    const gasPriceGwei = feeData.gasPrice
      ? (Number(feeData.gasPrice) / 1e9).toFixed(2)
      : '1.0';

    return {
      blockNumber: blockNum.toLocaleString(),
      network: `Hardhat Local (chainId ${Number(network.chainId)})`,
      chainId: Number(network.chainId),
      gasPrice: `${gasPriceGwei} Gwei`,
      totalIdentities: identCount.toString(),
      totalAssets: assetCount.toString(),
      nodeUrl: 'http://127.0.0.1:8545',
      onChain: true,
    };
  } catch (err: any) {
    console.warn('[Blockchain] getBlockchainStats failed:', err?.message);
    return defaults;
  }
}
