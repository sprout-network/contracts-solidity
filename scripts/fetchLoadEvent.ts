import { ethers } from 'hardhat'
import { INFTfi__factory } from '../typechain-types'

async function main() {
  const nftfiAddr = '0x88341d1a8f672d2780c8dc725902aae72f143b0c'
  const provider = ethers.provider
  const nftfi = INFTfi__factory.connect(nftfiAddr, provider)
  const filter = nftfi.filters.LoanStarted()
  const events = await nftfi.queryFilter(filter, 15400000)
  console.log(`LoanStarted`)
  for (const e of events) {
    console.log(`loadId:${e.args.loanId},borrower:${e.args.borrower},lender:${e.args.lender}`)
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
