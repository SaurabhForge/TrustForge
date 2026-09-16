# TrustForge API Documentation

**Version**: 1.0.0  
**Production Base URL**: `https://trustforge-backend-wpib.onrender.com/api`  
**Development Base URL**: `http://localhost:3001/api`  
**Live Frontend Web App**: `https://trustforge-frontend-bk6d.onrender.com`  
**Health Check**: `https://trustforge-backend-wpib.onrender.com/health`  
**Standard Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error format:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error description"
  }
}
```

---

## 1. Authentication (`/api/auth`)

### 1.1 Request Nonce
- **Method**: `POST`
- **Endpoint**: `/api/auth/nonce`
- **Rate Limit**: 20 requests per 15 minutes
- **Body**:
  ```json
  {
    "address": "0x71C67Ed3E436214B4501D89d8929007f35A8820B"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "nonce": "a4f89d...",
      "message": "TrustForge Enterprise Identity Platform\n\nSign this message to authenticate...",
      "expiresAt": "2026-09-14T00:05:00.000Z"
    }
  }
  ```

### 1.2 Verify Signature & Obtain Session Token
- **Method**: `POST`
- **Endpoint**: `/api/auth/verify`
- **Body**:
  ```json
  {
    "address": "0x71C67Ed3E436214B4501D89d8929007f35A8820B",
    "signature": "0x..."
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "uuid",
        "walletAddress": "0x71C6...",
        "identity": {
          "id": "uuid",
          "tfId": "TF-10482",
          "did": "did:trustforge:...",
          "status": "ACTIVE",
          "roles": ["ADMIN"]
        }
      }
    }
  }
  ```

### 1.3 Current User Info
- **Method**: `GET`
- **Endpoint**: `/api/auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `200 OK`

---

## 2. Dashboard (`/api/dashboard`)

### 2.1 Operational Overview
- **Method**: `GET`
- **Endpoint**: `/api/dashboard/overview`
- **Description**: Returns 4 key KPI metric cards, latest 10 recent activity stream events, real-time node health statuses, and anchor block status. Matches frontend `Overview.jsx` expectations.

### 2.2 Security Operations
- **Method**: `GET`
- **Endpoint**: `/api/dashboard/security`
- **Description**: Returns 6-column security telemetry metrics, real-time audit stream, active incidents, and consensus node health. Matches frontend `SecurityDashboard.jsx`.

---

## 3. Decentralized Identities (`/api/identities`)

### 3.1 List Identities
- **Method**: `GET`
- **Endpoint**: `/api/identities`
- **Query Params**:
  - `page`: Page number (default: `1`)
  - `limit`: Items per page (default: `20`)
  - `status`: Filter by status (`ALL`, `ACTIVE`, `PENDING`, `REVOKED`)
  - `search`: Search controller, DID, or TF-ID
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "identities": [
        {
          "id": "TF-10482",
          "did": "did:trustforge:9a2f3b1c...",
          "controller": "Saurabh Kumar",
          "method": "did:key",
          "keyType": "Ed25519",
          "credentials": 4,
          "status": "Active",
          "lastSeen": "2m ago",
          "created": "2026-08-15",
          "complianceScore": 98
        }
      ],
      "stats": {
        "total": 14892,
        "active": 14210,
        "pending": 482,
        "revoked": 200
      },
      "pagination": { "page": 1, "limit": 20, "total": 14892 }
    }
  }
  ```

### 3.2 Create Identity (DID)
- **Method**: `POST`
- **Endpoint**: `/api/identities`
- **Body**:
  ```json
  {
    "controllerName": "Saurabh Kumar",
    "method": "did:key",
    "keyAlgorithm": "Ed25519",
    "services": "https://example.com/vc"
  }
  ```

### 3.3 Get Identity Details
- **Method**: `GET`
- **Endpoint**: `/api/identities/:id`
- **Description**: Returns complete DID Document, public keys, credentials list, and historical audit entries.

### 3.4 Revoke Identity
- **Method**: `POST`
- **Endpoint**: `/api/identities/:id/revoke`
- **Description**: Updates identity status to `REVOKED` and logs an immutable audit event.

### 3.5 Reactivate Identity
- **Method**: `POST`
- **Endpoint**: `/api/identities/:id/reactivate`

---

## 4. Access Control & RBAC (`/api/access`)

### 4.1 Get Roles & Quorums
- **Method**: `GET`
- **Endpoint**: `/api/access/roles`
- **Response**: Returns list of enterprise roles (`Super Admin`, `Security Admin`, `Auditor`, `Developer`, `Verifier`, `Read-Only`) and multi-sig quorum requests.

### 4.2 Assign Role
- **Method**: `POST`
- **Endpoint**: `/api/access/roles/assign`
- **Body**: `{ "identityId": "TF-10482", "roleName": "ADMIN" }`

---

## 5. Digital Assets & Credentials (`/api/assets`)

### 5.1 List Assets
- **Method**: `GET`
- **Endpoint**: `/api/assets`
- **Query Params**: `page`, `limit`, `status`, `search`

### 5.2 Create Asset
- **Method**: `POST`
- **Endpoint**: `/api/assets`
- **Body**:
  ```json
  {
    "name": "SOC2 Type II Credential",
    "assetType": "CERTIFICATE",
    "proofType": "ZK-STARK",
    "transferable": true
  }
  ```

### 5.3 Mint Asset (ERC-721 Anchor)
- **Method**: `POST`
- **Endpoint**: `/api/assets/:id/mint`
- **Description**: Mints asset on-chain to the contract, assigns unique `tokenId`, registers txHash.

### 5.4 Transfer Asset Ownership
- **Method**: `POST`
- **Endpoint**: `/api/assets/:id/transfer`
- **Body**: `{ "recipientDid": "did:trustforge:newOwner..." }`

### 5.5 Revoke Asset
- **Method**: `POST`
- **Endpoint**: `/api/assets/:id/revoke`

---

## 6. Cryptographic Verification Center (`/api/verifications`)

### 6.1 List Verification Jobs & ZK Proofs
- **Method**: `GET`
- **Endpoint**: `/api/verifications`
- **Response**: Returns verification jobs (`VJ-4421`...), active ZK-STARK circuits, success rates, and verification metrics.

### 6.2 Submit Verification Job
- **Method**: `POST`
- **Endpoint**: `/api/verifications`
- **Body**:
  ```json
  {
    "credential": "SOC2 Type II",
    "subjectId": "TF-10482",
    "proofType": "ZK-STARK"
  }
  ```

### 6.3 Unified Verification Lookup
- **Method**: `GET`
- **Endpoint**: `/api/verify/:identifier`
- **Description**: Direct resolution and verification of any DID (`did:trustforge:...`), TF ID (`TF-10482`), or Asset ID (`VC-8821`).

---

## 7. Audit Trail (`/api/audit`)

### 7.1 Query Immutable Audit Log
- **Method**: `GET`
- **Endpoint**: `/api/audit`
- **Query Params**:
  - `type`: Event filter (`DID_CREATED`, `VC_ISSUED`, `KEY_ROTATION`, etc.)
  - `search`: Full text search on actor, target, or hash
  - `page`, `limit`: Pagination parameters
