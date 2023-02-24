import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { generateBorrowerHash, generateLenderHash } from '../helpers/order'
import { BigNumber } from 'ethers'

describe('NFTfi', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectNFTfiFixture() {
    //NFTfi contract address (https://github.com/NFTfi-Genesis/nftfi.eth/tree/main/V1)
    const addr = '0x88341d1a8f672d2780c8dc725902aae72f143b0c'
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()
    const nftfi = await ethers.getContractAt('INFTfi', addr)
    return { nftfi, owner, otherAccount }
  }

  describe('NFTfiAdmin', function () {
    it('Should be the right name and symbol', async function () {
      const { nftfi } = await loadFixture(connectNFTfiFixture)
      const name = 'NFTfi Promissory Note'
      const symbol = 'NFTfi'
      expect(await nftfi.name()).to.equal(name)
      expect(await nftfi.symbol()).to.equal(symbol)
    })
  })

  describe('NFTfiSigningUtils', function () {
    it('Should be the right borrower sig', async function () {
      const { nftfi, owner } = await loadFixture(connectNFTfiFixture)
      const chainId = await nftfi.getChainID()
      const nftCollateralContract = '0xB75F09b4340aEb85Cd5F2Dd87d31751EDC11ed39'
      const borrower = owner.address
      const nftCollateralId = 1n
      const borrowerNonce = 1n
      const hash = generateBorrowerHash({ chainId, nftCollateralContract, borrower, nftCollateralId, borrowerNonce })
      const sig = await owner.signMessage(hash)
      const isValid = await nftfi.isValidBorrowerSignature(
        nftCollateralId,
        borrowerNonce,
        nftCollateralContract,
        borrower,
        sig
      )
      expect(isValid).to.true
    })
    it('Should be the right lender sig', async function () {
      const { nftfi, owner } = await loadFixture(connectNFTfiFixture)
      const chainId = await nftfi.getChainID()
      const loanPrincipalAmount = 100n
      const maximumRepaymentAmount = 100n
      const loanDuration = 10000000n
      const loanERC20Denomination = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
      const interestIsProRated = false
      const loanInterestRateForDurationInBasisPoints = 1000n
      const adminFeeInBasisPoints = 10n
      const nftCollateralContract = '0xB75F09b4340aEb85Cd5F2Dd87d31751EDC11ed39'
      const lender = owner.address
      const nftCollateralId = BigNumber.from(1)
      const lenderNonce = BigNumber.from(1)
      const hash = generateLenderHash({
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
      })
      const sig = await owner.signMessage(hash)
      const isValid = await nftfi.isValidLenderSignature(
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
        sig
      )
      expect(isValid).to.true
    })
  })
})
