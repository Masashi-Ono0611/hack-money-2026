# Gap Analysis: Zombie L2 Clearinghouse

## 分析サマリー

### スコープと課題
本プロジェクトは ETH Global HackMoney 2026 ハッカソン向けに、低稼働 L2 チェーンの計算リソースをトークン化し、Uniswap v4 Hook、Yellow SDK、Arc + Circle を統合した裁定システムを構築するものです。

**主要な課題：**
- 既存コードベースはほぼ空（Foundry 初期テンプレート + Next.js スターター）
- Uniswap v4 Hook、Yellow SDK、Circle/Arc の外部統合が必要
- モノレポ構造が steering で定義されているが未実装
- スマートコントラクト・オフチェーン・フロントエンドの3層アーキテクチャをゼロから構築

**推奨アプローチ：**
Option B（新規コンポーネント作成）を基本とし、steering で定義されたモノレポ構造を実装しながら、段階的にコンポーネントを構築していく。

**次のステップ：**
設計フェーズでは以下に注力する必要があります：
1. Uniswap v4 依存関係のインストールとHook実装パターンの確立
2. Yellow SDK の技術調査と統合方法の検討（Research Needed）
3. Circle CCTP/Gateway と Arc の統合戦略（Research Needed）
4. モノレポワークスペース構成の実装順序

---

## 1. Current State Investigation

### 1.1 既存資産スキャン

#### ディレクトリレイアウト
```
/
├── contract/           # Foundry プロジェクト (ほぼ空)
│   ├── src/
│   │   └── Counter.sol  # サンプルコントラクト
│   ├── test/
│   ├── script/
│   ├── lib/
│   │   └── forge-std/   # Foundry 標準ライブラリのみ
│   └── foundry.toml     # 基本設定のみ
├── frontend/           # Next.js プロジェクト (スターターテンプレート)
│   ├── app/
│   │   ├── page.tsx     # デフォルトページ
│   │   ├── layout.tsx   # ルートレイアウト
│   │   └── globals.css
│   ├── package.json     # 基本依存（Next.js, React, Tailwind）
│   └── tsconfig.json    # TypeScript strict mode 有効
├── docs/               # ドキュメント
│   ├── slide.md
│   └── system_architecture.drawio
├── .kiro/              # Kiro プロジェクト管理
│   ├── steering/       # プロジェクトコンテキスト
│   └── specs/zombie-l2-clearinghouse/
│       ├── spec.json
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
└── README.md           # プロジェクト概要
```

#### 再利用可能なコンポーネント/サービス
**現状：** なし（すべて初期テンプレート）

**利用可能な基盤：**
- Foundry 開発環境（forge-std インストール済み）
- Next.js 16 + React 19 + Tailwind CSS 4 セットアップ済み
- TypeScript strict mode 有効
- Git リポジトリ初期化済み

#### アーキテクチャパターンと制約
**Steering で定義されたパターン：**
- モノレポ構成（`packages/*` 構造）
- 3層アーキテクチャ（オンチェーン/オフチェーン/フロントエンド）
- 機能ドメイン優先の組織化

**現状の制約：**
- モノレポ構造未実装（`contract/`, `frontend/` が直接ルートに配置）
- ワークスペース設定なし（ルート `package.json` 不在）
- パッケージ間の依存関係管理なし

### 1.2 コード規約の抽出

#### 命名規則（Steering `structure.md` より）
- **ファイル:** kebab-case (`price-watcher.ts`, `demo-arbitrage.ts`)
- **コントラクト:** PascalCase (`ComputeToken.sol`, `UtilizationHook.sol`)
- **コンポーネント:** PascalCase (`PriceChart.tsx`, `VaultBalance.tsx`)
- **関数:** camelCase (`watchPools()`, `executeArbitrage()`)
- **定数:** UPPER_SNAKE_CASE (`MAX_SPREAD`, `ARBITRAGE_THRESHOLD`)

#### レイヤリングと依存方向
```
frontend → offchain (読み取り専用)
offchain → contracts (コントラクト呼び出し)
contracts → shared (型定義参照のみ)
shared → 外部依存のみ
```

#### インポート/エクスポートパターン
```typescript
// 1. External libraries
import { createPublicClient } from 'viem'

// 2. Internal workspace packages
import type { ArbitrageOpportunity } from '@hack-money/shared'

// 3. Internal modules (同一パッケージ内)
import { executeArbitrage } from '@/arbitrage'

// 4. Types
import type { PriceData } from '@/types'

// 5. Relative imports (同一ディレクトリ内のみ)
import { formatPrice } from './utils'
```

**Path Aliases（想定）：**
- `@hack-money/*`: ワークスペースパッケージ
- `@/`: 各パッケージ内の src ディレクトリ

#### テスト配置とアプローチ
**Steering で定義：**
- Foundry test (コントラクト): `/packages/contracts/test/`
- Vitest (TypeScript): `/packages/offchain/test/`, `/packages/shared/test/`
- カバレッジレポート生成必須

**現状：** テストなし（初期テンプレートのみ）

### 1.3 統合サーフェスの確認

#### データモデル/スキーマ
**Steering `shared` パッケージで共有予定：**
- `ArbitrageOpportunity` (価格差・流動性・戦略)
- `PriceData` (L2ごとのCPT価格)
- `SessionData` (Yellow セッション情報)

**現状：** 未実装

#### API クライアント
**必要な外部統合：**
- Uniswap v4 PoolManager (viem で呼び出し)
- Yellow SDK (Nitrolite) - セッション管理・オフチェーン取引
- Circle Gateway / CCTP - USDC 決済
- Arc RPC - 決済ハブとしての利用

**現状：** なし

#### 認証メカニズム
- ウォレット接続（wagmi 未インストール）
- Yellow セッション認証（Research Needed）

---

## 2. Requirements Feasibility Analysis

### 2.1 技術的ニーズの抽出

#### データモデル

| Requirement | Data Model | Status | Notes |
|-------------|-----------|--------|-------|
| Req 1: CPT 発行・管理 | ERC20 Token, Vault Deposit | Missing | OpenZeppelin ERC20 利用可能 |
| Req 2: Uniswap v4 基準市場 | PoolKey, PoolId, Liquidity | Missing | Uniswap v4 依存関係追加必要 |
| Req 3: Hook 動的制御 | Fee Override, Utilization Data | Missing | Oracle データ取得メカニズム必要 |
| Req 4: 価格差検知 | PriceData, ArbitrageSignal | Missing | viem でオンチェーン読み取り |
| Req 5: 裁定戦略生成 | ArbitrageStrategy, RiskParams | Missing | TypeScript ビジネスロジック |
| Req 6: Yellow セッション | SessionParams, MatchingResult | Unknown | Yellow SDK 統合方法未調査 |
| Req 7: Arc + USDC 決済 | SettlementParams, CCTP Transfer | Unknown | Circle/Arc 統合方法未調査 |
| Req 8: Operator Vault | Vault Balance, Withdrawal | Missing | Solidity + viem |
| Req 9: Dashboard | ChartData, LogEntry, Balance | Missing | Next.js + Recharts |

#### API/サービス

| Requirement | API/Service | Status | Dependencies |
|-------------|-------------|--------|--------------|
| Req 2, 3: Uniswap v4 統合 | PoolManager, Hook Interface | Missing | `@uniswap/v4-core`, `@uniswap/v4-periphery` |
| Req 4, 9: オンチェーンデータ読み取り | viem PublicClient | Missing | `viem`, `wagmi` |
| Req 6: Yellow セッション実行 | Yellow Nitrolite SDK | Unknown | Research Needed |
| Req 7: USDC 決済 | Circle Gateway, CCTP | Unknown | Research Needed |
| Req 9: Dashboard データ取得 | WebSocket or Polling | Missing | viem で実装可能 |
| Req 10: デプロイスクリプト | Foundry Scripts | Missing | forge script |

#### UI/コンポーネント

| Requirement | Component | Status | Dependencies |
|-------------|-----------|--------|--------------|
| Req 9: 価格差チャート | PriceChart | Missing | Recharts or Chart.js |
| Req 9: Hook 状態表示 | HookStatusCard | Missing | Shadcn/ui |
| Req 9: セッションログ | SessionLogTable | Missing | Shadcn/ui Table |
| Req 9: Vault 残高表示 | VaultBalanceCard | Missing | viem + Shadcn/ui |
| Req 9: リアルタイム更新 | WebSocket Provider | Missing | viem + React Context |

#### ビジネスルール/バリデーション

| Requirement | Business Rule | Complexity | Notes |
|-------------|---------------|-----------|-------|
| Req 3: 稼働率に応じた手数料制御 | 動的手数料計算ロジック | Medium | 線形/段階的な手数料調整 |
| Req 4: 価格差検知閾値 | 裁定機会判定ロジック | Low | 単純な価格差 >= threshold |
| Req 5: リスク管理 | ポジションサイズ制限 | Medium | ハッカソンスコープ外だが基本実装必要 |
| Req 6: セッション実行制御 | エラーハンドリング・リトライ | Medium | Yellow SDK の挙動に依存 |
| Req 7: 決済確定条件 | net profit > 0 判定 | Low | 単純な if 文 |

#### 非機能要件

| Category | Requirement | Status | Implementation Notes |
|----------|-------------|--------|---------------------|
| Performance | Price Watcher < 5秒 | Missing | viem multicall で効率化 |
| Performance | Yellow セッション < 500ms | Unknown | Yellow SDK 性能に依存 |
| Performance | Dashboard 初期ロード < 3秒 | Missing | Next.js SSR + 最適化 |
| Security | 秘密鍵・APIキー環境変数管理 | Missing | `.env` + `dotenv` |
| Security | Reentrancy ガード | Missing | OpenZeppelin ReentrancyGuard |
| Security | 権限管理（運営者のみ操作） | Missing | Ownable パターン |
| Scalability | 2チェーンサポート | Missing | 設定ファイルでチェーン管理 |
| Maintainability | TypeScript strict mode | ✅ Available | 既に有効 |
| Maintainability | ESLint + Prettier | Missing | 設定ファイル追加必要 |
| Usability | 技術的知識不要な Dashboard UI | Missing | わかりやすい文言・可視化 |

### 2.2 ギャップと制約の特定

#### 欠落している機能

##### オンチェーン層
1. **CPT Token Contract**
   - Status: Missing
   - Gap: ERC20 基本実装 + 発行権限制御
   - Constraint: 各 L2 チェーンに独立デプロイ必要

2. **Utilization Hook Contract**
   - Status: Missing
   - Gap: Uniswap v4 IHooks 実装 + 動的手数料ロジック
   - Constraint: Hook アドレス制約（特定ビットパターン必要）
   - Research Needed: Hook デプロイ方法とアドレス生成

3. **Operator Vault Contract**
   - Status: Missing
   - Gap: USDC 受取・引き出し機能 + 権限管理
   - Constraint: Arc チェーンにデプロイ

4. **Mock Oracle Contract**
   - Status: Missing
   - Gap: L2 稼働率シグナル供給（デモ用）
   - Constraint: ハッカソンスコープのみ

##### オフチェーン層
1. **Price Watcher**
   - Status: Missing
   - Gap: viem で Uniswap v4 Pool 価格取得・差分検知
   - Constraint: 5秒以内に検知（非機能要件）

2. **Arbitrage Engine**
   - Status: Missing
   - Gap: 価格差分析・戦略生成ロジック
   - Constraint: リスク管理ルール実装必要

3. **Yellow Session Manager**
   - Status: Unknown
   - Gap: Yellow SDK 統合・セッション管理
   - Research Needed: Yellow SDK API、認証方法、エラーハンドリング

4. **Settlement Orchestrator**
   - Status: Unknown
   - Gap: Arc + Circle 統合・USDC 決済処理
   - Research Needed: Circle Gateway/CCTP API、Arc 決済フロー

##### フロントエンド層
1. **Dashboard Components**
   - Status: Missing
   - Gap: 価格チャート、Hook状態、ログ表示、残高カード
   - Constraint: Shadcn/ui コンポーネント未インストール

2. **Real-time Data Provider**
   - Status: Missing
   - Gap: WebSocket または Polling による状態更新
   - Constraint: パフォーマンス要件（初期ロード < 3秒）

##### 共通・インフラ
1. **Monorepo Workspace**
   - Status: Missing
   - Gap: ルート package.json、workspace 設定、パス解決
   - Constraint: Steering で定義された構造と一致させる

2. **Shared Types & Constants**
   - Status: Missing
   - Gap: 型定義、チェーンID、コントラクトアドレス
   - Constraint: パッケージ間で共有可能な構造

3. **Deployment Scripts**
   - Status: Missing
   - Gap: Foundry script でコントラクトデプロイ・初期化
   - Constraint: 複数チェーンへの自動デプロイ

4. **Demo Scripts**
   - Status: Missing
   - Gap: 稼働率変化シミュレーション・裁定フロー実行
   - Constraint: ハッカソンデモ向けにわかりやすい出力

#### 未知の領域（Research Needed）

1. **Yellow SDK (Nitrolite) 統合**
   - 何が不明か: API仕様、認証方法、セッション開始・終了フロー、エラーハンドリング
   - 影響: Req 6（ガスレス裁定実行）の実装可否
   - 調査タスク: 公式ドキュメント・SDK サンプルコード確認、Yellow Network Testnet セットアップ

2. **Circle Gateway / CCTP 統合**
   - 何が不明か: USDC クロスチェーン転送 API、Arc チェーン対応状況、手数料・遅延
   - 影響: Req 7（USDC 決済）の実装可否
   - 調査タスク: Circle ドキュメント確認、Arc Testnet での CCTP 動作検証

3. **Uniswap v4 Hook デプロイ方法**
   - 何が不明か: Hook アドレス生成（特定ビットパターン）の実装方法
   - 影響: Req 3（Hook による動的制御）のデプロイ可否
   - 調査タスク: Uniswap v4 公式ドキュメント・デプロイスクリプトサンプル確認

4. **Arc Blockchain RPC/API**
   - 何が不明か: Arc Testnet エンドポイント、ウォレット設定、ガス仕様
   - 影響: Req 7, 8（決済・Vault）のデプロイ・実行可否
   - 調査タスク: Arc 公式ドキュメント確認、Testnet アクセス方法

#### 既存アーキテクチャからの制約

1. **モノレポ構造への移行コスト**
   - 現状: `contract/`, `frontend/` が直接ルート配置
   - Steering: `packages/contracts/`, `packages/frontend/`, `packages/offchain/`, `packages/shared/`
   - 制約: ファイル移動・パス解決・ビルド設定の変更が必要
   - 影響: 初期セットアップ時間増加

2. **Uniswap v4 依存関係の複雑さ**
   - 制約: Foundry で Uniswap v4 を依存関係として追加（サブモジュールまたは remappings）
   - 影響: コントラクトビルド設定の複雑化

3. **マルチチェーンデプロイの管理**
   - 制約: Base Sepolia, WorldCoin Sepolia, Arc の3チェーンに別々にデプロイ
   - 影響: 環境変数管理・デプロイスクリプトの複雑化

### 2.3 複雑度シグナル

#### シンプルな CRUD 処理
- Operator Vault の USDC 入出金（Solidity 標準パターン）
- Price Watcher の価格取得（viem の標準的な使用）

#### アルゴリズムロジック
- Arbitrage Engine の価格差分析・戦略生成（Medium 複雑度）
- Utilization Hook の動的手数料計算（Medium 複雑度）

#### ワークフロー
- 全体フロー（価格差検知 → 裁定実行 → 決済）は複数コンポーネント間の連携が必要（High 複雑度）

#### 外部統合
- **Uniswap v4**: Medium（公式ドキュメント・サンプルあり）
- **Yellow SDK**: High（未調査、ドキュメント不明）
- **Circle/Arc**: Medium-High（CCTP は既存実装あり、Arc は未調査）

---

## 3. Implementation Approach Options

### Option A: 既存コンポーネント拡張

**適用可否:** ❌ 不適用

**理由:**
- 既存コードベースは初期テンプレートのみ（`Counter.sol`, Next.js スターター）
- 拡張対象となる実装済みコンポーネントが存在しない
- すべての機能を新規作成する必要がある

---

### Option B: 新規コンポーネント作成 ✅ **推奨**

**適用可否:** ✅ 主要アプローチ

**理由:**
- プロジェクト全体がほぼ空の状態
- Steering で定義されたモノレポ構造・3層アーキテクチャを実装する必要
- 各レイヤー（オンチェーン/オフチェーン/フロントエンド）の責務分離が明確

#### 新規作成するコンポーネント（Steering `structure.md` に基づく）

##### 1. Monorepo Workspace 構築
- **ファイル:** `/package.json`, `/tsconfig.base.json`
- **責務:** ワークスペース設定、共通 TypeScript 設定
- **統合ポイント:** すべてのパッケージがルートワークスペースに依存

##### 2. Smart Contracts Package (`packages/contracts/`)
- **ファイル:**
  - `src/tokens/ComputeToken.sol` - ERC20 CPT Token
  - `src/hooks/UtilizationHook.sol` - Uniswap v4 Hook
  - `src/vault/OperatorVault.sol` - USDC Vault
  - `test/mocks/MockOracle.sol` - L2 稼働率モック
- **責務:** オンチェーンロジック（価格形成・決済・状態管理）
- **統合ポイント:** Uniswap v4 依存関係、OpenZeppelin 利用
- **データフロー:** viem 経由でオフチェーン層から呼び出し

##### 3. Offchain Package (`packages/offchain/`)
- **ファイル:**
  - `src/watcher/price-watcher.ts` - 価格監視
  - `src/arbitrage/arbitrage-engine.ts` - 戦略生成
  - `src/yellow/yellow-session-manager.ts` - Yellow SDK 統合
  - `src/settlement/settlement-orchestrator.ts` - Arc + Circle 決済
- **責務:** 価格監視・裁定戦略・実行ロジック
- **統合ポイント:** viem（コントラクト呼び出し）、Yellow SDK、Circle SDK
- **データフロー:** Price Watcher → Arbitrage Engine → Yellow Session → Settlement

##### 4. Frontend Package (`packages/frontend/`)
- **ファイル:**
  - `app/dashboard/page.tsx` - Dashboard ページ
  - `components/price-chart.tsx` - 価格差チャート
  - `components/hook-status-card.tsx` - Hook 状態表示
  - `components/session-log-table.tsx` - セッションログ
  - `components/vault-balance-card.tsx` - Vault 残高
  - `lib/viem-client.ts` - viem クライアント設定
- **責務:** 可視化のみ（ビジネスロジックなし）
- **統合ポイント:** wagmi, viem, Recharts, Shadcn/ui
- **データフロー:** viem でオンチェーンデータ読み取り、オフチェーンログ取得（REST or WebSocket）

##### 5. Shared Package (`packages/shared/`)
- **ファイル:**
  - `src/types/arbitrage.ts` - 裁定関連型定義
  - `src/types/price.ts` - 価格データ型定義
  - `src/constants/chains.ts` - チェーンID・RPC URL
  - `src/constants/contracts.ts` - コントラクトアドレス
  - `src/utils/format.ts` - 共通ユーティリティ
- **責務:** 型定義・定数・ユーティリティのみ
- **統合ポイント:** すべてのパッケージから参照
- **依存:** 外部ライブラリのみ（他パッケージに依存しない）

##### 6. Scripts (`/scripts/`)
- **ファイル:**
  - `scripts/deploy-all.ts` - 全コントラクトデプロイ
  - `scripts/demo-arbitrage.ts` - デモシナリオ実行
- **責務:** デプロイ・初期化・デモ実行
- **統合ポイント:** Foundry script, viem, Yellow SDK, Circle SDK

#### 責務境界
```
contracts: 価格形成・決済・状態管理のみ
offchain: 価格監視・戦略・実行ロジック
frontend: 可視化のみ
shared: 型定義・定数・ユーティリティのみ
```

#### トレードオフ
- ✅ **明確な責務分離**: 各パッケージが独立してビルド・テスト可能
- ✅ **スケーラビリティ**: 将来的な機能追加・パッケージ追加が容易
- ✅ **保守性**: パッケージ間の依存関係が明示的
- ❌ **初期セットアップコスト**: モノレポ構造・ワークスペース設定が必要
- ❌ **ナビゲーション複雑性**: ファイル数が多くなる

---

### Option C: ハイブリッドアプローチ

**適用可否:** ⚠️ 一部適用可能（段階的実装）

#### フェーズ分割戦略

##### Phase 1: MVP（最小限の動作確認）
- **スコープ:** モノレポ構造なしで `contract/`, `frontend/` のまま実装
- **実装:**
  - CPT Token + Operator Vault（シンプルな ERC20 + 入出金）
  - Utilization Hook（モック Oracle 固定値）
  - 簡易 Dashboard（静的データ表示）
- **目的:** 技術スタックの動作検証、外部依存（Uniswap v4）の統合確認
- **期間:** 2-3日

##### Phase 2: モノレポ移行 + 外部統合
- **スコープ:** Phase 1 コードをモノレポ構造に移行 + Yellow/Circle 統合
- **実装:**
  - モノレポ構造構築（`packages/*`）
  - Price Watcher + Arbitrage Engine
  - Yellow Session Manager（Yellow SDK 統合）
  - Settlement Orchestrator（Circle/Arc 統合）
- **目的:** 完全な裁定フロー実装
- **期間:** 4-5日

##### Phase 3: Dashboard 完成 + デモスクリプト
- **スコープ:** リアルタイム可視化・デモ自動化
- **実装:**
  - Dashboard コンポーネント（Recharts チャート、ログ表示）
  - WebSocket/Polling による状態更新
  - デモスクリプト（稼働率変化シミュレーション・裁定実行）
- **目的:** ハッカソンデモ用の完成度向上
- **期間:** 2-3日

#### リスク軽減
- **Phase 1 失敗時:** 技術スタック変更・外部依存の代替検討
- **Phase 2 遅延時:** Yellow/Circle をモック実装に切り替え
- **Phase 3 スキップ可:** Phase 2 で裁定フロー完成すればハッカソン提出可能

#### トレードオフ
- ✅ **段階的検証**: 各フェーズで動作確認しながら進められる
- ✅ **リスク分散**: 外部依存の問題が早期に発見できる
- ❌ **リファクタリングコスト**: Phase 1 → Phase 2 でファイル移動が発生
- ❌ **一時的な技術的負債**: Phase 1 のコードが steering に不一致

---

## 4. Implementation Complexity & Risk

### 4.1 Effort Estimation

| Component | Effort | Justification |
|-----------|--------|---------------|
| **Monorepo Setup** | S (1日) | ワークスペース設定・パス解決は定型作業 |
| **CPT Token Contract** | S (1日) | OpenZeppelin ERC20 ベース、標準的な実装 |
| **Operator Vault Contract** | S (1日) | シンプルな入出金 + 権限管理 |
| **Utilization Hook Contract** | M (3-4日) | Uniswap v4 Hook インターフェース実装 + 動的手数料ロジック + Hook デプロイ方法調査 |
| **Mock Oracle Contract** | S (0.5日) | 固定値返却のみ |
| **Price Watcher** | S (2日) | viem での価格取得・差分検知ロジック |
| **Arbitrage Engine** | M (3日) | 価格差分析・戦略生成・リスク管理ロジック |
| **Yellow Session Manager** | L (5-7日) | Yellow SDK 調査 + 統合実装 + エラーハンドリング |
| **Settlement Orchestrator** | M-L (4-5日) | Circle/Arc 調査 + CCTP 統合 + リトライロジック |
| **Dashboard Components** | M (3-4日) | Recharts 統合・Shadcn/ui コンポーネント・WebSocket/Polling |
| **Deployment Scripts** | M (2-3日) | マルチチェーンデプロイ自動化・環境変数管理 |
| **Demo Scripts** | S (2日) | シミュレーション・ログ出力 |
| **Testing (全体)** | M (3-4日) | Foundry test, Vitest, カバレッジ |
| **総計** | **XL (2-3週間)** | 技術調査含む、ハッカソンスコープ |

### 4.2 Risk Assessment

| Component | Risk | Justification | Mitigation |
|-----------|------|---------------|-----------|
| **Uniswap v4 Hook** | Medium | Hook デプロイ方法未確認、アドレス制約あり | 公式ドキュメント・サンプル確認、v4-periphery 参考実装利用 |
| **Yellow SDK** | High | SDK 仕様不明、ドキュメント・サンプルコード未確認 | 早期調査（Phase 1）、最悪モック実装で代替 |
| **Circle/Arc** | Medium-High | Arc チェーン仕様不明、CCTP 対応状況未確認 | Circle ドキュメント確認、Arc Testnet 動作検証、最悪 CCTP なしで直接転送 |
| **マルチチェーンデプロイ** | Medium | 3チェーンへの同時デプロイ・管理が複雑 | 環境変数・設定ファイルで自動化、段階的デプロイで検証 |
| **Dashboard パフォーマンス** | Low | Next.js + viem の標準的な使用、既知の最適化手法あり | SSR + クライアントサイドキャッシュ、データポーリング頻度調整 |
| **Testing カバレッジ** | Medium | ハッカソンスコープで時間不足の可能性 | 重要部分（Hook, Arbitrage Engine, Settlement）に集中、E2E デモスクリプトで補完 |

### 4.3 Technical Unknowns

#### 1. Yellow SDK (Nitrolite) 統合
- **何が不明か:** API 仕様、セッション認証、エラーハンドリング
- **リスク:** High
- **調査タスク:**
  - Yellow Network 公式ドキュメント確認
  - Nitrolite SDK GitHub リポジトリ・サンプルコード調査
  - Testnet セットアップ・動作検証
- **代替案:** モック実装（オフチェーンでの裁定シミュレーションのみ）

#### 2. Circle Gateway / CCTP 統合
- **何が不明か:** Arc チェーン対応、USDC クロスチェーン転送フロー
- **リスク:** Medium-High
- **調査タスク:**
  - Circle 公式ドキュメント（CCTP, Gateway）確認
  - Arc Testnet での USDC 転送動作検証
- **代替案:** CCTP なしで直接 USDC 転送（クロスチェーン機能なし）

#### 3. Uniswap v4 Hook デプロイ
- **何が不明か:** Hook アドレス生成方法（特定ビットパターン）
- **リスク:** Medium
- **調査タスク:**
  - Uniswap v4 公式ドキュメント・デプロイスクリプトサンプル確認
  - v4-periphery リポジトリの Hook 実装例確認
- **代替案:** 手動アドレス生成・デプロイ（自動化なし）

---

## 5. Requirement-to-Asset Map

| Requirement | Existing Assets | Gaps | Status | Notes |
|-------------|----------------|------|--------|-------|
| **Req 1: CPT 発行・管理** | Foundry 環境 | ComputeToken.sol, mint/transfer ロジック | Missing | OpenZeppelin ERC20 利用可能 |
| **Req 2: Uniswap v4 基準市場** | なし | Uniswap v4 依存関係、Pool 初期化スクリプト | Missing | v4-core, v4-periphery 追加必要 |
| **Req 3: Hook 動的制御** | なし | UtilizationHook.sol, beforeSwap 実装, Oracle 統合 | Missing + Unknown | Hook デプロイ方法調査必要 |
| **Req 4: 価格差検知** | viem (未インストール) | price-watcher.ts, ポーリングロジック | Missing | viem インストール必要 |
| **Req 5: 裁定戦略生成** | TypeScript strict mode | arbitrage-engine.ts, 戦略生成ロジック | Missing | - |
| **Req 6: Yellow セッション** | なし | yellow-session-manager.ts, Yellow SDK 統合 | Unknown | Yellow SDK 調査必要 |
| **Req 7: Arc + USDC 決済** | なし | settlement-orchestrator.ts, Circle/Arc 統合 | Unknown | Circle/Arc 調査必要 |
| **Req 8: Operator Vault** | Foundry 環境 | OperatorVault.sol, deposit/withdraw ロジック | Missing | - |
| **Req 9: Dashboard** | Next.js, Tailwind | Dashboard コンポーネント, Recharts, Shadcn/ui | Missing | Shadcn/ui, Recharts 追加必要 |
| **Req 10: デプロイ・初期化** | Foundry script | deploy-all.ts, マルチチェーンデプロイロジック | Missing | 環境変数管理必要 |
| **Req 11: エラーハンドリング** | TypeScript | 構造化ログ、リトライロジック | Missing | - |
| **Req 12: テスト** | Foundry test, Vitest (未インストール) | テストスイート全体 | Missing | Vitest インストール必要 |
| **Req 13: セキュリティ・権限管理** | Foundry 環境 | Ownable, ReentrancyGuard, 環境変数管理 | Missing | OpenZeppelin 利用可能 |
| **Req 14: デモ** | なし | demo-arbitrage.ts, モック Oracle 制御 | Missing | - |

---

## 6. Recommendations for Design Phase

### 6.1 推奨アプローチ

**Primary: Option B（新規コンポーネント作成）+ Option C（段階的実装）**

1. **Phase 1（2-3日）:** MVP 実装
   - モノレポ構造なしで `contract/`, `frontend/` のまま実装
   - CPT Token + Operator Vault + Utilization Hook（モック Oracle）
   - 簡易 Dashboard（静的データ表示）
   - 目的: 技術スタック動作検証、Uniswap v4 統合確認

2. **Phase 2（4-5日）:** モノレポ移行 + 外部統合
   - モノレポ構造構築（`packages/*`）
   - Price Watcher + Arbitrage Engine
   - Yellow Session Manager（Yellow SDK 統合）
   - Settlement Orchestrator（Circle/Arc 統合）
   - 目的: 完全な裁定フロー実装

3. **Phase 3（2-3日）:** Dashboard 完成 + デモ
   - Dashboard コンポーネント（Recharts, ログ表示）
   - WebSocket/Polling による状態更新
   - デモスクリプト（稼働率変化シミュレーション）
   - 目的: ハッカソンデモ用完成度向上

### 6.2 主要な設計決定事項

1. **Uniswap v4 Hook デプロイ方法**
   - Decision: CREATE2 を用いた特定アドレス生成方法を確立
   - Research: Uniswap v4 公式ドキュメント・デプロイスクリプトサンプル

2. **Yellow SDK 統合方法**
   - Decision: Nitrolite SDK の API 仕様・認証方法を確認
   - Research: Yellow Network 公式ドキュメント・サンプルコード
   - Fallback: モック実装（オフチェーンシミュレーションのみ）

3. **Circle/Arc 決済フロー**
   - Decision: CCTP による USDC クロスチェーン転送フローを確立
   - Research: Circle ドキュメント・Arc Testnet 動作検証
   - Fallback: CCTP なしで直接転送（クロスチェーンなし）

4. **モノレポ構成の詳細**
   - Decision: ワークスペース設定（npm, yarn, pnpm いずれか）
   - Decision: パス解決（`@hack-money/*`, `@/`）の設定方法

5. **Dashboard リアルタイム更新方法**
   - Decision: WebSocket or Polling（オフチェーンログ取得）
   - Decision: viem でオンチェーンイベント監視（`watchContractEvent`）

### 6.3 Research Items

#### Priority 1（Phase 1 で必要）
1. **Uniswap v4 Hook デプロイ方法**
   - ドキュメント: https://docs.uniswap.org/contracts/v4/overview
   - 調査内容: CREATE2 アドレス生成、Hook ビットパターン、デプロイスクリプトサンプル

2. **Foundry マルチチェーンデプロイ**
   - ドキュメント: Foundry Book - Scripting
   - 調査内容: 環境変数管理、複数チェーンへのデプロイ自動化

#### Priority 2（Phase 2 で必要）
1. **Yellow SDK (Nitrolite) 統合**
   - ドキュメント: Yellow Network 公式サイト、GitHub
   - 調査内容: API 仕様、セッション認証、エラーハンドリング、Testnet セットアップ

2. **Circle Gateway / CCTP**
   - ドキュメント: https://developers.circle.com/
   - 調査内容: CCTP API、Arc チェーン対応、USDC 転送フロー

3. **Arc Blockchain**
   - ドキュメント: Arc 公式ドキュメント
   - 調査内容: Testnet RPC エンドポイント、ウォレット設定、ガス仕様

#### Priority 3（Phase 3 で必要）
1. **Recharts 統合**
   - ドキュメント: Recharts 公式
   - 調査内容: リアルタイムチャート更新、Next.js App Router 対応

2. **Shadcn/ui コンポーネント**
   - ドキュメント: https://ui.shadcn.com/
   - 調査内容: Table, Card, Button コンポーネントの使用方法

---

## 7. Appendix: External Dependencies

### 7.1 必要な npm パッケージ

#### Smart Contracts (`packages/contracts/`)
```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0",
    "@uniswap/v4-core": "latest",
    "@uniswap/v4-periphery": "latest"
  }
}
```

#### Offchain (`packages/offchain/`)
```json
{
  "dependencies": {
    "viem": "^2.0.0",
    "dotenv": "^16.0.0",
    "@hack-money/shared": "workspace:*",
    "yellow-sdk": "TBD",
    "@circle-fin/cctp-sdk": "TBD"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### Frontend (`packages/frontend/`)
```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "wagmi": "^2.0.0",
    "viem": "^2.0.0",
    "recharts": "^2.0.0",
    "@hack-money/shared": "workspace:*"
  },
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

#### Shared (`packages/shared/`)
```json
{
  "dependencies": {},
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 7.2 Foundry 依存関係（Remappings）

```toml
# foundry.toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
remappings = [
  "@openzeppelin/=lib/openzeppelin-contracts/",
  "@uniswap/v4-core/=lib/v4-core/",
  "@uniswap/v4-periphery/=lib/v4-periphery/"
]
```

### 7.3 外部 SDK（調査必要）

- **Yellow SDK (Nitrolite):** パッケージ名・バージョン未確認
- **Circle CCTP SDK:** `@circle-fin/cctp-sdk` または類似パッケージ
- **Arc RPC:** 標準 viem クライアントで対応可能（専用 SDK 不要の可能性）

---

**Document Status:** ✅ Gap Analysis Complete

**Next Steps:**
1. 設計フェーズで上記 Research Items を実施
2. `/kiro:spec-design zombie-l2-clearinghouse` で技術設計書を生成
3. 段階的実装アプローチ（Phase 1 → 2 → 3）に従って実装開始
