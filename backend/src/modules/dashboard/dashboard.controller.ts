import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { timeAgo } from '../../utils/did';
import { getBlockchainStats as fetchBlockchainStats } from '../../services/blockchain.service';

export async function getOverview(_req: Request, res: Response) {
  try {
    const [totalIdentities, activeIdentities, totalAssets, verifiedAssets, recentAuditEvents, latestBlock] =
      await Promise.all([
        prisma.identity.count(),
        prisma.identity.count({ where: { status: 'ACTIVE' } }),
        prisma.asset.count(),
        prisma.asset.count({ where: { status: 'VALID' } }),
        prisma.auditEvent.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.blockchainTransaction.findFirst({ orderBy: { createdAt: 'desc' } }),
      ]);

    const pendingIdentities = await prisma.identity.count({ where: { status: 'PENDING' } });
    const complianceRate = totalIdentities > 0 ? Math.round((activeIdentities / totalIdentities) * 100 * 10) / 10 : 94.3;
    const verifiedRate = totalAssets > 0 ? Math.round((verifiedAssets / totalAssets) * 100 * 10) / 10 : 93.3;

    const iconMap: Record<string, string> = {
      DID_CREATED: 'badge',
      DID_UPDATED: 'badge',
      DID_REVOKED: 'cancel',
      VC_ISSUED: 'workspace_premium',
      VC_REVOKED: 'cancel',
      ASSET_MINTED: 'token',
      ASSET_TRANSFERRED: 'swap_horiz',
      ASSET_REVOKED: 'cancel',
      KEY_ROTATION: 'key',
      POLICY_UPDATE: 'admin_panel_settings',
      ZK_PROOF_VERIFIED: 'verified_user',
      ROLE_ASSIGNED: 'how_to_reg',
      QUORUM_SIGNED: 'how_to_reg',
      LOGIN_VERIFIED: 'login',
      IDENTITY_VERIFIED: 'verified_user',
    };

    const recentActivity = recentAuditEvents.map((e) => ({
      type: e.eventType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: iconMap[e.eventType] || 'history',
      actor: e.actor,
      did: e.actorDid || 'did:trustforge:unknown',
      target: e.target,
      txHash: e.txHash ? `${e.txHash.slice(0, 6)}...${e.txHash.slice(-4)}` : '—',
      age: timeAgo(e.createdAt),
      status: e.status,
    }));

    const metrics = [
      {
        label: 'Total Identities',
        value: totalIdentities > 0 ? totalIdentities.toLocaleString() : '12,842',
        icon: 'badge',
        trend: '+3.8%',
        sub: 'W3C DID v1.0',
        trendColor: 'text-emerald-700',
      },
      {
        label: 'Active Identities',
        value: activeIdentities > 0 ? activeIdentities.toLocaleString() : '12,106',
        icon: 'how_to_reg',
        trend: `${complianceRate}% compliance`,
        sub: 'Verified & Synced',
        trendColor: 'text-primary',
      },
      {
        label: 'Digital Assets',
        value: totalAssets > 0 ? totalAssets.toLocaleString() : '4,281',
        icon: 'token',
        trend: 'ERC-721 / ERC-1155',
        sub: '9 Registries',
        trendColor: 'text-secondary',
      },
      {
        label: 'Verified Assets',
        value: verifiedAssets > 0 ? verifiedAssets.toLocaleString() : '3,994',
        icon: 'verified',
        trend: `${verifiedRate}% anchored`,
        sub: 'On-chain',
        trendColor: 'text-emerald-700',
      },
    ];

    const systemStatus = [
      { label: 'Attestation Engine', status: 'Online', latency: '4ms', icon: 'check_circle', color: 'text-emerald-600' },
      { label: 'ZK-STARK Verifier', status: 'Online', latency: '12ms', icon: 'check_circle', color: 'text-emerald-600' },
      { label: 'DID Registry Sync', status: 'Online', latency: '8ms', icon: 'check_circle', color: 'text-emerald-600' },
      { label: 'Multi-Sig Quorum', status: pendingIdentities > 0 ? 'Pending' : 'Online', latency: pendingIdentities > 0 ? `${pendingIdentities} awaiting` : '3 awaiting', icon: pendingIdentities > 0 ? 'warning' : 'warning', color: 'text-amber-500' },
      { label: 'HSM Integration', status: 'Online', latency: '2ms', icon: 'check_circle', color: 'text-emerald-600' },
    ];

    return sendSuccess(res, {
      metrics,
      recentActivity: recentActivity.length > 0 ? recentActivity : [
        { type: 'NFT Mint', icon: 'token', actor: 'Admin', did: 'did:trustforge:9a2f...', target: 'TF-10482', txHash: '0x82ac...91de', age: '2m ago', status: 'Synced' },
        { type: 'DID Update', icon: 'badge', actor: 'Controller', did: 'did:trustforge:3b1c...', target: 'TF-10480', txHash: '0x91bc...44af', age: '8m ago', status: 'Verified' },
        { type: 'Key Rotation', icon: 'key', actor: 'HSM Node', did: 'did:trustforge:7e4a...', target: 'TF-10478', txHash: '0x44de...78bc', age: '15m ago', status: 'Active' },
        { type: 'Policy Update', icon: 'admin_panel_settings', actor: 'Auditor', did: 'did:trustforge:2d8f...', target: 'Policy-004', txHash: '0x12fc...33ab', age: '22m ago', status: 'Verified' },
        { type: 'Credential Revoke', icon: 'cancel', actor: 'Admin', did: 'did:trustforge:9a2f...', target: 'TF-10455', txHash: '0x55aa...91bc', age: '41m ago', status: 'Revoked' },
        { type: 'Quorum Signed', icon: 'how_to_reg', actor: 'Multi-Sig', did: 'did:trustforge:4c7e...', target: 'Quorum-007', txHash: '0x88dd...12ef', age: '1h ago', status: 'Active' },
        { type: 'ZK Proof Submit', icon: 'verified_user', actor: 'Validator', did: 'did:trustforge:5f2b...', target: 'ZKP-2291', txHash: '0x39cc...56bd', age: '2h ago', status: 'Verified' },
      ],
      systemStatus,
      blockchain: {
        blockNumber: latestBlock?.blockNumber?.toLocaleString() || '18,294,105',
        network: 'Sepolia Execution Anchor',
        synced: true,
        rpcLatency: '12ms',
      },
      compliance: {
        score: 94,
        soc2: true,
        w3cDid: true,
        gdpr: 'partial',
      },
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to fetch overview', 'INTERNAL_ERROR', 500);
  }
}

export async function getSecurity(_req: Request, res: Response) {
  try {
    const [totalIdentities, activeIdentities, totalAssets, verifiedAssets, auditEvents, quorumRequests, incidents] =
      await Promise.all([
        prisma.identity.count(),
        prisma.identity.count({ where: { status: 'ACTIVE' } }),
        prisma.asset.count(),
        prisma.asset.count({ where: { status: 'VALID' } }),
        prisma.auditEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
        prisma.quorumRequest.findMany({ where: { status: 'Pending' }, take: 5 }),
        prisma.incident.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
      ]);

    const iconMap: Record<string, string> = {
      DID_CREATED: 'badge',
      DID_REVOKED: 'cancel',
      VC_ISSUED: 'workspace_premium',
      ASSET_MINTED: 'token',
      KEY_ROTATION: 'autorenew',
      POLICY_UPDATE: 'policy',
      QUORUM_SIGNED: 'how_to_reg',
      ZK_PROOF_VERIFIED: 'verified_user',
      ROLE_ASSIGNED: 'how_to_reg',
      IDENTITY_REVOCATION: 'cancel',
    };

    const metrics = [
      { label: 'Decentralized Identities', value: totalIdentities > 0 ? totalIdentities.toLocaleString() : '14,892', trend: '+4.2%', sub: '99.4% Compliant · W3C v1.0', icon: 'badge', trendColor: 'text-emerald-700' },
      { label: 'Active Controllers', value: activeIdentities > 0 ? activeIdentities.toLocaleString() : '14,210', trend: '95.4%', sub: '9,418 HSM/Yubi · 682 Soft', icon: 'key', trendColor: 'text-emerald-700' },
      { label: 'Digital Assets Managed', value: totalAssets > 0 ? totalAssets.toLocaleString() : '48,210', trend: 'ERC-721', sub: '47,985 Verified · ZK Anchored', icon: 'token', trendColor: 'text-secondary' },
      { label: 'Multi-Sig Quorums', value: quorumRequests.length > 0 ? `${quorumRequests.length} Pending` : '3 Pending', trend: '2 req. < 4h', sub: '2/3 Threshold', icon: 'how_to_reg', trendColor: 'text-amber-700' },
      { label: '24h Ledger Txns', value: auditEvents.length > 0 ? auditEvents.length.toLocaleString() : '382,914', trend: '100%', sub: '0 Failed Txs · 14.8 Gwei', icon: 'sync_alt', trendColor: 'text-emerald-700' },
      { label: 'Proof Verification', value: '99.98%', trend: '4.1M', sub: 'Latency: 12ms · ZK-STARK', icon: 'verified_user', trendColor: 'text-emerald-700' },
    ];

    const auditStream = auditEvents.map((e) => ({
      type: e.eventType,
      icon: iconMap[e.eventType] || 'history',
      actor: e.actor,
      did: e.actorWallet ? `${e.actorWallet.slice(0, 6)}...` : (e.actorDid ? `${e.actorDid.slice(0, 8)}...` : ''),
      target: e.target,
      hash: e.txHash ? `${e.txHash.slice(0, 6)}...` : '—',
      block: e.blockNumber || '—',
      age: timeAgo(e.createdAt),
      status: e.status,
    }));

    const nodeHealth = [
      { label: 'RPC Latency', value: '12ms', bar: 88, color: 'bg-emerald-600' },
      { label: 'Mempool Depth', value: '142 txns', bar: 42, color: 'bg-primary' },
      { label: 'Gas Price (Gwei)', value: '14.8', bar: 60, color: 'bg-secondary' },
      { label: 'Peer Count', value: '48 peers', bar: 95, color: 'bg-emerald-600' },
    ];

    return sendSuccess(res, {
      metrics,
      auditStream: auditStream.length > 0 ? auditStream : [
        { type: 'IDENTITY_REVOCATION', actor: 'Admin', did: '0xDEF1...', target: 'TF-10455', hash: '0x22ab...', block: '18,293,300', age: '2m', status: 'Revoked', icon: 'cancel' },
        { type: 'ZK_PROOF_SUBMIT', actor: 'Validator', did: '0x5F2B...', target: 'ZKP-2291', hash: '0x39cc...', block: '18,293,295', age: '4m', status: 'Verified', icon: 'verified_user' },
        { type: 'MULTI_SIG_APPROVAL', actor: 'Signer-1', did: '0x4C7E...', target: 'QR-006', hash: '0x88dd...', block: '18,293,290', age: '7m', status: 'Pending', icon: 'how_to_reg' },
        { type: 'CREDENTIAL_ISSUANCE', actor: 'Authority', did: '0xAUTH...', target: 'VC-8821', hash: '0x55bc...', block: '18,293,280', age: '9m', status: 'Active', icon: 'workspace_premium' },
        { type: 'KEY_ROTATION', actor: 'HSM-Node', did: '0x7E4A...', target: 'TF-10478', hash: '0x91de...', block: '18,293,270', age: '15m', status: 'Active', icon: 'autorenew' },
        { type: 'POLICY_UPDATE', actor: 'Sec Admin', did: '0x3B1C...', target: 'Policy-004', hash: '0x12fc...', block: '18,293,260', age: '22m', status: 'Verified', icon: 'policy' },
      ],
      incidents: incidents.length > 0 ? incidents : [
        { id: 'INC-041', title: 'Credential Expiry Batch Alert', severity: 'Warning', count: '42 VCs', eta: '3 days', status: 'Pending' },
        { id: 'INC-040', title: 'Multi-Sig Quorum Timeout Risk', severity: 'Critical', count: '2 requests', eta: '< 4h', status: 'Critical' },
        { id: 'INC-039', title: 'Soft Key Usage Detected', severity: 'Warning', count: '682 keys', eta: 'Ongoing', status: 'Warning' },
      ],
      quorumRequests,
      nodeHealth,
    });
  } catch (err) {
    console.error(err);
    return sendError(res, 'Failed to fetch security dashboard', 'INTERNAL_ERROR', 500);
  }
}

/**
 * GET /api/dashboard/blockchain
 * Returns live blockchain stats from the Hardhat node.
 */
export async function getBlockchainStats(_req: Request, res: Response) {
  try {
    const stats = await fetchBlockchainStats();
    return sendSuccess(res, stats);
  } catch (err) {
    return sendError(res, 'Failed to fetch blockchain stats', 'INTERNAL_ERROR', 500);
  }
}
