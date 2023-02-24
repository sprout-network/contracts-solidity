pragma solidity ^0.8.0;

interface INFTfiAdmin {
    event AdminFeeUpdated(uint256 newAdminFee);

    function name() external view returns (string memory);

    function symbol() external view returns (string memory);

    function whitelistERC20Currency(address _erc20Currency, bool _setAsWhitelisted) external;

    function whitelistNFTContract(address _nftContract, bool _setAsWhitelisted) external;

    function updateMaximumLoanDuration(uint256 _newMaximumLoanDuration) external;

    function updateMaximumNumberOfActiveLoans(uint256 _newMaximumNumberOfActiveLoans) external;

    function updateAdminFee(uint256 _newAdminFeeInBasisPoints) external;
}
