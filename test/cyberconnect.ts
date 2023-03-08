import { ethers } from 'hardhat'

import { CYBERCONNECT_CONTRACT } from './constants'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import {
  collectEssence,
  createCCProfile,
  getEssenceId,
  getProfileId,
  setupCurrencyWhitelist,
} from './helpers/cyberconnect'
import { TransferEvent } from '../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { BigNumberish } from 'ethers'
import { toWrap } from './helpers/nativeCoin'
import { pack } from '@ethersproject/solidity/src.ts'
import { generateCollectPaidMwInit, generateSubscribePaidMwInit } from '../helpers/mw'
import { IActionsEvent } from '../typechain-types'
import { PromiseOrValue } from '../typechain-types/common'
import { approveCoin } from './helpers/erc20'
import { essence } from '../typechain-types/contracts/cyberconnect/middlewares'

describe('CyberConnect testing', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectCCFixture() {
    const [user1, user2] = await ethers.getSigners()

    const engine = await ethers.getContractAt('ICyberEngine', CYBERCONNECT_CONTRACT.EngineProxy)
    await engine.deployed()

    const actions = await ethers.getContractAt('IActionsEvent', CYBERCONNECT_CONTRACT.CCAction)
    await actions.deployed()

    const profileNFT = await ethers.getContractAt('IProfileNFT', CYBERCONNECT_CONTRACT.CCProfile)
    await profileNFT.deployed()

    const collectPaidMw = await ethers.getContractAt('IEssenceMiddleware', CYBERCONNECT_CONTRACT.CollectPaidMw)
    await collectPaidMw.deployed()

    const subscribePaidMw = await ethers.getContractAt('ISubscribeMiddleware', CYBERCONNECT_CONTRACT.SubscribePaidMw)
    await subscribePaidMw.deployed()

    const coinAddr = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' //WBNB
    const coin = await ethers.getContractAt('IERC20', coinAddr)
    await toWrap(coinAddr, user1, ethers.utils.parseEther('10'))
    await toWrap(coinAddr, user2, ethers.utils.parseEther('10'))
    await setupCurrencyWhitelist(CYBERCONNECT_CONTRACT.CyberConnectTreasury, coin.address)
    return { engine, actions, profileNFT, collectPaidMw, subscribePaidMw, coin, user1, user2 }
  }

  async function setupProfileFixture() {
    const { engine, actions, profileNFT, collectPaidMw, subscribePaidMw, coin, user1, user2 } = await loadFixture(
      connectCCFixture
    )
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
    let profileId = getProfileId(receipt.events[2])
    const userProfile1 = { ...userParam1, profileId }
    receipt = await createCCProfile(user2, profileNFT.address, userParam2).then((tx) => tx.wait())
    if (!receipt.events) {
      throw new Error('events is null')
    }
    profileId = getProfileId(receipt.events[2])
    const userProfile2 = { ...userParam2, profileId }
    return {
      engine,
      actions,
      profileNFT,
      collectPaidMw,
      subscribePaidMw,
      coin,
      user1,
      user2,
      userProfile1,
      userProfile2,
    }
  }

  async function setupEssenceFixture() {
    const { engine, actions, profileNFT, collectPaidMw, coin, user1, user2, userProfile1, userProfile2 } =
      await loadFixture(setupProfileFixture)
    const params = {
      profileId: userProfile1.profileId,
      name: 'firstshit',
      symbol: 'SHIT',
      essenceTokenURI: 'http://localhost:3000/essence.json',
      essenceMw: collectPaidMw.address,
      transferable: false,
      deployAtRegister: true,
    }
    const collectData = {
      totalSupply: 1000000n,
      amount: 1000n,
      recipient: user1.address,
      currency: coin.address,
      subscribeRequired: false,
    }
    const initData = generateCollectPaidMwInit(collectData)
    const receipt = await profileNFT
      .connect(user1)
      .registerEssence(params, initData)
      .then((tx) => tx.wait())
    const events = receipt.events
    if (!events) throw new Error('events is null')
    const essenceId = getEssenceId(events[events.length - 1])
    const userEssence1 = { ...collectData, essenceId }
    return {
      engine,
      actions,
      profileNFT,
      collectPaidMw,
      coin,
      user1,
      user2,
      userProfile1,
      userProfile2,
      userEssence1,
    }
  }

  async function setupSubscriptionFixture() {
    const {
      engine,
      actions,
      profileNFT,
      collectPaidMw,
      subscribePaidMw,
      coin,
      user1,
      user2,
      userProfile1,
      userProfile2,
    } = await loadFixture(setupProfileFixture)
    const tokenURI = 'http://localhost:3000/subscription.json'
    const profileId = userProfile1.profileId
    const mv = subscribePaidMw.address
    const user1Subscription = {
      amount: 1000n,
      recipient: user1.address,
      currency: coin.address,
      nftAddress: '0x0000000000000000000000000000000000000000',
      nftRequired: false,
    }
    const initData = generateSubscribePaidMwInit(user1Subscription)
    await profileNFT.setSubscribeData(profileId, tokenURI, mv, initData).then((tx) => tx.wait())
    return {
      engine,
      actions,
      profileNFT,
      collectPaidMw,
      subscribePaidMw,
      coin,
      user1,
      user2,
      userProfile1,
      userProfile2,
      user1Subscription,
    }
  }

  describe('profile testing', function () {
    it('Should create a profile nft successfully', async function () {
      const { profileNFT, actions, user1 } = await loadFixture(connectCCFixture)
      const params = {
        to: user1.address,
        handle: 'holeshit',
        avatar: 'http://localhost:3000/avatar.png',
        metadata: 'http://localhost:3000/metadata.json',
        operator: '0x0000000000000000000000000000000000000000',
      }
      const nft = await ethers.getContractAt('IERC721', profileNFT.address)
      await expect(createCCProfile(user1, profileNFT.address, params))
        .to.emit(actions, 'CreateProfile')
        .withArgs(params.to, anyValue, params.handle, params.avatar, params.metadata)
    })
  })

  describe('essence testing', function () {
    it('Should create a essense nft successfully', async function () {
      const { engine, profileNFT, actions, collectPaidMw, coin, user1, user2, userProfile1, userProfile2 } =
        await loadFixture(setupProfileFixture)
      const params = {
        profileId: userProfile1.profileId,
        name: 'firstshit',
        symbol: 'SHIT',
        essenceTokenURI: 'http://localhost:3000/essence.json',
        essenceMw: collectPaidMw.address,
        transferable: false,
        deployAtRegister: true,
      }
      const data = {
        totalSupply: 1000000n,
        amount: 1000n,
        recipient: user1.address,
        currency: coin.address,
        subscribeRequired: false,
      }
      const initData = generateCollectPaidMwInit(data)
      await expect(profileNFT.connect(user1).registerEssence(params, initData))
        .to.emit(actions, 'RegisterEssence')
        .withArgs(
          params.profileId,
          anyValue,
          params.name,
          params.symbol,
          params.essenceTokenURI,
          params.essenceMw,
          anyValue
        )
    })

    it('Should receive the coin if user collect the essence', async function () {
      const { profileNFT, actions, collectPaidMw, coin, user1, user2, userProfile1, userEssence1 } = await loadFixture(
        setupEssenceFixture
      )
      const params = {
        collector: user2.address,
        profileId: userProfile1.profileId,
        essenceId: userEssence1.essenceId,
      }
      const preBalance = await coin.balanceOf(userEssence1.recipient)
      await approveCoin(coin.address, user2, collectPaidMw.address, userEssence1.amount)
      await expect(collectEssence(user2, profileNFT.address, params))
        .to.emit(actions, 'CollectEssence')
        .withArgs(params.collector, params.profileId, params.essenceId, anyValue, anyValue, anyValue)
      const postBalance = await coin.balanceOf(userEssence1.recipient)
      expect(postBalance.gt(preBalance)).to.be.true
    })
  })

  describe('subscribe testing', function () {
    it('Should setup the subscription plan successfully', async function () {
      const { engine, profileNFT, actions, collectPaidMw, subscribePaidMw, coin, user1, userProfile1 } =
        await loadFixture(setupProfileFixture)
      const tokenURI = 'http://localhost:3000/subscription.json'
      const profileId = userProfile1.profileId
      const mv = subscribePaidMw.address
      const data = {
        amount: 1000n,
        recipient: user1.address,
        currency: coin.address,
        nftAddress: '0x0000000000000000000000000000000000000000',
        nftRequired: false,
      }
      const initData = generateSubscribePaidMwInit(data)
      await expect(profileNFT.setSubscribeData(profileId, tokenURI, mv, initData))
        .to.emit(actions, 'SetSubscribeData')
        .withArgs(profileId, tokenURI, mv, anyValue)
    })

    it('Should receive the coin if user subscribe another user', async function () {
      const { profileNFT, actions, subscribePaidMw, coin, user1, user2, userProfile1, user1Subscription } =
        await loadFixture(setupSubscriptionFixture)
      const params = {
        profileIds: [userProfile1.profileId],
      }
      const preBalance = await coin.balanceOf(user1Subscription.recipient)
      await approveCoin(coin.address, user2, subscribePaidMw.address, user1Subscription.amount)
      await expect(profileNFT.connect(user2).subscribe(params, ['0x'], ['0x']))
        .to.emit(actions, 'Subscribe')
        .withArgs(user2.address, params.profileIds, anyValue, anyValue)
      const postBalance = await coin.balanceOf(user1Subscription.recipient)
      expect(postBalance.gt(preBalance)).to.be.true
    })
  })
})
