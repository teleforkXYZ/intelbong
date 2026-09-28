// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// Ear for The Intel Bong. Holds the token to watch, plus the public line and socials.
/// The contract does not play sound. The open page reads these fields and plays theme.mp3.
contract BongEar {
    address public owner;
    address public token;
    string public description;
    string public website;
    string public xHandle;

    event Tuned(address indexed token);
    event Described(string description, string website, string xHandle);

    error NotOwner();

    constructor() {
        owner = msg.sender;
        description = "The Intel Bong. Five notes, one spiral, struck when the token moves. Not Intel Corporation.";
        website = "https://intelbong.xyz";
        xHandle = "intelbongXYZ";
    }

    function setToken(address next) external {
        if (msg.sender != owner) revert NotOwner();
        token = next;
        emit Tuned(next);
    }

    function setSocials(string calldata nextDescription, string calldata nextWebsite, string calldata nextX) external {
        if (msg.sender != owner) revert NotOwner();
        description = nextDescription;
        website = nextWebsite;
        xHandle = nextX;
        emit Described(nextDescription, nextWebsite, nextX);
    }
}
