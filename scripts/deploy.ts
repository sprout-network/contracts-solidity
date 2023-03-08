import { ethers } from 'hardhat'

async function main() {

  const Nft = await ethers.getContractFactory('NFT')
  const nft = await Nft.deploy('Account Bond NFTs', 'ABN', 'https://1ton-labs.vercel.app/api/metadata/')

  const NFTfi = await ethers.getContractFactory('NFTfi')
  const nftfi = await NFTfi.deploy()

  await nft.deployed()
  await nftfi.deployed()

  console.log(`\x1b[31mAccount Bond NFT deployed to ${nft.address}\x1b[0m`)
  console.log(`\x1b[31mAccount NFTfi deployed to ${nftfi.address}\x1b[0m`)

  const owner = await nftfi.owner()
  console.log(`\x1b[31mNFTfi owner: ${owner}\x1b[0m`)
  await nftfi.whitelistNFTContract(nft.address, true).then((tx) => tx.wait())
  console.log(`\x1b[31mWhitelisted NFT: ${nft.address}\x1b[0m`)

  if (process.env.TESTING_METAMASK_ADDRESS) {
    const amount = 30
    const [owner] = await ethers.getSigners()
    await owner.sendTransaction({
      to: process.env.TESTING_METAMASK_ADDRESS,
      value: ethers.utils.parseEther(`${amount}`),
    })

    console.log(`\x1b[31mTransferred ${amount} testing ETH to ${process.env.TESTING_METAMASK_ADDRESS}\x1b[0m`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
