// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BongEar {
    address public owner;
    address public token;

    event Tuned(address indexed token);

    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    function setToken(address next) external {
        if (msg.sender != owner) revert NotOwner();
        token = next;
        emit Tuned(next);
    }
}
