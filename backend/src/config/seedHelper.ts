import { prisma } from './prisma';
import crypto from 'crypto';

function mockHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function mockBlock() {
  return (18290000 + Math.floor(Math.random() * 10000)).toLocaleString();
}

export async function autoSeedDatabase() {
  try {
    const existingRoles = await prisma.role.count().catch(() => 0);
    if (existingRoles > 0) {
      return;
    }

    console.log('🌱 Auto-seeding initial TrustForge platform data...');

    const roles = await Promise.all([
      prisma.role.create({ data: { name: 'ADMIN', displayName: 'Super Admin', color: 'bg-red-100 text-red-800' } }),
      prisma.role.create({ data: { name: 'SECURITY_ADMIN', displayName: 'Security Admin', color: 'bg-primary/10 text-primary' } }),
      prisma.role.create({ data: { name: 'AUDITOR', displayName: 'Auditor', color: 'bg-secondary/10 text-secondary' } }),
      prisma.role.create({ data: { name: 'DEVELOPER', displayName: 'Developer', color: 'bg-emerald-100 text-emerald-800' } }),
      prisma.role.create({ data: { name: 'VERIFIER', displayName: 'Verifier', color: 'bg-amber-100 text-amber-800' } }),
      prisma.role.create({ data: { name: 'USER', displayName: 'Read-Only', color: 'bg-surface-container-high text-on-surface-variant' } }),
    ]);

    const permissionCodes = [
      ['IDENTITY_CREATE', 'Create decentralized identities'],
      ['IDENTITY_UPDATE', 'Update identity documents'],
      ['IDENTITY_REVOKE', 'Revoke identities'],
      ['IDENTITY_VERIFY', 'Verify identity status'],
      ['ROLE_ASSIGN', 'Assign roles to identities'],
      ['ROLE_REVOKE', 'Revoke roles from identities'],
      ['ASSET_CREATE', 'Create digital assets'],
      ['ASSET_MINT', 'Mint assets as NFTs'],
      ['ASSET_ALLOCATE', 'Allocate assets to identities'],
      ['ASSET_TRANSFER', 'Transfer asset ownership'],
      ['ASSET_REVOKE', 'Revoke/burn assets'],
      ['ASSET_VERIFY', 'Verify asset authenticity'],
      ['AUDIT_VIEW', 'View audit trail'],
      ['POLICY_MANAGE', 'Manage access policies'],
    ];

    const permissions = await Promise.all(
      permissionCodes.map(([code, description]) => prisma.permission.create({ data: { code, description } }))
    );

    const adminRole = roles[0];
    const secAdminRole = roles[1];
    const auditorRole = roles[2];
    const developerRole = roles[3];
    const verifierRole = roles[4];
    const userRole = roles[5];

    await Promise.all(permissions.map((p: any) => prisma.rolePermission.create({ data: { roleId: adminRole.id, permissionId: p.id } })));
    const secAdminPerms = permissions.filter((p: any) => !['ROLE_ASSIGN', 'ROLE_REVOKE'].includes(p.code));
    await Promise.all(secAdminPerms.map((p: any) => prisma.rolePermission.create({ data: { roleId: secAdminRole.id, permissionId: p.id } })));
    const auditorPerms = permissions.filter((p: any) => ['AUDIT_VIEW', 'IDENTITY_VERIFY', 'ASSET_VERIFY'].includes(p.code));
    await Promise.all(auditorPerms.map((p: any) => prisma.rolePermission.create({ data: { roleId: auditorRole.id, permissionId: p.id } })));
    const verifierPerms = permissions.filter((p: any) => ['IDENTITY_VERIFY', 'ASSET_VERIFY', 'AUDIT_VIEW'].includes(p.code));
    await Promise.all(verifierPerms.map((p: any) => prisma.rolePermission.create({ data: { roleId: verifierRole.id, permissionId: p.id } })));
    const userPerms = permissions.filter((p: any) => ['AUDIT_VIEW'].includes(p.code));
    await Promise.all(userPerms.map((p: any) => prisma.rolePermission.create({ data: { roleId: userRole.id, permissionId: p.id } })));

    const identityData = [
      { tfId: 'TF-10482', did: 'did:trustforge:9a2f3b1c7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b', controllerName: 'Saurabh Kumar', method: 'did:key', keyType: 'Ed25519', status: 'ACTIVE', complianceScore: 98 },
      { tfId: 'TF-10480', did: 'did:trustforge:3b1c7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a', controllerName: 'Marcus Vance', method: 'did:ion', keyType: 'secp256k1', status: 'ACTIVE', complianceScore: 95 },
      { tfId: 'TF-10478', did: 'did:trustforge:7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c', controllerName: 'HSM-Node-01', method: 'did:web', keyType: 'P-256', status: 'ACTIVE', complianceScore: 100 },
      { tfId: 'TF-10476', did: 'did:trustforge:2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a', controllerName: 'Priya Menon', method: 'did:key', keyType: 'Ed25519', status: 'PENDING', complianceScore: 72 },
      { tfId: 'TF-10455', did: 'did:trustforge:5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f', controllerName: 'Legacy System', method: 'did:ethr', keyType: 'secp256k1', status: 'REVOKED', complianceScore: 10 },
      { tfId: 'TF-10450', did: 'did:trustforge:1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e', controllerName: 'Dao Li', method: 'did:ion', keyType: 'P-384', status: 'ACTIVE', complianceScore: 91 },
      { tfId: 'TF-10448', did: 'did:trustforge:8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e1a4b', controllerName: 'Jamie Osei', method: 'did:key', keyType: 'Ed25519', status: 'ACTIVE', complianceScore: 88 },
      { tfId: 'TF-10440', did: 'did:trustforge:6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e1a4b8d3c', controllerName: 'Sys Validator', method: 'did:web', keyType: 'P-256', status: 'PENDING', complianceScore: 60 },
    ];

    const identities = await Promise.all(
      identityData.map((d) => prisma.identity.create({
        data: {
          ...d,
          txHash: mockHash(),
          blockNumber: mockBlock(),
          lastSeenAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          status: d.status as any,
        },
      }))
    );

    await prisma.identityRole.create({ data: { identityId: identities[0].id, roleId: adminRole.id } });
    await prisma.identityRole.create({ data: { identityId: identities[1].id, roleId: secAdminRole.id } });
    await prisma.identityRole.create({ data: { identityId: identities[2].id, roleId: auditorRole.id } });
    await prisma.identityRole.create({ data: { identityId: identities[3].id, roleId: developerRole.id } });
    await prisma.identityRole.create({ data: { identityId: identities[5].id, roleId: verifierRole.id } });
    await prisma.identityRole.create({ data: { identityId: identities[6].id, roleId: userRole.id } });

    const assetData = [
      { assetId: 'VC-8821', name: 'SOC2 Type II', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:authority', ownerDid: identities[0].did, proofType: 'ZK-STARK', status: 'VALID' },
      { assetId: 'VC-8820', name: 'ISO 27001', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:globalcert', ownerDid: identities[0].did, proofType: 'ZK-STARK', status: 'VALID' },
      { assetId: 'VC-7741', name: 'KYC Verified', assetType: 'DIGITAL_CREDENTIAL', issuerDid: 'did:trustforge:idverify', ownerDid: identities[0].did, proofType: 'BBS+', status: 'VALID' },
      { assetId: 'VC-6610', name: 'Employment Credential', assetType: 'DIGITAL_CREDENTIAL', issuerDid: 'did:trustforge:commbank-hr', ownerDid: identities[4].did, proofType: 'JWT-VC', status: 'REVOKED' },
      { assetId: 'VC-8819', name: 'Accreditation', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:accredbody', ownerDid: identities[5].did, proofType: 'ZK-STARK', status: 'VALID' },
      { assetId: 'VC-8818', name: 'PII Token', assetType: 'ACCESS_BADGE', issuerDid: 'did:trustforge:privacy-shield', ownerDid: identities[6].did, proofType: 'BBS+', status: 'VALID' },
      { assetId: 'VC-8817', name: 'Software License', assetType: 'SOFTWARE_LICENSE', issuerDid: 'did:trustforge:admin', ownerDid: identities[1].did, proofType: 'JWT-VC', status: 'VALID' },
      { assetId: 'VC-8816', name: 'Training Certificate', assetType: 'TRAINING_RECORD', issuerDid: 'did:trustforge:admin', ownerDid: identities[2].did, proofType: 'ZK-STARK', status: 'VALID' },
    ];

    const assets = await Promise.all(
      assetData.map((d) => prisma.asset.create({
        data: {
          ...d,
          tokenId: Math.floor(Math.random() * 100000).toString(),
          txHash: mockHash(),
          blockNumber: mockBlock(),
          metadataHash: crypto.createHash('sha256').update(d.name).digest('hex'),
          transferable: true,
          assetType: d.assetType as any,
          status: d.status as any,
          ownerIdentityId: d.status !== 'REVOKED' ? identities[0].id : identities[4].id,
          issuerIdentityId: identities[0].id,
        },
      }))
    );

    const verificationData = [
      { vjId: 'VJ-4421', credential: 'SOC2 Type II', subjectId: 'TF-10482', issuer: 'TrustForge Authority', proofType: 'ZK-STARK', result: 'VERIFIED', latencyMs: 11 },
      { vjId: 'VJ-4420', credential: 'KYC Verified', subjectId: 'TF-10480', issuer: 'ID Verify Pro', proofType: 'BBS+', result: 'VERIFIED', latencyMs: 8 },
      { vjId: 'VJ-4419', credential: 'ISO 27001', subjectId: 'TF-10476', issuer: 'GlobalCert Inc.', proofType: 'ZK-STARK', result: 'PENDING', latencyMs: null },
      { vjId: 'VJ-4418', credential: 'Employment', subjectId: 'TF-10455', issuer: 'CommBank HR', proofType: 'JWT-VC', result: 'REVOKED', latencyMs: 3 },
      { vjId: 'VJ-4417', credential: 'Accreditation', subjectId: 'TF-10450', issuer: 'AccredBody', proofType: 'ZK-STARK', result: 'VERIFIED', latencyMs: 14 },
      { vjId: 'VJ-4416', credential: 'PII Token', subjectId: 'TF-10448', issuer: 'Privacy Shield', proofType: 'BBS+', result: 'VERIFIED', latencyMs: 6 },
    ];

    await Promise.all(
      verificationData.map((d) => prisma.verification.create({
        data: { ...d, txHash: mockHash(), result: d.result as any, latencyMs: d.latencyMs || undefined },
      }))
    );

    const zkData = [
      { proofId: 'ZKP-2291', proofType: 'ZK-STARK', status: 'VALID', circuit: 'identity-membership-v2', publicInputs: 4, proofSizeKb: 62.0, latencyMs: 12 },
      { proofId: 'ZKP-2290', proofType: 'BBS+', status: 'VALID', circuit: 'selective-disclosure-v3', publicInputs: 2, proofSizeKb: 1.1, latencyMs: 4 },
      { proofId: 'ZKP-2289', proofType: 'ZK-STARK', status: 'INVALID', circuit: 'policy-compliance-v1', publicInputs: 6, proofSizeKb: 75.0, latencyMs: 18 },
      { proofId: 'ZKP-2288', proofType: 'JWT-VC', status: 'VALID', circuit: null, publicInputs: 1, proofSizeKb: 0.4, latencyMs: 2 },
    ];

    await Promise.all(
      zkData.map((d) => prisma.zkProof.create({ data: { ...d, verifiedAt: new Date(), status: d.status as any } }))
    );

    const auditData = [
      { aeId: 'AE-9921', eventType: 'DID_CREATED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10482', txHash: mockHash(), blockNumber: '18,293,410', status: 'Verified', identityId: identities[0].id },
      { aeId: 'AE-9920', eventType: 'VC_ISSUED', actor: 'Authority', actorDid: 'did:trustforge:auth...', target: 'VC-8821', txHash: mockHash(), blockNumber: '18,293,408', status: 'Verified', assetId: assets[0].id },
      { aeId: 'AE-9919', eventType: 'KEY_ROTATION', actor: 'HSM-Node-01', actorDid: 'did:trustforge:hsm...', target: 'TF-10478', txHash: mockHash(), blockNumber: '18,293,400', status: 'Active', identityId: identities[2].id },
      { aeId: 'AE-9918', eventType: 'POLICY_UPDATE', actor: 'Security Admin', actorDid: 'did:trustforge:3b1c...', target: 'Policy-004', txHash: mockHash(), blockNumber: '18,293,388', status: 'Verified', identityId: identities[1].id },
      { aeId: 'AE-9917', eventType: 'DID_REVOKED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10455', txHash: mockHash(), blockNumber: '18,293,350', status: 'Revoked', identityId: identities[4].id },
      { aeId: 'AE-9916', eventType: 'QUORUM_SIGNED', actor: 'Multi-Sig', actorDid: 'did:trustforge:msig...', target: 'QR-007', txHash: mockHash(), blockNumber: '18,293,300', status: 'Active' },
      { aeId: 'AE-9915', eventType: 'ZK_PROOF_VERIFIED', actor: 'Verifier', actorDid: 'did:trustforge:5f2b...', target: 'ZKP-2291', txHash: mockHash(), blockNumber: '18,293,250', status: 'Verified' },
      { aeId: 'AE-9914', eventType: 'VC_REVOKED', actor: 'Authority', actorDid: 'did:trustforge:auth...', target: 'VC-6610', txHash: mockHash(), blockNumber: '18,293,200', status: 'Revoked', assetId: assets[3].id },
      { aeId: 'AE-9913', eventType: 'DID_UPDATED', actor: 'Controller', actorDid: 'did:trustforge:7e4a...', target: 'TF-10480', txHash: mockHash(), blockNumber: '18,293,150', status: 'Active', identityId: identities[1].id },
      { aeId: 'AE-9912', eventType: 'ROLE_ASSIGNED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10448', txHash: mockHash(), blockNumber: '18,293,100', status: 'Active', identityId: identities[6].id },
    ];

    await Promise.all(
      auditData.map((d, i) => prisma.auditEvent.create({
        data: { ...d, identityId: d.identityId || null, assetId: d.assetId || null, createdAt: new Date(Date.now() - i * 15 * 60 * 1000) },
      }))
    );

    await prisma.quorumRequest.createMany({
      data: [
        { qrId: 'QR-007', action: 'Revoke Identity TF-10440', threshold: '2/3', signed: 1, requestor: 'Admin', expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), urgency: 'high' },
        { qrId: 'QR-006', action: 'Update Policy-008 Permissions', threshold: '3/5', signed: 2, requestor: 'Security Admin', expiresAt: new Date(Date.now() + 11 * 60 * 60 * 1000), urgency: 'medium' },
        { qrId: 'QR-005', action: 'Issue SOC2 Batch VC (x42)', threshold: '2/3', signed: 0, requestor: 'Auditor', expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), urgency: 'low' },
      ],
    });

    await prisma.incident.createMany({
      data: [
        { incidentId: 'INC-041', title: 'Credential Expiry Batch Alert', severity: 'Warning', count: '42 VCs', eta: '3 days', status: 'Pending' },
        { incidentId: 'INC-040', title: 'Multi-Sig Quorum Timeout Risk', severity: 'Critical', count: '2 requests', eta: '< 4h', status: 'Critical' },
        { incidentId: 'INC-039', title: 'Soft Key Usage Detected', severity: 'Warning', count: '682 keys', eta: 'Ongoing', status: 'Warning' },
      ],
    });

    await prisma.blockchainTransaction.createMany({
      data: assets.map((a: any) => ({
        txHash: a.txHash || mockHash(),
        blockNumber: a.blockNumber ? BigInt(a.blockNumber.replace(/,/g, '')) : BigInt(18293000),
        functionName: 'mintAsset',
        status: 'confirmed',
        data: { assetId: a.assetId, tokenId: a.tokenId },
      })).filter((t: any) => t.txHash),
    });

    console.log('✅ Auto-seed completed successfully!');
  } catch (err: any) {
    console.warn('⚠️ Auto-seed check or execution warning:', err?.message);
  }
}
