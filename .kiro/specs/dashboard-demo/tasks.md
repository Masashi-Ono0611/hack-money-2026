# Implementation Plan: Dashboard & Demo

## Task Overview

本実装計画は、Dashboard & Demo（Dashboard UI, デモスクリプト）を実装可能なタスクに分解したものです。

**総タスク数**: 9タスク
**並列実行可能**: 6タスク（マーカー: `(P)`）
**推定期間**: 2-3日（Phase 3）

---

## Task List

### 1. フロントエンド依存関係インストール（Phase 1 で完了済み）

- [x] 1.1 (P) フロントエンド依存関係インストール
  - **既存 `frontend/` ディレクトリを活用**
  - Next.js 14+, TailwindCSS, Shadcn/ui インストール
  - Recharts or Chart.js インストール
  - Next.js App Router 設定
  - _Requirements: 1.8_
  - _Note: Phase 1 で完了済み_

---

### 2. Dashboard UI 完成版構築（Phase 3）

- [x] 2.1 (P) Dashboard UI 完成版構築 ✅
  - Next.js App Router でルーティング設定（/dashboard） ✅ frontend/app/dashboard/page.tsx
  - TailwindCSS でレイアウト構築 ✅ Pencil UIモック準拠ダークテーマ
  - viem 初期化 ✅ frontend/lib/chains.ts
  - サイドバー・メインコンテンツエリア作成 ✅ frontend/app/_components/sidebar.tsx, frontend/app/layout.tsx
  - _Requirements: 1.8_

- [x] 2.2 (P) 価格差表示コンポーネント実装 ✅
  - CPT-A / CPT-B 価格表示 ✅ frontend/app/dashboard/_components/metrics-row.tsx (PriceCard)
  - 価格差計算・表示 ✅ metrics-row.tsx (SpreadCard)
  - 5秒間隔の自動リフレッシュ ✅ dashboard/page.tsx (setInterval 5000ms)
  - 価格推移チャート表示 ✅ frontend/app/dashboard/_components/price-spread-chart.tsx
  - _Requirements: 1.1, 1.2, 1.3, 1.7, 1.9_

- [x] 2.3 (P) Hook 状態表示コンポーネント実装 ✅
  - Utilization Hook の現在の手数料設定表示 ✅ frontend/app/settlement/_components/hook-status-card.tsx
  - Mock Oracle の稼働率表示 ✅ frontend/app/settlement/_components/cpt-price-card.tsx
  - Hook 実行ログ表示 ✅ frontend/app/settlement/_components/pipeline-log.tsx
  - _Requirements: 1.4_

- [x] 2.4 (P) Yellow セッションログ表示コンポーネント実装 ✅
  - セッションID、売買ログ、最終利益表示 ✅ frontend/app/dashboard/_components/session-log.tsx
  - セッション状態（ACTIVE / CLOSED / FAILED）表示 ✅ session-log.tsx (BUY/SELL/SESSION/PROFIT types)
  - **モックモード表示** ✅ dashboard/page.tsx (MOCK banner), session-log.tsx (MOCK badge)
  - _Requirements: 1.5, 1.11_

- [x] 2.5 (P) Operator Vault 残高表示コンポーネント実装 ✅
  - USDC 残高表示 ✅ metrics-row.tsx (VaultCard), settlement/_components/vault-balance-card.tsx
  - リアルタイム更新 ✅ dashboard/page.tsx (5s interval), settlement/page.tsx (15s interval)
  - _Requirements: 1.6, 1.7_

- [x] 2.6 Dashboard 統合（2.1, 2.2, 2.3, 2.4, 2.5に依存） ✅
  - 各コンポーネントを Dashboard に統合 ✅ dashboard/page.tsx (MetricsRow + PriceSpreadChart + SessionLog)
  - レスポンシブレイアウト調整 ✅ grid-cols-4, grid-cols-5
  - Next.js ビルド成功 ✅
  - _Requirements: 1.10, 1.12_

---

### 3. ハッカソンデモスクリプト実装（Phase 3）

- [x] 3.1 デモスクリプト実装（すべての仕様に依存） ✅ scripts/demo/run-demo.ts
  - L2稼働率シミュレーション ✅ simulateDiscrepancy() で価格差シミュレート
  - 価格差検知 ✅ PriceWatcher.pollOnce() + フォールバック
  - 裁定取引の一連のフロー自動実行 ✅ DemoRunner.run() (5ステップ)
  - **Yellow SDK モック対応** ✅ USE_YELLOW_MOCK=true
  - デモシナリオの各ステップログ出力 ✅ printStepHeader + console.log
  - 実行結果サマリー表示 ✅ printSummary()
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 3.2 デモシナリオテスト ✅
  - デモスクリプトの動作確認 ✅ pnpm demo 実行成功 (exit code 0)
  - 各ステップの成功確認 ✅ 5/5 steps 成功, Profit: $3.50 USDC
  - **モック実装でのデモ確認** ✅ USE_YELLOW_MOCK=true で実行確認済み
  - _Requirements: 2.4_

---

### 4. E2E テスト

- [ ] 4.1 Dashboard E2E テスト
  - Playwright または同等ツールで E2E テスト
  - 価格差・Hook状態・ログ・残高の表示確認
  - 自動リフレッシュ動作確認
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

---

## Requirements Coverage

- **Requirement 1 (Dashboard)**: 2.1-2.6, 4.1
- **Requirement 2 (ハッカソンデモ)**: 3.1, 3.2
- **Requirement 3 (テスト)**: 4.1

---

## Parallel Execution Strategy

**並列実行可能グループ**:
- Dashboard コンポーネント: 2.2, 2.3, 2.4, 2.5（2.1完了後）

**順序依存タスク**:
- 2.6（2.1-2.5に依存）
- 3.1（全仕様完了に依存）
- 3.2（3.1に依存）
- 4.1（2.6に依存）

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. Dashboard UI 完成版（2.1-2.6）
2. デモスクリプト（3.1, 3.2）

**Should Have（時間があれば）**:
- 4.1: E2E テスト

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| Dashboard UI | 1.5-2日 |
| デモスクリプト | 0.5-1日 |
| E2E テスト | 0.5日 |
| **合計** | **2-3日** |

---

## Dependencies on Other Specifications

- **core-token-system** (完了必須): CPT Token, Mock Oracle, Operator Vault
- **uniswap-v4-integration** (完了必須): Uniswap v4 Pool, Hook
- **offchain-arbitrage-engine** (完了必須): Yellow Session Manager
- **settlement-layer** (完了必須): Settlement Orchestrator

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. すべてのタスクが完了している
2. Dashboard が CPT価格差・Hook状態・セッションログ・Vault残高を表示する
3. Dashboard が 3秒以内に初期ロードを完了する
4. デモスクリプトが裁定取引の一連のフローを自動実行する
5. すべてのテストがパスする（E2Eテスト）
6. ハッカソンデモが審査員に分かりやすい形で実行できる

---

## Completion

本仕様完了後、**全5仕様が完了**し、Zombie L2 Clearinghouse プロジェクトが完成します！
