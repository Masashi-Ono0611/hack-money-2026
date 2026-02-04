# Arc Gas and Fees

ArcのStable Fee Design（安定手数料設計）とUSDCベースのガスシステム。

## 概要

Arcは**USDC**をネイティブガストークンとして使用。これにより:
- 予測可能なドル建てコスト
- 価格変動リスクの排除
- シンプルな会計処理

**目標**: 1トランザクションあたり約**$0.01**（1セント）

## Stable Fee Design

### EIP-1559 + EWMA

ArcはEthereumのEIP-1559をベースにしつつ、2つの重要な改良を加えています:

#### 1. Fee Smoothing (EWMA)

従来のEIP-1559は前ブロックの使用率のみでベースフィーを計算しますが、Arcは**Exponentially Weighted Moving Average (EWMA)**を使用:

```
次ブロックのベースフィー = f(過去複数ブロックの加重平均使用率)
```

**効果**:
- 短期的なスパイクを平滑化
- より安定した手数料
- 予測可能性の向上

#### 2. Base Fee Bounded（上限設定）

ベースフィーに**固定の上限**を設定:

```
ベースフィー ≤ MAX_BASE_FEE
```

**効果**:
- 極端な混雑時でもフィー上限が保証
- 企業がコスト予測可能

### フィーフロー

```
┌─────────────────────────────────────────────────────────┐
│                    Fee Flow                              │
├─────────────────────────────────────────────────────────┤
│  User → Transaction → Base Fee + Priority Fee           │
│                           ↓                              │
│                    Arc Treasury                          │
│                           ↓                              │
│            (将来的にはガバナンスで分配決定)              │
└─────────────────────────────────────────────────────────┘
```

## ガス代の計算

### 基本計算

```javascript
// Ethereumとの違い
// Ethereum: Gas * Gas Price (ETH) → $ 換算が必要
// Arc: Gas * Gas Price (USDC) → 直接ドル建て

const gasUsed = 21000n; // 基本送金
const baseFee = 1000000n; // 0.001 USDC (6 decimals)
const priorityFee = 100000n; // 0.0001 USDC

const totalFee = gasUsed * (baseFee + priorityFee);
// = 21000 * 1100000 = 23,100,000,000 (wei相当)
// ≈ $0.023 (USDC建て)
```

### ethers.jsでの実装

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://arc-testnet.drpc.org');

async function estimateFee() {
    const feeData = await provider.getFeeData();

    console.log('Max Fee Per Gas:', ethers.formatUnits(feeData.maxFeePerGas!, 6), 'USDC');
    console.log('Max Priority Fee:', ethers.formatUnits(feeData.maxPriorityFeePerGas!, 6), 'USDC');

    // 基本送金のガス見積もり
    const gasEstimate = 21000n;
    const estimatedCost = gasEstimate * feeData.maxFeePerGas!;

    console.log('Estimated Cost:', ethers.formatUnits(estimatedCost, 6), 'USDC');
}
```

### Solidityでの実装

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract FeeEstimator {
    // Arc: ガス価格はUSDC建て

    function getBaseFee() external view returns (uint256) {
        return block.basefee;
    }

    function estimateTransactionCost(uint256 gasLimit) external view returns (uint256) {
        // 実際のコストはベースフィー + プライオリティフィー
        // ここでは簡略化してベースフィーのみ
        return gasLimit * block.basefee;
    }

    // ガス代をUSDCで見積もる（6 decimals表示）
    function estimateCostInUSDC(uint256 gasLimit) external view returns (uint256) {
        uint256 costInWei = gasLimit * block.basefee;
        // 18 decimals → 6 decimals変換
        return costInWei / 1e12;
    }
}
```

## 一般的なガスコスト

### 標準操作

| 操作 | ガス使用量 | 概算コスト |
|------|-----------|-----------|
| USDC送金 | 21,000 | ~$0.01 |
| ERC-20 Transfer | ~65,000 | ~$0.03 |
| ERC-20 Approve | ~46,000 | ~$0.02 |
| Swap (Uniswap-like) | ~150,000 | ~$0.07 |
| NFT Mint | ~100,000 | ~$0.05 |
| Contract Deploy (small) | ~200,000 | ~$0.10 |
| Contract Deploy (large) | ~2,000,000 | ~$1.00 |

*コストは目標ベースフィー$0.01/txに基づく概算*

### コントラクトでのガス最適化

```solidity
// Gas optimization patterns (Arc共通)

// 1. Storage reads/writesを最小化
mapping(address => uint256) public balances;

function efficientUpdate(address user, uint256 newBalance) external {
    // Bad: 複数回のsload
    // if (balances[user] > 0) {
    //     uint256 old = balances[user];
    //     balances[user] = newBalance;
    // }

    // Good: 1回のsload, 1回のsstore
    uint256 old = balances[user];
    if (old > 0) {
        balances[user] = newBalance;
    }
}

// 2. Calldataを使用
function processArray(uint256[] calldata data) external pure returns (uint256) {
    // calldata は memory より安い
    uint256 sum;
    for (uint256 i = 0; i < data.length; i++) {
        sum += data[i];
    }
    return sum;
}

// 3. 短いrevertメッセージ
function requireCheck(uint256 amount) external pure {
    // Bad: require(amount > 0, "Amount must be greater than zero");
    // Good:
    require(amount > 0, "!amount");
}
```

## Paymaster との連携

### ガス代スポンサー

Paymasterを使用すると、dAppがユーザーのガス代を肩代わりできます:

```solidity
// ユーザーはUSDCを持たなくてもトランザクション実行可能
// Paymasterがガス代を支払い

interface IPaymaster {
    function sponsorUserOperation(
        bytes calldata userOp,
        uint256 maxGas
    ) external;
}
```

### EURC支払い

Paymasterを通じてEURCでガス代を支払うことも可能（将来的にネイティブサポート予定）:

```solidity
// 現在: Paymaster経由でEURC → USDC変換
// 将来: EURCのネイティブガス支払い（enshrined paymaster）
```

## フィー見積もりAPI

### JSON-RPC

```javascript
// eth_feeHistory - 過去のフィー情報
const feeHistory = await provider.send('eth_feeHistory', [
    '0x10', // 16ブロック
    'latest',
    [25, 50, 75] // パーセンタイル
]);

// eth_maxPriorityFeePerGas - 推奨プライオリティフィー
const priorityFee = await provider.send('eth_maxPriorityFeePerGas', []);

// eth_gasPrice - 現在のガス価格
const gasPrice = await provider.send('eth_gasPrice', []);
```

### フィー推定ライブラリ

```typescript
// viem example
import { createPublicClient, http } from 'viem';
import { arcTestnet } from './chains';

const client = createPublicClient({
    chain: arcTestnet,
    transport: http(),
});

async function getFeeEstimate() {
    const [gasPrice, block] = await Promise.all([
        client.getGasPrice(),
        client.getBlock(),
    ]);

    console.log('Gas Price:', gasPrice);
    console.log('Base Fee:', block.baseFeePerGas);
}
```

## EthereumとArcの比較

| 項目 | Ethereum | Arc |
|------|----------|-----|
| ガストークン | ETH | USDC |
| 価格変動 | あり（高い） | なし（ペグ） |
| フィー計算 | ドル換算必要 | 直接ドル建て |
| ベースフィー調整 | ブロックごと | EWMA平滑化 |
| フィー上限 | なし | あり |
| 会計処理 | 複雑 | シンプル |

## ベストプラクティス

### 1. 適切なガスリミット設定

```typescript
// 見積もり + バッファ
const gasEstimate = await contract.estimateGas.myFunction();
const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
```

### 2. フィー設定

```typescript
const feeData = await provider.getFeeData();

const tx = {
    maxFeePerGas: feeData.maxFeePerGas,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
    // Arc: これらはUSDC建て
};
```

### 3. コスト監視

```typescript
// トランザクション後のコスト確認
const receipt = await tx.wait();
const actualCost = receipt.gasUsed * receipt.effectiveGasPrice;
console.log('Actual cost:', ethers.formatUnits(actualCost, 6), 'USDC');
```

## 参考リンク

- Arc公式ドキュメント: https://docs.arc.network/arc/concepts/stable-fee-design
- Arc公式ブログ: https://www.arc.network/blog/how-gas-works-on-arc
- EIP-1559: https://eips.ethereum.org/EIPS/eip-1559
