// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ComputeToken} from "../src/ComputeToken.sol";
import {MockOracle} from "../src/MockOracle.sol";
import {OperatorVault} from "../src/OperatorVault.sol";

/**
 * @title モック用のERC30トークン
 * @author
 * @notice
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title 結合テスト用のテストコード
 * @author
 * @notice
 */
contract IntegrationTest is Test {
    address private owner = address(0xA11CE);
    address private user = address(0xB0B);

    /**
     * CPTとオラクルのシミュレーション用コントラクト
     */
    function test_CPTAndOracle_UtilizationSimulation() public {
        ComputeToken token = new ComputeToken("Compute Token", "CPT", owner);
        MockOracle oracle = new MockOracle();

        assertEq(oracle.getUtilization(), 50);
        oracle.setUtilization(75);
        assertEq(oracle.getUtilization(), 75);

        vm.prank(owner);
        token.mint(1_000e18);
        assertEq(token.balanceOf(owner), 1_000e18);
        assertEq(token.totalSupply(), 1_000e18);
    }

    /**
     * VaultコントラクトとUSDCの処理のテストコード
     */
    function test_VaultAndUSDC_DepositWithdrawFlow() public {
        MockUSDC usdc = new MockUSDC();
        OperatorVault vault = new OperatorVault(address(usdc), owner);

        uint256 amount = 1_000_000;
        usdc.mint(user, amount);

        vm.prank(user);
        usdc.approve(address(vault), amount);

        vm.prank(user);
        vault.depositUSDC(amount);
        assertEq(vault.balanceOf(), amount);

        vm.prank(owner);
        vault.withdraw(amount);
        assertEq(vault.balanceOf(), 0);
        assertEq(usdc.balanceOf(owner), amount);
    }
}
