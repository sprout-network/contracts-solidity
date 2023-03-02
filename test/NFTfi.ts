import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'
import { addNftToWhitelist, signOrder } from './helpers/nftfi'

describe('NFTfi', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectNFTfiFixture() {
    //NFTfi contract address (https://github.com/NFTfi-Genesis/nftfi.eth/tree/main/V1)
    const nftfiAddr = '0x88341d1a8f672d2780c8dc725902aae72f143b0c'
    const nftfiOwnerAddr = '0xDcA17eeDc1aa3dbB14361678566b2dA5A1Bb4C31'
    const nftfiOwner = await ethers.getImpersonatedSigner(nftfiOwnerAddr)

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()
    await owner.sendTransaction({
      to: nftfiOwner.address,
      value: ethers.utils.parseEther('10.0'), // Sends exactly 1.0 ether
    })
    const nftfi = await ethers.getContractAt('INFTfi', nftfiAddr)
    return { nftfi, nftfiOwner, owner, otherAccount }
  }

  describe('NFTfiAdmin', function () {
    it('Should be the right name and symbol', async function () {
      const { nftfi } = await loadFixture(connectNFTfiFixture)
      const name = 'NFTfi Promissory Note'
      const symbol = 'NFTfi'
      expect(await nftfi.name()).to.equal(name)
      expect(await nftfi.symbol()).to.equal(symbol)
    })
    it('Should be the right whitelist of erc20', async function () {
      const { nftfi } = await loadFixture(connectNFTfiFixture)
      const whitelist = [
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', //WETH
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', //DAI
      ]
      for (const w of whitelist) {
        expect(await nftfi.erc20CurrencyIsWhitelisted(w)).to.equal(true)
      }
    })

    it('Should be the right owner', async function () {
      const { nftfi, nftfiOwner } = await loadFixture(connectNFTfiFixture)
      const owner = await nftfi.owner()
      expect(owner).to.equal(nftfiOwner.address)
    })

    it('Should be the right owner', async function () {
      const { nftfi, nftfiOwner } = await loadFixture(connectNFTfiFixture)
      const nftAddr = '0x0c60b40289ff15ff6afdfa668d1a743dc6e53cf3'
      expect(await nftfi.nftContractIsWhitelisted(nftAddr)).to.equal(false)
      await addNftToWhitelist(nftfi.address, nftfiOwner.address, nftAddr)
      expect(await nftfi.nftContractIsWhitelisted(nftAddr)).to.equal(true)
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
      const order = { chainId, nftCollateralContract, borrower, nftCollateralId, borrowerNonce }
      const sig = signOrder(owner, 'BORROW', order)
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
      const nftCollateralId = 1n
      const lenderNonce = 1n
      const order = {
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
      const sig = signOrder(owner, 'LEND', order)
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
