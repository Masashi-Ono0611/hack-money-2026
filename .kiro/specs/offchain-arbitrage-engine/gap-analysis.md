# ギャップ分析: Offchain Arbitrage Engine

## 分析概要

本ドキュメントは、`offchain-arbitrage-engine` 仕様の要件と既存コードベースの間のギャップを分析し、実装戦略を検討する。

### 分析サマリー

- **スコープ**: Price Watcher + Arbitrage Engine + Yellow Session Manager の3コンポーネント
- **主要課題**: Yellow SDK (Nitrolite) 統合の不確実性、viem を使った価格取得パターンの確立
- **複雑度**: M-L（新規ライブラリ導入 + 外部プロトコル統合 + リアルタイム処理）
- **リスク**: 中-高（Yellow SDK 統合の未知要素、モック実装でリスク軽減）
- **推奨アプローチ**: Option B（新規コンポーネント作成）+ モックファースト戦略

---

## 1. 現状調査（Current State Investigation）

### 1.1 既存コードベース構造

```
hack-money-2026/
├── scripts/
│   ├── arc-transfer.ts         # Arc USDC 転送サービス（参考パターン）
│   └── settle-to-vault.ts      # Vault 決済サービス（参考パターン）
├── contract/
│   └── src/                    # Solidity コントラクト（Uniswap v4 Hook 予定）
├── frontend/                    # Next.js ダッシュボード（未実装）
└── package.json                 # Root: tsx, jose, typescript
```

### 1.2 既存パターンと規約

**TypeScript パターン（scripts/ から抽出）**:
- ES モジュール形式（`"type": "module"`）
- クラスベースのサービス設計（`ArcTransferService`, `VaultSettlementService`）
- インターフェース定義による型安全性
- 環境変数による設定管理
- 同期的な curl 呼び出し（`execSync`）→ 非同期パターンへの変更推奨

**依存関係**:
- `tsx`: TypeScript 実行
- `jose`: JWT/暗号処理
- `typescript`: 型チェック
- **viem**: 未導入（要追加）
- **@erc7824/nitrolite**: 未導入（Yellow SDK）

### 1.3 関連仕様の状態

| 仕様 | 状態 | 提供するもの |
|------|------|-------------|
| core-token-system | design 完了 | CPT Token, Mock Oracle |
| uniswap-v4-integration | tasks 生成済み | Uniswap v4 Pool, Utilization Hook |
| **offchain-arbitrage-engine** | requirements 完了 | **本仕様** |
| settlement-layer | 未着手 | USDC 決済（Arc 連携は既存スクリプトで部分実装） |

**依存関係**:
- uniswap-v4-integration → Price Watcher が Pool 価格を取得
- settlement-layer → Yellow Session 終了後の USDC 決済

---

## 2. 要件実現可能性分析

### 2.1 要件マッピング

| 要件 | 技術要素 | 既存資産 | ギャップ |
|------|---------|----------|---------|
| R1: Price Watcher | viem, Uniswap v4 価格取得 | なし | **Missing** |
| R1.6: viem 使用 | viem ライブラリ | なし | **Missing** |
| R1.8: 5秒ポーリング | setInterval / cron | なし | **Missing** |
| R2: Arbitrage Engine | 戦略生成ロジック | なし | **Missing** |
| R3: Yellow Session | @erc7824/nitrolite | なし | **Missing** |
| R3.9: モックフォールバック | Mock 実装 | なし | **Missing** |
| R4: Yellow SDK 調査 | ドキュメント確認 | なし | **Research Needed** |
| R5: テストスイート | Vitest | なし | **Missing** |
| R6: エラーハンドリング | 構造化ログ | 部分的（console.log） | **Partial** |

### 2.2 技術的要件

#### Yellow SDK (Nitrolite) 統合

**調査結果**:
- **パッケージ**: `@erc7824/nitrolite` (v0.4.0)
- **セッションライフサイクル**:
  1. チャネル作成・資金投入
  2. WebSocket 接続（`wss://clearnet.yellow.com/ws`）
  3. オフチェーン取引実行
  4. セッションクローズ・最終決済
- **認証**: Bearer トークン（API キー）
- **制約**: セッション流動性はチャネル資金に依存

**モック実装の容易性**: 高
- ステートレスな注文処理
- シンプルな損益計算
- 外部 API 依存なし

#### viem を使った Uniswap v4 価格取得

```typescript
// 想定パターン
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Uniswap v4 Pool の slot0 から価格を取得
const slot0 = await client.readContract({
  address: poolManagerAddress,
  abi: poolManagerABI,
  functionName: 'getSlot0',
  args: [poolId],
});
```

### 2.3 制約事項

1. **Yellow SDK 統合不確実性**: 実際の統合は設計フェーズで検証が必要
2. **Uniswap v4 Pool 依存**: Price Watcher は Pool デプロイ後に動作
3. **リアルタイム処理**: 5秒ポーリングの信頼性確保が必要
4. **WorldCoin Sepolia**: Uniswap v4 未デプロイの可能性（Base Sepolia 優先）

### 2.4 Research Needed（デザインフェーズで調査）

- [ ] Yellow SDK (Nitrolite) の実際の接続テスト
- [ ] Uniswap v4 Pool からの価格取得 ABI 確認
- [ ] viem の WebSocket プロバイダー安定性
- [ ] Vitest + TypeScript strict mode の設定

---

## 3. 実装アプローチオプション

### Option A: 既存コンポーネント拡張

**該当なし** - 裁定エンジン関連の既存資産がないため不適用。

---

### Option B: 新規コンポーネント作成（推奨）

**根拠**:
- 裁定エンジンは独立した責任領域
- リアルタイム処理と既存スクリプトのバッチ処理は性質が異なる
- モック/実装の切り替えが必要でクリーンな設計が望ましい

**作成するコンポーネント**:

| コンポーネント | 配置先 | 役割 |
|---------------|--------|------|
| PriceWatcher | scripts/arbitrage/ | 価格監視・乖離検知 |
| ArbitrageEngine | scripts/arbitrage/ | 裁定戦略生成 |
| YellowSessionManager | scripts/arbitrage/ | Yellow セッション管理 |
| MockYellowSession | scripts/arbitrage/mock/ | モック実装 |
| Logger | scripts/lib/ | 構造化ログ |
| config.ts | scripts/arbitrage/ | 環境変数・定数管理 |

**ディレクトリ構造案**:
```
scripts/
├── arbitrage/
│   ├── index.ts              # エントリーポイント
│   ├── price-watcher.ts      # 価格監視
│   ├── arbitrage-engine.ts   # 戦略生成
│   ├── yellow-session.ts     # Yellow SDK 統合
│   ├── mock/
│   │   └── mock-yellow.ts    # モック実装
│   └── config.ts             # 設定
├── lib/
│   └── logger.ts             # 構造化ログ
├── arc-transfer.ts           # 既存
└── settle-to-vault.ts        # 既存
```

**統合ポイント**:
- Price Watcher → Uniswap v4 Pool（viem 経由）
- Yellow Session → settlement-layer（Arc 決済）
- Logger → dashboard-demo（ログ表示）

**トレードオフ**:
- ✅ 明確な責任分離
- ✅ モック/実装の切り替え容易
- ✅ 独立したテスト可能性
- ✅ 既存スクリプトパターンを踏襲
- ❌ 新規ファイル数が多い
- ❌ 初期設計コスト

---

### Option C: ハイブリッドアプローチ

**該当なし** - 拡張対象の既存コンポーネントがないため不適用。

---

## 4. 実装複雑度とリスク

### 4.1 工数見積もり

**M-L（5-10日）**

| 作業 | 見積もり |
|------|---------|
| 依存関係導入（viem, nitrolite） | 0.5日 |
| Price Watcher 実装 | 1-1.5日 |
| Arbitrage Engine 実装 | 1日 |
| Yellow Session Manager 実装 | 1.5-2日 |
| モック実装 | 0.5日 |
| 構造化ログ | 0.5日 |
| 単体テスト（Vitest） | 1-1.5日 |
| 統合テスト | 1日 |
| デバッグ・調整バッファ | 1-2日 |

**根拠**:
- Yellow SDK は新規統合（学習曲線あり）
- リアルタイム処理のエラーハンドリングが複雑
- 複数外部依存（viem, nitrolite）の統合

### 4.2 リスク評価

**リスクレベル: 中-高**

| リスク | 影響 | 対策 |
|--------|------|------|
| Yellow SDK 統合失敗 | 高 | モックフォールバック実装（R3.9） |
| viem 価格取得失敗 | 中 | リトライロジック（R1.4）、モック価格データ |
| WorldCoin Sepolia 非対応 | 中 | Base Sepolia 単独優先、後から拡張 |
| ポーリング安定性 | 中 | WebSocket への移行検討、エラーハンドリング強化 |
| テストカバレッジ不足 | 低 | モック実装で高カバレッジ達成可能 |

---

## 5. デザインフェーズへの推奨事項

### 5.1 推奨アプローチ

**Option B（新規コンポーネント作成）+ モックファースト戦略を採用**

理由:
1. 既存資産がなく、拡張対象が存在しない
2. Yellow SDK 統合の不確実性をモックで軽減
3. リアルタイム処理は専用設計が望ましい
4. ハッカソン要件（デモ成功）に合致

### 5.2 モックファースト戦略

1. **Phase 1**: モック実装で全フロー動作確認
2. **Phase 2**: Yellow SDK 実統合（時間があれば）
3. **Phase 3**: 環境変数で切り替え検証

**環境変数**:
```bash
USE_YELLOW_MOCK=true   # モード切り替え
BASE_SEPOLIA_RPC_URL=  # viem RPC
ARBITRAGE_THRESHOLD=50 # 価格差閾値（bps）
POLL_INTERVAL_MS=5000  # ポーリング間隔
```

### 5.3 重要な設計決定

1. **イベント駆動 vs ポーリング**: ポーリング（5秒）を採用（要件 R1.8）
2. **エラーリトライ**: 3回リトライ後にアラート（R1.4, R1.5）
3. **ログ形式**: JSON 構造化ログ（R6.3）
4. **モック切り替え**: 環境変数 `USE_YELLOW_MOCK`（R3.10）

### 5.4 Research Carried Forward

以下はデザインフェーズで調査・解決が必要:

1. **Yellow SDK 実接続テスト**
   - `@erc7824/nitrolite` インストール
   - ClearNode への WebSocket 接続確認
   - テストネット動作検証

2. **Uniswap v4 価格取得 ABI**
   - PoolManager の slot0 取得方法
   - sqrtPriceX96 から価格への変換

3. **Vitest 設定**
   - TypeScript strict mode 対応
   - モック統合テストパターン

### 5.5 依存関係チェックリスト

**デザインフェーズ開始前に確認**:
- [ ] uniswap-v4-integration の Pool 初期化スクリプト（価格取得先）
- [ ] viem パッケージ追加（package.json）
- [ ] @erc7824/nitrolite パッケージ追加
- [ ] vitest パッケージ追加（テスト用）

---

## 付録: 技術リファレンス

### A.1 Yellow SDK (Nitrolite) 基本パターン

```typescript
// セッションマネージャーインターフェース
interface YellowSessionManager {
  createSession(params: YellowSessionParams): Promise<string>;
  placeOrder(sessionId: string, order: Order): Promise<void>;
  closeSession(sessionId: string): Promise<bigint>; // net profit
  isUsingMock(): boolean;
}

// モック実装
class MockYellowSessionManager implements YellowSessionManager {
  private sessions: Map<string, MockSession> = new Map();

  async createSession(params: YellowSessionParams): Promise<string> {
    const sessionId = `mock-${Date.now()}`;
    this.sessions.set(sessionId, { id: sessionId, orders: [], netProfit: 0n });
    return sessionId;
  }
  // ...
}
```

### A.2 viem 価格取得パターン

```typescript
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
});

// Pool 価格取得（sqrtPriceX96 形式）
async function getPoolPrice(poolId: `0x${string}`): Promise<bigint> {
  const slot0 = await client.readContract({
    address: POOL_MANAGER_ADDRESS,
    abi: poolManagerABI,
    functionName: 'getSlot0',
    args: [poolId],
  });
  return slot0.sqrtPriceX96;
}
```

### A.3 推奨依存関係

```bash
# 追加する依存関係
pnpm add viem @erc7824/nitrolite
pnpm add -D vitest @vitest/coverage-v8
```

### A.4 構造化ログ形式

```typescript
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
}

// 出力例
{
  "timestamp": "2026-02-06T12:00:00.000Z",
  "level": "INFO",
  "component": "PriceWatcher",
  "message": "Arbitrage opportunity detected",
  "context": {
    "priceA": "1.05",
    "priceB": "1.00",
    "spreadBps": 500
  }
}
```

---

**分析完了日**: 2026-02-06
**次ステップ**: `/kiro:spec-design offchain-arbitrage-engine` を実行してデザインドキュメントを作成
