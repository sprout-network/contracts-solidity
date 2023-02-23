pragma solidity ^0.8.0;

interface Data {
    struct LendOrder {
        uint256 loanPrincipalAmount;
        uint256 maxRepaymentAmount;
        uint256 nftCollateralId;
        uint256 loanDuration;
        uint256 loanInterestRateForDurationInBasisPoints;
        address nftCollateralContract;
        address lender;
        uint256 lenderNonce;
    }

    struct BorrowOrder {
        uint256 nftCollateralId;
        address nftCollateralContract;
        address borrower;
        uint256 borrowerNonce;
    }
}
