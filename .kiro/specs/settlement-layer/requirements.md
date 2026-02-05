# Requirements Document: Settlement Layer

## Introduction

Settlement Layer は、Yellow セッション終了後の裁定収益をUSDCで確定し、Operator Vaultに入金する決済処理を実装します。Circle Programmable Wallets API (W3S) を活用します。

**対象チェーン**: Arc (決済ハブ)

---

## Requirements

### Requirement 1: Arc + USDC 最終決済

**Objective:** As a システム, I want 裁定収益をUSDCで確定し、Operator Vaultに入金する機能, so that L2運営者が実際の固定費を支払える資金を得られる

#### Acceptance Criteria

1. When Yellow セッションが終了し、net profit が確定する, the Settlement Orchestrator shall Arc 決済プロセスを開始する
2. When Arc 決済が実行される, the Arc Settlement shall USDCをOperator Vaultに転送する
3. When Operator Vault がUSDCを受信する, the Operator Vault shall 残高を更新し、Deposit イベントを発行する
4. The Arc Settlement shall **Circle Programmable Wallets API (W3S)** を使用する
5. If 決済に失敗する, then the Settlement Orchestrator shall リトライロジックを実行し、エラーログを記録する（3回）
6. The Operator Vault shall USDC残高を正確に記録する
7. The Settlement Orchestrator shall TypeScript strict mode で実装される

---

### Requirement 2: 既存スクリプト活用

**Objective:** As a 開発者, I want 既存のArc転送スクリプトを活用する機能, so that 実装時間を短縮し、実証済みのパターンを使用できる

#### Acceptance Criteria

1. The Settlement Orchestrator shall `scripts/arc-transfer.ts` のパターンを参考に実装される
2. The Settlement Orchestrator shall `scripts/settle-to-vault.ts` のパターンを参考に実装される
3. The Settlement Orchestrator shall Circle W3S API の認証・暗号化ロジックを再利用する
4. The Settlement Orchestrator shall 環境変数（ARC_API_KEY, ARC_WALLET_ID_*, ENTITY_SECRET_HEX）を使用する

---

### Requirement 3: テスト・品質保証

**Objective:** As a 開発者, I want 決済レイヤーの包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall Settlement Orchestrator の単体テストを含む（決済処理）
2. The Test Suite shall 統合テスト（Yellow Session → Settlement → Vault）を含む
3. The Test Suite shall Vitest で TypeScript ロジックのテストを実行する
4. When テストが実行される, the Test Suite shall カバレッジレポートを生成する

---

### Requirement 4: エラーハンドリング・ログ記録

**Objective:** As a 開発者/運営者, I want 決済処理のエラーハンドリングとログ記録機能, so that 問題発生時に迅速にデバッグ・対応できる

#### Acceptance Criteria

1. The System shall すべての重要な処理にエラーハンドリングを実装する
2. When エラーが発生する, the System shall エラー内容・タイムスタンプ・コンテキストをログに記録する
3. The System shall 構造化ログ（JSON形式）を出力する
4. If 外部API呼び出しが失敗する, then the System shall リトライロジックを実行する（3回）
5. The System shall 致命的エラー時にアラートを発行する
6. The System shall ログレベル（ERROR, WARN, INFO, DEBUG）を適切に設定する

---

## Non-Functional Requirements

### Performance
- 決済処理は < 10秒で完了する

### Security
- 秘密鍵・APIキーを環境変数で管理
- Entity Secret を適切に暗号化

### Maintainability
- コードは TypeScript strict mode で型安全性を確保
- 既存スクリプトのパターンを再利用

---

## Out of Scope

以下は他の仕様に含まれるため、本仕様では実装しない：

- CPT Token 発行（core-token-system 仕様）
- Yellow Session Manager 実装（offchain-arbitrage-engine 仕様）
- Dashboard UI（dashboard-demo 仕様）

---

## Dependencies on Other Specifications

- **core-token-system**: Operator Vault が完成している必要がある
- **offchain-arbitrage-engine**: Yellow Session Manager から最終利益を受け取る
- **dashboard-demo**: Vault 残高を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Settlement Orchestrator が Yellow セッション終了後、USDC を Operator Vault に入金する
2. Circle Programmable Wallets API (W3S) が正常に動作する
3. 既存スクリプトのパターンが適切に活用される
4. すべてのテストがパスする（単体テスト・統合テスト）
5. エラーハンドリング・ログ記録が適切に実装される
