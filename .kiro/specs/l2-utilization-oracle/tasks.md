# Implementation Plan: l2-utilization-oracle

## タスク概要

本タスクは `requirements.md` / `design.md` に基づき、L2稼働率オラクルを段階的に実装する。
優先度は P0（必須）→ P1（重要）で進め、P0完了時点で「stale時DEFAULT_FEEで安全側に倒れる」状態を達成する。

- 総メジャータスク: 8
- 総サブタスク: 33
- 推奨実装順: 1 → 2 → 4 → 7 → 3 → 5 → 6 → 8

---

## 3時間スコープ改善タスク（P0短期）

提出直前の品質向上に向けた最小セット。既存構成を壊さずに信頼性を上げる。

- [x] A. Functions 側更新のメタ記録を補完する
  - `MockOracle` に Functions 経路の `timestamp` / 最終値を保持する状態を追加
  - `setUtilizationFromFunctions()` でメタ情報を確実に記録
  - _Requirements: 1.3, 2.2, 8.1_

- [x] B. FunctionsReceiver の運用間隔を要件値に整合する
  - `DEFAULT_MIN_UPKEEP_INTERVAL` を 15分（900秒）へ更新
  - README で「15分デフォルト」を明示
  - _Requirements: 7.2_

- [x] C. Functions 更新の一気通貫スクリプト/手順を用意する
  - source 登録 → args 更新 → `performUpkeep` 実行までを手順化
  - `scripts/arbitrage/functions/deploy/README.md` に追記
  - _Requirements: 7.4, 7.5_

- [x] D. 設定値の反映運用を明文化する
  - `divergenceThreshold` / `staleTtl` の適用方法を README に追記
  - 例: デプロイ後に `setStaleTtl()` / allowlist 更新を行う
  - _Requirements: 11.1_

---

## タスクリスト

- [x] 1. Oracleコントラクト拡張（P0）

- [x] 1.1 `IMockOracle` の公開インターフェースを拡張する
  - `getUtilizationWithMeta()` を追加
  - `setUtilizationFromBot()` / `setUtilizationFromFunctions()` を追加
  - `setStaleTtl()` / `setAuthorizedUpdater()` を追加
  - _Requirements: 1.5, 2.1, 2.2, 3.1, 4.3, 10.1, 10.3_

- [x] 1.2 状態変数と定数を追加する
  - `_updatedAt`, `_source`, `_staleTtl`, allowlist, divergence追跡変数を追加
  - `SOURCE_BOT=1`, `SOURCE_FUNCTIONS=2`, `DIVERGENCE_THRESHOLD=15` などを定義
  - _Requirements: 1.3, 1.4, 2.3, 4.1, 8.4_

- [x] 1.3 更新関数（legacy/bot/functions）を実装する
  - `setUtilization()` の後方互換維持
  - bot/functions更新で source と updatedAt を記録
  - requestId 記録を実装
  - _Requirements: 2.1, 2.2, 8.1, 10.1, 10.2_

- [x] 1.4 バリデーションを実装する
  - `utilization > 100` を revert
  - `timestamp > block.timestamp + drift` を revert
  - `timestamp` が古すぎる場合を revert
  - _Requirements: 1.2, 9.2, 9.3_

- [x] 1.5 stale判定を実装する
  - 初期未更新 (`updatedAt == 0`) は stale=true
  - `block.timestamp - updatedAt > staleTtl` で stale=true
  - _Requirements: 4.2, 4.4, 4.5, 9.5_

- [x] 1.6 イベントを拡張する
  - `UtilizationUpdated(utilization, source, updatedAt)`
  - `UpdaterAuthorizationChanged(updater, allowed)`
  - `TtlUpdated(ttlSeconds)`
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 1.7 allowlistアクセス制御を実装する
  - owner限定で updater 管理
  - 非認可アドレスの更新を拒否
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 1.8 乖離閾値ロジックを実装する
  - bot値とfunctions値の乖離計算
  - 乖離が閾値超過時に functions値を優先
  - _Requirements: 2.3, 2.4_

- [x] 1.9 カスタムエラーを導入する
  - 利用頻度の高い revert を custom error 化
  - _Requirements: 9.2, 9.3（実装品質）_

---

- [x] 2. UtilizationHook 連携更新（P0）

- [x] 2.1 オラクル参照をメタ情報付きAPIへ切り替える
  - `getUtilizationWithMeta()` を利用
  - _Requirements: 5.1_

- [x] 2.2 stale時に `DEFAULT_FEE` を強制する
  - stale=true の場合は利用率を無視
  - _Requirements: 5.2, 9.1_

- [x] 2.3 非stale時の既存動的手数料ロジックを維持する
  - 既存の LOW/DEFAULT/HIGH 閾値動作を維持
  - _Requirements: 5.3, 5.4_

- [x] 2.4 staleフォールバックを監査可能にする
  - 必要に応じて補助イベントを追加
  - _Requirements: 8.1, 8.4_

---

- [ ] 3. Chainlink Functions Receiver 実装（P1）

- [x] 3.1 `FunctionsReceiver.sol` を新規作成する
  - Oracle本体とChainlink通信責務を分離
  - _Requirements: 7.3, 7.5_

- [x] 3.2 `performUpkeep()` で request送信を実装する
  - interval制御、Router送信を実装
  - _Requirements: 7.2, 7.4_

- [x] 3.3 `fulfillRequest()` でレスポンス検証とOracle更新を実装する
  - 正常時: `setUtilizationFromFunctions()`
  - 失敗時: イベント記録のみで継続
  - _Requirements: 7.3, 7.5_

- [x] 3.4 Receiver を Oracle allowlist に接続する
  - デプロイ後に authorized updater として登録
  - _Requirements: 3.1, 7.3_

- [x] 3.5 Base Sepolia向け Router / DON 設定を定義する
  - _Requirements: 7.4, 11.2_

- [x] 3.6 Functions障害時に継続可能な挙動を検証する
  - _Requirements: 2.4, 7.5, 9.4_

---

- [x] 4. Offchain Oracle Updater Bot 実装（P0）

- [x] 4.1 `scripts/arbitrage/config.ts` を作成する
  - primary/fallback RPC、EMA、interval、TTL、chain別設定
  - 環境変数優先を実装
  - _Requirements: 6.5, 11.1, 11.3, 11.4_

- [x] 4.2 `scripts/arbitrage/oracle-updater.ts` を作成する
  - チェーンごとの実行ループを実装
  - _Requirements: 6.3_

- [x] 4.3 ブロックデータ取得ロジックを実装する
  - `gasUsed`, `gasLimit` を直近窓分取得
  - _Requirements: 6.1_

- [x] 4.4 EMA計算ロジックを実装する
  - 0-100整数へ正規化
  - _Requirements: 1.1, 6.2_

- [x] 4.5 RPCフェイルオーバーを実装する
  - 主系失敗時に副系へ切り替え
  - _Requirements: 6.4_

- [x] 4.6 `setUtilizationFromBot()` 呼び出しとリトライを実装する
  - _Requirements: 2.1, 6.3_

- [x] 4.7 運用ログを実装する
  - chain/utilization/source/txHash/fallbackの記録
  - _Requirements: 8.1（運用補助）_

---

- [x] 5. Functions Source / デプロイ資材整備（P1）

- [x] 5.1 `scripts/arbitrage/functions/source.js` を作成する
  - RPC取得 + EMA計算（botと同式）
  - _Requirements: 7.1_

- [x] 5.2 `scripts/arbitrage/functions/deploy/` を作成する
  - subscription/router/don設定を投入可能にする
  - _Requirements: 7.4, 11.2_

- [x] 5.3 リクエスト引数仕様を固定する
  - chainId, blockWindow, rpcHints など
  - _Requirements: 7.1, 11.1_

- [x] 5.4 Base Sepolia向け運用手順を記述する
  - 実行・更新・障害対応
  - _Requirements: 7.2, 7.4, 7.5_

- [x] 5.5 UnichainでFunctions無効を設定で固定する
  - _Requirements: 11.3_

---

- [x] 6. Foundry デプロイ/検証スクリプト更新（P1）

- [x] 6.1 `DeployCore.s.sol` を更新する
  - 拡張Oracleの初期化（TTL/updater設定）
  - _Requirements: 3.1, 4.3, 11.1_

- [x] 6.2 `DeployHook.s.sol` を更新する
  - 新Oracle IF と再デプロイ手順に対応
  - _Requirements: 5.1, 10.4_

- [x] 6.3 `VerifyHookBehavior.s.sol` を更新する
  - staleシナリオを追加
  - _Requirements: 5.2, 9.1_

- [x] 6.4 `deployed-addresses.json` 更新運用を明文化する
  - _Requirements: 11.1_

---

- [x] 7. テスト実装（P0）

- [x] 7.1 `MockOracle.t.sol` を拡張する
  - 範囲外/権限/timestamp/stale/source/乖離/互換APIのテストを追加
  - _Requirements: 1, 2, 3, 4, 8, 9, 10_

- [x] 7.2 `UtilizationHook.t.sol` に staleケースを追加する
  - stale時DEFAULT_FEEを検証
  - _Requirements: 5.2, 9.1_

- [x] 7.3 `PoolHookIntegration.t.sol` に stale E2E を追加する
  - 実swapで安全側feeを検証
  - _Requirements: 5.2, 9.1_

- [x] 7.4 `FunctionsReceiver.t.sol` を追加する
  - fulfill正常/異常、router認可、interval挙動を検証
  - _Requirements: 7.3, 7.5_

- [x] 7.5 botロジックのユニットテストを追加する
  - EMA/clamp/fallback/retry
  - _Requirements: 6.2, 6.4, 6.5_

---

- [x] 8. 運用・監査導線整備（P1）

- [x] 8.1 イベント監視クエリ例を整備する
  - source別追跡
  - _Requirements: 8.1, 8.4_

- [x] 8.2 stale検知アラート条件を定義する
  - TTL超過時アラート
  - _Requirements: 4.2, 9.1_

- [x] 8.3 LINK残高監視手順を整備する
  - Functions/Automationの枯渇防止
  - _Requirements: 7.5_

- [x] 8.4 障害時Runbookを整備する
  - bot停止 / functions停止 / 両停止
  - _Requirements: 2.4, 9.1, 9.4_

---

## 依存関係

1. `1 -> 2 -> 6 -> 7.3`
2. `1 -> 7.1`
3. `3 -> 6 -> 7.4`
4. `4 -> 7.5`
5. `5 -> 3`
6. `7` 完了後に `8`

---

## 並列実行可能グループ

- グループA: `1` と `4`（I/F確定後に統合）
- グループB: `3` と `5`（receiverとsource資材）
- グループC: `7.1` と `7.5`（onchain/offchain別ライン）

---

## Definition of Done

- Oracleが `utilization + meta(stale/source/updatedAt)` を返せる
- stale時にHookが必ず `DEFAULT_FEE` を適用する
- bot更新 + Functions検証の2経路が独立稼働する
- allowlistで不正更新を拒否できる
- 既存 `setUtilization()` / `getUtilization()` 互換を維持する
- 主要受入基準に対応するテストが追加され、テストがグリーンになる
