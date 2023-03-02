pragma solidity ^0.8.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC721.sol';
import './TreasuryAdmin.sol';

contract Treasury is TreasuryAdmin {
    struct PoolInfo {
        address nftOwner;
        address coin;
        uint256 balances;
    }

    event PoolCreated(uint256 poolId, address indexed nftAddress, uint256 indexed nftId);

    event Deposit(uint256 indexed poolId, address indexed from, address indexed coin, uint256 amount);

    event Withdraw(uint256 indexed poolId, address indexed to, address indexed coin, uint256 amount);

    mapping(address => mapping(uint256 => uint256)) public getPoolId;

    mapping(uint256 => PoolInfo) public getPoolInfo;

    mapping(uint256 => bool) public isActive;

    uint256 public totalNumPool = 0;

    constructor(address[] memory _coins, address[] memory _nfts) TreasuryAdmin(_coins, _nfts) {}

    function createPool(
        address _nftAddress,
        uint256 _nftId,
        address _coin
    ) external validCoin(_coin) validNFT(_nftAddress) returns (uint256 _poolId) {
        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _nftId);
        _poolId = totalNumPool;

        PoolInfo memory _info = PoolInfo({nftOwner: msg.sender, coin: _coin, balances: 0});
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
        uint256 amount
    ) external onlyPoolOwner(_poolId) verifyCoin(_poolId, _coin) returns (bool) {
        require(getPoolInfo[_poolId].balances >= amount, 'insufficient coin amount');
        require(IERC20(_coin).transfer(msg.sender, amount), 'transfer coin fail');
        getPoolInfo[_poolId].balances -= amount;
        emit Withdraw(_poolId, msg.sender, _coin, amount);
        return true;
    }

    modifier hasOpened(uint256 _poolId) {
        require(isActive[_poolId], 'pool is not active');
        _;
    }

    modifier onlyPoolOwner(uint256 _poolId) {
        require(isActive[_poolId], 'pool is not active');
        require(msg.sender == getPoolInfo[_poolId].nftOwner, 'only used by pool owner');
        _;
    }

    modifier verifyCoin(uint256 _poolId, address _coin) {
        require(_coin == getPoolInfo[_poolId].coin, 'pool is not active');
        _;
    }
}
