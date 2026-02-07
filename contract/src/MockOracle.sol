// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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
contract MockOracle is IMockOracle, Ownable {
    uint8 public constant SOURCE_BOT = 1;
    uint8 public constant SOURCE_FUNCTIONS = 2;
    uint256 public constant DEFAULT_STALE_TTL = 20 minutes;
    uint256 public constant DIVERGENCE_THRESHOLD = 15;
    uint256 public constant MAX_TIMESTAMP_FUTURE_DRIFT = 60;
    uint256 public constant MAX_TIMESTAMP_AGE = 1 hours;

    /// @notice 現在の稼働率（0-100%）
    uint256 private _utilization = 50;
    uint256 private _updatedAt;
    uint8 private _source;
    uint256 private _staleTtl = DEFAULT_STALE_TTL;
    uint256 private _lastBotUtilization;
    uint256 private _lastFunctionsUtilization;
    bytes32 public lastFunctionsRequestId;
    mapping(address => bool) private _authorizedUpdaters;

    /// @notice 稼働率が変更されたときに発行されるイベント
    /// @param utilization 新しい稼働率
    /// @param source 更新ソース（1=bot, 2=functions）
    /// @param updatedAt 更新時刻
    event UtilizationUpdated(uint256 utilization, uint8 source, uint256 updatedAt);
    event UpdaterAuthorizationChanged(address indexed updater, bool allowed);
    event TtlUpdated(uint256 ttlSeconds);

    error UnauthorizedUpdater();
    error UtilizationOutOfRange();
    error TimestampInFuture();
    error TimestampTooOld();
    error TimestampAlreadyStale();

    modifier onlyAuthorizedUpdater() {
        if (!_authorizedUpdaters[msg.sender]) {
            revert UnauthorizedUpdater();
        }
        _;
    }

    constructor() Ownable(msg.sender) {
        _authorizedUpdaters[msg.sender] = true;
    }

    /// @notice 現在の稼働率を返す
    /// @return 稼働率（0-100%）
    function getUtilization() external view returns (uint256) {
        return _utilization;
    }

    /// @notice 稼働率を設定する（デモ用）
    /// @param utilization 稼働率（0-100%）
    /// @dev 範囲外の値は拒否される
    function setUtilization(uint256 utilization) external onlyAuthorizedUpdater {
        _lastBotUtilization = utilization;
        _setUtilization(utilization, block.timestamp, SOURCE_BOT);
    }

    function getUtilizationWithMeta() external view returns (uint256, uint256, bool, uint8) {
        bool stale = _updatedAt == 0 || block.timestamp - _updatedAt > _staleTtl;
        return (_utilization, _updatedAt, stale, _source);
    }

    function setUtilizationFromBot(uint256 utilization, uint256 timestamp) external onlyAuthorizedUpdater {
        _lastBotUtilization = utilization;
        _setUtilization(utilization, timestamp, SOURCE_BOT);
    }

    function setUtilizationFromFunctions(uint256 utilization, uint256 timestamp, bytes32 requestId)
        external
        onlyAuthorizedUpdater
    {
        lastFunctionsRequestId = requestId;
        _lastFunctionsUtilization = utilization;

        bool shouldApplyFunctionsValue = _lastBotUtilization == 0;
        if (!shouldApplyFunctionsValue) {
            uint256 divergence = _lastBotUtilization > utilization
                ? _lastBotUtilization - utilization
                : utilization - _lastBotUtilization;
            shouldApplyFunctionsValue = divergence > DIVERGENCE_THRESHOLD;
        }

        if (shouldApplyFunctionsValue) {
            _setUtilization(utilization, timestamp, SOURCE_FUNCTIONS);
        }
    }

    function setStaleTtl(uint256 ttlSeconds) external onlyOwner {
        _staleTtl = ttlSeconds;
        emit TtlUpdated(ttlSeconds);
    }

    function setAuthorizedUpdater(address updater, bool allowed) external onlyOwner {
        _authorizedUpdaters[updater] = allowed;
        emit UpdaterAuthorizationChanged(updater, allowed);
    }

    function _setUtilization(uint256 utilization, uint256 timestamp, uint8 source) internal {
        if (utilization > 100) {
            revert UtilizationOutOfRange();
        }
        _validateTimestamp(timestamp);
        _utilization = utilization;
        _updatedAt = timestamp;
        _source = source;
        emit UtilizationUpdated(utilization, source, timestamp);
    }

    function _validateTimestamp(uint256 timestamp) internal view {
        if (timestamp > block.timestamp + MAX_TIMESTAMP_FUTURE_DRIFT) {
            revert TimestampInFuture();
        }
        if (timestamp + MAX_TIMESTAMP_AGE < block.timestamp) {
            revert TimestampTooOld();
        }
        if (timestamp + _staleTtl < block.timestamp) {
            revert TimestampAlreadyStale();
        }
    }
}
