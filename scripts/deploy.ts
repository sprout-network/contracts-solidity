import { ethers } from 'hardhat'

async function main() {
  const wbnb = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
  const dai = '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3'
  const whitelist = [wbnb, dai]

  const Nft = await ethers.getContractFactory('NFT')
  const nft = await Nft.deploy('Account Bond NFTs', 'ABN', 'https://1ton-labs.vercel.app/api/metadata/')

  const NFTfi = await ethers.getContractFactory('NFTfi')
  const nftfi = await NFTfi.deploy()

  const Treasury = await ethers.getContractFactory('Treasury')
  const treasury = await Treasury.deploy(whitelist)

  await nft.deployed()
  await nftfi.deployed()
  await treasury.deployed()

  console.log(`\x1b[31mAccount Bond NFT deployed to ${nft.address}\x1b[0m`)
  console.log(`\x1b[31mAccount NFTfi deployed to ${nftfi.address}\x1b[0m`)
  console.log(`\x1b[31mAccount Treasury deployed to ${treasury.address}\x1b[0m`)

  let owner = await nftfi.owner()
  console.log(`\x1b[31mNFTfi owner: ${owner}\x1b[0m`)
  await nftfi.whitelistNFTContract(nft.address, true).then((tx) => tx.wait())
  console.log(`\x1b[31mWhitelisted NFT: ${nft.address}\x1b[0m`)

  owner = await treasury.owner()
  console.log(`\x1b[31mTreasury owner: ${owner}\x1b[0m`)
  console.log(`\x1b[31mWhitelisted Currency: ${whitelist.join(", ")}\x1b[0m`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
