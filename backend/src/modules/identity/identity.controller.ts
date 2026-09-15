import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { generateDID, generateTfId, truncateDid, timeAgo } from '../../utils/did';
import {
  onChainCreateIdentity,
  onChainRevokeIdentity,
  onChainReactivateIdentity,
  onChainUpdateIdentity,
  onChainResolveIdentity,
  onChainMintAsset,
} from '../../services/blockchain.service';

const createIdentitySchema = z.object({
  controllerName: z.string().min(1, 'Controller name is required'),
  method: z.enum(['did:key', 'did:ion', 'did:web', 'did:ethr']).default('did:key'),
  keyAlgorithm: z.enum(['Ed25519', 'secp256k1', 'P-256', 'P-384']).default('Ed25519'),
  services: z.string().optional(),
  walletAddress: z.string().optional(),
});

function formatIdentity(identity: any) {
  return {
    id: identity.tfId,
    did: identity.did,
    controller: identity.controllerName,
    method: identity.method,
    keyType: identity.keyType,
    credentials: identity._count?.assets || 0,
    status: identity.status.charAt(0) + identity.status.slice(1).toLowerCase(),
    lastSeen: identity.lastSeenAt ? timeAgo(new Date(identity.lastSeenAt)) : timeAgo(new Date(identity.updatedAt)),
    created: new Date(identity.createdAt).toISOString().split('T')[0],
    complianceScore: identity.complianceScore,
  };
}

export async function listIdentities(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const status = req.query.status as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }
    if (search) {
      where.OR = [
        { controllerName: { contains: search, mode: 'insensitive' } },
        { did: { contains: search, mode: 'insensitive' } },
        { tfId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [identities, total, totalAll, activeCount, pendingCount, revokedCount] = await Promise.all([
      prisma.identity.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { _count: { select: { assets: true } } } }),
      prisma.identity.count({ where }),
      prisma.identity.count(),
      prisma.identity.count({ where: { status: 'ACTIVE' } }),
      prisma.identity.count({ where: { status: 'PENDING' } }),
      prisma.identity.count({ where: { status: 'REVOKED' } }),
    ]);

    return sendSuccess(res, {
      identities: identities.map(formatIdentity),
      stats: { total: totalAll, active: activeCount, pending: pendingCount, revoked: revokedCount },
      pagination: { page, limit, total },
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to list identities', 'INTERNAL_ERROR', 500);
  }
}

export async function getIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({
      where: { OR: [{ tfId: id }, { id }, { did: id }] },
      include: {
        assets: { take: 10, orderBy: { createdAt: 'desc' } },
        auditEvents: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);

    return sendSuccess(res, {
      id: identity.tfId,
      did: identity.did,
      controller: identity.controllerName,
      method: identity.method,
      keyType: identity.keyType,
      status: identity.status.charAt(0) + identity.status.slice(1).toLowerCase(),
      created: identity.createdAt.toISOString(),
      updated: identity.updatedAt.toISOString(),
      complianceScore: identity.complianceScore,
      publicKey: identity.publicKey || 'z6Mkf5rGMoaL6PKkMkMuR4mM9TmNDd8R1g5NJyNFyVaqr2Qb',
      txHash: identity.txHash || '0x' + '0'.repeat(64),
      blockNumber: identity.blockNumber || '0',
      onChain: !!(identity.txHash),
      credentials: identity.assets.map((a) => ({
        id: a.assetId,
        type: a.name,
        issuer: a.issuerDid ? truncateDid(a.issuerDid) : 'TrustForge Authority',
        issued: new Date(a.createdAt).toISOString().split('T')[0],
        expires: a.expiresAt ? new Date(a.expiresAt).toISOString().split('T')[0] : null,
        status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
      })),
      auditLog: identity.auditEvents.map((e) => ({
        event: e.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        actor: e.actor,
        txHash: e.txHash ? `${e.txHash.slice(0, 6)}...${e.txHash.slice(-4)}` : '—',
        age: timeAgo(new Date(e.createdAt)),
      })),
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to get identity', 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET /api/identities/:id/did-document
 * Returns a W3C DID Document for the given identity.
 */
export async function getDidDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({
      where: { OR: [{ tfId: id }, { id }, { did: id }] },
    });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);

    // Try to get on-chain data
    const onChainData = await onChainResolveIdentity(identity.did);

    const publicKey = identity.publicKey || 'z6Mkf5rGMoaL6PKkMkMuR4mM9TmNDd8R1g5NJyNFyVaqr2Qb';
    const created = identity.createdAt.toISOString();
    const updated = onChainData
      ? new Date(onChainData.updatedAt * 1000).toISOString()
      : identity.updatedAt.toISOString();

    const didDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/security/suites/secp256k1-2019/v1',
      ],
      id: identity.did,
      controller: identity.did,
      verificationMethod: [
        {
          id: `${identity.did}#key-1`,
          type: identity.keyType === 'secp256k1' ? 'EcdsaSecp256k1VerificationKey2019' : 'Ed25519VerificationKey2020',
          controller: identity.did,
          publicKeyMultibase: publicKey,
          ...(onChainData && { blockchainAccountId: `eip155:31337:${onChainData.controller}` }),
        },
      ],
      authentication: [`${identity.did}#key-1`],
      assertionMethod: [`${identity.did}#key-1`],
      keyAgreement: [`${identity.did}#key-1`],
      capabilityInvocation: [`${identity.did}#key-1`],
      capabilityDelegation: [`${identity.did}#key-1`],
      service: [
        {
          id: `${identity.did}#trustforge-registry`,
          type: 'TrustForgeIdentityRegistry',
          serviceEndpoint: `http://localhost:3001/api/identities/${identity.tfId}`,
        },
        {
          id: `${identity.did}#vc-service`,
          type: 'VerifiableCredentialService',
          serviceEndpoint: `http://localhost:3001/api/assets?ownerDid=${encodeURIComponent(identity.did)}`,
        },
        {
          id: `${identity.did}#blockchain`,
          type: 'BlockchainAnchoring',
          serviceEndpoint: 'http://127.0.0.1:8545',
          contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          network: 'Hardhat Local (chainId 31337)',
        },
      ],
      created,
      updated,
      proof: {
        type: 'Ed25519Signature2020',
        created,
        proofPurpose: 'assertionMethod',
        verificationMethod: `${identity.did}#key-1`,
        jws: `eyJhbGciOiJFZERTQSIsImtpZCI6IiJ9..${Buffer.from(identity.did).toString('base64').slice(0, 64)}`,
      },
      // Extra TrustForge metadata
      trustForge: {
        tfId: identity.tfId,
        status: identity.status,
        complianceScore: identity.complianceScore,
        onChain: !!onChainData,
        txHash: identity.txHash,
        blockNumber: identity.blockNumber,
        ...(onChainData && {
          onChainStatus: ['ACTIVE', 'PENDING', 'SUSPENDED', 'REVOKED'][onChainData.status] || 'UNKNOWN',
          onChainController: onChainData.controller,
        }),
      },
    };

    res.setHeader('Content-Type', 'application/did+ld+json');
    return res.json({ success: true, data: didDocument });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to resolve DID document', 'INTERNAL_ERROR', 500);
  }
}

export async function createIdentity(req: Request, res: Response) {
  try {
    const parsed = createIdentitySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR');

    const { controllerName, method, keyAlgorithm, walletAddress } = parsed.data;

    const count = await prisma.identity.count();
    const tfId = generateTfId(count + 1);
    const did = generateDID(method, walletAddress);
    const publicKey = 'z6Mk' + crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 44);

    // 🔗 Write to blockchain first
    const chainResult = await onChainCreateIdentity(
      did,
      walletAddress || '0x0000000000000000000000000000000000000000',
      publicKey,
      `ipfs://QmTrustForge/${tfId}`,
    );

    const identity = await prisma.identity.create({
      data: {
        tfId,
        did,
        controllerName,
        walletAddress: walletAddress || null,
        method,
        keyType: keyAlgorithm,
        publicKey,
        status: 'ACTIVE',
        complianceScore: 85,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        lastSeenAt: new Date(),
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'DID_CREATED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: tfId,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        status: 'Verified',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, {
      ...formatIdentity({ ...identity, _count: { assets: 0 } }),
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      onChain: chainResult.onChain,
    }, 'Identity created', 201);
  } catch (err: any) {
    if (err?.code === 'P2002') return sendError(res, 'Identity already exists', 'CONFLICT', 409);
    console.error(err);
    return sendError(res, 'Failed to create identity', 'INTERNAL_ERROR', 500);
  }
}

export async function revokeIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: id }, { id }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);
    if (identity.status === 'REVOKED') return sendError(res, 'Identity is already revoked', 'CONFLICT', 409);

    // 🔗 Revoke on-chain
    const chainResult = await onChainRevokeIdentity(identity.did);

    await prisma.identity.update({ where: { id: identity.id }, data: { status: 'REVOKED', txHash: chainResult.txHash, blockNumber: chainResult.blockNumber } });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'DID_REVOKED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: identity.tfId,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        status: 'Revoked',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, { id: identity.tfId, status: 'Revoked', txHash: chainResult.txHash, onChain: chainResult.onChain }, 'Identity revoked');
  } catch (err) {
    return sendError(res, 'Failed to revoke identity', 'INTERNAL_ERROR', 500);
  }
}

export async function reactivateIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: id }, { id }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);
    if (identity.status === 'ACTIVE') return sendError(res, 'Identity is already active', 'CONFLICT', 409);

    // 🔗 Reactivate on-chain
    const chainResult = await onChainReactivateIdentity(identity.did);

    await prisma.identity.update({ where: { id: identity.id }, data: { status: 'ACTIVE', txHash: chainResult.txHash } });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'DID_UPDATED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: identity.tfId,
        txHash: chainResult.txHash,
        status: 'Active',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, { id: identity.tfId, status: 'Active', txHash: chainResult.txHash, onChain: chainResult.onChain }, 'Identity reactivated');
  } catch (err) {
    return sendError(res, 'Failed to reactivate identity', 'INTERNAL_ERROR', 500);
  }
}

export async function verifyIdentity(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: id }, { id }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);

    const isActive = identity.status === 'ACTIVE';
    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'IDENTITY_VERIFIED',
        actor: 'Verifier',
        actorDid: 'did:trustforge:verifier',
        target: identity.tfId,
        status: isActive ? 'Verified' : 'Revoked',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, {
      verified: isActive,
      id: identity.tfId,
      did: identity.did,
      status: identity.status,
      complianceScore: identity.complianceScore,
    });
  } catch (err) {
    return sendError(res, 'Failed to verify identity', 'INTERNAL_ERROR', 500);
  }
}

export async function rotateKey(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: id }, { id }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);

    const newKey = 'z6Mk' + crypto.randomBytes(32).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 44);
    const newMetadataUri = `ipfs://QmTrustForge/${identity.tfId}/key-${Date.now()}`;

    // 🔗 Update on-chain metadata URI to reflect key rotation
    const chainResult = await onChainUpdateIdentity(identity.did, newMetadataUri);

    await prisma.identity.update({
      where: { id: identity.id },
      data: {
        publicKey: newKey,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        updatedAt: new Date(),
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'KEY_ROTATION',
        actor: 'HSM-Node-01',
        actorDid: 'did:trustforge:hsm-controller',
        target: identity.tfId,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        status: 'Active',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, {
      id: identity.tfId,
      publicKey: newKey,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      onChain: chainResult.onChain,
    }, 'Cryptographic key rotated successfully');
  } catch (err) {
    return sendError(res, 'Failed to rotate key', 'INTERNAL_ERROR', 500);
  }
}

export async function issueVC(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { type, issuer, expiresAt } = req.body;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: id }, { id }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);

    const assetCount = await prisma.asset.count();
    const assetId = `VC-${8800 + assetCount + 1}`;
    const vcType = type || 'SOC2 Type II Credential';
    const issuerDid = 'did:trustforge:authority';
    const expiryDate = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Build W3C VC metadata
    const vcMetadata = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:trustforge:vc:${assetId}`,
      type: ['VerifiableCredential', vcType.replace(/\s+/g, '')],
      issuer: issuerDid,
      issuanceDate: new Date().toISOString(),
      expirationDate: expiryDate.toISOString(),
      credentialSubject: {
        id: identity.did,
        type: vcType,
        issuedTo: identity.controllerName,
        tfId: identity.tfId,
      },
    };

    // 🔗 Mint NFT on-chain
    const chainResult = await onChainMintAsset(
      identity.walletAddress || '0x0000000000000000000000000000000000000000',
      assetId,
      identity.did,
      issuerDid,
      JSON.stringify(vcMetadata),
      `ipfs://QmTrustForge/vc/${assetId}`,
      false,
    );

    const asset = await prisma.asset.create({
      data: {
        assetId,
        tokenId: chainResult.tokenId ? BigInt(chainResult.tokenId) : BigInt(Date.now()),
        name: vcType,
        assetType: 'VERIFIABLE_CREDENTIAL',
        ownerDid: identity.did,
        ownerIdentityId: identity.id,
        issuerDid,
        status: 'VALID',
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        expiresAt: expiryDate,
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'VC_ISSUED',
        actor: issuer || 'TrustForge Authority',
        actorDid: 'did:trustforge:auth-controller',
        target: assetId,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        status: 'Verified',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, {
      id: asset.assetId,
      type: asset.name,
      issuer: issuer || 'TrustForge Authority',
      issued: new Date().toISOString().split('T')[0],
      expires: asset.expiresAt ? new Date(asset.expiresAt).toISOString().split('T')[0] : null,
      status: 'Active',
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      tokenId: chainResult.tokenId,
      onChain: chainResult.onChain,
      vcDocument: vcMetadata,
    }, 'Verifiable credential issued successfully', 201);
  } catch (err) {
    return sendError(res, 'Failed to issue credential', 'INTERNAL_ERROR', 500);
  }
}



