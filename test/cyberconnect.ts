import { ethers } from 'hardhat'

import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumberish } from 'ethers'
import { TransferEvent } from '../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { ActionsAbi } from './abi/Actions'
import { CYBERCONNECT_CONTRACT } from './constants'
import { createCCProfile, getProfileId, MwType, setupCurrencyWhitelist, setupMwWhitelist } from './helpers/cyberconnect'
import { approveCoin } from './helpers/erc20'
import { toWrap } from './helpers/nativeCoin'

const abi = ethers.utils.defaultAbiCoder

describe('CyberConnect testing', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function connectCCFixture() {
    const [user1, user2] = await ethers.getSigners()
    const coinAddr = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' //WBNB
    const coin = await ethers.getContractAt('IERC20', coinAddr)

    const engine = await ethers.getContractAt('ICyberEngine', CYBERCONNECT_CONTRACT.EngineProxy)
    await engine.deployed()

    const actions = await ethers.getContractAt(ActionsAbi, CYBERCONNECT_CONTRACT.Action)
    await actions.deployed()
    
    const profileNFT = await ethers.getContractAt('IProfileNFT', CYBERCONNECT_CONTRACT.CCProfile)
    await profileNFT.deployed()

    const cyberconnectTreasury = await ethers.getContractAt('ITreasury', CYBERCONNECT_CONTRACT.CyberConnectTreasury)
    await cyberconnectTreasury.deployed()

    const SproutTreasury = await ethers.getContractFactory('Treasury')
    const sproutTreasury = await SproutTreasury.deploy([coin.address])
    await sproutTreasury.deployed()

    const CollectPaidMw = await ethers.getContractFactory('CollectPaidMw')
    const collectPaidMw = await CollectPaidMw.deploy(cyberconnectTreasury.address, sproutTreasury.address);
    await collectPaidMw.deployed()

    const SubscribePaidMw = await ethers.getContractFactory('SubscribePaidMw')
    const subscribePaidMw = await SubscribePaidMw.deploy(cyberconnectTreasury.address, sproutTreasury.address)
    await subscribePaidMw.deployed()

    await toWrap(coinAddr, user1, ethers.utils.parseEther('10'))
    await toWrap(coinAddr, user2, ethers.utils.parseEther('10'))
    await setupCurrencyWhitelist(CYBERCONNECT_CONTRACT.CyberConnectTreasury, coin.address)
    await setupMwWhitelist(CYBERCONNECT_CONTRACT.EngineProxy, MwType.SUBSCRIBE, subscribePaidMw.address);
    await setupMwWhitelist(CYBERCONNECT_CONTRACT.EngineProxy, MwType.ESSENCE, collectPaidMw.address);
    return { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, user1, user2, sproutTreasury, cyberconnectTreasury, actions }
  }

  async function setupProfileFixture() {
    const { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, user1, user2, sproutTreasury, cyberconnectTreasury, actions} = await loadFixture(connectCCFixture)
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
    return { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, user1, user2, userProfile1, userProfile2, sproutTreasury, cyberconnectTreasury, actions }
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
      const initData = abi.encode(
        ['uint256', 'uint256', 'address', 'address', 'bool'],
        [1000000n, 1000n, user1.address, coin.address, true]
      )
      await expect(profileNFT.connect(user1).registerEssence(params, initData)).to.emit(profileNFT, 'DeployEssenceNFT')
    })
  })

  describe('fee redirect', function() {
    it('normal collect paid ', async function() {
      const { engine, profileNFT, collectPaidMw, coin, user1, user2, userProfile1, userProfile2, actions } = await loadFixture(
        setupProfileFixture
      )

      await approveCoin(coin.address, user2, collectPaidMw.address, ethers.utils.parseEther('10'));

      const subscribeFee = ethers.utils.parseEther('1');
      const totalSupply = 100000n
      const params = {
        profileId: userProfile1.profileId,
        name: 'firstshit',
        symbol: 'SHIT',
        essenceTokenURI: 'http://localhost:3000/essence.json',
        essenceMw: collectPaidMw.address,
        transferable: false,
        deployAtRegister: true,
      }
      const initData = abi.encode(
        ['uint256', 'uint256', 'address', 'address', 'bool'],
        [totalSupply, subscribeFee, user1.address, coin.address, false]
      )
      const tx = await profileNFT.connect(user1).registerEssence(params, initData);
      const events = (await tx.wait()).events;
      const registerEssenceEvent = actions.filters.DeployEssenceNFT(userProfile1.profileId)
      let essenceId: BigNumberish = 0  
      let essenceNft:string = '';
      for (const event of events!!) {
        if(event.topics!![0] === registerEssenceEvent.topics!![0]){
          essenceId = event.args!![1]
          essenceNft = event.args!![2]
        } 
      }      
      
      const collectParam = {
        collector: user2.address,
        profileId: userProfile1.profileId,
        essenceId: essenceId
      }

      const preprocessData = abi.encode(
        [],
        []
      )

      const postprocessData = abi.encode(
        [],
        []
      )

      const receiver = user1.address
      const balanceBeforeSubscribe = await coin.balanceOf(receiver);
      expect(profileNFT.collect(collectParam, preprocessData, postprocessData)).to.emit(profileNFT, 'CollectEssence')
      const balanceAfterSubscribe = await coin.balanceOf(receiver);
      const subscribeTax = ethers.utils.parseEther('0.025');
      expect(balanceAfterSubscribe).equal(balanceBeforeSubscribe.add(subscribeFee).sub(subscribeTax));
    })

    it('redirect collect paid ', async function() {
      const { engine, profileNFT, collectPaidMw, coin, user1, user2, userProfile1, userProfile2, actions, sproutTreasury } = await loadFixture(
        setupProfileFixture
      )

      await approveCoin(coin.address, user2, collectPaidMw.address, ethers.utils.parseEther('10'));

      const subscribeFee = ethers.utils.parseEther('1');
      const totalSupply = 100000n
      const params = {
        profileId: userProfile1.profileId,
        name: 'firstshit',
        symbol: 'SHIT',
        essenceTokenURI: 'http://localhost:3000/essence.json',
        essenceMw: collectPaidMw.address,
        transferable: false,
        deployAtRegister: true,
      }
      const initData = abi.encode(
        ['uint256', 'uint256', 'address', 'address', 'bool'],
        [totalSupply, subscribeFee, user1.address, coin.address, false]
      )
      const tx = await profileNFT.connect(user1).registerEssence(params, initData);
      const events = (await tx.wait()).events;
      const registerEssenceEvent = actions.filters.DeployEssenceNFT(userProfile1.profileId)
      let essenceId: BigNumberish = 0  
      let essenceNft:string = '';
      for (const event of events!!) {
        if(event.topics!![0] === registerEssenceEvent.topics!![0]){
          essenceId = event.args!![1]
          essenceNft = event.args!![2]
        } 
      }
      
      const collectParam = {
        collector: user2.address,
        profileId: userProfile1.profileId,
        essenceId: essenceId
      }

      const preprocessData = abi.encode(
        [],
        []
      )

      const postprocessData = abi.encode(
        [],
        []
      )

      await expect(collectPaidMw.setFeeRedirect(userProfile1.profileId, true)).to.emit(collectPaidMw, 'FeeRedirect')

      const receiver = sproutTreasury.address
      const balanceBeforeSubscribe = await coin.balanceOf(receiver);
      expect(profileNFT.collect(collectParam, preprocessData, postprocessData)).to.emit(profileNFT, 'CollectEssence')
      const balanceAfterSubscribe = await coin.balanceOf(receiver);
      const subscribeTax = ethers.utils.parseEther('0.025');
      expect(balanceAfterSubscribe).equal(balanceBeforeSubscribe.add(subscribeFee).sub(subscribeTax));
    })

    it('normal subscribe paid', async function() {
      const { profileNFT, subscribePaidMw, coin, user1, user2, userProfile1 } = await loadFixture(
        setupProfileFixture
      )
      const subscribeFee = ethers.utils.parseEther('1');
      await approveCoin(coin.address, user2, subscribePaidMw.address, ethers.utils.parseEther('10'));
      const subscribeMwData = abi.encode(
        ['uint256', 'address', 'address', 'bool', 'address'],
        [subscribeFee, user1.address, coin.address, false, '0x0000000000000000000000000000000000000000' ]
      )

      const preprocessData = abi.encode(
        [],
        []
      )

      const postprocessData = abi.encode(
        [],
        []
      )

      const receiver = user1.address
      await expect(profileNFT.setSubscribeData(userProfile1.profileId, '', subscribePaidMw.address, subscribeMwData)).to.emit(profileNFT, 'SetSubscribeData')
      const profileIds: BigNumberish[] = [userProfile1.profileId];
      
      const balanceBeforeSubscribe = await coin.balanceOf(receiver);
      await expect(profileNFT.connect(user2).subscribe({ profileIds } ,[preprocessData], [postprocessData])).to.emit(profileNFT, 'Subscribe');
      const balanceAfterSubscribe = await coin.balanceOf(receiver);
      const subscribeTax = ethers.utils.parseEther('0.025');
      expect(balanceAfterSubscribe).equal(balanceBeforeSubscribe.add(subscribeFee).sub(subscribeTax));

    })

    it('redirect subscribe paid', async function() {
      const { profileNFT, subscribePaidMw, coin, user1, user2, userProfile1, sproutTreasury } = await loadFixture(
        setupProfileFixture
      )
      const subscribeFee = ethers.utils.parseEther('1');
      await approveCoin(coin.address, user2, subscribePaidMw.address, ethers.utils.parseEther('10'));
      const subscribeMwData = abi.encode(
        ['uint256', 'address', 'address', 'bool', 'address'],
        [subscribeFee, user1.address, coin.address, false, '0x0000000000000000000000000000000000000000' ]
      )

      const preprocessData = abi.encode(
        [],
        []
      )

      const postprocessData = abi.encode(
        [],
        []
      )

      const receiver = sproutTreasury.address
      await expect(profileNFT.setSubscribeData(userProfile1.profileId, '', subscribePaidMw.address, subscribeMwData)).to.emit(profileNFT, 'SetSubscribeData')
      await expect(subscribePaidMw.setFeeRedirect(userProfile1.profileId, true)).to.emit(subscribePaidMw, 'FeeRedirect')
      
      const profileIds: BigNumberish[] = [userProfile1.profileId];
      const balanceBeforeSubscribe = await coin.balanceOf(receiver);
      await expect(profileNFT.connect(user2).subscribe({ profileIds } ,[preprocessData], [postprocessData])).to.emit(profileNFT, 'Subscribe');
      const balanceAfterSubscribe = await coin.balanceOf(receiver);
      const subscribeTax = ethers.utils.parseEther('0.025');
      expect(balanceAfterSubscribe).equal(balanceBeforeSubscribe.add(subscribeFee).sub(subscribeTax));

    })

  })

})
