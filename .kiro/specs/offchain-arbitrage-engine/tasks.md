# Implementation Plan: Offchain Arbitrage Engine

## Task Overview

本実装計画は、design.md に基づき Offchain Arbitrage Engine の全コンポーネントを実装可能な粒度に分解したものです。

**総タスク数**: 7 メジャータスク、10 サブタスク（合計 13 アクション項目）
**並列実行可能**: (P) マーカー付きタスク
**推定期間**: 3-5 日

---

## Task List

- [x] 1. 共有基盤の構築

- [x] 1.1 (P) 共有型定義とインターフェースの構築 ✅ scripts/arbitrage/types.ts, scripts/arbitrage/abi/state-view.ts
  - 全ドメインで使用する型定義（価格スナップショット、裁定戦略、セッション情報、取引注文、取引結果、ログエントリ等）を定義する
  - 価格監視・裁定エンジン・セッション管理の各インターフェースを宣言する
  - Uniswap v4 StateView の ABI 定義（getSlot0）を最小限で用意する
  - TypeScript strict mode を有効化し、全体のプロジェクト設定を整える
  - _Requirements: 1.7, 2.7_
  - _Contracts: IPriceWatcher, IArbitrageEngine, IYellowSession, IYellowSessionManager, ILogger_

- [x] 1.2 (P) 構造化ログ出力機能の実装 ✅ scripts/lib/logger.ts
  - 4 段階のログレベル（DEBUG, INFO, WARN, ERROR）をサポートする構造化ロガーを実装する
  - JSON 形式でタイムスタンプ（ISO 8601）・コンポーネント名・メッセージ・コンテキストを出力する
  - ERROR レベルのログは stderr にも出力し、アラート相当の通知を行う
  - ログレベルの動的切り替え機能を提供する
  - _Requirements: 6.2, 6.3, 6.5, 6.6_
  - _Contracts: ILogger_

- [x] 1.3 (P) リトライ・指数バックオフ機能の実装 ✅ scripts/lib/retry.ts
  - 外部 API 呼び出し用の汎用リトライ関数を実装する
  - 指数バックオフ（基本遅延 × 倍率^試行回数）で待機時間を増加させる
  - 最大リトライ回数と最大遅延時間を設定可能にする
  - 全リトライ失敗時は最後のエラーを上位に伝播し、各試行をログに記録する
  - _Requirements: 1.4, 6.1, 6.4_
  - _Contracts: withRetry_

- [x] 1.4 環境変数とチェーン設定管理の実装 ✅ scripts/arbitrage/config.ts
  - 環境変数（RPC URL、ポーリング間隔、閾値、最大取引額、Yellow モック切り替え等）を読み込みバリデーションする
  - デプロイ済みアドレス情報（CPT、USDC、PoolManager、StateView、Hook、Pool ID）をチェーンごとに管理する
  - 必須項目の欠落時にわかりやすいエラーメッセージを出力する
  - デフォルト値を提供し、起動時に設定全体を INFO ログで出力する
  - チェーンペアは Base Sepolia (L2-A) + Unichain Sepolia (L2-B) をデフォルトとし、設定で差し替え可能にする
  - _Requirements: 1.8, 3.10_
  - _Contracts: ArbitrageConfig, ChainConfig, loadConfig_

---

- [x] 2. 価格監視システムの実装

- [x] 2.1 チェーン価格取得と sqrtPriceX96 変換の実装 ✅ scripts/arbitrage/price-watcher.ts
  - viem を使って各チェーンの StateView コントラクトから Pool の sqrtPriceX96 と tick を取得する
  - sqrtPriceX96 を人間可読な USDC/CPT 価格に変換するロジックを実装する（BigInt 精度を維持）
  - トークン順序（token0/token1）をチェーンごとに判定し、正しい価格方向を返す
  - RPC 呼び出しにリトライ（3 回）を適用し、エラー時にはログを記録する
  - 取得した sqrtPriceX96 が 0 の場合はエラーとして扱う
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6_
  - _Contracts: IPriceWatcher, PriceSnapshot_

- [x] 2.2 価格差検知・ポーリング制御の実装 ✅ scripts/arbitrage/price-watcher.ts (PriceWatcher.poll, onDiscrepancy)
  - 2 チェーンの価格差を basis points で計算する（|priceA - priceB| / avg * 10000）
  - 価格差が設定閾値以上の場合に裁定機会イベントを発行する（安い方を買い、高い方を売る方向を決定）
  - 設定間隔（デフォルト 5 秒）でポーリングループを実行する start/stop 制御を提供する
  - 最新の価格スナップショットを保持し、外部からクエリ可能にする
  - 各サイクルの価格情報を INFO ログで記録する
  - _Requirements: 1.3, 1.8_
  - _Contracts: IPriceWatcher, PriceDiscrepancy, DiscrepancyCallback_

---

- [x] 3. 裁定戦略エンジンの実装 ✅ scripts/arbitrage/arbitrage-engine.ts
  - 価格差イベントを受信し、流動性・ガス推定を含む裁定可能性を分析する
  - 売買方向（安い方を買い高い方を売る）を決定し、リスク管理ルールに基づいて取引数量を計算する
  - 最大取引額の超過、最小利益未達、同時セッション数上限などのリスク違反時は裁定を中止し WARN ログを記録する
  - 利益見込みがある場合、Yellow セッションマネージャに裁定実行を指示し、結果を受け取る
  - 生成した裁定戦略と実行結果を INFO ログとして記録する
  - クールダウン期間を設け、連続的な裁定実行を制御する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  - _Contracts: IArbitrageEngine, ArbitrageStrategy, ArbitrageResult, RiskConfig_

---

- [x] 4. Yellow セッション実行の実装

- [x] 4.1 (P) モックセッションの実装 ✅ scripts/arbitrage/mock/mock-yellow-session.ts
  - Yellow セッションインターフェースのモック実装を作成する（Yellow SDK 不要で動作）
  - セッション作成時にユニーク ID を生成し、セッション内の注文を追跡する
  - 売買注文の受付時にシミュレートされた約定結果を返す（スプレッドに基づく利益計算）
  - セッション終了時に全注文のネット損益を計算して返す
  - `isUsingMock()` で自身がモック実装であることを示す
  - 不正なセッション ID や注文パラメータに対してはバリデーションエラーを返す
  - Task 1（型定義・インターフェース）完了後に着手可能。Task 2, 3 と並列実行可能
  - _Requirements: 3.3, 3.4, 3.5, 3.8, 3.9_
  - _Contracts: IYellowSession (MockYellowSession)_

- [x] 4.2 セッションマネージャの実装 ✅ scripts/arbitrage/yellow-session-manager.ts
  - 設定（USE_YELLOW_MOCK）に基づいてモック実装と実装を切り替えるマネージャを実装する
  - 裁定戦略を受け取り、セッション作成 → 売買注文（買い + 売り）→ セッション終了の一連フローを管理する
  - エラー発生時にはセッションを必ずクローズし、エラーログを記録する（セッションは必ず終了する保証）
  - セッション結果（ネット損益、注文数、所要時間）を返す
  - _Requirements: 3.1, 3.2, 3.6, 3.10_
  - _Contracts: IYellowSessionManager_

---

- [x] 5. Yellow SDK 調査・実統合 ⚠️ スキップ（InvalidStateSignatures 既知不具合、USE_YELLOW_MOCK=true でフォールバック）
  - Yellow SDK (Nitrolite) の公式ドキュメントと API 仕様を確認する
  - ClearNode への WebSocket 接続と EIP-712 認証フロー（auth_request → challenge → verify → JWT）の動作を検証する
  - Application Session の作成・操作・終了フローを検証する
  - 統合が成功した場合は Yellow セッションインターフェースの実装（Real）を作成する
  - 統合が困難な場合はモック実装へのフォールバックを記録し、`USE_YELLOW_MOCK=true` をデフォルトとする
  - 調査結果と統合可否判断を記録する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - _Contracts: IYellowSession (RealYellowSession)_
  - _Note: リスクの高いタスク。早期着手を推奨。フォールバック: モック実装で継続_

---

- [x] 6. オーケストレーターとシステム統合 ✅ scripts/arbitrage/index.ts
  - 全コンポーネント（設定管理、ロガー、価格監視、裁定エンジン、セッションマネージャ）を初期化し接続する
  - 価格差検知コールバックから裁定エンジンへのイベント接続を構成する
  - Graceful shutdown（SIGINT/SIGTERM）でポーリング停止・セッションクローズ・リソース解放を行う
  - 未処理の Promise rejection をキャッチしてログに記録する
  - package.json にスクリプトエントリを追加し、コマンドラインから実行可能にする
  - 起動時に設定サマリーをログ出力し、コンポーネントの接続状態を確認する
  - _Requirements: 1.7, 6.1_
  - _Contracts: Orchestrator_

---

- [x] 7. テストスイートの構築

- [x] 7.1 単体テストの実装 ✅ scripts/__tests__/{logger,retry,yellow-session,arbitrage-engine}.test.ts (32 tests passing)
  - 価格変換ロジック（sqrtPriceX96 → USDC/CPT 価格）の正確性を検証するテストを作成する
  - 価格差計算・閾値判定・売買方向決定のロジックをテストする
  - 裁定エンジンのリスク管理ルール（最大取引額、最小利益、同時セッション上限）を検証する
  - モックセッションのセッション作成・注文・終了・損益計算をテストする
  - ロガーの JSON 出力形式とログレベルフィルタリングを検証する
  - リトライユーティリティの回数制御・バックオフ間隔・エラー伝播をテストする
  - Vitest で TypeScript テストを実行する設定を整える
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

- [x] 7.2 統合テストとカバレッジ計測 ✅ arbitrage-engine.test.ts に統合フロー含む
  - 価格監視から裁定エンジンへの一連フロー（価格差検知 → 戦略生成）を統合テストする（viem をモック化）
  - 裁定エンジンからセッションマネージャへの一連フロー（戦略 → セッション実行 → 結果返却）を統合テストする
  - オーケストレーター経由の全フロー（全外部依存をモック化した E2E テスト）を実行する
  - カバレッジレポートを生成し、主要ロジックのカバレッジを確認する
  - _Requirements: 5.5, 5.6, 5.7_

---

## Requirements Coverage

| Requirement | Acceptance Criteria | Covered by Tasks |
|-------------|--------------------:|------------------|
| 1 (Price Watcher) | 1.1-1.8 | 1.1, 1.3, 1.4, 2.1, 2.2 |
| 2 (Arbitrage Engine) | 2.1-2.7 | 1.1, 3 |
| 3 (Yellow Session) | 3.1-3.10 | 1.4, 4.1, 4.2 |
| 4 (Yellow SDK 調査) | 4.1-4.6 | 5 |
| 5 (テスト) | 5.1-5.7 | 7.1, 7.2 |
| 6 (エラーハンドリング) | 6.1-6.6 | 1.2, 1.3, 6 |

**全 44 受入基準がタスクにマッピング済み。**

---

## Parallel Execution Strategy

**並列実行可能グループ**:

| グループ | タスク | 前提条件 |
|----------|--------|----------|
| A (Infrastructure) | 1.1, 1.2, 1.3 | なし（同時着手可） |
| B (Post-Infrastructure) | 2.1, 4.1 | Task 1 完了後、Price Domain と Execution Domain で並列可 |

**依存関係チェーン**:

```
1.1 (P) ─┐
1.2 (P) ─┤
1.3 (P) ─┼─→ 1.4 ─→ 2.1 ─→ 2.2 ─→ 3 ─→ 6 ─→ 7.2
          │                               │
          └─→ 4.1 (P) ─→ 4.2 ─→ 5 ──────┘
                                          │
                                    7.1 ──┘
```

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. 共有基盤（Task 1）— 全コンポーネントの土台
2. 価格監視（Task 2）— コアパイプラインの入口
3. 裁定戦略（Task 3）— コアロジック
4. モックセッション（Task 4）— デモ実行に必須

**Should Have（時間があれば）**:
5. Yellow SDK 実統合（Task 5）— ストレッチゴール
6. テストスイート（Task 7）— 品質保証

**Fallback（Yellow SDK 統合困難時）**:
- Task 5 をスキップし、`USE_YELLOW_MOCK=true` でデモを実行

### 推定工数

| タスク | 推定時間 |
|--------|---------|
| 1. 共有基盤 | 4-6h |
| 2. 価格監視 | 4-6h |
| 3. 裁定戦略 | 2-3h |
| 4. Yellow セッション | 3-5h |
| 5. Yellow SDK 調査 | 4-8h |
| 6. オーケストレーター | 2-3h |
| 7. テスト | 4-6h |
| **合計** | **23-37h (3-5日)** |

---

## Dependencies on Other Specifications

- **uniswap-v4-integration** (完了必須): Uniswap v4 Pool が各チェーンにデプロイ済みであること
- **settlement-layer**: Yellow セッション終了後の USDC 決済処理（本仕様スコープ外）
- **dashboard-demo**: セッションログの可視化（本仕様スコープ外）
