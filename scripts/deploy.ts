import { ethers } from 'hardhat'

async function main() {
  const currentTimestampInSeconds = Math.round(Date.now() / 1000)
  const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60
  const unlockTime = currentTimestampInSeconds + ONE_YEAR_IN_SECS

  const lockedAmount = ethers.utils.parseEther('1')

  const latestBlock = await ethers.provider.getBlock('latest')
  console.log(`Latest block number: ${latestBlock.number}`)
  console.log(`Latest block timestamp: ${latestBlock.timestamp}`)
  console.log(`Current timestamp: ${currentTimestampInSeconds}`)
  
  const Lock = await ethers.getContractFactory('Lock')
  const lock = await Lock.deploy(unlockTime, { value: lockedAmount })

  const Nft = await ethers.getContractFactory('NFT')
  const nft = await Nft.deploy('Account Bond NFTs', 'ABN', 'https://1ton-labs.vercel.app/api/metadata/')

  await lock.deployed()
  await nft.deployed()

  console.log(`Lock with 1 ETH and unlock timestamp ${unlockTime} deployed to ${lock.address}`)
  console.log(`Account Bond NFT deployed to ${nft.address}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
