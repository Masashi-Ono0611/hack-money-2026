# Requirements Document: Dashboard & Demo

## Introduction

Dashboard & Demo は、CPT価格差・Hook状態・セッションログ・Vault残高をリアルタイムで可視化し、ハッカソンデモを実行するインターフェースを提供します。

---

## Requirements

### Requirement 1: Dashboard（可視化）

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
11. The Dashboard shall **Yellow SDK モックモード表示**（`USE_YELLOW_MOCK=true` 時）
12. The Dashboard shall 3秒以内に初期ロードを完了する

---

### Requirement 2: ハッカソンデモ対応

**Objective:** As a デモ実施者, I want 審査員に分かりやすいデモシナリオ実行機能, so that プロダクトの価値を効果的に伝えられる

#### Acceptance Criteria

1. The Demo Script shall L2稼働率の変化をシミュレートできる
2. The Demo Script shall 価格差を人為的に発生させることができる
3. The Demo Script shall 裁定取引の一連のフローを自動実行できる
4. When デモが実行される, the Dashboard shall リアルタイムで状態変化を表示する
5. The Demo Script shall モック Oracle を使用して稼働率シグナルを供給する
6. The Demo Script shall デモシナリオの各ステップをログ出力する
7. The Demo Script shall 実行結果（価格差・収益・Vault残高）をサマリー表示する
8. **The Demo Script shall Yellow SDK モック / 実SDK の切り替え対応**

---

### Requirement 3: テスト・品質保証

**Objective:** As a 開発者, I want Dashboard の包括的なテストスイート, so that コードの品質と信頼性を担保できる

#### Acceptance Criteria

1. The Test Suite shall Dashboard UI のE2Eテストを含む
2. The Test Suite shall 価格差・Hook状態・ログ・残高の表示確認テストを含む
3. The Test Suite shall 自動リフレッシュ動作確認テストを含む
4. The Test Suite shall Playwright または同等ツールで E2E テストを実行する

---

## Non-Functional Requirements

### Performance
- Dashboard は 3秒以内に初期ロードを完了する
- データ更新は 5秒間隔で自動リフレッシュする

### Usability
- Dashboard は技術的知識のない審査員でも理解できる UI とする
- エラーメッセージは明確で、対処方法を示唆する内容とする

### Maintainability
- コードは TypeScript strict mode で型安全性を確保する
- Biome でコードスタイルを統一する

---

## Out of Scope

以下は他の仕様に含まれるため、本仕様では実装しない：

- CPT Token 発行（core-token-system 仕様）
- Uniswap v4 Pool 実装（uniswap-v4-integration 仕様）
- 価格監視・裁定ロジック（offchain-arbitrage-engine 仕様）
- Arc + Circle 決済統合（settlement-layer 仕様）

---

## Dependencies on Other Specifications

- **core-token-system**: CPT Token, Mock Oracle, Operator Vault の状態を表示
- **uniswap-v4-integration**: Uniswap v4 Pool 価格、Hook 状態を表示
- **offchain-arbitrage-engine**: Yellow セッションログを表示
- **settlement-layer**: Operator Vault 残高を表示

---

## Success Criteria

本仕様が完了とみなされる条件：

1. Dashboard が CPT価格差・Hook状態・セッションログ・Vault残高を表示する
2. Dashboard が 3秒以内に初期ロードを完了する
3. デモスクリプトが裁定取引の一連のフローを自動実行する
4. すべてのテストがパスする（E2Eテスト）
5. ハッカソンデモが審査員に分かりやすい形で実行できる
