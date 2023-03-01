import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { BigNumber, BigNumberish } from 'ethers'

export async function ethToWeth(wethAddr:string, user:SignerWithAddress, value:BigNumber) {
  const weth=await ethers.getContractAt('WETH9', wethAddr,user)
  await weth.fallback({value})
}

export async function approveWeth(wethAddr:string, user:SignerWithAddress,spender:string, value:BigNumberish) {
  const weth=await ethers.getContractAt('WETH9', wethAddr,user)
  await weth.approve(spender,value)
}
