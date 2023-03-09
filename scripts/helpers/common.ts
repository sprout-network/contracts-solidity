import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber } from 'ethers'

export async function transferETH(from: SignerWithAddress, to: string, value: BigNumber) {
  const tx = await from.sendTransaction({
    to,
    value,
  })
  await tx.wait()
}
