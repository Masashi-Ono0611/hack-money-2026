# Design Document: Zombie L2 Clearinghouse

## Overview

**Purpose**: Zombie L2 Clearinghouse は、低稼働なEthereum L2チェーンの計算リソースをトークン化し、Uniswap v4 Hook による動的市場制御、Yellow SDK によるガスレス裁定実行、Arc + Circle による USDC 決済を統合し、L2運営者に需要非依存の収益モデルを提供します。

**Users**:
- **L2運営者**: 固定インフラコストを補填する収益を得る
- **審査員（ETH Global HackMoney 2026）**: システムの動作とスポンサー技術統合を評価する
- **システム（自動実行）**: 価格差検知・裁定戦略生成・Yellow セッション実行・決済処理

**Impact**:
Ethereum L2エコシステムにおいて、「ユーザーがいなくても収益が発生する」新しい財務インフラを提供し、低稼働L2の持続可能性を向上させます。本プロジェクトはハッカソンプロジェクトとして、3つのスポンサー技術（Uniswap v4 / Yellow / Arc・Circle）の本質的な価値を実証します。

### Goals

- CPT（Compute Token）トークン化による計算リソースの資産化
- Uniswap v4 Hook でL2稼働率を価格メカニズムに反映する動的市場を構築
- Yellow SDK によるガスレス・高速な裁定実行エンジンの実装
- Arc + Circle による USDC 決済と Operator Vault への収益集約
- Dashboard によるリアルタイム可視化（価格差・Hook状態・セッションログ・Vault残高）
- ハッカソンデモ向けの自動実行スクリプトとモック環境の構築

### Non-Goals

- 実際のL2稼働率 Oracle 統合（モック実装で代替）
- 複数CPTペアの同時監視（2チェーン限定）
- 高度なリスク管理ロジック（最大ポジション制限等）
- 履歴データの永続化・長期チャート表示
- マルチチェーン対応の完全な自動化
- プロダクション環境向けのセキュリティ監査

---

## Gap Analysis 対応: 段階的実装戦略

> **注記**: Gap Analysis の結果に基づき、以下の段階的実装戦略を採用します。

### Phase 1: MVP（技術検証）- 2-3日

**目的**: 技術スタックの動作検証、Uniswap v4 統合確認

**スコープ**:
- CPT Token + Operator Vault（シンプルな ERC20 + 入出金）
- Utilization Hook（モック Oracle 固定値）
- Uniswap v4 Pool 初期化
- 簡易 Dashboard（静的データ表示）

**ディレクトリ構造**: 既存の `contract/`, `frontend/` をそのまま使用

### Phase 2: 外部統合 - 4-5日

**目的**: Yellow SDK / Arc + Circle 統合、完全な裁定フロー実装

**スコープ**:
- Price Watcher + Arbitrage Engine
- Yellow Session Manager（Yellow SDK 統合 or モックフォールバック）
- Settlement Orchestrator（Circle Programmable Wallets API）
- 既存スクリプト（`scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`）の活用

### Phase 3: Dashboard 完成 + デモ - 2-3日

**目的**: ハッカソンデモ用の完成度向上

**スコープ**:
- Dashboard コンポーネント（Recharts チャート、ログ表示）
- WebSocket/Polling による状態更新
- デモスクリプト（稼働率変化シミュレーション・裁定実行）

### リスク軽減戦略

| リスク | 軽減策 |
|-------|--------|
| Yellow SDK 統合失敗 | モック実装にフォールバック（詳細は後述） |
| Uniswap v4 Hook デプロイ失敗 | CREATE2 + HookMiner パターン採用 |
| Phase 遅延 | Phase 2 で裁定フロー完成すればハッカソン提出可能 |

---

## Architecture

### Architecture Pattern & Boundary Map

**選択パターン**: 3層アーキテクチャ（オンチェーン・オフチェーン・フロントエンド）

**Domain/Feature Boundaries**:
- **オンチェーン**: 価格形成・決済・状態管理のみ（CPT Token, Uniswap v4 Pool & Hook, Operator Vault）
- **オフチェーン**: 価格監視・戦略・実行ロジック（Price Watcher, Arbitrage Engine, Yellow Session Manager, Settlement Orchestrator）
- **フロントエンド**: 可視化のみ（Dashboard）

**Dependency Direction**:
- フロントエンド → オフチェーン（読み取り専用）
- オフチェーン → オンチェーン（コントラクト呼び出し）
- コントラクト間は最小限の依存（CPT Token ← Vault, Hook は Pool 参照のみ）

```mermaid
graph TB
    subgraph Frontend["Frontend Layer"]
        Dashboard[Dashboard UI]
    end

    subgraph Offchain["Offchain Execution Layer"]
        Watcher[Price Watcher]
        Engine[Arbitrage Engine]
        YellowMgr[Yellow Session Manager]
        Settlement[Settlement Orchestrator]
    end

    subgraph OnchainBase["Onchain Layer - Base Sepolia L2-A"]
        CPTA[CPT Token A]
        PoolA[Uniswap v4 Pool A]
        HookA[Utilization Hook A]
    end

    subgraph OnchainWorldCoin["Onchain Layer - WorldCoin Sepolia L2-B"]
        CPTB[CPT Token B]
        PoolB[Uniswap v4 Pool B]
        HookB[Utilization Hook B]
    end

    subgraph OnchainArc["Onchain Layer - Arc Settlement Hub"]
        Vault[Operator Vault]
        USDC[USDC Token]
    end

    Dashboard --> Watcher
    Dashboard --> PoolA
    Dashboard --> PoolB
    Dashboard --> Vault

    Watcher --> PoolA
    Watcher --> PoolB
    Watcher --> Engine

    Engine --> YellowMgr
    YellowMgr --> Settlement

    Settlement --> USDC
    Settlement --> Vault

    PoolA --> HookA
    PoolB --> HookB
    HookA -.-> Oracle[Mock Oracle A]
    HookB -.-> Oracle2[Mock Oracle B]
```

**Steering Compliance**:
- 機能ドメイン優先の組織化（ステアリング `structure.md`）
- TypeScript strict mode、Solidity 0.8.x以上（ステアリング `tech.md`）
- ハッカソンスコープでの簡略化（Mock Oracle、軽量Indexer）

---

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| **Smart Contracts** | Solidity 0.8.x | CPT Token, Utilization Hook, Operator Vault | ERC20標準、Uniswap v4 Hook インターフェース準拠 |
| **Blockchain** | Base Sepolia (L2-A), WorldCoin Sepolia (L2-B), Arc (決済ハブ) | CPT発行・市場形成・USDC決済 | Testnet環境でデプロイ |
| **Uniswap v4** | v4 (latest) | CPT/USDC プール、Hook による動的制御 | スポンサープライズ要件、**CREATE2 + HookMiner でデプロイ** |
| **Yellow SDK** | Nitrolite (latest) | ステートチャネル・ガスレスセッション | スポンサープライズ要件、**モックフォールバック戦略あり** |
| **Circle** | **Programmable Wallets API (W3S)** | USDC決済・ウォレット間転送 | スポンサープライズ要件、**既存実装あり** (`scripts/arc-transfer.ts`) |
| **Offchain Runtime** | Node.js 20+ / TypeScript | 価格監視・裁定エンジン・決済処理 | viem でコントラクト呼び出し |
| **Frontend** | Next.js 14+ / TypeScript | Dashboard（価格差・Hook・ログ・残高） | App Router、TailwindCSS、Shadcn/ui |
| **Wallet Integration** | wagmi / viem | ウォレット接続・Tx署名 | テスト用（MetaMask） |
| **Charts** | Recharts or Chart.js | 価格推移可視化 | ハッカソンデモ用 |
| **Deployment** | Foundry | コントラクトデプロイ・テスト | スクリプト自動化、**既存 `contract/` ディレクトリ活用** |
| **Testing** | Foundry test / Vitest | コントラクト・TypeScriptロジックテスト | CI 統合 |

### 技術的不確実性への対応

> **Gap Analysis からの知見**: 以下の外部統合は調査・検証が必要です。

| 統合対象 | リスクレベル | 対応戦略 |
|---------|-------------|---------|
| **Yellow SDK (Nitrolite)** | High | 公式ドキュメント調査 → 統合実装 → 失敗時はモック実装にフォールバック |
| **Uniswap v4 Hook デプロイ** | Medium | CREATE2 + HookMiner パターン採用（アドレスビットパターン制約対応） |
| **Circle W3S API** | Low | **既存実装あり**（`scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`）|
| **Arc Testnet** | Low | 既存環境変数設定あり（`ARC_API_KEY`, `ARC_WALLET_ID_*`）|

---

## System Flows

### Flow 1: 全体フロー（価格差検知 → 裁定実行 → USDC決済）

```mermaid
sequenceDiagram
    autonumber
    participant Watcher as Price Watcher
    participant PoolA as Uniswap v4 Pool A<br/>(Base Sepolia)
    participant PoolB as Uniswap v4 Pool B<br/>(WorldCoin Sepolia)
    participant Engine as Arbitrage Engine
    participant Yellow as Yellow Session Manager
    participant Settlement as Settlement Orchestrator
    participant Arc as Arc Settlement
    participant Vault as Operator Vault
    participant Dashboard as Dashboard

    loop 定期ポーリング
        Watcher->>PoolA: getPriceA()
        PoolA-->>Watcher: priceA
        Watcher->>PoolB: getPriceB()
        PoolB-->>Watcher: priceB
    end

    alt 価格差 > 閾値
        Watcher->>Engine: onDiscrepancy(priceA, priceB)
        Engine->>Engine: 戦略生成
        Engine->>Yellow: createSession(params)
        Yellow-->>Engine: sessionId

        loop 反復取引
            Engine->>Yellow: placeOrder(buy/sell)
            Yellow->>Yellow: オフチェーンマッチング
        end

        Engine->>Yellow: closeSession()
        Yellow-->>Engine: netProfit

        Engine->>Settlement: settleProfit(netProfit)
        Settlement->>Arc: transferUSDC(Vault, amount)
        Arc->>Vault: depositUSDC(amount)
        Vault-->>Dashboard: Deposit event
    end
```

**Key Decisions**:
- Price Watcher は5秒間隔でポーリング（要件: 5秒以内に検知）
- Yellow セッションは反復的に売買を実行し、最終ネット結果のみオンチェーン反映
- Arc 決済は Circle Gateway/CCTP を使用してクロスチェーン USDC 転送

---

### Flow 2: Uniswap v4 Hook による動的手数料制御

```mermaid
sequenceDiagram
    autonumber
    participant Trader as Trader/Bot
    participant Pool as Uniswap v4 Pool
    participant Hook as Utilization Hook
    participant Oracle as Mock Oracle

    Trader->>Pool: swap(CPT -> USDC)
    Pool->>Hook: beforeSwap(params)
    Hook->>Oracle: getUtilization()
    Oracle-->>Hook: utilization %

    alt 稼働率 < 30%
        Hook-->>Pool: fee = 0.05% (低手数料)
    else 稼働率 30-70%
        Hook-->>Pool: fee = 0.3% (標準)
    else 稼働率 > 70%
        Hook-->>Pool: fee = 1.0% (高手数料)
    end

    Pool->>Pool: スワップ実行（Hook反映後）
    Pool-->>Trader: swap結果
```

**Key Decisions**:
- Hook は beforeSwap で稼働率を取得し、動的に手数料を調整
- モック Oracle はハッカソンデモ用に固定値または可変シミュレーションを返す
- Hook ロジックは「空いているL2ほどCPTが安くなる」市場ルールを実現

---

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1-1.7 | CPT発行・管理 | CPT Token Contract, Operator Vault | ERC20, mint, transfer | - |
| 2.1-2.5 | Uniswap v4 基準市場 | Uniswap v4 Pool | swap, addLiquidity | Flow 1 |
| 3.1-3.8 | Hook 動的制御 | Utilization Hook, Mock Oracle | beforeSwap, getUtilization | Flow 2 |
| 4.1-4.7 | 価格差検知 | Price Watcher | watchPools, onDiscrepancy | Flow 1 |
| 5.1-5.6 | 裁定戦略生成 | Arbitrage Engine | analyzeDiscrepancy, generateStrategy | Flow 1 |
| 6.1-6.8 | Yellow セッション | Yellow Session Manager | createSession, placeOrder, closeSession | Flow 1 |
| 7.1-7.7 | Arc USDC 決済 | Settlement Orchestrator, Arc Settlement | settleProfit, transferUSDC | Flow 1 |
| 8.1-8.6 | Operator Vault | Operator Vault | depositUSDC, withdraw, balanceOf | Flow 1 |
| 9.1-9.10 | Dashboard | Dashboard UI | fetchPrices, fetchLogs, fetchBalance | - |
| 10.1-10.7 | デプロイ | Deployment Script | deployContracts, initializePools | - |
| 11.1-11.6 | エラーハンドリング | 全コンポーネント | try/catch, logger | - |
| 12.1-12.8 | テスト | Test Suite | unit, integration, e2e | - |
| 13.1-13.7 | セキュリティ | 全コントラクト | onlyOwner, ReentrancyGuard | - |
| 14.1-14.7 | ハッカソンデモ | Demo Script | simulateUtilization, runArbitrage | Flow 1, Flow 2 |

---

## Components and Interfaces

### Component Summary

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|--------------|--------------------------|-----------|
| CPT Token Contract | Onchain/Token | ERC20計算トークン発行・転送 | 1.1-1.7 | - | Service |
| Uniswap v4 Pool | Onchain/Market | CPT/USDC流動性・価格形成 | 2.1-2.5 | Uniswap v4 Core (P0) | API |
| Utilization Hook | Onchain/Hook | L2稼働率連動の動的手数料制御 | 3.1-3.8 | Uniswap v4 Hook (P0), Mock Oracle (P1) | Service |
| Mock Oracle | Onchain/Test | 稼働率シグナル供給 | 3.2, 14.5 | - | Service |
| Operator Vault | Onchain/Vault | USDC収益管理 | 8.1-8.6 | USDC Token (P0) | Service |
| Price Watcher | Offchain/Monitor | 価格差検知 | 4.1-4.7 | viem (P0) | Event |
| Arbitrage Engine | Offchain/Strategy | 裁定戦略生成・実行指示 | 5.1-5.6 | Yellow Session Manager (P0) | Service |
| Yellow Session Manager | Offchain/Execution | Yellow セッション管理 | 6.1-6.8 | Yellow SDK (P0) | Service, Event |
| Settlement Orchestrator | Offchain/Settlement | Arc USDC 決済処理 | 7.1-7.7 | Arc Settlement (P0), viem (P0) | Service |
| Dashboard UI | Frontend/UI | 価格差・Hook・ログ・残高可視化 | 9.1-9.10 | wagmi (P0), viem (P0), Recharts (P1) | API, State |
| Deployment Script | Offchain/Deploy | コントラクトデプロイ自動化 | 10.1-10.7 | Foundry/Hardhat (P0) | Batch |
| Demo Script | Offchain/Demo | デモシナリオ自動実行 | 14.1-14.7 | すべてのコンポーネント (P0) | Batch |

---

### Onchain Layer

#### CPT Token Contract

| Field | Detail |
|-------|--------|
| Intent | 計算リソースをERC20トークンとして発行・転送する |
| Requirements | 1.1-1.7 |

**Responsibilities & Constraints**
- ERC20標準インターフェースの完全実装
- 運営者アドレスのみが発行可能（mint権限）
- Base Sepolia と WorldCoin Sepolia に独立してデプロイ

**Dependencies**
- Outbound: OpenZeppelin ERC20 — 標準実装 (P0)

**Contracts**: Service [x]

##### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IComputeToken is IERC20 {
    /// @notice CPTを発行し、運営者アドレスに転送する
    /// @param amount 発行数量
    function mint(uint256 amount) external;

    /// @notice 発行権限を持つアドレスを返す
    function owner() external view returns (address);
}
```

- **Preconditions**: mint呼び出しはownerのみ
- **Postconditions**: 指定数量のCPTが発行され、ownerアドレスに転送される
- **Invariants**: totalSupply >= 0, owner権限は変更不可（ハッカソンスコープ）

**Implementation Notes**
- Integration: OpenZeppelin ERC20 + Ownable を継承
- Validation: onlyOwner modifier で mint 権限制御
- Risks: 発行上限なし（ハッカソンスコープでは問題なし）

---

#### Utilization Hook

| Field | Detail |
|-------|--------|
| Intent | L2稼働率に応じてUniswap v4 スワップ手数料を動的に制御する |
| Requirements | 3.1-3.8 |

**Responsibilities & Constraints**
- Uniswap v4 Hook インターフェース準拠
- beforeSwap で稼働率を取得し、手数料を調整
- Hook 実行権限は Uniswap v4 Pool のみ
- **CREATE2 + HookMiner パターンでデプロイ（アドレスビットパターン制約対応）**

**Dependencies**
- Inbound: Uniswap v4 Pool — beforeSwap 呼び出し (P0)
- Outbound: Mock Oracle — 稼働率シグナル取得 (P1)

**Contracts**: Service [x]

##### Uniswap v4 Hook デプロイ戦略

> **Gap Analysis 対応**: Hook アドレスは特定のビットパターンを持つ必要があります。

**Uniswap v4 Hook アドレス制約**:
- Hook の機能（beforeSwap, afterSwap 等）はアドレスの特定ビットで示される
- 例: `beforeSwap` を有効にするには、アドレスの特定ビットが `1` である必要がある

**CREATE2 + HookMiner パターン**:

```solidity
// Hook デプロイ用のヘルパー（Uniswap v4-periphery から参照）
import {HookMiner} from "@uniswap/v4-periphery/src/utils/HookMiner.sol";

// デプロイスクリプト (Foundry)
contract DeployUtilizationHook is Script {
    function run() external {
        // 1. 必要な Hook フラグを定義
        uint160 flags = uint160(
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );

        // 2. CREATE2 で適切なアドレスを探索
        (address hookAddress, bytes32 salt) = HookMiner.find(
            CREATE2_DEPLOYER,
            flags,
            type(UtilizationHook).creationCode,
            abi.encode(poolManager, mockOracle)
        );

        // 3. CREATE2 でデプロイ
        vm.startBroadcast();
        UtilizationHook hook = new UtilizationHook{salt: salt}(
            poolManager,
            mockOracle
        );
        vm.stopBroadcast();

        require(address(hook) == hookAddress, "Hook address mismatch");
    }
}
```

**フォールバック**: HookMiner が適切なアドレスを見つけられない場合、salt の探索範囲を拡大

##### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IUtilizationHook {
    /// @notice スワップ前に呼び出され、稼働率に応じた手数料を返す
    /// @param params スワップパラメータ
    /// @return fee 動的手数料（basis points）
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4, uint24 fee);

    /// @notice 現在の稼働率を返す
    /// @return utilization 稼働率（0-100%）
    function getUtilization() external view returns (uint256 utilization);
}
```

- **Preconditions**: Uniswap v4 Pool から呼び出される、アドレスが正しいビットパターンを持つ
- **Postconditions**: 稼働率に応じた動的手数料が返される（低稼働率 = 低手数料）
- **Invariants**: fee は 0.05% ~ 1.0% の範囲

**Implementation Notes**
- Integration: Uniswap v4 BaseHook を継承、Oracle から稼働率取得
- Deployment: **CREATE2 + HookMiner パターン**（アドレスビットパターン制約対応）
- Validation: 稼働率が範囲外の場合はデフォルト手数料（0.3%）を適用
- Risks: Oracle 障害時のフォールバック必須、HookMiner 探索失敗時は salt 範囲拡大

---

#### Operator Vault

| Field | Detail |
|-------|--------|
| Intent | 裁定収益（USDC）を受け取り、運営者が引き出し可能にする |
| Requirements | 8.1-8.6 |

**Responsibilities & Constraints**
- USDC 残高管理
- 運営者のみが引き出し可能
- Arc チェーンにデプロイ

**Dependencies**
- Inbound: Settlement Orchestrator — USDC 入金 (P0)
- Outbound: USDC Token — 残高確認・転送 (P0)

**Contracts**: Service [x], Event [x]

##### Service Interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOperatorVault {
    /// @notice USDCを入金する
    /// @param amount 入金数量
    function depositUSDC(uint256 amount) external;

    /// @notice USDCを引き出す（運営者のみ）
    /// @param amount 引き出し数量
    function withdraw(uint256 amount) external;

    /// @notice USDC残高を返す
    function balanceOf() external view returns (uint256);

    event Deposit(uint256 amount, uint256 timestamp);
    event Withdraw(address indexed operator, uint256 amount, uint256 timestamp);
}
```

- **Preconditions**: withdraw は owner のみ、残高 >= amount
- **Postconditions**: USDC が owner アドレスに転送される
- **Invariants**: balanceOf >= 0

**Implementation Notes**
- Integration: OpenZeppelin Ownable, USDC ERC20 インターフェース
- Validation: 残高不足時は revert
- Risks: なし（シンプルな Vault）

---

### Offchain Layer

#### Price Watcher

| Field | Detail |
|-------|--------|
| Intent | 複数L2のCPT/USDC価格を監視し、裁定機会を検知する |
| Requirements | 4.1-4.7 |

**Responsibilities & Constraints**
- 5秒間隔で Base Sepolia と WorldCoin Sepolia の価格を取得
- 価格差が閾値以上の場合、裁定機会イベントを発行
- エラー時のリトライロジック

**Dependencies**
- Outbound: Uniswap v4 Pool (Base Sepolia, WorldCoin Sepolia) — 価格取得 (P0)
- Outbound: Arbitrage Engine — 裁定機会通知 (P0)

**Contracts**: Event [x]

##### Event Contract

- **Published events**: `DiscrepancyDetected(priceA, priceB, spread, timestamp)`
- **Subscribed events**: なし
- **Delivery guarantees**: イベント駆動（同期呼び出し）

**Implementation Notes**
- Integration: viem publicClient で getQuote() 呼び出し、5秒タイマー
- Validation: 価格取得エラー時は3回リトライ、失敗時はエラーログ
- Risks: RPC エンドポイント障害時の対処（フォールバックRPC設定推奨）

---

#### Arbitrage Engine

| Field | Detail |
|-------|--------|
| Intent | 価格差を分析し、裁定戦略を生成して Yellow セッション実行指示を出す |
| Requirements | 5.1-5.6 |

**Responsibilities & Constraints**
- 価格差・流動性・ガス推定を分析
- 利益が見込める場合、Yellow セッション開始指示を生成
- リスク管理ルールに違反する場合は中止

**Dependencies**
- Inbound: Price Watcher — 裁定機会通知 (P0)
- Outbound: Yellow Session Manager — セッション開始指示 (P0)

**Contracts**: Service [x]

##### Service Interface

```typescript
interface ArbitrageEngineService {
  /**
   * 裁定機会を分析し、実行判断を行う
   * @param discrepancy 価格差情報
   * @returns 実行すべきYellowセッションパラメータ、またはnull（実行しない）
   */
  analyzeDiscrepancy(discrepancy: PriceDiscrepancy): Promise<YellowSessionParams | null>;

  /**
   * 裁定戦略をログに記録する
   */
  logStrategy(strategy: ArbitrageStrategy): void;
}

type PriceDiscrepancy = {
  priceA: bigint;
  priceB: bigint;
  spread: number; // %
  timestamp: number;
};

type YellowSessionParams = {
  direction: 'A_TO_B' | 'B_TO_A';
  amount: bigint;
  minProfit: bigint;
};
```

- **Preconditions**: 価格差情報が有効
- **Postconditions**: Yellow セッションパラメータが生成される、またはnull（実行しない）
- **Invariants**: minProfit > 0（利益が見込めない場合は実行しない）

**Implementation Notes**
- Integration: 価格差分析ロジック、リスク管理ルール（最大取引額等）
- Validation: 流動性不足・ガスコスト高の場合は実行中止
- Risks: 価格変動による実行時の損失（Yellow セッション内で最終確認）

---

#### Yellow Session Manager

| Field | Detail |
|-------|--------|
| Intent | Yellow SDK を用いてガスレス・高速な裁定取引を実行する |
| Requirements | 6.1-6.8 |

**Responsibilities & Constraints**
- Yellow セッションの開始・売買指示・終了
- オフチェーンでマッチングを実行
- セッション終了時に最終ネット結果を返す
- **Yellow SDK 統合失敗時はモック実装にフォールバック**

**Dependencies**
- Inbound: Arbitrage Engine — セッション開始指示 (P0)
- Outbound: Yellow SDK (Nitrolite) — セッション管理 (P0) **or モック実装**
- Outbound: Settlement Orchestrator — ネット結果通知 (P0)

**Contracts**: Service [x], Event [x]

##### Service Interface

```typescript
interface YellowSessionManagerService {
  /**
   * Yellow セッションを開始する
   * @param params セッションパラメータ
   * @returns セッションID
   */
  createSession(params: YellowSessionParams): Promise<string>;

  /**
   * セッション内で売買指示を送信する
   * @param sessionId セッションID
   * @param order 売買注文
   */
  placeOrder(sessionId: string, order: Order): Promise<void>;

  /**
   * セッションを終了し、最終ネット結果を返す
   * @param sessionId セッションID
   * @returns 最終利益（USDC単位）
   */
  closeSession(sessionId: string): Promise<bigint>;

  /**
   * モード判定（Yellow SDK or モック）
   */
  isUsingMock(): boolean;
}

type Order = {
  type: 'BUY' | 'SELL';
  token: 'CPT_A' | 'CPT_B';
  amount: bigint;
};
```

- **Preconditions**: Yellow SDK が初期化済み、またはモックモードが有効
- **Postconditions**: セッション終了時に最終利益が確定
- **Invariants**: セッション内でのガス不要（Yellow SDK使用時）

##### Event Contract

- **Published events**: `SessionClosed(sessionId, netProfit, timestamp)`
- **Subscribed events**: なし
- **Delivery guarantees**: 非同期（Settlement Orchestrator に通知）

##### フォールバック戦略: モック実装

> **Gap Analysis 対応**: Yellow SDK 統合が失敗した場合のフォールバック

```typescript
// モック実装の概要
class MockYellowSessionManager implements YellowSessionManagerService {
  private sessions: Map<string, MockSession> = new Map();

  async createSession(params: YellowSessionParams): Promise<string> {
    const sessionId = `mock-${Date.now()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      orders: [],
      netProfit: 0n,
      status: 'ACTIVE',
    });
    console.log(`[MOCK] Yellow session created: ${sessionId}`);
    return sessionId;
  }

  async placeOrder(sessionId: string, order: Order): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    session.orders.push(order);
    console.log(`[MOCK] Order placed: ${order.type} ${order.amount} ${order.token}`);
  }

  async closeSession(sessionId: string): Promise<bigint> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // シミュレートされた利益計算（デモ用）
    const simulatedProfit = BigInt(Math.floor(Math.random() * 100)) * 10n ** 6n; // 0-100 USDC
    session.netProfit = simulatedProfit;
    session.status = 'CLOSED';

    console.log(`[MOCK] Session closed with profit: ${simulatedProfit} USDC`);
    return simulatedProfit;
  }

  isUsingMock(): boolean {
    return true;
  }
}
```

**モード切り替え**: 環境変数 `USE_YELLOW_MOCK=true` で制御

**Implementation Notes**
- Integration: Yellow SDK (Nitrolite) を使用、反復的に売買を実行
- Fallback: `USE_YELLOW_MOCK=true` でモック実装に切り替え
- Validation: セッション実行中のエラーはクローズしてログ記録
- Risks: Yellow Network 障害時の対処（タイムアウト設定、モックフォールバック）

---

#### Settlement Orchestrator

| Field | Detail |
|-------|--------|
| Intent | Yellow セッション終了後、Arc + Circle で USDC 決済を実行する |
| Requirements | 7.1-7.7 |

**Responsibilities & Constraints**
- Yellow セッションの最終利益を USDC で確定
- Arc 決済プロセスを開始し、Operator Vault に入金
- 決済失敗時のリトライロジック

**Dependencies**
- Inbound: Yellow Session Manager — ネット結果通知 (P0)
- Outbound: **Circle Programmable Wallets API (W3S)** — USDC 転送 (P0)
- Outbound: Operator Vault — 入金確認 (P0)

**Contracts**: Service [x]

##### 既存実装の参照

> **Gap Analysis 対応**: 以下の既存スクリプトを基盤として活用します。

| ファイル | 役割 | 活用方法 |
|---------|------|---------|
| `scripts/arc-transfer.ts` | Circle W3S API によるUSDC転送 | `ArcTransferService` クラスを参考に実装 |
| `scripts/settle-to-vault.ts` | Operator Vaultへの決済 | `VaultSettlementService` クラスを参考に実装 |

##### Service Interface

```typescript
interface SettlementOrchestratorService {
  /**
   * 裁定利益を USDC で決済し、Vault に入金する
   * @param netProfit 最終利益（USDC単位）
   * @returns 決済トランザクションハッシュ
   */
  settleProfit(netProfit: bigint): Promise<SettlementResult>;

  /**
   * Operator Vault の残高を取得する
   */
  getVaultBalance(): Promise<bigint>;
}

// 既存実装 (scripts/settle-to-vault.ts) から抽出
interface SettlementResult {
  success: boolean;
  transactionId?: string;
  txHash?: string;
  amount?: string;
  error?: string;
}
```

- **Preconditions**: netProfit > 0、環境変数が設定済み
- **Postconditions**: USDC が Operator Vault に入金される
- **Invariants**: 決済トランザクションは冪等性を保証（idempotencyKey使用）

##### 必要な環境変数

> **既存実装からの引き継ぎ**: 以下の環境変数が必要です。

```bash
ARC_API_KEY=              # Circle W3S API キー
ARC_WALLET_ID_SOURCE=     # 裁定利益の送金元ウォレットID
ARC_WALLET_ID_OPERATOR_VAULT= # Operator Vault のウォレットID
ENTITY_SECRET_HEX=        # エンティティシークレット（hex形式）
```

##### 実装パターン（既存コードベース）

```typescript
// scripts/settle-to-vault.ts の VaultSettlementService を参考に
class SettlementOrchestrator implements SettlementOrchestratorService {
  private apiKey: string;
  private sourceWalletId: string;
  private vaultWalletId: string;
  private entitySecretHex: string;

  constructor() {
    this.apiKey = process.env.ARC_API_KEY || '';
    this.sourceWalletId = process.env.ARC_WALLET_ID_SOURCE || '';
    this.vaultWalletId = process.env.ARC_WALLET_ID_OPERATOR_VAULT || '';
    this.entitySecretHex = process.env.ENTITY_SECRET_HEX || '';
  }

  async settleProfit(netProfit: bigint): Promise<SettlementResult> {
    // 1. Public Key取得
    // 2. Entity Secret暗号化
    // 3. Circle W3S API で transfer 実行
    // 4. トランザクション確認
    // 詳細は scripts/settle-to-vault.ts を参照
  }
}
```

**Implementation Notes**
- Integration: **Circle Programmable Wallets API (W3S)** を使用（既存実装活用）
- Validation: 決済失敗時は3回リトライ、失敗時はエラーログ
- Risks: Arc ネットワーク障害時の対処（手動リトライ機能）
- Reference: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`

---

### Frontend Layer

#### Dashboard UI

| Field | Detail |
|-------|--------|
| Intent | CPT価格差・Hook状態・セッションログ・Vault残高をリアルタイムで可視化する |
| Requirements | 9.1-9.10 |

**Responsibilities & Constraints**
- Base Sepolia と WorldCoin Sepolia の CPT/USDC 価格を表示
- 価格差を計算・表示
- Utilization Hook の現在の手数料設定を表示
- Yellow セッションログを表示
- Operator Vault の USDC 残高を表示
- データ更新時に自動リフレッシュ

**Dependencies**
- Outbound: Uniswap v4 Pool (Base Sepolia, WorldCoin Sepolia) — 価格取得 (P0)
- Outbound: Utilization Hook — 手数料設定取得 (P0)
- Outbound: Yellow Session Manager — ログ取得 (P1)
- Outbound: Operator Vault — 残高取得 (P0)

**Contracts**: API [x], State [x]

##### API Contract

| Method | Endpoint | Request | Response | Errors |
|--------|----------|---------|----------|--------|
| GET | /api/prices | - | `{ priceA: string, priceB: string, spread: number }` | 500 |
| GET | /api/hook-status | - | `{ feeA: number, feeB: number, utilizationA: number, utilizationB: number }` | 500 |
| GET | /api/session-logs | - | `{ logs: SessionLog[] }` | 500 |
| GET | /api/vault-balance | - | `{ balance: string }` | 500 |

##### State Management

- State model: React hooks (useState, useEffect) + wagmi hooks
- Persistence: なし（リアルタイム表示のみ）
- Concurrency strategy: 各APIエンドポイントは独立して取得（並列実行）

**Implementation Notes**
- Integration: Next.js App Router、wagmi/viem でオンチェーンデータ取得、Recharts/Chart.js で価格推移チャート
- Validation: API エラー時はローディング状態表示、エラーメッセージ表示
- Risks: RPC エンドポイント遅延時の UX 低下（ローディングインジケーター必須）

---

## Data Models

### Domain Model

**主要エンティティ**:

1. **CPT Token** (Value Object)
   - 属性: symbol, decimals, totalSupply
   - 制約: ERC20標準準拠、運営者のみ発行可能

2. **Price** (Value Object)
   - 属性: token, price (USDC建て), timestamp
   - 制約: price > 0

3. **Arbitrage Opportunity** (Entity)
   - 属性: priceA, priceB, spread, timestamp
   - 制約: spread >= threshold

4. **Yellow Session** (Aggregate Root)
   - 属性: sessionId, orders[], netProfit, status
   - 制約: status = ACTIVE | CLOSED, netProfit は CLOSED 時のみ確定

5. **Operator Vault** (Entity)
   - 属性: balance (USDC), owner
   - 制約: balance >= 0, owner のみ引き出し可能

**Domain Events**:
- `CPTMinted(amount, owner)`
- `PriceDiscrepancyDetected(priceA, priceB, spread)`
- `SessionClosed(sessionId, netProfit)`
- `USDCDeposited(amount, vault)`

**Invariants**:
- CPT Token: totalSupply >= 0
- Price: price > 0
- Vault: balance >= 0

---

### Logical Data Model

**主要構造**:

1. **CPT Token (ERC20)**
   - balances: mapping(address => uint256)
   - allowances: mapping(address => mapping(address => uint256))
   - totalSupply: uint256

2. **Operator Vault**
   - usdcBalance: uint256
   - owner: address

3. **Yellow Session (Offchain)**
   - sessions: Map<sessionId, Session>
   - Session: { id, orders[], netProfit, status }

4. **Price Data (Offchain)**
   - prices: Map<chain, Price>
   - Price: { token, price, timestamp }

**Consistency Boundaries**:
- CPT Token: ERC20 標準により残高整合性を保証
- Operator Vault: 単一コントラクトで USDC 残高を管理
- Yellow Session: セッション内で整合性を保証、終了時にオンチェーン反映

---

### Physical Data Model

**Onchain (Ethereum L2)**:

1. **CPT Token Contract (Solidity)**
   - Storage: ERC20 標準の balances, allowances, totalSupply
   - Indexes: なし（ERC20標準で十分）

2. **Operator Vault Contract (Solidity)**
   - Storage: usdcBalance (uint256), owner (address)
   - Indexes: なし

**Offchain (Node.js / TypeScript)**:

1. **Price Cache (In-Memory)**
   - Structure: Map<chain, Price>
   - TTL: 5秒（定期ポーリング間隔）

2. **Session Logs (In-Memory)**
   - Structure: Array<SessionLog>
   - Retention: 直近100件のみ（ハッカソンスコープ）

---

## Error Handling

### Error Strategy

**エラーカテゴリ**:

1. **User Errors (4xx)**
   - 例: 残高不足、権限なし
   - 対応: revert with custom error、フロントエンドでエラーメッセージ表示

2. **System Errors (5xx)**
   - 例: RPC エンドポイント障害、Yellow Network 障害
   - 対応: リトライロジック（3回まで）、エラーログ記録、アラート発行

3. **Business Logic Errors (422)**
   - 例: 価格差が閾値未満、流動性不足
   - 対応: 裁定実行中止、ログ記録

### Error Categories and Responses

**Onchain Errors**:
- `InsufficientBalance`: 残高不足 → revert
- `Unauthorized`: 権限なし → revert
- `OracleFailure`: Oracle 障害 → デフォルト手数料適用

**Offchain Errors**:
- `RPCTimeout`: RPC タイムアウト → 3回リトライ、失敗時はエラーログ
- `YellowSessionFailed`: Yellow セッション失敗 → セッションクローズ、エラーログ
- `SettlementFailed`: 決済失敗 → 3回リトライ、失敗時はアラート

### Monitoring

- **ログレベル**: ERROR, WARN, INFO, DEBUG
- **構造化ログ**: JSON形式（timestamp, level, message, context）
- **アラート**: 致命的エラー時にコンソール出力（ハッカソンスコープ）

---

## Testing Strategy

### Unit Tests

1. **CPT Token Contract**: mint, transfer, balanceOf
2. **Utilization Hook**: beforeSwap（稼働率による手数料調整）
3. **Operator Vault**: depositUSDC, withdraw, balanceOf
4. **Price Watcher**: 価格取得、乖離検知
5. **Arbitrage Engine**: 戦略生成ロジック

### Integration Tests

1. **Uniswap v4 Pool + Hook**: スワップ時のHook呼び出し
2. **Price Watcher + Arbitrage Engine**: 価格差検知 → 戦略生成
3. **Arbitrage Engine + Yellow Session Manager**: セッション開始 → 実行
4. **Yellow Session Manager + Settlement Orchestrator**: セッション終了 → USDC 決済
5. **Settlement Orchestrator + Operator Vault**: USDC 入金確認

### E2E Tests (ハッカソンデモ)

1. **全体フロー**: 価格差検知 → 裁定実行 → USDC 決済 → Dashboard 表示
2. **Hook 動作確認**: 稼働率変化 → 手数料調整 → スワップ実行
3. **エラーハンドリング**: RPC 障害 → リトライ → エラーログ

### Performance Tests

- Price Watcher: 5秒以内に価格差検知
- Yellow Session: 500ms 以内に応答
- Dashboard: 3秒以内に初期ロード完了

---

## Security Considerations

### Authentication & Authorization

- **CPT Token**: mint 権限は owner のみ（Ownable）
- **Operator Vault**: withdraw 権限は owner のみ（Ownable）
- **Utilization Hook**: beforeSwap 実行権限は Uniswap v4 Pool のみ

### Data Protection

- **秘密鍵・APIキー**: 環境変数で管理（.env ファイル、gitignore）
- **ハードコード禁止**: コードに秘密情報を含まない

### Smart Contract Security

- **Reentrancy Guard**: OpenZeppelin ReentrancyGuard 使用
- **Input Validation**: すべてのパブリック関数で引数検証
- **Access Control**: onlyOwner modifier で権限制御

---

## Performance & Scalability

### Target Metrics

- **Price Watcher**: 5秒以内に価格差検知
- **Yellow Session**: Web2 並みの応答速度（< 500ms）
- **Dashboard**: 3秒以内に初期ロード完了

### Scaling Approach

- **ハッカソンスコープ**: 2チェーン（Base Sepolia, WorldCoin Sepolia）のみ
- **将来拡張**: 追加L2への拡張が容易な設計（設定ファイルでチェーン追加）

### Caching Strategy

- **Price Cache**: 5秒間隔でポーリング、In-Memory キャッシュ
- **Dashboard**: クライアント側で5秒間隔で自動リフレッシュ

---

## Migration Strategy

**初回デプロイ（ハッカソンスコープ）**:

1. **Phase 1**: コントラクトデプロイ（CPT Token, Hook, Vault）
2. **Phase 2**: Uniswap v4 Pool 初期化（流動性提供）
3. **Phase 3**: オフチェーンシステム起動（Watcher, Engine, Settlement）
4. **Phase 4**: Dashboard デプロイ
5. **Phase 5**: デモスクリプト実行・動作確認

**Rollback Triggers**:
- コントラクトデプロイ失敗 → 再デプロイ
- Pool 初期化失敗 → 設定確認・再実行

**Validation Checkpoints**:
- 各フェーズ完了時にコントラクトアドレス確認
- Dashboard で価格・残高表示確認

---

## Supporting References

### TypeScript Type Definitions (詳細)

```typescript
// Price Data
type PriceData = {
  chain: 'Base' | 'WorldCoin';
  token: 'CPT' | 'USDC';
  price: bigint; // wei 単位
  timestamp: number; // Unix timestamp
};

// Arbitrage Strategy
type ArbitrageStrategy = {
  direction: 'A_TO_B' | 'B_TO_A';
  amount: bigint; // CPT 数量
  minProfit: bigint; // 最小利益（USDC、wei 単位）
  gasEstimate: bigint; // ガス推定
  timestamp: number;
};

// Session Log
type SessionLog = {
  sessionId: string;
  orders: Order[];
  netProfit: bigint; // USDC、wei 単位
  status: 'ACTIVE' | 'CLOSED' | 'FAILED';
  timestamp: number;
};
```

### Uniswap v4 Hook Interface (参照)

```solidity
interface IHooks {
    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external returns (bytes4);
}
```

---

## Gap Analysis 対応サマリー

> **更新日**: Gap Analysis の結果を反映して設計を改善しました。

### 主要な改善点

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| **段階的実装** | 一括実装 | Phase 1/2/3 の段階的アプローチを採用 |
| **Arc + Circle 統合** | Circle Gateway / CCTP | **Circle Programmable Wallets API (W3S)** - 既存実装あり |
| **Yellow SDK** | 詳細なし | **モックフォールバック戦略** を明記 |
| **Hook デプロイ** | 詳細なし | **CREATE2 + HookMiner パターン** を採用 |
| **既存コード連携** | なし | `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts` を参照 |

### 既存資産の活用

```
/scripts/
├── arc-transfer.ts          # Circle W3S API による USDC 転送
│   └── ArcTransferService   # Settlement Orchestrator の参照実装
├── settle-to-vault.ts       # Operator Vault への決済
│   └── VaultSettlementService # 決済フローの参照実装
```

### 環境変数設定（既存実装より）

```bash
# Arc / Circle W3S API
ARC_API_KEY=
ARC_WALLET_ID_SOURCE=
ARC_WALLET_ID_TARGET=
ARC_WALLET_ID_OPERATOR_VAULT=
ENTITY_SECRET_HEX=

# Yellow SDK（モックモード切り替え）
USE_YELLOW_MOCK=false  # true でモック実装を使用
```

### リスク対応マトリクス

| リスク | レベル | 対応 | フォールバック |
|-------|--------|------|---------------|
| Yellow SDK 統合失敗 | High | 早期調査、ドキュメント確認 | モック実装に切り替え |
| Hook デプロイ失敗 | Medium | CREATE2 + HookMiner | salt 探索範囲拡大 |
| Circle W3S API エラー | Low | 既存実装あり | リトライロジック |
| Oracle 障害 | Low | Mock Oracle 使用 | デフォルト手数料適用 |

### 次のステップ

1. **Phase 1 (MVP)** の実装開始
   - 既存 `contract/` ディレクトリを活用
   - CPT Token, Operator Vault, Utilization Hook の実装
   - Uniswap v4 Pool 初期化

2. **Yellow SDK 調査** (並行実施)
   - Nitrolite SDK ドキュメント確認
   - サンプルコード動作検証
   - 統合可否の判断 → モック実装への切り替え判断

3. **Phase 2** に向けた準備
   - 既存スクリプトの Settlement Orchestrator への統合
   - Price Watcher, Arbitrage Engine の実装

---

**設計完了**: Gap Analysis の結果を反映し、全14要件をカバーする包括的な技術設計を完了しました。段階的実装戦略により、リスクを軽減しながらハッカソン期間内での完成を目指します。
