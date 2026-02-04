# Project Structure

## Organization Philosophy

**機能ドメイン優先**: オンチェーン・オフチェーン・フロントエンドを明確に分離し、各層の責務を明確化する。

**モノレポ構成**: プロジェクト全体を単一リポジトリで管理し、パッケージ間の依存関係を明示的に定義する。

## Monorepo Structure

```
/
├── packages/
│   ├── contracts/     # Smart contracts
│   ├── offchain/      # Offchain engine
│   ├── frontend/      # Next.js dashboard
│   └── shared/        # Shared types and utilities
├── scripts/           # Cross-package scripts
└── package.json       # Workspace root
```

**Workspace Configuration** (package.json):
```json
{
  "workspaces": [
    "packages/*"
  ]
}
```

## Directory Patterns

### Smart Contracts (`/packages/contracts/`)
**Purpose**: Solidity コントラクト（CPT Token, Operator Vault, Uniswap v4 Hook）
**Pattern**:
- `/src/tokens/` - ERC20 CPT Token
- `/src/vault/` - Operator Vault (USDC 収益管理)
- `/src/hooks/` - Uniswap v4 Hook (動的手数料制御)
- `/test/` - テスト用コントラクト (Mock Oracle 等)

**Example**:
```
/packages/contracts/src/tokens/ComputeToken.sol
/packages/contracts/src/hooks/UtilizationHook.sol
/packages/contracts/src/vault/OperatorVault.sol
```

### Offchain Engine (`/packages/offchain/`)
**Purpose**: 価格監視・裁定エンジン・Yellow セッション実行・決済オーケストレーション
**Pattern**:
- `/src/watcher/` - 価格差検知 (Uniswap v4 プール監視)
- `/src/arbitrage/` - Ghost Arbitrage Engine (戦略生成・実行指示)
- `/src/yellow/` - Yellow SDK 統合・セッション管理
- `/src/settlement/` - Arc + Circle での USDC 決済処理

**Example**:
```typescript
// /packages/offchain/src/watcher/price-watcher.ts
import { watchPools } from './pool-monitor'
```

### Frontend (`/packages/frontend/`)
**Purpose**: Next.js ダッシュボード (価格差・Hook状態・セッションログ・Vault残高可視化)
**Pattern**:
- `/app/` - Next.js App Router
- `/components/` - UI コンポーネント (Shadcn/ui ベース)
- `/lib/` - ユーティリティ・設定・型定義

**Example**:
```typescript
// /packages/frontend/app/dashboard/page.tsx
// /packages/frontend/components/price-chart.tsx
// /packages/frontend/lib/viem-client.ts
```

### Shared (`/packages/shared/`)
**Purpose**: パッケージ間で共有される型定義・ユーティリティ・定数
**Pattern**:
- `/src/types/` - 共通型定義 (PriceData, ArbitrageParams 等)
- `/src/constants/` - 共通定数 (Contract addresses, Chain IDs)
- `/src/utils/` - 共通ユーティリティ関数

**Example**:
```typescript
// /packages/shared/src/types/arbitrage.ts
export type ArbitrageOpportunity = { ... }

// /packages/shared/src/constants/chains.ts
export const SUPPORTED_CHAINS = [...]
```

### Scripts (`/scripts/`)
**Purpose**: デプロイ・初期化・デモ実行用スクリプト（パッケージ横断）
**Example**:
```typescript
// /scripts/deploy-all.ts
// /scripts/demo-arbitrage.ts
```

### Configuration (`/`)
**Purpose**: プロジェクト全体の設定ファイル（ルート直下）
- `package.json` - Workspace 定義
- `tsconfig.base.json` - 共通 TypeScript 設定
- `turbo.json` or `nx.json` - ビルドオーケストレーション (optional)

**各パッケージの設定**:
- `/packages/contracts/foundry.toml` - コントラクト設定
- `/packages/*/package.json` - パッケージ個別依存関係
- `/packages/*/tsconfig.json` - パッケージ個別 TypeScript 設定 (extends tsconfig.base.json)

## Naming Conventions

- **Files**: kebab-case (`price-watcher.ts`, `demo-arbitrage.ts`)
- **Contracts**: PascalCase (`ComputeToken.sol`, `UtilizationHook.sol`)
  - *Note*: Solidity ファイルはコントラクト名と一致させ PascalCase を使用
- **Components**: PascalCase (`PriceChart.tsx`, `VaultBalance.tsx`)
- **Functions**: camelCase (`watchPools()`, `executeArbitrage()`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_SPREAD`, `ARBITRAGE_THRESHOLD`)
- **Packages**: kebab-case (`@hack-money/contracts`, `@hack-money/offchain`)

## Import Organization

```typescript
// 1. External libraries
import { createPublicClient } from 'viem'
import { mainnet } from 'viem/chains'

// 2. Internal workspace packages
import type { ArbitrageOpportunity } from '@hack-money/shared'
import { watchPools } from '@hack-money/offchain/watcher'

// 3. Internal modules (同一パッケージ内)
import { executeArbitrage } from '@/arbitrage'

// 4. Types
import type { PriceData } from '@/types'

// 5. Relative imports (同一ディレクトリ内のみ)
import { formatPrice } from './utils'
```

**Path Aliases** (tsconfig.json):
- `@hack-money/*`: ワークスペースパッケージ
- `@/`: 各パッケージ内の src ディレクトリ

**Package Dependencies** (package.json):
```json
{
  "dependencies": {
    "@hack-money/shared": "workspace:*",
    "@hack-money/contracts": "workspace:*"
  }
}
```

## Code Organization Principles

### 責務の分離
- **オンチェーン** (`contracts`): 価格形成・決済・状態管理のみ
- **オフチェーン** (`offchain`): 価格監視・戦略・実行ロジック
- **フロントエンド** (`frontend`): 可視化のみ（ビジネスロジックを含まない）
- **共有** (`shared`): 型定義・定数・ユーティリティのみ（ビジネスロジックを含まない）

### 依存方向
- `frontend` → `offchain`, `shared` (読み取り専用)
- `offchain` → `contracts`, `shared` (コントラクト呼び出し)
- `contracts` → `shared` (型定義参照のみ)
- `shared` → 外部依存のみ（他パッケージに依存しない）

### パッケージ間の結合
- 各パッケージは独立してビルド・テスト可能
- 共有コードは `shared` パッケージに集約
- Contract ABIs は `contracts` パッケージから自動生成・エクスポート

### ハッカソンスコープでの簡略化
- **Indexer**: 軽量な自前実装（必要最小限のイベントログ保持、`offchain` パッケージ内）
- **Oracle**: モック実装可（L2稼働率シグナル、`contracts/test` 内）
- **Multi-chain**: L2-A (Base Sepolia), L2-B (WorldCoin Sepolia) の2チェーンに限定

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_

