# Implementation Plan

## Task Overview

本実装計画は、Zombie L2 Clearinghouse の14要件を実装可能なタスクに分解したものです。**Gap Analysis の結果に基づき、段階的実装戦略（Phase 1/2/3）を採用**しています。

**総タスク数**: 44タスク（Major: 10, Sub: 34）
**並列実行可能**: 24タスク（マーカー: `(P)`）
**推定期間**: 9-11日（ハッカソンスコープ）

### Phase 構造（設計に準拠）

| Phase | 目的 | 期間 | 主要タスク |
|-------|------|------|----------|
| **Phase 1** | MVP（技術検証） | 2-3日 | セットアップ、オンチェーン、Pool初期化、簡易Dashboard |
| **Phase 2** | 外部統合 | 4-5日 | Price Watcher、Arbitrage Engine、Yellow Session、Settlement |
| **Phase 3** | Dashboard完成+デモ | 2-3日 | Dashboardコンポーネント、デモスクリプト |

---

## Phase 1: MVP（技術検証）- 2-3日

> **目的**: 技術スタックの動作検証、Uniswap v4 統合確認

### 1. プロジェクトセットアップ・環境構築

- [ ] 1.1 (P) 既存プロジェクト構造の確認と設定
  - **既存ディレクトリ活用**: `contract/`, `frontend/`, `scripts/` をそのまま使用
  - `offchain/` ディレクトリを新規作成（オフチェーンロジック用）
  - TypeScript 設定確認（tsconfig.json、strict mode）
  - ESLint + Prettier 設定
  - _Requirements: 10.1_
  - _Note: Gap Analysis に基づき既存資産を活用_

- [ ] 1.2 (P) Foundry プロジェクト拡張
  - **既存 `contract/` ディレクトリを活用**
  - `foundry.toml` でコンパイラバージョン設定（Solidity 0.8.x）
  - OpenZeppelin ライブラリインストール
  - **Uniswap v4 依存関係追加**（v4-core, v4-periphery）
  - _Requirements: 10.1, 10.6_

- [ ] 1.3 (P) オフチェーン依存関係インストール
  - Node.js 20+ 確認
  - viem, wagmi インストール
  - **既存 Arc スクリプト活用のため Circle SDK は不要**（curl ベース実装あり）
  - package.json でスクリプト定義（dev, build, test）
  - _Requirements: 10.1_
  - _Reference: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`_

- [ ] 1.4 (P) フロントエンド依存関係インストール
  - **既存 `frontend/` ディレクトリを活用**
  - Next.js 14+, TailwindCSS, Shadcn/ui インストール
  - Recharts or Chart.js インストール
  - Next.js App Router 設定
  - _Requirements: 10.1, 9.8_

---

### 2. オンチェーンコントラクト実装（Phase 1）

- [ ] 2.1 (P) CPT Token Contract 実装
  - ERC20標準実装（OpenZeppelin継承）
  - mint 関数実装（onlyOwner modifier）
  - Transfer イベント発行
  - 単体テスト（mint, transfer, balanceOf）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 12.1_

- [ ] 2.2 (P) Mock Oracle 実装
  - getUtilization 関数実装（固定値または可変シミュレーション）
  - 稼働率シグナル供給機能
  - デモ用の稼働率変更機能（setUtilization）
  - 単体テスト
  - _Requirements: 3.2, 14.1, 14.5_

- [ ] 2.3 Utilization Hook 実装（2.2に依存）
  - Uniswap v4 BaseHook 継承
  - beforeSwap 実装（稼働率に応じた動的手数料調整）
  - Mock Oracle から稼働率取得
  - 異常データ時のデフォルト手数料適用（0.3%）
  - Hook実行ログ記録
  - **CREATE2 + HookMiner パターンでのデプロイ準備**
    - Hook フラグ定義（BEFORE_SWAP_FLAG）
    - アドレスビットパターン制約対応
  - 単体テスト（動的手数料ロジック）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.2_
  - _Note: Gap Analysis に基づき CREATE2 + HookMiner パターン採用_

- [ ] 2.4 (P) Operator Vault 実装
  - depositUSDC, withdraw, balanceOf 実装
  - onlyOwner modifier で引き出し権限制御
  - Deposit, Withdraw イベント発行
  - ReentrancyGuard 適用
  - 単体テスト（入出金、権限制御）
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 12.3, 13.2, 13.7_

- [ ] 2.5 コントラクト統合テスト
  - CPT Token + Operator Vault の統合動作確認
  - Utilization Hook + Mock Oracle の統合動作確認
  - Uniswap v4 Pool との統合テスト（ローカル環境）
  - _Requirements: 12.6_

---

### 3. Uniswap v4 Pool 設定・初期化（Phase 1）

- [ ] 3.1 Uniswap v4 Pool 初期化スクリプト作成（2.1, 2.3に依存）
  - CPT/USDC ペアのプール作成
  - **HookMiner で適切な Hook アドレスを生成**
  - **CREATE2 で Utilization Hook をデプロイ**
  - Utilization Hook をプールに登録
  - 初期流動性提供（テスト用）
  - プール初期化の検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.4_
  - _Note: Gap Analysis に基づき CREATE2 + HookMiner パターン採用_

### 3.5 簡易 Dashboard（Phase 1 MVP用）

- [ ] 3.5.1 (P) 簡易 Dashboard 実装
  - 静的データ表示（CPT価格、Hook状態）
  - 基本レイアウト構築
  - ウォレット接続なしで動作確認可能
  - _Requirements: 9.1, 9.2_
  - _Note: Phase 1 MVP 用の最小限実装_

---

## Phase 2: 外部統合 - 4-5日

> **目的**: Yellow SDK / Arc + Circle 統合、完全な裁定フロー実装

### 4. 外部統合調査（Phase 2 開始時）

- [ ] 4.0 (P) Yellow SDK (Nitrolite) 調査
  - 公式ドキュメント確認
  - サンプルコード動作検証
  - API仕様・認証方法の確認
  - Testnet セットアップ
  - **統合可否判断 → モック実装への切り替え判断**
  - _Note: Gap Analysis により High Risk として識別。早期調査必須_
  - _Fallback: `USE_YELLOW_MOCK=true` でモック実装に切り替え_

---

### 5. オフチェーン実装（Phase 2）

- [ ] 5.1 (P) Price Watcher 実装
  - viem publicClient で Uniswap v4 Pool の価格取得
  - 5秒間隔のポーリングロジック
  - 価格差計算・閾値判定
  - DiscrepancyDetected イベント発行
  - エラー時のリトライロジック（3回）
  - 単体テスト（価格取得、乖離検知）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 11.4, 12.4_

- [ ] 5.2 (P) Arbitrage Engine 実装
  - 価格差分析ロジック（流動性・ガス推定）
  - 裁定戦略生成（売買方向・数量決定）
  - リスク管理ルール（最大取引額等）
  - 戦略ログ記録
  - 単体テスト（戦略生成）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 11.2, 12.5_

- [ ] 5.3 Yellow Session Manager 実装（4.0, 5.2に依存）
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
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 11.6_
  - _Note: Gap Analysis に基づきモックフォールバック戦略を追加_
  - _Env: `USE_YELLOW_MOCK=true` でモック実装に切り替え_

- [ ] 5.4 Settlement Orchestrator 実装（5.3に依存）
  - **Circle Programmable Wallets API (W3S) を使用**
  - **既存スクリプト活用**: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`
  - `ArcTransferService`, `VaultSettlementService` パターンを参考に実装
  - settleProfit 実装（USDC 決済処理）
  - Operator Vault への入金確認
  - 決済失敗時のリトライロジック（3回）
  - 単体テスト（決済処理）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.4_
  - _Note: Gap Analysis に基づき CCTP → W3S API に変更、既存実装活用_
  - _Reference: `scripts/arc-transfer.ts`, `scripts/settle-to-vault.ts`_

- [ ] 5.5 オフチェーン統合テスト（5.1, 5.2, 5.3, 5.4に依存）
  - Price Watcher → Arbitrage Engine の統合動作確認
  - Arbitrage Engine → Yellow Session Manager の統合動作確認
  - Yellow Session Manager → Settlement Orchestrator の統合動作確認
  - Settlement Orchestrator → Operator Vault の統合動作確認
  - **モック実装での統合テスト**（Yellow SDK 未統合の場合）
  - _Requirements: 12.6_

---

## Phase 3: Dashboard 完成 + デモ - 2-3日

> **目的**: ハッカソンデモ用の完成度向上

### 6. フロントエンド実装（Phase 3）

- [ ] 6.1 (P) Dashboard UI 完成版構築
  - Next.js App Router でルーティング設定（/dashboard）
  - TailwindCSS + Shadcn/ui でレイアウト構築
  - wagmi/viem 初期化（ウォレット接続準備）
  - ヘッダー・サイドバー・メインコンテンツエリア作成
  - _Requirements: 9.8_
  - _Note: Phase 1 の簡易 Dashboard を拡張_

- [ ] 6.2 (P) 価格差表示コンポーネント実装
  - Base Sepolia と WorldCoin Sepolia の CPT/USDC 価格表示
  - 価格差計算・表示
  - 5秒間隔の自動リフレッシュ
  - Recharts/Chart.js で価格推移チャート表示
  - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.9_

- [ ] 6.3 (P) Hook 状態表示コンポーネント実装
  - Utilization Hook の現在の手数料設定表示
  - Mock Oracle の稼働率表示
  - Hook 実行ログ表示
  - _Requirements: 9.4_

- [ ] 6.4 (P) Yellow セッションログ表示コンポーネント実装
  - セッションID、売買ログ、最終利益表示
  - セッション状態（ACTIVE / CLOSED / FAILED）表示
  - **モックモード表示**（`USE_YELLOW_MOCK=true` 時）
  - _Requirements: 9.5_

- [ ] 6.5 (P) Operator Vault 残高表示コンポーネント実装
  - USDC 残高表示
  - Deposit イベントリスニング・リアルタイム更新
  - _Requirements: 9.6, 9.7_

- [ ] 6.6 Dashboard 統合（6.1, 6.2, 6.3, 6.4, 6.5に依存）
  - 各コンポーネントを Dashboard に統合
  - レスポンシブレイアウト調整
  - エラー表示・ローディング状態実装
  - _Requirements: 9.10_

- [ ] 6.7* Dashboard E2Eテスト
  - Playwright または同等ツールで E2E テスト
  - 価格差・Hook状態・ログ・残高の表示確認
  - 自動リフレッシュ動作確認
  - _Requirements: 12.7_

---

## 横断的タスク（全Phase共通）

### 7. デプロイスクリプト実装

- [ ] 7.1 コントラクトデプロイスクリプト作成（2.1, 2.2, 2.3, 2.4に依存）
  - Foundry スクリプトで CPT Token, Hook, Vault をデプロイ
  - **CREATE2 + HookMiner で Utilization Hook をデプロイ**
  - Base Sepolia, WorldCoin Sepolia, Arc への自動デプロイ
  - デプロイ後のコントラクトアドレス記録（JSON設定ファイル）
  - デプロイ失敗時のエラー処理
  - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.7_
  - _Note: Gap Analysis に基づき CREATE2 + HookMiner パターン採用_

- [ ] 7.2 環境設定ファイル管理
  - .env.example 作成（以下の環境変数テンプレート）
  - 環境変数読み込みロジック
  - .gitignore で .env 除外
  - _Requirements: 13.4, 13.5_

**必要な環境変数（Gap Analysis + 既存実装より）:**

```bash
# RPC URLs
BASE_SEPOLIA_RPC_URL=
WORLDCOIN_SEPOLIA_RPC_URL=
ARC_RPC_URL=

# Private Keys
DEPLOYER_PRIVATE_KEY=

# Arc / Circle W3S API（既存実装から）
ARC_API_KEY=
ARC_WALLET_ID_SOURCE=
ARC_WALLET_ID_TARGET=
ARC_WALLET_ID_OPERATOR_VAULT=
ENTITY_SECRET_HEX=

# Yellow SDK（モックモード切り替え）
USE_YELLOW_MOCK=false  # true でモック実装を使用
```

---

### 8. エラーハンドリング・ログ記録（横断的）

- [ ] 8.1 (P) 構造化ログ実装
  - JSON形式のログ出力（timestamp, level, message, context）
  - ログレベル設定（ERROR, WARN, INFO, DEBUG）
  - すべてのコンポーネントでログ記録
  - _Requirements: 11.1, 11.2, 11.3, 11.6_

- [ ] 8.2 (P) エラーハンドリング統一
  - try/catch でエラーキャッチ
  - エラー内容・タイムスタンプ・コンテキストをログ記録
  - リトライロジック（外部API呼び出し）
  - 致命的エラー時のアラート発行
  - _Requirements: 11.1, 11.4, 11.5_

---

### 9. セキュリティ実装（横断的）

- [ ] 9.1 コントラクト権限管理実装（2.1, 2.3, 2.4に依存）
  - CPT Token の mint 権限を owner のみに制限
  - Operator Vault の withdraw 権限を owner のみに制限
  - Utilization Hook の実行権限を Uniswap v4 Pool のみに制限
  - 権限なしアドレスからの操作を拒否
  - _Requirements: 13.1, 13.2, 13.3, 13.6_

- [ ] 9.2 (P) 環境変数セキュリティ確認
  - 秘密鍵・APIキーがハードコードされていないことを確認
  - .env ファイルが .gitignore に含まれることを確認
  - _Requirements: 13.4, 13.5_

- [ ] 9.3 (P) Reentrancy ガード適用確認
  - Operator Vault に ReentrancyGuard が適用されていることを確認
  - 外部呼び出しの前後で状態変更順序を確認
  - _Requirements: 13.7_

---

### 10. ハッカソンデモスクリプト実装（Phase 3）

- [ ] 10.1 デモスクリプト実装（すべての実装タスクに依存）
  - L2稼働率シミュレーション（Mock Oracle 経由）
  - 価格差の人為的発生（Uniswap v4 Pool 操作）
  - 裁定取引の一連のフロー自動実行
  - **Yellow SDK モック / 実SDK の切り替え対応**
  - デモシナリオの各ステップログ出力
  - 実行結果サマリー表示（価格差・収益・Vault残高）
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 10.2 デモシナリオテスト
  - デモスクリプトの動作確認
  - Dashboard でリアルタイム状態変化確認
  - 各ステップの成功・失敗確認
  - **モック実装でのデモ確認**（Yellow SDK 未統合の場合）
  - _Requirements: 14.4_

---

## Requirements Coverage

### オンチェーン要件（Phase 1）

- **Requirement 1 (CPT Token)**: 2.1
- **Requirement 2 (Uniswap v4 Pool)**: 3.1
- **Requirement 3 (Utilization Hook)**: 2.2, 2.3
- **Requirement 8 (Operator Vault)**: 2.4

### オフチェーン要件（Phase 2）

- **Requirement 4 (Price Watcher)**: 5.1
- **Requirement 5 (Arbitrage Engine)**: 5.2
- **Requirement 6 (Yellow Session)**: 4.0, 5.3
- **Requirement 7 (Arc Settlement)**: 5.4

### フロントエンド要件（Phase 1 + Phase 3）

- **Requirement 9 (Dashboard)**: 3.5.1 (MVP), 6.1-6.7 (完成版)

### インフラ・横断要件

- **Requirement 10 (デプロイ)**: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2
- **Requirement 11 (エラーハンドリング)**: 8.1, 8.2
- **Requirement 12 (テスト)**: 2.1-2.5, 5.1-5.5, 6.7
- **Requirement 13 (セキュリティ)**: 9.1, 9.2, 9.3
- **Requirement 14 (ハッカソンデモ)**: 10.1, 10.2

---

## Parallel Execution Strategy

### 並列実行可能グループ（設計の Phase 構造に準拠）

**Phase 1: MVP（すべて並列可能な部分あり）**
- セットアップ: 1.1, 1.2, 1.3, 1.4（並列可能）
- オンチェーン: 2.1, 2.2, 2.4（並列可能）、2.3（2.2に依存）
- Pool初期化: 3.1（2.1, 2.3に依存）
- 簡易Dashboard: 3.5.1（並列可能）

**Phase 2: 外部統合**
- Yellow SDK 調査: 4.0（Phase 2 開始と同時）
- オフチェーン: 5.1, 5.2（並列可能）
- Yellow Session: 5.3（4.0, 5.2に依存）
- Settlement: 5.4（5.3に依存）
- 統合テスト: 5.5（5.1-5.4に依存）

**Phase 3: Dashboard + デモ**
- Dashboard: 6.1-6.5（並列可能）
- 統合: 6.6（6.1-6.5に依存）
- デモ: 10.1, 10.2（全タスクに依存）

**横断的タスク（全Phase通じて）**
- ログ・エラー: 8.1, 8.2（並列可能）
- セキュリティ: 9.1, 9.2, 9.3（並列可能）

---

## Implementation Notes

### 優先順位（Gap Analysis に基づく）

**Must Have（最優先）**:
1. **Phase 1**: セットアップ・オンチェーン・Pool初期化・簡易Dashboard
2. **Phase 2**: オフチェーン実装（5.1-5.4）+ Yellow SDK 調査（4.0）
3. **Phase 3**: Dashboard 完成・デモスクリプト

**Should Have（時間があれば）**:
- 5.5: オフチェーン統合テスト
- 6.7: Dashboard E2Eテスト

**Fallback（Yellow SDK 統合失敗時）**:
- 5.3 をモック実装で完了
- `USE_YELLOW_MOCK=true` でデモ実行

### 推定工数（設計の Phase 構造に準拠）

| Phase | 期間 | 主要タスク |
|-------|------|----------|
| **Phase 1** | 2-3日 | セットアップ、オンチェーン、Pool、簡易Dashboard |
| **Phase 2** | 4-5日 | Yellow SDK調査、オフチェーン、Settlement |
| **Phase 3** | 2-3日 | Dashboard完成、デモスクリプト |
| **合計** | **9-11日** | ハッカソン期間内に完了可能 |

### リスク軽減戦略

| リスク | 軽減策 | タスク |
|-------|--------|-------|
| Yellow SDK 統合失敗 | モック実装にフォールバック | 4.0, 5.3 |
| Hook デプロイ失敗 | CREATE2 + HookMiner | 2.3, 3.1, 7.1 |
| Phase 遅延 | Phase 2 完了でハッカソン提出可能 | - |

---

## Gap Analysis 対応サマリー

### 主要な変更点

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| Phase 構造 | 6 Phase | **3 Phase**（設計に準拠） |
| タスク 1.1, 1.3 | 新規作成 | **既存資産活用** |
| タスク 2.3 | Hook 実装のみ | **CREATE2 + HookMiner** 追加 |
| タスク 5.3 (旧4.3) | Yellow SDK のみ | **モックフォールバック** 追加 |
| タスク 5.4 (旧4.4) | Circle CCTP | **Circle W3S API + 既存スクリプト** |
| 新規タスク | - | **4.0 Yellow SDK 調査** 追加 |
| 環境変数 | RPC + Keys | **Arc API + Yellow Mock** 追加 |

### 既存資産の活用

| ファイル | 活用方法 |
|---------|---------|
| `contract/` | Foundry プロジェクトとして拡張 |
| `frontend/` | Next.js プロジェクトとして拡張 |
| `scripts/arc-transfer.ts` | Settlement Orchestrator の参照実装 |
| `scripts/settle-to-vault.ts` | Vault 決済の参照実装 |

---

## Deferred Items

以下は将来的な拡張として位置づけ、ハッカソンでは実装しない：

- 実際のL2稼働率 Oracle 統合
- 複数CPTペアの同時監視
- 高度なリスク管理ロジック（最大ポジション制限等）
- 履歴データの永続化・長期チャート表示
- マルチチェーン対応の完全な自動化
- プロダクション環境向けのセキュリティ監査
- Yellow SDK の本番統合（調査結果によりモック実装で代替可能）
