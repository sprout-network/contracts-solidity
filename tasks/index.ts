import { task } from 'hardhat/config'
import { ethers } from 'ethers'

task("newAccount", "generate new eth account").setAction(async () => {
  const account = await ethers.Wallet.createRandom()
  console.log(`Account Address: ${account.address}`);
  // console.log(`Account public key: ${account.publicKey}`);
  console.log(`Account private key: ${account.privateKey}`);
});
