import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BorrowerOrder, generateBorrowerHash, generateLenderHash, LenderOrder } from '../../helpers/order'

export async function addNftToWhitelist(nftfiAddr: string, nftfiOwner: string, nftAddress: string) {
  const owner = await ethers.getImpersonatedSigner(nftfiOwner)
  const nftfi = await ethers.getContractAt('INFTfi', nftfiAddr,owner)
  await nftfi.whitelistNFTContract(nftAddress,true)
}

export async function signOrder(signer:SignerWithAddress,type:string,order:BorrowerOrder|LenderOrder):Promise<string>{
  let hash;
  switch (type) {
    case "BORROW":
      hash=generateBorrowerHash(<BorrowerOrder>order)
      break
    case "LEND":
      hash=generateLenderHash(<LenderOrder>order)
      break
    default:
      throw new Error(`(signOrder)type not found: ${type}`)
  }
  return await signer.signMessage(hash)
}
