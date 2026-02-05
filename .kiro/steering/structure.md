# Project Structure

## Organization

フラットなディレクトリ構成を採用し、各層を分離管理。

```
/
├── contract/       # Solidity Contracts (Foundry)
├── frontend/       # Next.js Application
├── scripts/        # Operational Scripts (TS)
├── docs/           # Documentation & Assets
└── .github/        # CI/CD & Prompts
```

## Directory Patterns

### Smart Contracts (`contract/`)
**Purpose**: オンチェーンロジックの実装
**Structure**:
- `src/` - Contract Source
  - Tokens (CPT), Hooks, Vaults
- `test/` - Foundry Tests
- `script/` - Foundry Deployment Scripts
- `lib/` - Dependencies (forge-std etc.)

### Frontend (`frontend/`)
**Purpose**: ユーザーインターフェース（ダッシュボード）
**Structure**:
- `app/` - Next.js App Router Pages
- `components/` - React Components (Shadcn/ui)
  - `ui/` - Primitives
- `public/` - Static Assets
- `biome.json` - Formatter config

### Scripts (`scripts/`)
**Purpose**: オフチェーン操作、デモシナリオ実行、デプロイ補助
**Example**:
- `arc-transfer.ts` - Arc転送スクリプト
- `settle-to-vault.ts` - 収益決済スクリプト

## Configuration Files

- `package.json` (Root): プロジェクト全体のスクリプト管理 (`pnpm transfer` 等)
- `contract/foundry.toml`: Foundry設定
- `frontend/package.json`: フロントエンド依存関係
- `frontend/next.config.ts`: Next.js設定
- `.kiro/steering/`: プロジェクトステアリング（Source of Truth）
