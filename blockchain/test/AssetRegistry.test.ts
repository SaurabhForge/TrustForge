import { expect } from 'chai';
import { ethers } from 'hardhat';
import { AssetRegistry, IdentityRegistry } from '../typechain-types';

describe('AssetRegistry', () => {
  let identityRegistry: IdentityRegistry;
  let assetRegistry: AssetRegistry;
  let admin: any, minter: any, user: any, user2: any;
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE'));
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  const ownerDid = 'did:trustforge:assetowner001';
  const recipientDid = 'did:trustforge:recipient001';

  beforeEach(async () => {
    [admin, minter, user, user2] = await ethers.getSigners();

    const IdentityRegistryFactory = await ethers.getContractFactory('IdentityRegistry');
    identityRegistry = await IdentityRegistryFactory.deploy(admin.address);
    await identityRegistry.grantRole(MANAGER_ROLE, admin.address);

    // Register test identities
    const pk = ethers.keccak256(ethers.toUtf8Bytes('pubkey'));
    await identityRegistry.createIdentity(ownerDid, user.address, pk, '');
    await identityRegistry.createIdentity(recipientDid, user2.address, pk, '');

    const AssetRegistryFactory = await ethers.getContractFactory('AssetRegistry');
    assetRegistry = await AssetRegistryFactory.deploy(admin.address, await identityRegistry.getAddress());
    await assetRegistry.grantRole(MINTER_ROLE, minter.address);
  });

  describe('mintAsset', () => {
    it('should mint an asset and bind to DID', async () => {
      const tokenId = await assetRegistry.connect(minter).mintAsset.staticCall(
        user.address, 'VC-TEST-001', ownerDid, 'did:trustforge:issuer', ethers.ZeroHash, 'ipfs://Qm', true
      );
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-TEST-001', ownerDid, 'did:trustforge:issuer', ethers.ZeroHash, 'ipfs://Qm', true
      );
      expect(await assetRegistry.ownerOf(tokenId)).to.equal(user.address);
      const resolved = await assetRegistry.resolveAsset(tokenId);
      expect(resolved.assetId).to.equal('VC-TEST-001');
      expect(resolved.ownerDid).to.equal(ownerDid);
      expect(resolved.status).to.equal(0); // VALID
    });

    it('should reject minting to inactive DID', async () => {
      await identityRegistry.revokeIdentity(ownerDid);
      await expect(
        assetRegistry.connect(minter).mintAsset(
          user.address, 'VC-FAIL', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
        )
      ).to.be.revertedWith('Owner DID not active');
    });

    it('should reject duplicate asset ID', async () => {
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-DUP', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
      );
      await expect(
        assetRegistry.connect(minter).mintAsset(
          user.address, 'VC-DUP', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
        )
      ).to.be.revertedWith('Asset already minted');
    });

    it('should reject minting by non-minter', async () => {
      await expect(
        assetRegistry.connect(user).mintAsset(
          user.address, 'VC-AUTH', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
        )
      ).to.be.reverted;
    });
  });

  describe('revokeAsset', () => {
    it('should revoke an asset and prevent further transfers', async () => {
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-REVOKE', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
      );
      const tokenId = await assetRegistry.getTokenIdByAssetId('VC-REVOKE');
      await assetRegistry.connect(admin).revokeAsset(tokenId);

      const resolved = await assetRegistry.resolveAsset(tokenId);
      expect(resolved.status).to.equal(3); // REVOKED
      expect(await assetRegistry.isAssetValid(tokenId)).to.be.false;
    });

    it('should reject double revocation', async () => {
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-DREV', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
      );
      const tokenId = await assetRegistry.getTokenIdByAssetId('VC-DREV');
      await assetRegistry.connect(admin).revokeAsset(tokenId);
      await expect(assetRegistry.connect(admin).revokeAsset(tokenId)).to.be.revertedWith('Already revoked');
    });

    it('should reject revocation by non-admin', async () => {
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-NOTADM', ownerDid, 'did:issuer', ethers.ZeroHash, '', true
      );
      const tokenId = await assetRegistry.getTokenIdByAssetId('VC-NOTADM');
      await expect(assetRegistry.connect(user).revokeAsset(tokenId)).to.be.reverted;
    });
  });

  describe('verifyMetadataHash', () => {
    it('should return true for matching hash', async () => {
      const hash = ethers.keccak256(ethers.toUtf8Bytes('metadata'));
      await assetRegistry.connect(minter).mintAsset(
        user.address, 'VC-HASH', ownerDid, 'did:issuer', hash, '', true
      );
      const tokenId = await assetRegistry.getTokenIdByAssetId('VC-HASH');
      expect(await assetRegistry.verifyMetadataHash(tokenId, hash)).to.be.true;
    });
  });
});
