# Design Document: Dashboard & Demo

## Overview

**Purpose**: Dashboard & Demo は、CPT価格差・Hook状態・セッションログ・Vault残高をリアルタイムで可視化し、ハッカソンデモを実行するインターフェースを提供します。

**Users**:
- **審査員**: システムの動作状況と収益を視覚的に理解
- **L2運営者**: Vault 残高を確認
- **デモ実施者**: ハッカソンデモを実行

**Impact**:
Zombie L2 Clearinghouse の全機能を視覚化し、審査員にプロダクトの価値を効果的に伝えます。

### Goals

- Dashboard UI によるリアルタイム可視化
- Recharts/Chart.js による価格推移チャート
- ハッカソンデモスクリプトによる自動実行
- Yellow SDK モックモード表示

### Non-Goals

- CPT Token 発行機能（core-token-system 仕様）
- 価格監視・裁定ロジック（offchain-arbitrage-engine 仕様）

---

## Architecture

**Technology Stack**:
- Frontend: Next.js 16 (App Router), React 19, TailwindCSS 4, Shadcn/ui
- Charts: Recharts or Chart.js
- Blockchain: wagmi / viem
- Tooling: Biome (Linter/Formatter), Bun (Package Manager)

---

## Components

### Dashboard UI

**API Contract**:

| Method | Endpoint | Request | Response | Errors |
|--------|----------|---------|----------|--------|
| GET | /api/prices | - | `{ priceA: string, priceB: string, spread: number }` | 500 |
| GET | /api/hook-status | - | `{ feeA: number, feeB: number, utilizationA: number, utilizationB: number }` | 500 |
| GET | /api/session-logs | - | `{ logs: SessionLog[] }` | 500 |
| GET | /api/vault-balance | - | `{ balance: string }` | 500 |

**State Management**:
- React hooks (useState, useEffect) + wagmi hooks
- 5秒間隔の自動リフレッシュ

---

### Demo Script

**Implementation Pattern**:

```typescript
interface DemoScriptService {
  /**
   * L2稼働率をシミュレート
   */
  simulateUtilization(chainId: number, utilization: number): Promise<void>;

  /**
   * 価格差を人為的に発生
   */
  createPriceDiscrepancy(): Promise<void>;

  /**
   * 裁定取引の一連のフローを自動実行
   */
  runArbitrage(): Promise<void>;

  /**
   * 実行結果サマリーを表示
   */
  displaySummary(): void;
}
```

---

## Testing Strategy

### E2E Tests

1. **Dashboard**: 価格差・Hook状態・ログ・残高の表示確認
2. **自動リフレッシュ**: データ更新の動作確認
3. **Demo Script**: 裁定取引フローの自動実行確認

---

## Dependencies on Other Specifications

- **core-token-system**: CPT Token, Mock Oracle, Operator Vault の状態を表示
- **uniswap-v4-integration**: Uniswap v4 Pool 価格、Hook 状態を表示
- **offchain-arbitrage-engine**: Yellow セッションログを表示
- **settlement-layer**: Operator Vault 残高を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Dashboard が CPT価格差・Hook状態・セッションログ・Vault残高を表示する
2. Dashboard が 3秒以内に初期ロードを完了する
3. デモスクリプトが裁定取引の一連のフローを自動実行する
4. すべてのテストがパスする（E2Eテスト）
5. ハッカソンデモが審査員に分かりやすい形で実行できる
