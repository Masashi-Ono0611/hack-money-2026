// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";

/// @title InitializePool
/// @notice CPT/USDC Pool を初期化するスクリプト
contract InitializePool is Script {
    using PoolIdLibrary for PoolKey;

    uint160 internal constant DEFAULT_SQRT_PRICE_X96 = 79228162514264337593543950336; // 2^96 (price = 1)
    int24 internal constant DEFAULT_TICK_SPACING = 60;

    /**
     * メインロジック
     */
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        string memory chainName = vm.envString("CHAIN_NAME");
        string memory deployedAddressesPath = string.concat(vm.projectRoot(), "/deployed-addresses.json");
        // デプロイ済みのコントラクトの情報を読み取る
        address poolManager = _readAddress(string.concat(vm.projectRoot(), "/uniswap-v4-addresses.json"), chainName);
        address cptToken = _readAddress(deployedAddressesPath, chainName, "cpt");
        address usdcToken = _readAddress(string.concat(vm.projectRoot(), "/usdc-addresses.json"), chainName);
        address hook = _readAddress(deployedAddressesPath, chainName, "hook");

        PoolKey memory key = _buildPoolKey(cptToken, usdcToken, hook);
        bytes32 poolId = PoolId.unwrap(key.toId());

        vm.startBroadcast(deployerPrivateKey);
        IPoolManager(poolManager).initialize(key, DEFAULT_SQRT_PRICE_X96);
        vm.stopBroadcast();

        recordDeployment(deployedAddressesPath, chainName, hook, poolId);

        console.log("Pool initialized");
        console.log("PoolManager:", poolManager);
        console.log("CPT:", cptToken);
        console.log("USDC:", usdcToken);
        console.log("Hook:", hook);
        console.log("PoolId:", vm.toString(poolId));
    }

    /**
     * Poolを初期化
     * @param poolManager PoolManager アドレス
     * @param cptToken CPT トークンアドレス
     * @param usdcToken USDC トークンアドレス
     * @param hook Hook アドレス
     * @param sqrtPriceX96 初期価格 (Q64.96)
     */
    function initializePool(address poolManager, address cptToken, address usdcToken, address hook, uint160 sqrtPriceX96)
        public
    {
        PoolKey memory key = _buildPoolKey(cptToken, usdcToken, hook);
        IPoolManager(poolManager).initialize(key, sqrtPriceX96);
    }

    /**
     * デプロイ結果をJSONに記録
     * @param path JSON ファイルパス
     * @param chainName チェーン名
     * @param hook Hook アドレス
     * @param poolId Pool ID
     */
    function recordDeployment(string memory path, string memory chainName, address hook, bytes32 poolId) public {
        string memory json = vm.serializeAddress(chainName, "hook", hook);
        json = vm.serializeBytes32(chainName, "poolId", poolId);

        (bool hasCpt, address cpt) = _tryReadAddress(path, string.concat(".", chainName, ".cpt"));
        if (hasCpt) {
            json = vm.serializeAddress(chainName, "cpt", cpt);
        }

        (bool hasOracle, address oracle) = _tryReadAddress(path, string.concat(".", chainName, ".oracle"));
        if (hasOracle) {
            json = vm.serializeAddress(chainName, "oracle", oracle);
        }

        (bool hasVault, address vault) = _tryReadAddress(path, string.concat(".", chainName, ".vault"));
        if (hasVault) {
            json = vm.serializeAddress(chainName, "vault", vault);
        }

        vm.writeJson(json, path, string.concat(".", chainName));
    }

    /**
     * PoolKeyの算出
     * @param cptToken CPT トークンアドレス
     * @param usdcToken USDC トークンアドレス
     * @param hook Hook アドレス
     */
    function _buildPoolKey(address cptToken, address usdcToken, address hook) private pure returns (PoolKey memory key) {
        (address token0, address token1) = cptToken < usdcToken ? (cptToken, usdcToken) : (usdcToken, cptToken);

        key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: DEFAULT_TICK_SPACING,
            hooks: IHooks(hook)
        });
    }

    function _readAddress(string memory path, string memory chainName) private view returns (address) {
        string memory json = vm.readFile(path);
        return vm.parseJsonAddress(json, string.concat(".", chainName));
    }

    function _readAddress(string memory path, string memory chainName, string memory field) private view returns (address) {
        string memory json = vm.readFile(path);
        return vm.parseJsonAddress(json, string.concat(".", chainName, ".", field));
    }

    function _tryReadAddress(string memory path, string memory jsonPath) private view returns (bool, address) {
        string memory json = vm.readFile(path);
        try vm.parseJsonAddress(json, jsonPath) returns (address addr) {
            return (true, addr);
        } catch {
            return (false, address(0));
        }
    }
}
