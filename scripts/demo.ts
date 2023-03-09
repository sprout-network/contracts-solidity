
import { ethers } from 'hardhat'

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { BigNumberish, Contract, ContractTransaction } from 'ethers'
import { IERC20 } from '../typechain-types'
import { TransferEvent } from '../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { ActionsAbi } from './abi/Actions'
import { CYBERCONNECT_CONTRACT } from './constants'
import { createCCProfile, getProfileId, MwType, setupCurrencyWhitelist, setupMwWhitelist } from './helpers/cyberconnect'
import { approveCoin } from './helpers/erc20'
import { toWrap } from './helpers/nativeCoin'

function printSeparator(){
    console.log('========================================');
}

async function connectCCFixture() {
    const [alice, bob, carl, debby] = await ethers.getSigners()
    const coinAddr = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'; //WBNB
    const coin = await ethers.getContractAt('IERC20', coinAddr);

    const engine = await ethers.getContractAt('ICyberEngine', CYBERCONNECT_CONTRACT.EngineProxy);
    await engine.deployed();

    const actions = await ethers.getContractAt(ActionsAbi, CYBERCONNECT_CONTRACT.Action);
    await actions.deployed();
    
    const profileNFT = await ethers.getContractAt('IProfileNFT', CYBERCONNECT_CONTRACT.CCProfile);
    await profileNFT.deployed();

    const cyberconnectTreasury = await ethers.getContractAt('ITreasury', CYBERCONNECT_CONTRACT.CyberConnectTreasury);
    await cyberconnectTreasury.deployed();

    const SproutTreasury = await ethers.getContractFactory('Treasury');
    const sproutTreasury = await SproutTreasury.deploy([coin.address]);
    await sproutTreasury.deployed();

    const CollectPaidMw = await ethers.getContractFactory('CollectPaidMw')
    const collectPaidMw = await CollectPaidMw.deploy(cyberconnectTreasury.address, sproutTreasury.address);
    await collectPaidMw.deployed();

    const SubscribePaidMw = await ethers.getContractFactory('SubscribePaidMw');
    const subscribePaidMw = await SubscribePaidMw.deploy(cyberconnectTreasury.address, sproutTreasury.address);
    await subscribePaidMw.deployed();

    await setupCurrencyWhitelist(CYBERCONNECT_CONTRACT.CyberConnectTreasury, coin.address);
    await setupMwWhitelist(CYBERCONNECT_CONTRACT.EngineProxy, MwType.SUBSCRIBE, subscribePaidMw.address);
    await setupMwWhitelist(CYBERCONNECT_CONTRACT.EngineProxy, MwType.ESSENCE, collectPaidMw.address);

    await toWrap(coinAddr, alice, ethers.utils.parseEther('20'));
    await toWrap(coinAddr, bob, ethers.utils.parseEther('20'));
    await toWrap(coinAddr, carl, ethers.utils.parseEther('20'));
    await toWrap(coinAddr, debby, ethers.utils.parseEther('20'));

    await approveCoin(coin.address, alice, collectPaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, bob, collectPaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, carl, collectPaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, debby, collectPaidMw.address, ethers.utils.parseEther('10'));

    await approveCoin(coin.address, alice, subscribePaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, bob, subscribePaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, carl, subscribePaidMw.address, ethers.utils.parseEther('10'));
    await approveCoin(coin.address, debby, subscribePaidMw.address, ethers.utils.parseEther('10'));

    return { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, alice, bob, carl, debby, sproutTreasury, cyberconnectTreasury, actions};
  }


  async function getEssenceIdFromTx(tx: ContractTransaction, actions:Contract){
    const events = (await tx.wait()).events;
    const registerEssenceEvent = actions.filters.DeployEssenceNFT()
    let essenceId: BigNumberish = 0  
    let essenceNft:string = '';
    for (const event of events!!) {
      if(event.topics!![0] === registerEssenceEvent.topics!![0]){
        essenceId = event.args!![1]
        essenceNft = event.args!![2]
      } 
    }
    return {essenceId, essenceNft};
  }

  async function printBalance(users: { userName: string, address: string }[], coin: IERC20){
    const title = '################ balance ################';
    console.log(title);
    const longestName = users.map( user => user.userName ).reduce( (prev, curr) => prev.length > curr.length ? prev: curr );

    for (const user of users) {
        const balance = await coin.balanceOf(user.address);
        let display = `# ${user.userName} ${' '.repeat(longestName.length - user.userName.length)}: ${ethers.utils.formatEther(balance)} wbnb`;
        display = display + ' '.repeat(title.length - display.length - 1) + '#';
        console.log(display);
    }
    console.log('#'.repeat(title.length));
  }

  const abi = ethers.utils.defaultAbiCoder;
  const emptyData = '0x';


  async function main(){

    const { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, alice, bob, carl, debby, sproutTreasury, cyberconnectTreasury, actions} = await loadFixture(connectCCFixture);

    const userAlice = {userName: 'alice', address:alice.address};
    const userBob = {userName: 'bob', address:bob.address};
    const userCarl = {userName: 'carl', address:carl.address};
    const userDebby = {userName: 'debby', address:debby.address};
    const userSproutTreasury = {userName: 'sproutTreasury', address: sproutTreasury.address}
    const users = [userAlice, userBob, userCarl, userDebby, userSproutTreasury];

    printSeparator();
    console.log(`alice try to mint profileNFT`);

    let aliceParam = {
        to: alice.address,
        handle: 'alice',
        avatar: 'http://localhost:3000/avatar.png',
        metadata: 'http://localhost:3000/metadata.json',
        operator: '0x0000000000000000000000000000000000000000',
      };

      let receipt = await createCCProfile(alice, profileNFT.address, aliceParam).then((tx) => tx.wait());
      if (!receipt.events) {
        throw new Error('events is null');
      }
      let profileId = getProfileId(<TransferEvent>receipt.events[1]);
      const aliceProfile = { ...aliceParam, profileId };

      console.log(`profileNFT has been minted, profileId = ${profileId._hex}`);
      printSeparator();
      const fee = '1';
      const feeEth = ethers.utils.parseEther(fee);
      const subscribeMwData = abi.encode(
        ['uint256', 'address', 'address', 'bool', 'address'],
        [feeEth, alice.address, coin.address, false, '0x0000000000000000000000000000000000000000' ]
      );

      console.log(`alice try to set up subscribe data with paid middleware , subscribe fee = ${fee} wbnb and recipient = ${alice.address}`);
      await profileNFT.setSubscribeData(aliceProfile.profileId, '', subscribePaidMw.address, subscribeMwData)
      console.log(`subscribe data has been set up`);

      printSeparator();
      console.log(`alice try to mint essence fnt with paid middleware , collect fee = ${fee} wbnb and recipient = ${alice.address}`);
      const totalSupply = 100000n
      const params = {
        profileId: aliceProfile.profileId,
        name: 'essence1',
        symbol: 'E1',
        essenceTokenURI: 'http://localhost:3000/essence.json',
        essenceMw: collectPaidMw.address,
        transferable: false,
        deployAtRegister: true,
      }
      const initData = abi.encode(
        ['uint256', 'uint256', 'address', 'address', 'bool'],
        [totalSupply, feeEth, alice.address, coin.address, false]
      )
      const tx = await profileNFT.connect(alice).registerEssence(params, initData);
      const {essenceId, essenceNft} = await getEssenceIdFromTx(tx, actions);
      console.log(`essenceNft has been minted, essenceId = ${essenceId} essenceNft = ${essenceNft}`);
      
      printSeparator();

      await printBalance(users, coin);
      console.log(`bob try to subscribe alice`);
      await profileNFT.connect(bob).subscribe({ profileIds: [aliceProfile.profileId] } ,[emptyData], [emptyData]);
      console.log(`subscribe success`);
      await printBalance(users, coin);
      console.log(`bob try to collect essence of alice`);
      const collectParam = {
        collector: bob.address,
        profileId: aliceProfile.profileId,
        essenceId: essenceId
      }
      await profileNFT.connect(bob).collect(collectParam, emptyData, emptyData)
      console.log(`collect success`);
      await printBalance(users, coin);
      printSeparator();      

      console.log(`bond of alice has been activate, redirect subscribe fee to sprout treasury `);
      await subscribePaidMw.setFeeRedirect(aliceProfile.profileId, true);
      await collectPaidMw.setFeeRedirect(aliceProfile.profileId, true)
      printSeparator();
      console.log(`carl try to subscribe alice`);
      await printBalance(users, coin);
      await profileNFT.connect(carl).subscribe({ profileIds: [aliceProfile.profileId] } ,[emptyData], [emptyData]);
      console.log(`subscribe success`);
      await printBalance(users, coin);

      console.log(`debby try to collect essence of alice`);
      const collectParam2 = {
        collector: debby.address,
        profileId: aliceProfile.profileId,
        essenceId: essenceId
      }
      await profileNFT.connect(debby).collect(collectParam2, emptyData, emptyData)
      console.log(`collect success`);
      await printBalance(users, coin);
      printSeparator();      

  }

  main()
  .then(()=>console.log(`exec successfully`))
  .catch((err)=>{
      console.log(`exec fail,err: ${err}`)
      process.exitCode=1
  }).finally(()=>process.exit())