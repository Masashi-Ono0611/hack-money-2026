# 技術スタック（最新）

## アーキテクチャ
- **Contracts**: Solidity + Foundry（`contract/`）
- **Frontend**: Next.js App Router（`frontend/`）
- **Scripts**: TypeScript（`scripts/`）

## 主要ライブラリ / ツール

### Root（Scripts）
- **Runtime/Tooling**: `tsx`, `vitest`, `typescript`
- **Chain/Network**: `viem`, `ethers`, `ws`
- **Security/Encoding**: `jose`
- **Yellow**: `@erc7824/nitrolite`

### Frontend
- **Framework**: Next.js 16.1.6
- **UI**: React 19.2.4
- **Styling**: Tailwind CSS 4.1.18
- **Charts**: Recharts
- **UI Primitives**: Radix UI（`radix-ui`）
- **Tooling**: Biome 2.3.14, ESLint 9.17.0

### Contracts
- **Framework**: Foundry
- **Protocols**: Uniswap v4 Hooks, Yellow Network, Circle/Arc（設計要件）

## パッケージ管理
- **Root**: pnpm（`pnpm-lock.yaml`）
- **Frontend**: bun（`bun.lockb`）
