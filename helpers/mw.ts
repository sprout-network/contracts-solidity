import { BigNumberish, ethers } from 'ethers'
import { BorrowerOrder } from './order'

export interface CollectPaidMwData {
  totalSupply: BigNumberish
  amount: BigNumberish
  recipient: string
  currency: string
  subscribeRequired: boolean
}

export function generateCollectPaidMwInit({
  totalSupply,
  amount,
  recipient,
  currency,
  subscribeRequired,
}: CollectPaidMwData) {
  const abi = ethers.utils.defaultAbiCoder
  const initData = abi.encode(
    ['uint256', 'uint256', 'address', 'address', 'bool'],
    [totalSupply, amount, recipient, currency, subscribeRequired]
  )
  return initData
}
