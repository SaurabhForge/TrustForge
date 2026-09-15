import { expect } from 'chai';
import { ethers } from 'hardhat';
import { IdentityRegistry } from '../typechain-types';

describe('IdentityRegistry', () => {
  let registry: IdentityRegistry;
  let admin: any, manager: any, user: any;
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE'));

  beforeEach(async () => {
    [admin, manager, user] = await ethers.getSigners();
    const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry');
    registry = await IdentityRegistry.deploy(admin.address);
    await registry.grantRole(MANAGER_ROLE, manager.address);
  });

  describe('createIdentity', () => {
    it('should create an identity with correct fields', async () => {
      const did = 'did:trustforge:test001';
      const publicKeyHash = ethers.keccak256(ethers.toUtf8Bytes('test-pubkey'));
      await registry.connect(manager).createIdentity(did, user.address, publicKeyHash, 'ipfs://QmTest');

      const resolved = await registry.resolveIdentity(did);
      expect(resolved.controller).to.equal(user.address);
      expect(resolved.publicKeyHash).to.equal(publicKeyHash);
      expect(resolved.status).to.equal(0); // ACTIVE
    });

    it('should reject duplicate DID', async () => {
      const did = 'did:trustforge:dup001';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      await expect(
        registry.connect(manager).createIdentity(did, manager.address, pk, '')
      ).to.be.revertedWith('DID already registered');
    });

    it('should reject if not manager', async () => {
      await expect(
        registry.connect(user).createIdentity('did:trustforge:x', user.address, ethers.ZeroHash, '')
      ).to.be.reverted;
    });
  });

  describe('revokeIdentity', () => {
    it('should revoke an identity as admin', async () => {
      const did = 'did:trustforge:revoke001';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      await registry.connect(admin).revokeIdentity(did);

      const resolved = await registry.resolveIdentity(did);
      expect(resolved.status).to.equal(3); // REVOKED
    });

    it('should allow controller to revoke own identity', async () => {
      const did = 'did:trustforge:selfrevoke';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      await registry.connect(user).revokeIdentity(did);

      expect(await registry.isIdentityActive(did)).to.be.false;
    });

    it('should reject revocation by unauthorized party', async () => {
      const did = 'did:trustforge:authz001';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      await expect(
        registry.connect(manager).revokeIdentity(did)
      ).to.be.revertedWith('Not authorized');
    });
  });

  describe('reactivateIdentity', () => {
    it('should reactivate a revoked identity', async () => {
      const did = 'did:trustforge:react001';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      await registry.connect(admin).revokeIdentity(did);
      await registry.connect(admin).reactivateIdentity(did);

      expect(await registry.isIdentityActive(did)).to.be.true;
    });
  });

  describe('isIdentityActive', () => {
    it('should return true for active identity', async () => {
      const did = 'did:trustforge:active001';
      const pk = ethers.keccak256(ethers.toUtf8Bytes('pk'));
      await registry.connect(manager).createIdentity(did, user.address, pk, '');
      expect(await registry.isIdentityActive(did)).to.be.true;
    });

    it('should return false for nonexistent DID', async () => {
      expect(await registry.isIdentityActive('did:trustforge:none')).to.be.false;
    });
  });

  describe('pause/unpause', () => {
    it('should prevent identity creation when paused', async () => {
      await registry.connect(admin).pause();
      await expect(
        registry.connect(manager).createIdentity('did:x', user.address, ethers.ZeroHash, '')
      ).to.be.reverted;
      await registry.connect(admin).unpause();
    });
  });
});
