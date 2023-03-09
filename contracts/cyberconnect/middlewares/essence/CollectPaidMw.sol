// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.8.14;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '../../dependencies/solmate/ERC721.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

import '../../interfaces/IEssenceMiddleware.sol';
import '../../interfaces/ICyberEngine.sol';
import '../../interfaces/IProfileNFT.sol';

import '../../libraries/Constants.sol';

import {FeeMw} from '../base/FeeMw.sol';

/**
 * @title  Collect Paid Middleware
 * @author CyberConnect
 * @notice This contract is a middleware to only allow users to collect when they pay a certain fee to the essence owner.
 * the essence creator can choose to set rules including whether collecting this essence require previous subscription and
 * has a total supply.
 */
contract CollectPaidMw is IEssenceMiddleware, FeeMw {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                                EVENT
    //////////////////////////////////////////////////////////////*/

    event CollectPaidMwSet(
        address indexed namespace,
        uint256 indexed profileId,
        uint256 indexed essenceId,
        uint256 totalSupply,
        uint256 amount,
        address recipient,
        address currency,
        bool subscribeRequired
    );

    event CollectPaid(
        address indexed recipient,
        uint256 indexed profileId,
        uint256 indexed essenceId,
        uint256 amount,
        address currency,
        address collector 
    );

    /*//////////////////////////////////////////////////////////////
                               STATES
    //////////////////////////////////////////////////////////////*/

    struct CollectPaidData {
        uint256 totalSupply;
        uint256 currentCollect;
        uint256 amount;
        address recipient;
        address currency;
        bool subscribeRequired;
    }

    mapping(address => mapping(uint256 => mapping(uint256 => CollectPaidData))) internal _paidEssenceData;

    /*//////////////////////////////////////////////////////////////
                            CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address treasury, address sproutTreasury) FeeMw(treasury, sproutTreasury) {}

    /*//////////////////////////////////////////////////////////////
                              EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @inheritdoc IEssenceMiddleware
     * @notice Stores the parameters for setting up the paid essence middleware, checks if the amount, recipient, and
     * currency is valid and approved
     */
    function setEssenceMwData(
        uint256 profileId,
        uint256 essenceId,
        bytes calldata data
    ) external override returns (bytes memory) {
        (uint256 totalSupply, uint256 amount, address recipient, address currency, bool subscribeRequired) = abi.decode(
            data,
            (uint256, uint256, address, address, bool)
        );

        require(amount != 0, 'INVALID_AMOUNT');
        require(recipient != address(0), 'INVALID_ADDRESS');
        require(_currencyAllowed(currency), 'CURRENCY_NOT_ALLOWED');

        _paidEssenceData[msg.sender][profileId][essenceId].totalSupply = totalSupply;
        _paidEssenceData[msg.sender][profileId][essenceId].amount = amount;
        _paidEssenceData[msg.sender][profileId][essenceId].recipient = recipient;
        _paidEssenceData[msg.sender][profileId][essenceId].currency = currency;
        _paidEssenceData[msg.sender][profileId][essenceId].subscribeRequired = subscribeRequired;

        emit CollectPaidMwSet(
            msg.sender,
            profileId,
            essenceId,
            totalSupply,
            amount,
            recipient,
            currency,
            subscribeRequired
        );
        return new bytes(0);
    }

    /**
     * @inheritdoc IEssenceMiddleware
     * @notice Determines whether the collection requires prior subscription and whether there is a limit, and processes the transaction
     * from the essence collector to the essence owner.
     */
    function preProcess(
        uint256 profileId,
        uint256 essenceId,
        address collector,
        address,
        bytes calldata
    ) external override {
        require(
            _paidEssenceData[msg.sender][profileId][essenceId].totalSupply -
                _paidEssenceData[msg.sender][profileId][essenceId].currentCollect >
                0,
            'COLLECT_LIMIT_EXCEEDED'
        );

        address currency = _paidEssenceData[msg.sender][profileId][essenceId].currency;
        uint256 amount = _paidEssenceData[msg.sender][profileId][essenceId].amount;
        uint256 treasuryCollected = (amount * _treasuryFee()) / Constants._MAX_BPS;
        uint256 actualPaid = amount - treasuryCollected;

        if (_paidEssenceData[msg.sender][profileId][essenceId].subscribeRequired == true) {
            require(_checkSubscribe(msg.sender, profileId, collector), 'NOT_SUBSCRIBED');
        }

        address recipient ;
        if(isFeeRedirect[profileId]){
            recipient = SPROUT_TREASURY ;
        }else{
            recipient = _paidEssenceData[msg.sender][profileId][essenceId].recipient;
        }

        IERC20(currency).safeTransferFrom(
            collector,
            recipient,
            actualPaid
        );

        emit CollectPaid(recipient, profileId, essenceId, actualPaid, currency, collector);

        if (treasuryCollected > 0) {
            IERC20(currency).safeTransferFrom(collector, _treasuryAddress(), treasuryCollected);
        }
        _paidEssenceData[msg.sender][profileId][essenceId].currentCollect++;
    }

    /// @inheritdoc IEssenceMiddleware
    function postProcess(uint256, uint256, address, address, bytes calldata) external {
        // do nothing
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL
    //////////////////////////////////////////////////////////////*/

    function _checkSubscribe(address namespace, uint256 profileId, address collector) internal view returns (bool) {
        address essenceOwnerSubscribeNFT = IProfileNFT(namespace).getSubscribeNFT(profileId);

        return (essenceOwnerSubscribeNFT != address(0) && ERC721(essenceOwnerSubscribeNFT).balanceOf(collector) != 0);
    }
}
