import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { NFT } from '../typechain-types'
import { approveCoin } from './helpers/erc20'
import { depositToTreasury } from './helpers/treasury'

describe('Treasury', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployTreasuryFixture() {
    const MockCoin = await ethers.getContractFactory('MockCoin')
    const coin = await MockCoin.deploy()
    await coin.deployed()
    const MockNFT = await ethers.getContractFactory('MockNFT')
    const nft = await MockNFT.deploy()
    await nft.deployed()

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()

    const Treasury = await ethers.getContractFactory('Treasury')
    const treasury = await Treasury.deploy([coin.address])
    await treasury.deployed()

    await (await nft.mint()).wait()
    const nftId = 0n
    const coinAmount = 1000000000000000000n
    await (await coin.mintTo(owner.address, coinAmount)).wait()
    await (await coin.mintTo(otherAccount.address, coinAmount)).wait()

    return { treasury, nft, nftId, coin, owner, otherAccount }
  }

  async function poolFixture() {
    const { treasury, nft, nftId, coin, owner, otherAccount } = await loadFixture(deployTreasuryFixture)
    await (await treasury.createPool(nft.address, nftId, coin.address)).wait()
    const poolId = await treasury.getPoolId(nft.address, nftId)
    const poolInfo = await treasury.getPoolInfo(poolId)
    return { treasury, nft, nftId, coin, owner, otherAccount, poolId, poolInfo }
  }

  async function poolDepositedFixture() {
    const { treasury, nft, nftId, coin, owner, poolId, otherAccount } = await loadFixture(poolFixture)
    const depositAmount = 1000n
    await approveCoin(coin.address, otherAccount, treasury.address, depositAmount)
    await depositToTreasury(treasury.address, otherAccount, poolId, coin.address, depositAmount)
    const poolInfo = await treasury.getPoolInfo(poolId)
    return { treasury, nft, nftId, coin, owner, otherAccount, poolId, poolInfo }
  }

  describe('Deployment', function () {
    it('Should set the right name and symbol', async function () {
      const { nft, treasury, coin } = await loadFixture(deployTreasuryFixture)

      expect(await treasury.coinWhitelist(coin.address)).to.equal(true)
      expect(await treasury.coinWhitelist(nft.address)).to.equal(false)
    })
  })

  describe('CreatePool method', function () {
    it('Should be create pool successful if caller is treasury owner', async function () {
      const { treasury, nft, nftId, coin, owner } = await loadFixture(deployTreasuryFixture)
      await expect(treasury.createPool(nft.address, nftId, coin.address))
        .to.emit(treasury, 'PoolCreated')
        .withArgs(anyValue, nft.address, nftId)
      const poolId = await treasury.getPoolId(nft.address, nftId)
      const poolInfo = await treasury.getPoolInfo(poolId)
      expect(poolInfo.coin).to.equal(coin.address)
      expect(poolInfo.nft).to.equal(nft.address)
      expect(poolInfo.nftId).to.equal(nftId)
      expect(poolInfo.balances).to.equal(0n)
    })

    it('Should be create pool successful if caller is not treasury owner', async function () {
      let { treasury, nft, nftId, coin, owner, otherAccount } = await loadFixture(deployTreasuryFixture)
      treasury = treasury.connect(otherAccount)
      await expect(treasury.createPool(nft.address, nftId, coin.address)).to.revertedWith(
        'Ownable: caller is not the owner'
      )
    })
  })
  describe('Deposit method', function () {
    it('txn Should be successful if caller is the nft holder ', async function () {
      const { treasury, coin, poolId, owner, poolInfo } = await loadFixture(poolFixture)
      const depositAmount = 10000n
      await (await coin.approve(treasury.address, depositAmount)).wait()
      await expect(treasury.deposit(poolId, coin.address, depositAmount))
        .to.emit(treasury, 'Deposit')
        .withArgs(poolId, owner.address, coin.address, depositAmount)
      const newPoolInfo = await treasury.getPoolInfo(poolId)
      expect(newPoolInfo.balances.eq(poolInfo.balances.add(depositAmount))).to.equal(true)
      expect(newPoolInfo.coin).to.equal(coin.address)
    })

    it('txn Should be successful if caller is the another user ', async function () {
      let { treasury, coin, poolId, owner, poolInfo, otherAccount } = await loadFixture(poolFixture)
      treasury = treasury.connect(otherAccount)
      coin = coin.connect(otherAccount)
      const depositAmount = 10000n
      await (await coin.approve(treasury.address, depositAmount)).wait()
      await expect(treasury.deposit(poolId, coin.address, depositAmount))
        .to.emit(treasury, 'Deposit')
        .withArgs(poolId, otherAccount.address, coin.address, depositAmount)
      const newPoolInfo = await treasury.getPoolInfo(poolId)
      expect(newPoolInfo.balances.eq(poolInfo.balances.add(depositAmount))).to.equal(true)
      expect(newPoolInfo.coin).to.equal(coin.address)
    })
  })
  describe('Withdraw method', function () {
    it('txn Should be successful if caller is the nft holder', async function () {
      const { treasury, coin, poolId, owner, poolInfo } = await loadFixture(poolDepositedFixture)
      const withdrawAmount = poolInfo.balances
      await expect(treasury.withdraw(poolId, poolInfo.coin, withdrawAmount))
        .to.emit(treasury, 'Withdraw')
        .withArgs(poolId, owner.address, coin.address, withdrawAmount)
      const newPoolInfo = await treasury.getPoolInfo(poolId)
      expect(newPoolInfo.balances.eq(poolInfo.balances.sub(withdrawAmount))).to.equal(true)
      expect(newPoolInfo.coin).to.equal(coin.address)
    })
    it('txn Should be fail if caller is not the nft holder', async function () {
      const { treasury, poolId, poolInfo, otherAccount } = await loadFixture(poolDepositedFixture)
      const withdrawAmount = poolInfo.balances
      await expect(treasury.connect(otherAccount).withdraw(poolId, poolInfo.coin, withdrawAmount)).to.revertedWith(
        'only used by nft holder'
      )
    })
  })
})
