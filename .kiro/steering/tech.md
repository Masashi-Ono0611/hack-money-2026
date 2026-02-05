# Technology Stack

## Architecture

**構成**: Frontend / Contracts / Scripts によるシンプル構成（非モノレポworkspace）。

- **Contract Layer**: Solidity (Foundry)
  - CPT発行, Uniswap v4 Hook, Operator Vault
- **Frontend Layer**: Next.js (App Router)
  - ダッシュボード, 価格・収益可視化
- **Script/Connect Layer**: TypeScript
  - 裁定ロジック, Arc転送, 初期セットアップ

## Core Technologies

- **Runtime**: Node.js 20+ (Bun supported in Frontend)
- **Language**: TypeScript 5.x, Solidity 0.8.x

### Smart Contracts (`contract/`)
- **Framework**: Foundry
- **Key Protocols**:
  - **Uniswap v4**: Custom Hooks for dynamic pricing
  - **Yellow Network**: Intent-based trading integration
  - **Circle / Arc**: USDC settlement & bridging

### Frontend (`frontend/`)
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Shadcn/ui (Radix UI base)
- **Tooling**: Biome (Linter/Formatter), Bun (Package Manager)

### Scripts (`scripts/`)
- **Runtime**: `tsx` (TypeScript Execution)
- **Key Libraries**: `jose`, `viem` (implied for chain interaction)

## Development Standards

### Type Safety & Quality
- **TypeScript**: Strict mode.
- **Solidity**: NatSpec comments required.
- **Formatting**:
  - Frontend: `biome context`
  - Contract: `forge fmt`

### Testing Strategy
- **Contracts**: `forge test` (Solidity unit & integration tests)
- **Frontend**: Manual verification for UI, Linting via Biome.

## Key Technical Decisions

### 1. Uniswap v4 Hook
L2稼働率をオンチェーン価格に反映させるため、v3ではなくHook可能なv4を採用。

### 2. GSU (Gas Standard Unit)
異なるL2間の計算コストを統一的に扱うための正規化単位として採用。

### 3. Yellow + Arc
「高速な裁定（Yellow）」と「確実な価値の保存（Arc/USDC）」を役割分担し、L2運営者にとって実用的な収益システムを構築。
