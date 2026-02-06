// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title IMockOracle
/// @notice Mock Oracle インターフェース
interface IMockOracle {
    /// @notice 現在の稼働率を返す
    /// @return utilization 稼働率（0-100%）
    function getUtilization() external view returns (uint256 utilization);

    /// @notice 稼働率を設定する（デモ用）
    /// @param utilization 稼働率（0-100%）
    function setUtilization(uint256 utilization) external;
}

/// @title MockOracle
/// @notice L2稼働率をモック実装で供給するOracle
/// @dev デモ・テスト用の簡易実装
contract MockOracle is IMockOracle {
    /// @notice 現在の稼働率（0-100%）
    uint256 private _utilization = 50;

    /// @notice 稼働率が変更されたときに発行されるイベント
    /// @param utilization 新しい稼働率
    event UtilizationUpdated(uint256 utilization);

    /// @notice 現在の稼働率を返す
    /// @return 稼働率（0-100%）
    function getUtilization() external view returns (uint256) {
        return _utilization;
    }

    /// @notice 稼働率を設定する（デモ用）
    /// @param utilization 稼働率（0-100%）
    /// @dev 範囲外の値は拒否される
    function setUtilization(uint256 utilization) external {
        require(utilization <= 100, "MockOracle: utilization out of range");
        _utilization = utilization;
        emit UtilizationUpdated(utilization);
    }
}
