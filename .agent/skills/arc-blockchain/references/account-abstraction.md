# Arc Account Abstraction & Paymaster

ArcのERC-4337ベースのアカウントアブストラクションとCircle Paymasterによるガス代スポンサー機能。

## 概要

Arcは**ERC-4337**（Account Abstraction）をネイティブサポート:

- **スマートアカウント**: プログラマブルなウォレット
- **セッション管理**: dApp承認の簡素化
- **Paymaster**: ガス代スポンサーまたは代替トークン支払い
- **Bundler統合**: Pimlico, Alchemy対応

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                  Account Abstraction Flow                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User → UserOperation → Bundler → EntryPoint → Execution    │
│                           ↓                                  │
│                       Paymaster                              │
│                    (ガス代スポンサー)                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                 │
│  • Smart Account: ユーザーのプログラマブルウォレット        │
│  • Bundler: UserOperationsを集約・実行                      │
│  • EntryPoint: シングルトンコントラクト                     │
│  • Paymaster: ガス代支払いの抽象化                          │
└─────────────────────────────────────────────────────────────┘
```

## Circle Paymaster

### 概要

Circle Paymasterは、Arcでの以下の機能を提供:

1. **ガス代スポンサー**: dAppがユーザーのガス代を肩代わり
2. **代替トークン支払い**: EURC等でガス代を支払い
3. **バッチ処理**: 複数操作を1トランザクションに

### Arcでの特別な位置づけ

- ArcはUSDCがデフォルトガストークン
- Paymasterは**USDC以外**での支払いを可能に
- 将来的に**EURC enshrined paymaster**（ネイティブサポート）予定

## 実装ガイド

### 1. スマートアカウント作成

```typescript
import { createSmartAccountClient } from '@alchemy/aa-core';
import { arcTestnet } from './chains';

// Alchemy Smart Account Client
const smartAccountClient = await createSmartAccountClient({
    chain: arcTestnet,
    transport: http('https://arc-testnet.drpc.org'),
    // ... account configuration
});
```

### 2. UserOperation作成

```typescript
interface UserOperation {
    sender: string;
    nonce: bigint;
    initCode: string;
    callData: string;
    callGasLimit: bigint;
    verificationGasLimit: bigint;
    preVerificationGas: bigint;
    maxFeePerGas: bigint;
    maxPriorityFeePerGas: bigint;
    paymasterAndData: string; // Paymaster情報
    signature: string;
}

// UserOperation構築
const userOp: UserOperation = {
    sender: smartAccountAddress,
    nonce: await entryPoint.getNonce(smartAccountAddress, 0),
    initCode: '0x', // 既存アカウントの場合は空
    callData: encodedCallData,
    callGasLimit: 100000n,
    verificationGasLimit: 100000n,
    preVerificationGas: 21000n,
    maxFeePerGas: 1000000n, // USDC建て
    maxPriorityFeePerGas: 100000n,
    paymasterAndData: '0x' + paymasterAddress + paymasterData,
    signature: '0x',
};
```

### 3. Paymaster統合

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BasePaymaster.sol";

/// @title ArcSponsorPaymaster
/// @notice dAppがユーザーのガス代をスポンサー
contract ArcSponsorPaymaster is BasePaymaster {
    mapping(address => bool) public sponsoredAddresses;

    constructor(IEntryPoint _entryPoint) BasePaymaster(_entryPoint) {}

    /// @notice スポンサー対象を追加
    function addSponsoredAddress(address user) external onlyOwner {
        sponsoredAddresses[user] = true;
    }

    /// @notice UserOperationの検証
    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        // スポンサー対象かチェック
        require(sponsoredAddresses[userOp.sender], "Not sponsored");

        // コスト上限チェック
        require(maxCost <= 1e6, "Cost too high"); // 1 USDC上限

        return (abi.encode(userOp.sender), 0);
    }

    /// @notice 実際のガス代支払い
    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        // スポンサーコストのログ
        address user = abi.decode(context, (address));
        emit GasSponsored(user, actualGasCost);
    }

    event GasSponsored(address indexed user, uint256 cost);
}
```

### 4. EURC支払い Paymaster

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title EURCPaymaster
/// @notice EURCでガス代を支払い
contract EURCPaymaster is BasePaymaster {
    IERC20 public immutable EURC;
    IERC20 public immutable USDC;

    // EURC/USDCレート（6 decimals）
    uint256 public exchangeRate = 1_100_000; // 1 EURC = 1.1 USDC

    constructor(
        IEntryPoint _entryPoint,
        address _eurc,
        address _usdc
    ) BasePaymaster(_entryPoint) {
        EURC = IERC20(_eurc);
        USDC = IERC20(_usdc);
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 /*userOpHash*/,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        // EURCでの必要量を計算
        uint256 eurcRequired = (maxCost * exchangeRate) / 1e6;

        // ユーザーのEURC残高チェック
        require(
            EURC.balanceOf(userOp.sender) >= eurcRequired,
            "Insufficient EURC"
        );

        return (abi.encode(userOp.sender, maxCost), 0);
    }

    function _postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        (address user, ) = abi.decode(context, (address, uint256));

        // 実際のコストをEURCで計算
        uint256 eurcCost = (actualGasCost * exchangeRate) / 1e6;

        // EURCをユーザーから受け取り
        EURC.transferFrom(user, address(this), eurcCost);

        // 内部でUSDCに変換（StableFX統合等）
        // _convertEURCtoUSDC(eurcCost);
    }
}
```

## Bundler統合

### Pimlico

```typescript
import { createPimlicoClient } from '@pimlico/sdk';

const pimlicoClient = createPimlicoClient({
    chain: arcTestnet,
    transport: http('https://api.pimlico.io/v2/arc-testnet/rpc?apikey=API_KEY'),
});

// UserOperationの送信
const hash = await pimlicoClient.sendUserOperation({
    userOperation: userOp,
    entryPoint: ENTRY_POINT_ADDRESS,
});

// 結果の待機
const receipt = await pimlicoClient.waitForUserOperationReceipt({
    hash,
});
```

### Alchemy

```typescript
import { AlchemyProvider } from '@alchemy/aa-alchemy';

const alchemyProvider = new AlchemyProvider({
    chain: arcTestnet,
    apiKey: 'ALCHEMY_API_KEY',
});

// Gas estimation
const gasEstimate = await alchemyProvider.estimateUserOperationGas({
    userOperation: userOp,
});
```

## ユースケース

### 1. オンボーディング

新規ユーザーがUSDCを持たなくてもdAppを使用可能:

```typescript
// dAppがガス代をスポンサー
const sponsoredUserOp = {
    ...userOp,
    paymasterAndData: await sponsorPaymaster.getPaymasterAndData(userOp),
};

// ユーザーはUSDCなしでトランザクション実行
await bundler.sendUserOperation(sponsoredUserOp);
```

### 2. ユーロ圏ユーザー向け

EURCホルダーがそのままガス代を支払い:

```typescript
// EURCでガス代支払い
const eurcUserOp = {
    ...userOp,
    paymasterAndData: await eurcPaymaster.getPaymasterAndData(userOp),
};
```

### 3. バッチ処理

複数操作を1トランザクションに:

```solidity
function executeBatch(
    address[] calldata targets,
    bytes[] calldata calls
) external {
    for (uint256 i = 0; i < targets.length; i++) {
        (bool success, ) = targets[i].call(calls[i]);
        require(success, "Batch call failed");
    }
}
```

### 4. セッションキー

限定的な権限を一時的に付与:

```solidity
struct SessionKey {
    address key;
    uint256 validUntil;
    uint256 spendingLimit;
    address[] allowedContracts;
}

mapping(address => SessionKey) public sessionKeys;

function validateSession(
    address key,
    address target,
    uint256 value
) internal view returns (bool) {
    SessionKey memory session = sessionKeys[key];

    return session.validUntil > block.timestamp
        && session.spendingLimit >= value
        && isAllowedContract(session.allowedContracts, target);
}
```

## セキュリティ考慮事項

### 1. Paymasterの保護

```solidity
// スポンサー上限の設定
uint256 public maxSponsorPerUser = 10e6; // 10 USDC
mapping(address => uint256) public sponsoredAmount;

function _validatePaymasterUserOp(...) internal override {
    require(
        sponsoredAmount[userOp.sender] + maxCost <= maxSponsorPerUser,
        "Sponsor limit exceeded"
    );
}
```

### 2. レート制限

```solidity
mapping(address => uint256) public lastOperationTime;
uint256 public cooldownPeriod = 60; // 60秒

function _validatePaymasterUserOp(...) internal override {
    require(
        block.timestamp > lastOperationTime[userOp.sender] + cooldownPeriod,
        "Cooldown active"
    );
    lastOperationTime[userOp.sender] = block.timestamp;
}
```

### 3. 許可リスト

```solidity
mapping(address => bool) public allowedSenders;

modifier onlyAllowedSender(address sender) {
    require(allowedSenders[sender], "Sender not allowed");
    _;
}
```

## 将来のロードマップ

### Enshrined Paymaster

将来的にArcはEURC等のネイティブガス支払いをプロトコルレベルでサポート予定:

- Paymaster経由ではなく直接EURC支払い
- より低いオーバーヘッド
- シンプルなUX

### 追加ステーブルコイン対応

パートナーステーブルコイン（JPYC, AUDF等）でのガス支払いサポート予定。

## 参考リンク

- Arc公式ドキュメント: https://docs.arc.network/arc/tools/account-abstraction
- ERC-4337: https://eips.ethereum.org/EIPS/eip-4337
- Pimlico: https://docs.pimlico.io
- Alchemy AA: https://docs.alchemy.com/docs/account-abstraction
