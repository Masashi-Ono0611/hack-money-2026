// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMockOracle} from "../MockOracle.sol";

interface IFunctionsRouter {
    function sendRequest(bytes calldata requestData, uint64 subId, uint32 callbackGasLimit, bytes32 donId)
        external
        returns (bytes32 requestId);
}

/// @title FunctionsReceiver
/// @notice Chainlink Functions 応答を受け取り Oracle 更新につなぐ受信コンポーネント
/// @dev 3.1 では責務分離のためのスケルトンを提供し、request/fulfill の本実装は後続タスクで追加する
contract FunctionsReceiver is Ownable {
    uint256 public constant DEFAULT_MIN_UPKEEP_INTERVAL = 600;
    uint256 public constant BASE_SEPOLIA_CHAIN_ID = 84532;
    address public constant BASE_SEPOLIA_FUNCTIONS_ROUTER = 0xf9B8fc078197181C841c296C876945aaa425B278;
    bytes32 public constant BASE_SEPOLIA_DON_ID = bytes32("fun-base-sepolia-1");

    IFunctionsRouter public immutable router;
    IMockOracle public immutable oracle;
    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public callbackGasLimit;
    string public source;
    string[] public args;
    uint256 public minUpkeepInterval;
    uint256 public lastUpkeepTimestamp;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    event FunctionsRequestSent(bytes32 indexed requestId);
    event FunctionsResponseReceived(bytes32 indexed requestId, uint256 utilization);
    event FunctionsError(bytes32 indexed requestId, bytes error);

    error InvalidRouterAddress();
    error InvalidOracleAddress();
    error UpkeepIntervalNotReached();
    error UnauthorizedRouter(address caller);

    constructor(address router_, address oracle_, bytes32 donId_, uint64 subscriptionId_, uint32 callbackGasLimit_)
        Ownable(msg.sender)
    {
        if (router_ == address(0)) {
            revert InvalidRouterAddress();
        }
        if (oracle_ == address(0)) {
            revert InvalidOracleAddress();
        }
        router = IFunctionsRouter(router_);
        oracle = IMockOracle(oracle_);
        donId = donId_;
        subscriptionId = subscriptionId_;
        callbackGasLimit = callbackGasLimit_;
        minUpkeepInterval = DEFAULT_MIN_UPKEEP_INTERVAL;
    }

    function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData) {
        upkeepNeeded = block.timestamp - lastUpkeepTimestamp >= minUpkeepInterval;
        performData = "";
    }

    function performUpkeep(bytes calldata) external {
        if (block.timestamp - lastUpkeepTimestamp < minUpkeepInterval) {
            revert UpkeepIntervalNotReached();
        }

        bytes memory requestData = abi.encode(source, args);
        bytes32 requestId = router.sendRequest(requestData, subscriptionId, callbackGasLimit, donId);

        lastUpkeepTimestamp = block.timestamp;
        s_lastRequestId = requestId;

        emit FunctionsRequestSent(requestId);
    }

    function fulfillRequest(bytes32 requestId, bytes calldata response, bytes calldata err) external {
        if (msg.sender != address(router)) {
            revert UnauthorizedRouter(msg.sender);
        }

        s_lastRequestId = requestId;
        s_lastResponse = response;
        s_lastError = err;

        if (err.length > 0) {
            emit FunctionsError(requestId, err);
            return;
        }

        if (response.length != 32) {
            emit FunctionsError(requestId, bytes("invalid response length"));
            return;
        }

        uint256 utilization = abi.decode(response, (uint256));
        try oracle.setUtilizationFromFunctions(utilization, block.timestamp, requestId) {
            emit FunctionsResponseReceived(requestId, utilization);
        } catch (bytes memory reason) {
            emit FunctionsError(requestId, reason);
        }
    }

    function setSource(string memory newSource) external onlyOwner {
        source = newSource;
    }

    function setArgs(string[] memory newArgs) external onlyOwner {
        delete args;
        for (uint256 i = 0; i < newArgs.length; i++) {
            args.push(newArgs[i]);
        }
    }

    function setSubscriptionId(uint64 newSubId) external onlyOwner {
        subscriptionId = newSubId;
    }

    function setMinUpkeepInterval(uint256 interval) external onlyOwner {
        minUpkeepInterval = interval;
    }
}
