pragma solidity ^0.8.0;
import '@openzeppelin/contracts/access/Ownable.sol';

contract TreasuryAdmin is Ownable {
    event UpdateCoinWhitelist(address indexed caller, address indexed coin, bool indexed newStatus);

    event UpdateNFTWhitelist(address indexed caller, address indexed nft, bool indexed newStatus);

    mapping(address => bool) public coinWhitelist;

    mapping(address => bool) public nftWhitelist;

    constructor(address[] memory _coins, address[] memory _nfts) {
        for (uint i = 0; i < _coins.length; i++) {
            coinWhitelist[_coins[i]] = true;
        }
        for (uint i = 0; i < _nfts.length; i++) {
            nftWhitelist[_nfts[i]] = true;
        }
    }

    function updateCoinWhitelist(address _coin, bool _status) external onlyOwner returns (bool) {
        coinWhitelist[_coin] = _status;
        emit UpdateCoinWhitelist(msg.sender, _coin, _status);
        return true;
    }

    function updateNFTWhitelist(address _nft, bool _status) external onlyOwner returns (bool) {
        nftWhitelist[_nft] = _status;
        emit UpdateNFTWhitelist(msg.sender, _nft, _status);
        return true;
    }

    modifier validCoin(address _coin) {
        require(coinWhitelist[_coin], 'invalid Coin');
        _;
    }

    modifier validNFT(address _nft) {
        require(nftWhitelist[_nft], 'invalid nft');
        _;
    }
}
