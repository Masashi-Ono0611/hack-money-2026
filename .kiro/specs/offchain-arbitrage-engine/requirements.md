# Requirements Document: Offchain Arbitrage Engine

## Introduction

Offchain Arbitrage Engine は、複数L2のCPT価格を監視し、裁定機会を検知して、Yellow SDK によるガスレス高速裁定を実行します。

**対象チェーン**: Base Sepolia (L2-A), WorldCoin Sepolia (L2-B)

---

## Requirements

### Requirement 1: 価格差検知（Watcher）

**Objective:** As a システム, I want 複数L2のCPT価格を監視し、裁定機会を検知する機能, so that 自動的に裁定取引を開始できる

#### Acceptance Criteria

1. The Price Watcher shall 定期的にBase Sepolia上のCPT-A/USDC価格を取得する
2. The Price Watcher shall 定期的にWorldCoin Sepolia上のCPT-B/USDC価格を取得する
3. When 価格差が設定閾値以上になる, the Price Watcher shall 裁定機会イベントを発行する
4. The Price Watcher shall 価格取得エラー時にリトライロジックを実行する（3回）
5. If 連続してエラーが発生する, then the Price Watcher shall エラーログを記録し、アラートを発行する
6. The Price Watcher shall viem を使用してオンチェーンデータを読み取る
7. The Price Watcher shall TypeScript strict mode で実装される
8. The Price Watcher shall 5秒間隔でポーリングする

---

### Requirement 2: Ghost Arbitrage Engine（裁定戦略生成・実行指示）

**Objective:** As a システム, I want 価格差を検知した際に裁定戦略を生成し、実行指示を出す機能, so that 最適な裁定取引を自動実行できる

#### Acceptance Criteria

1. When 裁定機会イベントを受信する, the Arbitrage Engine shall 価格差・流動性・ガス推定を分析する
2. When 裁定が利益をもたらす見込みがある, the Arbitrage Engine shall Yellow セッション開始指示を生成する
3. If リスク管理ルールに違反する, then the Arbitrage Engine shall 裁定実行を中止し、ログを記録する
4. The Arbitrage Engine shall 売買方向（CPT-A → CPT-B または逆）を決定する
5. The Arbitrage Engine shall 取引数量を計算する
6. The Arbitrage Engine shall 裁定戦略をログとして記録する
7. The Arbitrage Engine shall TypeScript strict mode で実装される

---

### Requirement 3: Yellow セッション（ガスレス高速裁定実行）

**Objective:** As a システム, I want Yellow SDK を用いてガス不要・高速な裁定取引を実行する機能, so that コストと遅延を最小化しながら反復的に売買できる

#### Acceptance Criteria

1. When Arbitrage Engine が実行指示を出す, the Yellow Session Manager shall Yellow セッションを開始する
2. When セッションが開始される, the Yellow Session Manager shall セッションIDとセッションキーを取得する
3. When セッション内で売買指示が送信される, the Yellow Session shall オフチェーンでマッチングを実行する
4. While セッションが有効, the Yellow Session shall 反復的な売買を受け付ける
5. When セッションが終了する, the Yellow Session shall 最終ネット結果（net profit/loss）を返す
6. If セッション実行中にエラーが発生する, then the Yellow Session Manager shall セッションをクローズし、エラーログを記録する
7. The Yellow Session Manager shall Yellow SDK (Nitrolite) を使用する
8. The Yellow Session shall ガス不要でトランザクションを処理する
9. **The Yellow Session Manager shall モックフォールバック実装を含む**（Yellow SDK 統合失敗時）
10. The Yellow Session Manager shall 環境変数 `USE_YELLOW_MOCK` でモード切り替えが可能

---

### Requirement 4: Yellow SDK 調査・統合

**Objective:** As a 開発者, I want Yellow SDK (Nitrolite) の統合可能性を調査し、統合またはモック実装を選択する機能, so that リスクを軽減しながら実装を進められる

#### Acceptance Criteria

1. The Developer shall Yellow SDK (Nitrolite) の公式ドキュメントを確認する
2. The Developer shall サンプルコードの動作検証を実施する
3. The Developer shall API仕様・認証方法を確認する
4. When Yellow SDK 統合が成功する, the System shall Yellow SDK を使用する
5. If Yellow SDK 統合が失敗する, then the System shall モック実装にフォールバックする
6. The Developer shall 統合可否判断を記録する

---

### Requirement 5: テスト・品質保証

**Objective:** As a 開発者, I want オフチェーン裁定エンジンの包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall Price Watcher の価格取得・乖離検知テストを含む
2. The Test Suite shall Arbitrage Engine の戦略生成テストを含む
3. The Test Suite shall Yellow Session Manager のセッション管理テストを含む
4. The Test Suite shall モック実装のテストを含む
5. The Test Suite shall 統合テスト（Watcher → Engine → Yellow）を含む
6. The Test Suite shall Vitest で TypeScript ロジックのテストを実行する
7. When テストが実行される, the Test Suite shall カバレッジレポートを生成する

---

### Requirement 6: エラーハンドリング・ログ記録

**Objective:** As a 開発者/運営者, I want オフチェーンシステムのエラーハンドリングとログ記録機能, so that 問題発生時に迅速にデバッグ・対応できる

#### Acceptance Criteria

1. The System shall すべての重要な処理にエラーハンドリングを実装する
2. When エラーが発生する, the System shall エラー内容・タイムスタンプ・コンテキストをログに記録する
3. The System shall 構造化ログ（JSON形式）を出力する
4. If 外部API呼び出しが失敗する, then the System shall リトライロジックを実行する
5. The System shall 致命的エラー時にアラートを発行する
6. The System shall ログレベル（ERROR, WARN, INFO, DEBUG）を適切に設定する

---

## Non-Functional Requirements

### Performance
- Price Watcher は 5秒以内に価格差を検知する
- Yellow セッションは Web2 並みの応答速度（< 500ms）を実現する

### Scalability
- システムは 2チェーン（Base Sepolia, WorldCoin Sepolia）をサポートする

### Maintainability
- コードは TypeScript strict mode で型安全性を確保する
- モック実装と実装を環境変数で切り替え可能にする

---

## Out of Scope

以下は他の仕様に含まれるため、本仕様では実装しない：

- CPT Token 発行（core-token-system 仕様）
- Uniswap v4 Pool 初期化（uniswap-v4-integration 仕様）
- Arc + Circle 決済統合（settlement-layer 仕様）
- Dashboard UI（dashboard-demo 仕様）

---

## Dependencies on Other Specifications

- **uniswap-v4-integration**: Uniswap v4 Pool 価格を取得
- **settlement-layer**: Yellow セッション終了後、決済処理に渡す
- **dashboard-demo**: セッションログを表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Price Watcher が価格差を検知し、Arbitrage Engine に通知する
2. Arbitrage Engine が裁定戦略を生成し、Yellow Session Manager に指示する
3. Yellow Session Manager が Yellow SDK またはモック実装でセッションを実行する
4. すべてのテストがパスする（単体テスト・統合テスト）
5. エラーハンドリング・ログ記録が適切に実装される
