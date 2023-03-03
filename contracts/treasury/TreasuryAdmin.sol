pragma solidity ^0.8.0;
import '@openzeppelin/contracts/access/Ownable.sol';

contract TreasuryAdmin is Ownable {
    event UpdateCoinWhitelist(address indexed caller, address indexed coin, bool indexed newStatus);

    mapping(address => bool) public coinWhitelist;

    constructor(address[] memory _coins) {
        for (uint i = 0; i < _coins.length; i++) {
            coinWhitelist[_coins[i]] = true;
        }
    }

    function updateCoinWhitelist(address _coin, bool _status) external onlyOwner returns (bool) {
        coinWhitelist[_coin] = _status;
        emit UpdateCoinWhitelist(msg.sender, _coin, _status);
        return true;
    }

    modifier validCoin(address _coin) {
        require(coinWhitelist[_coin], 'invalid Coin');
        _;
    }
}
