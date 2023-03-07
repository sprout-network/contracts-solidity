import { ethers } from 'hardhat'

import { CYBERCONNECT_CONTRACT } from './constants'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { createCCProfile, getProfileId, setupCurrencyWhitelist } from './helpers/cyberconnect'
import { TransferEvent } from '../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { BigNumberish } from 'ethers'
import { toWrap } from './helpers/nativeCoin'
import { pack } from '@ethersproject/solidity/src.ts'

describe('CyberConnect testing', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectCCFixture() {
    const [user1, user2] = await ethers.getSigners()

    const engine = await ethers.getContractAt('ICyberEngine', CYBERCONNECT_CONTRACT.EngineProxy)
    await engine.deployed()

    const profileNFT = await ethers.getContractAt('IProfileNFT', CYBERCONNECT_CONTRACT.CCProfile)
    await profileNFT.deployed()

    const collectPaidMw = await ethers.getContractAt('IEssenceMiddleware', CYBERCONNECT_CONTRACT.CollectPaidMw)
    await engine.deployed()
    const coinAddr = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' //WBNB
    const coin = await ethers.getContractAt('IERC20', coinAddr)
    await toWrap(coinAddr, user1, ethers.utils.parseEther('10'))
    await toWrap(coinAddr, user2, ethers.utils.parseEther('10'))
    await setupCurrencyWhitelist(CYBERCONNECT_CONTRACT.CyberConnectTreasury, coin.address)
    return { engine, profileNFT, collectPaidMw, coin, user1, user2 }
  }

  async function setupProfileFixture() {
    const { engine, profileNFT, collectPaidMw, coin, user1, user2 } = await loadFixture(connectCCFixture)
    let userParam1 = {
      to: user1.address,
      handle: 'holeshit1',
      avatar: 'http://localhost:3000/avatar.png',
      metadata: 'http://localhost:3000/metadata.json',
      operator: '0x0000000000000000000000000000000000000000',
    }
    let userParam2 = {
      to: user2.address,
      handle: 'holeshit2',
      avatar: 'http://localhost:3000/avatar.png',
      metadata: 'http://localhost:3000/metadata.json',
      operator: '0x0000000000000000000000000000000000000000',
    }
    let receipt = await createCCProfile(user1, profileNFT.address, userParam1).then((tx) => tx.wait())
    if (!receipt.events) {
      throw new Error('events is null')
    }
    let profileId = getProfileId(<TransferEvent>receipt.events[1])
    const userProfile1 = { ...userParam1, profileId }
    receipt = await createCCProfile(user2, profileNFT.address, userParam2).then((tx) => tx.wait())
    if (!receipt.events) {
      throw new Error('events is null')
    }
    profileId = getProfileId(<TransferEvent>receipt.events[1])
    const userProfile2 = { ...userParam2, profileId }
    return { engine, profileNFT, collectPaidMw, coin, user1, user2, userProfile1, userProfile2 }
  }

  describe('profile testing', function () {
    it('Should create a profile nft successfully', async function () {
      const { profileNFT, user1 } = await loadFixture(connectCCFixture)
      const params = {
        to: user1.address,
        handle: 'holeshit',
        avatar: 'http://localhost:3000/avatar.png',
        metadata: 'http://localhost:3000/metadata.json',
        operator: '0x0000000000000000000000000000000000000000',
      }
      const nft = await ethers.getContractAt('IERC721', profileNFT.address)
      await expect(createCCProfile(user1, profileNFT.address, params))
        .to.emit(nft, 'Transfer')
        .withArgs('0x0000000000000000000000000000000000000000', user1.address, anyValue)
    })
  })

  describe('essence testing', function () {
    it('Should be the right name and symbol', async function () {
      const { engine, profileNFT, collectPaidMw, coin, user1, user2, userProfile1, userProfile2 } = await loadFixture(
        setupProfileFixture
      )
      const params = {
        profileId: userProfile1.profileId,
        name: 'firstshit',
        symbol: 'SHIT',
        essenceTokenURI: 'http://localhost:3000/essence.json',
        essenceMw: collectPaidMw.address,
        transferable: false,
        deployAtRegister: true,
      }
      const abi = ethers.utils.defaultAbiCoder
      const initData = abi.encode(
        ['uint256', 'uint256', 'address', 'address', 'bool'],
        [1000000n, 1000n, user1.address, coin.address, true]
      )
      await profileNFT.connect(user1).registerEssence(params, initData)
    })
  })
})
