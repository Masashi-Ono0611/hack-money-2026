// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {LPFeeLibrary} from "v4-core/libraries/LPFeeLibrary.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {HookMiner} from "../src/lib/HookMiner.sol";
import {UtilizationHook} from "../src/hooks/UtilizationHook.sol";
import {IMockOracle, MockOracle} from "../src/MockOracle.sol";
import {ComputeToken} from "../src/ComputeToken.sol";

/**
 * @title 結合テスト用のモックERC20トークン
 * @author
 * @notice
 */
contract MockUSDCIntegration is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}
}

/// @title PoolHookIntegrationTest
/// @notice Task 6.1: Pool + Hook 初期統合テスト
contract PoolHookIntegrationTest is Test {
    using PoolIdLibrary for PoolKey;

    uint160 internal constant ALL_HOOK_MASK = uint160((1 << 14) - 1);
    uint160 internal constant SQRT_PRICE_1_1 = 79228162514264337593543950336; // 2^96

    /**
     * モックのOracleコントラクトをデプロイし、Pool(CPT/USDC)を初期化するためのテストコード
     */
    function test_deployMockOracleAndHookWithCreate2_thenInitializeCptUsdcPool() public {
        PoolManager poolManager = new PoolManager(address(this));
        MockOracle oracle = new MockOracle();

        bytes memory creationCode = type(UtilizationHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(address(poolManager)), IMockOracle(address(oracle)));
        uint160 flags = Hooks.BEFORE_SWAP_FLAG;

        (address expectedHookAddress, bytes32 salt) = HookMiner.find(address(this), flags, creationCode, constructorArgs);

        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        address hookAddress;
        assembly ("memory-safe") {
            hookAddress := create2(0, add(initCode, 0x20), mload(initCode), salt)
        }

        assertEq(hookAddress, expectedHookAddress, "CREATE2 deployed address should match mined address");
        assertEq(uint160(hookAddress) & ALL_HOOK_MASK, flags, "hook address should contain BEFORE_SWAP flag only");

        ComputeToken cpt = new ComputeToken("Compute Token", "CPT", address(this));
        MockUSDCIntegration usdc = new MockUSDCIntegration();

        (address token0, address token1) = address(cpt) < address(usdc)
            ? (address(cpt), address(usdc))
            : (address(usdc), address(cpt));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LPFeeLibrary.DYNAMIC_FEE_FLAG,
            tickSpacing: 60,
            hooks: IHooks(hookAddress)
        });

        // Pool(CPT/USDC)を初期化
        poolManager.initialize(key, SQRT_PRICE_1_1);

        PoolId poolId = key.toId();
        assertTrue(PoolId.unwrap(poolId) != bytes32(0), "pool id should be non-zero");
    }
}
