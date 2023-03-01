import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumberish } from 'ethers'

export async function mintNFT(nftAddr: string, caller: SignerWithAddress, to: string | null, amount: BigNumberish) {
  const nft = await ethers.getContractAt('NFT', nftAddr, caller)
  let tx
  if (to) {
    tx = await nft.mintTo(to, amount)
  } else {
    tx = await nft.mint(amount)
  }
  await tx.wait()
}

export async function approveNFT(nftAddr: string, caller: SignerWithAddress, spender: string, tokenId: BigNumberish) {
  const nft = await ethers.getContractAt('NFT', nftAddr, caller)
  let tx = await nft.approve(spender, tokenId)
  await tx.wait()
}
