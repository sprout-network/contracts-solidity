pragma solidity ^0.8.0;

interface IOwnable {
    function owner() external view returns (address);
    function isOwner() external view returns (bool);
    function transferOwnership() external;
}
