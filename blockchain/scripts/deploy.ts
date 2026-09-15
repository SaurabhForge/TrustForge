import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying TrustForge contracts with:', deployer.address);
  console.log('Balance:', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'ETH');

  // Deploy IdentityRegistry
  console.log('\n1. Deploying IdentityRegistry...');
  const IdentityRegistry = await ethers.getContractFactory('IdentityRegistry');
  const identityRegistry = await IdentityRegistry.deploy(deployer.address);
  await identityRegistry.waitForDeployment();
  const identityRegistryAddress = await identityRegistry.getAddress();
  console.log('   IdentityRegistry deployed to:', identityRegistryAddress);

  // Deploy AccessControlManager
  console.log('\n2. Deploying AccessControlManager...');
  const AccessControlManager = await ethers.getContractFactory('AccessControlManager');
  const accessControlManager = await AccessControlManager.deploy(deployer.address, identityRegistryAddress);
  await accessControlManager.waitForDeployment();
  const accessControlManagerAddress = await accessControlManager.getAddress();
  console.log('   AccessControlManager deployed to:', accessControlManagerAddress);

  // Deploy AssetRegistry
  console.log('\n3. Deploying AssetRegistry...');
  const AssetRegistry = await ethers.getContractFactory('AssetRegistry');
  const assetRegistry = await AssetRegistry.deploy(deployer.address, identityRegistryAddress);
  await assetRegistry.waitForDeployment();
  const assetRegistryAddress = await assetRegistry.getAddress();
  console.log('   AssetRegistry deployed to:', assetRegistryAddress);

  // Grant MANAGER_ROLE to deployer on IdentityRegistry
  console.log('\n4. Granting roles...');
  const MANAGER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MANAGER_ROLE'));
  await identityRegistry.grantRole(MANAGER_ROLE, deployer.address);
  console.log('   MANAGER_ROLE granted on IdentityRegistry');

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    contracts: {
      IdentityRegistry: identityRegistryAddress,
      AccessControlManager: accessControlManagerAddress,
      AssetRegistry: assetRegistryAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, '../deployments');
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\n✅ Deployment complete!');
  console.log('\n📋 Contract Addresses:');
  console.log('   TRUSTFORGE_IDENTITY_REGISTRY_ADDRESS=' + identityRegistryAddress);
  console.log('   TRUSTFORGE_ACCESS_CONTROL_ADDRESS=' + accessControlManagerAddress);
  console.log('   TRUSTFORGE_ASSET_REGISTRY_ADDRESS=' + assetRegistryAddress);
  console.log('\nAdd these to your backend .env file!');
}

main().catch((err) => { console.error(err); process.exit(1); });
