import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { db } from '../../config/store';
import { sendSuccess, sendError } from '../../utils/response';
import { onChainGrantRole, onChainRevokeRole } from '../../services/blockchain.service';

export async function getRoles(_req: Request, res: Response) {
  try {
    const [roles, quorumRequests] = await Promise.all([
      prisma.role.findMany({
        include: {
          _count: { select: { identities: true } },
          permissions: { include: { permission: true } },
        },
      }),
      prisma.quorumRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);

    return sendSuccess(res, {
      roles: roles.map((r) => ({
        name: r.displayName,
        members: r._count.identities,
        permissions: r.permissions.map((p) => p.permission.code),
        status: 'Active',
        color: r.color,
      })),
      quorumRequests: quorumRequests.map((q) => ({
        id: q.qrId,
        action: q.action,
        threshold: q.threshold,
        signed: q.signed,
        requestor: q.requestor,
        expires: q.expiresAt > new Date() ? `${Math.round((q.expiresAt.getTime() - Date.now()) / 3600000)}h remaining` : 'Expired',
        urgency: q.urgency,
      })),
    });
  } catch (err) {
    return sendError(res, 'Failed to fetch roles', 'INTERNAL_ERROR', 500);
  }
}

export async function getPermissions(_req: Request, res: Response) {
  try {
    const permissions = await prisma.permission.findMany();
    return sendSuccess(res, { permissions });
  } catch (err) {
    return sendError(res, 'Failed to fetch permissions', 'INTERNAL_ERROR', 500);
  }
}

export async function assignRole(req: Request, res: Response) {
  try {
    const { identityId, roleName } = req.body;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: identityId }, { id: identityId }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);
    const role = await prisma.role.findFirst({ where: { OR: [{ name: roleName }, { displayName: roleName }] } });
    if (!role) return sendError(res, 'Role not found', 'NOT_FOUND', 404);

    const chainResult = await onChainGrantRole(identity.did, role.name);

    await prisma.identityRole.upsert({
      where: { identityId_roleId: { identityId: identity.id, roleId: role.id } },
      create: { identityId: identity.id, roleId: role.id },
      update: {},
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ROLE_ASSIGNED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: identity.tfId,
        txHash: chainResult.txHash,
        status: 'Active',
        identityId: identity.id,
      },
    });

    return sendSuccess(res, { identityId, roleName, txHash: chainResult.txHash, onChain: chainResult.onChain }, 'Role assigned on-chain');
  } catch (err) {
    return sendError(res, 'Failed to assign role', 'INTERNAL_ERROR', 500);
  }
}

export async function revokeRole(req: Request, res: Response) {
  try {
    const { identityId, roleName } = req.body;
    const identity = await prisma.identity.findFirst({ where: { OR: [{ tfId: identityId }, { id: identityId }] } });
    if (!identity) return sendError(res, 'Identity not found', 'NOT_FOUND', 404);
    const role = await prisma.role.findFirst({ where: { OR: [{ name: roleName }, { displayName: roleName }] } });
    if (!role) return sendError(res, 'Role not found', 'NOT_FOUND', 404);

    const chainResult = await onChainRevokeRole(identity.did, role.name);

    await prisma.identityRole.deleteMany({ where: { identityId: identity.id, roleId: role.id } });

    return sendSuccess(res, { identityId, roleName, txHash: chainResult.txHash, onChain: chainResult.onChain }, 'Role revoked on-chain');
  } catch (err) {
    return sendError(res, 'Failed to revoke role', 'INTERNAL_ERROR', 500);
  }
}

export async function createRole(req: Request, res: Response) {
  try {
    const { name, displayName, color, permissions } = req.body;
    if (!name && !displayName) return sendError(res, 'Role name is required', 'VALIDATION_ERROR', 400);

    const roleName = (name || displayName).toUpperCase().replace(/\s+/g, '_');
    const roleDisp = displayName || name;

    const newRole = await prisma.role.create({
      data: {
        name: roleName,
        displayName: roleDisp,
        description: `Role for ${roleDisp}`,
        color: color || 'bg-primary/10 text-primary',
      },
    });

    if (Array.isArray(permissions)) {
      for (const permCode of permissions) {
        let perm = await prisma.permission.findFirst({ where: { code: permCode } });
        if (!perm) {
          perm = await prisma.permission.create({
            data: { code: permCode, name: permCode, resource: 'SYSTEM', action: 'MANAGE' },
          });
        }
        db.rolePermissions.push({ id: crypto.randomUUID(), roleId: newRole.id, permissionId: perm.id });
      }
    }

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'ROLE_CREATED',
        actor: 'Admin',
        actorDid: 'did:trustforge:admin',
        target: roleDisp,
        status: 'Active',
      },
    });

    return sendSuccess(res, { role: newRole }, 'Role created successfully', 201);
  } catch (err) {
    console.error('[createRole] Error:', err);
    return sendError(res, 'Failed to create role', 'INTERNAL_ERROR', 500);
  }
}

export async function signQuorumRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const request = await prisma.quorumRequest.findFirst({ where: { OR: [{ qrId: id }, { id }] } });
    if (!request) return sendError(res, 'Quorum request not found', 'NOT_FOUND', 404);

    const updatedSigned = (request.signed || 0) + 1;
    const [reqCount] = request.threshold.split('/').map((n: string) => parseInt(n, 10));
    const isApproved = updatedSigned >= (reqCount || 2);

    await prisma.quorumRequest.update({
      where: { id: request.id },
      data: {
        signed: updatedSigned,
        status: isApproved ? 'Executed' : 'Pending',
      },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'QUORUM_SIGNED',
        actor: 'Signer-Node',
        actorDid: 'did:trustforge:signer-node',
        target: request.qrId,
        status: isApproved ? 'Verified' : 'Active',
      },
    });

    return sendSuccess(res, { id: request.qrId, signed: updatedSigned, status: isApproved ? 'Executed' : 'Pending' }, isApproved ? 'Quorum reached and executed!' : 'Quorum signed');
  } catch (err) {
    console.error('[signQuorumRequest] Error:', err);
    return sendError(res, 'Failed to sign quorum request', 'INTERNAL_ERROR', 500);
  }
}

export async function rejectQuorumRequest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const request = await prisma.quorumRequest.findFirst({ where: { OR: [{ qrId: id }, { id }] } });
    if (!request) return sendError(res, 'Quorum request not found', 'NOT_FOUND', 404);

    await prisma.quorumRequest.update({
      where: { id: request.id },
      data: { status: 'Rejected' },
    });

    const aeCount = await prisma.auditEvent.count();
    await prisma.auditEvent.create({
      data: {
        aeId: `AE-${9000 + aeCount + 1}`,
        eventType: 'QUORUM_REJECTED',
        actor: 'Signer-Node',
        actorDid: 'did:trustforge:signer-node',
        target: request.qrId,
        status: 'Revoked',
      },
    });

    return sendSuccess(res, { id: request.qrId, status: 'Rejected' }, 'Quorum request rejected');
  } catch (err) {
    return sendError(res, 'Failed to reject quorum request', 'INTERNAL_ERROR', 500);
  }
}
