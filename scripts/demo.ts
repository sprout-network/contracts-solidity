
import { ethers } from 'hardhat'

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { BigNumber, BigNumberish, Contract, ContractTransaction } from 'ethers'
import * as readline from 'readline'
import { CollectPaidMw, IERC20, SubscribePaidMw } from '../typechain-types'
import { TransferEvent } from '../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { ActionsAbi } from './abi/Actions'
import { CYBERCONNECT_CONTRACT } from './constants'
import { createCCProfile, getProfileId, MwType, setupCurrencyWhitelist, setupMwWhitelist } from './helpers/cyberconnect'
import { approveCoin } from './helpers/erc20'
import { toWrap } from './helpers/nativeCoin'
  const rl = readline.createInterface({
        input: process.stdin, 
        output: process.stdout,
  })

  const abi = ethers.utils.defaultAbiCoder; 
  const emptyData = '0x';

  async function connectCCFixture() {
    const [owner, alice, bob, carl, debby] = await ethers.getSigners()
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

    return { engine, profileNFT, collectPaidMw, subscribePaidMw, coin, alice, bob, carl, debby, sproutTreasury, cyberconnectTreasury, actions, owner};
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

  async function getCollectPaidAmountFromTx(tx: ContractTransaction, collectPaidMw: CollectPaidMw, sproutTreasuryAddress: string, profileId: BigNumberish, essenceId: BigNumberish){
    const events = (await tx.wait()).events;
    const collectPaidEvent = collectPaidMw.filters.CollectPaid(sproutTreasuryAddress, profileId, essenceId);
    let paidAmount: BigNumber = ethers.utils.parseEther('0');
    for (const event of events!!) {
        if(event.topics!![0] === collectPaidEvent.topics!![0] 
            && event.topics!![1].toLowerCase() == collectPaidEvent.topics!![1]
            && event.topics!![2] == collectPaidEvent.topics!![2]
            && event.topics!![3] == collectPaidEvent.topics!![3]
        ){
            const eventData = abi.decode( ['uint256', 'address', 'address'], event.data);
            paidAmount = eventData[0];
            break;
        }
    }
    return paidAmount;
  }

  async function getSubscribePaidAmountFromTx(tx: ContractTransaction, subscribePaidMw: SubscribePaidMw, sproutTreasuryAddress: string, profileId: BigNumber){
    const events = (await tx.wait()).events;
    const collectPaidEvent = subscribePaidMw.filters.SubscribePaid(sproutTreasuryAddress, profileId);
    let paidAmount: BigNumber = ethers.utils.parseEther('0');
    for (const event of events!!) {
        if(event.topics!![0] === collectPaidEvent.topics!![0] 
            && event.topics!![1].toLowerCase() == collectPaidEvent.topics!![1] 
            && event.topics!![2] == collectPaidEvent.topics!![2]
        ){
            const eventData = abi.decode( ['uint256', 'address', 'address'], event.data);
            paidAmount = eventData[0];
            break;
        }
    }
    return paidAmount;
  }

  class PrintHelper{

    private balanceStr: string;
    private cacheStr: string;
    private cached: boolean;
    constructor(private readonly users: { userName: string, address: string, oriBalance: number }[], private readonly coin: IERC20) {
        this.balanceStr = '';
        this.cacheStr = '';
        this.cached = false ;
    }
    
    printSeparator(){
        console.log('========================================'); 
    }

    async pause(){
        await new Promise(resolve => rl.question('press enter to continue', resolve)) ;
    }

    async printLoading(value:string){
        this.printSameLine(`${value} .`)
        await new Promise( resolve => setTimeout(resolve, 1000));
        this.printSameLine(`${value} ..`)
        await new Promise( resolve => setTimeout(resolve, 1000));
        this.printSameLine(`${value} ...`, this.cached);
        this.printNewLine();
    }

    async updateBalance(printCache = true){
        await this.refreshBalance();
        this.clearConsole();
        this.printBalance();
        if(printCache){
            this.printCache();
        }  

    }

    resetCache(){
        this.cacheStr = '';
    }

    printCache(){
        process.stdout.write(this.cacheStr);
    }

    printBalance(){
        console.log(this.balanceStr);
    }

    printSameLine(value: string, cached = false){
        process.stdout.write(`\r${value}`);
        if(cached){
            this.cacheStr = this.cacheStr.concat(value);
        }
    }

    printNewLine(value = ''){
        console.log(value);
        if(this.cached){
            this.cacheStr = this.cacheStr.concat(value + '\n');
        }
    }

    clearConsole(){
        console.clear();
    }

    async refreshBalance(){
        this.balanceStr = await this.getBalance();
    }

    setCached(cached: boolean){
        this.cached = cached;
    }

    private async getBalance(){
        let result = '';
        const title = '#################################### balance ####################################';
        result = result.concat(title + '\n');
        const longestName = this.users.map( user => user.userName ).reduce( (prev, curr) => prev.length > curr.length ? prev: curr );
    
        for (const user of this.users) {
            const balance = await this.coin.balanceOf(user.address);
            if(user.oriBalance == -1){
                user.oriBalance = Number.parseFloat(ethers.utils.formatEther(balance)) ;
            }
            let display = `# ${user.userName} ${' '.repeat(longestName.length - user.userName.length)} original balance: ${user.oriBalance.toFixed(1)} current balance: ${ethers.utils.formatEther(balance)} wbnb`;
            display = display + ' '.repeat(title.length - display.length - 1) + '#';
            result = result.concat(display+ '\n');
        }
        result = result.concat('#'.repeat(title.length)+ '\n');
        
        return result;
      }
    
  }

  function generateWithdrawHash(owner: string, coin: string, depositAmount: BigNumberish, nonce: BigNumberish) {
    const hashToSign = ethers.utils.keccak256(
      ethers.utils.solidityPack(['address', 'address', 'uint256', 'uint256'], [owner, coin, depositAmount, nonce])
    )
    return ethers.utils.arrayify(hashToSign)
  }

  async function main(){

    const { profileNFT, collectPaidMw, subscribePaidMw, coin, alice, bob, carl, debby, sproutTreasury, actions, owner} = await loadFixture(connectCCFixture);

    const userAlice = {userName: 'alice', address:alice.address, oriBalance: -1};
    const userBob = {userName: 'bob', address:bob.address, oriBalance: -1};
    const userCarl = {userName: 'carl', address:carl.address, oriBalance: -1};
    const userDebby = {userName: 'debby', address:debby.address, oriBalance: -1};
    const userSproutTreasury = {userName: 'sproutTreasury', address: sproutTreasury.address, oriBalance: -1}
    const users = [userAlice, userBob, userCarl, userDebby, userSproutTreasury];

    const printHelper = new PrintHelper(users, coin);
    printHelper.clearConsole();
    await printHelper.refreshBalance();
    printHelper.printBalance();
    //   ====================== mint profile  ======================
    printHelper.printNewLine(`alice try to mint profileNFT`);
    let aliceParam = {
        to: alice.address,
        handle: 'alice',
        avatar: 'http://localhost:3000/avatar.png',
        metadata: 'http://localhost:3000/metadata.json',
        operator: '0x0000000000000000000000000000000000000000',
      };

      
    let receiptPromise = createCCProfile(alice, profileNFT.address, aliceParam).then(async (tx) =>  tx.wait())
    await printHelper.printLoading('minting');
    let receipt = await receiptPromise;
    if (!receipt.events) {
    throw new Error('events is null')
    }
    let profileId = getProfileId(<TransferEvent>receipt.events[1]);
    const aliceProfile = { ...aliceParam, profileId };

    printHelper.printNewLine(`profileNFT has been minted, profileId = ${profileId._hex}`);
    printHelper.printNewLine();

    //   ====================== set subscription data  ======================

    const fee = '1';
    const feeEth = ethers.utils.parseEther(fee);
    const subscribeMwData = abi.encode(
    ['uint256', 'address', 'address', 'bool', 'address'],
    [feeEth, alice.address, coin.address, false, '0x0000000000000000000000000000000000000000' ]
    );

    printHelper.printNewLine(`alice try to set up subscribe data with paid middleware , subscribe fee = ${fee} wbnb and recipient = ${alice.address}`);
    let setPromise = profileNFT.connect(alice).setSubscribeData(aliceProfile.profileId, '', subscribePaidMw.address, subscribeMwData)
    await printHelper.printLoading('setting');
    await setPromise; 
    printHelper.printNewLine(`set successfully`);
    printHelper.printNewLine();

    //   ====================== mint essence  ======================
    
    printHelper.printNewLine(`alice try to mint essence nft with paid middleware , collect fee = ${fee} wbnb and recipient = ${alice.address}`);
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
    await printHelper.printLoading('minting');
    const {essenceId, essenceNft} = await getEssenceIdFromTx(tx, actions);
    printHelper.printNewLine(`essenceNft has been minted, essenceId = ${essenceId} essenceNft = ${essenceNft}`);
    // await printHelper.pause();
    printHelper.clearConsole();
    printHelper.printBalance();  

    //  ====================== normal subscribe  ======================

    printHelper.setCached(true);
    printHelper.printNewLine(`bob try to subscribe alice`);
    const bobSubscribePromise = profileNFT.connect(bob).subscribe({ profileIds: [aliceProfile.profileId] } ,[emptyData], [emptyData]);
    await printHelper.printLoading('subscribing');
    await printHelper.updateBalance();
    await bobSubscribePromise ;
    printHelper.printNewLine(`subscribe successfully`);
    printHelper.printNewLine();
    printHelper.printNewLine(`bob try to collect essence of alice`);

    //  ====================== normal collect  ======================

    const collectParam = {
        collector: bob.address,
        profileId: aliceProfile.profileId,
        essenceId: essenceId
    }
    await printHelper.printLoading('collecting');
    const bobCollectPromise = profileNFT.connect(bob).collect(collectParam, emptyData, emptyData)
    await printHelper.updateBalance();
    await bobCollectPromise;
    printHelper.printNewLine(`collect successfully`);
    printHelper.resetCache();
    await printHelper.pause();
    await printHelper.updateBalance();

    //  ====================== redirect fee  ======================

    printHelper.printNewLine(`alice borrow 5 wbnb from carl through sprout`);
    const borrowPromise = coin.connect(carl).transfer(alice.address, ethers.utils.parseEther('5'));
    await printHelper.printLoading('borrowing');
    await borrowPromise;
    await printHelper.updateBalance();

    printHelper.printNewLine(`carl activate bond, redirect subscribe fee to sprout treasury `);
    const subscribeFeeRedirectPromise = subscribePaidMw.setFeeRedirect(aliceProfile.profileId, true);
    const collectFeeRedirectPromise = collectPaidMw.setFeeRedirect(aliceProfile.profileId, true)
    await printHelper.printLoading('setting');
    await subscribeFeeRedirectPromise;
    await collectFeeRedirectPromise; 
    printHelper.printNewLine(`set successfully`);
    printHelper.printNewLine();

    //  ====================== redirect subscribe ======================

    printHelper.printNewLine(`debby try to subscribe alice`);
    const debbySubscribePromise =  profileNFT.connect(debby).subscribe({ profileIds: [aliceProfile.profileId] } ,[emptyData], [emptyData]);
    await printHelper.printLoading('subscribing');
    const debbySubscribeTransaction = await debbySubscribePromise;
    await printHelper.updateBalance();
    printHelper.printNewLine(`subscribe successfully`);
    printHelper.printNewLine();

    //  ====================== redirect collect ======================

    printHelper.printNewLine(`debby try to collect essence of alice`);
    const collectParam2 = {
        collector: debby.address,
        profileId: aliceProfile.profileId,
        essenceId: essenceId
    }
    const debbyCollectPromise = profileNFT.connect(debby).collect(collectParam2, emptyData, emptyData)
    await printHelper.printLoading('collecting');
    const debbyCollectTransaction = await debbyCollectPromise;
    await printHelper.updateBalance();
    printHelper.printNewLine(`collect successfully`);
    await printHelper.pause();

    // ====================== deposit from sprout treasury ======================

    const subscribeFee = await getSubscribePaidAmountFromTx(debbySubscribeTransaction, subscribePaidMw, sproutTreasury.address, profileId);
    const collectFee = await getCollectPaidAmountFromTx(debbyCollectTransaction, collectPaidMw, sproutTreasury.address, profileId, essenceId);
    const depositAmount = subscribeFee.add(collectFee);
    const nonce = (new Date()).getTime()
    
    const withdrawHash = generateWithdrawHash(carl.address, coin.address, depositAmount, nonce);
    const depositProof = await owner.signMessage(withdrawHash);
    printHelper.printNewLine(`carl try to withdraw from sprout treasury`);
    const withdrawPromise = sproutTreasury.connect(carl).whitelistWithdraw(coin.address, depositAmount, nonce, depositProof);
    await printHelper.printLoading('withdrawing');
    await withdrawPromise ;
    await printHelper.updateBalance();
    printHelper.printNewLine(`withdraw successfully`);
    await printHelper.pause();
  }

  main()
  .then(()=>console.log(`exec successfully`))
  .catch((err)=>{
      console.log(`exec fail,err: ${err}`)
      process.exitCode=1
  }).finally(()=>process.exit())