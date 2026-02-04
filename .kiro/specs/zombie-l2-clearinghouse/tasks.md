# Implementation Plan

## Task Overview

本実装計画は、Zombie L2 Clearinghouse の14要件を実装可能なタスクに分解したものです。3層アーキテクチャ（オンチェーン・オフチェーン・フロントエンド）に基づき、並列実行可能なタスクを最大化しています。

**総タスク数**: 41タスク（Major: 9, Sub: 32）
**並列実行可能**: 22タスク（マーカー: `(P)`）
**推定期間**: 2-3週間（ハッカソンスコープ）

---

## Tasks

### 1. プロジェクトセットアップ・環境構築

- [ ] 1.1 (P) プロジェクト初期化とディレクトリ構造作成
  - `/contracts/`, `/offchain/`, `/frontend/`, `/scripts/` ディレクトリを作成
  - TypeScript 設定（tsconfig.json、strict mode）
  - ESLint + Prettier 設定
  - _Requirements: 10.1_

- [ ] 1.2 (P) Foundry プロジェクト初期化
  - `forge init` でコントラクト開発環境を構築
  - `foundry.toml` でコンパイラバージョン設定（Solidity 0.8.x）
  - OpenZeppelin ライブラリインストール
  - _Requirements: 10.1, 10.6_

- [ ] 1.3 (P) オフチェーン依存関係インストール
  - Node.js 20+ 確認
  - viem, wagmi, Yellow SDK (Nitrolite), Circle SDK インストール
  - package.json でスクリプト定義（dev, build, test）
  - _Requirements: 10.1_

- [ ] 1.4 (P) フロントエンド依存関係インストール
  - Next.js 14+, TailwindCSS, Shadcn/ui インストール
  - Recharts or Chart.js インストール
  - Next.js App Router 設定
  - _Requirements: 10.1, 9.8_

---

### 2. オンチェーンコントラクト実装（並列可能）

- [ ] 2.1 (P) CPT Token Contract 実装
  - ERC20標準実装（OpenZeppelin継承）
  - mint 関数実装（onlyOwner modifier）
  - Transfer イベント発行
  - 単体テスト（mint, transfer, balanceOf）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 12.1_

- [ ] 2.2 (P) Mock Oracle 実装
  - getUtilization 関数実装（固定値または可変シミュレーション）
  - 稼働率シグナル供給機能
  - デモ用の稼働率変更機能
  - 単体テスト
  - _Requirements: 3.2, 14.1, 14.5_

- [ ] 2.3 Utilization Hook 実装（2.2に依存）
  - Uniswap v4 BaseHook 継承
  - beforeSwap 実装（稼働率に応じた動的手数料調整）
  - Mock Oracle から稼働率取得
  - 異常データ時のデフォルト手数料適用
  - Hook実行ログ記録
  - 単体テスト（動的手数料ロジック）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.2_

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

### 3. Uniswap v4 Pool 設定・初期化

- [ ] 3.1 Uniswap v4 Pool 初期化スクリプト作成（2.1, 2.3に依存）
  - CPT/USDC ペアのプール作成
  - Utilization Hook をプールに登録
  - 初期流動性提供（テスト用）
  - プール初期化の検証
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.4_

---

### 4. オフチェーン実装（一部並列可能）

- [ ] 4.1 (P) Price Watcher 実装
  - viem publicClient で Uniswap v4 Pool の価格取得
  - 5秒間隔のポーリングロジック
  - 価格差計算・閾値判定
  - DiscrepancyDetected イベント発行
  - エラー時のリトライロジック（3回）
  - 単体テスト（価格取得、乖離検知）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 11.4, 12.4_

- [ ] 4.2 (P) Arbitrage Engine 実装
  - 価格差分析ロジック（流動性・ガス推定）
  - 裁定戦略生成（売買方向・数量決定）
  - リスク管理ルール（最大取引額等）
  - 戦略ログ記録
  - 単体テスト（戦略生成）
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 11.2, 12.5_

- [ ] 4.3 Yellow Session Manager 実装（4.2に依存）
  - Yellow SDK (Nitrolite) 初期化
  - createSession, placeOrder, closeSession 実装
  - 反復的な売買指示送信ロジック
  - 最終ネット結果取得
  - セッション実行中のエラーハンドリング
  - 単体テスト（セッション管理）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 11.6_

- [ ] 4.4 Settlement Orchestrator 実装（4.3に依存）
  - Arc + Circle SDK 初期化
  - settleProfit 実装（USDC 決済処理）
  - Circle Gateway/CCTP を使用したクロスチェーン転送
  - Operator Vault への入金確認
  - 決済失敗時のリトライロジック（3回）
  - 単体テスト（決済処理）
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.4_

- [ ] 4.5 オフチェーン統合テスト（4.1, 4.2, 4.3, 4.4に依存）
  - Price Watcher → Arbitrage Engine の統合動作確認
  - Arbitrage Engine → Yellow Session Manager の統合動作確認
  - Yellow Session Manager → Settlement Orchestrator の統合動作確認
  - Settlement Orchestrator → Operator Vault の統合動作確認
  - _Requirements: 12.6_

---

### 5. フロントエンド実装（並列可能）

- [ ] 5.1 (P) Dashboard UI ベース構築
  - Next.js App Router でルーティング設定（/dashboard）
  - TailwindCSS + Shadcn/ui でレイアウト構築
  - wagmi/viem 初期化（ウォレット接続準備）
  - ヘッダー・サイドバー・メインコンテンツエリア作成
  - _Requirements: 9.8_

- [ ] 5.2 (P) 価格差表示コンポーネント実装
  - Base Sepolia と WorldCoin Sepolia の CPT/USDC 価格表示
  - 価格差計算・表示
  - 5秒間隔の自動リフレッシュ
  - Recharts/Chart.js で価格推移チャート表示
  - _Requirements: 9.1, 9.2, 9.3, 9.7, 9.9_

- [ ] 5.3 (P) Hook 状態表示コンポーネント実装
  - Utilization Hook の現在の手数料設定表示
  - Mock Oracle の稼働率表示
  - Hook 実行ログ表示
  - _Requirements: 9.4_

- [ ] 5.4 (P) Yellow セッションログ表示コンポーネント実装
  - セッションID、売買ログ、最終利益表示
  - セッション状態（ACTIVE / CLOSED / FAILED）表示
  - _Requirements: 9.5_

- [ ] 5.5 (P) Operator Vault 残高表示コンポーネント実装
  - USDC 残高表示
  - Deposit イベントリスニング・リアルタイム更新
  - _Requirements: 9.6, 9.7_

- [ ] 5.6 Dashboard 統合（5.1, 5.2, 5.3, 5.4, 5.5に依存）
  - 各コンポーネントを Dashboard に統合
  - レスポンシブレイアウト調整
  - エラー表示・ローディング状態実装
  - _Requirements: 9.10_

- [ ] 5.7* Dashboard E2Eテスト
  - Playwright または同等ツールで E2E テスト
  - 価格差・Hook状態・ログ・残高の表示確認
  - 自動リフレッシュ動作確認
  - _Requirements: 12.7_

---

### 6. デプロイスクリプト実装

- [ ] 6.1 コントラクトデプロイスクリプト作成（2.1, 2.2, 2.3, 2.4に依存）
  - Foundry スクリプトで CPT Token, Hook, Vault をデプロイ
  - Base Sepolia, WorldCoin Sepolia, Arc への自動デプロイ
  - デプロイ後のコントラクトアドレス記録（JSON設定ファイル）
  - デプロイ失敗時のエラー処理
  - _Requirements: 10.1, 10.2, 10.3, 10.5, 10.7_

- [ ] 6.2 環境設定ファイル管理
  - .env.example 作成（RPC URLs, Private Keys のテンプレート）
  - 環境変数読み込みロジック
  - .gitignore で .env 除外
  - _Requirements: 13.4, 13.5_

---

### 7. エラーハンドリング・ログ記録（横断的）

- [ ] 7.1 (P) 構造化ログ実装
  - JSON形式のログ出力（timestamp, level, message, context）
  - ログレベル設定（ERROR, WARN, INFO, DEBUG）
  - すべてのコンポーネントでログ記録
  - _Requirements: 11.1, 11.2, 11.3, 11.6_

- [ ] 7.2 (P) エラーハンドリング統一
  - try/catch でエラーキャッチ
  - エラー内容・タイムスタンプ・コンテキストをログ記録
  - リトライロジック（外部API呼び出し）
  - 致命的エラー時のアラート発行
  - _Requirements: 11.1, 11.4, 11.5_

---

### 8. セキュリティ実装（横断的）

- [ ] 8.1 コントラクト権限管理実装（2.1, 2.3, 2.4に依存）
  - CPT Token の mint 権限を owner のみに制限
  - Operator Vault の withdraw 権限を owner のみに制限
  - Utilization Hook の実行権限を Uniswap v4 Pool のみに制限
  - 権限なしアドレスからの操作を拒否
  - _Requirements: 13.1, 13.2, 13.3, 13.6_

- [ ] 8.2 (P) 環境変数セキュリティ確認
  - 秘密鍵・APIキーがハードコードされていないことを確認
  - .env ファイルが .gitignore に含まれることを確認
  - _Requirements: 13.4, 13.5_

- [ ] 8.3 (P) Reentrancy ガード適用確認
  - Operator Vault に ReentrancyGuard が適用されていることを確認
  - 外部呼び出しの前後で状態変更順序を確認
  - _Requirements: 13.7_

---

### 9. ハッカソンデモスクリプト実装

- [ ] 9.1 デモスクリプト実装（すべての実装タスクに依存）
  - L2稼働率シミュレーション（Mock Oracle 経由）
  - 価格差の人為的発生（Uniswap v4 Pool 操作）
  - 裁定取引の一連のフロー自動実行
  - デモシナリオの各ステップログ出力
  - 実行結果サマリー表示（価格差・収益・Vault残高）
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 9.2 デモシナリオテスト
  - デモスクリプトの動作確認
  - Dashboard でリアルタイム状態変化確認
  - 各ステップの成功・失敗確認
  - _Requirements: 14.4_

---

## Requirements Coverage

### オンチェーン要件

- **Requirement 1 (CPT Token)**: 2.1
- **Requirement 2 (Uniswap v4 Pool)**: 3.1
- **Requirement 3 (Utilization Hook)**: 2.2, 2.3
- **Requirement 8 (Operator Vault)**: 2.4

### オフチェーン要件

- **Requirement 4 (Price Watcher)**: 4.1
- **Requirement 5 (Arbitrage Engine)**: 4.2
- **Requirement 6 (Yellow Session)**: 4.3
- **Requirement 7 (Arc Settlement)**: 4.4

### フロントエンド要件

- **Requirement 9 (Dashboard)**: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7

### インフラ・横断要件

- **Requirement 10 (デプロイ)**: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2
- **Requirement 11 (エラーハンドリング)**: 7.1, 7.2
- **Requirement 12 (テスト)**: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.7
- **Requirement 13 (セキュリティ)**: 8.1, 8.2, 8.3
- **Requirement 14 (ハッカソンデモ)**: 9.1, 9.2

---

## Parallel Execution Strategy

### 並列実行可能グループ

**Phase 1: セットアップ（すべて並列可能）**
- 1.1, 1.2, 1.3, 1.4

**Phase 2: オンチェーンコントラクト（並列可能）**
- 2.1, 2.2, 2.4（2.3は2.2に依存）

**Phase 3: オフチェーン実装（一部並列可能）**
- 4.1, 4.2（並列可能）
- 4.3（4.2に依存）
- 4.4（4.3に依存）

**Phase 4: フロントエンド実装（並列可能）**
- 5.1, 5.2, 5.3, 5.4, 5.5（すべて並列可能）

**Phase 5: 横断的タスク（並列可能）**
- 7.1, 7.2, 8.2, 8.3（並列可能）

**Phase 6: 統合・デモ（シーケンシャル）**
- 2.5, 4.5, 5.6, 6.1, 8.1, 9.1, 9.2（依存関係あり）

---

## Implementation Notes

### 優先順位（ハッカソンスコープ）

**Must Have（最優先）**:
1. Phase 1-2: セットアップ・オンチェーン実装
2. Phase 3: オフチェーン実装（特に 4.1-4.4）
3. Phase 4: Dashboard 実装（5.1-5.6）
4. Phase 6: デモスクリプト（9.1-9.2）

**Should Have（時間があれば）**:
- 4.5: オフチェーン統合テスト
- 5.7: Dashboard E2Eテスト

**Nice to Have（余裕があれば）**:
- 履歴データの保存・チャート表示拡張
- リスク管理ロジックの高度化

### 推定工数

- **Phase 1**: 0.5日（並列実行で短縮可能）
- **Phase 2**: 3-4日（並列実行で短縮可能）
- **Phase 3**: 4-5日（一部並列実行可能）
- **Phase 4**: 3-4日（並列実行で短縮可能）
- **Phase 5**: 1-2日（並列実行で短縮可能）
- **Phase 6**: 2-3日（シーケンシャル）

**合計**: 13-18日（ハッカソン期間内に完了可能）

---

## Deferred Items

以下は将来的な拡張として位置づけ、ハッカソンでは実装しない：

- 実際のL2稼働率 Oracle 統合
- 複数CPTペアの同時監視
- 高度なリスク管理ロジック（最大ポジション制限等）
- 履歴データの永続化・長期チャート表示
- マルチチェーン対応の完全な自動化
- プロダクション環境向けのセキュリティ監査
