import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { ethers } from 'hardhat'
import { transferETH } from './helpers/common'
import { addNftToWhitelist, signOrder } from './helpers/nftfi'
import { approveWeth, ethToWeth } from './helpers/weth'
import { approveNFT, mintNFT } from './helpers/nft'

describe('integrate testing', function() {
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
    await mintNFT(nft.address,borrower,null,10)

    const wethAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const weth = await ethers.getContractAt('WETH9', wethAddress)
    await weth.deployed()

    const nftfiOwnerAddr = '0xDcA17eeDc1aa3dbB14361678566b2dA5A1Bb4C31'
    const nftfiOwner = await ethers.getImpersonatedSigner(nftfiOwnerAddr)
    await transferETH(borrower, nftfiOwnerAddr, ethers.utils.parseEther('10.0'))
    await addNftToWhitelist(addr, nftfiOwnerAddr, nft.address)
    await ethToWeth(wethAddress, lender, ethers.utils.parseEther('10.0'))

    return { nftfi, nft, weth, nftfiOwner, borrower, lender }
  }


  describe('beginLoan Method', function() {
    it('Should be success if signatures are correct', async function() {
      const { nftfi, borrower, lender, nft, weth } = await loadFixture(contractFixture)
      const chainId = await nftfi.getChainID()
      const nftCollateralContract = nft.address
      const nftCollateralId = 1n
      const borrowerNonce = 1n
      const loanPrincipalAmount = 100n
      const maximumRepaymentAmount = 100n
      const loanDuration = 10000n
      const loanERC20Denomination = weth.address
      const interestIsProRated = true
      const loanInterestRateForDurationInBasisPoints = 1000n
      const adminFeeInBasisPoints = 500n
      const lenderNonce = 1n
      const borrowOrder = { chainId, nftCollateralContract, borrower: borrower.address, nftCollateralId, borrowerNonce }

      const borrowerSig = await signOrder(borrower, 'BORROW', borrowOrder)
      await approveNFT(nftfi.address,borrower,nftfi.address,nftCollateralId)

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
        lender: lender.address,
        interestIsProRated,
        chainId
      }
      const lenderSig = await signOrder(lender, 'LEND', lenderOrder)
      await approveWeth(weth.address, lender, nftfi.address, loanPrincipalAmount)

      const tx = await nftfi.beginLoan(
        loanPrincipalAmount,
        maximumRepaymentAmount,
        nftCollateralId,
        loanDuration,
        loanInterestRateForDurationInBasisPoints,
        adminFeeInBasisPoints,
        [borrowerNonce, lenderNonce],
        nftCollateralContract,
        loanERC20Denomination,
        lender.address,
        borrowerSig,
        lenderSig
      )
      const receipt=await tx.wait()
    })
  })
})
