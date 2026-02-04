# Arc EVM Compatibility

ArcのEVM互換性と、Ethereumからの移行時の考慮事項。

## 概要

ArcはPrague EVMハードフォークと互換性があり、既存のEthereumツールチェーンがほぼそのまま使用可能。

## 互換性マトリックス

### ツールチェーン

| ツール | 互換性 | 備考 |
|--------|--------|------|
| Solidity | ○ | 0.8.x 推奨 |
| Vyper | ○ | - |
| Foundry | ○ | RPC設定のみ必要 |
| Hardhat | ○ | ネットワーク設定必要 |
| Remix | ○ | カスタムネットワーク追加 |
| Truffle | ○ | レガシー、非推奨 |

### ライブラリ

| ライブラリ | 互換性 | 備考 |
|-----------|--------|------|
| ethers.js v6 | ○ | - |
| viem | ○ | - |
| web3.js | ○ | - |
| OpenZeppelin | ○ | - |

### ウォレット

| ウォレット | 互換性 | 備考 |
|-----------|--------|------|
| MetaMask | ○ | カスタムネットワーク追加 |
| Rainbow | ○ | Arc Testnet対応 |
| Ledger | ○ | - |
| Fireblocks | ○ | 機関向け |

## 主要な違い

### 1. ガストークン

**最大の違い**: ガストークンがETHではなく**USDC**

```solidity
// Ethereum
// ETHで支払い、価格変動あり
uint256 gasCost = gasUsed * gasPrice; // ETH

// Arc
// USDCで支払い、ドル建て
uint256 gasCost = gasUsed * gasPrice; // USDC (安定)
```

**影響**:
- `msg.value`はUSDC（18 decimals）
- `address.balance`はUSDC残高
- ガス見積もりがドル建てで予測可能

### 2. ファイナリティ

| 項目 | Ethereum | Arc |
|------|----------|-----|
| タイプ | 確率的 | 決定論的 |
| 時間 | 〜12分（安全） | 〜350ms |
| リオーグリスク | あり | なし |

**影響**:
- 確認数待ちロジックは不要
- トランザクション成功 = 即座にファイナル

```solidity
// Ethereum: 確認数を待つパターン
// await tx.wait(12); // 12ブロック待ち

// Arc: 待ち不要
// await tx.wait(); // 1ブロック = ファイナル
```

### 3. ブロック時間

| 項目 | Ethereum | Arc |
|------|----------|-----|
| ブロック時間 | 〜12秒 | 可変（サブ秒） |
| ブロックあたりTx | 〜300 | 〜3,000+ |

### 4. USDCデシマル

```solidity
// Ethereum USDC: 6 decimals
// Arc Native USDC: 18 decimals
// Arc ERC-20 USDC: 6 decimals

// 重要: ERC-20インターフェースを使用すれば同じ
IERC20(USDC).balanceOf(user); // 6 decimals（Ethereum/Arc共通）
```

## サポートされるOpcodes

### 完全サポート

- すべての標準EVM opcodes
- Prague ハードフォークの opcodes
- CREATE2
- DELEGATECALL
- STATICCALL

### Arc固有の動作

```solidity
// block.basefee
// Ethereum: ETH建て
// Arc: USDC建て

// block.number
// 動作は同じだが、ブロック生成速度が異なる

// block.timestamp
// 動作は同じ
```

## プリコンパイル

Arc はEthereumの標準プリコンパイルをサポート:

| アドレス | 機能 |
|---------|------|
| 0x01 | ecrecover |
| 0x02 | SHA2-256 |
| 0x03 | RIPEMD-160 |
| 0x04 | identity |
| 0x05 | modexp |
| 0x06 | ecAdd |
| 0x07 | ecMul |
| 0x08 | ecPairing |
| 0x09 | blake2f |

## 移行ガイド

### Foundryプロジェクトの移行

```bash
# 1. RPC設定を追加
cat >> foundry.toml << 'EOF'

[rpc_endpoints]
arc_testnet = "https://arc-testnet.drpc.org"
EOF

# 2. スクリプトはそのまま使用可能
forge script script/Deploy.s.sol --rpc-url arc_testnet --broadcast
```

### Hardhatプロジェクトの移行

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    // 既存のEthereumネットワーク
    mainnet: { ... },

    // Arc追加
    arcTestnet: {
      url: "https://arc-testnet.drpc.org",
      chainId: 1244,
      accounts: [process.env.PRIVATE_KEY],
    }
  }
};

// デプロイ: npx hardhat run scripts/deploy.js --network arcTestnet
```

### コントラクトの移行

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ほとんどのコントラクトはそのまま動作
// 以下の点のみ確認:

contract MigrationChecklist {
    // 1. ガストークン依存のコード
    // Bad: ETHを想定
    // function getETH() external payable {
    //     require(msg.value > 0);
    // }

    // Good: USDCを想定（または抽象化）
    function receiveUSDC() external payable {
        // msg.value は USDC (18 decimals)
        require(msg.value > 0);
    }

    // 2. 確認数待ちロジック
    // Bad: 確認数をハードコード
    // uint256 public constant CONFIRMATIONS = 12;

    // Good: Arcでは不要
    // 決定論的ファイナリティのため

    // 3. ブロック時間依存
    // Bad: 12秒を想定
    // uint256 public lockDuration = 100 * 12; // 100 blocks = 20min

    // Good: 時間ベースで指定
    uint256 public lockDuration = 20 minutes;
}
```

### フロントエンドの移行

```typescript
// 1. Chain設定を追加
import { defineChain } from 'viem';

export const arcTestnet = defineChain({
  id: 1244,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://arc-testnet.drpc.org'] },
  },
});

// 2. マルチチェーン対応
const chains = [mainnet, arbitrum, arcTestnet];

// 3. ガス表示の調整
function formatGasCost(gasUsed: bigint, gasPrice: bigint, chainId: number) {
  const cost = gasUsed * gasPrice;

  if (chainId === 1244) {
    // Arc: USDC建て
    return `$${formatUnits(cost, 18)}`; // 直接ドル表示
  } else {
    // Ethereum: ETH建て
    return `${formatUnits(cost, 18)} ETH`;
  }
}
```

## テスト戦略

### ローカルテスト

```bash
# Anvil (Foundry) をArcモードで起動
# 注: 完全なArc互換ではないが、基本テストには十分
anvil --chain-id 1244
```

### フォークテスト

```bash
# Arc Testnetをフォーク
forge test --fork-url https://arc-testnet.drpc.org
```

### テストコード

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

contract ArcCompatibilityTest is Test {
    function setUp() public {
        // Arc Testnetをフォーク
        vm.createSelectFork("arc_testnet");
    }

    function test_GasToken() public {
        // ガストークンがUSDC
        uint256 balance = address(this).balance;
        // balanceはUSDC残高（18 decimals）
    }

    function test_Finality() public {
        // 1ブロック = ファイナル
        uint256 blockBefore = block.number;
        // トランザクション実行
        uint256 blockAfter = block.number;
        // 即座にファイナル
    }

    function test_ERC20USDC() public {
        IERC20 usdc = IERC20(0x3600000000000000000000000000000000000000);

        // ERC-20インターフェースは6 decimals
        uint256 balance = usdc.balanceOf(address(this));
        // Ethereumと同じ動作
    }
}
```

## よくある互換性の問題

### 1. ETH送金コード

```solidity
// Problem: ETH送金を想定
// payable(recipient).transfer(1 ether);

// Solution: USDCとして扱う
payable(recipient).transfer(1 * 10**18); // 1 USDC (native)

// Better: ERC-20インターフェース
IERC20(USDC).transfer(recipient, 1 * 10**6); // 1 USDC (ERC-20)
```

### 2. ガス価格の比較

```solidity
// Problem: ETH建てでガス価格を比較
// require(tx.gasprice < 100 gwei);

// Solution: USDC建てで比較
// ベースフィーは〜$0.01/tx を目標
require(tx.gasprice < 1e15); // 適切な閾値を設定
```

### 3. 外部依存

```solidity
// Problem: Ethereum固有のオラクル
// AggregatorV3Interface feed = AggregatorV3Interface(ETH_USD_FEED);

// Solution: Arc対応のオラクルを使用
// Chainlink等がArc対応予定
```

### 4. ブリッジ資産

```solidity
// Problem: ブリッジされたUSDCのアドレスが異なる
// address usdcOnEthereum = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

// Solution: チェーンごとにアドレスを管理
mapping(uint256 => address) public usdcAddress;

constructor() {
    usdcAddress[1] = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Ethereum
    usdcAddress[1244] = 0x3600000000000000000000000000000000000000; // Arc
}
```

## パフォーマンス比較

| 指標 | Ethereum | Arc |
|------|----------|-----|
| TPS | 〜15-30 | 〜3,000+ |
| ファイナリティ | 〜12分 | 〜350ms |
| ガス代 | 変動大 | 〜$0.01 |
| ブロック時間 | 〜12秒 | サブ秒 |

## 参考リンク

- Arc EVM Compatibility: https://docs.arc.network/arc/references/evm-compatibility
- Prague EVM: https://eips.ethereum.org/EIPS/eip-7600
- Foundry: https://book.getfoundry.sh
- Hardhat: https://hardhat.org/docs
