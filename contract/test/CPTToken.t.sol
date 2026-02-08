// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ComputeToken} from "../src/ComputeToken.sol";
import {IMockOracle, MockOracle} from "../src/MockOracle.sol";

contract CPTTokenTest is Test {
    ComputeToken private token;
    MockOracle private oracle;

    address private owner = address(0xA11CE);
    address private user = address(0xB0B);
    address private spender = address(0xCAFE);

    function setUp() public {
        token = new ComputeToken("Compute Token", "CPT", owner);
        oracle = new MockOracle();
    }

    function test_MintOnlyOwner() public {
        uint256 amount = 1_000e18;

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        vm.prank(user);
        token.mint(amount);

        vm.prank(owner);
        token.mint(amount);
        assertEq(token.totalSupply(), amount);
        assertEq(token.balanceOf(owner), amount);
    }

    function test_TransferAndBalance() public {
        uint256 amount = 500e18;

        vm.prank(owner);
        token.mint(amount);

        vm.prank(owner);
        token.transfer(user, 200e18);

        assertEq(token.balanceOf(owner), 300e18);
        assertEq(token.balanceOf(user), 200e18);
    }

    function test_ApproveAndTransferFrom() public {
        uint256 amount = 1_000e18;

        vm.prank(owner);
        token.mint(amount);

        vm.prank(owner);
        token.approve(spender, 400e18);

        vm.prank(spender);
        token.transferFrom(owner, user, 250e18);

        assertEq(token.balanceOf(owner), 750e18);
        assertEq(token.balanceOf(user), 250e18);
        assertEq(token.allowance(owner, spender), 150e18);
    }

    function test_TransferOwnership() public {
        address newOwner = address(0xD00D);

        vm.prank(owner);
        token.transferOwnership(newOwner);

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, owner));
        vm.prank(owner);
        token.mint(1);

        vm.prank(newOwner);
        token.mint(2);
        assertEq(token.balanceOf(newOwner), 2);
    }

    // ─── Capacity-based mint cap tests ───

    /// @notice capacityEnforced はデフォルトで false
    function test_capacityEnforced_defaultsFalse() public view {
        assertFalse(token.capacityEnforced());
    }

    /// @notice capacityEnforced=false の場合、制限なくミント可能
    function test_mint_unlimitedWhenCapacityNotEnforced() public {
        vm.prank(owner);
        token.mint(1_000_000e18);
        assertEq(token.totalSupply(), 1_000_000e18);
    }

    /// @notice configureCapacity のパラメータが正しく保存される
    function test_configureCapacity_setsParams() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        vm.stopPrank();

        assertEq(token.epochCapacity(), 10_000e18);
        assertEq(token.epochDuration(), 1 hours);
        assertTrue(token.currentEpochStart() > 0);
    }

    /// @notice configureCapacity は epochDuration=0 を拒否する
    function test_configureCapacity_revertsZeroDuration() public {
        vm.prank(owner);
        vm.expectRevert("epoch duration must be > 0");
        token.configureCapacity(10_000e18, 0);
    }

    /// @notice configureCapacity は onlyOwner
    function test_configureCapacity_onlyOwner() public {
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        token.configureCapacity(10_000e18, 1 hours);
    }

    /// @notice 稼働率0%でフルキャパシティのミントが可能
    function test_mint_fullCapacityAtZeroUtilization() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(0);

        vm.prank(owner);
        token.mint(10_000e18);
        assertEq(token.totalSupply(), 10_000e18);
    }

    /// @notice 稼働率50%で半分のキャパシティのミントが可能
    function test_mint_halfCapacityAt50Utilization() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(50);

        // maxMint = 10000 * (100-50)/100 = 5000
        vm.prank(owner);
        token.mint(5_000e18);
        assertEq(token.totalSupply(), 5_000e18);
    }

    /// @notice 稼働率100%ではミント不可
    function test_mint_revertsAt100Utilization() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(100);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ComputeToken.ExceedsEpochCapacity.selector, 1, 0));
        token.mint(1);
    }

    /// @notice エポック内の累積ミントが上限を超えると revert
    function test_mint_revertsWhenExceedsEpochCap() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(0); // maxMint = 10000

        vm.prank(owner);
        token.mint(8_000e18); // OK: 8000/10000

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(ComputeToken.ExceedsEpochCapacity.selector, 3_000e18, 2_000e18));
        token.mint(3_000e18); // FAIL: 8000+3000 > 10000
    }

    /// @notice エポックがロールオーバーするとカウンタがリセットされる
    function test_mint_epochRolloverResetsMinted() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(0);

        vm.prank(owner);
        token.mint(10_000e18); // fills epoch

        // advance past epoch
        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(owner);
        token.mint(10_000e18); // new epoch: should succeed
        assertEq(token.totalSupply(), 20_000e18);
    }

    /// @notice remainingMintableThisEpoch が正しい残量を返す
    function test_remainingMintableThisEpoch() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        vm.stopPrank();

        oracle.setUtilization(20); // maxMint = 10000*80/100 = 8000

        vm.prank(owner);
        token.mint(3_000e18);

        assertEq(token.remainingMintableThisEpoch(), 5_000e18);
    }

    /// @notice currentEpochMaxMint が稼働率に連動して変わる
    function test_currentEpochMaxMint_changesWithUtilization() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        vm.stopPrank();

        oracle.setUtilization(0);
        assertEq(token.currentEpochMaxMint(), 10_000e18);

        oracle.setUtilization(30);
        assertEq(token.currentEpochMaxMint(), 7_000e18);

        oracle.setUtilization(100);
        assertEq(token.currentEpochMaxMint(), 0);
    }

    /// @notice setCapacityEnforced を toggle できる
    function test_toggleCapacityEnforced() public {
        vm.startPrank(owner);
        token.setOracle(IMockOracle(address(oracle)));
        token.configureCapacity(10_000e18, 1 hours);
        token.setCapacityEnforced(true);
        assertTrue(token.capacityEnforced());

        token.setCapacityEnforced(false);
        assertFalse(token.capacityEnforced());
        vm.stopPrank();

        // with enforcement off, unlimited mint works
        oracle.setUtilization(100);
        vm.prank(owner);
        token.mint(1_000_000e18);
        assertEq(token.totalSupply(), 1_000_000e18);
    }
}
