pragma solidity ^0.8.0;
import 'erc721a/contracts/ERC721A.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

contract NFT is ERC721A {
    using Strings for uint256;

    event Activate(uint256 indexed tokenId, address indexed holder, uint256 time);

    string private _baseUri;

    mapping(uint256 => uint256) public activateTime;

    constructor(string memory name_, string memory symbol_, string memory baseUri_) ERC721A(name_, symbol_) {
        _baseUri = baseUri_;
        return;
    }

    function mint(uint256 quantity) external payable {
        _mint(msg.sender, quantity);
    }

    function mintTo(address receiver, uint256 quantity) external payable {
        _mint(receiver, quantity);
    }

    function burn(uint256 tokenId) external {
        // the original burn function already checks if the sender is the owner or approved
        _burn(tokenId, true);
        activateTime[tokenId] = 0;
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
        require(activateTime[tokenId] == 0, 'only activate once');
        uint256 _now = block.timestamp;
        activateTime[tokenId] = _now;
        emit Activate(tokenId, msg.sender, _now);
    }

    function _deactivate(uint256 tokenId) internal isHolder(tokenId) {
        activateTime[tokenId] = 0;
    }

    modifier isHolder(uint256 tokenId) {
        require(_exists(tokenId), 'ERC721Metadata: URI query for nonexistent token');
        address owner = ownerOf(tokenId);
        require(owner == msg.sender, 'Sender Not holder');
        _;
    }
}
