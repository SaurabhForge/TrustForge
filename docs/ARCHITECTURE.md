# TrustForge System Architecture

**Project**: TrustForge Enterprise Identity Platform  
**Hackathon Problem Statement**: SIH26125 — "Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management"

---

## 1. High-Level Architectural Overview

TrustForge is an enterprise-grade identity, access control, and digital asset management platform engineered with a strict separation of concerns between cryptographic verification, on-chain state anchoring, and high-performance operational caching.

```
+-------------------------------------------------------------------------+
|                       TrustForge Frontend (React 19)                    |
|  - Operational Overview Dashboard      - Verifiable Credentials Center   |
|  - W3C DID Registry Management         - Security Ops & Live Telemetry   |
|  - Role-Based Access Control (RBAC)    - Immutable Audit Log Ledger      |
+------------------------------------+------------------------------------+
                                     |
                          REST API / JSON-RPC
                                     |
+------------------------------------v------------------------------------+
|                   TrustForge Backend Core (Node.js/Express)             |
|  +---------------------------+  +-------------------------------------+  |
|  | Auth & Session Service    |  | DID Lifecycle & Metadata Service    |  |
|  | - EIP-191 Nonce Challenge |  | - W3C DID Document Normalization    |  |
|  | - JWT Session Tokens      |  | - Key Rotation & Proof Generation   |  |
|  +---------------------------+  +-------------------------------------+  |
|  +---------------------------+  +-------------------------------------+  |
|  | Access Control & RBAC     |  | Digital Asset & NFT Engine          |  |
|  | - Granular Permission Map |  | - Off-chain Metadata Hashing (SHA256) |
|  | - Multi-Sig Quorum Logic  |  | - ERC-721 Token Allocation          |  |
|  +---------------------------+  +-------------------------------------+  |
|  +---------------------------+  +-------------------------------------+  |
|  | Verification Engine       |  | Cryptographic Audit Ledger Engine  |  |
|  | - ZK-STARK & BBS+ Proofs  |  | - Tamper-evident Audit Events       |  |
|  | - Unified Resolver API    |  | - Block & Tx Hash Cross-indexing    |  |
|  +---------------------------+  +-------------------------------------+  |
+-------------------+--------------------------------+--------------------+
                    |                                |
        Prisma ORM |                     ethers.js | JSON-RPC
                    v                                v
+-------------------+---------+    +-----------------+--------------------+
|      PostgreSQL Database    |    |       Ethereum / Sepolia L1          |
|  - Fast search & pagination |    |  - IdentityRegistry.sol              |
|  - High-throughput queries  |    |  - AccessControlManager.sol          |
|  - Nonces & Session Store   |    |  - AssetRegistry.sol (ERC-721 + DID) |
|  - Relational Integrity     |    |  - Immutable Anchor & Proof State    |
+-----------------------------+    +--------------------------------------+
```

---

## 2. Core Architectural Principles

### 2.1 The Two-Tier Data Hierarchy
- **Tier 1 — Authoritative Decentralized Anchor (Blockchain)**:
  - Cryptographic DID existence and controller binding.
  - Active / Revoked / Suspended state.
  - ERC-721 NFT asset ownership, minting, transfer, and revocation.
  - Verification circuit root hashes and metadata checksums (`keccak256`).
- **Tier 2 — High-Performance Relational Index (PostgreSQL)**:
  - Sub-millisecond dashboard queries and aggregates.
  - Multi-condition full-text filtering, search, and pagination.
  - Audit trail event metadata, user nonces, and session tokens.
  - Cached replicas of on-chain states to eliminate RPC bottleneck.

### 2.2 Decentralized Identifiers (DID)
- Formats supported: `did:key`, `did:ion`, `did:web`, `did:ethr`, and internal `did:trustforge:<hash>`.
- W3C v1.0 standard representation:
  - `@context`: `["https://www.w3.org/ns/did/v1"]`
  - `id`: Fully qualified DID string.
  - `verificationMethod`: Cryptographic key definitions (Ed25519, secp256k1, P-256).
  - `authentication`: References to verification methods authorized for login.

### 2.3 Off-Chain Metadata & Content Addressing
- To minimize on-chain gas costs while ensuring zero-tamper security:
  - Complete JSON metadata files are saved with canonical ordering.
  - The `keccak256` or `SHA-256` digest is committed to the smart contract at minting time.
  - IPFS content identifiers (`Qm...`) provide resilient off-chain availability.
  - The contract's `verifyMetadataHash(tokenId, computedHash)` method confirms data integrity.

---

## 3. Smart Contract Architecture

The smart contracts reside in `blockchain/contracts/` and are built on OpenZeppelin Contracts v5:

```
                  +--------------------------------+
                  |      IdentityRegistry.sol      |
                  |  - AccessControl (OpenZeppelin)|
                  |  - Pausable & ReentrancyGuard  |
                  |  - createIdentity()            |
                  |  - revokeIdentity()            |
                  |  - resolveIdentity()           |
                  +---------------+----------------+
                                  |
                                  | references & validates
                                  v
+---------------------------------+--------------------------------+
|       AssetRegistry.sol         |   AccessControlManager.sol     |
|  - ERC721URIStorage             |  - Role definitions per DID    |
|  - Bound to active DIDs         |  - Multi-sig threshold quorum  |
|  - mintAsset() -> checks DID    |  - hasDidRole()                |
|  - revokeAsset() -> locks token |  - grantDidRole()              |
+---------------------------------+--------------------------------+
```

### 3.1 `IdentityRegistry.sol`
- Maintains `mapping(string => Identity) private _identities` (keyed by DID string).
- Validates controllers, public key hashes, and metadata URIs.
- Enforces role requirements: `MANAGER_ROLE` for registration; `ADMIN_ROLE` or identity controller for revocation.

### 3.2 `AssetRegistry.sol`
- ERC-721 token representing digital assets, verifiable credentials, or licenses.
- **DID-Binding**: Requires `identityRegistry.isIdentityActive(ownerDid)` before allowing a mint.
- Token revocation transitions state to `REVOKED` without burning token history, retaining non-repudiable audit records.

### 3.3 `AccessControlManager.sol`
- Provides on-chain role checks mapped to specific DIDs.
- Decouples user permission verification from smart contract address keys.

---

## 4. Backend Service Modules

Located in `backend/src/modules/`:
- `auth`: Cryptographic nonce generation (single use, 5 min TTL) and EIP-191 signature recovery.
- `identity`: W3C DID registration, document resolution, revocation, and compliance scoring.
- `assets`: Digital asset lifecycle management, minting orchestration, and ownership transfer.
- `access`: Role-based access control with pre-seeded role permissions and multi-sig quorum management.
- `verification`: Zero-knowledge proof job dispatch (ZK-STARK, BBS+) and unified identifier resolution.
- `audit`: Append-only, tamper-evident audit event recording.
- `dashboard`: Real-time aggregated statistics for the frontend overview and security consoles.

---

## 5. Security & Verification Guarantees

1. **Deterministic Verification**: Verifications do not trust external state; they verify cryptographic signatures against registered public keys.
2. **Reentrancy Protection**: All state-modifying contract functions use OpenZeppelin `ReentrancyGuard`.
3. **Emergency Circuit Breakers**: Contracts inherit OpenZeppelin `Pausable` for immediate incident response.
4. **Zero-Trust Role Enforcement**: Backend validates permissions on every request using JWT identity claims matched against PostgreSQL and on-chain roles.
