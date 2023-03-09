pragma solidity ^0.8.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC721.sol';
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import './TreasuryAdmin.sol';

contract Treasury is TreasuryAdmin {
    struct PoolInfo {
        address nft;
        uint256 nftId;
        address coin;
        uint256 balances;
    }

    event PoolCreated(uint256 poolId, address indexed nftAddress, uint256 indexed nftId);

    event Deposit(uint256 indexed poolId, address indexed from, address indexed coin, uint256 amount);

    event Withdraw(uint256 indexed poolId, address indexed to, address indexed coin, uint256 amount);

    event WhitelistWithdraw(address indexed to, address indexed coin, uint256 amount);

    mapping(address => mapping(uint256 => uint256)) public getPoolId;

    mapping(uint256 => PoolInfo) public getPoolInfo;

    mapping(uint256 => bool) public isActive;

    mapping(uint256 => bool) public isNonceUsed;

    uint256 public totalNumPool = 0;
    address private _signer;

    constructor(address[] memory _coins) TreasuryAdmin(_coins) {
        _signer = owner();
    }

    using ECDSA for bytes32;

    function createPool(
        address _nftAddress,
        uint256 _nftId,
        address _coin
    ) external validCoin(_coin) returns (uint256 _poolId) {
        _poolId = totalNumPool;
        PoolInfo memory _info = PoolInfo({nft: _nftAddress, nftId: _nftId, coin: _coin, balances: 0});
        getPoolId[_nftAddress][_nftId] = _poolId;
        getPoolInfo[_poolId] = _info;
        isActive[_poolId] = true;
        totalNumPool += 1;
        emit PoolCreated(_poolId, _nftAddress, _nftId);
        return _poolId;
    }

    function deposit(
        uint256 _poolId,
        address _coin,
        uint256 amount
    ) external hasOpened(_poolId) verifyCoin(_poolId, _coin) returns (bool) {
        require(IERC20(_coin).transferFrom(msg.sender, address(this), amount), 'transfer coin fail');
        getPoolInfo[_poolId].balances += amount;
        emit Deposit(_poolId, msg.sender, _coin, amount);
        return true;
    }

    function withdraw(
        uint256 _poolId,
        address _coin,
        uint256 _amount
    ) external onlyHolder(_poolId) verifyCoin(_poolId, _coin) returns (bool) {
        require(getPoolInfo[_poolId].balances >= _amount, 'insufficient coin amount');
        require(IERC20(_coin).transfer(msg.sender, _amount), 'transfer coin fail');
        getPoolInfo[_poolId].balances -= _amount;
        emit Withdraw(_poolId, msg.sender, _coin, _amount);
        return true;
    }

    function whitelistWithdraw(
        address _coin,
        uint256 _amount,
        uint256 _nonce,
        bytes memory _depositProof
    ) external returns (bool) {
        require(_isValidWithdrawSignature(msg.sender, _coin, _amount, _nonce, _depositProof), 'invalid deposit proof');
        require(!isNonceUsed[_nonce], 'nonce has been used');
        require(IERC20(_coin).transfer(msg.sender, _amount), 'transfer coin fail');
        isNonceUsed[_nonce] = true;
        emit WhitelistWithdraw(msg.sender, _coin, _amount);
        return true;
    }

    function _isValidWithdrawSignature(
        address _receiver,
        address _coin,
        uint256 _amount,
        uint256 _nonce,
        bytes memory _depositProof
    ) private view returns (bool) {
        bytes32 message = keccak256(abi.encodePacked(_receiver, _coin, _amount, _nonce));
        bytes32 messageWithEthSignPrefix = message.toEthSignedMessageHash();
        return (messageWithEthSignPrefix.recover(_depositProof) == _signer);
    }

    modifier hasOpened(uint256 _poolId) {
        require(isActive[_poolId], 'pool is not active');
        _;
    }

    modifier onlyHolder(uint256 _poolId) {
        require(isActive[_poolId], 'pool is not active');
        address owner = IERC721(getPoolInfo[_poolId].nft).ownerOf(getPoolInfo[_poolId].nftId);
        require(msg.sender == owner, 'only used by nft holder');
        _;
    }

    modifier verifyCoin(uint256 _poolId, address _coin) {
        require(_coin == getPoolInfo[_poolId].coin, 'pool is not active');
        _;
    }
}
