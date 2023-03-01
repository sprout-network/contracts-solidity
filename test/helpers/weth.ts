import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { BigNumber } from 'ethers'

export async function ethToWeth(wethAddr:string, user:SignerWithAddress, value:BigNumber) {
  const weth=await ethers.getContractAt('WETH9', wethAddr,user)
  await weth.fallback({value})
}
