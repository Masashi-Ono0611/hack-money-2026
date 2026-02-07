// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";
import {FunctionsConsumer} from "../contracts/FunctionsConsumer.sol";

contract DeployFunctionsConsumer is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address router = vm.envAddress("FUNCTIONS_ROUTER"); // e.g. Sepolia 0xb83E...

        vm.startBroadcast(deployerPrivateKey);

        FunctionsConsumer consumer = new FunctionsConsumer(router);
        console2.log("FunctionsConsumer deployed to:", address(consumer));

        vm.stopBroadcast();
    }
}
