import { BigNumberish, ethers } from 'ethers'

interface BorrowerOrder {
  nftCollateralId: BigNumberish
  borrowerNonce: BigNumberish
  nftCollateralContract: string
  borrower: string
  chainId: BigNumberish
}

interface LenderOrder {
  loanPrincipalAmount: BigNumberish
  maximumRepaymentAmount: BigNumberish
  nftCollateralId: BigNumberish
  loanDuration: BigNumberish
  loanInterestRateForDurationInBasisPoints: BigNumberish
  adminFeeInBasisPoints: BigNumberish
  lenderNonce: BigNumberish
  nftCollateralContract: string
  loanERC20Denomination: string
  lender: string
  interestIsProRated: boolean
  chainId: BigNumberish
}

export function generateBorrowerHash({
  nftCollateralId,
  borrowerNonce,
  nftCollateralContract,
  borrower,
  chainId,
}: BorrowerOrder) {
  const hashToSign = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['uint256', 'uint256', 'address', 'address', 'uint256'],
      [nftCollateralId, borrowerNonce, nftCollateralContract, borrower, chainId]
    )
  )
  return ethers.utils.arrayify(hashToSign)
}

export function generateLenderHash({
  loanPrincipalAmount,
  maximumRepaymentAmount,
  nftCollateralId,
  loanDuration,
  loanInterestRateForDurationInBasisPoints,
  adminFeeInBasisPoints,
  lenderNonce,
  nftCollateralContract,
  loanERC20Denomination,
  lender,
  interestIsProRated,
  chainId,
}: LenderOrder) {
  const hashToSign = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      [
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'address',
        'address',
        'address',
        'bool',
        'uint256',
      ],
      [
        loanPrincipalAmount,
        maximumRepaymentAmount,
        nftCollateralId,
        loanDuration,
        loanInterestRateForDurationInBasisPoints,
        adminFeeInBasisPoints,
        lenderNonce,
        nftCollateralContract,
        loanERC20Denomination,
        lender,
        interestIsProRated,
        chainId,
      ]
    )
  )
  return ethers.utils.arrayify(hashToSign)
}
