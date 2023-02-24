pragma solidity ^0.8.0;

interface NFTfiSigningUtils {
    function getChainID() external view returns (uint256);

    function isValidBorrowerSignature(
        uint256 _nftCollateralId,
        uint256 _borrowerNonce,
        address _nftCollateralContract,
        address _borrower,
        bytes memory _borrowerSignature
    ) external view returns (bool);

    function isValidLenderSignature(
        uint256 _loanPrincipalAmount,
        uint256 _maximumRepaymentAmount,
        uint256 _nftCollateralId,
        uint256 _loanDuration,
        uint256 _loanInterestRateForDurationInBasisPoints,
        uint256 _adminFeeInBasisPoints,
        uint256 _lenderNonce,
        address _nftCollateralContract,
        address _loanERC20Denomination,
        address _lender,
        bool _interestIsProRated,
        bytes memory _lenderSignature
    ) external view returns (bool);
}
