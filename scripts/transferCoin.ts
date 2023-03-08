import { ethers } from 'hardhat'

async function main() {
  if (process.env.TESTING_METAMASK_ADDRESSES) {
    const addresses = process.env.TESTING_METAMASK_ADDRESSES.split(',')
    const amount = 30
    const [owner] = await ethers.getSigners()

    addresses.forEach(async (address) => {
      if (address) {
        await owner.sendTransaction({
          to: address,
          value: ethers.utils.parseEther(`${amount}`),
        })
        console.log(`\x1b[31mTransferred ${amount} testing ETH to ${address}\x1b[0m`)
      }
    })
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
