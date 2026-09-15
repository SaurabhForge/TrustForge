/**
 * blockchain.ts
 * Initialises ethers.js provider, signer, and all deployed contract instances.
 * Falls back gracefully if the Hardhat node is unreachable.
 */
import { ethers } from 'ethers';
import { config } from './env';

// ─── ABIs (minimal — only the functions we call) ───────────────────────────

const IDENTITY_REGISTRY_ABI = [
  'function createIdentity(string did, address controller, bytes32 publicKeyHash, string metadataUri) external',
  'function revokeIdentity(string did) external',
  'function reactivateIdentity(string did) external',
  'function updateIdentity(string did, string newMetadataUri) external',
  'function resolveIdentity(string did) external view returns (address controller, bytes32 publicKeyHash, string metadataUri, uint8 status, uint256 createdAt, uint256 updatedAt)',
  'function isIdentityActive(string did) external view returns (bool)',
  'function getDidByController(address controller) external view returns (string)',
  'function identityCount() external view returns (uint256)',
  'function grantRole(bytes32 role, address account) external',
  'event IdentityCreated(string indexed did, address indexed controller, bytes32 publicKeyHash, uint256 timestamp)',
  'event IdentityRevoked(string indexed did, address indexed revokedBy, uint256 timestamp)',
];

const ASSET_REGISTRY_ABI = [
  'function mintAsset(address to, string assetId, string ownerDid, string issuerDid, bytes32 metadataHash, string uri, bool transferable) external returns (uint256)',
  'function revokeAsset(uint256 tokenId) external',
  'function transferAsset(uint256 tokenId, address to, string newOwnerDid) external',
  'function resolveAsset(uint256 tokenId) external view returns (string assetId, string ownerDid, string issuerDid, bytes32 metadataHash, uint8 status, bool transferable, uint256 createdAt, uint256 updatedAt)',
  'function getTokenIdByAssetId(string assetId) external view returns (uint256)',
  'function isAssetValid(uint256 tokenId) external view returns (bool)',
  'function verifyMetadataHash(uint256 tokenId, bytes32 expectedHash) external view returns (bool)',
  'function getTokensByDid(string did) external view returns (uint256[])',
  'function totalMinted() external view returns (uint256)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'event AssetMinted(uint256 indexed tokenId, string indexed assetId, address indexed to, string ownerDid)',
];

const ACCESS_CONTROL_ABI = [
  'function grantDidRole(string did, bytes32 role) external',
  'function revokeDidRole(string did, bytes32 role) external',
  'function hasDidRole(string did, bytes32 role) external view returns (bool)',
  'function isAdmin(string did) external view returns (bool)',
  'function isAuditor(string did) external view returns (bool)',
  'event RoleGranted(string indexed did, bytes32 indexed role, address indexed grantedBy, uint256 timestamp)',
];

// ─── Contract addresses ─────────────────────────────────────────────────────

export const CONTRACT_ADDRESSES = {
  identityRegistry: config.blockchain.identityRegistryAddress || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  accessControl: config.blockchain.accessControlAddress || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  assetRegistry: config.blockchain.assetRegistryAddress || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
};

// ─── Provider / signer ──────────────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider | null = null;
let _signer: ethers.Wallet | null = null;
let _identityRegistry: ethers.Contract | null = null;
let _assetRegistry: ethers.Contract | null = null;
let _accessControl: ethers.Contract | null = null;
let _blockchainAvailable = false;

export function isBlockchainAvailable(): boolean {
  return _blockchainAvailable;
}

export async function initBlockchain(): Promise<void> {
  try {
    const rpc = config.blockchain.rpcUrl || 'http://127.0.0.1:8545';
    _provider = new ethers.JsonRpcProvider(rpc);

    // Verify the node is reachable
    const network = await _provider.getNetwork();
    const chainId = Number(network.chainId);
    console.log(`🔗 [Blockchain] Connected to network chainId=${chainId} at ${rpc}`);

    const pk = config.blockchain.deployerPrivateKey || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    _signer = new ethers.Wallet(pk, _provider);
    console.log(`🔑 [Blockchain] Signer: ${_signer.address}`);

    _identityRegistry = new ethers.Contract(CONTRACT_ADDRESSES.identityRegistry, IDENTITY_REGISTRY_ABI, _signer);
    _assetRegistry = new ethers.Contract(CONTRACT_ADDRESSES.assetRegistry, ASSET_REGISTRY_ABI, _signer);
    _accessControl = new ethers.Contract(CONTRACT_ADDRESSES.accessControl, ACCESS_CONTROL_ABI, _signer);

    // Grant MANAGER_ROLE and MINTER_ROLE to deployer so backend can call gated functions
    const MANAGER_ROLE = ethers.id('MANAGER_ROLE');
    const MINTER_ROLE = ethers.id('MINTER_ROLE');
    try {
      const tx1 = await (_identityRegistry as any).grantRole(MANAGER_ROLE, _signer.address);
      await tx1.wait();
      const tx2 = await (_assetRegistry as any).grantRole(MINTER_ROLE, _signer.address);
      await tx2.wait();
      console.log('✅ [Blockchain] Roles granted to signer');
    } catch {
      // Roles already granted — safe to ignore
    }

    _blockchainAvailable = true;
    console.log('✅ [Blockchain] All contracts initialised');
  } catch (err: any) {
    console.warn(`⚠️ [Blockchain] Node unreachable — running in off-chain simulation mode. (${err?.message})`);
    _blockchainAvailable = false;
  }
}

// ─── Getters ─────────────────────────────────────────────────────────────────

export function getProvider(): ethers.JsonRpcProvider | null { return _provider; }
export function getSigner(): ethers.Wallet | null { return _signer; }
export function getIdentityRegistry(): ethers.Contract | null { return _identityRegistry; }
export function getAssetRegistry(): ethers.Contract | null { return _assetRegistry; }
export function getAccessControl(): ethers.Contract | null { return _accessControl; }
