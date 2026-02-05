# Implementation Plan: Settlement Layer

## Task Overview

本実装計画は、Settlement Layer（Settlement Orchestrator, Arc + Circle W3S API 統合）を実装可能なタスクに分解したものです。

**総タスク数**: 3タスク
**並列実行可能**: 0タスク（順序依存）
**推定期間**: 1-2日（Phase 2 の一部）

---

## Task List

### 1. Settlement Orchestrator 実装

- [ ] 1.1 Settlement Orchestrator 実装（offchain-arbitrage-engine/2.3に依存）
  - **Circle Programmable Wallets API (W3S) を使用**
  - **既存スクリプト活用**: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`
  - `ArcTransferService`, `VaultSettlementService` パターンを参考に実装
  - settleProfit 実装（USDC 決済処理）
  - Operator Vault への入金確認
  - 決済失敗時のリトライロジック（3回）
  - 単体テスト（決済処理）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 3.1, 4.4_
  - _Note: CCTP → W3S API に変更、既存実装活用_
  - _Reference: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`_

---

### 2. エラーハンドリング・ログ記録

- [ ] 2.1 エラーハンドリング実装
  - try/catch でエラーキャッチ
  - エラー内容・タイムスタンプ・コンテキストをログ記録
  - リトライロジック（外部API呼び出し）
  - 致命的エラー時のアラート発行
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

---

### 3. 統合テスト

- [ ] 3.1 統合テスト（1.1に依存）
  - Yellow Session Manager → Settlement Orchestrator の統合動作確認
  - Settlement Orchestrator → Operator Vault の統合動作確認
  - _Requirements: 3.2, 3.3, 3.4_

---

## Requirements Coverage

- **Requirement 1 (Arc Settlement)**: 1.1
- **Requirement 2 (既存スクリプト活用)**: 1.1
- **Requirement 3 (テスト)**: 1.1, 3.1
- **Requirement 4 (エラーハンドリング)**: 2.1

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. Settlement Orchestrator 実装（1.1）
2. エラーハンドリング（2.1）

**Should Have（時間があれば）**:
- 3.1: 統合テスト

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| Settlement 実装 | 1-1.5日 |
| エラーハンドリング | 0.5日 |
| 統合テスト | 0.5日 |
| **合計** | **1-2日** |

---

## Dependencies on Other Specifications

- **core-token-system** (完了必須): Operator Vault
- **offchain-arbitrage-engine** (完了必須): Yellow Session Manager から最終利益を受け取る
- **dashboard-demo**: Vault 残高を表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. すべてのタスクが完了している
2. Settlement Orchestrator が Yellow セッション終了後、USDC を Operator Vault に入金する
3. Circle Programmable Wallets API (W3S) が正常に動作する
4. 既存スクリプトのパターンが適切に活用される
5. すべてのテストがパスする

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **dashboard-demo**: Dashboard UI、デモスクリプト
