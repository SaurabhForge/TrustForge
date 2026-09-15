import crypto from 'crypto';

function mockHash() {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

function mockBlock() {
  return (18290000 + Math.floor(Math.random() * 10000)).toLocaleString();
}

export interface InMemoryDb {
  users: any[];
  sessions: any[];
  identities: any[];
  roles: any[];
  identityRoles: any[];
  permissions: any[];
  rolePermissions: any[];
  assets: any[];
  assetOwnerships: any[];
  verifications: any[];
  zkProofs: any[];
  auditEvents: any[];
  blockchainTransactions: any[];
  quorumRequests: any[];
  incidents: any[];
}

export function createInitialData(): InMemoryDb {
  const roles = [
    { id: 'role-1', name: 'ADMIN', displayName: 'Super Admin', color: 'bg-red-100 text-red-800', createdAt: new Date() },
    { id: 'role-2', name: 'SECURITY_ADMIN', displayName: 'Security Admin', color: 'bg-primary/10 text-primary', createdAt: new Date() },
    { id: 'role-3', name: 'AUDITOR', displayName: 'Auditor', color: 'bg-secondary/10 text-secondary', createdAt: new Date() },
    { id: 'role-4', name: 'DEVELOPER', displayName: 'Developer', color: 'bg-emerald-100 text-emerald-800', createdAt: new Date() },
    { id: 'role-5', name: 'VERIFIER', displayName: 'Verifier', color: 'bg-amber-100 text-amber-800', createdAt: new Date() },
    { id: 'role-6', name: 'USER', displayName: 'Read-Only', color: 'bg-surface-container-high text-on-surface-variant', createdAt: new Date() },
  ];

  const permissions = [
    { id: 'perm-1', code: 'IDENTITY_CREATE', description: 'Create decentralized identities', createdAt: new Date() },
    { id: 'perm-2', code: 'IDENTITY_UPDATE', description: 'Update identity documents', createdAt: new Date() },
    { id: 'perm-3', code: 'IDENTITY_REVOKE', description: 'Revoke identities', createdAt: new Date() },
    { id: 'perm-4', code: 'IDENTITY_VERIFY', description: 'Verify identity status', createdAt: new Date() },
    { id: 'perm-5', code: 'ROLE_ASSIGN', description: 'Assign roles to identities', createdAt: new Date() },
    { id: 'perm-6', code: 'ROLE_REVOKE', description: 'Revoke roles from identities', createdAt: new Date() },
    { id: 'perm-7', code: 'ASSET_CREATE', description: 'Create digital assets', createdAt: new Date() },
    { id: 'perm-8', code: 'ASSET_MINT', description: 'Mint assets as NFTs', createdAt: new Date() },
    { id: 'perm-9', code: 'ASSET_ALLOCATE', description: 'Allocate assets to identities', createdAt: new Date() },
    { id: 'perm-10', code: 'ASSET_TRANSFER', description: 'Transfer asset ownership', createdAt: new Date() },
    { id: 'perm-11', code: 'ASSET_REVOKE', description: 'Revoke/burn assets', createdAt: new Date() },
    { id: 'perm-12', code: 'ASSET_VERIFY', description: 'Verify asset authenticity', createdAt: new Date() },
    { id: 'perm-13', code: 'AUDIT_VIEW', description: 'View audit trail', createdAt: new Date() },
    { id: 'perm-14', code: 'POLICY_MANAGE', description: 'Manage access policies', createdAt: new Date() },
  ];

  const rolePermissions: any[] = [];
  permissions.forEach(p => {
    rolePermissions.push({ id: `rp-admin-${p.id}`, roleId: roles[0].id, permissionId: p.id });
    if (!['ROLE_ASSIGN', 'ROLE_REVOKE'].includes(p.code)) {
      rolePermissions.push({ id: `rp-sec-${p.id}`, roleId: roles[1].id, permissionId: p.id });
    }
    if (['AUDIT_VIEW', 'IDENTITY_VERIFY', 'ASSET_VERIFY'].includes(p.code)) {
      rolePermissions.push({ id: `rp-aud-${p.id}`, roleId: roles[2].id, permissionId: p.id });
      rolePermissions.push({ id: `rp-ver-${p.id}`, roleId: roles[4].id, permissionId: p.id });
    }
    if (p.code === 'AUDIT_VIEW') {
      rolePermissions.push({ id: `rp-usr-${p.id}`, roleId: roles[5].id, permissionId: p.id });
    }
  });

  const identities = [
    { id: 'id-1', tfId: 'TF-10482', did: 'did:trustforge:9a2f3b1c7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b', controllerName: 'Saurabh Kumar', method: 'did:key', keyType: 'Ed25519', status: 'ACTIVE', complianceScore: 98, txHash: '0x82ac3f4d1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3e6c', blockNumber: '18,293,410', publicKey: 'z6Mkf5rGMoaL6PKkMkMuR4mM9TmNDd8R1g5NJyNFyVaqr2Qb', createdAt: new Date('2026-08-15T09:22:11Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 2 * 60 * 1000) },
    { id: 'id-2', tfId: 'TF-10480', did: 'did:trustforge:3b1c7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a', controllerName: 'Marcus Vance', method: 'did:ion', keyType: 'secp256k1', status: 'ACTIVE', complianceScore: 95, txHash: mockHash(), blockNumber: '18,293,400', publicKey: '0x03a1...7fbc', createdAt: new Date('2026-07-22T10:00:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 8 * 60 * 1000) },
    { id: 'id-3', tfId: 'TF-10478', did: 'did:trustforge:7e4a2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c', controllerName: 'HSM-Node-01', method: 'did:web', keyType: 'P-256', status: 'ACTIVE', complianceScore: 100, txHash: mockHash(), blockNumber: '18,293,380', publicKey: '0x04b2...99ef', createdAt: new Date('2026-06-10T14:30:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 15 * 60 * 1000) },
    { id: 'id-4', tfId: 'TF-10476', did: 'did:trustforge:2d8f5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a', controllerName: 'Priya Menon', method: 'did:key', keyType: 'Ed25519', status: 'PENDING', complianceScore: 72, txHash: mockHash(), blockNumber: '18,293,350', publicKey: 'z6Mkp...88cc', createdAt: new Date('2026-09-01T11:15:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 60 * 60 * 1000) },
    { id: 'id-5', tfId: 'TF-10455', did: 'did:trustforge:5c9e1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f', controllerName: 'Legacy System', method: 'did:ethr', keyType: 'secp256k1', status: 'REVOKED', complianceScore: 10, txHash: mockHash(), blockNumber: '18,293,300', publicKey: '0x02ff...11aa', createdAt: new Date('2025-12-01T08:00:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { id: 'id-6', tfId: 'TF-10450', did: 'did:trustforge:1a4b8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e', controllerName: 'Dao Li', method: 'did:ion', keyType: 'P-384', status: 'ACTIVE', complianceScore: 91, txHash: mockHash(), blockNumber: '18,293,250', publicKey: '0x04cc...22dd', createdAt: new Date('2026-05-18T16:45:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { id: 'id-7', tfId: 'TF-10448', did: 'did:trustforge:8d3c6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e1a4b', controllerName: 'Jamie Osei', method: 'did:key', keyType: 'Ed25519', status: 'ACTIVE', complianceScore: 88, txHash: mockHash(), blockNumber: '18,293,200', publicKey: 'z6Mkq...44bb', createdAt: new Date('2026-04-02T13:20:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { id: 'id-8', tfId: 'TF-10440', did: 'did:trustforge:6f2a9c5d1e7b4f2a3b1c7e4a2d8f5c9e1a4b8d3c', controllerName: 'Sys Validator', method: 'did:web', keyType: 'P-256', status: 'PENDING', complianceScore: 60, txHash: mockHash(), blockNumber: '18,293,150', publicKey: '0x04ee...55ff', createdAt: new Date('2026-09-10T09:00:00Z'), updatedAt: new Date(), lastSeenAt: new Date(Date.now() - 48 * 60 * 60 * 1000) },
  ];

  const identityRoles = [
    { id: 'ir-1', identityId: 'id-1', roleId: 'role-1', grantedAt: new Date() },
    { id: 'ir-2', identityId: 'id-2', roleId: 'role-2', grantedAt: new Date() },
    { id: 'ir-3', identityId: 'id-3', roleId: 'role-3', grantedAt: new Date() },
    { id: 'ir-4', identityId: 'id-4', roleId: 'role-4', grantedAt: new Date() },
    { id: 'ir-5', identityId: 'id-6', roleId: 'role-5', grantedAt: new Date() },
    { id: 'ir-6', identityId: 'id-7', roleId: 'role-6', grantedAt: new Date() },
  ];

  const assets = [
    { id: 'asset-1', assetId: 'VC-8821', name: 'SOC2 Type II', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:authority', ownerDid: identities[0].did, status: 'VALID', tokenId: '1042', txHash: mockHash(), blockNumber: '18,293,408', proofType: 'ZK-STARK', transferable: true, createdAt: new Date('2026-08-20T10:00:00Z'), expiresAt: new Date('2027-08-20T10:00:00Z'), ownerIdentityId: 'id-1', issuerIdentityId: 'id-1' },
    { id: 'asset-2', assetId: 'VC-8820', name: 'ISO 27001', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:globalcert', ownerDid: identities[0].did, status: 'VALID', tokenId: '1043', txHash: mockHash(), blockNumber: '18,293,390', proofType: 'ZK-STARK', transferable: true, createdAt: new Date('2026-07-01T10:00:00Z'), expiresAt: new Date('2027-07-01T10:00:00Z'), ownerIdentityId: 'id-1', issuerIdentityId: 'id-1' },
    { id: 'asset-3', assetId: 'VC-7741', name: 'KYC Verified', assetType: 'DIGITAL_CREDENTIAL', issuerDid: 'did:trustforge:idverify', ownerDid: identities[0].did, status: 'VALID', tokenId: '1044', txHash: mockHash(), blockNumber: '18,293,350', proofType: 'BBS+', transferable: true, createdAt: new Date('2026-06-15T10:00:00Z'), expiresAt: new Date('2027-06-15T10:00:00Z'), ownerIdentityId: 'id-1', issuerIdentityId: 'id-1' },
    { id: 'asset-4', assetId: 'VC-6610', name: 'Employment Credential', assetType: 'DIGITAL_CREDENTIAL', issuerDid: 'did:trustforge:commbank-hr', ownerDid: identities[4].did, status: 'REVOKED', tokenId: '1045', txHash: mockHash(), blockNumber: '18,293,200', proofType: 'JWT-VC', transferable: true, createdAt: new Date('2025-01-01T10:00:00Z'), expiresAt: new Date('2026-01-01T10:00:00Z'), ownerIdentityId: 'id-5', issuerIdentityId: 'id-1' },
    { id: 'asset-5', assetId: 'VC-8819', name: 'Accreditation', assetType: 'CERTIFICATE', issuerDid: 'did:trustforge:accredbody', ownerDid: identities[5].did, status: 'VALID', tokenId: '1046', txHash: mockHash(), blockNumber: '18,293,150', proofType: 'ZK-STARK', transferable: true, createdAt: new Date('2026-05-20T10:00:00Z'), expiresAt: new Date('2027-05-20T10:00:00Z'), ownerIdentityId: 'id-6', issuerIdentityId: 'id-1' },
    { id: 'asset-6', assetId: 'VC-8818', name: 'PII Token', assetType: 'ACCESS_BADGE', issuerDid: 'did:trustforge:privacy-shield', ownerDid: identities[6].did, status: 'VALID', tokenId: '1047', txHash: mockHash(), blockNumber: '18,293,100', proofType: 'BBS+', transferable: false, createdAt: new Date('2026-04-10T10:00:00Z'), expiresAt: new Date('2027-04-10T10:00:00Z'), ownerIdentityId: 'id-7', issuerIdentityId: 'id-1' },
    { id: 'asset-7', assetId: 'VC-8817', name: 'Software License', assetType: 'SOFTWARE_LICENSE', issuerDid: 'did:trustforge:admin', ownerDid: identities[1].did, status: 'VALID', tokenId: '1048', txHash: mockHash(), blockNumber: '18,293,050', proofType: 'JWT-VC', transferable: true, createdAt: new Date('2026-07-25T10:00:00Z'), expiresAt: new Date('2027-07-25T10:00:00Z'), ownerIdentityId: 'id-2', issuerIdentityId: 'id-1' },
    { id: 'asset-8', assetId: 'VC-8816', name: 'Training Certificate', assetType: 'TRAINING_RECORD', issuerDid: 'did:trustforge:admin', ownerDid: identities[2].did, status: 'VALID', tokenId: '1049', txHash: mockHash(), blockNumber: '18,293,000', proofType: 'ZK-STARK', transferable: true, createdAt: new Date('2026-06-15T10:00:00Z'), expiresAt: new Date('2027-06-15T10:00:00Z'), ownerIdentityId: 'id-3', issuerIdentityId: 'id-1' },
  ];

  const assetOwnerships: any[] = [];
  assets.forEach(a => {
    assetOwnerships.push({
      id: `ao-${a.id}`,
      assetId: a.id,
      ownerDid: a.ownerDid,
      txHash: a.txHash,
      blockNumber: a.blockNumber,
      transferredAt: a.createdAt,
    });
  });

  const verifications = [
    { id: 'v-1', vjId: 'VJ-4421', credential: 'SOC2 Type II', subjectId: 'TF-10482', issuer: 'TrustForge Authority', proofType: 'ZK-STARK', result: 'VERIFIED', latencyMs: 11, txHash: '0x91bc3344af82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3e6c88dd12ef44af', identityId: 'id-1', assetId: 'asset-1', createdAt: new Date() },
    { id: 'v-2', vjId: 'VJ-4420', credential: 'KYC Verified', subjectId: 'TF-10480', issuer: 'ID Verify Pro', proofType: 'BBS+', result: 'VERIFIED', latencyMs: 8, txHash: mockHash(), identityId: 'id-2', assetId: 'asset-3', createdAt: new Date(Date.now() - 2 * 60 * 1000) },
    { id: 'v-3', vjId: 'VJ-4419', credential: 'ISO 27001', subjectId: 'TF-10476', issuer: 'GlobalCert Inc.', proofType: 'ZK-STARK', result: 'PENDING', latencyMs: null, txHash: null, identityId: 'id-4', assetId: 'asset-2', createdAt: new Date(Date.now() - 5 * 60 * 1000) },
    { id: 'v-4', vjId: 'VJ-4418', credential: 'Employment', subjectId: 'TF-10455', issuer: 'CommBank HR', proofType: 'JWT-VC', result: 'REVOKED', latencyMs: 3, txHash: mockHash(), identityId: 'id-5', assetId: 'asset-4', createdAt: new Date(Date.now() - 41 * 60 * 1000) },
    { id: 'v-5', vjId: 'VJ-4417', credential: 'Accreditation', subjectId: 'TF-10450', issuer: 'AccredBody', proofType: 'ZK-STARK', result: 'VERIFIED', latencyMs: 14, txHash: mockHash(), identityId: 'id-6', assetId: 'asset-5', createdAt: new Date(Date.now() - 60 * 60 * 1000) },
    { id: 'v-6', vjId: 'VJ-4416', credential: 'PII Token', subjectId: 'TF-10448', issuer: 'Privacy Shield', proofType: 'BBS+', result: 'VERIFIED', latencyMs: 6, txHash: mockHash(), identityId: 'id-7', assetId: 'asset-6', createdAt: new Date(Date.now() - 120 * 60 * 1000) },
  ];

  const zkProofs = [
    { id: 'zk-1', proofId: 'ZKP-2291', proofType: 'ZK-STARK', status: 'VALID', circuit: 'identity-membership-v2', publicInputs: 4, proofSizeKb: 62.0, latencyMs: 12, generatedAt: new Date(Date.now() - 2 * 60 * 1000), verifiedAt: new Date(Date.now() - 1 * 60 * 1000) },
    { id: 'zk-2', proofId: 'ZKP-2290', proofType: 'BBS+', status: 'VALID', circuit: 'selective-disclosure-v3', publicInputs: 2, proofSizeKb: 1.1, latencyMs: 4, generatedAt: new Date(Date.now() - 9 * 60 * 1000), verifiedAt: new Date(Date.now() - 9 * 60 * 1000) },
    { id: 'zk-3', proofId: 'ZKP-2289', proofType: 'ZK-STARK', status: 'INVALID', circuit: 'policy-compliance-v1', publicInputs: 6, proofSizeKb: 75.0, latencyMs: 18, generatedAt: new Date(Date.now() - 20 * 60 * 1000), verifiedAt: new Date(Date.now() - 19 * 60 * 1000) },
    { id: 'zk-4', proofId: 'ZKP-2288', proofType: 'JWT-VC', status: 'VALID', circuit: null, publicInputs: 1, proofSizeKb: 0.4, latencyMs: 2, generatedAt: new Date(Date.now() - 50 * 60 * 1000), verifiedAt: new Date(Date.now() - 50 * 60 * 1000) },
  ];

  const auditEvents = [
    { id: 'ae-1', aeId: 'AE-9921', eventType: 'DID_CREATED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10482', txHash: '0x82ac3f4d1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3e6c', blockNumber: '18,293,410', status: 'Verified', identityId: 'id-1', createdAt: new Date(Date.now() - 2 * 60 * 1000) },
    { id: 'ae-2', aeId: 'AE-9920', eventType: 'VC_ISSUED', actor: 'Authority', actorDid: 'did:trustforge:auth...', target: 'VC-8821', txHash: '0x55bc3344af82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0', blockNumber: '18,293,408', status: 'Verified', assetId: 'asset-1', createdAt: new Date(Date.now() - 8 * 60 * 1000) },
    { id: 'ae-3', aeId: 'AE-9919', eventType: 'KEY_ROTATION', actor: 'HSM-Node-01', actorDid: 'did:trustforge:hsm...', target: 'TF-10478', txHash: '0x91de4478bc82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0', blockNumber: '18,293,400', status: 'Active', identityId: 'id-3', createdAt: new Date(Date.now() - 15 * 60 * 1000) },
    { id: 'ae-4', aeId: 'AE-9918', eventType: 'POLICY_UPDATE', actor: 'Security Admin', actorDid: 'did:trustforge:3b1c...', target: 'Policy-004', txHash: '0x12fc33ab82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,388', status: 'Verified', identityId: 'id-2', createdAt: new Date(Date.now() - 22 * 60 * 1000) },
    { id: 'ae-5', aeId: 'AE-9917', eventType: 'DID_REVOKED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10455', txHash: '0x55aa91bc82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,350', status: 'Revoked', identityId: 'id-5', createdAt: new Date(Date.now() - 41 * 60 * 1000) },
    { id: 'ae-6', aeId: 'AE-9916', eventType: 'QUORUM_SIGNED', actor: 'Multi-Sig', actorDid: 'did:trustforge:msig...', target: 'QR-007', txHash: '0x88dd12ef82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,300', status: 'Active', createdAt: new Date(Date.now() - 60 * 60 * 1000) },
    { id: 'ae-7', aeId: 'AE-9915', eventType: 'ZK_PROOF_VERIFIED', actor: 'Verifier', actorDid: 'did:trustforge:5f2b...', target: 'ZKP-2291', txHash: '0x39cc56bd82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,250', status: 'Verified', createdAt: new Date(Date.now() - 120 * 60 * 1000) },
    { id: 'ae-8', aeId: 'AE-9914', eventType: 'VC_REVOKED', actor: 'Authority', actorDid: 'did:trustforge:auth...', target: 'VC-6610', txHash: '0x22ab44de82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,200', status: 'Revoked', assetId: 'asset-4', createdAt: new Date(Date.now() - 180 * 60 * 1000) },
    { id: 'ae-9', aeId: 'AE-9913', eventType: 'DID_UPDATED', actor: 'Controller', actorDid: 'did:trustforge:7e4a...', target: 'TF-10480', txHash: '0x11bc55cd82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,150', status: 'Active', identityId: 'id-2', createdAt: new Date(Date.now() - 240 * 60 * 1000) },
    { id: 'ae-10', aeId: 'AE-9912', eventType: 'ROLE_ASSIGNED', actor: 'Admin', actorDid: 'did:trustforge:9a2f...', target: 'TF-10448', txHash: '0x66ef78ab82a1b9c2e5a7f8d0e3c1b4a9f2d5e8c1a4b7f0d3', blockNumber: '18,293,100', status: 'Active', identityId: 'id-7', createdAt: new Date(Date.now() - 300 * 60 * 1000) },
  ];

  const quorumRequests = [
    { id: 'qr-1', qrId: 'QR-007', action: 'Revoke Identity TF-10440', threshold: '2/3', signed: 1, requestor: 'Admin', expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000), urgency: 'high', status: 'Pending', createdAt: new Date() },
    { id: 'qr-2', qrId: 'QR-006', action: 'Update Policy-008 Permissions', threshold: '3/5', signed: 2, requestor: 'Security Admin', expiresAt: new Date(Date.now() + 11 * 60 * 60 * 1000), urgency: 'medium', status: 'Pending', createdAt: new Date() },
    { id: 'qr-3', qrId: 'QR-005', action: 'Issue SOC2 Batch VC (x42)', threshold: '2/3', signed: 0, requestor: 'Auditor', expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000), urgency: 'low', status: 'Pending', createdAt: new Date() },
  ];

  const incidents = [
    { id: 'inc-1', incidentId: 'INC-041', title: 'Credential Expiry Batch Alert', severity: 'Warning', count: '42 VCs', eta: '3 days', status: 'Pending', createdAt: new Date() },
    { id: 'inc-2', incidentId: 'INC-040', title: 'Multi-Sig Quorum Timeout Risk', severity: 'Critical', count: '2 requests', eta: '< 4h', status: 'Critical', createdAt: new Date() },
    { id: 'inc-3', incidentId: 'INC-039', title: 'Soft Key Usage Detected', severity: 'Warning', count: '682 keys', eta: 'Ongoing', status: 'Warning', createdAt: new Date() },
  ];

  const blockchainTransactions = assets.map((a, i) => ({
    id: `tx-${i}`,
    txHash: a.txHash || mockHash(),
    blockNumber: BigInt(18294105 - i * 10),
    functionName: 'mintAsset',
    status: 'confirmed',
    data: { assetId: a.assetId, tokenId: a.tokenId },
    createdAt: new Date(),
  }));

  return {
    users: [],
    sessions: [],
    identities,
    roles,
    identityRoles,
    permissions,
    rolePermissions,
    assets,
    assetOwnerships,
    verifications,
    zkProofs,
    auditEvents,
    blockchainTransactions,
    quorumRequests,
    incidents,
  };
}

export const db: InMemoryDb = createInitialData();
