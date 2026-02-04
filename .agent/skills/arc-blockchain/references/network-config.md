# Arc Network Configuration

Arcネットワークへの接続設定と各種エンドポイント情報。

## Arc Testnet

### 基本情報

| 項目 | 値 |
|------|-----|
| Network Name | Arc Testnet |
| Chain ID | `1244` (ChainList) / `5042002` (一部ドキュメント) |
| Currency Symbol | USDC |
| Currency Decimals | 18 (native) / 6 (ERC-20) |
| CCTP Domain | 7 |
| Status | Public Testnet (2025年10月〜) |

### RPC Endpoints

#### 公開RPC

| プロバイダー | URL | 特徴 |
|-------------|-----|------|
| dRPC | `https://arc-testnet.drpc.org` | 無料、レート制限あり |
| Public | `https://rpc.arc.network` | 公式（確認中） |

#### 有料/機関向けRPC

| プロバイダー | 特徴 |
|-------------|------|
| Quicknode | 低レイテンシ、グローバル分散 |
| Blockdaemon | 機関向け、高可用性 |
| Alchemy | 開発者ツール統合 |

### WebSocket Endpoints

```
wss://arc-testnet.drpc.org
```

### Block Explorer

| Explorer | URL |
|----------|-----|
| Arc Explorer | https://explorer.arc.network |
| Blockscout | （確認中） |

## ウォレット設定

### MetaMask手動設定

1. MetaMaskを開く
2. ネットワークを追加 → カスタムRPCを追加
3. 以下を入力:

```
Network Name: Arc Testnet
RPC URL: https://arc-testnet.drpc.org
Chain ID: 1244
Currency Symbol: USDC
Block Explorer URL: https://explorer.arc.network
```

### wagmi設定

```typescript
import { defineChain } from 'viem'

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
    default: {
      http: ['https://arc-testnet.drpc.org'],
      webSocket: ['wss://arc-testnet.drpc.org'],
    },
    public: {
      http: ['https://arc-testnet.drpc.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.network' },
  },
  testnet: true,
})
```

### ethers.js設定

```typescript
import { ethers } from 'ethers'

const arcTestnetConfig = {
  chainId: 1244,
  name: 'Arc Testnet',
  rpcUrl: 'https://arc-testnet.drpc.org',
}

const provider = new ethers.JsonRpcProvider(arcTestnetConfig.rpcUrl)
const signer = new ethers.Wallet(privateKey, provider)
```

### Foundry設定

```toml
# foundry.toml
[rpc_endpoints]
arc_testnet = "https://arc-testnet.drpc.org"

[etherscan]
arc_testnet = { key = "${ETHERSCAN_API_KEY}", url = "https://explorer.arc.network/api" }
```

### Hardhat設定

```javascript
// hardhat.config.js
module.exports = {
  networks: {
    arcTestnet: {
      url: "https://arc-testnet.drpc.org",
      chainId: 1244,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: "auto",
    }
  }
};
```

## Faucet

### Circle Faucet

**URL**: https://faucet.circle.com/

**利用方法**:
1. Arc Testnetを選択
2. USDC または EURC を選択
3. ウォレットアドレスを入力
4. 受け取り

**制限**:
- 20 USDC / 2時間 / アドレス
- アカウント登録不要
- パーミッションレス

## ノードプロバイダー

### Quicknode

```bash
# Quicknode Arc RPC
# https://www.quicknode.com/chains/arc
```

特徴:
- グローバル分散エンドポイント
- 低レイテンシ
- アーカイブノードサポート

### Blockdaemon

```bash
# Blockdaemon Arc RPC
# https://www.blockdaemon.com/
```

特徴:
- 機関向け
- SLA保証
- 専用インフラ

### Alchemy

```bash
# Alchemy Arc RPC
# https://www.alchemy.com/
```

特徴:
- 開発者ツール統合
- エンハンストAPI
- Webhook対応

## Arc Mainnet（2026年予定）

**ステータス**: 未ローンチ

メインネット情報は2026年のローンチ時に公開予定。

## ネットワーク仕様

### コンセンサス

| 項目 | 値 |
|------|-----|
| コンセンサスエンジン | Malachite (BFT) |
| ブロックタイム | 可変（〜350ms finality） |
| ファイナリティ | 決定論的、即時 |

### パフォーマンス

| 構成 | TPS | Finality |
|------|-----|----------|
| 4バリデーター | 〜10,000 | 〜200ms |
| 20バリデーター（地理分散） | 〜3,000 | 〜350ms |
| 100バリデーター | 〜2,000 | 〜780ms |

### ガス設定

| 項目 | 値 |
|------|-----|
| ガストークン | USDC |
| 基本フィー目標 | 〜$0.01/tx |
| フィーモデル | EIP-1559 + EWMA |
| フィー上限 | あり（スパイク防止） |

## トラブルシューティング

### 接続エラー

```javascript
// RPC接続テスト
const provider = new ethers.JsonRpcProvider('https://arc-testnet.drpc.org')

try {
  const blockNumber = await provider.getBlockNumber()
  console.log('Connected! Block:', blockNumber)
} catch (error) {
  console.error('Connection failed:', error)
  // 別のRPCエンドポイントを試す
}
```

### Chain ID不一致

```javascript
// Chain ID確認
const network = await provider.getNetwork()
console.log('Chain ID:', network.chainId) // 1244n (BigInt)
```

### ガス見積もりエラー

```javascript
// USDC建てのガス見積もり
const gasEstimate = await contract.estimateGas.transfer(recipient, amount)
const feeData = await provider.getFeeData()

console.log('Gas estimate:', gasEstimate.toString())
console.log('Max fee per gas:', feeData.maxFeePerGas?.toString())
// 注意: USDC建て（ドル）
```

## 参考リンク

- Arc公式ドキュメント: https://docs.arc.network/arc/references/connect-to-arc
- ChainList: https://chainlist.org/chain/1244
- Thirdweb: https://thirdweb.com/arc-testnet
