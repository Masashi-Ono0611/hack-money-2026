# Implementation Plan: Offchain Arbitrage Engine

## Task Overview

本実装計画は、Offchain Arbitrage Engine（Price Watcher, Arbitrage Engine, Yellow Session Manager）を実装可能なタスクに分解したものです。

**総タスク数**: 6タスク
**並列実行可能**: 2タスク（マーカー: `(P)`）
**推定期間**: 3-4日（Phase 2 の主要部分）

---

## Task List

### 1. Yellow SDK 調査（Phase 2 開始時）

- [ ] 1.1 (P) Yellow SDK (Nitrolite) 調査
  - 公式ドキュメント確認
  - サンプルコード動作検証
  - API仕様・認証方法の確認
  - Testnet セットアップ
  - **統合可否判断 → モック実装への切り替え判断**
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Note: High Risk として早期調査必須_
  - _Fallback: `USE_YELLOW_MOCK=true` でモック実装に切り替え_

---

### 2. オフチェーン実装

- [ ] 2.1 (P) Price Watcher 実装
  - viem publicClient で Uniswap v4 Pool の価格取得
  - 5秒間隔のポーリングロジック
  - 価格差計算・閾値判定
  - DiscrepancyDetected イベント発行
  - エラー時のリトライロジック（3回）
  - 単体テスト（価格取得、乖離検知）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 5.1, 6.4_
  - _Dependencies: uniswap-v4-integration 完了_

- [ ] 2.2 Arbitrage Engine 実装（2.1に依存）
  - 価格差分析ロジック（流動性・ガス推定）
  - 裁定戦略生成（売買方向・数量決定）
  - リスク管理ルール（最大取引額等）
  - 戦略ログ記録
  - 単体テスト（戦略生成）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 5.2, 6.2_

- [ ] 2.3 Yellow Session Manager 実装（1.1, 2.2に依存）
  - **Yellow SDK (Nitrolite) 統合 または モックフォールバック**
  - createSession, placeOrder, closeSession 実装
  - **isUsingMock() メソッド追加**（モード判定）
  - 反復的な売買指示送信ロジック
  - 最終ネット結果取得
  - セッション実行中のエラーハンドリング
  - **モック実装**（Yellow SDK 統合失敗時のフォールバック）
    - `MockYellowSessionManager` クラス
    - シミュレートされた利益計算（デモ用）
  - 単体テスト（セッション管理）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 5.3, 5.4, 6.6_
  - _Note: モックフォールバック戦略を追加_
  - _Env: `USE_YELLOW_MOCK=true` でモック実装に切り替え_

---

### 3. エラーハンドリング・ログ記録

- [ ] 3.1 構造化ログ実装
  - JSON形式のログ出力（timestamp, level, message, context）
  - ログレベル設定（ERROR, WARN, INFO, DEBUG）
  - すべてのコンポーネントでログ記録
  - _Requirements: 6.1, 6.2, 6.3, 6.6_

- [ ] 3.2 エラーハンドリング統一
  - try/catch でエラーキャッチ
  - エラー内容・タイムスタンプ・コンテキストをログ記録
  - リトライロジック（外部API呼び出し）
  - 致命的エラー時のアラート発行
  - _Requirements: 6.1, 6.4, 6.5_

---

### 4. 統合テスト

- [ ] 4.1 オフチェーン統合テスト（2.1, 2.2, 2.3に依存）
  - Price Watcher → Arbitrage Engine の統合動作確認
  - Arbitrage Engine → Yellow Session Manager の統合動作確認
  - **モック実装での統合テスト**（Yellow SDK 未統合の場合）
  - _Requirements: 5.5, 5.6, 5.7_

---

## Requirements Coverage

- **Requirement 1 (Price Watcher)**: 2.1
- **Requirement 2 (Arbitrage Engine)**: 2.2
- **Requirement 3 (Yellow Session)**: 1.1, 2.3
- **Requirement 4 (Yellow SDK 調査)**: 1.1
- **Requirement 5 (テスト)**: 2.1, 2.2, 2.3, 4.1
- **Requirement 6 (エラーハンドリング)**: 3.1, 3.2

---

## Parallel Execution Strategy

**並列実行可能グループ**:
- Yellow SDK 調査: 1.1（Phase 2 開始と同時）
- Price Watcher: 2.1（uniswap-v4-integration 完了後）

**順序依存タスク**:
- 2.2（2.1に依存）
- 2.3（1.1, 2.2に依存）
- 4.1（2.1, 2.2, 2.3に依存）

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. Yellow SDK 調査（1.1）- Phase 2 開始と同時
2. オフチェーン実装（2.1, 2.2, 2.3）
3. エラーハンドリング（3.1, 3.2）

**Should Have（時間があれば）**:
- 4.1: 統合テスト

**Fallback（Yellow SDK 統合失敗時）**:
- 2.3 をモック実装で完了
- `USE_YELLOW_MOCK=true` でデモ実行

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| Yellow SDK 調査 | 0.5-1日 |
| オフチェーン実装 | 2-3日 |
| エラーハンドリング | 0.5日 |
| 統合テスト | 0.5日 |
| **合計** | **3-4日** |

---

## Dependencies on Other Specifications

- **uniswap-v4-integration** (完了必須): Uniswap v4 Pool 価格を取得
- **settlement-layer**: Yellow セッション終了後、決済処理に渡す
- **dashboard-demo**: セッションログを表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. すべてのタスクが完了している
2. Price Watcher が価格差を検知し、Arbitrage Engine に通知する
3. Arbitrage Engine が裁定戦略を生成し、Yellow Session Manager に指示する
4. Yellow Session Manager が Yellow SDK またはモック実装でセッションを実行する
5. すべてのテストがパスする
6. エラーハンドリング・ログ記録が適切に実装される

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **settlement-layer**: Arc + Circle 決済統合（並行可能）
2. **dashboard-demo**: Dashboard UI、デモスクリプト
