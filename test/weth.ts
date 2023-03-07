import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethToWeth } from './helpers/weth'

describe('WETH', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectWETHFixture() {
    const wethAddr = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
    const weth = await ethers.getContractAt('WETH9', wethAddr)

    // Contracts are deployed using the first signer/account by default
    const [user1, otherAccount] = await ethers.getSigners()

    return { weth, user1, otherAccount }
  }

  describe('Connect', function () {
    it('Should set the right name and symbol', async function () {
      const { weth } = await loadFixture(connectWETHFixture)

      expect(await weth.name()).to.equal('Wrapped Ether')
      expect(await weth.symbol()).to.equal('WETH')
    })
  })

  describe('Deposit', function () {
    it('Should be right balance', async function () {
      const { weth, user1 } = await loadFixture(connectWETHFixture)
      let preBalance = await weth.balanceOf(user1.address)
      const amount = ethers.utils.parseEther('1.0')
      await ethToWeth(weth.address, user1, amount)
      const balanceEx=preBalance.add(amount)
      const balance = await weth.balanceOf(user1.address)
      expect(balance.eq(balanceEx)).to.true
    })
  })
})
