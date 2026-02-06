// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title IComputeToken
/// @notice CPT (Compute Token) インターフェース
interface IComputeToken is IERC20 {
    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    function mint(uint256 amount) external;

    /// @notice 発行権限を持つアドレスを返す
    /// @return owner アドレス
    function owner() external view returns (address);
}

/// @title ComputeToken
/// @notice Compute Token (CPT) - 計算リソースをトークン化したERC20
/// @dev OpenZeppelin ERC20 + Ownable を継承
contract ComputeToken is ERC20, Ownable {
    /// @notice コンストラクタ
    /// @param name トークン名
    /// @param symbol トークンシンボル
    /// @param initialOwner 初期オーナーアドレス
    constructor(string memory name, string memory symbol, address initialOwner)
        ERC20(name, symbol)
        Ownable(initialOwner)
    {}

    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    /// @dev onlyOwner modifier により、ownerのみ実行可能
    function mint(uint256 amount) external onlyOwner {
        _mint(msg.sender, amount);
    }
}
