# TrustForge — Enterprise Blockchain Identity & Asset Management Platform

[![Smart India Hackathon 2026](https://img.shields.io/badge/SIH2026-Problem%20Statement%20SIH26125-blue.svg)](https://www.sih.gov.in/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.27-363636.svg)](https://soliditylang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Contracts%20v5-4e5ee4.svg)](https://openzeppelin.com/)

TrustForge is a high-assurance, enterprise-grade decentralized identity (DID), role-based access control (RBAC), and digital asset management platform engineered specifically for **Smart India Hackathon 2026 Problem Statement SIH26125** — *"Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management."*

---

## 🏛️ Platform Architecture

TrustForge implements a production-grade **two-tier architecture**:
1. **Authoritative On-Chain Anchor (Ethereum / Sepolia / Hardhat Localnet)**:
   - W3C DID Lifecycle Management (`IdentityRegistry.sol`)
   - DID-Bound Non-Fungible Digital Credentials (`AssetRegistry.sol` - ERC-721)
   - On-chain Granular Role-Based Access Control (`AccessControlManager.sol`)
   - Tamper-Evident Off-Chain Metadata Hash Verification (`keccak256`)
2. **High-Throughput Operational API Layer (Node.js + Express + Prisma + PostgreSQL)**:
   - Wallet-signature Authentication (EIP-191 Challenge-Response + Nonce)
   - Sub-millisecond Dashboard & Telemetry Aggregations
   - Zero-Knowledge (ZK-STARK / BBS+) Proof Verification Orchestration
   - Immutable Append-Only Audit Trail Cross-Indexed with On-Chain Hashes

```
                    +-----------------------------+
                    |   TrustForge Frontend UI    |
                    |      (React 19 + Vite)      |
                    |    http://localhost:5173    |
                    +--------------+--------------+
                                   |
                             REST / JSON-RPC
                                   |
                    +--------------v--------------+
                    |   TrustForge Backend API    |
                    |    (Node.js + TypeScript)   |
                    |    http://localhost:3001    |
                    +-------+-------------+-------+
                            |             |
                Prisma ORM |             | ethers.js (RPC)
                            v             v
             +--------------+---+     +---+-------------------------+
             | PostgreSQL DB    |     | EVM Smart Contracts         |
             | - Fast Queries   |     | - IdentityRegistry.sol      |
             | - Nonce Store    |     | - AssetRegistry.sol (ERC721)|
             | - Audit Index    |     | - AccessControlManager.sol  |
             +------------------+     +-----------------------------+
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18 or v20+
- **PostgreSQL**: Running locally on port `5432` (or via Docker)
- **PowerShell / Terminal**

> [!NOTE]
> On Windows PowerShell with restricted execution policy, prefix npm and npx commands with `cmd /c "..."`.

---

### Step 1: Start the Local Blockchain Node & Deploy Contracts

Open a terminal in the project root:

```bash
cd blockchain
npx hardhat node
```

In a separate terminal, deploy the smart contracts to the local network:

```bash
cd blockchain
npx hardhat run scripts/deploy.ts --network localhost
```

Run contract tests (18 tests verifying all DID & ERC-721 rules):

```bash
cd blockchain
npx hardhat test
```

---

### Step 2: Configure & Start the Backend API

1. Navigate to `backend`:
   ```bash
   cd backend
   ```
2. Copy `.env.example` to `.env` (already configured with default local settings):
   ```bash
   cp .env.example .env
   ```
3. Update `DATABASE_URL` in `.env` if your PostgreSQL username/password differ:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trustforge?schema=public"
   ```
4. Push the Prisma database schema and generate the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```
5. Seed the database with realistic enterprise test data:
   ```bash
   npx ts-node prisma/seed.ts
   ```
6. Start the backend development server (runs on `http://localhost:3001`):
   ```bash
   npm run dev
   ```

---

### Step 3: Run the Frontend Console

1. Navigate to the frontend directory:
   ```bash
   cd trustforge
   ```
2. Start the Vite development server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```
3. Open your browser at:
   - **Overview Dashboard**: [http://localhost:5173/overview](http://localhost:5173/overview)
   - **Identity Management**: [http://localhost:5173/identity-management](http://localhost:5173/identity-management)
   - **Access Control Matrix**: [http://localhost:5173/access-control](http://localhost:5173/access-control)
   - **Verification Center**: [http://localhost:5173/verification-center](http://localhost:5173/verification-center)
   - **Security Operations**: [http://localhost:5173/security-dashboard](http://localhost:5173/security-dashboard)
   - **Audit Trail**: [http://localhost:5173/audit-trail](http://localhost:5173/audit-trail)
   - **Settings**: [http://localhost:5173/settings](http://localhost:5173/settings)

---

## ☁️ Cloud Deployment (Render & AWS Amplify)

TrustForge is pre-configured with **Infrastructure-as-Code** for rapid multi-cloud deployment:

- **Render (Full-Stack Blueprint)**: Provisions PostgreSQL database, Express API Web Service, and Vite SPA via `render.yaml`. See [Render Deployment Guide](docs/RENDER_DEPLOYMENT.md).
- **AWS Amplify Hosting (Global Edge CDN)**: Global CloudFront edge deployment for the frontend application with CI/CD from GitHub. See [AWS Amplify Deployment Guide](docs/AWS_AMPLIFY_DEPLOYMENT.md).

---

## 🔒 Security & Cryptographic Guarantees

- **No Passwords**: Web3 wallet authentication via EIP-191 challenge-response.
- **W3C DID v1.0 Compliance**: Supports `did:key`, `did:ion`, `did:web`, and `did:ethr`.
- **Zero-Knowledge Ready**: ZK-STARK proof verification circuits and BBS+ selective disclosure.
- **Tamper-Evident**: Off-chain metadata hashes stored on-chain; any modification invalidates verification.
- **OpenZeppelin Standard**: Full reentrancy protection and emergency pausable contracts.

For deep technical specifications, review:
- [System Architecture](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API.md)
- [Security Threat Model](docs/SECURITY.md)

---

## 👥 Contributors & Hackathon Team

- **Platform Lead**: Saurabh Kumar
- **Hackathon**: Smart India Hackathon 2026 (SIH26125)
- **Status**: Production-Ready Prototype
