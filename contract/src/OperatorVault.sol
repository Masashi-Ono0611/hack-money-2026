// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title IOperatorVault
/// @notice Operator Vault インターフェース
interface IOperatorVault {
    /// @notice USDCを入金する
    /// @param amount 入金数量
    function depositUSDC(uint256 amount) external;

    /// @notice USDCを引き出す（運営者のみ）
    /// @param amount 引き出し数量
    function withdraw(uint256 amount) external;

    /// @notice USDC残高を返す
    /// @return balance USDC残高
    function balanceOf() external view returns (uint256 balance);

    /// @notice USDC入金イベント
    /// @param depositor 入金者アドレス
    /// @param amount 入金数量
    /// @param timestamp タイムスタンプ
    event Deposit(address indexed depositor, uint256 amount, uint256 timestamp);

    /// @notice USDC引き出しイベント
    /// @param operator 運営者アドレス
    /// @param amount 引き出し数量
    /// @param timestamp タイムスタンプ
    event Withdraw(address indexed operator, uint256 amount, uint256 timestamp);
}

/// @title OperatorVault
/// @notice L2運営者のUSDC収益を管理するVault
/// @dev OpenZeppelin Ownable + ReentrancyGuard を継承
contract OperatorVault is IOperatorVault, Ownable, ReentrancyGuard {
    /// @notice USDCトークンコントラクト
    IERC20 public immutable usdc;

    /// @notice コンストラクタ
    /// @param _usdc USDCトークンアドレス
    /// @param initialOwner 初期所有者アドレス
    constructor(address _usdc, address initialOwner) Ownable(initialOwner) {
        require(_usdc != address(0), "OperatorVault: usdc is zero address");
        require(initialOwner != address(0), "OperatorVault: owner is zero address");
        usdc = IERC20(_usdc);
    }

    /// @notice USDCを入金する
    /// @param amount 入金数量
    /// @dev 呼び出し元が事前に approve している必要がある
    function depositUSDC(uint256 amount) external nonReentrant {
        require(amount > 0, "OperatorVault: amount is zero");
        require(usdc.transferFrom(msg.sender, address(this), amount), "OperatorVault: transfer failed");
        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /// @notice USDCを引き出す（運営者のみ）
    /// @param amount 引き出し数量
    /// @dev onlyOwner modifier により、ownerのみ実行可能
    function withdraw(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "OperatorVault: amount is zero");
        uint256 balance = usdc.balanceOf(address(this));
        require(balance >= amount, "OperatorVault: insufficient balance");
        require(usdc.transfer(msg.sender, amount), "OperatorVault: transfer failed");
        emit Withdraw(msg.sender, amount, block.timestamp);
    }

    /// @notice USDC残高を返す
    /// @return USDC残高
    function balanceOf() external view returns (uint256) {
        return usdc.balanceOf(address(this));
    }
}
