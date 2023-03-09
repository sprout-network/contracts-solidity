import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { BigNumber, BigNumberish } from 'ethers'

export async function toWrap(coinAddr: string, user: SignerWithAddress, value: BigNumber) {
  const coin = await ethers.getContractAt('WBNB', coinAddr, user)
  const tx = await coin.fallback({ value })
  await tx.wait()
}

export async function approveWrappedCoin(
  coinAddr: string,
  user: SignerWithAddress,
  spender: string,
  value: BigNumberish
) {
  const coin = await ethers.getContractAt('WBNB', coinAddr, user)
  const tx = await coin.approve(spender, value)
  await tx.wait()
}
