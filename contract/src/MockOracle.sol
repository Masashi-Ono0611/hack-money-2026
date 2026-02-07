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

    /// @notice 稼働率とメタ情報を返す
    /// @return utilization 稼働率（0-100%）
    /// @return updatedAt 最終更新時刻
    /// @return stale データが古い場合 true
    /// @return source 更新ソース（1=bot, 2=functions）
    function getUtilizationWithMeta()
        external
        view
        returns (uint256 utilization, uint256 updatedAt, bool stale, uint8 source);

    /// @notice Bot 経路で稼働率を更新する
    /// @param utilization 稼働率（0-100%）
    /// @param timestamp 更新時刻
    function setUtilizationFromBot(uint256 utilization, uint256 timestamp) external;

    /// @notice Functions 経路で稼働率を更新する
    /// @param utilization 稼働率（0-100%）
    /// @param timestamp 更新時刻
    /// @param requestId Chainlink request ID
    function setUtilizationFromFunctions(uint256 utilization, uint256 timestamp, bytes32 requestId) external;

    /// @notice stale TTL を設定する
    /// @param ttlSeconds TTL（秒）
    function setStaleTtl(uint256 ttlSeconds) external;

    /// @notice 更新者の認可状態を設定する
    /// @param updater 対象アドレス
    /// @param allowed 認可状態
    function setAuthorizedUpdater(address updater, bool allowed) external;
}

/// @title MockOracle
/// @notice L2稼働率をモック実装で供給するOracle
/// @dev デモ・テスト用の簡易実装
contract MockOracle is IMockOracle {
    /// @notice 現在の稼働率（0-100%）
    uint256 private _utilization = 50;
    uint256 private _updatedAt;
    uint8 private _source;
    uint256 private _staleTtl = 20 minutes;
    mapping(address => bool) private _authorizedUpdaters;

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

    function getUtilizationWithMeta() external view returns (uint256, uint256, bool, uint8) {
        bool stale = _updatedAt == 0 || block.timestamp - _updatedAt > _staleTtl;
        return (_utilization, _updatedAt, stale, _source);
    }

    function setUtilizationFromBot(uint256 utilization, uint256 timestamp) external {
        _setUtilization(utilization, timestamp, 1);
    }

    function setUtilizationFromFunctions(uint256 utilization, uint256 timestamp, bytes32 requestId) external {
        requestId;
        _setUtilization(utilization, timestamp, 2);
    }

    function setStaleTtl(uint256 ttlSeconds) external {
        _staleTtl = ttlSeconds;
    }

    function setAuthorizedUpdater(address updater, bool allowed) external {
        _authorizedUpdaters[updater] = allowed;
    }

    function _setUtilization(uint256 utilization, uint256 timestamp, uint8 source) internal {
        require(utilization <= 100, "MockOracle: utilization out of range");
        _utilization = utilization;
        _updatedAt = timestamp;
        _source = source;
        emit UtilizationUpdated(utilization);
    }
}
