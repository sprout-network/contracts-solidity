import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumberish } from 'ethers'
import { ethers } from 'hardhat'

export async function depositToTreasury(
  treasuryAddr: string,
  caller: SignerWithAddress,
  poolId: BigNumberish,
  coin: string,
  value: BigNumberish
) {
  const treasury = await ethers.getContractAt('Treasury', treasuryAddr, caller)
  const tx = await treasury.deposit(poolId, coin, value)
  await tx.wait()
}

export async function withdrawFromTreasury(
  treasuryAddr: string,
  caller: SignerWithAddress,
  poolId: BigNumberish,
  coin: string,
  value: BigNumberish
) {
  const treasury = await ethers.getContractAt('Treasury', treasuryAddr, caller)
  const tx = await treasury.withdraw(poolId, coin, value)
  await tx.wait()
}
