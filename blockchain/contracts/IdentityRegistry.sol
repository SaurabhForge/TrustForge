// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IdentityRegistry
 * @notice Manages Decentralized Identifiers (DIDs) on-chain for TrustForge.
 * @dev Each DID maps to a controller wallet address. Identities can be
 * created, updated, revoked, and reactivated by authorized parties.
 * This contract is the authoritative on-chain source of truth for DID state.
 */
contract IdentityRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum IdentityStatus { ACTIVE, PENDING, SUSPENDED, REVOKED }

    struct Identity {
        string did;
        address controller;
        bytes32 publicKeyHash;   // keccak256 of the public key bytes
        string metadataUri;      // IPFS CID or URI for off-chain DID document
        IdentityStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    // did string → Identity
    mapping(string => Identity) private _identities;
    // controller address → did
    mapping(address => string) private _controllerToDid;
    // Total identity count
    uint256 private _identityCount;

    // Events
    event IdentityCreated(string indexed did, address indexed controller, bytes32 publicKeyHash, uint256 timestamp);
    event IdentityUpdated(string indexed did, address indexed controller, string metadataUri, uint256 timestamp);
    event IdentityRevoked(string indexed did, address indexed revokedBy, uint256 timestamp);
    event IdentityReactivated(string indexed did, address indexed reactivatedBy, uint256 timestamp);
    event IdentityVerified(string indexed did, address indexed verifiedBy, bool valid, uint256 timestamp);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    modifier onlyController(string calldata did) {
        require(_identities[did].exists, "Identity does not exist");
        require(
            _identities[did].controller == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized: not controller or admin"
        );
        _;
    }

    modifier identityExists(string calldata did) {
        require(_identities[did].exists, "Identity does not exist");
        _;
    }

    /**
     * @notice Create a new DID identity on-chain.
     * @param did The DID string (e.g. "did:trustforge:9a2f...")
     * @param controller The wallet address that controls this DID
     * @param publicKeyHash keccak256 hash of the controller's public key
     * @param metadataUri IPFS CID or URI pointing to the DID document
     */
    function createIdentity(
        string calldata did,
        address controller,
        bytes32 publicKeyHash,
        string calldata metadataUri
    ) external whenNotPaused nonReentrant onlyRole(MANAGER_ROLE) {
        require(bytes(did).length > 0, "DID cannot be empty");
        require(controller != address(0), "Invalid controller address");
        require(!_identities[did].exists, "DID already registered");
        require(bytes(_controllerToDid[controller]).length == 0, "Controller already has a DID");

        _identities[did] = Identity({
            did: did,
            controller: controller,
            publicKeyHash: publicKeyHash,
            metadataUri: metadataUri,
            status: IdentityStatus.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });
        _controllerToDid[controller] = did;
        _identityCount++;

        emit IdentityCreated(did, controller, publicKeyHash, block.timestamp);
    }

    /**
     * @notice Update the metadata URI of an identity (e.g., rotate keys off-chain).
     */
    function updateIdentity(
        string calldata did,
        string calldata newMetadataUri
    ) external whenNotPaused nonReentrant onlyController(did) {
        Identity storage identity = _identities[did];
        require(identity.status == IdentityStatus.ACTIVE, "Identity is not active");

        identity.metadataUri = newMetadataUri;
        identity.updatedAt = block.timestamp;

        emit IdentityUpdated(did, identity.controller, newMetadataUri, block.timestamp);
    }

    /**
     * @notice Revoke an identity. Only admin or the controller can revoke.
     */
    function revokeIdentity(
        string calldata did
    ) external whenNotPaused nonReentrant identityExists(did) {
        require(
            _identities[did].controller == msg.sender || hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        require(_identities[did].status != IdentityStatus.REVOKED, "Already revoked");

        _identities[did].status = IdentityStatus.REVOKED;
        _identities[did].updatedAt = block.timestamp;

        emit IdentityRevoked(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Reactivate a previously revoked or suspended identity.
     */
    function reactivateIdentity(
        string calldata did
    ) external whenNotPaused nonReentrant onlyRole(ADMIN_ROLE) identityExists(did) {
        require(_identities[did].status != IdentityStatus.ACTIVE, "Already active");

        _identities[did].status = IdentityStatus.ACTIVE;
        _identities[did].updatedAt = block.timestamp;

        emit IdentityReactivated(did, msg.sender, block.timestamp);
    }

    /**
     * @notice Resolve a DID to its on-chain identity record.
     */
    function resolveIdentity(string calldata did) external view returns (
        address controller,
        bytes32 publicKeyHash,
        string memory metadataUri,
        uint8 status,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Identity storage identity = _identities[did];
        require(identity.exists, "Identity not found");
        return (
            identity.controller,
            identity.publicKeyHash,
            identity.metadataUri,
            uint8(identity.status),
            identity.createdAt,
            identity.updatedAt
        );
    }

    /**
     * @notice Verify if a DID is currently active.
     */
    function isIdentityActive(string calldata did) external view returns (bool) {
        return _identities[did].exists && _identities[did].status == IdentityStatus.ACTIVE;
    }

    /**
     * @notice Get the DID for a given controller address.
     */
    function getDidByController(address controller) external view returns (string memory) {
        return _controllerToDid[controller];
    }

    /**
     * @notice Get total identity count.
     */
    function identityCount() external view returns (uint256) {
        return _identityCount;
    }

    // Admin: pause/unpause
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
