// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IMockOracle} from "../src/MockOracle.sol";

/// @title AuthorizeFunctionsReceiver
/// @notice Oracle の allowlist に FunctionsReceiver を登録/解除する運用スクリプト
contract AuthorizeFunctionsReceiver is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracle = vm.envAddress("ORACLE_ADDRESS");
        address receiver = vm.envAddress("FUNCTIONS_RECEIVER_ADDRESS");
        bool allowed = vm.envOr("ALLOWED", true);

        vm.startBroadcast(deployerPrivateKey);
        IMockOracle(oracle).setAuthorizedUpdater(receiver, allowed);
        vm.stopBroadcast();

        console.log("Oracle updater authorization updated");
        console.log("oracle:", oracle);
        console.log("receiver:", receiver);
        console.log("allowed:", allowed);
    }
}
