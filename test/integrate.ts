import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { ethers } from 'hardhat'
import { transferETH } from './helpers/common'
import { addNftToWhitelist, signOrder } from './helpers/nftfi'
import { approveWeth, ethToWeth } from './helpers/weth'
import { approveNFT, mintNFT } from './helpers/nft'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { expect } from 'chai'
import { BigNumber, BigNumberish, Event } from 'ethers'
import { BorrowerOrder, LenderOrder } from '../helpers/order'
import { INFTfi } from '../typechain-types'

describe('integrate testing', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function contractFixture() {
    //NFTfi contract address (https://github.com/NFTfi-Genesis/nftfi.eth/tree/main/V1)
    const [borrower, lender] = await ethers.getSigners()

    const addr = '0x88341d1a8f672d2780c8dc725902aae72f143b0c'
    const nftfi = await ethers.getContractAt('INFTfi', addr)
    await nftfi.deployed()

    const name = 'Creator'
    const symbol = 'CT'

    const baseUri = 'http://localhost:3000/'
    const NFT = await ethers.getContractFactory('NFT')
    const nft = await NFT.deploy(name, symbol, baseUri)
    await nft.deployed()
    await mintNFT(nft.address, borrower, null, 10)

    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const weth = await ethers.getContractAt('WETH9', wethAddress)
    await weth.deployed()

    const nftfiOwnerAddr = '0xDcA17eeDc1aa3dbB14361678566b2dA5A1Bb4C31'
    const nftfiOwner = await ethers.getImpersonatedSigner(nftfiOwnerAddr)
    await transferETH(borrower, nftfiOwnerAddr, ethers.utils.parseEther('10.0'))
    await addNftToWhitelist(addr, nftfiOwnerAddr, nft.address)
    await ethToWeth(wethAddress, borrower, ethers.utils.parseEther('10.0'))
    await ethToWeth(wethAddress, lender, ethers.utils.parseEther('10.0'))

    return { nftfi, nft, weth, nftfiOwner, borrower, lender }
  }

  describe('beginLoan', function () {
    it('Txn Should be successful if signatures are correct', async function () {
      const { nftfi, borrower, lender, nft, weth } = await loadFixture(contractFixture)
      const chainId = await nftfi.getChainID()
      const nftCollateralContract = nft.address
      const nftCollateralId = 1n
      const loanERC20Denomination = weth.address
      const { borrowerOrder, lenderOrder } = generateTestOrder(
        chainId,
        lender.address,
        borrower.address,
        nft.address,
        nftCollateralId,
        loanERC20Denomination,
        1000n
      )
      const borrowerSig = await signOrder(borrower, 'BORROW', borrowerOrder)
      await approveNFT(nft.address, borrower, nftfi.address, nftCollateralId)

      const lenderSig = await signOrder(lender, 'LEND', lenderOrder)
      await approveWeth(weth.address, lender, nftfi.address, lenderOrder.loanPrincipalAmount)
      await expect(
        nftfi.beginLoan(
          lenderOrder.loanPrincipalAmount,
          lenderOrder.maximumRepaymentAmount,
          nftCollateralId,
          lenderOrder.loanDuration,
          lenderOrder.loanInterestRateForDurationInBasisPoints,
          lenderOrder.adminFeeInBasisPoints,
          [borrowerOrder.borrowerNonce, lenderOrder.lenderNonce],
          nftCollateralContract,
          loanERC20Denomination,
          lender.address,
          borrowerSig,
          lenderSig
        )
      )
        .to.emit(nftfi, 'LoanStarted')
        .withArgs(
          anyValue, //loanId
          borrower.address,
          lender.address,
          lenderOrder.loanPrincipalAmount,
          lenderOrder.maximumRepaymentAmount,
          nftCollateralId,
          anyValue, //loanStartTime
          lenderOrder.loanDuration,
          lenderOrder.loanInterestRateForDurationInBasisPoints,
          nftCollateralContract,
          loanERC20Denomination,
          lenderOrder.interestIsProRated
        )
    })
  })
  describe('payBackLoan', function () {
    const loanFixture = async () => {
      const { nftfi, borrower, nftfiOwner, lender, nft, weth } = await loadFixture(contractFixture)
      const chainId = await nftfi.getChainID()
      const nftCollateralContract = nft.address
      const nftCollateralId = 1n
      const loanERC20Denomination = weth.address
      const { borrowerOrder, lenderOrder } = generateTestOrder(
        chainId,
        lender.address,
        borrower.address,
        nft.address,
        nftCollateralId,
        loanERC20Denomination,
        1000n
      )
      const borrowerSig = await signOrder(borrower, 'BORROW', borrowerOrder)
      await approveNFT(nft.address, borrower, nftfi.address, nftCollateralId)

      const lenderSig = await signOrder(lender, 'LEND', lenderOrder)
      await approveWeth(weth.address, lender, nftfi.address, lenderOrder.loanPrincipalAmount)
      const tx = await nftfi.beginLoan(
        lenderOrder.loanPrincipalAmount,
        lenderOrder.maximumRepaymentAmount,
        nftCollateralId,
        lenderOrder.loanDuration,
        lenderOrder.loanInterestRateForDurationInBasisPoints,
        lenderOrder.adminFeeInBasisPoints,
        [borrowerOrder.borrowerNonce, lenderOrder.lenderNonce],
        nftCollateralContract,
        loanERC20Denomination,
        lender.address,
        borrowerSig,
        lenderSig
      )
      const receipt = await tx.wait()
      const evts = receipt.events
      if (!evts) throw new Error(`event not found`)
      const loanEvent = getLoanEvent(evts[evts.length - 1])
      return { nftfi, nft, weth, nftfiOwner, borrower, lender, loanEvent }
    }
    it('Txn Should be successful', async function () {
      const { nftfi, borrower, lender, nft, weth, loanEvent } = await loadFixture(loanFixture)
      await approveWeth(weth.address, borrower, nftfi.address, loanEvent.maximumRepaymentAmount)
      await expect(nftfi.payBackLoan(loanEvent.loanId)).to.emit(nftfi, 'LoanRepaid').withArgs(
        loanEvent.loanId,
        loanEvent.borrower,
        loanEvent.lender,
        loanEvent.loanPrincipalAmount,
        loanEvent.nftCollateralId,
        anyValue, //amountPaidToLender
        anyValue, //adminFee
        loanEvent.nftCollateralContract,
        loanEvent.loanERC20Denomination
      )
    })

    describe('liquidateLoan', function () {
      const expireLoanFixture = async () => {
        const { nftfi, borrower, nftfiOwner, lender, nft, weth } = await loadFixture(contractFixture)
        const chainId = await nftfi.getChainID()
        const nftCollateralContract = nft.address
        const nftCollateralId = 1n
        const loanERC20Denomination = weth.address
        const loadInterval = 3
        const { borrowerOrder, lenderOrder } = generateTestOrder(
          chainId,
          lender.address,
          borrower.address,
          nft.address,
          nftCollateralId,
          loanERC20Denomination,
          loadInterval
        )
        const borrowerSig = await signOrder(borrower, 'BORROW', borrowerOrder)
        await approveNFT(nft.address, borrower, nftfi.address, nftCollateralId)

        const lenderSig = await signOrder(lender, 'LEND', lenderOrder)
        await approveWeth(weth.address, lender, nftfi.address, lenderOrder.loanPrincipalAmount)
        const tx = await nftfi.beginLoan(
          lenderOrder.loanPrincipalAmount,
          lenderOrder.maximumRepaymentAmount,
          nftCollateralId,
          lenderOrder.loanDuration,
          lenderOrder.loanInterestRateForDurationInBasisPoints,
          lenderOrder.adminFeeInBasisPoints,
          [borrowerOrder.borrowerNonce, lenderOrder.lenderNonce],
          nftCollateralContract,
          loanERC20Denomination,
          lender.address,
          borrowerSig,
          lenderSig
        )
        const receipt = await tx.wait()
        const evts = receipt.events
        if (!evts) throw new Error(`event not found`)
        const loanEvent = getLoanEvent(evts[evts.length - 1])
        await new Promise((f) => setTimeout(f, (loadInterval + 1) * 1000))
        return { nftfi, nft, weth, nftfiOwner, borrower, lender, loanEvent }
      }
      it('Txn Should be success', async function () {
        const { nftfi, borrower, lender, loanEvent } = await loadFixture(expireLoanFixture)
        const nftfiLender = nftfi.connect(lender)
        await expect(nftfiLender.liquidateOverdueLoan(loanEvent.loanId))
          .to.emit(nftfiLender, 'LoanLiquidated')
          .withArgs(
            loanEvent.loanId,
            loanEvent.borrower,
            loanEvent.lender,
            loanEvent.loanPrincipalAmount,
            loanEvent.nftCollateralId,
            anyValue, //loanMaturityDate
            anyValue, //loanLiquidationDate
            loanEvent.nftCollateralContract
          )
      })
    })
  })
})

function generateTestOrder(
  chainId: BigNumber,
  lender: string,
  borrower: string,
  nft: string,
  nftId: BigNumberish,
  erc20: string,
  loanDuration: BigNumberish
): { borrowerOrder: BorrowerOrder; lenderOrder: LenderOrder } {
  const nftCollateralContract = nft
  const nftCollateralId = nftId
  const borrowerNonce = 1n
  const loanPrincipalAmount = 100n
  const maximumRepaymentAmount = 100n
  const loanERC20Denomination = erc20
  const interestIsProRated = true
  const loanInterestRateForDurationInBasisPoints = 1000n
  const adminFeeInBasisPoints = 500n
  const lenderNonce = 1n
  const borrowerOrder = { chainId, nftCollateralContract, borrower, nftCollateralId, borrowerNonce }
  const lenderOrder = {
    loanPrincipalAmount,
    maximumRepaymentAmount,
    nftCollateralId,
    loanDuration,
    loanInterestRateForDurationInBasisPoints,
    adminFeeInBasisPoints,
    lenderNonce,
    nftCollateralContract,
    loanERC20Denomination,
    lender,
    interestIsProRated,
    chainId,
  }
  return { lenderOrder, borrowerOrder }
}

export interface LoanEvent {
  loanId: BigNumberish
  borrower: string
  lender: string
  loanPrincipalAmount: BigNumberish
  maximumRepaymentAmount: BigNumberish
  nftCollateralId: BigNumberish
  loanStartTime: BigNumberish
  loanDuration: BigNumberish
  loanInterestRateForDurationInBasisPoints: BigNumberish
  nftCollateralContract: string
  loanERC20Denomination: string
  interestIsProRated: boolean
}

function getLoanEvent(evt: Event): LoanEvent {
  const args = evt.args
  if (!args) throw new Error(`Loan parameter not found`)
  const {
    loanId,
    borrower,
    lender,
    loanPrincipalAmount,
    maximumRepaymentAmount,
    nftCollateralId,
    loanStartTime,
    loanDuration,
    loanInterestRateForDurationInBasisPoints,
    nftCollateralContract,
    loanERC20Denomination,
    interestIsProRated,
  } = args
  return {
    loanId,
    borrower,
    lender,
    loanPrincipalAmount,
    maximumRepaymentAmount,
    nftCollateralId,
    loanStartTime,
    loanDuration,
    loanInterestRateForDurationInBasisPoints,
    nftCollateralContract,
    loanERC20Denomination,
    interestIsProRated,
  }
}
