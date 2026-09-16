import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    walletAddress: string;
    identity?: {
      id: string;
      tfId: string;
      did: string;
      status: string;
    } | null;
    roles?: string[];
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = (req as any).headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required', 'UNAUTHORIZED', 401);
    }
    const token = authHeader.split(' ')[1];
    let payload: any;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      return sendError(res, 'Invalid or expired token', 'UNAUTHORIZED', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        identity: {
          select: { id: true, tfId: true, did: true, status: true, roles: { include: { role: true } } },
        },
      },
    });

    const tokenRoles = payload.roles || (payload.role ? [payload.role] : []);
    const dbRoles = user?.identity?.roles?.map((r: any) => r.role.name) || [];
    const allRoles = Array.from(new Set([...dbRoles, ...tokenRoles]));

    req.user = {
      id: user ? user.id : payload.userId,
      walletAddress: user ? user.walletAddress : (payload.walletAddress || '0x0000000000000000000000000000000000000000'),
      identity: user?.identity
        ? {
            id: user.identity.id,
            tfId: user.identity.tfId,
            did: user.identity.did,
            status: user.identity.status,
          }
        : (payload.tfId ? {
            id: payload.userId,
            tfId: payload.tfId,
            did: payload.did || `did:trustforge:${payload.userId}`,
            status: 'ACTIVE',
          } : null),
      roles: allRoles.length > 0 ? allRoles : ['USER'],
    };
    return next();
  } catch (err) {
    return sendError(res, 'Authentication error', 'INTERNAL_ERROR', 500);
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return sendError(res, 'Not authenticated', 'UNAUTHORIZED', 401);
    const userRoles = req.user.roles || [];
    const hasRole = roles.some((r) => userRoles.includes(r));
    if (!hasRole) return sendError(res, 'Insufficient permissions', 'FORBIDDEN', 403);
    return next();
  };
}
