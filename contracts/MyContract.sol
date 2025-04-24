// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

contract MyContract {
    string public status;

    constructor() {
        status = "Unchecked";
    }

    function reportRansomware(bool detected) public {
        if (detected) {
            status = "Ransomware Detected";
        } else {
            status = "Safe";
        }
    }

    function getStatus() public view returns (string memory) {
        return status;
    }
}
