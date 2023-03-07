import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { ethers } from 'hardhat'
import { Event } from 'ethers'
import { expect } from 'chai'
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { DataTypes } from '../../typechain-types/contracts/cyberconnect/interfaces/IProfileNFT'
import { BigNumber, ContractTransaction } from 'ethers'
import { TransferEvent } from '../../typechain-types/@openzeppelin/contracts/token/ERC721/IERC721'
import { IERC721__factory } from '../../typechain-types'

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
