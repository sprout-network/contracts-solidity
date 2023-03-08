// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.8.14;

import '@openzeppelin/contracts/access/Ownable.sol';
import {ITreasury} from '../../interfaces/ITreasury.sol';

abstract contract FeeMw is Ownable{
    /*//////////////////////////////////////////////////////////////
                              STATES
    //////////////////////////////////////////////////////////////*/
    address public immutable TREASURY; // solhint-disable-line
    address public SPROUT_TREASURY; 
    mapping(uint256 => bool) public isFeeRedirect;
    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address treasury, address sproutTreasury) {
        require(treasury != address(0), 'ZERO_TREASURY_ADDRESS');
        TREASURY = treasury;
        SPROUT_TREASURY = sproutTreasury;
    }

    event FeeRedirect (
        uint256 indexed profileId,
        bool isRedirect
    );
    function setFeeRedirect(uint256 profileId, bool isRedirect) external onlyOwner {
        isFeeRedirect[profileId] = isRedirect;
        emit FeeRedirect(profileId, isRedirect);
    } 

    function setSproutTreasury(address sproutTreasury) external onlyOwner {
        SPROUT_TREASURY = sproutTreasury;
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _currencyAllowed(address currency) internal view returns (bool) {
        return ITreasury(TREASURY).isCurrencyAllowed(currency);
    }

    function _treasuryAddress() internal view returns (address) {
        return ITreasury(TREASURY).getTreasuryAddress();
    }

    function _treasuryFee() internal view returns (uint256) {
        return ITreasury(TREASURY).getTreasuryFee();
    }
}
