import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { config } from '../../config/env';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth';

const nonceSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

const verifySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  signature: z.string().min(1, 'Signature required'),
});

export async function requestNonce(req: Request, res: Response) {
  try {
    const parsed = nonceSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR');

    const { address } = parsed.data;
    const checksumAddress = ethers.getAddress(address);
    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    await prisma.user.upsert({
      where: { walletAddress: checksumAddress },
      create: { walletAddress: checksumAddress, nonce, nonceExpiresAt: expiresAt },
      update: { nonce, nonceExpiresAt: expiresAt },
    });

    const issuedAt = new Date().toISOString();
    const message = [
      'TrustForge Enterprise Identity Platform',
      '',
      'Sign this message to authenticate with TrustForge.',
      'This request will not trigger a blockchain transaction or cost any gas fees.',
      '',
      `Wallet: ${checksumAddress}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt}`,
      `Expires: ${expiresAt.toISOString()}`,
      '',
      'Domain: TrustForge Console',
    ].join('\n');

    return sendSuccess(res, { nonce, message, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    return sendError(res, 'Failed to generate nonce', 'INTERNAL_ERROR', 500);
  }
}

export async function verifySignature(req: Request, res: Response) {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR');

    const { address, signature } = parsed.data;
    const checksumAddress = ethers.getAddress(address);

    const user = await prisma.user.findUnique({ where: { walletAddress: checksumAddress } });
    if (!user || !user.nonce) return sendError(res, 'No pending nonce. Request one first.', 'INVALID_NONCE', 400);
    if (!user.nonceExpiresAt || user.nonceExpiresAt < new Date()) {
      return sendError(res, 'Nonce has expired. Request a new one.', 'NONCE_EXPIRED', 400);
    }

    const issuedAt = user.updatedAt.toISOString();
    const message = [
      'TrustForge Enterprise Identity Platform',
      '',
      'Sign this message to authenticate with TrustForge.',
      'This request will not trigger a blockchain transaction or cost any gas fees.',
      '',
      `Wallet: ${checksumAddress}`,
      `Nonce: ${user.nonce}`,
      `Issued At: ${issuedAt}`,
      `Expires: ${user.nonceExpiresAt.toISOString()}`,
      '',
      'Domain: TrustForge Console',
    ].join('\n');

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
      return sendError(res, 'Invalid signature', 'INVALID_SIGNATURE', 401);
    }

    if (recoveredAddress.toLowerCase() !== checksumAddress.toLowerCase()) {
      return sendError(res, 'Signature does not match wallet address', 'SIGNATURE_MISMATCH', 401);
    }

    const updatedUser = await prisma.user.update({
      where: { walletAddress: checksumAddress },
      data: { nonce: '', nonceExpiresAt: null },
      include: {
        identity: {
          select: { id: true, tfId: true, did: true, status: true, roles: { include: { role: true } } },
        },
      },
    });

    const token = jwt.sign(
      { userId: updatedUser.id, walletAddress: checksumAddress },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        identity: updatedUser.identity
          ? {
              id: updatedUser.identity.id,
              tfId: updatedUser.identity.tfId,
              did: updatedUser.identity.did,
              status: updatedUser.identity.status,
              roles: updatedUser.identity.roles.map((r) => r.role.name),
            }
          : null,
      },
    }, 'Authentication successful');
  } catch (err) {
    return sendError(res, 'Verification failed', 'INTERNAL_ERROR', 500);
  }
}

export async function logout(_req: AuthRequest, res: Response) {
  return sendSuccess(res, null, 'Logged out successfully');
}

export async function getMe(req: AuthRequest, res: Response) {
  return sendSuccess(res, { ...req.user, user: req.user });
}

const personaLoginSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().optional().or(z.literal('')),
  role: z.string().optional().default('Super Admin'),
  avatar: z.string().optional().nullable(),
  walletAddress: z.string().optional().nullable(),
  tfId: z.string().optional().nullable(),
});

export async function personaLogin(req: Request, res: Response) {
  try {
    const parsed = personaLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }
    const { name, role } = parsed.data;
    const isSaurabh = name.toLowerCase().includes('saurabh');
    const email = parsed.data.email || (isSaurabh ? 'sk1300374@gmail.com' : `${name.toLowerCase().replace(/\s+/g, '.')}@trustforge.io`);
    const tfId = parsed.data.tfId || (isSaurabh ? 'TF-10482' : `TF-${Math.floor(10000 + Math.random() * 90000)}`);
    const addr = parsed.data.walletAddress || ('0x' + crypto.randomBytes(20).toString('hex'));
    const checksumAddress = ethers.getAddress(addr);
    const did = `did:trustforge:${checksumAddress.slice(2, 22)}`;
    const avatar = parsed.data.avatar || (isSaurabh ? '/admin-avatar.png' : '/default-avatar.svg');

    // 1. Upsert user in DB
    const user = await prisma.user.upsert({
      where: { walletAddress: checksumAddress },
      create: {
        walletAddress: checksumAddress,
        nonce: '',
      },
      update: {},
    });

    // 2. Ensure role exists in DB
    const dbRole = await prisma.role.upsert({
      where: { name: role },
      create: { name: role, displayName: role, description: `${role} enterprise permissions` },
      update: {},
    });

    // 3. Upsert Identity record
    const identity = await prisma.identity.upsert({
      where: { tfId },
      create: {
        tfId,
        did,
        controllerName: name,
        keyType: 'Secp256k1',
        method: 'did:key',
        walletAddress: checksumAddress,
        status: 'ACTIVE',
        userId: user.id,
      },
      update: {
        controllerName: name,
        walletAddress: checksumAddress,
        status: 'ACTIVE',
      },
    });

    // 4. Ensure IdentityRole relationship
    await prisma.identityRole.upsert({
      where: {
        identityId_roleId: {
          identityId: identity.id,
          roleId: dbRole.id,
        },
      },
      create: {
        identityId: identity.id,
        roleId: dbRole.id,
      },
      update: {},
    });

    // 5. Sign real cryptographic JWT
    const token = jwt.sign(
      {
        userId: user.id,
        walletAddress: checksumAddress,
        role,
        roles: [role],
        name,
        email,
        tfId,
        did,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return sendSuccess(res, {
      token,
      user: {
        id: user.id,
        name,
        email,
        role,
        avatar,
        tfId,
        did,
        walletAddress: checksumAddress,
        roles: [role],
        identity: {
          id: identity.id,
          tfId: identity.tfId,
          did: identity.did,
          status: identity.status,
          roles: [role],
        },
      },
    }, `Authenticated as ${name}`);
  } catch (err: any) {
    console.error('[personaLogin error]:', err);
    return sendError(res, err.message || 'Persona login failed', 'INTERNAL_ERROR', 500);
  }
}
