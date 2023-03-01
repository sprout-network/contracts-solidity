pragma solidity ^0.8.0;
import '@openzeppelin/contracts/interfaces/IERC721.sol';
import './INFTfiAdmin.sol';
import './INFTfiSigningUtils.sol';

interface INFTfi is IERC721, INFTfiAdmin, NFTfiSigningUtils {
    struct Loan {
        uint256 loanId;
        uint256 loanPrincipalAmount;
        uint256 maximumRepaymentAmount;
        uint256 nftCollateralId;
        uint64 loanStartTime;
        uint32 loanDuration;
        uint32 loanInterestRateForDurationInBasisPoints;
        uint32 loanAdminFeeInBasisPoints;
        address nftCollateralContract;
        address loanERC20Denomination;
        address borrower;
        bool interestIsProRated;
    }

    event LoanStarted(
        uint256 loanId,
        address borrower,
        address lender,
        uint256 loanPrincipalAmount,
        uint256 maximumRepaymentAmount,
        uint256 nftCollateralId,
        uint256 loanStartTime,
        uint256 loanDuration,
        uint256 loanInterestRateForDurationInBasisPoints,
        address nftCollateralContract,
        address loanERC20Denomination,
        bool interestIsProRated
    );

    event LoanRepaid(
        uint256 loanId,
        address borrower,
        address lender,
        uint256 loanPrincipalAmount,
        uint256 nftCollateralId,
        uint256 amountPaidToLender,
        uint256 adminFee,
        address nftCollateralContract,
        address loanERC20Denomination
    );

    event LoanLiquidated(
        uint256 loanId,
        address borrower,
        address lender,
        uint256 loanPrincipalAmount,
        uint256 nftCollateralId,
        uint256 loanMaturityDate,
        uint256 loanLiquidationDate,
        address nftCollateralContract
    );

    function beginLoan(
        uint256 _loanPrincipalAmount,
        uint256 _maximumRepaymentAmount,
        uint256 _nftCollateralId,
        uint256 _loanDuration,
        uint256 _loanInterestRateForDurationInBasisPoints,
        uint256 _adminFeeInBasisPoints,
        uint256[2] memory _borrowerAndLenderNonces,
        address _nftCollateralContract,
        address _loanERC20Denomination,
        address _lender,
        bytes memory _borrowerSignature,
        bytes memory _lenderSignature
    ) external;

    function payBackLoan(uint256 _loanId) external;

    function liquidateOverdueLoan(uint256 _loanId) external;

    function cancelLoanCommitmentBeforeLoanHasBegun(uint256 _nonce) external;

    function getPayoffAmount(uint256 _loanId) external view returns (uint256);

    function getWhetherNonceHasBeenUsedForUser(address _user, uint256 _nonce) external view returns (bool);

    function loanIdToLoan(uint _loadId) external view returns (Loan memory);

    function loanRepaidOrLiquidated(uint _loadId) external view returns (bool);
}
