import { time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { NFT } from '../typechain-types'

describe('NFT', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployNFTFixture() {
    const name = 'Creator'
    const symbol = 'CT'

    const baseUri = 'http://localhost:3000/'

    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount] = await ethers.getSigners()

    const NFT = await ethers.getContractFactory('NFT')
    const nft = await NFT.deploy(name, symbol, baseUri)

    return { nft, name, symbol, baseUri, owner, otherAccount }
  }

  describe('Deployment', function () {
    it('Should set the right name and symbol', async function () {
      const { nft, name, symbol } = await loadFixture(deployNFTFixture)

      expect(await nft.name()).to.equal(name)
      expect(await nft.symbol()).to.equal(symbol)
    })
  })

  describe('Mint method', function () {
    describe('mint nft', function () {
      it('Should be right owner and tokenUri', async function () {
        const { nft, owner, baseUri } = await loadFixture(deployNFTFixture)
        const start = 0
        const amount = 10
        await nft.mint(amount)
        for (let i = start; i < amount + start; i++) {
          expect(await nft.ownerOf(i)).to.equal(owner.address)
          const uri = `${baseUri}${i}.json`
          expect(await nft.tokenURI(i)).to.equal(uri)
        }
      })
      it('Should be right receiver and tokenUri', async function () {
        const { nft, otherAccount, baseUri } = await loadFixture(deployNFTFixture)
        const user1 = otherAccount
        const start = 0
        const amount = 10
        await nft.mintTo(user1.address, amount)
        for (let i = start; i < amount + start; i++) {
          expect(await nft.ownerOf(i)).to.equal(user1.address)
          const uri = `${baseUri}${i}.json`
          expect(await nft.tokenURI(i)).to.equal(uri)
        }
      })
    })
  })

  describe('Activate method', function () {
    it('Should be right activate time', async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture)
      await nft.mint(1)
      const tokenId = 0n
      expect(await nft.ownerOf(tokenId)).to.equal(owner.address)
      expect(await nft.activateTime(tokenId)).to.equal(0n)
      await nft.activate(tokenId)
      expect(await nft.activateTime(tokenId)).not.equal(0n)
    })

    it("Should be revert if activate token twice", async function () {
      const { nft } = await loadFixture(deployNFTFixture)
      await nft.mint(1)
      const tokenId = 0n
      await nft.activate(tokenId)
      await expect(nft.activate(tokenId)).to.be.reverted
    })
  })

  describe('Events', function () {
    it('Should emit an event on Activate', async function () {
      const { nft, owner } = await loadFixture(deployNFTFixture)
      await nft.mint(1)
      const tokenId = 0n
      await expect(nft.activate(tokenId)).to.emit(nft, 'Activate').withArgs(tokenId, owner.address, anyValue)
    })
  })
})
