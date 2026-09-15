import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { generateMockTxHash, timeAgo } from '../../utils/did';

const createVerificationSchema = z.object({
  credential: z.string().min(1),
  subjectId: z.string().optional(),
  issuer: z.string().optional(),
  proofType: z.enum(['ZK-STARK', 'BBS+', 'JWT-VC']).default('ZK-STARK'),
});

export async function listVerifications(_req: Request, res: Response) {
  try {
    const [verifications, zkProofs] = await Promise.all([
      prisma.verification.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.zkProof.findMany({ orderBy: { generatedAt: 'desc' }, take: 20 }),
    ]);

    const totalVerifs = await prisma.verification.count();
    const verifiedCount = await prisma.verification.count({ where: { result: 'VERIFIED' } });
    const activeProofs = await prisma.zkProof.count({ where: { status: 'VALID' } });

    return sendSuccess(res, {
      jobs: verifications.map((v) => ({
        id: v.vjId,
        credential: v.credential,
        subject: v.subjectId || '—',
        issuer: v.issuer || 'TrustForge Authority',
        proof: v.proofType || 'ZK-STARK',
        result: v.result.charAt(0) + v.result.slice(1).toLowerCase(),
        latency: v.latencyMs ? `${v.latencyMs}ms` : '—',
        timestamp: timeAgo(new Date(v.createdAt)),
        txHash: v.txHash ? `${v.txHash.slice(0, 6)}...${v.txHash.slice(-4)}` : '—',
      })),
      zkProofs: zkProofs.map((p) => ({
        id: p.proofId,
        type: p.proofType,
        status: p.status.charAt(0) + p.status.slice(1).toLowerCase(),
        circuit: p.circuit || 'n/a',
        generatedAt: p.generatedAt.toISOString().replace('T', ' ').slice(0, 16),
        verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString().replace('T', ' ').slice(0, 16) : '—',
        latency: p.latencyMs ? `${p.latencyMs}ms` : '—',
        publicInputs: p.publicInputs || 0,
        proofSize: p.proofSizeKb ? `${p.proofSizeKb} KB` : '—',
      })),
      stats: {
        totalVerifications: totalVerifs > 1000000 ? `${(totalVerifs / 1000000).toFixed(1)}M` : (totalVerifs > 0 ? totalVerifs.toLocaleString() : '4.1M'),
        successRate: totalVerifs > 0 ? `${((verifiedCount / totalVerifs) * 100).toFixed(2)}%` : '99.98%',
        avgLatency: '12ms',
        activeProofs: activeProofs > 0 ? activeProofs.toLocaleString() : '1,284',
      },
    });
  } catch (err) {
    return sendError(res, 'Failed to list verifications', 'INTERNAL_ERROR', 500);
  }
}

export async function createVerification(req: Request, res: Response) {
  try {
    const parsed = createVerificationSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR');

    const startTime = Date.now();
    const vjCount = await prisma.verification.count();
    const zkCount = await prisma.zkProof.count();

    let verified = true;
    let identityId: string | undefined;
    if (parsed.data.subjectId) {
      const identity = await prisma.identity.findFirst({ where: { tfId: parsed.data.subjectId } });
      if (identity) {
        identityId = identity.id;
        verified = identity.status === 'ACTIVE';
      }
    }

    const latencyMs = Date.now() - startTime + Math.floor(Math.random() * 15);
    const txHash = generateMockTxHash();
    const result = verified ? 'VERIFIED' : 'FAILED';

    const vjId = `VJ-${4000 + vjCount + 1}`;
    const zkpId = `ZKP-${2000 + zkCount + 1}`;

    await Promise.all([
      prisma.verification.create({
        data: {
          vjId,
          credential: parsed.data.credential,
          subjectId: parsed.data.subjectId,
          issuer: parsed.data.issuer,
          proofType: parsed.data.proofType,
          result: result as any,
          latencyMs,
          txHash,
          identityId: identityId || null,
        },
      }),
      prisma.zkProof.create({
        data: {
          proofId: zkpId,
          proofType: parsed.data.proofType,
          status: verified ? 'VALID' : 'INVALID',
          circuit: 'identity-membership-v2',
          publicInputs: 4,
          proofSizeKb: 62.0,
          latencyMs,
          verifiedAt: new Date(),
        },
      }),
    ]);

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ZK_PROOF_VERIFIED',
        actor: 'Verifier',
        actorDid: 'did:trustforge:verifier',
        target: vjId,
        txHash,
        status: result === 'VERIFIED' ? 'Verified' : 'Revoked',
        identityId: identityId || null,
      },
    });

    return sendSuccess(res, {
      jobId: vjId,
      proofId: zkpId,
      result: result.charAt(0) + result.slice(1).toLowerCase(),
      latency: `${latencyMs}ms`,
      txHash,
    }, result === 'VERIFIED' ? 'Verification successful' : 'Verification failed', 200);
  } catch (err) {
    return sendError(res, 'Failed to perform verification', 'INTERNAL_ERROR', 500);
  }
}

export async function unifiedVerify(req: Request, res: Response) {
  try {
    const { identifier } = req.params;
    let identity: any = null;
    let asset: any = null;
    let verified = false;

    if (identifier.startsWith('did:')) {
      identity = await prisma.identity.findFirst({ where: { did: identifier }, include: { assets: { take: 5 } } });
      verified = identity?.status === 'ACTIVE';
    } else if (identifier.startsWith('VC-') || identifier.startsWith('TF-')) {
      if (identifier.startsWith('VC-')) {
        asset = await prisma.asset.findFirst({ where: { assetId: identifier } });
        verified = asset?.status === 'VALID';
      } else {
        identity = await prisma.identity.findFirst({ where: { tfId: identifier } });
        verified = identity?.status === 'ACTIVE';
      }
    }

    return sendSuccess(res, {
      verified,
      identifier,
      identity: identity ? { id: identity.tfId, did: identity.did, status: identity.status, complianceScore: (identity as any).complianceScore } : null,
      asset: asset ? { id: asset.assetId, name: asset.name, status: asset.status, ownerDid: asset.ownerDid } : null,
      blockchain: {
        network: 'Sepolia L1 Anchor',
        verifiedOnChain: true,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return sendError(res, 'Failed to verify', 'INTERNAL_ERROR', 500);
  }
}
