# Requirements Document: Uniswap v4 Integration

## Introduction

Uniswap v4 Integration は、CPT/USDC 市場を構築し、L2稼働率に応じて手数料を動的に制御するHookを実装します。「空いているL2ほど計算が安くなる」市場ルールを実現します。

**対象チェーン**: Base Sepolia (L2-A), WorldCoin Sepolia (L2-B)

---

## Requirements

### Requirement 1: Uniswap v4 CPT/USDC 基準市場

**Objective:** As a トレーダー/ボット, I want CPT/USDCの公的な価格市場, so that 計算リソースの市場価格を参照・取引できる

#### Acceptance Criteria

1. The Uniswap v4 Pool shall CPT/USDCペアの流動性プールを提供する
2. When トレーダーがスワップを実行する, the Uniswap v4 Pool shall 入力トークンを受け取り、出力トークンを転送する
3. When スワップが実行される, the Uniswap v4 Pool shall 価格を更新し、Swap イベントを発行する
4. The Uniswap v4 Pool shall 各L2チェーン（Base Sepolia, WorldCoin Sepolia）にそれぞれ独立して存在する
5. When 流動性が提供される, the Uniswap v4 Pool shall LP トークンを発行する

---

### Requirement 2: Uniswap v4 Hook による動的市場制御

**Objective:** As a システム, I want L2稼働率に応じて手数料・スプレッドを動的に制御する機能, so that 「空いているL2ほど計算が安くなる」市場ルールを実現できる

#### Acceptance Criteria

1. When スワップが実行される前, the Utilization Hook shall beforeSwap フックを呼び出す
2. When beforeSwap フックが呼び出される, the Utilization Hook shall L2稼働率を取得する（Mock Oracle から）
3. When L2稼働率が低い, the Utilization Hook shall 手数料を減少させる
4. When L2稼働率が高い, the Utilization Hook shall 手数料を増加させる
5. The Utilization Hook shall 稼働率に応じたスプレッド調整ロジックを実装する
6. If 異常な稼働率データを検知した, then the Utilization Hook shall デフォルト手数料を適用する
7. The Utilization Hook shall Hook実行結果をログとして記録する
8. The Utilization Hook shall Uniswap v4 Hook インターフェースに準拠する
9. **The Utilization Hook shall CREATE2 + HookMiner パターンでデプロイされる**（アドレスビットパターン制約対応）

---

### Requirement 3: デプロイ・初期化

**Objective:** As a 開発者, I want Uniswap v4 Pool とHookを適切にデプロイ・初期化する機能, so that CPT市場が動作可能になる

#### Acceptance Criteria

1. The Deployment Script shall CREATE2 + HookMiner で Utilization Hook をデプロイする
2. The Deployment Script shall Uniswap v4 Pool を CPT/USDC ペアで初期化する
3. The Deployment Script shall 初期流動性を提供する（テスト用）
4. When デプロイが完了する, the Deployment Script shall コントラクトアドレスを設定ファイルに記録する
5. If Hook アドレスが適切なビットパターンを持たない, then the Deployment Script shall salt 探索範囲を拡大する
6. The Deployment Script shall Foundry を使用する

---

### Requirement 4: テスト・品質保証

**Objective:** As a 開発者, I want Uniswap v4統合の包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall Utilization Hook の動的手数料ロジックのテストを含む
2. The Test Suite shall Uniswap v4 Pool + Hook の統合テストを含む（スワップ時のHook呼び出し）
3. The Test Suite shall CREATE2 + HookMiner パターンのテストを含む
4. The Test Suite shall Foundry test でコントラクトテストを実行する
5. When テストが実行される, the Test Suite shall カバレッジレポートを生成する

---

### Requirement 5: セキュリティ・権限管理

**Objective:** As a 開発者, I want セキュアなHook実装, so that 不正な操作を防止できる

#### Acceptance Criteria

1. The Utilization Hook shall Hook実行権限を Uniswap v4 Pool のみに制限する
2. The System shall 秘密鍵・APIキーを環境変数で管理する
3. If 異常な稼働率データを検知する, then the Utilization Hook shall デフォルト手数料を適用し、ログを記録する

---

## Non-Functional Requirements

### Performance
- Hook 実行は 1ブロック内で完了する
- 稼働率取得は < 100ms を目標とする

### Scalability
- システムは 2チェーン（Base Sepolia, WorldCoin Sepolia）をサポートする

### Maintainability
- Hook コードは natspec コメントを含む
- CREATE2 + HookMiner パターンは再利用可能な形で実装する

---

## Out of Scope

以下は他の仕様に含まれるため、本仕様では実装しない：

- CPT Token 発行・管理（core-token-system 仕様）
- Mock Oracle 実装（core-token-system 仕様）
- 価格監視・裁定ロジック（offchain-arbitrage-engine 仕様）
- Dashboard UI（dashboard-demo 仕様）

---

## Dependencies on Other Specifications

- **core-token-system**: CPT Token と Mock Oracle が必須
- **offchain-arbitrage-engine**: Pool 価格を監視
- **dashboard-demo**: Hook 状態を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Utilization Hook が CREATE2 + HookMiner パターンでデプロイされる
2. Uniswap v4 Pool が CPT/USDC ペアで初期化される
3. スワップ時に Hook が動的手数料を適用する
4. すべてのテストがパスする（単体テスト・統合テスト）
5. デプロイスクリプトが自動化され、コントラクトアドレスが記録される
