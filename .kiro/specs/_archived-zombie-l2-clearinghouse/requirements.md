# Requirements Document

## Introduction

Zombie L2 Clearinghouse は、低稼働なEthereum L2チェーンの計算リソースをトークン化し、ガスレス裁定によってUSDC収益を生み出す財務レイヤーです。

本プロジェクトは ETH Global HackMoney 2026 ハッカソンプロジェクトとして、以下3つのスポンサー技術を統合的に活用します：

- **Uniswap v4**: CPT/USDC市場のHookによる動的制御
- **Yellow SDK**: ステートチャネルによるガスレス裁定実行
- **Arc + Circle**: USDC決済と収益集約

**対象チェーン**: Base Sepolia (L2-A), WorldCoin Sepolia (L2-B)

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

### Requirement 2: Uniswap v4 CPT/USDC 基準市場

**Objective:** As a トレーダー/ボット, I want CPT/USDCの公的な価格市場, so that 計算リソースの市場価格を参照・取引できる

#### Acceptance Criteria

1. The Uniswap v4 Pool shall CPT/USDCペアの流動性プールを提供する
2. When トレーダーがスワップを実行する, the Uniswap v4 Pool shall 入力トークンを受け取り、出力トークンを転送する
3. When スワップが実行される, the Uniswap v4 Pool shall 価格を更新し、Swap イベントを発行する
4. The Uniswap v4 Pool shall 各L2チェーン（Base Sepolia, WorldCoin Sepolia）にそれぞれ独立して存在する
5. When 流動性が提供される, the Uniswap v4 Pool shall LP トークンを発行する

---

### Requirement 3: Uniswap v4 Hook による動的市場制御

**Objective:** As a システム, I want L2稼働率に応じて手数料・スプレッドを動的に制御する機能, so that 「空いているL2ほど計算が安くなる」市場ルールを実現できる

#### Acceptance Criteria

1. When スワップが実行される前, the Utilization Hook shall beforeSwap フックを呼び出す
2. When beforeSwap フックが呼び出される, the Utilization Hook shall L2稼働率を取得する（Oracle またはモック実装）
3. When L2稼働率が低い, the Utilization Hook shall 手数料を減少させる
4. When L2稼働率が高い, the Utilization Hook shall 手数料を増加させる
5. The Utilization Hook shall 稼働率に応じたスプレッド調整ロジックを実装する
6. If 異常な稼働率データを検知した, then the Utilization Hook shall デフォルト手数料を適用する
7. The Utilization Hook shall Hook実行結果をログとして記録する
8. The Utilization Hook shall Uniswap v4 Hook インターフェースに準拠する

---

### Requirement 4: 価格差検知（Watcher）

**Objective:** As a システム, I want 複数L2のCPT価格を監視し、裁定機会を検知する機能, so that 自動的に裁定取引を開始できる

#### Acceptance Criteria

1. The Price Watcher shall 定期的にBase Sepolia上のCPT-A/USDC価格を取得する
2. The Price Watcher shall 定期的にWorldCoin Sepolia上のCPT-B/USDC価格を取得する
3. When 価格差が設定閾値以上になる, the Price Watcher shall 裁定機会イベントを発行する
4. The Price Watcher shall 価格取得エラー時にリトライロジックを実行する
5. If 連続してエラーが発生する, then the Price Watcher shall エラーログを記録し、アラートを発行する
6. The Price Watcher shall viem を使用してオンチェーンデータを読み取る
7. The Price Watcher shall TypeScript strict mode で実装される

---

### Requirement 5: Ghost Arbitrage Engine（裁定戦略生成・実行指示）

**Objective:** As a システム, I want 価格差を検知した際に裁定戦略を生成し、実行指示を出す機能, so that 最適な裁定取引を自動実行できる

#### Acceptance Criteria

1. When 裁定機会イベントを受信する, the Arbitrage Engine shall 価格差・流動性・ガス推定を分析する
2. When 裁定が利益をもたらす見込みがある, the Arbitrage Engine shall Yellow セッション開始指示を生成する
3. If リスク管理ルールに違反する, then the Arbitrage Engine shall 裁定実行を中止し、ログを記録する
4. The Arbitrage Engine shall 売買方向（CPT-A → CPT-B または逆）を決定する
5. The Arbitrage Engine shall 取引数量を計算する
6. The Arbitrage Engine shall 裁定戦略をログとして記録する

---

### Requirement 6: Yellow セッション（ガスレス高速裁定実行）

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

---

### Requirement 7: Arc + USDC 最終決済

**Objective:** As a システム, I want 裁定収益をUSDCで確定し、Operator Vaultに入金する機能, so that L2運営者が実際の固定費を支払える資金を得られる

#### Acceptance Criteria

1. When Yellow セッションが終了し、net profit が確定する, the Settlement Orchestrator shall Arc 決済プロセスを開始する
2. When Arc 決済が実行される, the Arc Settlement shall USDCをOperator Vaultに転送する
3. When Operator Vault がUSDCを受信する, the Operator Vault shall 残高を更新し、Deposit イベントを発行する
4. The Arc Settlement shall Circle Gateway または CCTP を使用する
5. If 決済に失敗する, then the Settlement Orchestrator shall リトライロジックを実行し、エラーログを記録する
6. The Operator Vault shall USDC残高を正確に記録する
7. The Operator Vault shall 運営者のみが引き出し可能な権限制御を実装する

---

### Requirement 8: Operator Vault（運営収益管理）

**Objective:** As a L2運営者, I want 裁定収益を受け取り、管理する機能, so that 固定費の補填に使用できる

#### Acceptance Criteria

1. The Operator Vault shall USDC残高を保持する
2. When USDCがVaultに入金される, the Operator Vault shall Deposit イベントを発行する
3. When 運営者が引き出しを要求する, the Operator Vault shall 運営者アドレスにUSDCを転送する
4. The Operator Vault shall 引き出し権限を運営者アドレスのみに制限する
5. The Operator Vault shall 残高照会機能を提供する
6. If 残高不足で引き出しが要求される, then the Operator Vault shall トランザクションを拒否する

---

### Requirement 9: Dashboard（可視化）

**Objective:** As a 審査員/運営者, I want CPT価格差・Hook状態・セッションログ・Vault残高をリアルタイムで確認できる機能, so that システムの動作状況と収益を把握できる

#### Acceptance Criteria

1. The Dashboard shall Base Sepolia上のCPT-A/USDC価格をリアルタイムで表示する
2. The Dashboard shall WorldCoin Sepolia上のCPT-B/USDC価格をリアルタイムで表示する
3. The Dashboard shall CPT-A と CPT-B の価格差を計算し、表示する
4. The Dashboard shall Utilization Hook の現在の手数料設定を表示する
5. The Dashboard shall Yellow セッションの実行ログを表示する
6. The Dashboard shall Operator Vault の USDC 残高を表示する
7. When データが更新される, the Dashboard shall 自動的に表示を更新する
8. The Dashboard shall Next.js + TailwindCSS + Shadcn/ui で実装される
9. The Dashboard shall Recharts または Chart.js を用いて価格推移をチャート表示する
10. The Dashboard shall wagmi / viem を用いてブロックチェーンデータを取得する

---

### Requirement 10: デプロイ・初期化

**Objective:** As a 開発者, I want コントラクトとオフチェーンシステムを適切にデプロイ・初期化する機能, so that デモ環境を迅速に構築できる

#### Acceptance Criteria

1. The Deployment Script shall CPT Token Contract を Base Sepolia, WorldCoin Sepolia にデプロイする
2. The Deployment Script shall Utilization Hook を Base Sepolia, WorldCoin Sepolia にデプロイする
3. The Deployment Script shall Operator Vault を Arc にデプロイする
4. The Deployment Script shall Uniswap v4 Pool を CPT/USDC ペアで初期化する
5. When デプロイが完了する, the Deployment Script shall コントラクトアドレスを設定ファイルに記録する
6. The Deployment Script shall Foundry または Hardhat を使用する
7. If デプロイに失敗する, then the Deployment Script shall エラー内容を出力し、処理を中断する

---

### Requirement 11: エラーハンドリング・ログ記録

**Objective:** As a 開発者/運営者, I want システム全体のエラーハンドリングとログ記録機能, so that 問題発生時に迅速にデバッグ・対応できる

#### Acceptance Criteria

1. The System shall すべての重要な処理にエラーハンドリングを実装する
2. When エラーが発生する, the System shall エラー内容・タイムスタンプ・コンテキストをログに記録する
3. The System shall 構造化ログ（JSON形式）を出力する
4. If 外部API呼び出しが失敗する, then the System shall リトライロジックを実行する
5. The System shall 致命的エラー時にアラートを発行する
6. The System shall ログレベル（ERROR, WARN, INFO, DEBUG）を適切に設定する

---

### Requirement 12: テスト・品質保証

**Objective:** As a 開発者, I want 包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall CPT Token Contract の単体テストを含む
2. The Test Suite shall Utilization Hook の動的手数料ロジックのテストを含む
3. The Test Suite shall Operator Vault の入出金テストを含む
4. The Test Suite shall Price Watcher の価格取得・乖離検知テストを含む
5. The Test Suite shall Arbitrage Engine の戦略生成テストを含む
6. The Test Suite shall Foundry test または Hardhat test でコントラクトテストを実行する
7. The Test Suite shall Vitest で TypeScript ロジックのテストを実行する
8. When テストが実行される, the Test Suite shall カバレッジレポートを生成する

---

### Requirement 13: セキュリティ・権限管理

**Objective:** As a 開発者, I want セキュアな権限管理とアクセス制御機能, so that 不正なアクセスや操作を防止できる

#### Acceptance Criteria

1. The CPT Token Contract shall CPT発行権限を運営者アドレスのみに制限する
2. The Operator Vault shall 引き出し権限を運営者アドレスのみに制限する
3. The Utilization Hook shall Hook実行権限を Uniswap v4 Pool のみに制限する
4. The System shall 秘密鍵・APIキーを環境変数で管理する
5. The System shall ハードコードされた秘密情報を含まない
6. If 権限のないアドレスからの操作を検知する, then the System shall トランザクションを拒否する
7. The Smart Contracts shall Reentrancy ガード等の基本的なセキュリティパターンを実装する

---

### Requirement 14: ハッカソンデモ対応

**Objective:** As a デモ実施者, I want 審査員に分かりやすいデモシナリオ実行機能, so that プロダクトの価値を効果的に伝えられる

#### Acceptance Criteria

1. The Demo Script shall L2稼働率の変化をシミュレートできる
2. The Demo Script shall 価格差を人為的に発生させることができる
3. The Demo Script shall 裁定取引の一連のフローを自動実行できる
4. When デモが実行される, the Dashboard shall リアルタイムで状態変化を表示する
5. The Demo Script shall モック Oracle を使用して稼働率シグナルを供給する
6. The Demo Script shall デモシナリオの各ステップをログ出力する
7. The Demo Script shall 実行結果（価格差・収益・Vault残高）をサマリー表示する

---

## Non-Functional Requirements

### Performance
- Price Watcher は 5秒以内に価格差を検知する
- Yellow セッションは Web2 並みの応答速度（< 500ms）を実現する
- Dashboard は 3秒以内に初期ロードを完了する

### Scalability
- システムは 2チェーン（Base Sepolia, WorldCoin Sepolia）をサポートする（ハッカソンスコープ）
- 将来的に追加L2への拡張が容易な設計とする

### Maintainability
- コードは TypeScript strict mode で型安全性を確保する
- コントラクトは natspec コメントを含む
- ESLint + Prettier でコードスタイルを統一する

### Usability
- Dashboard は技術的知識のない審査員でも理解できる UI とする
- エラーメッセージは明確で、対処方法を示唆する内容とする

---

## Out of Scope (ハッカソンスコープ外)

以下は将来的な拡張として位置づけ、ハッカソンでは実装しない：

- 実際のL2稼働率 Oracle 統合（モック実装で代替）
- 複数CPTペアの同時監視
- 高度なリスク管理ロジック（最大ポジション制限等）
- 履歴データの永続化・長期チャート表示
- マルチチェーン対応の完全な自動化
- プロダクション環境向けのセキュリティ監査
