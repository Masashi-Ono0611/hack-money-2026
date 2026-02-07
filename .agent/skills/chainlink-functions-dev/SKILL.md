---
name: chainlink-functions-dev
description: Comprehensive development guide and templates for Chainlink Functions: Serverless off-chain compute.
license: MIT
compatibility: "Designed for Antigravity Agent"
metadata:
  author: Antigravity-User
  version: "1.0.0"
allowed-tools:
  - run_command
  - write_to_file
  - read_file
---

# Chainlink Functions Development Skill

This skill provides comprehensive guidance, templates, and best practices for developing applications using **Chainlink Functions**.
Chainlink Functions allows smart contracts to access any API and perform custom computation off-chain in a trust-minimized, serverless environment.

## 🚀 Key Features

*   **Connect to Any API**: Fetch data from public or private APIs (GET, POST, PUT, DELETE, etc.).
*   **Custom Computation**: Process data off-chain using JavaScript (e.g., aggregation, math, parsing) before putting it on-chain to save gas.
*   **Secret Management**: Securely use API keys and other secrets using threshold encryption.
*   **Serverless**: No need to run your own Chainlink node.

## 📦 Prerequisites

1.  **Node.js**: Version 18 or higher.
2.  **Web3 Wallet**: MetaMask or similar, funded with testnet ETH (for gas) and LINK (for subscription).
3.  **Chainlink Functions Subscription**: You need to create and fund a subscription to pay for requests.
    *   [Create Subscription](https://functions.chain.link/)
4.  **Foundry**: If using Foundry, ensure `forge`, `cast`, and `anvil` are installed (`foundryup`).

## 🛠️ Workflow

Development typically follows these steps:

1.  **Write Off-Chain Code (`source.js`)**: Create the JavaScript logic that will run on the DON (Decentralized Oracle Network).
2.  **Simulate Locally**: Test your JavaScript code locally using the Chainlink Functions Simulator to ensure it works as expected before deploying.
3.  **Deploy Consumer Contract**: Deploy a smart contract that inherits from `FunctionsClient` to send requests and receive responses.
4.  **Manage Subscription**:
    *   Create a subscription UI at [functions.chain.link](https://functions.chain.link).
    *   Fund it with LINK.
    *   Add your deployed consumer contract address as an authorized consumer.
5.  **Execute Request**: Call the `sendRequest` function on your consumer contract.

### Foundry workflow
1. **Install Dependencies**: `forge install smartcontractkit/chainlink-evm --no-commit`
2. **Configure**: Set up `foundry.toml` with remappings.
3. **Test**: Run `forge test`.
4. **Deploy**: Run `forge script script/DeployFunctionsConsumer.s.sol:DeployFunctionsConsumer --rpc-url <RPC_URL> --private-key <KEY> --broadcast`.

## 📂 File Structure

Recommended structure for a Chainlink Functions project:

```text
my-project/
├── contracts/
│   └── FunctionsConsumer.sol   # The smart contract
├── scripts/
│   ├── source.js               # The off-chain JavaScript code
│   └── request.js              # Simulation/Execution script
├── examples/
│   ├── FunctionsConsumer.t.sol # Foundry test
│   └── DeployFunctionsConsumer.s.sol # Foundry deployment script
├── package.json                # Project dependencies
├── foundry.toml                # Foundry configuration
└── hardhat.config.ts
```

## 📝 Code Templates

### 1. Off-Chain JavaScript (`scripts/source.js`)

This code runs on the DON. It must be self-contained (no `require` except tailored modules).

```javascript
// Example: Fetch data from an API
const characterId = args[0];
const apiResponse = await Functions.makeHttpRequest({
  url: `https://swapi.dev/api/people/${characterId}/`,
});

if (apiResponse.error) {
  throw Error('Request failed');
}

const { data } = apiResponse;
return Functions.encodeString(data.name);
```

### 2. Smart Contract (`contracts/FunctionsConsumer.sol`)

Inherits from `FunctionsClient` and `ConfirmedOwner`.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";

contract FunctionsConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    bytes32 public s_lastRequestId;
    bytes public s_lastResponse;
    bytes public s_lastError;

    // Check https://docs.chain.link/chainlink-functions/supported-networks for router address
    constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender) {}

    function sendRequest(
        string memory source,
        string[] memory args,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donID
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(source);
        if (args.length > 0) req.setArgs(args);

        s_lastRequestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donID
        );
        return s_lastRequestId;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        s_lastResponse = response;
        s_lastError = err;
    }
}

### 3. Foundry Configuration (`foundry.toml`)

```toml
[profile.default]
src = "contracts"
test = "test"
script = "script"
out = "out"
libs = ["lib"]
remappings = [
    "@chainlink/contracts/=lib/chainlink-evm/contracts/",
    "@chainlink/contracts-ccip/=lib/chainlink-evm/contracts/",
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/",
]
```

### 4. Foundry Deployment Script (`script/DeployFunctionsConsumer.s.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Script, console2} from "forge-std/Script.sol";
import {FunctionsConsumer} from "../contracts/FunctionsConsumer.sol";

contract DeployFunctionsConsumer is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address router = vm.envAddress("FUNCTIONS_ROUTER"); // e.g. Sepolia 0xb83E...

        vm.startBroadcast(deployerPrivateKey);

        FunctionsConsumer consumer = new FunctionsConsumer(router);
        console2.log("FunctionsConsumer deployed to:", address(consumer));

        vm.stopBroadcast();
    }
}
```

### 5. Foundry Test (`test/FunctionsConsumer.t.sol`)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {FunctionsConsumer} from "../contracts/FunctionsConsumer.sol";

contract FunctionsConsumerTest is Test {
    FunctionsConsumer public consumer;
    address public router = makeAddr("router");
    address public owner = makeAddr("owner");

    function setUp() public {
        vm.prank(owner);
        consumer = new FunctionsConsumer(router);
    }

    function test_Initialization() public {
        assertEq(consumer.owner(), owner);
    }

    // Checking that only owner can send request
    function test_RevertWhen_NotOwnerCallsSendRequest() public {
        vm.prank(makeAddr("stranger"));
        vm.expectRevert();
        consumer.sendRequest("source", new string[](0), 1, 300000, bytes32("donId"));
    }
}
```

## 🌐 Supported Networks & Configs

Important values for different networks (Router solidity address & DON ID):

| Network | Router Address | DON ID |
| :--- | :--- | :--- |
| **Ethereum Sepolia** | `0xb83E47C2bC239B3bf370bc41e1459A34b41238D0` | `fun-ethereum-sepolia-1` |
| **Base Sepolia** | `0xf9B8fc0781971Add66D33369043c185880232f53` | `fun-base-sepolia-1` |
| **Polygon Amoy** | `0xC22a79eBA640940ABB6dF0f7982cc119578E11De` | `fun-polygon-amoy-1` |
| **Arbitrum Sepolia** | `0x234a5fb5Bd614a7AA2FfAB244D603abFA0Ac5C5C` | `fun-arbitrum-sepolia-1` |
| **Avalanche Fuji** | `0xA9d587a00A31A52Ed70D6026794a8FC5E2F5dCb0` | `fun-avalanche-fuji-1` |

*Note: DON IDs are bytes32 strings. Use `ethers.encodeBytes32String` or similar if needed, or pre-calculated hex.*

## 🔒 Secrets Management

Never hardcode API keys in your `source.js`. Use **Threshold Encryption**.

1.  **Encrypt**: Use the Chainlink Functions CLI or SDK to encrypt secrets locally.
2.  **Upload**: Upload encrypted secrets to a decentralized storage (IPFS) or use Generic Secrets (gist).
3.  **Reference**: Pass the reference URL to the `FunctionsRequest`.

## ⚠️ Best Practices & Limitations

*   **Execution Time**: Max 10 seconds.
*   **Response Size**: Max 256 bytes (by default on some networks).
*   **Code Size**: Javascript max size 4kb.
*   **Deterministic**: Code must be deterministic. Avoid `Math.random()` or `Date.now()`.
*   **Gas Limit**: Set an appropriate Callback Gas Limit (max 300,000 usually).
*   **Error Handling**: Always return *something* even on error, or throw an Error to trigger `s_lastError`.
