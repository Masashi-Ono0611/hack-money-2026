# Implementation Plan: Core Token System

## Task Overview

本実装計画は、Core Token System（CPT Token, Mock Oracle, Operator Vault）を実装可能なタスクに分解したものです。

**総タスク数**: 12タスク
**並列実行可能**: 7タスク（マーカー: `(P)`）
**推定期間**: 1-2日（Phase 1 の一部）

---

## Task List

### 1. プロジェクトセットアップ（並列実行可能）

- [ ] 1.1 (P) 既存プロジェクト構造の確認と設定
  - **既存ディレクトリ活用**: `contract/` をそのまま使用
  - TypeScript 設定確認（tsconfig.json、strict mode）
  - ESLint + Prettier 設定
  - _Requirements: 4.1_
  - _Note: 既存資産を活用_

- [ ] 1.2 (P) Foundry プロジェクト拡張
  - **既存 `contract/` ディレクトリを活用**
  - `foundry.toml` でコンパイラバージョン設定（Solidity 0.8.x）
  - OpenZeppelin ライブラリインストール
  - _Requirements: 4.1, 4.5_

---

### 2. オンチェーンコントラクト実装

- [ ] 2.1 (P) CPT Token Contract 実装
  - ERC20標準実装（OpenZeppelin継承）
  - mint 関数実装（onlyOwner modifier）
  - Transfer イベント発行
  - 単体テスト（mint, transfer, balanceOf）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 6.1_

- [ ] 2.2 (P) Mock Oracle 実装
  - getUtilization 関数実装（固定値または可変シミュレーション）
  - setUtilization 関数実装（デモ用）
  - 稼働率範囲検証（0-100%）
  - 単体テスト（getUtilization, setUtilization）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.2_

- [ ] 2.3 (P) Operator Vault 実装
  - depositUSDC, withdraw, balanceOf 実装
  - onlyOwner modifier で引き出し権限制御
  - Deposit, Withdraw イベント発行
  - ReentrancyGuard 適用
  - 単体テスト（入出金、権限制御）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 6.3, 7.6_

- [ ] 2.4 コントラクト統合テスト
  - CPT Token + Operator Vault の統合動作確認
  - Mock Oracle の動作確認
  - _Requirements: 6.4, 6.5_

---

### 3. デプロイスクリプト実装

- [ ] 3.1 コントラクトデプロイスクリプト作成（2.1, 2.2, 2.3に依存）
  - Foundry スクリプトで CPT Token, Mock Oracle, Vault をデプロイ
  - Base Sepolia, WorldCoin Sepolia, Arc への自動デプロイ
  - デプロイ後のコントラクトアドレス記録（JSON設定ファイル）
  - デプロイ失敗時のエラー処理
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 3.2 環境設定ファイル管理
  - .env.example 作成（以下の環境変数テンプレート）
  - 環境変数読み込みロジック
  - .gitignore で .env 除外
  - _Requirements: 7.3, 7.4_

**必要な環境変数:**

```bash
# RPC URLs
BASE_SEPOLIA_RPC_URL=
WORLDCOIN_SEPOLIA_RPC_URL=
ARC_RPC_URL=

# Private Keys
DEPLOYER_PRIVATE_KEY=

# USDC Token Addresses (Testnet)
BASE_SEPOLIA_USDC=
WORLDCOIN_SEPOLIA_USDC=
ARC_USDC=
```

---

### 4. セキュリティ実装

- [ ] 4.1 コントラクト権限管理実装（2.1, 2.2, 2.3に依存）
  - CPT Token の mint 権限を owner のみに制限
  - Operator Vault の withdraw 権限を owner のみに制限
  - 権限なしアドレスからの操作を拒否
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 4.2 (P) 環境変数セキュリティ確認
  - 秘密鍵・APIキーがハードコードされていないことを確認
  - .env ファイルが .gitignore に含まれることを確認
  - _Requirements: 7.3, 7.4_

- [ ] 4.3 (P) Reentrancy ガード適用確認
  - Operator Vault に ReentrancyGuard が適用されていることを確認
  - 外部呼び出しの前後で状態変更順序を確認
  - _Requirements: 7.6_

---

## Requirements Coverage

- **Requirement 1 (CPT Token)**: 1.1, 1.2, 2.1
- **Requirement 2 (Mock Oracle)**: 1.1, 1.2, 2.2
- **Requirement 3 (Operator Vault)**: 1.1, 1.2, 2.3
- **Requirement 4 (デプロイ)**: 3.1, 3.2
- **Requirement 5 (エラーハンドリング)**: 2.1, 2.2, 2.3, 3.1
- **Requirement 6 (テスト)**: 2.1, 2.2, 2.3, 2.4
- **Requirement 7 (セキュリティ)**: 4.1, 4.2, 4.3

---

## Parallel Execution Strategy

### 並列実行可能グループ

**セットアップ（並列可能）**:
- 1.1, 1.2

**オンチェーン実装（並列可能）**:
- 2.1, 2.2, 2.3

**セキュリティ確認（並列可能）**:
- 4.2, 4.3

**順序依存タスク**:
- 2.4（2.1, 2.2, 2.3に依存）
- 3.1（2.1, 2.2, 2.3に依存）
- 4.1（2.1, 2.2, 2.3に依存）

---

## Implementation Notes

### 優先順位

**Must Have（最優先）**:
1. セットアップ・オンチェーン実装（1.1, 1.2, 2.1, 2.2, 2.3）
2. デプロイスクリプト（3.1, 3.2）
3. セキュリティ実装（4.1, 4.2, 4.3）

**Should Have（時間があれば）**:
- 2.4: 統合テスト（他の仕様との統合時に実施可能）

### 推定工数

| タスクグループ | 期間 |
|---------------|------|
| セットアップ | 0.5日 |
| オンチェーン実装 | 0.5-1日 |
| デプロイスクリプト | 0.5日 |
| セキュリティ実装 | 0.5日 |
| **合計** | **1-2日** |

---

## Dependencies on Other Specifications

- **uniswap-v4-integration**: Mock Oracle が完成後、Utilization Hook 実装で使用
- **settlement-layer**: Operator Vault が完成後、決済処理で使用
- **dashboard-demo**: CPT Token と Operator Vault が完成後、Dashboard で表示

---

## Success Criteria

本仕様のタスクが完了とみなされる条件：

1. すべてのタスクが完了している（チェックボックスがすべて✓）
2. CPT Token, Mock Oracle, Operator Vault がデプロイされている
3. すべてのテストがパスしている
4. デプロイスクリプトが自動化され、コントラクトアドレスが記録されている
5. セキュリティチェックがすべて完了している

---

## Next Steps

本仕様完了後、以下の仕様に進むことを推奨します：

1. **uniswap-v4-integration**: Utilization Hook 実装、Pool 初期化
2. **offchain-arbitrage-engine**: 価格監視・裁定ロジック実装（並行可能）
3. **settlement-layer**: Arc + Circle 決済統合
4. **dashboard-demo**: Dashboard UI、デモスクリプト
