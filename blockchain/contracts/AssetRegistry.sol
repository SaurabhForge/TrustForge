// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IdentityRegistry.sol";

/**
 * @title AssetRegistry
 * @notice ERC-721 NFT contract for TrustForge digital asset management.
 * @dev Each token represents a unique digital asset (credential, certificate, etc.)
 * bound to a DID identity. Minting, allocation, transfer, and revocation are
 * gated by on-chain role checks. The DID of the owner is stored per token.
 * Metadata is stored on IPFS; only the CID/URI and hash are stored on-chain.
 */
contract AssetRegistry is ERC721, ERC721URIStorage, ERC721Pausable, AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IdentityRegistry public immutable identityRegistry;

    enum AssetStatus { VALID, PENDING, SUSPENDED, REVOKED, EXPIRED }

    struct Asset {
        string assetId;      // Application-level ID, e.g. "VC-8821"
        string ownerDid;     // DID of the current owner
        string issuerDid;    // DID of the issuing authority
        bytes32 metadataHash;// keccak256 of off-chain metadata JSON
        AssetStatus status;
        bool transferable;
        uint256 createdAt;
        uint256 updatedAt;
    }

    uint256 private _tokenIdCounter;

    // tokenId → Asset
    mapping(uint256 => Asset) private _assets;
    // assetId string → tokenId
    mapping(string => uint256) private _assetIdToTokenId;
    // did → tokenIds owned
    mapping(string => uint256[]) private _didToTokenIds;

    // Events
    event AssetCreated(uint256 indexed tokenId, string indexed assetId, string ownerDid, string issuerDid);
    event AssetMinted(uint256 indexed tokenId, string indexed assetId, address indexed to, string ownerDid);
    event AssetAllocated(uint256 indexed tokenId, string fromDid, string toDid, uint256 timestamp);
    event AssetTransferred(uint256 indexed tokenId, string fromDid, string toDid, uint256 timestamp);
    event AssetRevoked(uint256 indexed tokenId, string indexed assetId, address indexed revokedBy, uint256 timestamp);
    event MetadataUpdated(uint256 indexed tokenId, bytes32 newMetadataHash, string newTokenURI);

    constructor(address admin, address identityRegistryAddress)
        ERC721("TrustForge Asset", "TFASSET")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        identityRegistry = IdentityRegistry(identityRegistryAddress);
    }

    /**
     * @notice Mint a new asset NFT and bind it to a DID.
     * @param to Wallet address to receive the NFT
     * @param assetId Application-level asset identifier
     * @param ownerDid DID of the asset owner
     * @param issuerDid DID of the issuer
     * @param metadataHash keccak256 hash of the IPFS metadata JSON
     * @param uri IPFS URI to the metadata JSON
     * @param transferable Whether the asset can be transferred
     */
    function mintAsset(
        address to,
        string calldata assetId,
        string calldata ownerDid,
        string calldata issuerDid,
        bytes32 metadataHash,
        string calldata uri,
        bool transferable
    ) external whenNotPaused nonReentrant onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "Cannot mint to zero address");
        require(bytes(assetId).length > 0, "Asset ID required");
        require(_assetIdToTokenId[assetId] == 0, "Asset already minted");
        require(identityRegistry.isIdentityActive(ownerDid), "Owner DID not active");

        uint256 tokenId = ++_tokenIdCounter;

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        _assets[tokenId] = Asset({
            assetId: assetId,
            ownerDid: ownerDid,
            issuerDid: issuerDid,
            metadataHash: metadataHash,
            status: AssetStatus.VALID,
            transferable: transferable,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _assetIdToTokenId[assetId] = tokenId;
        _didToTokenIds[ownerDid].push(tokenId);

        emit AssetMinted(tokenId, assetId, to, ownerDid);
        emit AssetCreated(tokenId, assetId, ownerDid, issuerDid);
        return tokenId;
    }

    /**
     * @notice Transfer asset ownership to a new DID.
     * @dev Validates that recipient DID is active before executing transfer.
     */
    function transferAsset(
        uint256 tokenId,
        address to,
        string calldata newOwnerDid
    ) external whenNotPaused nonReentrant {
        require(ownerOf(tokenId) == msg.sender || hasRole(MANAGER_ROLE, msg.sender), "Not authorized");
        Asset storage asset = _assets[tokenId];
        require(asset.status == AssetStatus.VALID, "Asset is not valid");
        require(asset.transferable, "Asset is not transferable");
        require(identityRegistry.isIdentityActive(newOwnerDid), "Recipient DID not active");

        string memory fromDid = asset.ownerDid;
        asset.ownerDid = newOwnerDid;
        asset.updatedAt = block.timestamp;
        _didToTokenIds[newOwnerDid].push(tokenId);

        _transfer(ownerOf(tokenId), to, tokenId);

        emit AssetTransferred(tokenId, fromDid, newOwnerDid, block.timestamp);
    }

    /**
     * @notice Revoke (burn) an asset. Sets status to REVOKED.
     * @dev The NFT is NOT burned to preserve history; status is set to REVOKED.
     */
    function revokeAsset(uint256 tokenId) external whenNotPaused nonReentrant onlyRole(ADMIN_ROLE) {
        require(_assets[tokenId].status != AssetStatus.REVOKED, "Already revoked");

        _assets[tokenId].status = AssetStatus.REVOKED;
        _assets[tokenId].updatedAt = block.timestamp;
        _assets[tokenId].transferable = false;

        emit AssetRevoked(tokenId, _assets[tokenId].assetId, msg.sender, block.timestamp);
    }

    /**
     * @notice Resolve asset details by tokenId.
     */
    function resolveAsset(uint256 tokenId) external view returns (
        string memory assetId,
        string memory ownerDid,
        string memory issuerDid,
        bytes32 metadataHash,
        uint8 status,
        bool transferable,
        uint256 createdAt,
        uint256 updatedAt
    ) {
        Asset storage a = _assets[tokenId];
        return (a.assetId, a.ownerDid, a.issuerDid, a.metadataHash, uint8(a.status), a.transferable, a.createdAt, a.updatedAt);
    }

    /**
     * @notice Look up tokenId by application asset ID.
     */
    function getTokenIdByAssetId(string calldata assetId) external view returns (uint256) {
        return _assetIdToTokenId[assetId];
    }

    /**
     * @notice Check if an asset is currently valid.
     */
    function isAssetValid(uint256 tokenId) external view returns (bool) {
        return _assets[tokenId].status == AssetStatus.VALID;
    }

    /**
     * @notice Verify that the on-chain metadata hash matches a provided hash.
     */
    function verifyMetadataHash(uint256 tokenId, bytes32 expectedHash) external view returns (bool) {
        return _assets[tokenId].metadataHash == expectedHash;
    }

    /**
     * @notice Get all token IDs owned by a DID.
     */
    function getTokensByDid(string calldata did) external view returns (uint256[] memory) {
        return _didToTokenIds[did];
    }

    // Override required by Solidity
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Pausable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    // Admin: pause/unpause
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
