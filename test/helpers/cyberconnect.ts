import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, ContractTransaction, Event } from 'ethers'
import { ethers } from 'hardhat'
import { IERC721__factory } from '../../typechain-types'
import { DataTypes } from '../../typechain-types/contracts/cyberconnect/interfaces/IProfileNFT'

export enum MwType {
  SUBSCRIBE,
  ESSENCE,
  PROFILE
}

export async function createCCProfile(
  user: SignerWithAddress,
  ccProfileAddr: string,
  params: DataTypes.CreateProfileParamsStruct
): Promise<ContractTransaction> {
  const profileNFT = await ethers.getContractAt('IProfileNFT', ccProfileAddr, user)
  const mintFee = ethers.utils.parseEther('1')
  return await profileNFT.createProfile(params, '0x00000000', '0x00000000', { value: mintFee })
}

export function getProfileId(event: Event): BigNumber {
  const iface = IERC721__factory.createInterface()
  const decoded = iface.decodeEventLog('Transfer', event.data, event.topics)
  const profileId = decoded.tokenId
  return profileId
}

export async function setupCurrencyWhitelist(treasuryAddr: string, coinAddr: string) {
  const ownd = await ethers.getContractAt('Owned', treasuryAddr)
  const owner = await ethers.getImpersonatedSigner(await ownd.owner())
  const treasury = await ethers.getContractAt('ITreasury', treasuryAddr, owner)
  await treasury.allowCurrency(coinAddr, true).then((tx) => tx.wait())
}

export async function setupMwWhitelist(engineAddr: string, type: MwType, mwAddr: string) {
  const owned = await ethers.getContractAt('Owned', engineAddr)
  const owner = await ethers.getImpersonatedSigner(await owned.owner())
  const engine = await ethers.getContractAt('ICyberEngine', engineAddr, owner)

  switch(type){
    case MwType.ESSENCE: 
      await engine.allowEssenceMw(mwAddr, true).then((tx) => tx.wait())
    break;
    case MwType.PROFILE: 
      await engine.allowProfileMw(mwAddr, true).then((tx) => tx.wait())
    break;
    case MwType.SUBSCRIBE: 
      await engine.allowSubscribeMw(mwAddr, true).then((tx) => tx.wait())
    break;
  }
  
}