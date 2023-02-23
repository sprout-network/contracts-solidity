pragma solidity ^0.8.0;
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import '../interfaces/Data.sol';

library SignUtils {
    using ECDSA for bytes32;

    function verifyBorrowerSig(Data.BorrowOrder calldata _data, bytes memory borrowerSig) public view returns (bool) {
        if (_data.borrower == address(0)) {
            return false;
        } else {
            uint256 chainId;
            chainId = getChainId();
            bytes32 _msg = keccak256(
                abi.encodePacked(
                    _data.nftCollateralId,
                    _data.borrowerNonce,
                    _data.nftCollateralContract,
                    _data.borrower,
                    chainId
                )
            );

            return verifySig(_data.borrower, _msg, borrowerSig);
        }
    }

    function verifyLenderSig(Data.LendOrder calldata _data, bytes memory _lenderSig) public view returns (bool) {
        if (_data.lender == address(0)) {
            return false;
        } else {
            uint256 chainId;
            chainId = getChainId();
            bytes32 _msg = keccak256(
                abi.encodePacked(
                    _data.loanPrincipalAmount,
                    _data.maxRepaymentAmount,
                    _data.nftCollateralId,
                    _data.loanDuration,
                    _data.loanInterestRateForDurationInBasisPoints,
                    _data.lenderNonce,
                    _data.nftCollateralContract,
                    _data.lender,
                    chainId
                )
            );

            return verifySig(_data.lender, _msg, _lenderSig);
        }
    }

    function verifySig(address _key, bytes32 _msg, bytes memory _sig) public pure returns (bool) {
        return _msg.toEthSignedMessageHash().recover(_sig) == _key;
    }

    function getChainId() internal view returns (uint256) {
        return block.chainid;
    }
}
