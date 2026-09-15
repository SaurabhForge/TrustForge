# TrustForge Security Architecture & Threat Model

**Standard Compliance**: SIH26125 Security Directives, W3C DID Core 1.0, ERC-721 Standard, NIST Zero Trust Architecture (SP 800-207)

---

## 1. Threat Modeling & Mitigations

| Threat | Vector | TrustForge Defense |
|---|---|---|
| **Signature Replay Attack** | Intercepting signed wallet messages and replaying them to gain unauthorized sessions | **EIP-191 Structured Challenge + Ephemeral Nonce**: Every authentication challenge includes a cryptographically random 16-byte nonce, exact issued timestamp, and 5-minute strict expiration. Nonces are single-use (`update { nonce: '' }`). |
| **Unauthorized DID Revocation** | Malicious party attempting to revoke competitor or system credentials | **Dual-Gate Authorization**: On-chain, only the verified `controller` address OR the multisig `ADMIN_ROLE` can invoke `revokeIdentity()`. In the backend API, callers must hold authenticated session credentials. |
| **Tampered Asset Metadata** | Attacker modifying credential attributes (e.g. grade, certification status) in off-chain storage | **Cryptographic Metadata Hash Anchoring**: The `keccak256` digest of off-chain metadata is committed during `mintAsset()` on the blockchain. Any tampering breaks hash validation (`verifyMetadataHash`). |
| **Reentrancy Attacks** | Recursive calls during asset minting or transfer | **OpenZeppelin ReentrancyGuard**: All state-modifying smart contract methods employ the `nonReentrant` modifier with the Checks-Effects-Interactions pattern. |
| **Privilege Escalation** | Low-privilege users attempting admin actions (e.g. role modification) | **Multi-Tier RBAC**: Backend middleware `requireRole('ADMIN')` verifies database permissions; smart contracts require OpenZeppelin `DEFAULT_ADMIN_ROLE`. |
| **Smart Contract Compromise** | Discovered vulnerability in contract logic | **Emergency Pausable**: `Pausable` allows `ADMIN_ROLE` to freeze state transitions instantly via `pause()` while remediation takes place. |
| **API Denial of Service (DoS)** | Brute force or nonce request flooding | **Express Rate Limiting**: Sensitive endpoints (`/api/auth/nonce`, `/api/auth/verify`) are capped at 20 requests per 15-minute window per IP. |
| **Data Breach / Token Forgery** | Attacker crafting artificial authorization tokens | **HMAC-SHA256 JWT Signed with 256-bit Secret**: Secrets configured via environment variables; expiration enforced at 24 hours. |

---

## 2. Cryptographic Specifications

- **Key Algorithms Supported**:
  - `Ed25519` (Edwards-curve Digital Signature Algorithm) — high-speed attestations.
  - `secp256k1` (Koblitz Curve) — native EVM compatibility and wallet signatures.
  - `NIST P-256` / `P-384` — HSM (Hardware Security Module) and enterprise compliance.
- **Hashing**: `SHA-256` for application level digest; `keccak256` for Ethereum EVM validation.
- **Proofs**: ZK-STARK non-interactive zero knowledge membership proofs and BBS+ selective disclosure signatures.

---

## 3. Incident Response & Key Rotation

1. **Compromised Key Rotation**:
   - Identity controllers submit a `KEY_ROTATION` request signed by their current active key.
   - The contract updates the stored `publicKeyHash` and increments the identity version number.
   - An immutable event is emitted to the ledger.
2. **Emergency Revocation**:
   - If a private key is exposed, an emergency revocation transaction is dispatched to `IdentityRegistry.sol`.
   - Once revoked, the identity is rejected immediately across all dependent verifiable credential checks and asset minting functions.
3. **Multi-Sig Governance**:
   - High-severity operations (revocation of system validator DIDs, policy permission matrix updates) require a threshold quorum (e.g., 2 of 3 or 3 of 5 signatures).

---

## 4. Operational Hardening Guidelines

- Never commit private keys, `.env` files, or database credentials to version control.
- In production, set `CORS_ORIGIN` strictly to the production frontend domain.
- Enforce SSL/TLS for all API and RPC communications.
- Store sensitive controller keys in HSMs or secure enclaves.
