# Implementation Plan: Uniswap v4 Integration

## Task Overview

本実装計画は、Uniswap v4 Integration（Utilization Hook, Pool初期化, テストスイート）を実装可能なタスクに分解したものです。

**総タスク数**: 6 メジャータスク、16 サブタスク
**並列実行可能**: 3 タスク（依存関係なし）
**推定期間**: 5-8日

---

## Task List

### 1. Uniswap v4 依存関係とプロジェクト設定

- [x] 1.1 Uniswap v4 ライブラリをインストールし、Foundry プロジェクトを設定する
  - v4-core と v4-periphery をインストールする
  - remappings.txt を更新して v4 ライブラリへのパスを設定する
  - foundry.toml で Solidity バージョンを 0.8.26 に設定する
  - EVM バージョンを cancun に設定する（transient storage 対応）
  - _Requirements: 3.6_

---

### 2. Utilization Hook コアロジック実装

- [x] 2.1 UtilizationHook コントラクトを実装する
  - IHooks インターフェースを直接実装した Hook コントラクトを作成する（BaseHook は v4-periphery 最新版で削除済み）
  - IMockOracle インターフェースを定義する（core-token-system との連携用）
  - 手数料定数を定義する（LOW_FEE: 0.05%, DEFAULT_FEE: 0.3%, HIGH_FEE: 1.0%）
  - 稼働率閾値を定義する（LOW_THRESHOLD: 30, HIGH_THRESHOLD: 70）
  - FeeOverridden イベントを定義する
  - コンストラクタで PoolManager と Oracle を受け取る
  - _Requirements: 2.8, 5.1_
  - _Note: core-token-system の Mock Oracle がデプロイされている前提_

- [ ] 2.2 getHookPermissions 関数を実装する
  - beforeSwap のみ true に設定する
  - 他のすべてのフックを false に設定する
  - _Requirements: 2.1, 2.8_

- [ ] 2.3 calculateDynamicFee 関数を実装する
  - 稼働率 0-29% の場合は LOW_FEE を返す
  - 稼働率 30-69% の場合は DEFAULT_FEE を返す
  - 稼働率 70-100% の場合は HIGH_FEE を返す
  - 稼働率が 100 を超える異常値の場合は DEFAULT_FEE にフォールバックする
  - _Requirements: 2.3, 2.4, 2.5, 2.6_

- [ ] 2.4 beforeSwap フック関数を実装する
  - Oracle から稼働率を取得する
  - calculateDynamicFee で手数料を計算する
  - FeeOverridden イベントを発行する
  - 手数料を OVERRIDE_FEE_FLAG と共に返す
  - _Requirements: 2.1, 2.2, 2.7_

---

### 3. HookMiner ライブラリ実装

- [ ] 3.1 (P) HookMiner ライブラリを実装する
  - CREATE2 アドレス計算ロジックを実装する
  - 目的のビットパターンを持つソルトを探索する find 関数を実装する
  - 探索範囲を指定可能なオーバーロード関数を実装する
  - 最大反復回数のデフォルト値を設定する（1,000,000 iterations）
  - 探索失敗時の revert を実装する
  - _Requirements: 2.9, 3.1, 3.5_
  - _Note: v4-template の HookMiner を参考に実装_

---

### 4. デプロイスクリプト実装

- [ ] 4.1 DeployHook スクリプトを作成する（Task 2, 3 に依存）
  - 環境変数から PoolManager と MockOracle アドレスを読み込む
  - BEFORE_SWAP_FLAG を設定する
  - HookMiner でソルトを探索する
  - CREATE2 で UtilizationHook をデプロイする
  - デプロイ後にアドレス一致を検証する
  - デプロイ結果をコンソールに出力する
  - _Requirements: 3.1, 3.4, 3.5, 3.6, 5.2_

- [ ] 4.2 InitializePool スクリプトを作成する（Task 4.1 に依存）
  - 環境変数から CPT, USDC, Hook アドレスを読み込む
  - トークン順序を正規化する（currency0 < currency1）
  - PoolKey を構築する（DYNAMIC_FEE_FLAG 設定）
  - 初期価格を設定する
  - PoolManager.initialize を呼び出す
  - _Requirements: 3.2, 3.3, 3.4, 3.6_

- [ ] 4.3 デプロイ結果を JSON ファイルに記録する機能を追加する
  - deployed-addresses.json を作成・更新する
  - チェーン別にアドレスを記録する
  - Hook アドレスと Pool ID を保存する
  - _Requirements: 3.4_

---

### 5. 単体テスト実装

- [ ] 5.1 (P) calculateDynamicFee 関数のテストを作成する
  - 低稼働時（utilization < 30）で LOW_FEE が返されることを検証する
  - 中稼働時（30 <= utilization < 70）で DEFAULT_FEE が返されることを検証する
  - 高稼働時（utilization >= 70）で HIGH_FEE が返されることを検証する
  - 異常値（utilization > 100）で DEFAULT_FEE にフォールバックすることを検証する
  - 境界値（0, 30, 70, 100）のテストを含める
  - _Requirements: 4.1_

- [ ] 5.2 (P) getHookPermissions 関数のテストを作成する
  - beforeSwap が true であることを検証する
  - 他のすべてのフックが false であることを検証する
  - _Requirements: 4.1_

- [ ] 5.3 HookMiner のテストを作成する（Task 3.1 に依存）
  - 有効なソルトが発見されることを検証する
  - 発見されたアドレスが正しいビットパターンを持つことを検証する
  - 最大反復回数を超えた場合に revert することを検証する
  - _Requirements: 4.3_

---

### 6. 統合テスト実装

- [ ] 6.1 Pool + Hook 統合テストを作成する（Task 2, 4 に依存）
  - Mock Oracle をデプロイする
  - UtilizationHook を CREATE2 でデプロイする
  - CPT/USDC Pool を初期化する
  - _Requirements: 4.2_

- [ ] 6.2 スワップ時の動的手数料適用をテストする（Task 6.1 に依存）
  - 低稼働時のスワップで低手数料が適用されることを検証する
  - 高稼働時のスワップで高手数料が適用されることを検証する
  - _Requirements: 4.2_

- [ ] 6.3 beforeSwap コールバック呼び出しをテストする（Task 6.1 に依存）
  - スワップ時に beforeSwap が呼び出されることを検証する
  - FeeOverridden イベントが発行されることを検証する
  - 正しい稼働率と手数料がイベントに記録されることを検証する
  - _Requirements: 4.2, 4.4_

- [ ] 6.4 CREATE2 + HookMiner パターンのエンドツーエンドテストを作成する（Task 6.1 に依存）
  - HookMiner でソルトを探索する
  - CREATE2 でデプロイする
  - デプロイされた Hook が正しく動作することを検証する
  - _Requirements: 4.3_

- [ ]* 6.5 テストカバレッジを 80% 以上に維持する
  - forge coverage でカバレッジレポートを生成する
  - beforeSwap, calculateDynamicFee のカバレッジが 100% であることを確認する
  - _Requirements: 4.5_

---

## Requirements Coverage

| Requirement | Summary | Tasks |
|-------------|---------|-------|
| **1.1-1.5** | CPT/USDC Pool 提供 | 4.2, 6.1 |
| **2.1** | beforeSwap フック呼び出し | 2.2, 2.4, 6.3 |
| **2.2** | L2稼働率取得 | 2.4 |
| **2.3** | 低稼働時の手数料減少 | 2.3, 5.1 |
| **2.4** | 高稼働時の手数料増加 | 2.3, 5.1 |
| **2.5** | スプレッド調整ロジック | 2.3 |
| **2.6** | 異常データフォールバック | 2.3, 5.1 |
| **2.7** | Hook実行ログ | 2.4, 6.3 |
| **2.8** | v4 Hook インターフェース準拠 | 2.1, 2.2 |
| **2.9** | CREATE2 + HookMiner デプロイ | 3.1, 4.1 |
| **3.1** | Hook デプロイ | 3.1, 4.1 |
| **3.2** | Pool 初期化 | 4.2 |
| **3.3** | 初期流動性提供 | 4.2 |
| **3.4** | アドレス記録 | 4.1, 4.2, 4.3 |
| **3.5** | ソルト探索拡大 | 3.1, 4.1 |
| **3.6** | Foundry 使用 | 1.1, 4.1, 4.2 |
| **4.1** | 動的手数料ロジックテスト | 5.1, 5.2 |
| **4.2** | Pool + Hook 統合テスト | 6.1, 6.2, 6.3 |
| **4.3** | HookMiner パターンテスト | 5.3, 6.4 |
| **4.4** | Foundry test 実行 | 6.3 |
| **4.5** | カバレッジレポート | 6.5 |
| **5.1** | Hook 実行権限制限 | 2.1 |
| **5.2** | 環境変数管理 | 4.1 |
| **5.3** | 異常値フォールバック | 2.3, 5.1 |

---

## Implementation Notes

### 並列実行可能タスク

以下のタスクは依存関係がなく、並列実行可能:
- **3.1 (P)**: HookMiner ライブラリ（独立ユーティリティ）
- **5.1 (P)**: calculateDynamicFee テスト（pure function テスト）
- **5.2 (P)**: getHookPermissions テスト（pure function テスト）

### 依存関係グラフ

```
1.1 (依存関係設定)
 └── 2.1 → 2.2 → 2.3 → 2.4 (Hook 実装)
      └── 4.1 (DeployHook)
           └── 4.2 (InitializePool)
                └── 4.3 (アドレス記録)

3.1 (P) (HookMiner - 並列可能)
 └── 5.3 (HookMiner テスト)

5.1 (P), 5.2 (P) (単体テスト - 並列可能)

6.1 → 6.2 → 6.3 → 6.4 → 6.5 (統合テスト)
```

### 推奨実行順序

1. **Phase 1**: 1.1（依存関係設定）
2. **Phase 2**: 2.1-2.4（Hook 実装）+ 3.1（HookMiner、並列）
3. **Phase 3**: 4.1-4.3（デプロイスクリプト）
4. **Phase 4**: 5.1-5.3（単体テスト）
5. **Phase 5**: 6.1-6.5（統合テスト）

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| 依存関係追加 (1.x) | 0.5日 |
| Hook 実装 (2.x) | 1-1.5日 |
| HookMiner (3.x) | 0.5日 |
| デプロイスクリプト (4.x) | 1日 |
| 単体テスト (5.x) | 0.5-1日 |
| 統合テスト (6.x) | 1-1.5日 |
| デバッグ・調整バッファ | 1-2日 |
| **合計** | **5-8日** |

---

## Dependencies on Other Specifications

- **core-token-system** (先行完了必須): CPT Token, Mock Oracle
- **offchain-arbitrage-engine**: Pool 価格を監視
- **dashboard-demo**: Hook 状態を表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. ✅ すべてのタスクが完了している
2. ✅ Utilization Hook が CREATE2 + HookMiner パターンでデプロイされる
3. ✅ Uniswap v4 Pool が CPT/USDC ペアで初期化される
4. ✅ スワップ時に Hook が動的手数料を適用する
5. ✅ すべてのテストがパスする（カバレッジ >= 80%）
6. ✅ デプロイスクリプトが自動化され、コントラクトアドレスが記録される

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **offchain-arbitrage-engine**: 価格監視・裁定ロジック実装（並行可能）
2. **settlement-layer**: Arc + Circle 決済統合
3. **dashboard-demo**: Dashboard UI、デモスクリプト
