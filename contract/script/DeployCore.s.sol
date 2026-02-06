// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {ComputeToken} from "../src/ComputeToken.sol";
import {MockOracle} from "../src/MockOracle.sol";
import {OperatorVault} from "../src/OperatorVault.sol";

/// @title DeployCore
/// @notice Core Token System のデプロイスクリプト
/// @dev 環境変数でチェーンとUSDCアドレスを指定
contract DeployCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        string memory chainName = vm.envString("CHAIN_NAME");
        string memory jsonPath = string.concat(vm.projectRoot(), "./deployed-addresses.json");
        string memory usdcConfigPath = string.concat(vm.projectRoot(), "./usdc-addresses.json");
        _ensureJsonFile(jsonPath);

        vm.startBroadcast(deployerPrivateKey);

        if (_isBaseSepolia(chainName) || _isWorldChainSepolia(chainName)) {
            ComputeToken cpt = new ComputeToken("Compute Token", "CPT", deployer);
            console.log("CPT Token deployed at:", address(cpt));

            MockOracle oracle = new MockOracle();
            console.log("Mock Oracle deployed at:", address(oracle));

            string memory json = vm.serializeAddress(chainName, "cpt", address(cpt));
            json = vm.serializeAddress(chainName, "oracle", address(oracle));
            vm.writeJson(json, jsonPath, string.concat(".", chainName));
        } else if (_isArc(chainName)) {
            address usdcAddress = _readUsdcAddress(usdcConfigPath, chainName);
            OperatorVault vault = new OperatorVault(usdcAddress, deployer);
            console.log("Operator Vault deployed at:", address(vault));

            string memory json = vm.serializeAddress(chainName, "vault", address(vault));
            vm.writeJson(json, jsonPath, string.concat(".", chainName));
        } else {
            revert("DeployCore: unsupported CHAIN_NAME");
        }

        vm.stopBroadcast();
    }

    function _isBaseSepolia(string memory chainName) private pure returns (bool) {
        return keccak256(bytes(chainName)) == keccak256(bytes("base-sepolia"));
    }

    function _isWorldChainSepolia(string memory chainName) private pure returns (bool) {
        return keccak256(bytes(chainName)) == keccak256(bytes("world-chain-sepolia"));
    }

    function _isArc(string memory chainName) private pure returns (bool) {
        return keccak256(bytes(chainName)) == keccak256(bytes("arc"));
    }

    function _ensureJsonFile(string memory path) private {
        try vm.readFile(path) returns (string memory) {
            // no-op
        } catch {
            vm.writeFile(path, "{}");
        }
    }

    function _readUsdcAddress(string memory path, string memory chainName) private view returns (address) {
        string memory json = vm.readFile(path);
        return vm.parseJsonAddress(json, string.concat(".", chainName));
    }
}
