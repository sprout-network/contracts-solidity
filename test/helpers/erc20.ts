import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { BigNumberish } from 'ethers'

export async function approveCoin(erc20Addr: string, from: SignerWithAddress, spender: string, value: BigNumberish) {
  const erc20 = await ethers.getContractAt('IERC20', erc20Addr, from)
  const tx = await erc20.approve(spender, value)
  await tx.wait()
}
