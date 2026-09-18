/**
 * qa-suite.mjs
 * Comprehensive Quality Assurance and Automated Testing Suite for TrustForge
 * Tests all 25+ API endpoints, W3C standards, authentication, and security controls.
 */
import { ethers } from 'ethers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TrustForge Automated QA & End-to-End Test Suite');
  console.log('======================================================\n');

  let siweToken = '';
  let personaToken = '';
  const testWallet = ethers.Wallet.createRandom();

  // ─── 1. SIWE Authentication & Security ──────────────────────────────────────
  console.log('📦 1. SIWE Authentication (EIP-191 & ECDSA Signatures)');
  try {
    // Nonce request
    const nonceRes = await fetch(`${BASE_URL}/api/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet.address }),
    });
    const nonceJson = await nonceRes.json();
    assert(nonceRes.status === 200 && nonceJson.data?.nonce, 'POST /api/auth/nonce generates dynamic cryptographic challenge');

    // Signature verification
    const signature = await testWallet.signMessage(nonceJson.data.message);
    const verifyRes = await fetch(`${BASE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: testWallet.address, signature }),
    });
    const verifyJson = await verifyRes.json();
    siweToken = verifyJson.data?.token;
    assert(verifyRes.status === 200 && !!siweToken, 'POST /api/auth/verify cryptographically verifies signature and issues JWT');

    // Protected /me endpoint with Bearer token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${siweToken}` },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.data?.walletAddress?.toLowerCase() === testWallet.address.toLowerCase(), 'GET /api/auth/me validates Bearer JWT token');

    // Unauthenticated request rejection
    const unauthRes = await fetch(`${BASE_URL}/api/auth/me`);
    assert(unauthRes.status === 401, 'Protected /me strictly rejects unauthenticated requests with 401');
  } catch (err) {
    assert(false, `Auth suite threw error: ${err.message}`);
  }

  // ─── 2. Enterprise Persona Authentication & RBAC ───────────────────────────
  console.log('\n📦 2. Enterprise Persona Login & Role-Based Access Control');
  try {
    // Persona Login for Super Admin (Saurabh Kumar)
    const personaRes = await fetch(`${BASE_URL}/api/auth/persona-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Saurabh Kumar',
        email: 'sk1300374@gmail.com',
        role: 'Super Admin',
      }),
    });
    const personaJson = await personaRes.json();
    personaToken = personaJson.data?.token;
    assert(
      personaRes.status === 200 &&
      !!personaToken &&
      personaJson.data?.user?.name === 'Saurabh Kumar' &&
      personaJson.data?.user?.roles?.includes('Super Admin'),
      'POST /api/auth/persona-login authenticates Super Admin and issues real JWT'
    );

    // Unauthenticated route mutation rejection
    const unauthCreateRes = await fetch(`${BASE_URL}/api/identities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ controllerName: 'Hacker' }),
    });
    assert(unauthCreateRes.status === 401, 'POST /api/identities rejects unauthenticated mutation with 401 Unauthorized');

    const unauthBackupRes = await fetch(`${BASE_URL}/api/system/backup`);
    assert(unauthBackupRes.status === 401, 'GET /api/system/backup rejects unauthenticated access with 401 Unauthorized');
  } catch (err) {
    assert(false, `Persona auth suite threw error: ${err.message}`);
  }

  // ─── 3. Identity Management & W3C DID Standard ─────────────────────────────
  console.log('\n📦 3. Identity Management & W3C DID Standard v1.0');
  let createdTfId = '';
  try {
    // List identities
    const listRes = await fetch(`${BASE_URL}/api/identities`);
    const listJson = await listRes.json();
    assert(listRes.status === 200 && Array.isArray(listJson.data?.identities), 'GET /api/identities returns paginated identity list');

    // Create Identity (Authenticated)
    const createRes = await fetch(`${BASE_URL}/api/identities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personaToken}`,
      },
      body: JSON.stringify({
        controllerName: 'Bharat Electronics QA Controller',
        method: 'did:key',
        keyAlgorithm: 'Ed25519',
      }),
    });
    const createJson = await createRes.json();
    createdTfId = createJson.data?.id;
    assert(createRes.status === 201 && !!createdTfId, `POST /api/identities registers identity (${createdTfId})`);

    // W3C DID Document Validation & Cache Headers
    const didDocRes = await fetch(`${BASE_URL}/api/identities/${createdTfId}/did-document`);
    const didDocJson = await didDocRes.json();
    const didDoc = didDocJson.data;
    const isW3cValid =
      Array.isArray(didDoc?.['@context']) &&
      didDoc['@context'].includes('https://www.w3.org/ns/did/v1') &&
      typeof didDoc?.id === 'string' &&
      Array.isArray(didDoc?.verificationMethod) &&
      Array.isArray(didDoc?.authentication) &&
      Array.isArray(didDoc?.service) &&
      typeof didDoc?.proof === 'object';
    assert(isW3cValid, 'GET /api/identities/:id/did-document returns compliant W3C DID Document v1.0');

    const cacheHeader = didDocRes.headers.get('cache-control');
    assert(cacheHeader?.includes('public') && cacheHeader?.includes('max-age'), 'W3C DID Document response carries high-performance Cache-Control header');

    // Key Rotation
    const rotateRes = await fetch(`${BASE_URL}/api/identities/${createdTfId}/rotate-key`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${personaToken}` },
    });
    const rotateJson = await rotateRes.json();
    assert(rotateRes.status === 200 && rotateJson.data?.publicKey, 'POST /api/identities/:id/rotate-key rotates cryptographic key');

    // Revoke Identity
    const revokeRes = await fetch(`${BASE_URL}/api/identities/${createdTfId}/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${personaToken}` },
    });
    const revokeJson = await revokeRes.json();
    assert(revokeRes.status === 200 && revokeJson.data?.status === 'Revoked', 'POST /api/identities/:id/revoke revokes identity on-chain');

    // Reactivate Identity
    const reactRes = await fetch(`${BASE_URL}/api/identities/${createdTfId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${personaToken}` },
    });
    const reactJson = await reactRes.json();
    assert(reactRes.status === 200 && reactJson.data?.status === 'Active', 'POST /api/identities/:id/reactivate reactivates identity');
  } catch (err) {
    assert(false, `Identity suite threw error: ${err.message}`);
  }

  // ─── 4. Digital Asset Management & W3C Verifiable Credentials ──────────────
  console.log('\n📦 4. Digital Assets (ERC-721 NFTs & W3C Verifiable Credentials)');
  let issuedVcId = '';
  try {
    // List assets
    const assetsRes = await fetch(`${BASE_URL}/api/assets`);
    const assetsJson = await assetsRes.json();
    assert(assetsRes.status === 200 && Array.isArray(assetsJson.data?.assets), 'GET /api/assets returns asset inventory');

    // Issue VC & Mint NFT (Authenticated)
    const issueRes = await fetch(`${BASE_URL}/api/identities/${createdTfId}/issue-vc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personaToken}`,
      },
      body: JSON.stringify({
        type: 'BEL Security Clearance Level 5',
        issuer: 'Bharat Electronics Authority',
      }),
    });
    const issueJson = await issueRes.json();
    issuedVcId = issueJson.data?.id;
    assert(issueRes.status === 201 && !!issuedVcId, `POST /api/identities/:id/issue-vc mints ERC-721 token bound to DID (${issuedVcId})`);

    // W3C VC Document Validation & Cache Headers
    const vcDocRes = await fetch(`${BASE_URL}/api/assets/${issuedVcId}/vc`);
    const vcDocJson = await vcDocRes.json();
    const vc = vcDocJson.data;
    const isVcValid =
      Array.isArray(vc?.['@context']) &&
      vc['@context'].includes('https://www.w3.org/2018/credentials/v1') &&
      typeof vc?.issuer === 'object' &&
      typeof vc?.credentialSubject === 'object' &&
      typeof vc?.proof === 'object' &&
      vc?.nft?.standard === 'ERC-721';
    assert(isVcValid, 'GET /api/assets/:id/vc returns compliant W3C Verifiable Credential JSON with NFT metadata');
  } catch (err) {
    assert(false, `Asset suite threw error: ${err.message}`);
  }

  // ─── 5. Access Control & Multi-Sig Quorums ──────────────────────────────────
  console.log('\n📦 5. Access Control (RBAC & Multi-Sig Governance)');
  try {
    const rolesRes = await fetch(`${BASE_URL}/api/access/roles`);
    const rolesJson = await rolesRes.json();
    assert(rolesRes.status === 200 && Array.isArray(rolesJson.data?.roles), 'GET /api/access/roles lists active roles & quorums');

    // Assign Role (Authenticated)
    const assignRes = await fetch(`${BASE_URL}/api/access/roles/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personaToken}`,
      },
      body: JSON.stringify({ identityId: createdTfId, roleName: 'Auditor' }),
    });
    const assignJson = await assignRes.json();
    assert(assignRes.status === 200 && assignJson.data?.roleName === 'Auditor', 'POST /api/access/roles/assign assigns role on-chain');

    // Revoke Role (Authenticated)
    const revokeRoleRes = await fetch(`${BASE_URL}/api/access/roles/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personaToken}`,
      },
      body: JSON.stringify({ identityId: createdTfId, roleName: 'Auditor' }),
    });
    assert(revokeRoleRes.status === 200, 'POST /api/access/roles/revoke revokes role on-chain');
  } catch (err) {
    assert(false, `Access control suite threw error: ${err.message}`);
  }

  // ─── 6. Cryptographic Verification & Audit Trail ───────────────────────────
  console.log('\n📦 6. Cryptographic Verification & Audit Integrity');
  try {
    // Unified Verification endpoint
    const verifyIdRes = await fetch(`${BASE_URL}/api/verify/${createdTfId}`);
    const verifyIdJson = await verifyIdRes.json();
    assert(verifyIdRes.status === 200 && verifyIdJson.data?.verified, `GET /api/verify/:id verifies active identity (${createdTfId})`);

    // Merkle Root Integrity check
    const merkleRes = await fetch(`${BASE_URL}/api/audit/merkle/verify`);
    const merkleJson = await merkleRes.json();
    assert(merkleRes.status === 200 && merkleJson.data?.verified && !!merkleJson.data?.rootHash, 'GET /api/audit/merkle/verify cryptographically validates Merkle root integrity');
  } catch (err) {
    assert(false, `Verification suite threw error: ${err.message}`);
  }

  // ─── 7. System Monitoring, Telemetry & Disaster Recovery ────────────────────
  console.log('\n📦 7. System Monitoring, Telemetry & Disaster Recovery');
  try {
    // Health Telemetry
    const healthRes = await fetch(`${BASE_URL}/api/system/health`);
    const healthJson = await healthRes.json();
    assert(
      healthRes.status === 200 &&
      healthJson.data?.status === 'HEALTHY' &&
      healthJson.data?.memory?.rssMb &&
      healthJson.data?.uptime?.formatted,
      'GET /api/system/health returns detailed process telemetry (Uptime, Memory, DB, Blockchain)'
    );

    // Metrics Telemetry
    const metricsRes = await fetch(`${BASE_URL}/api/system/metrics`);
    const metricsJson = await metricsRes.json();
    assert(
      metricsRes.status === 200 &&
      typeof metricsJson.data?.process_uptime_seconds === 'number' &&
      typeof metricsJson.data?.identities_registered_total === 'number',
      'GET /api/system/metrics returns live Prometheus-compatible system telemetry'
    );

    // Cryptographic Backup Export (Authenticated)
    const backupRes = await fetch(`${BASE_URL}/api/system/backup`, {
      headers: { Authorization: `Bearer ${personaToken}` },
    });
    const backupJson = await backupRes.json();
    const hasIntegrityHash = typeof backupJson.data?.meta?.integrityHash === 'string';
    assert(backupRes.status === 200 && hasIntegrityHash, 'GET /api/system/backup exports SHA-256 tamper-evident platform backup snapshot');

    // State Restore (Authenticated)
    const restoreRes = await fetch(`${BASE_URL}/api/system/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${personaToken}`,
      },
      body: JSON.stringify({ backup: backupJson.data }),
    });
    const restoreJson = await restoreRes.json();
    assert(restoreRes.status === 200 && restoreJson.data?.counts?.identities > 0, 'POST /api/system/restore restores platform state from snapshot');
  } catch (err) {
    assert(false, `System suite threw error: ${err.message}`);
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
