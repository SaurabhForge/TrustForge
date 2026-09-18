// =============================================================================
// TrustForge Enterprise — Cedar Authorization Policies
// AWS Open-Source Cedar Policy Specification v3
// Matches Hackathon Track: "Auth and policy: Cedar (Build it) / Cognito (Ship it)"
// =============================================================================

// Policy 1: Super Admin has unconditional authorization across all identities and assets
permit (
    principal in TrustForge::Role::"ADMIN",
    action,
    resource
);

// Policy 2: Security Admins can rotate cryptographic keys, update security policies, and sign multi-sig quorums
permit (
    principal in TrustForge::Role::"SECURITY_ADMIN",
    action in [
        TrustForge::Action::"rotateKey",
        TrustForge::Action::"updatePolicy",
        TrustForge::Action::"signQuorum",
        TrustForge::Action::"viewSecurityDashboard"
    ],
    resource
);

// Policy 3: Auditors have read-only access to the append-only audit trail and integrity proofs
permit (
    principal in TrustForge::Role::"AUDITOR",
    action in [
        TrustForge::Action::"viewAuditTrail",
        TrustForge::Action::"verifyIntegrity",
        TrustForge::Action::"exportAuditLog"
    ],
    resource
);

// Policy 4: Authorized Verifiers can execute cryptographic credential and ZK-STARK proof validations
permit (
    principal in TrustForge::Role::"VERIFIER",
    action in [
        TrustForge::Action::"verifyCredential",
        TrustForge::Action::"verifyZkProof",
        TrustForge::Action::"verifyBbsPlus"
    ],
    resource
);

// Policy 5: Standard Users can view their own credentials and assets
permit (
    principal,
    action in [
        TrustForge::Action::"readOwnIdentity",
        TrustForge::Action::"readOwnAssets"
    ],
    resource
)
when {
    resource.ownerDid == principal.did
};

// Policy 6: Strict Guardrail — Revoked or suspended identities are FORBIDDEN from performing any mutating actions
forbid (
    principal,
    action in [
        TrustForge::Action::"mintAsset",
        TrustForge::Action::"transferAsset",
        TrustForge::Action::"rotateKey",
        TrustForge::Action::"signQuorum"
    ],
    resource
)
when {
    principal.status in ["REVOKED", "SUSPENDED"]
};
