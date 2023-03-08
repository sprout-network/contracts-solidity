// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity 0.8.14;

import {DataTypes} from '../libraries/DataTypes.sol';
import {Constants} from '../libraries/Constants.sol';
import {LibString} from '../libraries/LibString.sol';

interface IActionsEvent {
    event DeploySubscribeNFT(uint256 indexed profileId, address indexed subscribeNFT);
    event RegisterEssence(
        uint256 indexed profileId,
        uint256 indexed essenceId,
        string name,
        string symbol,
        string essenceTokenURI,
        address essenceMw,
        bytes prepareReturnData
    );
    event DeployEssenceNFT(uint256 indexed profileId, uint256 indexed essenceId, address indexed essenceNFT);
    event CollectEssence(
        address indexed collector,
        uint256 indexed profileId,
        uint256 indexed essenceId,
        uint256 tokenId,
        bytes preData,
        bytes postData
    );
    event Subscribe(address indexed sender, uint256[] profileIds, bytes[] preDatas, bytes[] postDatas);

    event SetSubscribeData(uint256 indexed profileId, string tokenURI, address mw, bytes prepareReturnData);

    event SetEssenceData(
        uint256 indexed profileId,
        uint256 indexed essenceId,
        string tokenURI,
        address mw,
        bytes prepareReturnData
    );

    event CreateProfile(address indexed to, uint256 indexed profileId, string handle, string avatar, string metadata);

    event SetPrimaryProfile(address indexed user, uint256 indexed profileId);

    event SetOperatorApproval(uint256 indexed profileId, address indexed operator, bool prevApproved, bool approved);
}
