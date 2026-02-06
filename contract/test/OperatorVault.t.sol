// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {OperatorVault} from "../src/OperatorVault.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract OperatorVaultTest is Test {
    MockUSDC private usdc;
    OperatorVault private vault;

    address private owner = address(0xA11CE);
    address private user = address(0xB0B);

    function setUp() public {
        usdc = new MockUSDC();
        vault = new OperatorVault(address(usdc), owner);
    }

    function test_Constructor_RevertsOnZeroUsdc() public {
        vm.expectRevert(bytes("OperatorVault: usdc is zero address"));
        new OperatorVault(address(0), owner);
    }

    function test_Constructor_RevertsOnZeroOwner() public {
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0)));
        new OperatorVault(address(usdc), address(0));
    }

    function test_DepositAndBalance() public {
        uint256 amount = 1_000_000;
        usdc.mint(user, amount);

        vm.prank(user);
        usdc.approve(address(vault), amount);

        vm.prank(user);
        vault.depositUSDC(amount);

        assertEq(vault.balanceOf(), amount);
        assertEq(usdc.balanceOf(address(vault)), amount);
    }

    function test_WithdrawByOwner() public {
        uint256 amount = 500_000;
        usdc.mint(user, amount);

        vm.prank(user);
        usdc.approve(address(vault), amount);

        vm.prank(user);
        vault.depositUSDC(amount);

        vm.prank(owner);
        vault.withdraw(amount);

        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc.balanceOf(owner), amount);
    }

    function test_DepositUSDC_RevertsOnZeroAmount() public {
        vm.expectRevert(bytes("OperatorVault: amount is zero"));
        vault.depositUSDC(0);
    }

    function test_DepositUSDC_RevertsOnTransferFailure() public {
        FailingUSDC failing = new FailingUSDC();
        OperatorVault failingVault = new OperatorVault(address(failing), owner);
        failing.setFailTransferFrom(true);

        vm.prank(user);
        failing.approve(address(failingVault), 1);

        vm.expectRevert(bytes("OperatorVault: transfer failed"));
        vm.prank(user);
        failingVault.depositUSDC(1);
    }

    function test_Withdraw_RevertsOnZeroAmount() public {
        vm.expectRevert(bytes("OperatorVault: amount is zero"));
        vm.prank(owner);
        vault.withdraw(0);
    }

    function test_Withdraw_RevertsOnInsufficientBalance() public {
        vm.expectRevert(bytes("OperatorVault: insufficient balance"));
        vm.prank(owner);
        vault.withdraw(1);
    }

    function test_Withdraw_RevertsOnTransferFailure() public {
        FailingUSDC failing = new FailingUSDC();
        OperatorVault failingVault = new OperatorVault(address(failing), owner);
        failing.setFailTransfer(true);
        failing.mint(address(failingVault), 10);

        vm.expectRevert(bytes("OperatorVault: transfer failed"));
        vm.prank(owner);
        failingVault.withdraw(1);
    }

    function test_DepositUSDC_ReentrancyGuard() public {
        ReentrantUSDC reentrant = new ReentrantUSDC();
        OperatorVault reentrantVault = new OperatorVault(address(reentrant), owner);
        reentrant.setVault(reentrantVault);
        reentrant.setMode(ReentrantUSDC.Mode.Deposit);

        uint256 amount = 10;
        reentrant.mint(user, amount);

        vm.prank(user);
        reentrant.approve(address(reentrantVault), amount);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        vm.prank(user);
        reentrantVault.depositUSDC(amount);
    }

    function test_Withdraw_ReentrancyGuard() public {
        ReentrantUSDC reentrant = new ReentrantUSDC();
        OperatorVault reentrantVault = new OperatorVault(address(reentrant), owner);
        reentrant.setVault(reentrantVault);
        reentrant.setMode(ReentrantUSDC.Mode.Withdraw);

        uint256 amount = 10;
        reentrant.mint(address(reentrantVault), amount);

        vm.expectRevert(ReentrancyGuard.ReentrancyGuardReentrantCall.selector);
        vm.prank(owner);
        reentrantVault.withdraw(amount);
    }
}

contract FailingUSDC is ERC20 {
    bool private failTransfer;
    bool private failTransferFrom;

    constructor() ERC20("Failing USDC", "fUSDC") {}

    function setFailTransfer(bool value) external {
        failTransfer = value;
    }

    function setFailTransferFrom(bool value) external {
        failTransferFrom = value;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (failTransfer) {
            return false;
        }
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (failTransferFrom) {
            return false;
        }
        return super.transferFrom(from, to, amount);
    }
}

contract ReentrantUSDC is ERC20 {
    enum Mode {
        None,
        Deposit,
        Withdraw
    }

    OperatorVault private vault;
    Mode private mode;
    bool private reentered;

    constructor() ERC20("Reentrant USDC", "rUSDC") {}

    function setVault(OperatorVault _vault) external {
        vault = _vault;
    }

    function setMode(Mode _mode) external {
        mode = _mode;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        if (mode == Mode.Deposit && !reentered) {
            reentered = true;
            vault.depositUSDC(1);
        }
        return super.transferFrom(from, to, amount);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        if (mode == Mode.Withdraw && !reentered) {
            reentered = true;
            _approve(address(this), address(vault), 1);
            vault.depositUSDC(1);
        }
        return super.transfer(to, amount);
    }
}
