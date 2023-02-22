pragma solidity ^0.8.0;
import 'erc721a/contracts/ERC721A.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

contract NFT is ERC721A {
    using Strings for uint256;

    event Activate(uint256 indexed tokenId, address indexed holder, uint256 time);

    string private _baseUri;

    mapping(address => uint256) activateTime;

    constructor(string memory name_, string memory symbol_, string memory baseUri_) ERC721A(name_, symbol_) {
        _baseUri = baseUri_;
        return;
    }

    function mint(uint256 quantity) external payable {
        _mint(msg.sender, quantity);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseUri;
    }

    function setBaseURI(string memory baseUri_) external {
        _baseUri = baseUri_;
        return;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');
        string memory currentBaseURI = _baseURI();
        return
            bytes(currentBaseURI).length > 0
                ? string(abi.encodePacked(currentBaseURI, tokenId.toString(), '.json'))
                : '';
    }

    function activate(uint256 tokenId) external isHolder(tokenId) {
        activateTime[msg.sender] = block.timestamp;
    }

    function _deactivate(uint256 tokenId) internal isHolder(tokenId) {
        activateTime[msg.sender] = 0;
    }

    modifier isHolder(uint256 tokenId) {
        require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');
        address owner = ownerOf(tokenId);
        require(owner == msg.sender, 'Sender Not holder');
        _;
    }
}
