// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IdentityRegistry.sol";

/**
 * @title AccessControlManager
 * @notice Manages on-chain role assignments tied to DID identities.
 * @dev Roles are tracked per DID and enforced independently from OpenZeppelin
 * role-based access control. Smart contract role enforcement is the security
 * boundary; backend RBAC is a convenience layer only.
 */
contract AccessControlManager is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IdentityRegistry public immutable identityRegistry;

    // Defined roles
    bytes32 public constant DID_ROLE_ADMIN = keccak256("DID_ROLE_ADMIN");
    bytes32 public constant DID_ROLE_SECURITY_ADMIN = keccak256("DID_ROLE_SECURITY_ADMIN");
    bytes32 public constant DID_ROLE_AUDITOR = keccak256("DID_ROLE_AUDITOR");
    bytes32 public constant DID_ROLE_DEVELOPER = keccak256("DID_ROLE_DEVELOPER");
    bytes32 public constant DID_ROLE_VERIFIER = keccak256("DID_ROLE_VERIFIER");
    bytes32 public constant DID_ROLE_USER = keccak256("DID_ROLE_USER");

    // did → role → bool
    mapping(string => mapping(bytes32 => bool)) private _didRoles;
    // did → list of roles assigned
    mapping(string => bytes32[]) private _didRoleList;

    event RoleGranted(string indexed did, bytes32 indexed role, address indexed grantedBy, uint256 timestamp);
    event RoleRevoked(string indexed did, bytes32 indexed role, address indexed revokedBy, uint256 timestamp);

    constructor(address admin, address identityRegistryAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        identityRegistry = IdentityRegistry(identityRegistryAddress);
    }

    /**
     * @notice Grant a role to a DID identity.
     * @dev The DID must be registered and active in the IdentityRegistry.
     */
    function grantDidRole(
        string calldata did,
        bytes32 role
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(identityRegistry.isIdentityActive(did), "Identity not active");
        require(!_didRoles[did][role], "Role already granted");

        _didRoles[did][role] = true;
        _didRoleList[did].push(role);

        emit RoleGranted(did, role, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a role from a DID identity.
     */
    function revokeDidRole(
        string calldata did,
        bytes32 role
    ) external onlyRole(ADMIN_ROLE) whenNotPaused {
        require(_didRoles[did][role], "Role not assigned");
        _didRoles[did][role] = false;

        emit RoleRevoked(did, role, msg.sender, block.timestamp);
    }

    /**
     * @notice Check if a DID has a specific role.
     */
    function hasDidRole(string calldata did, bytes32 role) external view returns (bool) {
        return _didRoles[did][role];
    }

    /**
     * @notice Check if a DID has admin role.
     */
    function isAdmin(string calldata did) external view returns (bool) {
        return _didRoles[did][DID_ROLE_ADMIN];
    }

    /**
     * @notice Check if a DID has auditor role.
     */
    function isAuditor(string calldata did) external view returns (bool) {
        return _didRoles[did][DID_ROLE_AUDITOR];
    }

    // Admin: pause/unpause
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }
}
