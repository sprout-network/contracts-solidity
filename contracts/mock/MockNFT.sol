pragma solidity ^0.8.0;
import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract MockNFT is ERC721 {
    uint256 private _nextTokenId;
    string private _baseUri;

    constructor() ERC721('MOCKNFT', 'MN') {
        _baseUri = 'http://localhost:3000/';
        _nextTokenId = 0;
        return;
    }

    function mint() external {
        _mint(msg.sender, _nextTokenId);
        _nextTokenId += 1;
    }

    function mintTo(address receiver) external {
        _mint(receiver, _nextTokenId);
        _nextTokenId += 1;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }
}
