import { ethers } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { toWrap } from './helpers/nativeCoin'

describe('WCoin', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectWCoinFixture() {
    const addr = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'
    const coin = await ethers.getContractAt('WBNB', addr)

    // Contracts are deployed using the first signer/account by default
    const [user1, otherAccount] = await ethers.getSigners()

    return { coin, user1, otherAccount }
  }

  describe('Connect', function () {
    it('Should set the right name and symbol', async function () {
      const { coin } = await loadFixture(connectWCoinFixture)

      expect(await coin.name()).to.equal('Wrapped BNB')
      expect(await coin.symbol()).to.equal('WBNB')
    })
  })

  describe('Deposit', function () {
    it('Should set the right name and symbol', async function () {
      const { coin, user1 } = await loadFixture(connectWCoinFixture)
      const preBalance = await coin.balanceOf(user1.address)
      const amount = ethers.utils.parseEther('1.0')
      await toWrap(coin.address, user1, amount)
      let balance = await coin.balanceOf(user1.address)
      expect(balance.eq(amount.add(preBalance))).to.true
    })
  })
})
