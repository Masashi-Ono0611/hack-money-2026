# Requirements Document: Core Token System

## Introduction

Core Token System は、Zombie L2 Clearinghouse の基盤となるトークンシステムです。計算リソースをERC20トークン（CPT）として発行・管理し、裁定収益を受け取るOperator Vaultを提供します。

**対象チェーン**: Base Sepolia (L2-A), WorldCoin Sepolia (L2-B), Arc (Vault)

---

## Requirements

### Requirement 1: CPT (Compute Token) 発行・管理

**Objective:** As a L2運営者, I want 計算リソースをERC20トークンとして発行・管理する機能, so that 計算コストを取引可能な資産に変換できる

#### Acceptance Criteria

1. When L2運営者がCPT発行を要求する, the CPT Token Contract shall 指定された数量のCPTを発行し、運営者アドレスに転送する
2. The CPT Token Contract shall ERC20標準インターフェースを完全に実装する
3. When CPTが転送される, the CPT Token Contract shall Transfer イベントを発行する
4. The CPT Token Contract shall 発行権限を運営者アドレスのみに制限する
5. When 運営者がCPTをVaultに預ける, the Operator Vault shall CPT残高を記録し、Deposit イベントを発行する
6. The CPT Token Contract shall Solidity 0.8.x 以上で実装される
7. The CPT Token Contract shall 各L2チェーン（Base Sepolia, WorldCoin Sepolia）にそれぞれ独立してデプロイされる

---

### Requirement 2: Mock Oracle（稼働率シグナル供給）

**Objective:** As a システム, I want L2稼働率をモック実装で供給する機能, so that Utilization Hook が動的手数料制御を実行できる

#### Acceptance Criteria

1. The Mock Oracle shall getUtilization 関数を実装する
2. When getUtilization が呼び出される, the Mock Oracle shall 稼働率（0-100%）を返す
3. The Mock Oracle shall デモ用の稼働率変更機能（setUtilization）を実装する
4. The Mock Oracle shall 異常な稼働率データ（< 0 または > 100）を拒否する
5. The Mock Oracle shall Solidity 0.8.x 以上で実装される
6. The Mock Oracle shall Base Sepolia と WorldCoin Sepolia にそれぞれデプロイされる

---

### Requirement 3: Operator Vault（運営収益管理）

**Objective:** As a L2運営者, I want 裁定収益を受け取り、管理する機能, so that 固定費の補填に使用できる

#### Acceptance Criteria

1. The Operator Vault shall USDC残高を保持する
2. When USDCがVaultに入金される, the Operator Vault shall Deposit イベントを発行する
3. When 運営者が引き出しを要求する, the Operator Vault shall 運営者アドレスにUSDCを転送する
4. The Operator Vault shall 引き出し権限を運営者アドレスのみに制限する
5. The Operator Vault shall 残高照会機能を提供する
6. If 残高不足で引き出しが要求される, then the Operator Vault shall トランザクションを拒否する
7. The Operator Vault shall Arc チェーンにデプロイされる

---

### Requirement 4: デプロイ・初期化

**Objective:** As a 開発者, I want コアトークンシステムを適切にデプロイ・初期化する機能, so that 他のコンポーネントが依存できる基盤を構築できる

#### Acceptance Criteria

1. The Deployment Script shall CPT Token Contract を Base Sepolia, WorldCoin Sepolia にデプロイする
2. The Deployment Script shall Mock Oracle を Base Sepolia, WorldCoin Sepolia にデプロイする
3. The Deployment Script shall Operator Vault を Arc にデプロイする
4. When デプロイが完了する, the Deployment Script shall コントラクトアドレスを設定ファイルに記録する
5. The Deployment Script shall Foundry を使用する
6. If デプロイに失敗する, then the Deployment Script shall エラー内容を出力し、処理を中断する

---

### Requirement 5: エラーハンドリング・ログ記録

**Objective:** As a 開発者/運営者, I want コアトークンシステムのエラーハンドリングとログ記録機能, so that 問題発生時に迅速にデバッグ・対応できる

#### Acceptance Criteria

1. The System shall すべての重要な処理にエラーハンドリングを実装する
2. When エラーが発生する, the System shall エラー内容・タイムスタンプ・コンテキストをログに記録する
3. The Smart Contracts shall revert with custom error メッセージを実装する
4. The System shall イベントログを適切に発行する（Mint, Transfer, Deposit, Withdraw）

---

### Requirement 6: テスト・品質保証

**Objective:** As a 開発者, I want コアトークンシステムの包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall CPT Token Contract の単体テストを含む（mint, transfer, balanceOf）
2. The Test Suite shall Mock Oracle の単体テストを含む（getUtilization, setUtilization）
3. The Test Suite shall Operator Vault の単体テストを含む（depositUSDC, withdraw, balanceOf）
4. The Test Suite shall 統合テスト（CPT Token + Operator Vault）を含む
5. The Test Suite shall Foundry test でコントラクトテストを実行する
6. When テストが実行される, the Test Suite shall カバレッジレポートを生成する

---

### Requirement 7: セキュリティ・権限管理

**Objective:** As a 開発者, I want セキュアな権限管理とアクセス制御機能, so that 不正なアクセスや操作を防止できる

#### Acceptance Criteria

1. The CPT Token Contract shall CPT発行権限を運営者アドレスのみに制限する
2. The Operator Vault shall 引き出し権限を運営者アドレスのみに制限する
3. The System shall 秘密鍵・APIキーを環境変数で管理する
4. The System shall ハードコードされた秘密情報を含まない
5. If 権限のないアドレスからの操作を検知する, then the System shall トランザクションを拒否する
6. The Smart Contracts shall Reentrancy ガード等の基本的なセキュリティパターンを実装する

---

## Non-Functional Requirements

### Performance
- CPT Token の mint/transfer は標準的な ERC20 性能（< 100ms）を実現する
- Operator Vault の入出金は 1ブロック以内に確定する

### Scalability
- システムは 2チェーン（Base Sepolia, WorldCoin Sepolia）+ Arc をサポートする
- 将来的に追加L2への拡張が容易な設計とする

### Maintainability
- コードは TypeScript strict mode で型安全性を確保する
- コントラクトは natspec コメントを含む
- ESLint + Prettier でコードスタイルを統一する

### Usability
- エラーメッセージは明確で、対処方法を示唆する内容とする
- デプロイスクリプトは自動化され、手動作業を最小化する

---

## Out of Scope

以下は他の仕様に含まれるため、本仕様では実装しない：

- Uniswap v4 Pool 初期化（uniswap-v4-integration 仕様）
- Utilization Hook 実装（uniswap-v4-integration 仕様）
- 価格監視・裁定ロジック（offchain-arbitrage-engine 仕様）
- Arc + Circle 決済統合（settlement-layer 仕様）
- Dashboard UI（dashboard-demo 仕様）

---

## Dependencies on Other Specifications

- **uniswap-v4-integration**: Mock Oracle が提供する稼働率データを使用
- **settlement-layer**: Operator Vault が USDC を受け取る
- **dashboard-demo**: CPT Token と Operator Vault の状態を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. CPT Token が Base Sepolia と WorldCoin Sepolia にデプロイされ、mint/transfer が動作する
2. Mock Oracle が Base Sepolia と WorldCoin Sepolia にデプロイされ、稼働率データを返す
3. Operator Vault が Arc にデプロイされ、USDC の入出金が動作する
4. すべてのテストがパスする（単体テスト・統合テスト）
5. デプロイスクリプトが自動化され、コントラクトアドレスが記録される
