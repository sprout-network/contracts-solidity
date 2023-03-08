import { ethers } from 'hardhat'

async function main() {
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
