import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { generateMockTxHash, generateMockBlockNumber, timeAgo } from '../../utils/did';
import crypto from 'crypto';
import { onChainMintAsset, onChainRevokeAsset } from '../../services/blockchain.service';

const createAssetSchema = z.object({
  name: z.string().min(1),
  assetType: z.enum(['DIGITAL_CREDENTIAL', 'CERTIFICATE', 'LICENSE', 'EQUIPMENT', 'DOCUMENT', 'ACCESS_BADGE', 'TRAINING_RECORD', 'SOFTWARE_LICENSE', 'OTHER']).default('DIGITAL_CREDENTIAL'),
  description: z.string().optional(),
  ownerDid: z.string().optional(),
  issuerDid: z.string().optional(),
  proofType: z.enum(['ZK-STARK', 'BBS+', 'JWT-VC']).optional(),
  transferable: z.boolean().default(true),
  expiresAt: z.string().optional(),
});

function generateAssetId(count: number) {
  return `VC-${(8000 + count).toString()}`;
}

export async function listAssets(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1');
    const limit = parseInt(req.query.limit as string || '20');
    const status = req.query.status as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status.toUpperCase();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetId: { contains: search, mode: 'insensitive' } },
        { ownerDid: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [assets, total, totalAll, activeCount, revokedCount] = await Promise.all([
      prisma.asset.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.asset.count({ where }),
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'VALID' } }),
      prisma.asset.count({ where: { status: 'REVOKED' } }),
    ]);

    return sendSuccess(res, {
      assets: assets.map((a) => ({
        assetId: a.assetId,
        name: a.name,
        type: a.assetType,
        ownerDID: a.ownerDid,
        issuerDID: a.issuerDid,
        status: a.status.charAt(0) + a.status.slice(1).toLowerCase(),
        tokenId: a.tokenId,
        txHash: a.txHash ? `${a.txHash.slice(0, 6)}...${a.txHash.slice(-4)}` : null,
        ipfsCid: a.ipfsCid,
        created: new Date(a.createdAt).toISOString().split('T')[0],
        proofType: a.proofType,
        transferable: a.transferable,
      })),
      stats: { total: totalAll, active: activeCount, revoked: revokedCount },
      pagination: { page, limit, total },
    });
  } catch (err) {
    return sendError(res, 'Failed to list assets', 'INTERNAL_ERROR', 500);
  }
}

export async function getAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ assetId: id }, { id }] },
      include: { ownerships: { orderBy: { transferredAt: 'desc' }, take: 10 } },
    });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);
    return sendSuccess(res, asset);
  } catch (err) {
    return sendError(res, 'Failed to get asset', 'INTERNAL_ERROR', 500);
  }
}

export async function createAsset(req: Request, res: Response) {
  try {
    const parsed = createAssetSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR');

    const count = await prisma.asset.count();
    const assetId = generateAssetId(count + 1);
    const metadataHash = crypto.createHash('sha256').update(JSON.stringify(parsed.data)).digest('hex');

    const asset = await prisma.asset.create({
      data: {
        assetId,
        ...parsed.data,
        metadataHash,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ASSET_CREATED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: assetId,
        status: 'Active',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, asset, 'Asset created', 201);
  } catch (err) {
    return sendError(res, 'Failed to create asset', 'INTERNAL_ERROR', 500);
  }
}

export async function mintAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({ where: { OR: [{ assetId: id }, { id }] } });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);

    const metadataJson = JSON.stringify({ assetId: asset.assetId, name: asset.name, type: asset.assetType, ownerDid: asset.ownerDid });

    // 🔗 Mint on-chain
    const chainResult = await onChainMintAsset(
      '0x0000000000000000000000000000000000000001', // placeholder wallet
      asset.assetId,
      asset.ownerDid || 'did:trustforge:unknown',
      asset.issuerDid || 'did:trustforge:authority',
      metadataJson,
      `ipfs://QmTrustForge/assets/${asset.assetId}`,
      asset.transferable ?? true,
    );

    const tokenId = chainResult.tokenId || String(Date.now());

    await prisma.asset.update({
      where: { id: asset.id },
      data: { tokenId, txHash: chainResult.txHash, blockNumber: chainResult.blockNumber, status: 'VALID' },
    });

    await prisma.blockchainTransaction.create({
      data: {
        txHash: chainResult.txHash,
        blockNumber: BigInt(parseInt((chainResult.blockNumber || '0').replace(/,/g, ''))),
        functionName: 'mintAsset',
        status: chainResult.onChain ? 'confirmed' : 'simulated',
        data: { assetId: asset.assetId, tokenId },
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ASSET_MINTED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: asset.assetId,
        txHash: chainResult.txHash,
        blockNumber: chainResult.blockNumber,
        status: 'Verified',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, {
      assetId: asset.assetId,
      tokenId,
      txHash: chainResult.txHash,
      blockNumber: chainResult.blockNumber,
      onChain: chainResult.onChain,
    }, 'Asset minted on-chain');
  } catch (err) {
    return sendError(res, 'Failed to mint asset', 'INTERNAL_ERROR', 500);
  }
}

export async function allocateAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { recipientDid } = req.body;
    if (!recipientDid) return sendError(res, 'recipientDid is required', 'VALIDATION_ERROR');

    const asset = await prisma.asset.findFirst({ where: { OR: [{ assetId: id }, { id }] } });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);

    await prisma.asset.update({ where: { id: asset.id }, data: { ownerDid: recipientDid } });
    await prisma.assetOwnership.create({
      data: { assetId: asset.id, ownerDid: recipientDid, fromDid: asset.ownerDid || undefined },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ASSET_ALLOCATED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: asset.assetId,
        status: 'Active',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, { assetId: asset.assetId, newOwner: recipientDid }, 'Asset allocated');
  } catch (err) {
    return sendError(res, 'Failed to allocate asset', 'INTERNAL_ERROR', 500);
  }
}

export async function transferAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { recipientDid } = req.body;
    if (!recipientDid) return sendError(res, 'recipientDid is required', 'VALIDATION_ERROR');

    const asset = await prisma.asset.findFirst({ where: { OR: [{ assetId: id }, { id }] } });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);
    if (asset.status === 'REVOKED') return sendError(res, 'Cannot transfer revoked asset', 'CONFLICT', 409);
    if (!asset.transferable) return sendError(res, 'Asset is not transferable', 'CONFLICT', 409);

    const txHash = generateMockTxHash();
    const blockNumber = generateMockBlockNumber();
    const fromDid = asset.ownerDid;

    await prisma.asset.update({ where: { id: asset.id }, data: { ownerDid: recipientDid, txHash, blockNumber } });
    await prisma.assetOwnership.create({
      data: { assetId: asset.id, ownerDid: recipientDid, fromDid: fromDid || undefined, txHash, blockNumber },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ASSET_TRANSFERRED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: asset.assetId,
        txHash,
        blockNumber,
        status: 'Verified',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, { assetId: asset.assetId, from: fromDid, to: recipientDid, txHash, blockNumber }, 'Asset transferred');
  } catch (err) {
    return sendError(res, 'Failed to transfer asset', 'INTERNAL_ERROR', 500);
  }
}

export async function revokeAsset(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({ where: { OR: [{ assetId: id }, { id }] } });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);
    if (asset.status === 'REVOKED') return sendError(res, 'Asset is already revoked', 'CONFLICT', 409);

    // 🔗 Revoke on-chain if token exists
    let chainResult = { txHash: generateMockTxHash(), blockNumber: generateMockBlockNumber(), onChain: false };
    if (asset.tokenId) {
      chainResult = await onChainRevokeAsset(asset.tokenId.toString());
    }

    await prisma.asset.update({ where: { id: asset.id }, data: { status: 'REVOKED', txHash: chainResult.txHash } });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ASSET_REVOKED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: asset.assetId,
        txHash: chainResult.txHash,
        status: 'Revoked',
        assetId: asset.id,
      },
    });

    return sendSuccess(res, { assetId: asset.assetId, status: 'Revoked', txHash: chainResult.txHash, onChain: chainResult.onChain }, 'Asset revoked');
  } catch (err) {
    return sendError(res, 'Failed to revoke asset', 'INTERNAL_ERROR', 500);
  }
}

export async function getAssetHistory(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ assetId: id }, { id }] },
      include: { ownerships: { orderBy: { transferredAt: 'desc' } }, auditEvents: { orderBy: { createdAt: 'desc' } } },
    });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);
    return sendSuccess(res, {
      ownerships: asset.ownerships.map((o) => ({ ...o, age: timeAgo(new Date(o.transferredAt)) })),
      auditLog: asset.auditEvents.map((e) => ({ ...e, age: timeAgo(new Date(e.createdAt)) })),
    });
  } catch (err) {
    return sendError(res, 'Failed to get asset history', 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET /api/assets/:id/vc
 * Returns a W3C Verifiable Credential document for the given asset.
 */
export async function getVCDocument(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const asset = await prisma.asset.findFirst({
      where: { OR: [{ assetId: id }, { id }] },
      include: { owner: true },
    });
    if (!asset) return sendError(res, 'Asset not found', 'NOT_FOUND', 404);

    const ownerDid = asset.ownerDid || 'did:trustforge:unknown';
    const issuerDid = asset.issuerDid || 'did:trustforge:authority';
    const issuanceDate = asset.createdAt.toISOString();
    const expirationDate = asset.expiresAt ? asset.expiresAt.toISOString() : null;

    // W3C Verifiable Credential format
    const vcDocument = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id: `urn:trustforge:vc:${asset.assetId}`,
      type: ['VerifiableCredential', asset.assetType.replace(/_/g, '').replace(/\b\w/g, c => c.toUpperCase())],
      issuer: {
        id: issuerDid,
        name: 'TrustForge Authority',
        url: 'http://localhost:3001',
      },
      issuanceDate,
      ...(expirationDate && { expirationDate }),
      credentialSubject: {
        id: ownerDid,
        type: asset.assetType,
        name: asset.name,
        assetId: asset.assetId,
        status: asset.status,
        ...(asset.owner && { issuedTo: (asset.owner as any).controllerName }),
      },
      credentialStatus: {
        id: `http://localhost:3001/api/assets/${asset.assetId}`,
        type: 'TrustForgeRevocationList2024',
        revoked: asset.status === 'REVOKED',
      },
      proof: {
        type: 'Ed25519Signature2020',
        created: issuanceDate,
        proofPurpose: 'assertionMethod',
        verificationMethod: `${issuerDid}#key-1`,
        jws: `eyJhbGciOiJFZERTQSJ9..${Buffer.from(`${asset.assetId}:${ownerDid}`).toString('base64').slice(0, 86)}`,
      },
      // NFT metadata (ERC-721)
      nft: {
        standard: 'ERC-721',
        contract: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
        tokenId: asset.tokenId?.toString() || null,
        network: 'Hardhat Local (chainId 31337)',
        txHash: asset.txHash,
        blockNumber: asset.blockNumber,
        transferable: asset.transferable,
        onChain: !!(asset.tokenId && asset.txHash),
      },
    };

    res.setHeader('Content-Type', 'application/vc+ld+json');
    return res.json({ success: true, data: vcDocument });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to resolve VC document', 'INTERNAL_ERROR', 500);
  }
}

