# Implementation Plan: Uniswap v4 Integration

## Task Overview

本実装計画は、Uniswap v4 Integration（Utilization Hook, Pool初期化）を実装可能なタスクに分解したものです。

**総タスク数**: 4タスク
**並列実行可能**: 0タスク（順序依存）
**推定期間**: 1-2日（Phase 1 の一部）

---

## Task List

### 1. Uniswap v4 依存関係追加

- [ ] 1.1 Uniswap v4 ライブラリインストール
  - `foundry.toml` で Uniswap v4 依存関係追加（v4-core, v4-periphery）
  - HookMiner ユーティリティの確認
  - _Requirements: 3.6_
  - _Note: core-token-system 完了後に実施_

---

### 2. Utilization Hook 実装

- [ ] 2.1 Utilization Hook 実装（1.1, core-token-system/2.2に依存）
  - Uniswap v4 BaseHook 継承
  - beforeSwap 実装（稼働率に応じた動的手数料調整）
  - Mock Oracle から稼働率取得
  - 異常データ時のデフォルト手数料適用（0.3%）
  - Hook実行ログ記録
  - **CREATE2 + HookMiner パターンでのデプロイ準備**
    - Hook フラグ定義（BEFORE_SWAP_FLAG）
    - アドレスビットパターン制約対応
  - 単体テスト（動的手数料ロジック）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 4.1_

---

### 3. Uniswap v4 Pool 設定・初期化

- [ ] 3.1 Uniswap v4 Pool 初期化スクリプト作成（2.1, core-token-system/2.1に依存）
  - CPT/USDC ペアのプール作成
  - **HookMiner で適切な Hook アドレスを生成**
  - **CREATE2 で Utilization Hook をデプロイ**
  - Utilization Hook をプールに登録
  - 初期流動性提供（テスト用）
  - プール初期化の検証
  - コントラクトアドレス記録（JSON設定ファイル）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.3_
  - _Note: CREATE2 + HookMiner パターン採用_

---

### 4. 統合テスト

- [ ] 4.1 Uniswap v4 Pool + Hook 統合テスト（3.1に依存）
  - スワップ時のHook呼び出し確認
  - 動的手数料適用確認
  - CREATE2 + HookMiner パターン検証
  - _Requirements: 4.2, 4.3, 4.5_

---

## Requirements Coverage

- **Requirement 1 (Uniswap v4 Pool)**: 3.1
- **Requirement 2 (Utilization Hook)**: 1.1, 2.1
- **Requirement 3 (デプロイ)**: 3.1
- **Requirement 4 (テスト)**: 2.1, 4.1
- **Requirement 5 (セキュリティ)**: 2.1

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. Uniswap v4 依存関係追加（1.1）
2. Utilization Hook 実装（2.1）
3. Pool 初期化スクリプト（3.1）

**Should Have（時間があれば）**:
- 4.1: 統合テスト

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| 依存関係追加 | 0.5日 |
| Hook 実装 | 0.5-1日 |
| Pool 初期化 | 0.5日 |
| 統合テスト | 0.5日 |
| **合計** | **1-2日** |

---

## Dependencies on Other Specifications

- **core-token-system** (完了必須): CPT Token, Mock Oracle
- **offchain-arbitrage-engine**: Pool 価格を監視
- **dashboard-demo**: Hook 状態を表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. すべてのタスクが完了している
2. Utilization Hook が CREATE2 + HookMiner パターンでデプロイされる
3. Uniswap v4 Pool が CPT/USDC ペアで初期化される
4. スワップ時に Hook が動的手数料を適用する
5. すべてのテストがパスする

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **offchain-arbitrage-engine**: 価格監視・裁定ロジック実装（並行可能）
2. **settlement-layer**: Arc + Circle 決済統合
3. **dashboard-demo**: Dashboard UI、デモスクリプト
