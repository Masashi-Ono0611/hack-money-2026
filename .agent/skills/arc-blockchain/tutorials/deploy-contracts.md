# Deploy Smart Contracts on Arc

Arcへのスマートコントラクトデプロイの完全ガイド。

## 前提条件

- [setup-guide.md](setup-guide.md) の完了
- Arc Testnet USDC（Faucetから取得）
- 秘密鍵の設定

## 1. 基本デプロイ（Foundry）

### シンプルなコントラクト

```solidity
// src/SimpleStorage.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    uint256 private value;

    event ValueChanged(uint256 newValue);

    function setValue(uint256 _value) external {
        value = _value;
        emit ValueChanged(_value);
    }

    function getValue() external view returns (uint256) {
        return value;
    }
}
```

### デプロイスクリプト

```solidity
// script/DeploySimpleStorage.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleStorage.sol";

contract DeploySimpleStorage is Script {
    function run() external returns (SimpleStorage) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SimpleStorage simpleStorage = new SimpleStorage();

        console.log("SimpleStorage deployed to:", address(simpleStorage));
        console.log("Deployer:", vm.addr(deployerPrivateKey));

        vm.stopBroadcast();

        return simpleStorage;
    }
}
```

### デプロイ実行

```bash
# 環境変数を設定
export PRIVATE_KEY=your_private_key
export RPC_URL=https://arc-testnet.drpc.org

# シミュレーション（ドライラン）
forge script script/DeploySimpleStorage.s.sol:DeploySimpleStorage \
  --rpc-url $RPC_URL

# 本番デプロイ
forge script script/DeploySimpleStorage.s.sol:DeploySimpleStorage \
  --rpc-url $RPC_URL \
  --broadcast

# 出力例:
# == Logs ==
#   SimpleStorage deployed to: 0x...
#   Deployer: 0x...
```

## 2. USDC統合コントラクト

### 支払いコントラクト

```solidity
// src/USDCPayment.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title USDCPayment
/// @notice Arc上でのUSDC支払い処理
contract USDCPayment is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Arc Testnet USDC
    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    // 手数料（basis points: 100 = 1%）
    uint256 public feeBps = 100;
    address public feeRecipient;

    event PaymentProcessed(
        bytes32 indexed paymentId,
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 fee
    );

    constructor(address _feeRecipient) Ownable(msg.sender) {
        feeRecipient = _feeRecipient;
    }

    /// @notice 支払いを処理
    /// @param to 受取人
    /// @param amount 金額（6 decimals）
    /// @param reference 参照ID
    function pay(
        address to,
        uint256 amount,
        bytes32 reference
    ) external nonReentrant returns (bytes32 paymentId) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be positive");

        // 手数料計算
        uint256 fee = (amount * feeBps) / 10000;
        uint256 netAmount = amount - fee;

        // USDC転送
        USDC.safeTransferFrom(msg.sender, to, netAmount);
        if (fee > 0) {
            USDC.safeTransferFrom(msg.sender, feeRecipient, fee);
        }

        paymentId = keccak256(abi.encode(msg.sender, to, amount, block.timestamp, reference));

        emit PaymentProcessed(paymentId, msg.sender, to, amount, fee);
    }

    /// @notice 手数料率を更新
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // 最大10%
        feeBps = _feeBps;
    }

    /// @notice 手数料受取人を更新
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }
}
```

### デプロイスクリプト

```solidity
// script/DeployUSDCPayment.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/USDCPayment.sol";

contract DeployUSDCPayment is Script {
    function run() external returns (USDCPayment) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address feeRecipient = vm.envAddress("FEE_RECIPIENT");

        vm.startBroadcast(deployerPrivateKey);

        USDCPayment payment = new USDCPayment(feeRecipient);

        console.log("USDCPayment deployed to:", address(payment));
        console.log("Fee recipient:", feeRecipient);

        vm.stopBroadcast();

        return payment;
    }
}
```

### デプロイ

```bash
export FEE_RECIPIENT=0xYourFeeRecipientAddress

forge script script/DeployUSDCPayment.s.sol:DeployUSDCPayment \
  --rpc-url $RPC_URL \
  --broadcast
```

## 3. アップグレード可能コントラクト

### UUPSパターン

```solidity
// src/UpgradeablePayment.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UpgradeablePayment is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    IERC20 public constant USDC = IERC20(0x3600000000000000000000000000000000000000);

    uint256 public version;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        version = 1;
    }

    function pay(address to, uint256 amount) external nonReentrant {
        USDC.safeTransferFrom(msg.sender, to, amount);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
```

### デプロイスクリプト（UUPS）

```solidity
// script/DeployUpgradeable.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/UpgradeablePayment.sol";

contract DeployUpgradeable is Script {
    function run() external returns (address proxy, address implementation) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Implementation デプロイ
        UpgradeablePayment impl = new UpgradeablePayment();
        console.log("Implementation:", address(impl));

        // Proxy デプロイ
        bytes memory data = abi.encodeCall(UpgradeablePayment.initialize, ());
        ERC1967Proxy proxyContract = new ERC1967Proxy(address(impl), data);
        console.log("Proxy:", address(proxyContract));

        vm.stopBroadcast();

        return (address(proxyContract), address(impl));
    }
}
```

## 4. CREATE2 デプロイ

決定論的アドレスでのデプロイ:

```solidity
// script/DeployCREATE2.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleStorage.sol";

contract DeployCREATE2 is Script {
    function run() external returns (SimpleStorage) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        bytes32 salt = keccak256("my-unique-salt-v1");

        // 予測されるアドレスを計算
        bytes memory bytecode = type(SimpleStorage).creationCode;
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );
        address predicted = address(uint160(uint256(hash)));
        console.log("Predicted address:", predicted);

        vm.startBroadcast(deployerPrivateKey);

        // CREATE2でデプロイ
        SimpleStorage deployed = new SimpleStorage{salt: salt}();
        console.log("Actual address:", address(deployed));

        vm.stopBroadcast();

        return deployed;
    }
}
```

## 5. コントラクト検証

### Foundry検証

```bash
# デプロイ後に検証
forge verify-contract \
  --chain-id 1244 \
  --compiler-version v0.8.20+commit.a1b79de6 \
  --optimizer-runs 200 \
  $CONTRACT_ADDRESS \
  src/SimpleStorage.sol:SimpleStorage \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verifier-url https://explorer.arc.network/api

# コンストラクタ引数がある場合
forge verify-contract \
  --chain-id 1244 \
  --compiler-version v0.8.20+commit.a1b79de6 \
  --constructor-args $(cast abi-encode "constructor(address)" 0xFeeRecipient) \
  $CONTRACT_ADDRESS \
  src/USDCPayment.sol:USDCPayment \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --verifier-url https://explorer.arc.network/api
```

### 検証ステータス確認

```bash
forge verify-check \
  --chain-id 1244 \
  $GUID \
  --verifier-url https://explorer.arc.network/api
```

## 6. Hardhatでのデプロイ

### デプロイスクリプト

```typescript
// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 残高確認
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatUnits(balance, 18), "USDC");

  // デプロイ
  const SimpleStorage = await ethers.getContractFactory("SimpleStorage");
  const simpleStorage = await SimpleStorage.deploy();
  await simpleStorage.waitForDeployment();

  console.log("SimpleStorage deployed to:", await simpleStorage.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### 実行

```bash
npx hardhat run scripts/deploy.ts --network arcTestnet
```

### 検証

```bash
npx hardhat verify --network arcTestnet $CONTRACT_ADDRESS
```

## 7. ガス最適化

### 最適化設定

```toml
# foundry.toml
[profile.default]
optimizer = true
optimizer_runs = 200

[profile.production]
optimizer_runs = 10000  # 頻繁に呼ばれるコントラクト用
via_ir = true          # IR最適化
```

### ガスレポート

```bash
# テスト時にガスレポート
forge test --gas-report

# 出力例:
# | Function     | min   | avg   | median | max   |
# |--------------|-------|-------|--------|-------|
# | setValue     | 22491 | 22491 | 22491  | 22491 |
# | getValue     | 2370  | 2370  | 2370   | 2370  |
```

### ガス見積もり

```bash
# 関数呼び出しのガス見積もり
cast estimate $CONTRACT_ADDRESS "setValue(uint256)" 123 \
  --rpc-url $RPC_URL

# デプロイコスト（USDC建て）
# 例: 200,000 gas × 0.001 USDC/gas = 200 USDC
```

## 8. マルチチェーンデプロイ

### 同じアドレスでのデプロイ

```solidity
// script/MultiChainDeploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SimpleStorage.sol";

contract MultiChainDeploy is Script {
    // 同じsaltを使用して同じアドレスを実現
    bytes32 constant SALT = keccak256("multi-chain-v1");

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        SimpleStorage deployed = new SimpleStorage{salt: SALT}();
        console.log("Deployed to:", address(deployed));

        vm.stopBroadcast();
    }
}
```

```bash
# 複数チェーンにデプロイ
forge script script/MultiChainDeploy.s.sol --rpc-url $ARC_RPC --broadcast
forge script script/MultiChainDeploy.s.sol --rpc-url $ETH_RPC --broadcast
forge script script/MultiChainDeploy.s.sol --rpc-url $ARB_RPC --broadcast
```

## 9. デプロイのベストプラクティス

### チェックリスト

```markdown
- [ ] テストが全て通過
- [ ] カバレッジ90%以上
- [ ] ガス最適化確認
- [ ] セキュリティレビュー完了
- [ ] Testnetでの動作確認
- [ ] コントラクト検証完了
- [ ] 緊急停止機能の確認
- [ ] アクセス制御の確認
- [ ] イベントログの確認
```

### デプロイ記録

```bash
# デプロイ情報を記録
cat > deployments/arc-testnet.json << EOF
{
  "network": "arc-testnet",
  "chainId": 1244,
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "contracts": {
    "SimpleStorage": "$CONTRACT_ADDRESS",
    "USDCPayment": "$PAYMENT_ADDRESS"
  },
  "deployer": "$DEPLOYER_ADDRESS",
  "txHash": "$TX_HASH"
}
EOF
```

## 次のステップ

- [bridge-usdc.md](bridge-usdc.md) - CCTPでのクロスチェーン送金
- [../references/usdc-integration.md](../references/usdc-integration.md) - USDC統合詳細
- [../references/gas-and-fees.md](../references/gas-and-fees.md) - ガス・手数料詳細
