// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MockOracle} from "../src/MockOracle.sol";
import {FunctionsReceiver, IFunctionsRouter} from "../src/functions/FunctionsReceiver.sol";

contract MockFunctionsRouter is IFunctionsRouter {
    bytes internal _lastRequestData;
    uint64 public lastSubscriptionId;
    uint32 public lastCallbackGasLimit;
    bytes32 public lastDonId;
    uint256 public sendCount;
    bytes32 public nextRequestId = keccak256("mock-request-id");

    function sendRequest(bytes calldata requestData, uint64 subId, uint32 callbackGasLimit, bytes32 donId)
        external
        returns (bytes32)
    {
        _lastRequestData = requestData;
        lastSubscriptionId = subId;
        lastCallbackGasLimit = callbackGasLimit;
        lastDonId = donId;
        sendCount++;
        return nextRequestId;
    }

    function lastRequestData() external view returns (bytes memory) {
        return _lastRequestData;
    }
}

contract FunctionsReceiverTest is Test {
    FunctionsReceiver internal receiver;
    MockOracle internal oracle;
    MockFunctionsRouter internal router;

    bytes32 internal constant DON_ID = bytes32("fun-base-sepolia-1");
    uint64 internal constant SUBSCRIPTION_ID = 123;
    uint32 internal constant CALLBACK_GAS_LIMIT = 300_000;
    bytes32 internal constant BASE_SEPOLIA_DON_ID = bytes32("fun-base-sepolia-1");

    function setUp() public {
        oracle = new MockOracle();
        router = new MockFunctionsRouter();
        receiver = new FunctionsReceiver(address(router), address(oracle), DON_ID, SUBSCRIPTION_ID, CALLBACK_GAS_LIMIT);
    }

    function test_constructor_setsCoreConfig() public view {
        assertEq(address(receiver.router()), address(router));
        assertEq(address(receiver.oracle()), address(oracle));
        assertEq(receiver.donId(), DON_ID);
        assertEq(receiver.subscriptionId(), SUBSCRIPTION_ID);
        assertEq(receiver.callbackGasLimit(), CALLBACK_GAS_LIMIT);
        assertEq(receiver.minUpkeepInterval(), 600);
        assertEq(receiver.owner(), address(this));
    }

    function test_baseSepoliaDefaults_areDefined() public view {
        assertEq(receiver.BASE_SEPOLIA_CHAIN_ID(), 84532);
        assertEq(receiver.BASE_SEPOLIA_FUNCTIONS_ROUTER(), 0xf9B8fc078197181C841c296C876945aaa425B278);
        assertEq(receiver.BASE_SEPOLIA_DON_ID(), BASE_SEPOLIA_DON_ID);
    }

    function test_checkUpkeep_respectsMinInterval() public {
        (bool upkeepNeeded,) = receiver.checkUpkeep("");
        assertFalse(upkeepNeeded);

        vm.warp(block.timestamp + receiver.minUpkeepInterval());
        (upkeepNeeded,) = receiver.checkUpkeep("");
        assertTrue(upkeepNeeded);
    }

    function test_adminSetters_updateValues() public {
        receiver.setSource("return Functions.encodeUint256(42);");
        assertEq(receiver.source(), "return Functions.encodeUint256(42);");

        string[] memory newArgs = new string[](2);
        newArgs[0] = "https://base-sepolia.example";
        newArgs[1] = "60";
        receiver.setArgs(newArgs);
        assertEq(receiver.args(0), "https://base-sepolia.example");
        assertEq(receiver.args(1), "60");

        receiver.setSubscriptionId(456);
        assertEq(receiver.subscriptionId(), 456);

        receiver.setMinUpkeepInterval(900);
        assertEq(receiver.minUpkeepInterval(), 900);
    }

    function test_adminSetters_revertForNonOwner() public {
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBEEF)));
        receiver.setSource("x");

        string[] memory newArgs = new string[](1);
        newArgs[0] = "y";
        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBEEF)));
        receiver.setArgs(newArgs);

        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBEEF)));
        receiver.setSubscriptionId(789);

        vm.prank(address(0xBEEF));
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(0xBEEF)));
        receiver.setMinUpkeepInterval(1);
    }

    function test_performUpkeep_revertsWhenCooldownNotReached() public {
        vm.expectRevert(FunctionsReceiver.UpkeepIntervalNotReached.selector);
        receiver.performUpkeep("");
    }

    function test_performUpkeep_sendsRequestThroughRouterAndTracksState() public {
        receiver.setSource("return Functions.encodeUint256(42);");
        string[] memory newArgs = new string[](2);
        newArgs[0] = "https://base-sepolia.example";
        newArgs[1] = "60";
        receiver.setArgs(newArgs);

        vm.warp(block.timestamp + receiver.minUpkeepInterval());

        vm.expectEmit(true, false, false, true);
        emit FunctionsReceiver.FunctionsRequestSent(router.nextRequestId());
        receiver.performUpkeep("");

        assertEq(receiver.lastUpkeepTimestamp(), block.timestamp);
        assertEq(receiver.s_lastRequestId(), router.nextRequestId());
        assertEq(router.sendCount(), 1);
        assertEq(router.lastSubscriptionId(), SUBSCRIPTION_ID);
        assertEq(router.lastCallbackGasLimit(), CALLBACK_GAS_LIMIT);
        assertEq(router.lastDonId(), DON_ID);

        bytes memory expectedPayload = abi.encode(receiver.source(), newArgs);
        bytes memory actualPayload = router.lastRequestData();
        assertEq(actualPayload, expectedPayload);
    }

    function test_fulfillRequest_revertsWhenCallerIsNotRouter() public {
        vm.expectRevert(abi.encodeWithSelector(FunctionsReceiver.UnauthorizedRouter.selector, address(this)));
        receiver.fulfillRequest(bytes32("req"), abi.encode(uint256(55)), "");
    }

    function test_fulfillRequest_success_updatesOracleAndEmitsResponseEvent() public {
        oracle.setAuthorizedUpdater(address(receiver), true);

        bytes32 requestId = bytes32("request-1");
        bytes memory response = abi.encode(uint256(77));
        vm.expectEmit(true, false, false, true);
        emit FunctionsReceiver.FunctionsResponseReceived(requestId, 77);

        vm.prank(address(router));
        receiver.fulfillRequest(requestId, response, "");

        (uint256 utilization,, bool stale, uint8 source) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 77);
        assertFalse(stale);
        assertEq(source, oracle.SOURCE_FUNCTIONS());
        assertEq(receiver.s_lastRequestId(), requestId);
        assertEq(receiver.s_lastResponse(), response);
        assertEq(receiver.s_lastError(), bytes(""));
    }

    function test_fulfillRequest_error_doesNotRevertAndKeepsOracleValue() public {
        bytes32 requestId = bytes32("request-2");
        bytes memory err = bytes("functions failed");

        vm.expectEmit(true, false, false, true);
        emit FunctionsReceiver.FunctionsError(requestId, err);

        vm.prank(address(router));
        receiver.fulfillRequest(requestId, "", err);

        (uint256 utilization,, bool stale,) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 50);
        assertTrue(stale);
        assertEq(receiver.s_lastRequestId(), requestId);
        assertEq(receiver.s_lastError(), err);
    }

    function test_fulfillRequest_oracleReject_doesNotRevertAndEmitsError() public {
        bytes32 requestId = bytes32("request-3");
        bytes memory response = abi.encode(uint256(66));

        vm.expectEmit(true, false, false, false);
        emit FunctionsReceiver.FunctionsError(requestId, bytes(""));

        vm.prank(address(router));
        receiver.fulfillRequest(requestId, response, "");

        (uint256 utilization,, bool stale,) = oracle.getUtilizationWithMeta();
        assertEq(utilization, 50);
        assertTrue(stale);
    }
}
